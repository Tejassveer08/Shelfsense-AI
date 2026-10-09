"""Tests for the SQLite FTS5 + Chroma RetrievalService.

They build a tiny goodreads.db with the same schema as scripts/stream_goodreads_index.py and
use fake embedding / Chroma objects, so no model download or real index is needed.
"""

import sqlite3
import zlib
from types import SimpleNamespace

import numpy as np

from backend.app.services.retrieval import RetrievalService, simplify_category

SCHEMA = """
CREATE TABLE books (
    book_id TEXT PRIMARY KEY, isbn13 TEXT, isbn TEXT, title TEXT, authors TEXT, description TEXT,
    average_rating REAL, ratings_count INTEGER, num_pages INTEGER, publication_year INTEGER,
    image_url TEXT, genres TEXT,
    joy REAL, sadness REAL, fear REAL, anger REAL, surprise REAL, disgust REAL, neutral REAL,
    vibe_tone REAL, vibe_pacing REAL, vibe_depth REAL, vibe_length REAL
);
CREATE VIRTUAL TABLE books_fts USING fts5(book_id UNINDEXED, title, authors, description, tokenize='porter');
"""

# book_id, isbn13, title, authors, description, rating, pages, year, genres, tone, pacing, depth
BOOKS = [
    ("101", "9780000000101", "The Dragon Academy", "A. Writer",
     "A young wizard attends a school for dragon riders. He learns forbidden magic.",
     4.4, 420, 2012, '["Fantasy", "Young Adult"]', 0.3, 0.5, -0.4),
    ("102", "", "Quiet Harbor", "B. Author",
     "A slow melancholic novel about leaving home. The sea keeps calling her back.",
     4.0, 180, 1998, '["Literary Fiction"]', -0.2, -0.6, 0.5),
    ("103", "9780000000103", "Murder on the Moor", "C. Sleuth",
     "A detective investigates a murder on a foggy moor. A classic mystery.",
     3.2, 300, 0, '["Mystery", "Crime"]', -0.7, 0.4, 0.0),
    ("104", "9780000000104", "Cooking With Fire", "D. Chef",
     "Recipes and stories from a lifetime of cooking over open flames. Simple and warm.",
     4.8, 250, 2015, '["Cooking"]', 0.6, -0.1, -0.2),
    ("105", "9780000000105", "A History of Dragons", "E. Scholar",
     "A history of dragon legends across cultures and centuries. Includes many maps.",
     4.1, 380, 2005, '["History"]', 0.0, -0.3, 0.6),
]


class FakeEmbedder:
    def encode(self, texts, normalize_embeddings=True, **kwargs):
        single = isinstance(texts, str)
        items = [texts] if single else list(texts)
        vecs = []
        for t in items:
            v = np.random.default_rng(zlib.crc32(t.encode("utf-8"))).normal(size=16)
            vecs.append(v / np.linalg.norm(v))
        arr = np.array(vecs)
        return arr[0] if single else arr


class FakeCollection:
    def __init__(self, ids):
        self.ids = ids
        self.last_kwargs = None

    def count(self):
        return 5

    def query(self, **kwargs):
        self.last_kwargs = kwargs
        return {
            "ids": [list(self.ids)],
            "distances": [[0.1 + 0.05 * i for i in range(len(self.ids))]],
        }


def make_service(tmp_path, dense_ids=("101", "105", "102"), with_db=True):
    if with_db:
        conn = sqlite3.connect(str(tmp_path / "goodreads.db"))
        conn.executescript(SCHEMA)
        for bid, isbn13, title, authors, desc, rating, pages, year, genres, tone, pacing, depth in BOOKS:
            conn.execute(
                "INSERT INTO books VALUES (?,?,?,?,?,?,?,?,?,?,?,?, 0.3,0.1,0.1,0.1,0.1,0.1,0.2, ?,?,?,0.1)",
                (bid, isbn13, "", title, authors, desc, rating, 100, pages, year, "", genres, tone, pacing, depth),
            )
            conn.execute("INSERT INTO books_fts VALUES (?,?,?,?)", (bid, title, authors, desc))
        conn.commit()
        conn.close()
    collection = FakeCollection(list(dense_ids))
    service = RetrievalService(data_dir=str(tmp_path), embed_model=FakeEmbedder(), collection=collection)
    return service, collection


