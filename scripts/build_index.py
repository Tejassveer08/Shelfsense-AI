"""
ShelfSense Index Builder
Processes data/books.csv into:
1. Cleaned and enriched metadata (data/books_enriched.json)
2. Persistent ChromaDB collection (data/chroma_db) with dense embeddings
3. BM25 inverted index (data/bm25_index.pkl) for keyword search
4. Emotion scores and Vibe Slider projections (saved in metadata and caches)
5. 2D UMAP Galaxy coordinates (data/galaxy_nodes.json)
"""

import os
import sys
import json
import pickle
import re
import argparse
from pathlib import Path
from typing import List, Dict, Any, Optional

import numpy as np
import pandas as pd
from tqdm import tqdm

from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.config import Settings
from rank_bm25 import BM25Okapi
import umap

# Anchor phrases for Vibe Slider projections
ANCHOR_PHRASES = {
    "cerebral": "intellectual philosophical complex analytical theoretical literary academic inquiry profound thought",
    "escapist": "entertaining fun thrilling lighthearted escapist adventure romance fantasy commercial easy read",
    "fast_paced": "fast-paced adrenaline action thriller page-turner urgent suspenseful rapid breathless intense",
    "slow_burn": "slow-burn atmospheric contemplative quiet lyrical character-driven gentle leisurely meditational",
    "dark": "dark bleak tragic harrowing horrific morbid gritty grim dystopian violent",
    "light": "uplifting hopeful heartwarming cheerful inspirational delightful optimistic joyful cozy",
}

# Simplified canonical categories
CANONICAL_CATEGORIES = [
    "Fiction",
    "Mystery & Thriller",
    "Sci-Fi & Fantasy",
    "Romance",
    "Biography & Memoir",
    "History & Politics",
    "Philosophy & Religion",
    "Science & Nature",
    "Young Adult & Children",
    "Arts & Literature",
    "Comics & Graphic Novels",
    "Business & Self-Help",
]

CATEGORY_MAPPING = {
    "Fiction": "Fiction",
    "Juvenile Fiction": "Young Adult & Children",
    "Biography & Autobiography": "Biography & Memoir",
    "History": "History & Politics",
    "Literary Criticism": "Arts & Literature",
    "Philosophy": "Philosophy & Religion",
    "Religion": "Philosophy & Religion",
    "Comics & Graphic Novels": "Comics & Graphic Novels",
    "Drama": "Arts & Literature",
    "Juvenile Nonfiction": "Young Adult & Children",
    "Science": "Science & Nature",
    "Poetry": "Arts & Literature",
    "Business & Economics": "Business & Self-Help",
    "Self-Help": "Business & Self-Help",
    "Political Science": "History & Politics",
    "Social Science": "History & Politics",
    "Body, Mind & Spirit": "Philosophy & Religion",
    "Psychology": "Science & Nature",
    "Art": "Arts & Literature",
    "Nature": "Science & Nature",
    "Cooking": "Arts & Literature",
    "Travel": "History & Politics",
    "Health & Fitness": "Business & Self-Help",
    "Computers": "Science & Nature",
    "True Crime": "Mystery & Thriller",
    "Young Adult Fiction": "Young Adult & Children",
}


def clean_text(text: Optional[str]) -> str:
    if not text or pd.isna(text):
        return ""
    text = str(text).strip()
    text = re.sub(r"\s+", " ", text)
    return text


def split_into_sentences(text: str) -> List[str]:
    """Simple robust sentence splitter."""
    sentences = re.split(r"(?<=[.!?])\s+", text)
    clean_sents = [s.strip() for s in sentences if len(s.strip().split()) >= 3]
    return clean_sents if clean_sents else [text]


def get_fallback_cover(title: str, author: str) -> str:
    """Generate a clean book cover URL placeholder or Unsplash fallback."""
    # Using high reliability OpenLibrary or Unsplash book cover
    return "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400"


