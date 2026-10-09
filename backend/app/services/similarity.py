"""
Similarity Engine for Taste Profiles and Contrast Mode in ShelfSense
Supports:
1. Taste Profile: Weighted composite vector from 1-5 loved books
2. Contrast Mode: Vector arithmetic combining book embedding + modifier direction
"""

from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from sentence_transformers import SentenceTransformer
import chromadb

from backend.app.models.schemas import BookItem


class SimilarityService:
    def __init__(self, retrieval_service):
        self.retrieval = retrieval_service
        self.embed_model: SentenceTransformer = retrieval_service.embed_model
        self.collection = retrieval_service.collection
        self.catalog = retrieval_service.catalog

    def get_book_embedding(self, isbn13: str) -> Optional[np.ndarray]:
        """Fetch precomputed embedding from ChromaDB by ID."""
        if not self.collection:
            return None
        try:
            res = self.collection.get(ids=[isbn13], include=["embeddings"])
            if res and res["embeddings"] and len(res["embeddings"]) > 0:
                return np.array(res["embeddings"][0], dtype=np.float32)
        except Exception as e:
            print(f"Error fetching embedding for {isbn13}: {e}")

        # Fallback: re-encode if not found in Chroma
        book = self.catalog.get(isbn13)
        if book:
            text = f"Title: {book['title']}. Author: {book['authors']}. Category: {book['categories']}. Description: {book['description']}"
            return self.embed_model.encode(text, normalize_embeddings=True)
        return None

    def recommend_from_taste_profile(
        self,
        isbn13s: List[str],
        ratings: Optional[Dict[str, float]] = None,
        limit: int = 12,
    ) -> Tuple[List[BookItem], List[str]]:
        """
        Builds a composite taste vector from 1-5 books, weighted by user rating (1-5 stars).
        """
        valid_embs = []
        weights = []
        attributed_titles = []

        for isbn in isbn13s:
            emb = self.get_book_embedding(isbn)
            if emb is not None:
                valid_embs.append(emb)
                # Weight: user rating if provided (e.g. 5 stars = 1.5, 4 stars = 1.0, 3 stars = 0.6)
                r = (ratings.get(isbn, 5.0) if ratings else 5.0)
                w = max(0.2, (r / 5.0) ** 1.5)
                weights.append(w)
                b = self.catalog.get(isbn)
                if b:
                    attributed_titles.append(b["title"])

        if not valid_embs:
            return [], []

        # Weighted average vector
        weights_arr = np.array(weights).reshape(-1, 1)
        taste_vector = np.sum(np.array(valid_embs) * weights_arr, axis=0) / np.sum(weights_arr)
        norm = np.linalg.norm(taste_vector)
        if norm > 0:
            taste_vector = taste_vector / norm

        # Query ChromaDB (fetch extra to filter out source books)
        results = self.collection.query(
            query_embeddings=[taste_vector.tolist()],
            n_results=min(limit + len(isbn13s) + 10, self.collection.count()),
            include=["metadatas", "distances"],
        )

        recommended_books: List[BookItem] = []
        if results and results["ids"] and len(results["ids"][0]) > 0:
            for isbn, dist in zip(results["ids"][0], results["distances"][0]):
                if isbn in isbn13s:
                    continue  # exclude input books
                b = self.catalog.get(isbn)
                if not b:
                    continue
                score = max(0.0, 1.0 - float(dist))
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
                    search_score=round(score, 4),
                    dense_score=round(score, 4),
                    matched_snippet=b["description"][:160] + "...",
                )
                recommended_books.append(book_item)
                if len(recommended_books) >= limit:
                    break

        return recommended_books, attributed_titles

    def recommend_with_contrast(
        self,
        base_isbn13: str,
        modifier: str,
        limit: int = 12,
    ) -> Tuple[List[BookItem], str]:
        """
        Contrast Mode: 'Like this book, but [modifier]'
        V_contrast = normalize(V_book + alpha * V_modifier)
        """
        base_emb = self.get_book_embedding(base_isbn13)
        base_book = self.catalog.get(base_isbn13)
        if base_emb is None or not base_book:
            return [], ""

        mod_emb = self.embed_model.encode(modifier, normalize_embeddings=True)
        # Vector addition: combine base representation with modifier direction
        alpha = 0.70
        contrast_vector = base_emb + (alpha * mod_emb)
        contrast_vector = contrast_vector / (np.linalg.norm(contrast_vector) or 1.0)

        # Query ChromaDB
        results = self.collection.query(
            query_embeddings=[contrast_vector.tolist()],
            n_results=min(limit + 10, self.collection.count()),
            include=["metadatas", "distances"],
        )

        recommended_books: List[BookItem] = []
        if results and results["ids"] and len(results["ids"][0]) > 0:
            for isbn, dist in zip(results["ids"][0], results["distances"][0]):
                if isbn == base_isbn13:
                    continue  # exclude the base book itself
                b = self.catalog.get(isbn)
                if not b:
                    continue
                score = max(0.0, 1.0 - float(dist))
                # Find matching snippet against modifier
                snippet = self.retrieval.find_best_matching_snippet(b["description"], mod_emb)

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
                    search_score=round(score, 4),
                    dense_score=round(score, 4),
                    matched_snippet=snippet,
                )
                recommended_books.append(book_item)
                if len(recommended_books) >= limit:
                    break

        return recommended_books, base_book["title"]
