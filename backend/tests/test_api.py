"""
API Integration tests for ShelfSense FastAPI endpoints
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "indexed_books" in data
    assert data["indexed_books"] > 0
    assert "llm_provider" in data


def test_galaxy_endpoint():
    response = client.get("/api/galaxy")
    assert response.status_code == 200
    data = response.json()
    assert "nodes" in data
    assert "categories" in data
    assert len(data["nodes"]) > 0
    first_node = data["nodes"][0]
    assert "x" in first_node
    assert "y" in first_node
    assert "isbn13" in first_node


def test_search_endpoint():
    payload = {
        "query": "A mysterious atmospheric novel about memories and loss",
        "sliders": {
            "dark_light": -0.5,
            "pacing": 0.5,
            "cerebral_escapist": -0.3,
            "length_scale": 0.0,
        },
        "limit": 5,
    }
    response = client.post("/api/search", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert len(data["results"]) > 0
    first = data["results"][0]
    assert "title" in first
    assert "authors" in first
    assert "isbn13" in first
    assert "ranking_explanation" in first
    assert first["matched_snippet"] is not None


def test_similar_and_contrast_endpoint():
    # 1. Search for a book to get its ISBN
    search_res = client.post("/api/search", json={"query": "science fiction space", "limit": 1})
    assert search_res.status_code == 200
    books = search_res.json()["results"]
    assert len(books) > 0
    isbn = books[0]["isbn13"]

    # 2. Taste Profile
    taste_res = client.post("/api/similar", json={"isbn13s": [isbn], "limit": 4})
    assert taste_res.status_code == 200
    taste_data = taste_res.json()
    assert taste_data["mode"] == "taste_profile"
    assert len(taste_data["results"]) > 0

    # 3. Contrast Mode
    contrast_res = client.post("/api/similar", json={"isbn13s": [isbn], "modifier": "but funnier and shorter", "limit": 4})
    assert contrast_res.status_code == 200
    contrast_data = contrast_res.json()
    assert contrast_data["mode"] == "contrast_mode"
    assert contrast_data["modifier_applied"] == "but funnier and shorter"


def test_explain_endpoint():
    search_res = client.post("/api/search", json={"query": "ancient history empire", "limit": 1})
    isbn = search_res.json()["results"][0]["isbn13"]

    explain_res = client.post("/api/explain", json={"isbn13": isbn, "query": "ancient history empire"})
    assert explain_res.status_code == 200
    data = explain_res.json()
    assert "explanation" in data
    assert len(data["explanation"]) > 10
    assert "highlighted_snippet" in data


def test_chat_refine_endpoint():
    payload = {
        "messages": [
            {"role": "user", "content": "I want something darker and faster-paced than these"}
        ],
        "state": {
            "query": "crime mystery",
            "sliders": {"dark_light": 0.0, "pacing": 0.0},
        },
    }
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert "updated_sliders" in data
    assert "results" in data