def compute_vibe_scores(
    emotions: Dict[str, float],
    num_pages: int,
    desc_emb: np.ndarray,
    anchor_embs: Dict[str, np.ndarray],
) -> Dict[str, float]:
    """
    Derive 4 continuous vibe axes in [-1.0, 1.0]:
    1. dark_light: Dark (-1.0) <-> Light (+1.0)
    2. pacing: Fast-paced (-1.0) <-> Slow-burn (+1.0)
    3. cerebral_escapist: Cerebral (-1.0) <-> Escapist (+1.0)
    4. length_scale: Short (-1.0) <-> Epic (+1.0)
    """
    # 1. Dark <-> Light:
    # Emotion balance: joy - (fear + sadness + anger + disgust)
    emo_valence = (
        emotions.get("joy", 0.0) * 1.5
        + emotions.get("surprise", 0.0) * 0.2
        - (
            emotions.get("fear", 0.0)
            + emotions.get("sadness", 0.0)
            + emotions.get("anger", 0.0)
            + emotions.get("disgust", 0.0)
        )
    )
    # Anchor projection
    sim_light = np.dot(desc_emb, anchor_embs["light"])
    sim_dark = np.dot(desc_emb, anchor_embs["dark"])
    anchor_valence = sim_light - sim_dark
    dark_light = float(np.clip((emo_valence * 0.5 + anchor_valence * 2.5), -1.0, 1.0))

    # 2. Pacing: Fast-paced (-1.0) <-> Slow-burn (+1.0)
    sim_fast = np.dot(desc_emb, anchor_embs["fast_paced"])
    sim_slow = np.dot(desc_emb, anchor_embs["slow_burn"])
    pacing_anchor = sim_slow - sim_fast
    pacing = float(np.clip(pacing_anchor * 3.0, -1.0, 1.0))

    # 3. Cerebral (-1.0) <-> Escapist (+1.0)
    sim_cerebral = np.dot(desc_emb, anchor_embs["cerebral"])
    sim_escapist = np.dot(desc_emb, anchor_embs["escapist"])
    cerebral_escapist = float(np.clip((sim_escapist - sim_cerebral) * 3.0, -1.0, 1.0))

    # 4. Short (-1.0) <-> Epic (+1.0)
    # Baseline: 300 pages = 0.0, 150 pages = -0.8, 600+ pages = +0.8
    p = max(50, min(1200, num_pages))
    length_scale = float(np.clip((p - 320) / 250.0, -1.0, 1.0))

    return {
        "dark_light": round(dark_light, 3),
        "pacing": round(pacing, 3),
        "cerebral_escapist": round(cerebral_escapist, 3),
        "length_scale": round(length_scale, 3),
    }