def test_hybrid_search_fuses_dense_and_keyword_results(tmp_path):
    service, _ = make_service(tmp_path)
    results, total = service.search("dragon school magic")
    assert results[0].isbn13 == "9780000000101"
    assert total >= 2
    explanation = results[0].ranking_explanation
    assert explanation["dense_rank"] == 1 and explanation["bm25_rank"] == 1
    assert results[0].matched_snippet


def test_books_without_isbn13_fall_back_to_book_id(tmp_path):
    service, _ = make_service(tmp_path)
    results, _ = service.search("slow melancholic home sea")
    assert "102" in [r.isbn13 for r in results]


def test_vibe_axes_use_the_ui_sign_convention(tmp_path):
    service, _ = make_service(tmp_path)
    vibes = service.get_book("102")["vibe_scores"]
    assert vibes["pacing"] == 0.6  # indexer -0.6 (slow) -> UI +0.6 (slow-burn)
    assert vibes["cerebral_escapist"] == -0.5  # indexer +0.5 (cerebral) -> UI -0.5
    assert vibes["dark_light"] == -0.2


def test_category_simplification():
    assert simplify_category(["Fantasy", "Young Adult"]) == "Sci-Fi & Fantasy"
    assert simplify_category(["Mystery", "Crime"]) == "Mystery & Thriller"
    assert simplify_category(["History"]) == "History & Politics"
    assert simplify_category(["Cooking"]) == "Arts & Literature"
    assert simplify_category(["Science Fiction"]) == "Sci-Fi & Fantasy"
    assert simplify_category(["Something Unmapped"]) == "Fiction"


def test_year_filter_excludes_unknown_and_out_of_range_years(tmp_path):
    service, collection = make_service(tmp_path, dense_ids=("103", "101", "102"))
    filters = SimpleNamespace(category=None, year_min=1990, year_max=None, max_pages=None, min_rating=None, tone=None)
    results, _ = service.search("murder detective moor", filters=filters)
    assert "9780000000103" not in [r.isbn13 for r in results]  # year 0 = unknown


def test_min_rating_is_prefiltered_in_chroma_and_enforced(tmp_path):
    service, collection = make_service(tmp_path, dense_ids=("103", "101"))
    filters = SimpleNamespace(category=None, year_min=None, year_max=None, max_pages=None, min_rating=4.0, tone=None)
    results, _ = service.search("murder detective moor", filters=filters)
    assert collection.last_kwargs["where"] == {"avg_rating": {"$gte": 4.0}}
    assert "9780000000103" not in [r.isbn13 for r in results]  # rating 3.2


def test_category_filter(tmp_path):
    service, _ = make_service(tmp_path, dense_ids=("101", "105", "102", "103"))
    filters = SimpleNamespace(category="History & Politics", year_min=None, year_max=None, max_pages=None, min_rating=None, tone=None)
    results, _ = service.search("dragon", filters=filters)
    assert [r.isbn13 for r in results] == ["9780000000105"]


def test_slider_reranks_results(tmp_path):
    service, _ = make_service(tmp_path, dense_ids=("101", "102"))
    plain, _ = service.search("zzzz")
    assert plain[0].isbn13 == "9780000000101"
    slow = SimpleNamespace(dark_light=0.0, pacing=1.0, cerebral_escapist=0.0, length_scale=0.0)
    steered, _ = service.search("zzzz", sliders=slow)
    assert steered[0].isbn13 == "102"  # the slow-burn book now ranks first


def test_stopword_only_and_special_character_queries_do_not_crash(tmp_path):
    service, _ = make_service(tmp_path)
    service.search("the and of")
    service.search('dragon" OR NOT (school* AND')
    service.search("   ")


def test_lookup_by_book_id_and_isbn13_and_catalog_view(tmp_path):
    service, _ = make_service(tmp_path)
    assert service.get_book("101")["title"] == "The Dragon Academy"
    assert service.get_book("9780000000101")["book_id"] == "101"
    assert service.catalog.get("102")["isbn13"] == "102"
    assert service.catalog.get("nope") is None
    assert "105" in service.catalog and "nope" not in service.catalog
    assert len(service.catalog) == 5


def test_missing_database_returns_no_results(tmp_path):
    service, _ = make_service(tmp_path, with_db=False)
    assert service.search("dragon") == ([], 0)
    assert not service.catalog
