"""
Index definitions for the ShelfSense MongoDB database.

Two kinds of index are needed:
- ordinary B-tree indexes for browsing (popular, top rated, by author, by series)
- two Atlas Search indexes: full-text + autocomplete ("books_text") and vectors ("books_vector")

Atlas Search indexes need MongoDB Atlas (any tier, including the free M0) or the
`mongodb/mongodb-atlas-local` Docker image for local development.
"""

from __future__ import annotations

import time
from typing import Any, Dict

from pymongo import ASCENDING, DESCENDING
from pymongo.errors import OperationFailure
from pymongo.operations import SearchIndexModel

from .common import BOOKS_COLLECTION, EMBEDDING_DIM

TEXT_INDEX = "books_text"
VECTOR_INDEX = "books_vector"

_AUTOCOMPLETE = {
    "type": "autocomplete",
    "tokenization": "edgeGram",
    "minGrams": 2,
    "maxGrams": 15,
    "foldDiacritics": True,
}

TEXT_INDEX_DEFINITION: Dict[str, Any] = {
    "mappings": {
        "dynamic": False,
        "fields": {
            "title": [{"type": "string", "analyzer": "lucene.english"}, _AUTOCOMPLETE],
            "authors": [{"type": "string", "analyzer": "lucene.standard"}, _AUTOCOMPLETE],
            "description": {"type": "string", "analyzer": "lucene.english"},
            "genres": {"type": "string", "analyzer": "lucene.english"},
            "category": {"type": "token"},
            "year": {"type": "number"},
            "pages": {"type": "number"},
            "rating": {"type": "number"},
            "ratings": {"type": "number"},
            "popularity": {"type": "number"},
        },
    }
}

VECTOR_INDEX_DEFINITION: Dict[str, Any] = {
    "fields": [
        {"type": "vector", "path": "embedding", "numDimensions": EMBEDDING_DIM, "similarity": "cosine"},
        {"type": "filter", "path": "category"},
        {"type": "filter", "path": "year"},
        {"type": "filter", "path": "pages"},
        {"type": "filter", "path": "rating"},
        {"type": "filter", "path": "ratings"},
    ]
}


def ensure_collections(db) -> None:
    existing = set(db.list_collection_names())
    for name in (BOOKS_COLLECTION, "authors", "series", "shelves", "embedding_cache"):
        if name not in existing:
            db.create_collection(name)


def ensure_regular_indexes(db) -> None:
    books = db[BOOKS_COLLECTION]
    books.create_index([("ratings", DESCENDING)], name="ratings_desc")
    books.create_index([("quality", DESCENDING)], name="quality_desc")
    books.create_index([("category", ASCENDING), ("ratings", DESCENDING)], name="category_ratings")
    books.create_index([("category", ASCENDING), ("quality", DESCENDING)], name="category_quality")
    books.create_index([("authors", ASCENDING), ("ratings", DESCENDING)], name="authors_ratings")
    books.create_index([("isbn13", ASCENDING)], name="isbn13", sparse=True)
    books.create_index([("work_id", ASCENDING)], name="work_id", sparse=True)
    books.create_index([("series.name", ASCENDING), ("series.position", ASCENDING)], name="series", sparse=True)
    db["shelves"].create_index([("created_at", DESCENDING)], name="created_at")
    # Cached query embeddings expire after 30 days.
    db["embedding_cache"].create_index("created_at", expireAfterSeconds=30 * 24 * 3600, name="ttl")


def _existing_search_indexes(coll) -> Dict[str, Dict[str, Any]]:
    try:
        return {ix["name"]: ix for ix in coll.list_search_indexes()}
    except OperationFailure as exc:
        raise SystemExit(
            "This MongoDB server does not support Atlas Search indexes.\n"
            "Use MongoDB Atlas (the free M0 tier works) or run the local Atlas image:\n"
            "  docker compose up -d mongo\n"
            f"Server said: {exc}"
        )


def ensure_search_indexes(db, wait: bool = True, timeout_s: int = 1800) -> None:
    coll = db[BOOKS_COLLECTION]
    existing = _existing_search_indexes(coll)
    wanted = [
        (TEXT_INDEX, "search", TEXT_INDEX_DEFINITION),
        (VECTOR_INDEX, "vectorSearch", VECTOR_INDEX_DEFINITION),
    ]
    for name, kind, definition in wanted:
        if name in existing:
            current = existing[name].get("latestDefinition") or {}
            if current != definition:
                print(f"[indexes] updating search index {name}")
                coll.update_search_index(name, definition)
            else:
                print(f"[indexes] search index {name} already up to date")
        else:
            print(f"[indexes] creating search index {name} ({kind})")
            coll.create_search_index(SearchIndexModel(definition=definition, name=name, type=kind))

    if not wait:
        return
    start = time.time()
    while time.time() - start < timeout_s:
        states = {ix["name"]: (ix.get("status"), ix.get("queryable")) for ix in coll.list_search_indexes()}
        pending = [n for n, _, _ in wanted if not (states.get(n) or (None, False))[1]]
        if not pending:
            print("[indexes] search indexes are queryable")
            return
        print(f"[indexes] waiting for {', '.join(pending)} to build… {states}")
        time.sleep(10)
    print("[indexes] still building; searches will work once Atlas finishes (check the Atlas UI).")


def setup_all(db, wait: bool = True) -> None:
    ensure_collections(db)
    ensure_regular_indexes(db)
    ensure_search_indexes(db, wait=wait)