def main():
    parser = argparse.ArgumentParser(description="Build ShelfSense index and artifacts")
    parser.add_argument("--data-path", type=str, default="data/books.csv")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of books for test runs")
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--force-rebuild", action="store_true", help="Force rebuild all indices")
    args = parser.parse_args()

    data_dir = Path("data")
    data_dir.mkdir(parents=True, exist_ok=True)

    csv_path = Path(args.data_path)
    if not csv_path.exists():
        print(f"Error: {csv_path} does not exist!")
        sys.exit(1)

    print("=" * 60)
    print(" ShelfSense Index & Knowledge Base Builder")
    print("=" * 60)

    # Step 1: Load and clean raw books CSV
    print("\n[1/6] Loading and cleaning dataset...")
    df = pd.read_csv(csv_path)
    print(f"Loaded {len(df)} raw records from {csv_path}")

    # Drop rows with description under 25 words
    mask = df["description"].fillna("").apply(lambda x: len(str(x).split()) >= 25)
    df_clean = df[mask].copy()
    print(f"Filtered to {len(df_clean)} books with descriptions >= 25 words")

    # Combine title + subtitle
    def combine_title(row):
        t = clean_text(row.get("title", ""))
        s = clean_text(row.get("subtitle", ""))
        if s and s.lower() not in t.lower():
            return f"{t}: {s}"
        return t

    df_clean["clean_title"] = df_clean.apply(combine_title, axis=1)
    df_clean["clean_authors"] = df_clean["authors"].fillna("Unknown Author").apply(clean_text)
    df_clean["clean_description"] = df_clean["description"].apply(clean_text)

    # Clean numeric fields
    df_clean["published_year"] = pd.to_numeric(df_clean["published_year"], errors="coerce").fillna(2000).astype(int)
    df_clean["average_rating"] = pd.to_numeric(df_clean["average_rating"], errors="coerce").fillna(4.0).round(2)
    df_clean["num_pages"] = pd.to_numeric(df_clean["num_pages"], errors="coerce").fillna(300).astype(int)
    df_clean["ratings_count"] = pd.to_numeric(df_clean["ratings_count"], errors="coerce").fillna(0).astype(int)
    df_clean["isbn13"] = df_clean["isbn13"].astype(str).str.replace(".0", "", regex=False).str.strip()

    # Clean thumbnails
    df_clean["clean_thumbnail"] = df_clean.apply(
        lambda r: str(r["thumbnail"]).strip() if pd.notna(r.get("thumbnail")) and str(r.get("thumbnail")).startswith("http")
        else get_fallback_cover(r["clean_title"], r["clean_authors"]),
        axis=1,
    )

    # Simplified categories
    def assign_category(raw_cat):
        if not raw_cat or pd.isna(raw_cat):
            return "Fiction"
        raw_str = str(raw_cat).strip()
        for k, v in CATEGORY_MAPPING.items():
            if k.lower() in raw_str.lower():
                return v
        return "Fiction"

    df_clean["simplified_category"] = df_clean["categories"].apply(assign_category)

    if args.limit:
        print(f"Limiting to first {args.limit} books for this run...")
        df_clean = df_clean.head(args.limit).copy()

    total_books = len(df_clean)
    books_records = df_clean.to_dict(orient="records")

    # Step 2: Dense Embeddings model
    print("\n[2/6] Initializing embedding model (all-MiniLM-L6-v2)...")
    embed_model = SentenceTransformer("all-MiniLM-L6-v2")

    # Pre-encode anchor phrases for Vibe calculations
    anchor_embs = {}
    for key, phrase in ANCHOR_PHRASES.items():
        anchor_embs[key] = embed_model.encode(phrase, normalize_embeddings=True)

    # Create document text representation
    doc_texts = [
        f"Title: {b['clean_title']}. Author: {b['clean_authors']}. Category: {b['simplified_category']}. Description: {b['clean_description']}"
        for b in books_records
    ]

    print(f"Encoding {len(doc_texts)} book documents...")
    embeddings = embed_model.encode(
        doc_texts,
        batch_size=args.batch_size,
        show_progress_bar=True,
        normalize_embeddings=True,
    )
    print(f"Generated embeddings shape: {embeddings.shape}")

    # Step 3: Emotion Scoring & Vibe Calculation
    print("\n[3/6] Computing Emotion & Vibe profiles...")
    emotions_cache_file = data_dir / "emotions_cache.json"
    emotions_cache = {}
    if emotions_cache_file.exists() and not args.force_rebuild:
        try:
            with open(emotions_cache_file, "r", encoding="utf-8") as f:
                emotions_cache = json.load(f)
            print(f"Loaded {len(emotions_cache)} precomputed emotions from cache.")
        except Exception as e:
            print(f"Could not load emotions cache: {e}")

    # Books that still need emotions
    needed_isbns = [b["isbn13"] for b in books_records if b["isbn13"] not in emotions_cache]
    if needed_isbns:
        print(f"Computing emotions for {len(needed_isbns)} books using DistilRoBERTa...")
        from transformers import pipeline
        try:
            emotion_classifier = pipeline(
                "text-classification",
                model="j-hartmann/emotion-english-distilroberta-base",
                top_k=None,
                device=-1,
                truncation=True,
                max_length=128,
            )

            # Process in batches
            batch_sentences = []
            sentence_to_isbn = []
            for b in tqdm(books_records, desc="Extracting description sentences"):
                isbn = b["isbn13"]
                if isbn in emotions_cache:
                    continue
                sents = split_into_sentences(b["clean_description"])[:4]  # take first 4 sentences
                for s in sents:
                    batch_sentences.append(s[:256])
                    sentence_to_isbn.append(isbn)

            # Classify sentences
            print(f"Classifying {len(batch_sentences)} sentences...")
            pred_batch_size = 64
            book_sentence_scores: Dict[str, List[Dict[str, float]]] = {}
            for i in tqdm(range(0, len(batch_sentences), pred_batch_size), desc="Emotion Batches"):
                chunk = batch_sentences[i : i + pred_batch_size]
                chunk_isbns = sentence_to_isbn[i : i + pred_batch_size]
                results = emotion_classifier(chunk)
                for isbn, res in zip(chunk_isbns, results):
                    score_dict = {item["label"]: float(item["score"]) for item in res}
                    if isbn not in book_sentence_scores:
                        book_sentence_scores[isbn] = []
                    book_sentence_scores[isbn].append(score_dict)

            # Average per book
            for isbn, scores_list in book_sentence_scores.items():
                avg_scores = {k: 0.0 for k in ["anger", "disgust", "fear", "joy", "sadness", "surprise", "neutral"]}
                for s in scores_list:
                    for k in avg_scores:
                        avg_scores[k] += s.get(k, 0.0)
                n = max(1, len(scores_list))
                emotions_cache[isbn] = {k: round(v / n, 4) for k, v in avg_scores.items()}

            # Save updated cache
            with open(emotions_cache_file, "w", encoding="utf-8") as f:
                json.dump(emotions_cache, f, indent=2)
            print(f"Saved emotions cache to {emotions_cache_file}")

        except Exception as e:
            print(f"Warning during transformer emotion classification: {e}")
            print("Using semantic emotion fallback based on anchor projections...")
            # Fallback for remaining
            emotion_anchors = {
                "joy": embed_model.encode("joyful happy cheerful wonderful delight fun", normalize_embeddings=True),
                "sadness": embed_model.encode("sad sorrow grief crying tragedy heartbreak melancholy", normalize_embeddings=True),
                "fear": embed_model.encode("fear terror horror scary danger fright dread", normalize_embeddings=True),
                "anger": embed_model.encode("anger fury rage violent conflict outrage revenge", normalize_embeddings=True),
                "surprise": embed_model.encode("surprise shock unexpected miracle revelation twist", normalize_embeddings=True),
                "disgust": embed_model.encode("disgust revolting repulsive gross loathing", normalize_embeddings=True),
                "neutral": embed_model.encode("neutral balanced historical informative straightforward", normalize_embeddings=True),
            }
            for i, b in enumerate(books_records):
                isbn = b["isbn13"]
                if isbn not in emotions_cache:
                    e_vec = embeddings[i]
                    raw_sims = {k: float(max(0.0, np.dot(e_vec, a_vec))) for k, a_vec in emotion_anchors.items()}
                    total_sim = sum(raw_sims.values()) or 1.0
                    emotions_cache[isbn] = {k: round(v / total_sim, 4) for k, v in raw_sims.items()}

    # Compute vibe scores for all books
    enriched_books = []
    for idx, b in enumerate(books_records):
        isbn = b["isbn13"]
        book_emo = emotions_cache.get(
            isbn,
            {"anger": 0.05, "disgust": 0.05, "fear": 0.1, "joy": 0.3, "sadness": 0.1, "surprise": 0.1, "neutral": 0.3},
        )
        vibe = compute_vibe_scores(
            emotions=book_emo,
            num_pages=b["num_pages"],
            desc_emb=embeddings[idx],
            anchor_embs=anchor_embs,
        )

        enriched_record = {
            "isbn13": isbn,
            "isbn10": str(b.get("isbn10", "")),
            "title": b["clean_title"],
            "authors": b["clean_authors"],
            "categories": b["simplified_category"],
            "raw_category": str(b.get("categories", "")),
            "thumbnail": b["clean_thumbnail"],
            "description": b["clean_description"],
            "published_year": int(b["published_year"]),
            "average_rating": float(b["average_rating"]),
            "num_pages": int(b["num_pages"]),
            "ratings_count": int(b["ratings_count"]),
            "emotions": book_emo,
            "vibe_scores": vibe,
        }
        enriched_books.append(enriched_record)

    # Step 4: 2D UMAP Projection for Discovery Galaxy
    print("\n[4/6] Computing 2D UMAP projection for Discovery Galaxy...")
    reducer = umap.UMAP(
        n_neighbors=15,
        min_dist=0.15,
        n_components=2,
        metric="cosine",
        random_state=42,
    )
    umap_coords = reducer.fit_transform(embeddings)

    # Normalize coordinates to [-100, 100]
    min_x, max_x = float(umap_coords[:, 0].min()), float(umap_coords[:, 0].max())
    min_y, max_y = float(umap_coords[:, 1].min()), float(umap_coords[:, 1].max())

    norm_x = ((umap_coords[:, 0] - min_x) / (max_x - min_x) * 200 - 100).round(2)
    norm_y = ((umap_coords[:, 1] - min_y) / (max_y - min_y) * 200 - 100).round(2)

    galaxy_nodes = []
    for idx, b in enumerate(enriched_books):
        b["galaxy_x"] = float(norm_x[idx])
        b["galaxy_y"] = float(norm_y[idx])
        galaxy_nodes.append({
            "isbn13": b["isbn13"],
            "title": b["title"],
            "authors": b["authors"],
            "category": b["categories"],
            "rating": b["average_rating"],
            "pages": b["num_pages"],
            "year": b["published_year"],
            "cover": b["thumbnail"],
            "x": float(norm_x[idx]),
            "y": float(norm_y[idx]),
            "vibe_scores": b["vibe_scores"],
            "emotions": b["emotions"],
        })

    # Save galaxy JSON
    galaxy_path = data_dir / "galaxy_nodes.json"
    with open(galaxy_path, "w", encoding="utf-8") as f:
        json.dump(galaxy_nodes, f, indent=2)
    print(f"Saved {len(galaxy_nodes)} galaxy nodes to {galaxy_path}")

    # Save enriched books JSON and CSV
    enriched_json_path = data_dir / "books_enriched.json"
    with open(enriched_json_path, "w", encoding="utf-8") as f:
        json.dump(enriched_books, f, indent=2)
    print(f"Saved {len(enriched_books)} enriched books to {enriched_json_path}")

    # Step 5: BM25 Inverted Index
    print("\n[5/6] Building BM25 index for keyword search...")
    corpus_tokens = [
        re.findall(r"\w+", f"{b['title']} {b['authors']} {b['categories']} {b['description']}".lower())
        for b in enriched_books
    ]
    bm25 = BM25Okapi(corpus_tokens)
    bm25_data = {
        "bm25": bm25,
        "isbns": [b["isbn13"] for b in enriched_books],
    }
    bm25_path = data_dir / "bm25_index.pkl"
    with open(bm25_path, "wb") as f:
        pickle.dump(bm25_data, f)
    print(f"Saved BM25 index to {bm25_path}")

    # Step 6: ChromaDB Vector Store
    print("\n[6/6] Populating ChromaDB persistent store...")
    chroma_dir = data_dir / "chroma_db"
    client = chromadb.PersistentClient(path=str(chroma_dir))

    # Delete existing collection if force rebuild
    collection_name = "books"
    existing_cols = [c.name for c in client.list_collections()]
    if collection_name in existing_cols:
        client.delete_collection(name=collection_name)

    collection = client.create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"},
    )

    # Insert in batches
    insert_batch_size = 500
    for i in tqdm(range(0, len(enriched_books), insert_batch_size), desc="ChromaDB insert"):
        batch = enriched_books[i : i + insert_batch_size]
        batch_ids = [b["isbn13"] for b in batch]
        batch_embs = embeddings[i : i + insert_batch_size].tolist()
        batch_docs = [
            f"Title: {b['title']}. Author: {b['authors']}. Category: {b['categories']}. Description: {b['description']}"
            for b in batch
        ]
        batch_metadatas = [
            {
                "isbn13": b["isbn13"],
                "title": b["title"][:200],
                "authors": b["authors"][:150],
                "categories": b["categories"],
                "average_rating": float(b["average_rating"]),
                "num_pages": int(b["num_pages"]),
                "published_year": int(b["published_year"]),
                "ratings_count": int(b["ratings_count"]),
                "dark_light": float(b["vibe_scores"]["dark_light"]),
                "pacing": float(b["vibe_scores"]["pacing"]),
                "cerebral_escapist": float(b["vibe_scores"]["cerebral_escapist"]),
                "length_scale": float(b["vibe_scores"]["length_scale"]),
                "galaxy_x": float(b["galaxy_x"]),
                "galaxy_y": float(b["galaxy_y"]),
            }
            for b in batch
        ]

        collection.add(
            ids=batch_ids,
            embeddings=batch_embs,
            documents=batch_docs,
            metadatas=batch_metadatas,
        )

    print(f"\nSuccessfully built ChromaDB index with {collection.count()} books!")
    print("=" * 60)
    print(" Indexing Complete! All artifacts generated:")
    print(f" - {enriched_json_path}")
    print(f" - {galaxy_path}")
    print(f" - {bm25_path}")
    print(f" - {chroma_dir}/")
    print("=" * 60)


if __name__ == "__main__":
    main()
