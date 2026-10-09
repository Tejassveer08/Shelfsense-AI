"""
Hybrid Retrieval and Re-ranking Engine for ShelfSense
Combines:
- Dense Vector Search (ChromaDB + all-MiniLM-L6-v2)
- BM25 Lexical Keyword Search (rank_bm25)
- Reciprocal Rank Fusion (RRF)
- Dynamic Vibe Slider alignment scoring
- Sentence-level similarity extraction for grounded snippet highlighting
"""

import re
import pickle
import json
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

import numpy as np
from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.config import Settings
from rank_bm25 import BM25Okapi

from backend.app.models.schemas import Filters, VibeSliders, BookItem


class RetrievalService:
    def __init__(self, data_dir: str = "data"):
        self.data_dir = Path(data_dir)
        print("Initializing RetrievalService...")

        # 1. Embedding Model
        self.embed_model = SentenceTransformer("all-MiniLM-L6-v2")

        # 2. ChromaDB Client
        chroma_path = self.data_dir / "chroma_db"
        self.chroma_client = chromadb.PersistentClient(path=str(chroma_path))
        try:
            self.collection = self.chroma_client.get_collection(name="books")
            print(f"Loaded ChromaDB collection with {self.collection.count()} books")
        except Exception as e:
            print(f"Warning: Could not open collection 'books': {e}")
            self.collection = None

        # 3. BM25 Inverted Index
        bm25_path = self.data_dir / "bm25_index.pkl"
        if bm25_path.exists():
            with open(bm25_path, "rb") as f:
                bm25_data = pickle.load(f)
                self.bm25: Optional[BM25Okapi] = bm25_data["bm25"]
                self.bm25_isbns: List[str] = bm25_data["isbns"]
                self.isbn_to_bm25_idx = {isbn: idx for idx, isbn in enumerate(self.bm25_isbns)}
            print(f"Loaded BM25 index with {len(self.bm25_isbns)} documents")
        else:
            print("Warning: BM25 index not found!")
            self.bm25 = None
            self.bm25_isbns = []
            self.isbn_to_bm25_idx = {}

        # 4. Enriched Metadata Catalog
        enriched_path = self.data_dir / "books_enriched.json"
        self.catalog: Dict[str, Dict[str, Any]] = {}
        if enriched_path.exists():
            with open(enriched_path, "r", encoding="utf-8") as f:
                books = json.load(f)
                self.catalog = {b["isbn13"]: b for b in books}
            print(f"Loaded {len(self.catalog)} enriched books into catalog memory")
        else:
            print("Warning: books_enriched.json not found!")

    def reload_data(self):
        """Reload catalog, BM25, and Chroma collection once index build finishes."""
        self.__init__(data_dir=str(self.data_dir))

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

    def search(
        self,
        query: str,
        filters: Optional[Filters] = None,
        sliders: Optional[VibeSliders] = None,
        limit: int = 24,
        rerank: bool = False,
    ) -> Tuple[List[BookItem], int]:
        if not self.collection or not self.catalog:
            return [], 0

        # Encode query
        query_emb = self.embed_model.encode(query, normalize_embeddings=True)

        # 1. Dense retrieval (top 120)
        dense_results = self.collection.query(
            query_embeddings=[query_emb.tolist()],
            n_results=min(120, self.collection.count()),
            include=["metadatas", "distances"],
        )

        dense_ranks: Dict[str, int] = {}
        dense_scores: Dict[str, float] = {}
        if dense_results and dense_results["ids"] and len(dense_results["ids"][0]) > 0:
            for rank, (isbn, dist) in enumerate(zip(dense_results["ids"][0], dense_results["distances"][0])):
                dense_ranks[isbn] = rank + 1
                # cosine distance in Chroma is 1 - cosine_similarity
                dense_scores[isbn] = max(0.0, 1.0 - float(dist))

        # 2. Sparse BM25 retrieval (top 120)
        bm25_ranks: Dict[str, int] = {}
        bm25_scores: Dict[str, float] = {}
        if self.bm25 and self.bm25_isbns:
            query_tokens = re.findall(r"\w+", query.lower())
            if query_tokens:
                doc_scores = self.bm25.get_scores(query_tokens)
                top_indices = np.argsort(doc_scores)[::-1][:120]
                max_bm25 = float(doc_scores[top_indices[0]]) if len(top_indices) > 0 and doc_scores[top_indices[0]] > 0 else 1.0
                for rank, idx in enumerate(top_indices):
                    score = float(doc_scores[idx])
                    if score > 0:
                        isbn = self.bm25_isbns[idx]
                        bm25_ranks[isbn] = rank + 1
                        bm25_scores[isbn] = round(score / max_bm25, 4)

        # 3. Reciprocal Rank Fusion (RRF)
        # RRF_Score = 0.6 / (60 + dense_rank) + 0.4 / (60 + bm25_rank)
        k_rrf = 60
        all_candidate_isbns = set(dense_ranks.keys()).union(set(bm25_ranks.keys()))

        scored_candidates = []
        for isbn in all_candidate_isbns:
            d_rank = dense_ranks.get(isbn, 500)
            b_rank = bm25_ranks.get(isbn, 500)
            rrf_val = (0.6 / (k_rrf + d_rank)) + (0.4 / (k_rrf + b_rank))
            scored_candidates.append({
                "isbn": isbn,
                "rrf_score": rrf_val,
                "dense_rank": d_rank if isbn in dense_ranks else None,
                "dense_score": dense_scores.get(isbn, 0.0),
                "bm25_rank": b_rank if isbn in bm25_ranks else None,
                "bm25_score": bm25_scores.get(isbn, 0.0),
            })

        # Normalize RRF scores
        if scored_candidates:
            max_rrf = max(c["rrf_score"] for c in scored_candidates) or 1.0
            for c in scored_candidates:
                c["rrf_score"] = c["rrf_score"] / max_rrf

        # 4. Filter & Vibe Slider Re-ranking
        filtered_candidates = []
        for c in scored_candidates:
            isbn = c["isbn"]
            book = self.catalog.get(isbn)
            if not book:
                continue

            # --- Hard Filters ---
            if filters:
                if filters.category:
                    cat_match = filters.category.lower() in book["categories"].lower() or filters.category.lower() in str(book.get("raw_category", "")).lower()
                    if not cat_match:
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
                    if tone_key in book.get("emotions", {}):
                        # Require tone score to be above 0.12 or top emotion
                        if book["emotions"][tone_key] < 0.10:
                            continue

            # --- Vibe Slider Alignment ---
            vibe_multiplier = 1.0
            vibe_bonus_details = {}
            if sliders:
                book_vibes = book.get("vibe_scores", {})
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
