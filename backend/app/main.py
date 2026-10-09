"""
ShelfSense FastAPI Application
Production backend for semantic book recommendation
"""

import time
from contextlib import asynccontextmanager
from typing import Dict, Any, Tuple

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.routers import search, similar, explain, chat, books, galaxy, health
from backend.app.services.dependencies import get_retrieval_service, get_llm_service

# Simple in-memory response cache for repeated queries
_RESPONSE_CACHE: Dict[str, Tuple[float, Any]] = {}
CACHE_TTL_SECONDS = 300  # 5 minutes


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting ShelfSense API server...")
    # Pre-warm services on startup
    try:
        retrieval = get_retrieval_service()
        llm, provider = get_llm_service()
        print(f"ShelfSense initialized: {len(retrieval.catalog)} books loaded. LLM provider: {provider}")
    except Exception as e:
        print(f"Warning during service warm-up: {e}")
    yield
    print("Shutting down ShelfSense API server...")


app = FastAPI(
    title="ShelfSense API",
    description="Production-quality LLM-powered semantic book recommender API",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def cache_and_timing_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    response.headers["X-Response-Time"] = f"{duration:.3f}s"
    return response


# Include Routers
app.include_router(search.router)
app.include_router(similar.router)
app.include_router(explain.router)
app.include_router(chat.router)
app.include_router(books.router)
app.include_router(galaxy.router)
app.include_router(health.router)


@app.get("/")
def root():
    return {
        "message": "Welcome to the ShelfSense API",
        "docs": "/docs",
        "health": "/api/health",
    }
