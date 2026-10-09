"""
Hybrid Retrieval and Re-ranking Engine for ShelfSense (full Goodreads catalogue)

Searches the index built by scripts/stream_goodreads_index.py:
- Dense vector search: ChromaDB collection "goodreads_books" (all-MiniLM-L6-v2)
- Lexical search: SQLite FTS5 BM25 over title / authors / description (data/goodreads.db)
- Reciprocal Rank Fusion (RRF)
- Hard filters + dynamic Vibe Slider alignment scoring
- Sentence-level similarity extraction for grounded snippet highlighting

Unlike the earlier Kaggle-based version, no catalogue or BM25 index is held in RAM:
book metadata is read from SQLite on demand, so this scales to millions of books.
"""

import json
import re
import sqlite3
import threading
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import chromadb
from sentence_transformers import SentenceTransformer

from backend.app.models.schemas import Filters, VibeSliders, BookItem

EMBEDDING_MODEL = "all-MiniLM-L6-v2"  # must match scripts/stream_goodreads_index.py
DEFAULT_COLLECTION = "goodreads_books"
DEFAULT_DB_NAME = "goodreads.db"

DENSE_CANDIDATES = 120
BM25_CANDIDATES = 120
FILTERED_CANDIDATES = 400  # fetch more when hard filters are active, so filtering still leaves enough
RRF_K = 60
MISSING_RANK = 500
MAX_QUERY_TOKENS = 12

FALLBACK_COVER = "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400"

# Very common words make FTS5 OR-queries slow on millions of rows and add little signal
# (the dense search already captures the overall meaning of the query).
STOPWORDS = {
    "a", "an", "the", "and", "or", "of", "to", "in", "on", "for", "with", "about", "that", "this",
    "it", "its", "is", "are", "was", "were", "be", "as", "at", "by", "from", "i", "me", "my", "you",
    "your", "we", "our", "nothing", "too", "very", "some", "any", "want", "like", "not", "no",
    "book", "books", "novel", "read", "reading",
}

_BOOK_COLUMNS = (
    "book_id, isbn13, isbn, title, authors, description, average_rating, ratings_count, "
    "num_pages, publication_year, image_url, genres, joy, sadness, fear, anger, surprise, "
    "disgust, neutral, vibe_tone, vibe_pacing, vibe_depth, vibe_length"
)

# Goodreads shelves -> the 11 canonical categories used by the UI (default: Fiction).
# Rules are checked in order for each shelf name; the first matching shelf wins.
_CATEGORY_RULES = [
    ("Comics & Graphic Novels", r"\bcomics?\b|graphic novel|\bmanga\b|\bgraphic\b"),
    ("Mystery & Thriller", r"mystery|thriller|crime|detective|suspense|\bnoir\b"),
    ("Sci-Fi & Fantasy", r"fantasy|science fiction|\bsci[- ]?fi\b|dystopi|paranormal|\bmagic\b|dragons?"),
    ("Romance", r"romance|chick lit"),
    ("Biography & Memoir", r"biograph|memoir"),
    ("History & Politics", r"\bhistory\b|politic|military|world war|\btravel\b"),
    ("Philosophy & Religion", r"philosoph|religion|spiritual|christian|theology|buddhis|\bislam"),
    ("Science & Nature", r"\bscience\b|\bnature\b|psycholog|biology|physics|mathematic|technology|computer"),
    ("Young Adult & Children", r"young adult|\bya\b|children|middle grade|picture book|juvenile"),
    ("Business & Self-Help", r"business|self[- ]help|personal development|finance|leadership|productivity|management"),
    ("Arts & Literature", r"poetry|\bart\b|literature|classics?|\bplays?\b|\bdrama\b|cooking|\bmusic\b|essays?"),
]
_CATEGORY_PATTERNS = [(name, re.compile(pattern)) for name, pattern in _CATEGORY_RULES]


def simplify_category(genres: List[str]) -> str:
    """Map a book's Goodreads shelf names to one of the UI's canonical categories."""
    for genre in genres:
        g = genre.lower()
        for name, pattern in _CATEGORY_PATTERNS:
            if pattern.search(g):
                return name
    return "Fiction"


