"""
Shared helpers for the ShelfSense MongoDB data pipeline.

Everything that decides what a book document looks like lives here, so the two
loaders (migrate_local_index.py and ingest_goodreads.py) produce identical documents:

- connection settings (MONGODB_URI / MONGODB_DB from the environment or .env.local)
- Goodreads shelf cleaning and the 11 UI categories
- vibe axes + emotion scores (anchor projections on all-MiniLM-L6-v2 embeddings)
- BSON binary vector encoding (float32 or int8)
- the final document shape
"""

from __future__ import annotations

import math
import os
import re
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence

import numpy as np

EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"  # must match lib/server/embeddings.ts
EMBEDDING_DIM = 384
BOOKS_COLLECTION = "books"
AUTHORS_COLLECTION = "authors"
SERIES_COLLECTION = "series"

FALLBACK_COVER = ""  # the UI draws a generated cover when this is empty

# ----------------------------------------------------------------------------- environment


def load_env() -> None:
    """Load .env.local then .env from the repository root (existing variables win)."""
    try:
        from dotenv import load_dotenv
    except ImportError:  # python-dotenv is optional
        return
    root = Path(__file__).resolve().parents[2]
    for name in (".env.local", ".env"):
        path = root / name
        if path.exists():
            load_dotenv(path, override=False)


def get_db(uri: Optional[str] = None, db_name: Optional[str] = None):
    """Return a pymongo Database for MONGODB_URI / MONGODB_DB."""
    from pymongo import MongoClient

    load_env()
    uri = uri or os.getenv("MONGODB_URI")
    if not uri:
        raise SystemExit(
            "MONGODB_URI is not set. Put it in .env.local (see .env.example) or pass --uri."
        )
    db_name = db_name or os.getenv("MONGODB_DB", "shelfsense")
    client = MongoClient(uri, appname="shelfsense-pipeline", retryWrites=True)
    return client[db_name]


# ----------------------------------------------------------------------------- shelves & categories

IGNORED_SHELVES = {
    "to-read", "currently-reading", "favorites", "favourites", "books-i-own", "owned", "read",
    "kindle", "audiobook", "audiobooks", "audio", "default", "wishlist", "owned-books", "my-books",
    "library", "all-time-favorites", "ebook", "ebooks", "e-book", "e-books", "to-buy", "my-library",
    "book-club", "bookclub", "re-read", "dnf", "did-not-finish", "abandoned", "tbr", "i-own",
    "own-it", "books", "shelfari-favorites", "favorite", "fiction-to-read", "kindle-books",
    "to-read-fiction", "on-hold", "maybe", "unread", "read-in-2015", "read-in-2016", "physical-tbr",
}
_YEAR_SHELF = re.compile(r"(19|20)\d\d")

CATEGORY_RULES = [
    ("Comics & Graphic Novels", r"\bcomics?\b|graphic novel|\bmanga\b|\bgraphic\b"),
    ("Mystery & Thriller", r"mystery|thriller|crime|detective|suspense|\bnoir\b"),
    ("Sci-Fi & Fantasy", r"fantasy|science fiction|\bsci[- ]?fi\b|dystopi|paranormal|\bmagic\b|dragons?"),
    ("Romance", r"romance|chick lit"),
    ("Horror", r"\bhorror\b"),
    ("Biography & Memoir", r"biograph|memoir"),
    ("History & Politics", r"\bhistory\b|politic|military|world war|\btravel\b"),
    ("Philosophy & Religion", r"philosoph|religion|spiritual|christian|theology|buddhis|\bislam"),
    ("Science & Nature", r"\bscience\b|\bnature\b|psycholog|biology|physics|mathematic|technology|computer"),
    ("Young Adult & Children", r"young adult|\bya\b|children|middle grade|picture book|juvenile"),
    ("Business & Self-Help", r"business|self[- ]help|personal development|finance|leadership|productivity|management"),
    ("Arts & Literature", r"poetry|\bart\b|literature|classics?|\bplays?\b|\bdrama\b|cooking|\bmusic\b|essays?"),
]
CATEGORIES = [name for name, _ in CATEGORY_RULES] + ["Fiction", "Nonfiction"]
_CATEGORY_PATTERNS = [(name, re.compile(p)) for name, p in CATEGORY_RULES]

