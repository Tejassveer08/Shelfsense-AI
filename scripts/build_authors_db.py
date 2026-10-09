"""Build data/authors.db from the UCSD Goodreads author file.

stream_goodreads_index.py looks up author names in this database. Without it,
authors show up as "Author <id>".

Input:  goodreads_book_authors.json.gz  (one JSON object per line)
Output: data/authors.db  with table authors(author_id TEXT PRIMARY KEY, name TEXT)

Usage:
    python scripts/build_authors_db.py --gz-path data/goodreads_book_authors.json.gz
"""

import argparse
import gzip
import json
import sqlite3
import sys
from pathlib import Path

BATCH_SIZE = 10_000


def main() -> None:
    parser = argparse.ArgumentParser(description="Build data/authors.db from goodreads_book_authors.json.gz")
    parser.add_argument("--gz-path", default="data/goodreads_book_authors.json.gz", help="path to goodreads_book_authors.json.gz")
    parser.add_argument("--db-path", default="data/authors.db", help="output SQLite file")
    args = parser.parse_args()

    gz_path = Path(args.gz_path)
    db_path = Path(args.db_path)

    if not gz_path.exists():
        sys.exit(f"File not found: {gz_path}. Download goodreads_book_authors.json.gz first (see the README).")

    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    conn.execute("CREATE TABLE IF NOT EXISTS authors (author_id TEXT PRIMARY KEY, name TEXT)")

    batch, total = [], 0
    with gzip.open(str(gz_path), "rt", encoding="utf-8") as f:
        for line in f:
            try:
                item = json.loads(line)
            except json.JSONDecodeError:
                continue
            author_id = str(item.get("author_id", "")).strip()
            name = (item.get("name") or "").strip()
            if not author_id or not name:
                continue
            batch.append((author_id, name))
            if len(batch) >= BATCH_SIZE:
                conn.executemany("INSERT OR REPLACE INTO authors VALUES (?, ?)", batch)
                conn.commit()
                total += len(batch)
                batch = []
                print(f"[Authors] {total:,} authors written...", end="\r")

    if batch:
        conn.executemany("INSERT OR REPLACE INTO authors VALUES (?, ?)", batch)
        conn.commit()
        total += len(batch)
    conn.close()

    if total == 0:
        sys.exit("No authors were written. Check that the file has 'author_id' and 'name' fields.")
    print(f"[Authors] Done: {total:,} authors saved to {db_path}")


if __name__ == "__main__":
    main()
