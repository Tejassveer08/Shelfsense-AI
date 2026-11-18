"""
Create (or update) every MongoDB index ShelfSense needs, and rebuild the derived collections.

    py -3.11 scripts/setup_indexes.py            # indexes only
    py -3.11 scripts/setup_indexes.py --derived  # also rebuild authors / series / stats
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from shelfsense_data.common import get_db  # noqa: E402
from shelfsense_data.derived import rebuild_all  # noqa: E402
from shelfsense_data.indexes import setup_all  # noqa: E402


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--uri")
    p.add_argument("--db")
    p.add_argument("--derived", action="store_true", help="Rebuild authors, series and stats too")
    p.add_argument("--no-wait", action="store_true", help="Do not wait for search indexes to build")
    args = p.parse_args()
    db = get_db(args.uri, args.db)
    if args.derived:
        rebuild_all(db)
    setup_all(db, wait=not args.no_wait)


if __name__ == "__main__":
    main()
