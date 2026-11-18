"""
Copy an existing local ShelfSense index (data/goodreads.db + data/chroma_db) into MongoDB.

This is the fast path: the embeddings, vibe axes and emotion scores were already computed
by the old indexer, so nothing is re-embedded (books missing from Chroma are embedded on
the fly). Books are loaded most-popular first, so --limit always keeps the best-known titles.

Examples
    py -3.11 scripts/migrate_local_index.py                      # everything (≈580K books)
    py -3.11 scripts/migrate_local_index.py --preset free        # fits the free Atlas M0 tier
    py -3.11 scripts/migrate_local_index.py --limit 5000 --skip-indexes   # quick test

Re-running is safe: books already in MongoDB are skipped unless --overwrite is given.
"""

from __future__ import annotations

import argparse
import json
import sqlite3
import sys
import time
from pathlib import Path
from typing import Dict, List

sys.path.insert(0, str(Path(__file__).resolve().parent))

from pymongo import ReplaceOne  # noqa: E402

from shelfsense_data.common import (  # noqa: E402
    BOOKS_COLLECTION, EMOTION_NAMES, build_book_doc, dedupe_key, embed_text, encode_vector, get_db,
    length_axis,
)
from shelfsense_data.derived import rebuild_all  # noqa: E402
from shelfsense_data.indexes import setup_all  # noqa: E402

PRESETS = {
    # Atlas M0 has 512 MB of storage: int8 vectors + shorter descriptions + the 150K most-rated books.
    "free": {"limit": 150_000, "vector_format": "int8", "description_chars": 700},
    # Atlas Flex (5 GB) or bigger: everything at full precision.
    "full": {"limit": None, "vector_format": "float32", "description_chars": 2000},
}

COLUMNS = (
    "book_id, isbn13, isbn, title, authors, description, average_rating, ratings_count, num_pages, "
    "publication_year, image_url, genres, joy, sadness, fear, anger, surprise, disgust, neutral, "
    "vibe_tone, vibe_pacing, vibe_depth, vibe_length"
)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--sqlite", default="data/goodreads.db")
    p.add_argument("--chroma-dir", default="data/chroma_db")
    p.add_argument("--collection", default="goodreads_books", help="Chroma collection name")
    p.add_argument("--uri", help="MongoDB connection string (default: $MONGODB_URI)")
    p.add_argument("--db", help="Database name (default: $MONGODB_DB or 'shelfsense')")
    p.add_argument("--preset", choices=sorted(PRESETS), help="Sizing preset (flags below override it)")
    p.add_argument("--limit", type=int, help="Max books to load (most-rated first)")
    p.add_argument("--min-ratings", type=int, default=0)
    p.add_argument("--vector-format", choices=["float32", "int8"])
    p.add_argument("--description-chars", type=int)
    p.add_argument("--no-dedupe", action="store_true", help="Keep every edition of the same book")
    p.add_argument("--batch-size", type=int, default=500)
    p.add_argument("--overwrite", action="store_true", help="Replace books that are already loaded")
    p.add_argument("--skip-indexes", action="store_true", help="Do not create/wait for indexes")
    p.add_argument("--no-wait", action="store_true", help="Create search indexes without waiting")
    args = p.parse_args()
    preset = PRESETS.get(args.preset or "full")
    for key, value in preset.items():
        if getattr(args, key) is None:
            setattr(args, key, value)
    return args


def select_ids(conn: sqlite3.Connection, args) -> List[str]:
    print("[migrate] ranking books by popularity…")
    rows = conn.execute(
        "SELECT book_id, title, authors, ratings_count FROM books WHERE ratings_count >= ? "
        "ORDER BY ratings_count DESC",
        (args.min_ratings,),
    ).fetchall()
    ids: List[str] = []
    seen = set()
    dupes = 0
    for book_id, title, authors, _ in rows:
        if not args.no_dedupe:
            key = dedupe_key(title or "", [a.strip() for a in (authors or "").split(",")])
            if key in seen:
                dupes += 1
                continue
            seen.add(key)
        ids.append(str(book_id))
        if args.limit and len(ids) >= args.limit:
            break
    print(f"[migrate] {len(ids):,} books selected ({dupes:,} duplicate editions skipped)")
    return ids


