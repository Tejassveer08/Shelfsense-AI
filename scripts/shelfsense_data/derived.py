"""
Collections derived from `books` with MongoDB aggregations (run after a load):

- authors: one document per author name with book count, total ratings and top books
- series:  one document per series with its books in reading order
"""

from __future__ import annotations

import time

from .common import BOOKS_COLLECTION


def rebuild_authors(db) -> int:
    start = time.time()
    db[BOOKS_COLLECTION].aggregate(
        [
            {"$project": {"authors": 1, "ratings": 1, "rating": 1, "title": 1, "cover": 1, "category": 1, "quality": 1}},
            {"$unwind": "$authors"},
            {"$match": {"authors": {"$nin": ["Unknown", ""]}}},
            {"$sort": {"ratings": -1}},
            {
                "$group": {
                    "_id": "$authors",
                    "books": {"$sum": 1},
                    "total_ratings": {"$sum": "$ratings"},
                    "avg_rating": {"$avg": "$rating"},
                    "categories": {"$addToSet": "$category"},
                    "top": {"$push": {"id": "$_id", "title": "$title", "cover": "$cover", "ratings": "$ratings"}},
                }
            },
            {
                "$project": {
                    "name": "$_id",
                    "books": 1,
                    "total_ratings": 1,
                    "avg_rating": {"$round": ["$avg_rating", 2]},
                    "categories": {"$slice": ["$categories", 4]},
                    "top": {"$slice": ["$top", 6]},
                }
            },
            {"$out": "authors"},
        ],
        allowDiskUse=True,
    )
    db["authors"].create_index([("total_ratings", -1)], name="total_ratings_desc")
    # case- and accent-insensitive lookups ("brandon sanderson" -> "Brandon Sanderson")
    db["authors"].create_index("name", name="name_ci", collation={"locale": "en", "strength": 1})
    n = db["authors"].estimated_document_count()
    print(f"[derived] authors: {n:,} in {time.time() - start:.0f}s")
    return n


def rebuild_series(db) -> int:
    start = time.time()
    db[BOOKS_COLLECTION].aggregate(
        [
            {"$match": {"series.0": {"$exists": True}}},
            {"$project": {"series": {"$first": "$series"}, "title": 1, "cover": 1, "ratings": 1, "rating": 1, "year": 1}},
            {"$sort": {"series.position": 1, "year": 1}},
            {
                "$group": {
                    "_id": "$series.name",
                    "books": {
                        "$push": {"id": "$_id", "title": "$title", "cover": "$cover", "position": "$series.position", "rating": "$rating"}
                    },
                    "total_ratings": {"$sum": "$ratings"},
                }
            },
            {"$match": {"_id": {"$nin": [None, ""]}}},
            {"$project": {"name": "$_id", "books": 1, "total_ratings": 1, "count": {"$size": "$books"}}},
            {"$out": "series"},
        ],
        allowDiskUse=True,
    )
    db["series"].create_index([("total_ratings", -1)], name="total_ratings_desc")
    n = db["series"].estimated_document_count()
    print(f"[derived] series: {n:,} in {time.time() - start:.0f}s")
    return n


def rebuild_stats(db) -> None:
    """A tiny summary document the app shows on the home page and /api/health."""
    books = db[BOOKS_COLLECTION]
    cats = list(books.aggregate([{"$group": {"_id": "$category", "n": {"$sum": 1}}}, {"$sort": {"n": -1}}]))
    db["meta"].replace_one(
        {"_id": "stats"},
        {
            "_id": "stats",
            "books": books.estimated_document_count(),
            "authors": db["authors"].estimated_document_count(),
            "series": db["series"].estimated_document_count(),
            "categories": [{"name": c["_id"], "count": c["n"]} for c in cats],
            "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        },
        upsert=True,
    )
    print("[derived] stats updated")


def rebuild_all(db) -> None:
    rebuild_authors(db)
    rebuild_series(db)
    rebuild_stats(db)