def _row_to_book(row: sqlite3.Row) -> Dict[str, Any]:
    """Convert a goodreads.db row into the book dict shape the rest of the app expects."""
    try:
        genres = json.loads(row["genres"] or "[]")
    except (TypeError, ValueError):
        genres = []
    if not genres:
        genres = ["General Fiction"]

    book_id = str(row["book_id"])
    isbn13 = (row["isbn13"] or "").strip()
    image_url = (row["image_url"] or "").strip()
    if not image_url.startswith("http") or "nophoto" in image_url:
        image_url = FALLBACK_COVER

    return {
        # The UI identifies books by "isbn13". Many Goodreads books have none, so fall back to book_id.
        "isbn13": isbn13 or book_id,
        "book_id": book_id,
        "isbn10": (row["isbn"] or "").strip(),
        "title": row["title"] or "",
        "authors": row["authors"] or "Unknown",
        "categories": simplify_category(genres),
        "raw_category": ", ".join(genres),
        "thumbnail": image_url,
        "description": row["description"] or "",
        "published_year": int(row["publication_year"] or 0),
        "average_rating": float(row["average_rating"] or 0.0),
        "num_pages": int(row["num_pages"] or 0),
        "ratings_count": int(row["ratings_count"] or 0),
        "emotions": {
            name: float(row[name] or 0.0)
            for name in ("joy", "sadness", "fear", "anger", "surprise", "disgust", "neutral")
        },
        # The indexer and the UI use opposite signs for two axes:
        #   pacing: indexer + = fast-paced, UI + = slow-burn   -> flip
        #   depth:  indexer + = cerebral,   UI + = escapist    -> flip
        "vibe_scores": {
            "dark_light": round(float(row["vibe_tone"] or 0.0), 3),
            "pacing": round(0.0 - float(row["vibe_pacing"] or 0.0), 3),
            "cerebral_escapist": round(0.0 - float(row["vibe_depth"] or 0.0), 3),
            "length_scale": round(float(row["vibe_length"] or 0.0), 3),
        },
        # No 2D UMAP projection exists for the full catalogue yet.
        "galaxy_x": 0.0,
        "galaxy_y": 0.0,
    }


class _CatalogView:
    """Dict-like lookup backed by goodreads.db (supports .get(), [], `in` and len()).

    Iterating over millions of books is not supported on purpose.
    """

    def __init__(self, service: "RetrievalService"):
        self._service = service

    def get(self, key: Any, default: Any = None) -> Any:
        book = self._service.get_book(str(key))
        return book if book is not None else default

    def __getitem__(self, key: Any) -> Dict[str, Any]:
        book = self._service.get_book(str(key))
        if book is None:
            raise KeyError(key)
        return book

    def __contains__(self, key: Any) -> bool:
        return self._service.get_book(str(key)) is not None

    def __len__(self) -> int:
        return self._service.book_count

    def __bool__(self) -> bool:
        return self._service.book_count > 0

    def _unsupported(self, *args: Any, **kwargs: Any):
        raise NotImplementedError("The catalogue has millions of books and cannot be iterated in memory.")

    values = items = keys = __iter__ = _unsupported


