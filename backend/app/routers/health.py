"""
GET /api/health router for ShelfSense
"""

from fastapi import APIRouter, Depends
from backend.app.models.schemas import HealthResponse
from backend.app.services.dependencies import get_retrieval_service, get_llm_service

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def check_health(
    retrieval_service=Depends(get_retrieval_service),
    llm_service=Depends(get_llm_service),
):
    _, provider_name = llm_service
    count = len(retrieval_service.catalog)

    return HealthResponse(
        status="healthy" if count > 0 else "degraded",
        indexed_books=count,
        llm_provider=provider_name,
        version="1.0.0",
    )