def main() -> None:
    args = parse_args()
    sqlite_path = Path(args.sqlite)
    if not sqlite_path.exists():
        raise SystemExit(f"{sqlite_path} not found. Use scripts/ingest_goodreads.py to load from the raw dumps.")

    db = get_db(args.uri, args.db)
    books = db[BOOKS_COLLECTION]
    print(f"[migrate] target: database '{db.name}' ({books.estimated_document_count():,} books already)")

    conn = sqlite3.connect(f"file:{sqlite_path.as_posix()}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row

    import chromadb

    chroma = chromadb.PersistentClient(path=args.chroma_dir).get_collection(args.collection)

    ids = select_ids(conn, args)
    if not args.overwrite:
        existing = {d["_id"] for d in books.find({}, {"_id": 1})}
        before = len(ids)
        ids = [i for i in ids if i not in existing]
        print(f"[migrate] {before - len(ids):,} already in MongoDB, {len(ids):,} to load")

    model = None
    start = time.time()
    done = 0
    for i in range(0, len(ids), args.batch_size):
        chunk = ids[i : i + args.batch_size]
        rows = conn.execute(
            f"SELECT {COLUMNS} FROM books WHERE book_id IN ({','.join('?' * len(chunk))})", chunk
        ).fetchall()
        got = chroma.get(ids=chunk, include=["embeddings"])
        vectors: Dict[str, List[float]] = {
            str(bid): emb for bid, emb in zip(got["ids"], got["embeddings"]) if emb is not None
        }

        missing = [r for r in rows if str(r["book_id"]) not in vectors]
        if missing:
            if model is None:
                from shelfsense_data.common import load_model

                print("[migrate] some books have no stored vector; loading the embedding model…")
                model = load_model()
            texts = [
                embed_text(r["title"], r["authors"] or "", json.loads(r["genres"] or "[]"), r["description"] or "")
                for r in missing
            ]
            for r, emb in zip(missing, model.encode(texts, normalize_embeddings=True)):
                vectors[str(r["book_id"])] = emb

        ops = []
        for r in rows:
            bid = str(r["book_id"])
            try:
                genres = json.loads(r["genres"] or "[]")
            except ValueError:
                genres = []
            pages = int(r["num_pages"] or 0)
            vibe = {
                "vibes": {
                    "dark_light": round(float(r["vibe_tone"] or 0), 3),
                    "pacing": round(-float(r["vibe_pacing"] or 0), 3),
                    "cerebral_escapist": round(-float(r["vibe_depth"] or 0), 3),
                    "length_scale": round(float(r["vibe_length"] or length_axis(pages)), 3),
                },
                "emotions": {n: round(float(r[n] or 0), 4) for n in EMOTION_NAMES},
            }
            doc = build_book_doc(
                book_id=bid,
                title=r["title"] or "",
                authors=[a.strip() for a in (r["authors"] or "Unknown").split(",") if a.strip()],
                description=r["description"] or "",
                avg_rating=float(r["average_rating"] or 0),
                ratings_count=int(r["ratings_count"] or 0),
                num_pages=pages,
                year=int(r["publication_year"] or 0),
                cover=r["image_url"] or "",
                genres=[g for g in genres if g != "General Fiction"],
                vibe=vibe,
                vector=encode_vector(vectors[bid], args.vector_format),
                isbn13=(r["isbn13"] or "").strip(),
                isbn=(r["isbn"] or "").strip(),
                description_chars=args.description_chars,
            )
            ops.append(ReplaceOne({"_id": bid}, doc, upsert=True))
        if ops:
            books.bulk_write(ops, ordered=False)
        done += len(ops)
        elapsed = time.time() - start
        rate = done / max(elapsed, 0.01)
        eta = (len(ids) - done) / max(rate, 0.01)
        print(f"[migrate] {done:,}/{len(ids):,}  {rate:,.0f} books/s  eta {eta / 60:.1f} min", flush=True)

    print(f"[migrate] loaded {done:,} books in {(time.time() - start) / 60:.1f} min")
    rebuild_all(db)
    if not args.skip_indexes:
        setup_all(db, wait=not args.no_wait)
    print("[migrate] done")


if __name__ == "__main__":
    main()
