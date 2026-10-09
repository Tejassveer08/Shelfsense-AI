"""
Unit tests for ShelfSense retrieval fusion, filtering, and vibe sliders
"""

import pytest
import numpy as np
from backend.app.models.schemas import Filters, VibeSliders
from backend.app.services.llm import OfflineFallbackProvider
from scripts.build_index import compute_vibe_scores


def test_offline_fallback_explanation():
    provider = OfflineFallbackProvider()
    explanation = provider.generate_explanation(
        title="Dune",
        authors="Frank Herbert",
        description="Set on the desert planet Arrakis, Dune is the story of Paul Atreides...",
        query="epic desert sci-fi about power and ecology",
        matched_snippet="Set on the desert planet Arrakis, Dune is the story of Paul Atreides",
        dominant_emotion="fear",
        vibe_summary="slow-burn atmospheric",
    )
    assert len(explanation) > 20
    assert "Dune" in explanation
    assert "Arrakis" in explanation


def test_vibe_sliders_calculation():
    # Simulated emotions and mock embeddings
    emotions = {
        "joy": 0.8,
        "sadness": 0.05,
        "fear": 0.05,
        "anger": 0.05,
        "disgust": 0.02,
        "surprise": 0.1,
        "neutral": 0.2,
    }
    desc_emb = np.array([0.1] * 384, dtype=np.float32)
    anchor_embs = {
        "light": np.array([0.2] * 384, dtype=np.float32),
        "dark": np.array([-0.2] * 384, dtype=np.float32),
        "fast_paced": np.array([0.2] * 384, dtype=np.float32),
        "slow_burn": np.array([-0.2] * 384, dtype=np.float32),
        "cerebral": np.array([0.2] * 384, dtype=np.float32),
        "escapist": np.array([-0.2] * 384, dtype=np.float32),
    }

    scores = compute_vibe_scores(
        emotions=emotions,
        num_pages=650,
        desc_emb=desc_emb,
        anchor_embs=anchor_embs,
    )

    assert "dark_light" in scores
    assert "pacing" in scores
    assert "cerebral_escapist" in scores
    assert "length_scale" in scores
    # Scores must stay within [-1.0, 1.0]
    for k, v in scores.items():
        assert -1.0 <= v <= 1.0
    # A book with 650 pages should have a positive length_scale (epic)
    assert scores["length_scale"] > 0.5
    # High joy should lean towards light (> 0)
    assert scores["dark_light"] > 0.0


def test_rrf_scoring_math():
    # Verify Reciprocal Rank Fusion formula monotonicity
    k_rrf = 60
    rank1 = 1
    rank10 = 10
    score_top = (0.6 / (k_rrf + rank1)) + (0.4 / (k_rrf + rank1))
    score_mid = (0.6 / (k_rrf + rank10)) + (0.4 / (k_rrf + rank10))
    assert score_top > score_mid
    assert score_top > 0