# UCSD "fuzzy genre" groups (goodreads_book_genres_initial.json.gz) -> UI category
FUZZY_GENRE_TO_CATEGORY = {
    "comics, graphic": "Comics & Graphic Novels",
    "mystery, thriller, crime": "Mystery & Thriller",
    "fantasy, paranormal": "Sci-Fi & Fantasy",
    "romance": "Romance",
    "history, historical fiction, biography": "History & Politics",
    "young-adult": "Young Adult & Children",
    "children": "Young Adult & Children",
    "poetry": "Arts & Literature",
    "non-fiction": "Nonfiction",
    "fiction": "Fiction",
}


def clean_shelves(popular_shelves: Iterable[Dict[str, Any]], limit: int = 8) -> List[str]:
    """Turn Goodreads popular_shelves into readable genre labels (most popular first)."""
    genres: List[str] = []
    for shelf in popular_shelves or []:
        name = str(shelf.get("name", "")).lower().strip()
        if not name or name in IGNORED_SHELVES or len(name) <= 2 or name.isdigit():
            continue
        if _YEAR_SHELF.search(name) or name.startswith(("to-read", "read-", "my-", "own")):
            continue
        label = name.replace("-", " ").replace("_", " ").title()
        if label not in genres:
            genres.append(label)
        if len(genres) >= limit:
            break
    return genres


def simplify_category(genres: Sequence[str], fuzzy_genres: Optional[Dict[str, Any]] = None) -> str:
    """Map shelves (and optional UCSD fuzzy genres) to one of the UI categories."""
    for genre in genres:
        g = genre.lower()
        for name, pattern in _CATEGORY_PATTERNS:
            if pattern.search(g):
                return name
    if fuzzy_genres:
        best = max(fuzzy_genres.items(), key=lambda kv: kv[1] or 0)[0]
        if best in FUZZY_GENRE_TO_CATEGORY:
            return FUZZY_GENRE_TO_CATEGORY[best]
    if any("nonfiction" in g.lower() or "non fiction" in g.lower() for g in genres):
        return "Nonfiction"
    return "Fiction"


# ----------------------------------------------------------------------------- vibes & emotions

VIBE_ANCHOR_PROMPTS = {
    "tone_pos": "lighthearted, wholesome, heartwarming, joyful, delightful romance comedy",
    "tone_neg": "grim, dark, bleak, disturbing, psychological horror, brutal thriller",
    "pacing_fast": "fast-paced, exhilarating, action-packed, adrenaline thrill ride",
    "pacing_slow": "slow-paced, contemplative, quiet, meditative, lyrical, atmospheric",
    "depth_cerebral": "philosophical, complex, intellectually demanding, profound classic",
    "depth_escapist": "entertaining, cozy, fun, easy beach read, guilty pleasure",
}
EMOTION_NAMES = ["joy", "sadness", "fear", "anger", "surprise", "disgust", "neutral"]
EMOTION_ANCHOR_PROMPTS = {
    "joy": "a joyful, uplifting, delightful, heartwarming celebration of happiness",
    "sadness": "a heartbreaking, melancholic, sorrowful story of grief, loss, and mourning",
    "fear": "a terrifying, chilling, dread-inducing psychological horror and suspense",
    "anger": "an infuriating story of injustice, rage, revenge, rebellion, and fury",
    "surprise": "an astonishing, shocking tale of unexpected plot twists and startling revelations",
    "disgust": "a sickening, repulsive, grotesque, sickeningly grim and filthy depiction",
    "neutral": "an objective, documentary, factual, balanced, calm and straightforward account",
}


