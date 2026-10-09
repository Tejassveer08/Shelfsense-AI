"""
Pydantic v2 schemas for ShelfSense API
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class Filters(BaseModel):
    category: Optional[str] = Field(None, description="Simplified category filter")
    tone: Optional[str] = Field(None, description="Emotional tone: joy, sadness, fear, anger, surprise, neutral")
    year_min: Optional[int] = Field(None, description="Minimum published year")
    year_max: Optional[int] = Field(None, description="Maximum published year")
    max_pages: Optional[int] = Field(None, description="Maximum number of pages")
    min_rating: Optional[float] = Field(None, description="Minimum average rating (e.g. 3.5, 4.0)")


class VibeSliders(BaseModel):
    dark_light: float = Field(0.0, ge=-1.0, le=1.0, description="Dark (-1.0) <-> Light (+1.0)")
    pacing: float = Field(0.0, ge=-1.0, le=1.0, description="Fast-paced (-1.0) <-> Slow-burn (+1.0)")
    cerebral_escapist: float = Field(0.0, ge=-1.0, le=1.0, description="Cerebral (-1.0) <-> Escapist (+1.0)")
    length_scale: float = Field(0.0, ge=-1.0, le=1.0, description="Short (-1.0) <-> Epic (+1.0)")


class BookItem(BaseModel):
    isbn13: str
    isbn10: Optional[str] = ""
    title: str
    authors: str
    categories: str
    raw_category: Optional[str] = ""
    thumbnail: str
    description: str
    published_year: int
    average_rating: float
    num_pages: int
    ratings_count: int
    emotions: Dict[str, float] = Field(default_factory=dict)
    vibe_scores: Dict[str, float] = Field(default_factory=dict)
    galaxy_x: float = 0.0
    galaxy_y: float = 0.0

    # Dynamic retrieval fields
    search_score: Optional[float] = None
    dense_score: Optional[float] = None
    bm25_score: Optional[float] = None
    matched_snippet: Optional[str] = None
    explanation: Optional[str] = None
    ranking_explanation: Optional[Dict[str, Any]] = None


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Natural language search query")
    filters: Optional[Filters] = None
    sliders: Optional[VibeSliders] = None
    limit: int = Field(24, ge=1, le=100)
    rerank: bool = Field(False, description="Use cross-encoder reranker on top candidates")


class SearchResponse(BaseModel):
    results: List[BookItem]
    total: int
    query: str
    applied_filters: Dict[str, Any]
    applied_sliders: Dict[str, float]


class SimilarRequest(BaseModel):
    isbn13s: List[str] = Field(..., min_length=1, max_length=10, description="1-10 loved book ISBNs")
    ratings: Optional[Dict[str, float]] = Field(None, description="Optional ratings (1.0 - 5.0) per ISBN")
    modifier: Optional[str] = Field(None, description="Contrast modifier (e.g. 'but happier', 'shorter')")
    limit: int = Field(12, ge=1, le=50)


class SimilarResponse(BaseModel):
    results: List[BookItem]
    total: int
    mode: str = Field("taste_profile", description="'taste_profile' or 'contrast_mode'")
    attributed_to: List[str] = Field(default_factory=list)
    modifier_applied: Optional[str] = None


class ExplainRequest(BaseModel):
    isbn13: str
    query: str


class ExplainResponse(BaseModel):
    isbn13: str
    explanation: str
    highlighted_snippet: str
    confidence: float


class ChatMessage(BaseModel):
    role: str = Field(..., description="'user', 'assistant', or 'system'")
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    state: Optional[Dict[str, Any]] = Field(default_factory=dict)


class ChatResponse(BaseModel):
    reply: str
    updated_query: Optional[str] = None
    updated_filters: Optional[Dict[str, Any]] = None
    updated_sliders: Optional[Dict[str, float]] = None
    results: List[BookItem] = Field(default_factory=list)


class GalaxyNode(BaseModel):
    isbn13: str
    title: str
    authors: str
    category: str
    rating: float
    pages: int
    year: int
    cover: str
    x: float
    y: float
    vibe_scores: Dict[str, float]
    emotions: Dict[str, float]


class GalaxyResponse(BaseModel):
    total: int
    nodes: List[GalaxyNode]
    categories: List[str]


class HealthResponse(BaseModel):
    status: str
    indexed_books: int
    llm_provider: str
    version: str = "1.0.0"
