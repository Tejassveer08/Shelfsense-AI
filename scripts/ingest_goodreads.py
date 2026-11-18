"""
Load the full UCSD Goodreads Book Graph straight into MongoDB (no local index needed).

Inputs (from https://mcauleylab.ucsd.edu/public_datasets/gdrive/goodreads/UCSD%20Book%20Graph.html):
    --books   goodreads_books.json.gz              required  2.36M editions
    --authors goodreads_book_authors.json.gz       strongly recommended (author names)
    --works   goodreads_book_works.json.gz         recommended (edition de-duplication, work-level ratings,
                                                    original publication year)
    --series  goodreads_book_series.json.gz        optional (series names + reading order)
    --genres  goodreads_book_genres_initial.json.gz optional (better categories)

How it works
    1. Scan the books file once and pick one edition per work (the most-rated one that has a
       description), so "The Hunger Games" appears once instead of 40 times.
    2. Rank the chosen works by ratings and keep --limit of them (most popular first).
    3. Scan again, embed each book with all-MiniLM-L6-v2, score its vibes and emotions, and
       bulk-upsert it into MongoDB. Interrupt any time: re-running skips books already loaded.
    4. Rebuild the authors / series collections and create the search indexes.

Examples
    py -3.11 scripts/ingest_goodreads.py --books data/goodreads_books.json.gz \
        --authors data/goodreads_book_authors.json.gz --works data/goodreads_book_works.json.gz
    ... --preset free          # 150K most popular books, sized for the free Atlas M0 tier
    ... --limit 2000           # quick smoke test

A CUDA build of PyTorch makes embedding roughly 10-20x faster (see pytorch.org).
"""

from __future__ import annotations

import argparse
import gzip
import json
import sys
import time
from pathlib import Path
from typing import Any, Dict, Iterator, List, Optional, Tuple

sys.path.insert(0, str(Path(__file__).resolve().parent))

from pymongo import ReplaceOne  # noqa: E402

from shelfsense_data.common import (  # noqa: E402
    BOOKS_COLLECTION, VibeScorer, build_book_doc, clean_shelves, dedupe_key, embed_text,
    encode_vector, get_db, load_model, split_series, to_float, to_int,
)
from shelfsense_data.derived import rebuild_all  # noqa: E402
from shelfsense_data.indexes import setup_all  # noqa: E402

ENGLISH = {"", "eng", "en-US", "en-GB", "en-CA", "en", "en-IN", "en-AU"}

PRESETS = {
    "free": {"limit": 150_000, "vector_format": "int8", "description_chars": 700, "min_ratings": 50},
    "full": {"limit": None, "vector_format": "float32", "description_chars": 2000, "min_ratings": 0},
}


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--books", required=True)
    p.add_argument("--authors")
    p.add_argument("--works")
    p.add_argument("--series")
    p.add_argument("--genres")
    p.add_argument("--uri")
    p.add_argument("--db")
    p.add_argument("--preset", choices=sorted(PRESETS))
    p.add_argument("--limit", type=int)
    p.add_argument("--min-ratings", type=int)
    p.add_argument("--min-words", type=int, default=20, help="Skip books with shorter descriptions")
    p.add_argument("--vector-format", choices=["float32", "int8"])
    p.add_argument("--description-chars", type=int)
    p.add_argument("--all-languages", action="store_true",
                   help="Keep non-English editions (the embedding model is English-only)")
    p.add_argument("--batch-size", type=int, default=256)
    p.add_argument("--device", help="cpu / cuda / mps (default: auto)")
    p.add_argument("--overwrite", action="store_true")
    p.add_argument("--skip-indexes", action="store_true")
    p.add_argument("--no-wait", action="store_true")
    args = p.parse_args()
    for key, value in PRESETS[args.preset or "full"].items():
        if getattr(args, key) is None:
            setattr(args, key, value)
    return args


def stream(path: str) -> Iterator[Dict[str, Any]]:
    with gzip.open(path, "rt", encoding="utf-8") as f:
        for line in f:
            try:
                yield json.loads(line)
            except ValueError:
                continue


def load_authors(path: Optional[str]) -> Dict[str, str]:
    if not path:
        print("[ingest] no --authors file: authors will show as 'Author <id>'")
        return {}
    out = {str(a["author_id"]): a.get("name", "").strip() for a in stream(path)}
    print(f"[ingest] {len(out):,} authors")
    return out


def load_works(path: Optional[str]) -> Dict[str, Tuple[int, float, int]]:
    """work_id -> (total ratings, average rating, original publication year)."""
    if not path:
        return {}
    out: Dict[str, Tuple[int, float, int]] = {}
    for w in stream(path):
        count = to_int(w.get("ratings_count"))
        total = to_float(w.get("ratings_sum"))
        avg = round(total / count, 3) if count else 0.0
        out[str(w.get("work_id"))] = (count, avg, to_int(w.get("original_publication_year")))
    print(f"[ingest] {len(out):,} works")
    return out


def load_series(path: Optional[str]) -> Dict[str, str]:
    if not path:
        return {}
    out = {str(s["series_id"]): s.get("title", "").strip() for s in stream(path)}
    print(f"[ingest] {len(out):,} series")
    return out


def keep(item: Dict[str, Any], args) -> bool:
    if not (item.get("title") or "").strip():
        return False
    if len((item.get("description") or "").split()) < args.min_words:
        return False
    if not args.all_languages and (item.get("language_code") or "") not in ENGLISH:
        return False
    return True