def length_axis(num_pages: int) -> float:
    """Short (-1) <-> Epic (+1) from the page count (0 when unknown)."""
    if num_pages <= 0:
        return 0.0
    if num_pages < 200:
        return float(np.interp(num_pages, [50, 200], [-1.0, -0.2]))
    if num_pages > 450:
        return float(np.interp(num_pages, [450, 1000], [0.2, 1.0]))
    return float(np.interp(num_pages, [200, 450], [-0.2, 0.2]))


class VibeScorer:
    """Projects normalized embeddings onto the vibe axes and emotion anchors."""

    def __init__(self, model) -> None:
        texts = [VIBE_ANCHOR_PROMPTS[k] for k in (
            "tone_pos", "tone_neg", "pacing_fast", "pacing_slow", "depth_cerebral", "depth_escapist")]
        e = model.encode(texts, normalize_embeddings=True)
        self.tone = e[0] - e[1]
        self.pacing = e[2] - e[3]
        self.depth = e[4] - e[5]
        self.emotions = model.encode(
            [EMOTION_ANCHOR_PROMPTS[n] for n in EMOTION_NAMES], normalize_embeddings=True)

    def score(self, emb: np.ndarray, num_pages: int) -> Dict[str, Dict[str, float]]:
        tone = float(np.clip(np.dot(emb, self.tone) * 2.5, -1.0, 1.0))
        fast = float(np.clip(np.dot(emb, self.pacing) * 2.5, -1.0, 1.0))
        cerebral = float(np.clip(np.dot(emb, self.depth) * 2.5, -1.0, 1.0))
        raw = np.dot(self.emotions, emb) * 4.0
        probs = np.exp(raw - raw.max())
        probs = probs / probs.sum()
        return {
            # UI convention: dark(-1)/light(+1), fast(-1)/slow(+1), cerebral(-1)/escapist(+1), short(-1)/epic(+1)
            "vibes": {
                "dark_light": round(tone, 3),
                "pacing": round(-fast, 3),
                "cerebral_escapist": round(-cerebral, 3),
                "length_scale": round(length_axis(num_pages), 3),
            },
            "emotions": {n: round(float(p), 4) for n, p in zip(EMOTION_NAMES, probs)},
        }


def load_model(device: Optional[str] = None):
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(EMBEDDING_MODEL, device=device)


# ----------------------------------------------------------------------------- vectors


def encode_vector(emb: Sequence[float], fmt: str = "float32"):
    """Encode a normalized embedding as a BSON binary vector (what Atlas Vector Search indexes)."""
    from bson.binary import Binary, BinaryVectorDtype

    arr = np.asarray(emb, dtype=np.float32)
    if fmt == "int8":
        # Per-vector scaling keeps cosine similarity intact (cosine ignores vector length).
        scale = 127.0 / (float(np.max(np.abs(arr))) or 1.0)
        q = np.clip(np.round(arr * scale), -127, 127).astype(np.int8)
        return Binary.from_vector(q.tolist(), BinaryVectorDtype.INT8)
    return Binary.from_vector(arr.tolist(), BinaryVectorDtype.FLOAT32)


def embed_text(title: str, authors: str, genres: Sequence[str], description: str) -> str:
    """The text that represents a book in vector space (same recipe the original index used)."""
    return f"{title} by {authors}. Genres: {', '.join(list(genres)[:3])}. {description[:350]}"


# ----------------------------------------------------------------------------- documents

BAYES_M = 500  # ratings needed before a book's own average dominates its quality score
BAYES_C = 3.9  # catalogue-wide prior average


def quality_score(avg: float, count: int) -> float:
    """Bayesian weighted rating: stops 5.0-star books with 3 ratings from topping the charts."""
    if count <= 0 or avg <= 0:
        return round(BAYES_C * 0.9, 4)
    return round((count / (count + BAYES_M)) * avg + (BAYES_M / (count + BAYES_M)) * BAYES_C, 4)


