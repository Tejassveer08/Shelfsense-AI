"""
Stream Goodreads 2.36M Books Ingestion Pipeline for ShelfSense
Features:
- Streaming line-by-line reading from goodreads_books.json.gz (zero RAM bloat)
- Joins with 829,529 pre-indexed authors from data/authors.db
- Disk-backed SQLite + FTS5 full-text search with BM25 ranking (scales to millions)
- Batched embedding generation with all-MiniLM-L6-v2 + ChromaDB persistent collection
- Zero-latency vector projection for 4 Vibe axes + 7 Emotion scores
- Resumable checkpointing: interrupt and resume at any time without data duplication
"""

import os
import sys
import gzip
import json
import time
import sqlite3
import argparse
from pathlib import Path
from typing import List, Dict, Any, Optional, Set

import numpy as np
from sentence_transformers import SentenceTransformer
import chromadb

# Vibe anchor definitions
VIBE_ANCHOR_PROMPTS = {
    "tone_pos": "lighthearted, wholesome, heartwarming, joyful, delightful romance comedy",
    "tone_neg": "grim, dark, bleak, disturbing, psychological horror, brutal thriller",
    "pacing_fast": "fast-paced, exhilarating, action-packed, adrenaline thrill ride",
    "pacing_slow": "slow-paced, contemplative, quiet, meditative, lyrical, atmospheric",
    "depth_cerebral": "philosophical, complex, intellectually demanding, profound classic",
    "depth_escapist": "entertaining, cozy, fun, easy beach read, guilty pleasure",
}

EMOTION_ANCHOR_PROMPTS = {
    "joy": "a joyful, uplifting, delightful, heartwarming celebration of happiness",
    "sadness": "a heartbreaking, melancholic, sorrowful story of grief, loss, and mourning",
    "fear": "a terrifying, chilling, dread-inducing psychological horror and suspense",
    "anger": "an infuriating story of injustice, rage, revenge, rebellion, and fury",
    "surprise": "an astonishing, shocking tale of unexpected plot twists and startling revelations",
    "disgust": "a sickening, repulsive, grotesque, sickeningly grim and filthy depiction",
    "neutral": "an objective, documentary, factual, balanced, calm and straightforward account",
}