def select_books(args, works) -> Dict[str, int]:
    """Pass 1: best edition per work -> {book_id: ratings used for ranking}."""
    print("[ingest] pass 1/2: choosing one edition per work…")
    best: Dict[str, Tuple[str, int]] = {}
    scanned = 0
    start = time.time()
    for item in stream(args.books):
        scanned += 1
        if scanned % 250_000 == 0:
            print(f"[ingest]   scanned {scanned:,} editions, {len(best):,} works ({time.time() - start:.0f}s)")
        if not keep(item, args):
            continue
        edition_ratings = to_int(item.get("ratings_count"))
        work_id = str(item.get("work_id") or "")
        key = work_id or dedupe_key(item["title"], [str(a.get("author_id")) for a in item.get("authors", [])])
        current = best.get(key)
        if current is None or edition_ratings > current[1]:
            best[key] = (str(item["book_id"]), edition_ratings)

    ranked: List[Tuple[str, int]] = []
    for key, (book_id, edition_ratings) in best.items():
        ratings = works.get(key, (edition_ratings,))[0] if works else edition_ratings
        if ratings >= args.min_ratings:
            ranked.append((book_id, max(ratings, edition_ratings)))
    ranked.sort(key=lambda t: t[1], reverse=True)
    if args.limit:
        ranked = ranked[: args.limit]
    print(f"[ingest] scanned {scanned:,} editions -> {len(best):,} works -> {len(ranked):,} selected")
    return dict(ranked)


def load_genres(path: Optional[str], wanted: Dict[str, int]) -> Dict[str, Dict[str, Any]]:
    if not path:
        return {}
    out = {str(g["book_id"]): g.get("genres") or {} for g in stream(path) if str(g.get("book_id")) in wanted}
    print(f"[ingest] fuzzy genres for {len(out):,} books")
    return out


def main() -> None:
    args = parse_args()
    db = get_db(args.uri, args.db)
    books = db[BOOKS_COLLECTION]
    print(f"[ingest] target: database '{db.name}' ({books.estimated_document_count():,} books already)")

    authors = load_authors(args.authors)
    works = load_works(args.works)
    series_names = load_series(args.series)
    selected = select_books(args, works)
    fuzzy = load_genres(args.genres, selected)

    if not args.overwrite:
        existing = {d["_id"] for d in books.find({}, {"_id": 1})}
        for bid in list(selected):
            if bid in existing:
                del selected[bid]
        print(f"[ingest] {len(existing):,} already loaded, {len(selected):,} to go")
    if not selected:
        print("[ingest] nothing to load")
    else:
        print("[ingest] loading embedding model…")
        model = load_model(args.device)
        scorer = VibeScorer(model)
        print("[ingest] pass 2/2: embedding and loading…")
        total = len(selected)
        done = 0
        start = time.time()
        batch: List[Dict[str, Any]] = []

        def flush() -> None:
            nonlocal done
            texts = [b["_text"] for b in batch]
            embs = model.encode(texts, batch_size=args.batch_size, normalize_embeddings=True, show_progress_bar=False)
            ops = []
            for b, emb in zip(batch, embs):
                b.pop("_text")
                b["vibe"] = scorer.score(emb, b["num_pages"])
                b["vector"] = encode_vector(emb, args.vector_format)
                doc = build_book_doc(description_chars=args.description_chars, **b)
                ops.append(ReplaceOne({"_id": doc["_id"]}, doc, upsert=True))
            books.bulk_write(ops, ordered=False)
            done += len(ops)
            rate = done / max(time.time() - start, 0.01)
            print(f"[ingest] {done:,}/{total:,}  {rate:,.0f} books/s  eta {(total - done) / max(rate, 0.01) / 60:.1f} min",
                  flush=True)
            batch.clear()

        for item in stream(args.books):
            bid = str(item.get("book_id"))
            if bid not in selected:
                continue
            work_id = str(item.get("work_id") or "")
            w_ratings, w_avg, w_year = works.get(work_id, (0, 0.0, 0))
            author_ids = [str(a.get("author_id")) for a in item.get("authors", []) if a.get("author_id")]
            names = [authors.get(a) or f"Author {a}" for a in author_ids][:3] or ["Unknown"]
            genres = clean_shelves(item.get("popular_shelves", []))
            pages = to_int(item.get("num_pages"))
            series = []
            for sid in item.get("series") or []:
                if str(sid) in series_names:
                    series.append({"id": str(sid), "name": series_names[str(sid)]})
            title = item["title"].strip()
            desc = item.get("description", "")
            if series:
                # the "(Series, #n)" suffix in the title carries the reading position
                _, _, pos = split_series(title)
                series[0]["position"] = pos
            batch.append({
                "_text": embed_text(title, ", ".join(names), genres, desc),
                "book_id": bid,
                "title": title,
                "authors": names,
                "author_ids": author_ids,
                "description": desc,
                "avg_rating": w_avg or to_float(item.get("average_rating")),
                "ratings_count": max(w_ratings, to_int(item.get("ratings_count"))),
                "num_pages": pages,
                "year": w_year or to_int(item.get("publication_year")),
                "cover": item.get("image_url", ""),
                "genres": genres,
                "isbn13": (item.get("isbn13") or "").strip(),
                "isbn": (item.get("isbn") or "").strip(),
                "work_id": work_id,
                "series": series or None,
                "language": item.get("language_code") or "",
                "publisher": (item.get("publisher") or "").strip(),
                "fuzzy_genres": fuzzy.get(bid),
                "reviews_count": to_int(item.get("text_reviews_count")),
            })
            if len(batch) >= args.batch_size * 4:
                flush()
        if batch:
            flush()
        print(f"[ingest] loaded {done:,} books in {(time.time() - start) / 60:.1f} min")

    rebuild_all(db)
    if not args.skip_indexes:
        setup_all(db, wait=not args.no_wait)
    print("[ingest] done")


if __name__ == "__main__":
    main()