def clean_cover(url: str) -> str:
    url = (url or "").strip()
    if not url.startswith("http") or "nophoto" in url or "no_photo" in url:
        return FALLBACK_COVER
    # Goodreads serves larger covers when the size suffix (e.g. "._SX98_" or "m/") is removed.
    url = re.sub(r"\._S[XY]\d+_(?=\.)", "", url)
    url = url.replace("http://", "https://")
    return url


_SERIES_SUFFIX = re.compile(r"\s*\(([^()]*?),?\s*#\s*([\d.]+)\)\s*$")


def split_series(title: str):
    """'The Hunger Games (The Hunger Games, #1)' -> ('The Hunger Games', 'The Hunger Games', 1.0)."""
    m = _SERIES_SUFFIX.search(title or "")
    if not m:
        return (title or "").strip(), None, None
    try:
        pos = float(m.group(2))
    except ValueError:
        pos = None
    return title[: m.start()].strip(), m.group(1).strip(), pos


def to_int(v: Any, default: int = 0) -> int:
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return default


def to_float(v: Any, default: float = 0.0) -> float:
    try:
        f = float(v)
        return f if math.isfinite(f) else default
    except (TypeError, ValueError):
        return default


_CONTROL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_ALT_COVER = re.compile(r"^\s*(?:note:)?[^\n]{0,160}\b(?:alternate|alternative)[- ]cover edition[^\n]*\n+", re.I)


def clean_description(text: str) -> str:
    return _ALT_COVER.sub("", _CONTROL.sub("", text or "")).strip()


def build_book_doc(
    *,
    book_id: str,
    title: str,
    authors: List[str],
    description: str,
    avg_rating: float,
    ratings_count: int,
    num_pages: int,
    year: int,
    cover: str,
    genres: List[str],
    vibe: Dict[str, Dict[str, float]],
    vector,
    isbn13: str = "",
    isbn: str = "",
    work_id: str = "",
    author_ids: Optional[List[str]] = None,
    series: Optional[List[Dict[str, Any]]] = None,
    language: str = "",
    publisher: str = "",
    fuzzy_genres: Optional[Dict[str, Any]] = None,
    description_chars: int = 2000,
    reviews_count: int = 0,
) -> Dict[str, Any]:
    clean_title, series_name, series_pos = split_series(title)
    if not series and series_name:
        series = [{"name": series_name, "position": series_pos}]
    desc = clean_description(description)
    if description_chars and len(desc) > description_chars:
        cut = desc[:description_chars]
        desc = cut[: cut.rfind(" ")] + "…" if " " in cut else cut
    doc: Dict[str, Any] = {
        "_id": str(book_id),
        "title": clean_title or title,
        "full_title": title,
        "authors": authors or ["Unknown"],
        "description": desc,
        "rating": round(avg_rating, 2),
        "ratings": int(ratings_count),
        "pages": int(num_pages),
        "year": int(year),
        "cover": clean_cover(cover),
        "genres": genres,
        "category": simplify_category(genres, fuzzy_genres),
        "emotions": vibe["emotions"],
        "vibes": vibe["vibes"],
        "quality": quality_score(avg_rating, ratings_count),
        "popularity": round(math.log10(max(0, ratings_count) + 1), 4),
        "embedding": vector,
    }
    optional = {
        "isbn13": isbn13, "isbn": isbn, "work_id": work_id, "author_ids": author_ids,
        "series": series, "language": language, "publisher": publisher,
        "reviews": int(reviews_count) if reviews_count else None,
    }
    doc.update({k: v for k, v in optional.items() if v})
    return doc


def dedupe_key(title: str, authors: Sequence[str]) -> str:
    """Key used to collapse editions of the same book when no work_id is available."""
    base, _, _ = split_series(title)
    base = re.sub(r"[^a-z0-9 ]", "", base.lower())
    base = re.sub(r"\s+", " ", base).strip()
    first = re.sub(r"[^a-z]", "", (authors[0] if authors else "").lower())
    return f"{base}|{first}"
