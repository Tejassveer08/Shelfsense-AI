"""
POST /api/search router for ShelfSense
Supports hybrid search (dense + BM25 RRF), filters, vibe sliders re-ranking
"""

from fastapi import APIRouter, HTTPException, Depends
from backend.app.models.schemas import SearchRequest, SearchResponse
from backend.app.services.dependencies import get_retrieval_service, get_llm_service

router = APIRouter(prefix="/api", tags=["search"])


@router.post("/search", response_model=SearchResponse)
async def search_books(
    request: SearchRequest,
    retrieval_service=Depends(get_retrieval_service),
    llm_service=Depends(get_llm_service),
):
    try:
        results, total = retrieval_service.search(
            query=request.query,
            filters=request.filters,
            sliders=request.sliders,
            limit=request.limit,
            rerank=request.rerank,
        )

        applied_filters = request.filters.model_dump(exclude_none=True) if request.filters else {}
        applied_sliders = {
            k: v for k, v in (request.sliders.model_dump().items() if request.sliders else {}.items())
            if abs(v) > 0.05
        }

        # For the top 3 results, attach an inline LLM explanation preview if missing
        llm, _ = llm_service
        for item in results[:3]:
            if not item.explanation:
                top_emo = max(item.emotions.items(), key=lambda x: x[1])[0] if item.emotions else "neutral"
                vibe_sum = "contemplative" if item.vibe_scores.get("pacing", 0) > 0 else "fast-paced"
                item.explanation = llm.generate_explanation(
                    title=item.title,
                    authors=item.authors,
                    description=item.description,
                    query=request.query,
                    matched_snippet=item.matched_snippet or item.title,
                    dominant_emotion=top_emo,
                    vibe_summary=vibe_sum,
                )

        return SearchResponse(
            results=results,
            total=total,
            query=request.query,
            applied_filters=applied_filters,
            applied_sliders=applied_sliders,
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")