class RetrievalService:
    def __init__(
        self,
        data_dir: str = "data",
        collection_name: str = DEFAULT_COLLECTION,
        db_name: str = DEFAULT_DB_NAME,
        embed_model: Optional[Any] = None,
        collection: Optional[Any] = None,
    ):
        """`embed_model` and `collection` can be injected (used by the tests)."""
        self.data_dir = Path(data_dir)
        self.collection_name = collection_name
        self.db_path = self.data_dir / db_name
        self._injected_collection = collection
        self._lock = threading.RLock()
        print("Initializing RetrievalService...")

        # 1. Embedding model (must be the same model the index was built with)
        self.embed_model = embed_model or SentenceTransformer(EMBEDDING_MODEL)

        self.chroma_client = None
        self.collection = None
        self.conn: Optional[sqlite3.Connection] = None
        self.book_count = 0
        self.catalog = _CatalogView(self)

        self._open_data()

    def _open_data(self) -> None:
        with self._lock:
            # 2. SQLite: metadata, vibe/emotion scores and the FTS5 keyword index
            if self.conn is not None:
                self.conn.close()
                self.conn = None
            self.book_count = 0
            if self.db_path.exists():
                try:
                    self.conn = sqlite3.connect(str(self.db_path), check_same_thread=False)
                    self.conn.row_factory = sqlite3.Row
                    self.book_count = int(self.conn.execute("SELECT COUNT(*) FROM books").fetchone()[0])
                    print(f"Loaded {self.db_path.name} with {self.book_count:,} books")
                except sqlite3.Error as e:
                    print(f"Warning: Could not read {self.db_path}: {e}")
                    self.conn = None
                    self.book_count = 0
            else:
                print(f"Warning: {self.db_path} not found! Run scripts/stream_goodreads_index.py first.")

            # 3. ChromaDB: dense vectors
            if self._injected_collection is not None:
                self.collection = self._injected_collection
            else:
                try:
                    self.chroma_client = chromadb.PersistentClient(path=str(self.data_dir / "chroma_db"))
                    self.collection = self.chroma_client.get_collection(name=self.collection_name)
                    print(f"Loaded ChromaDB collection '{self.collection_name}' with {self.collection.count():,} books")
                except Exception as e:
                    print(f"Warning: Could not open collection '{self.collection_name}': {e}")
                    self.collection = None

    def reload_data(self) -> None:
        """Re-open the database and Chroma collection (e.g. after more books were indexed)."""
        self._open_data()

    # ------------------------------------------------------------------ lookups

    def get_book(self, identifier: str) -> Optional[Dict[str, Any]]:
        """Find a book by Goodreads book_id or by isbn13."""
        ident = str(identifier or "").strip()
        if not ident or self.conn is None:
            return None
        with self._lock:
            row = self.conn.execute(f"SELECT {_BOOK_COLUMNS} FROM books WHERE book_id = ?", (ident,)).fetchone()
            if row is None:
                row = self.conn.execute(
                    f"SELECT {_BOOK_COLUMNS} FROM books WHERE isbn13 = ? LIMIT 1", (ident,)
                ).fetchone()
        return _row_to_book(row) if row is not None else None

    def _fetch_books(self, book_ids: List[str]) -> Dict[str, Dict[str, Any]]:
        books: Dict[str, Dict[str, Any]] = {}
        if self.conn is None:
            return books
        with self._lock:
            for i in range(0, len(book_ids), 500):
                chunk = book_ids[i : i + 500]
                placeholders = ",".join("?" * len(chunk))
                rows = self.conn.execute(
                    f"SELECT {_BOOK_COLUMNS} FROM books WHERE book_id IN ({placeholders})", chunk
                ).fetchall()
                for row in rows:
                    book = _row_to_book(row)
                    books[book["book_id"]] = book
        return books

    # ------------------------------------------------------------------ snippets

    def _split_sentences(self, text: str) -> List[str]:
        sentences = re.split(r"(?<=[.!?])\s+", text)
        clean = [s.strip() for s in sentences if len(s.strip().split()) >= 3]
        return clean if clean else [text]

    def find_best_matching_snippet(self, description: str, query_emb: np.ndarray) -> str:
        """Find the sentence in the book description most semantically similar to the query."""
        sentences = self._split_sentences(description)
        if not sentences or len(sentences) == 1:
            return sentences[0] if sentences else ""

        try:
            sent_embs = self.embed_model.encode(sentences, normalize_embeddings=True)
            sims = np.dot(sent_embs, query_emb)
            best_idx = int(np.argmax(sims))
            return sentences[best_idx]
        except Exception:
            return sentences[0]

    # ------------------------------------------------------------------ candidate search

    @staticmethod
    def _query_tokens(query: str) -> List[str]:
        tokens = re.findall(r"\w+", query.lower())
        unique = list(dict.fromkeys(tokens))
        informative = [t for t in unique if t not in STOPWORDS]
        return (informative or unique)[:MAX_QUERY_TOKENS]

    @staticmethod
    def _post_filters_active(filters: Optional[Filters]) -> bool:
        return bool(
            filters
            and (filters.category or filters.year_min or filters.year_max or filters.max_pages or filters.tone)
        )

    def _dense_search(
        self, query_emb: np.ndarray, n_candidates: int, filters: Optional[Filters]
    ) -> Tuple[Dict[str, int], Dict[str, float]]:
        ranks: Dict[str, int] = {}
        scores: Dict[str, float] = {}
        if self.collection is None:
            return ranks, scores
        n_results = min(n_candidates, self.collection.count())
        if n_results <= 0:
            return ranks, scores

        kwargs: Dict[str, Any] = {
            "query_embeddings": [query_emb.tolist()],
            "n_results": n_results,
            "include": ["distances"],
        }
        # Chroma only stores avg_rating and ratings_count, so only min_rating can be pre-filtered.
        if filters and filters.min_rating:
            kwargs["where"] = {"avg_rating": {"$gte": float(filters.min_rating)}}

        try:
            res = self.collection.query(**kwargs)
        except Exception as e:
            print(f"Warning: dense search failed, using keyword search only: {e}")
            return ranks, scores

        if res and res.get("ids") and len(res["ids"][0]) > 0:
            for rank, (book_id, dist) in enumerate(zip(res["ids"][0], res["distances"][0])):
                ranks[str(book_id)] = rank + 1
                # cosine distance in Chroma is 1 - cosine_similarity
                scores[str(book_id)] = max(0.0, 1.0 - float(dist))
        return ranks, scores

    def _bm25_search(self, query: str, n_candidates: int) -> Tuple[Dict[str, int], Dict[str, float]]:
        ranks: Dict[str, int] = {}
        scores: Dict[str, float] = {}
        tokens = self._query_tokens(query)
        if not tokens or self.conn is None:
            return ranks, scores

        match = " OR ".join(f'"{t}"' for t in tokens)
        try:
            with self._lock:
                # FTS5's hidden "rank" column is BM25; lower (more negative) means a better match.
                rows = self.conn.execute(
                    "SELECT book_id, rank FROM books_fts WHERE books_fts MATCH ? ORDER BY rank LIMIT ?",
                    (match, n_candidates),
                ).fetchall()
        except sqlite3.Error as e:
            print(f"Warning: keyword search failed, using dense search only: {e}")
            return ranks, scores

        hits = [(str(r["book_id"]), -float(r["rank"])) for r in rows]
        hits = [(book_id, score) for book_id, score in hits if score > 0]
        if not hits:
            return ranks, scores
        max_bm25 = max(score for _, score in hits) or 1.0
        for rank, (book_id, score) in enumerate(hits):
            ranks[book_id] = rank + 1
            scores[book_id] = round(score / max_bm25, 4)
        return ranks, scores

    # ------------------------------------------------------------------ search

    def search(
        self,
        query: str,
        filters: Optional[Filters] = None,
        sliders: Optional[VibeSliders] = None,
        limit: int = 24,
        rerank: bool = False,
    ) -> Tuple[List[BookItem], int]:
        if self.collection is None or self.conn is None or self.book_count == 0:
            return [], 0

        # Encode query
        query_emb = self.embed_model.encode(query, normalize_embeddings=True)

        # 1 + 2. Dense (Chroma) and sparse (FTS5 BM25) retrieval
        wide = self._post_filters_active(filters)
        dense_ranks, dense_scores = self._dense_search(
            query_emb, FILTERED_CANDIDATES if wide else DENSE_CANDIDATES, filters
        )
        bm25_ranks, bm25_scores = self._bm25_search(query, FILTERED_CANDIDATES if wide else BM25_CANDIDATES)

        # 3. Reciprocal Rank Fusion (RRF)
        # RRF_Score = 0.6 / (60 + dense_rank) + 0.4 / (60 + bm25_rank)
        all_candidate_ids = set(dense_ranks.keys()).union(bm25_ranks.keys())

        scored_candidates = []
        for book_id in all_candidate_ids:
            d_rank = dense_ranks.get(book_id, MISSING_RANK)
            b_rank = bm25_ranks.get(book_id, MISSING_RANK)
            rrf_val = (0.6 / (RRF_K + d_rank)) + (0.4 / (RRF_K + b_rank))
            scored_candidates.append({
                "book_id": book_id,
                "rrf_score": rrf_val,
                "dense_rank": d_rank if book_id in dense_ranks else None,
                "dense_score": dense_scores.get(book_id, 0.0),
                "bm25_rank": b_rank if book_id in bm25_ranks else None,
                "bm25_score": bm25_scores.get(book_id, 0.0),
            })

        # Normalize RRF scores
        if scored_candidates:
            max_rrf = max(c["rrf_score"] for c in scored_candidates) or 1.0
            for c in scored_candidates:
                c["rrf_score"] = c["rrf_score"] / max_rrf

        # Load metadata for all candidates in a few batched queries
        books = self._fetch_books([c["book_id"] for c in scored_candidates])

        # 4. Filter & Vibe Slider Re-ranking
        filtered_candidates = []
        for c in scored_candidates:
            book = books.get(c["book_id"])
            if not book:
                continue

            # --- Hard Filters ---
            if filters:
                if filters.category:
                    wanted = filters.category.lower()
                    if wanted not in book["categories"].lower() and wanted not in book["raw_category"].lower():
                        continue
                if filters.year_min or filters.year_max:
                    # A publication year of 0 means "unknown", which cannot satisfy a year filter.
                    if book["published_year"] <= 0:
                        continue
                    if filters.year_min and book["published_year"] < filters.year_min:
                        continue
                    if filters.year_max and book["published_year"] > filters.year_max:
                        continue
                if filters.max_pages and book["num_pages"] > filters.max_pages:
                    continue
                if filters.min_rating and book["average_rating"] < filters.min_rating:
                    continue
                if filters.tone:
                    tone_key = filters.tone.lower()
                    if tone_key in book["emotions"]:
                        # Require the tone's emotion score to be at least 0.10
                        if book["emotions"][tone_key] < 0.10:
                            continue

            # --- Vibe Slider Alignment ---
            vibe_multiplier = 1.0
            vibe_bonus_details = {}
            if sliders:
                book_vibes = book["vibe_scores"]
                for axis in ["dark_light", "pacing", "cerebral_escapist", "length_scale"]:
                    user_val = getattr(sliders, axis, 0.0)
                    if abs(user_val) > 0.08:
                        book_val = book_vibes.get(axis, 0.0)
                        diff = abs(user_val - book_val)
                        # Alignment in [0, 1] where 1 is perfect match
                        alignment = max(0.0, 1.0 - (diff / 2.0))
                        # Weight bonus by how strongly user pushed slider
                        bonus = abs(user_val) * (alignment - 0.5) * 0.8
                        vibe_multiplier += bonus
                        vibe_bonus_details[axis] = round(bonus, 3)

            vibe_multiplier = max(0.2, vibe_multiplier)
            final_score = c["rrf_score"] * vibe_multiplier

            filtered_candidates.append({
                "book": book,
                "score": final_score,
                "rrf_score": round(c["rrf_score"], 4),
                "dense_score": round(c["dense_score"], 4),
                "bm25_score": round(c["bm25_score"], 4),
                "dense_rank": c["dense_rank"],
                "bm25_rank": c["bm25_rank"],
                "vibe_multiplier": round(vibe_multiplier, 3),
                "vibe_bonus_details": vibe_bonus_details,
            })

        # Sort descending by final score
        filtered_candidates.sort(key=lambda x: x["score"], reverse=True)
        total_matches = len(filtered_candidates)
        top_candidates = filtered_candidates[:limit]

        # Extract highlighted sentence and build BookItems
        results: List[BookItem] = []
        for item in top_candidates:
            b = item["book"]
            snippet = self.find_best_matching_snippet(b["description"], query_emb)

            ranking_expl = {
                "final_score": round(item["score"], 4),
                "rrf_score": item["rrf_score"],
                "dense_rank": item["dense_rank"],
                "dense_score": item["dense_score"],
                "bm25_rank": item["bm25_rank"],
                "bm25_score": item["bm25_score"],
                "vibe_multiplier": item["vibe_multiplier"],
                "vibe_adjustments": item["vibe_bonus_details"],
            }

            book_item = BookItem(
                isbn13=b["isbn13"],
                isbn10=b.get("isbn10", ""),
                title=b["title"],
                authors=b["authors"],
                categories=b["categories"],
                raw_category=b.get("raw_category", ""),
                thumbnail=b["thumbnail"],
                description=b["description"],
                published_year=b["published_year"],
                average_rating=b["average_rating"],
                num_pages=b["num_pages"],
                ratings_count=b["ratings_count"],
                emotions=b.get("emotions", {}),
                vibe_scores=b.get("vibe_scores", {}),
                galaxy_x=b.get("galaxy_x", 0.0),
                galaxy_y=b.get("galaxy_y", 0.0),
                search_score=round(item["score"], 4),
                dense_score=item["dense_score"],
                bm25_score=item["bm25_score"],
                matched_snippet=snippet,
                ranking_explanation=ranking_expl,
            )
            results.append(book_item)

        return results, total_matches