class GoodreadsStreamIndexer:
    def __init__(
        self,
        gz_path: str,
        authors_db_path: str = "data/authors.db",
        db_path: str = "data/goodreads.db",
        chroma_dir: str = "data/chroma_db",
        collection_name: str = "goodreads_books",
        batch_size: int = 128,
        commit_interval: int = 500,
        min_desc_words: int = 20,
        min_ratings: int = 0,
    ):
        self.gz_path = Path(gz_path)
        self.authors_db_path = Path(authors_db_path)
        self.db_path = Path(db_path)
        self.chroma_dir = Path(chroma_dir)
        self.collection_name = collection_name
        self.batch_size = batch_size
        self.commit_interval = commit_interval
        self.min_desc_words = min_desc_words
        self.min_ratings = min_ratings

        # Ensure directories
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.chroma_dir.mkdir(parents=True, exist_ok=True)

        print("[Indexer] Initializing SQLite database...")
        self.conn = sqlite3.connect(str(self.db_path))
        self.conn.execute("PRAGMA journal_mode = WAL;")
        self.conn.execute("PRAGMA synchronous = NORMAL;")
        self.conn.execute("PRAGMA cache_size = -64000;")  # 64MB cache
        self._init_sqlite_schema()

        print("[Indexer] Loading Authors database...")
        self.authors_conn = sqlite3.connect(str(self.authors_db_path)) if self.authors_db_path.exists() else None

        print("[Indexer] Connecting to ChromaDB...")
        self.chroma_client = chromadb.PersistentClient(path=str(self.chroma_dir))
        self.collection = self.chroma_client.get_or_create_collection(
            name=self.collection_name,
            metadata={"hnsw:space": "cosine"}
        )

        print("[Indexer] Loading SentenceTransformer ('all-MiniLM-L6-v2')...")
        self.model = SentenceTransformer("all-MiniLM-L6-v2")

        print("[Indexer] Computing Vibe and Emotion Anchor Embeddings...")
        self._compute_anchors()

        # Cache already indexed book_ids
        self.indexed_ids: Set[str] = set()
        cur = self.conn.cursor()
        cur.execute("SELECT book_id FROM books")
        for (bid,) in cur.fetchall():
            self.indexed_ids.add(str(bid))
        print(f"[Indexer] Found {len(self.indexed_ids)} books already indexed in {self.db_path.name}")

    def _init_sqlite_schema(self):
        cur = self.conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS books (
                book_id TEXT PRIMARY KEY,
                isbn13 TEXT,
                isbn TEXT,
                title TEXT,
                authors TEXT,
                description TEXT,
                average_rating REAL,
                ratings_count INTEGER,
                num_pages INTEGER,
                publication_year INTEGER,
                image_url TEXT,
                genres TEXT,
                joy REAL,
                sadness REAL,
                fear REAL,
                anger REAL,
                surprise REAL,
                disgust REAL,
                neutral REAL,
                vibe_tone REAL,
                vibe_pacing REAL,
                vibe_depth REAL,
                vibe_length REAL
            );
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_books_isbn13 ON books(isbn13);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_books_ratings ON books(ratings_count);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_books_avg_rating ON books(average_rating);")

        cur.execute("""
            CREATE VIRTUAL TABLE IF NOT EXISTS books_fts USING fts5(
                book_id UNINDEXED,
                title,
                authors,
                description,
                tokenize='porter'
            );
        """)
        self.conn.commit()

    def _compute_anchors(self):
        # 4 vibe axes
        vibe_texts = [
            VIBE_ANCHOR_PROMPTS["tone_pos"], VIBE_ANCHOR_PROMPTS["tone_neg"],
            VIBE_ANCHOR_PROMPTS["pacing_fast"], VIBE_ANCHOR_PROMPTS["pacing_slow"],
            VIBE_ANCHOR_PROMPTS["depth_cerebral"], VIBE_ANCHOR_PROMPTS["depth_escapist"],
        ]
        embs = self.model.encode(vibe_texts, normalize_embeddings=True)
        self.vibe_tone_axis = embs[0] - embs[1]
        self.vibe_pacing_axis = embs[2] - embs[3]
        self.vibe_depth_axis = embs[4] - embs[5]

        # 7 emotion anchors
        emotion_names = ["joy", "sadness", "fear", "anger", "surprise", "disgust", "neutral"]
        emotion_texts = [EMOTION_ANCHOR_PROMPTS[e] for e in emotion_names]
        self.emotion_embs = self.model.encode(emotion_texts, normalize_embeddings=True)
        self.emotion_names = emotion_names

    def _resolve_authors(self, author_list: List[Dict[str, str]]) -> str:
        if not author_list:
            return "Unknown"
        names = []
        if self.authors_conn:
            cur = self.authors_conn.cursor()
            for a in author_list:
                aid = str(a.get("author_id", ""))
                if aid:
                    cur.execute("SELECT name FROM authors WHERE author_id = ?", (aid,))
                    row = cur.fetchone()
                    if row and row[0]:
                        names.append(row[0])
        if not names:
            names = [f"Author {a.get('author_id', '')}" for a in author_list if a.get("author_id")]
        return ", ".join(names[:3]) if names else "Unknown"

    def _clean_genres(self, popular_shelves: List[Dict[str, str]]) -> List[str]:
        ignored = {
            "to-read", "currently-reading", "favorites", "books-i-own", "owned",
            "read", "kindle", "audiobook", "default", "wishlist", "owned-books",
            "my-books", "library", "all-time-favorites", "ebook", "ebooks"
        }
        genres = []
        for s in popular_shelves or []:
            name = s.get("name", "").lower().strip()
            if name and name not in ignored and len(name) > 2 and not name.isdigit():
                formatted = name.replace("-", " ").title()
                if formatted not in genres:
                    genres.append(formatted)
                if len(genres) >= 5:
                    break
        return genres if genres else ["General Fiction"]

    def _compute_vibe_and_emotions(self, emb: np.ndarray, num_pages: int) -> Dict[str, float]:
        # Dot product projections
        tone = float(np.clip(np.dot(emb, self.vibe_tone_axis) * 2.5, -1.0, 1.0))
        pacing = float(np.clip(np.dot(emb, self.vibe_pacing_axis) * 2.5, -1.0, 1.0))
        depth = float(np.clip(np.dot(emb, self.vibe_depth_axis) * 2.5, -1.0, 1.0))

        # Length axis: page count mapping
        if num_pages <= 0:
            length = 0.0
        elif num_pages < 200:
            length = float(np.interp(num_pages, [50, 200], [-1.0, -0.2]))
        elif num_pages > 450:
            length = float(np.interp(num_pages, [450, 1000], [0.2, 1.0]))
        else:
            length = float(np.interp(num_pages, [200, 450], [-0.2, 0.2]))

        # Emotions: cosine similarity with softmax
        raw_sims = np.dot(self.emotion_embs, emb) * 4.0  # Temperature
        exp_sims = np.exp(raw_sims - np.max(raw_sims))
        probs = exp_sims / np.sum(exp_sims)
        emotions = {self.emotion_names[i]: float(probs[i]) for i in range(len(self.emotion_names))}

        return {
            "vibe_tone": tone,
            "vibe_pacing": pacing,
            "vibe_depth": depth,
            "vibe_length": length,
            **emotions
        }

    def run(self, max_books: Optional[int] = None):
        print(f"[Indexer] Starting streaming ingestion from: {self.gz_path}")
        if not self.gz_path.exists():
            print(f"[Indexer] ERROR: File not found at {self.gz_path}")
            return

        batch_books: List[Dict[str, Any]] = []
        batch_texts: List[str] = []

        total_scanned = 0
        total_indexed = len(self.indexed_ids)
        initial_count = total_indexed
        start_time = time.time()
        last_log_time = start_time

        with gzip.open(str(self.gz_path), "rt", encoding="utf-8") as f:
            for line in f:
                total_scanned += 1
                try:
                    item = json.loads(line)
                except Exception:
                    continue

                book_id = str(item.get("book_id", "")).strip()
                if not book_id or book_id in self.indexed_ids:
                    continue

                title = item.get("title", "").strip()
                desc = item.get("description", "").strip()
                words = len(desc.split())
                if not title or words < self.min_desc_words:
                    continue

                try:
                    ratings_count = int(item.get("ratings_count", 0) or 0)
                except Exception:
                    ratings_count = 0
                if ratings_count < self.min_ratings:
                    continue

                try:
                    num_pages = int(item.get("num_pages", 0) or 0)
                except Exception:
                    num_pages = 0

                try:
                    avg_rating = float(item.get("average_rating", 0.0) or 0.0)
                except Exception:
                    avg_rating = 0.0

                try:
                    pub_year = int(item.get("publication_year", 0) or 0)
                except Exception:
                    pub_year = 0

                isbn13 = str(item.get("isbn13", "")).strip()
                isbn = str(item.get("isbn", "")).strip()
                image_url = item.get("image_url", "").strip()

                authors_str = self._resolve_authors(item.get("authors", []))
                genres = self._clean_genres(item.get("popular_shelves", []))

                # Embedding input text: Title + Author + Genres + First ~300 chars of description
                embed_text = f"{title} by {authors_str}. Genres: {', '.join(genres[:3])}. {desc[:350]}"

                book_record = {
                    "book_id": book_id,
                    "isbn13": isbn13,
                    "isbn": isbn,
                    "title": title,
                    "authors": authors_str,
                    "description": desc,
                    "average_rating": avg_rating,
                    "ratings_count": ratings_count,
                    "num_pages": num_pages,
                    "publication_year": pub_year,
                    "image_url": image_url,
                    "genres": json.dumps(genres),
                }

                batch_books.append(book_record)
                batch_texts.append(embed_text)

                if len(batch_books) >= self.batch_size:
                    self._process_batch(batch_books, batch_texts)
                    total_indexed += len(batch_books)
                    batch_books = []
                    batch_texts = []

                    now = time.time()
                    if now - last_log_time >= 5.0:
                        elapsed = now - start_time
                        new_books = total_indexed - initial_count
                        speed = new_books / max(elapsed, 0.01)
                        print(f"[Indexer] Progress: {total_indexed:,} indexed | Scanned: {total_scanned:,} | Speed: {speed:.1f} b/s | Elapsed: {elapsed/60:.1f}m")
                        last_log_time = now
                        try:
                            status_path = self.db_path.parent / "ingestion_status.json"
                            with open(status_path, "w", encoding="utf-8") as sf:
                                json.dump({
                                    "status": "indexing",
                                    "total_indexed": total_indexed,
                                    "total_scanned": total_scanned,
                                    "speed_bps": round(speed, 1),
                                    "elapsed_min": round(elapsed / 60, 2),
                                    "updated_at": time.strftime("%Y-%m-%d %H:%M:%S")
                                }, sf, indent=2)
                        except Exception:
                            pass

                    if max_books and total_indexed >= max_books:
                        print(f"[Indexer] Reached requested max_books limit ({max_books:,}). Stopping.")
                        break

        # Process remainder
        if batch_books and (not max_books or total_indexed < max_books):
            self._process_batch(batch_books, batch_texts)
            total_indexed += len(batch_books)

        total_elapsed = time.time() - start_time
        print(f"[Indexer] Completed! Total indexed: {total_indexed:,} books in {total_elapsed/60:.2f} minutes.")

    def _process_batch(self, books: List[Dict[str, Any]], texts: List[str]):
        # 1. Compute embeddings
        embs = self.model.encode(texts, batch_size=self.batch_size, normalize_embeddings=True, show_progress_bar=False)

        # 2. Compute vibes & emotions
        sql_rows = []
        fts_rows = []
        chroma_ids = []
        chroma_embeddings = []
        chroma_metadatas = []
        chroma_docs = []

        for book, emb, text in zip(books, embs, texts):
            vibe_data = self._compute_vibe_and_emotions(emb, book["num_pages"])
            bid = book["book_id"]

            sql_rows.append((
                bid,
                book["isbn13"],
                book["isbn"],
                book["title"],
                book["authors"],
                book["description"],
                book["average_rating"],
                book["ratings_count"],
                book["num_pages"],
                book["publication_year"],
                book["image_url"],
                book["genres"],
                vibe_data["joy"],
                vibe_data["sadness"],
                vibe_data["fear"],
                vibe_data["anger"],
                vibe_data["surprise"],
                vibe_data["disgust"],
                vibe_data["neutral"],
                vibe_data["vibe_tone"],
                vibe_data["vibe_pacing"],
                vibe_data["vibe_depth"],
                vibe_data["vibe_length"],
            ))

            fts_rows.append((
                bid,
                book["title"],
                book["authors"],
                book["description"][:1000]
            ))

            chroma_ids.append(bid)
            chroma_embeddings.append(emb.tolist())
            chroma_docs.append(text[:200])
            chroma_metadatas.append({
                "book_id": bid,
                "title": book["title"][:100],
                "authors": book["authors"][:100],
                "avg_rating": float(book["average_rating"]),
                "ratings_count": int(book["ratings_count"]),
            })
            self.indexed_ids.add(bid)

        # 3. Insert into SQLite
        cur = self.conn.cursor()
        cur.executemany("""
            INSERT OR REPLACE INTO books VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
        """, sql_rows)
        cur.executemany("INSERT INTO books_fts VALUES (?, ?, ?, ?)", fts_rows)
        self.conn.commit()

        # 4. Upsert into ChromaDB
        self.collection.upsert(
            ids=chroma_ids,
            embeddings=chroma_embeddings,
            metadatas=chroma_metadatas,
            documents=chroma_docs
        )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Stream index Goodreads 2.36M books")
    parser.add_argument("--gz-path", default=r"c:\Users\tejas\Downloads\goodreads_books.json.gz", help="Path to goodreads_books.json.gz")
    parser.add_argument("--max-books", type=int, default=None, help="Maximum number of books to index (default: all)")
    parser.add_argument("--batch-size", type=int, default=128, help="Batch size for embedding generation")
    parser.add_argument("--min-ratings", type=int, default=0, help="Minimum ratings_count filter")
    parser.add_argument("--min-words", type=int, default=20, help="Minimum description words filter")
    args = parser.parse_args()

    indexer = GoodreadsStreamIndexer(
        gz_path=args.gz_path,
        batch_size=args.batch_size,
        min_desc_words=args.min_words,
        min_ratings=args.min_ratings
    )
    indexer.run(max_books=args.max_books)
