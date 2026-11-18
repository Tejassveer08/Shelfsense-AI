"""
Collections derived from `books` with MongoDB aggregations (run after a load):

- authors: one document per author name with book count, total ratings and top books
- series:  one document per series with its books in reading order
"""

from __future__ import annotations

import heapq
import time
from collections import defaultdict

from pymongo.errors import OperationFailure

from .common import BOOKS_COLLECTION

# Atlas free/Flex tiers cap $group memory (100 MB) and ignore allowDiskUse. When the server refuses with
# this code, the same documents are built on this machine from one streamed pass over `books`.
MEMORY_LIMIT_CODE = 292


def _replace_collection(db, name: str, docs: list[dict]) -> None:
    db[name].drop()
    for i in range(0, len(docs), 5000):
        db[name].insert_many(docs[i : i + 5000], ordered=False)


def _authors_client_side(db) -> None:
    acc: dict[str, dict] = defaultdict(lambda: {"books": 0, "total": 0, "rsum": 0.0, "rn": 0, "cats": [], "top": []})
    fields = {"authors": 1, "ratings": 1, "rating": 1, "title": 1, "cover": 1, "category": 1}
    for b in db[BOOKS_COLLECTION].find({}, fields, batch_size=5000):
        ratings = b.get("ratings") or 0
        for name in b.get("authors") or []:
            if name in ("Unknown", ""):
                continue
            a = acc[name]
            a["books"] += 1
            a["total"] += ratings
            if b.get("rating") is not None:
                a["rsum"] += b["rating"]
                a["rn"] += 1
            if b.get("category") not in a["cats"]:
                a["cats"].append(b.get("category"))
            item = (ratings, b["_id"], {"id": b["_id"], "title": b.get("title"), "cover": b.get("cover"), "ratings": ratings})
            (heapq.heappush if len(a["top"]) < 6 else heapq.heappushpop)(a["top"], item)
    docs = [
        {
            "_id": name,
            "name": name,
            "books": a["books"],
            "total_ratings": a["total"],
            "avg_rating": round(a["rsum"] / a["rn"], 2) if a["rn"] else None,
            "categories": a["cats"][:4],
            "top": [t[2] for t in sorted(a["top"], key=lambda t: (-t[0], t[1]))],
        }
        for name, a in acc.items()
    ]
    _replace_collection(db, "authors", docs)


def _series_client_side(db) -> None:
    acc: dict[str, dict] = defaultdict(lambda: {"books": [], "total": 0})
    fields = {"series": {"$slice": 1}, "title": 1, "cover": 1, "ratings": 1, "rating": 1, "year": 1}
    for b in db[BOOKS_COLLECTION].find({"series.0": {"$exists": True}}, fields, batch_size=5000):
        s = b["series"][0]
        if not s.get("name"):
            continue
        a = acc[s["name"]]
        a["total"] += b.get("ratings") or 0
        a["books"].append((s.get("position"), b.get("year"), {
            "id": b["_id"], "title": b.get("title"), "cover": b.get("cover"),
            "position": s.get("position"), "rating": b.get("rating"),
        }))

    def order(t):  # MongoDB order: null before numbers
        pos, year, _ = t
        return (pos is not None, pos or 0, year is not None, year or 0)

    docs = [
        {"_id": name, "name": name, "books": [t[2] for t in sorted(a["books"], key=order)],
         "total_ratings": a["total"], "count": len(a["books"])}
        for name, a in acc.items()
    ]
    _replace_collection(db, "series", docs)


def _run_or_fallback(db, pipeline: list[dict], fallback, label: str) -> None:
    try:
        db[BOOKS_COLLECTION].aggregate(pipeline, allowDiskUse=True)
    except OperationFailure as e:
        if e.code != MEMORY_LIMIT_CODE:
            raise
        print(f"[derived] {label}: server memory limit hit (Atlas free/Flex tier); building on this machine")
        fallback(db)


def rebuild_authors(db) -> int:
    start = time.time()
    _run_or_fallback(db,
        [
            {"$project": {"authors": 1, "ratings": 1, "rating": 1, "title": 1, "cover": 1, "category": 1, "quality": 1}},
            {"$unwind": "$authors"},
            {"$match": {"authors": {"$nin": ["Unknown", ""]}}},
            # No global $sort (capped at 32 MB on free/Flex tiers): $topN keeps each author's 6 most-rated books.
            {
                "$group": {
                    "_id": "$authors",
                    "books": {"$sum": 1},
                    "total_ratings": {"$sum": "$ratings"},
                    "avg_rating": {"$avg": "$rating"},
                    "categories": {"$addToSet": "$category"},
                    "top": {
                        "$topN": {
                            "n": 6,
                            "sortBy": {"ratings": -1},
                            "output": {"id": "$_id", "title": "$title", "cover": "$cover", "ratings": "$ratings"},
                        }
                    },
                }
            },
            {
                "$project": {
                    "name": "$_id",
                    "books": 1,
                    "total_ratings": 1,
                    "avg_rating": {"$round": ["$avg_rating", 2]},
                    "categories": {"$slice": ["$categories", 4]},
                    "top": 1,
                }
            },
            {"$out": "authors"},
        ],
        _authors_client_side,
        "authors",
    )
    db["authors"].create_index([("total_ratings", -1)], name="total_ratings_desc")
    # case- and accent-insensitive lookups ("brandon sanderson" -> "Brandon Sanderson")
    db["authors"].create_index("name", name="name_ci", collation={"locale": "en", "strength": 1})
    n = db["authors"].estimated_document_count()
    print(f"[derived] authors: {n:,} in {time.time() - start:.0f}s")
    return n


def rebuild_series(db) -> int:
    start = time.time()
    _run_or_fallback(db,
        [
            {"$match": {"series.0": {"$exists": True}}},
            {"$project": {"series": {"$first": "$series"}, "title": 1, "cover": 1, "ratings": 1, "rating": 1, "year": 1}},
            {
                "$group": {
                    "_id": "$series.name",
                    "books": {
                        "$push": {
                            "id": "$_id", "title": "$title", "cover": "$cover",
                            "position": "$series.position", "rating": "$rating", "year": "$year",
                        }
                    },
                    "total_ratings": {"$sum": "$ratings"},
                }
            },
            {"$match": {"_id": {"$nin": [None, ""]}}},
            # Reading order per series, sorted inside each group (no global sort; see rebuild_authors).
            {
                "$project": {
                    "name": "$_id",
                    "books": {
                        "$map": {
                            "input": {"$sortArray": {"input": "$books", "sortBy": {"position": 1, "year": 1}}},
                            "as": "b",
                            "in": {"id": "$$b.id", "title": "$$b.title", "cover": "$$b.cover", "position": "$$b.position", "rating": "$$b.rating"},
                        }
                    },
                    "total_ratings": 1,
                    "count": {"$size": "$books"},
                }
            },
            {"$out": "series"},
        ],
        _series_client_side,
        "series",
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
