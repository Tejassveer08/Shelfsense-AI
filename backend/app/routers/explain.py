"""
POST /api/explain router for ShelfSense
Generates grounded 1-2 sentence reasons why a book matches the query
"""

from fastapi import APIRouter, HTTPException, Depends
from backend.app.models.schemas import ExplainRequest, ExplainResponse
from backend.app.services.dependencies import get_retrieval_service, get_llm_service

router = APIRouter(prefix="/api", tags=["explain"])


@router.post("/explain", response_model=ExplainResponse)
async def explain_book(
    request: ExplainRequest,
    retrieval_service=Depends(get_retrieval_service),
    llm_service=Depends(get_llm_service),
):
    try:
        book = retrieval_service.catalog.get(request.isbn13)
        if not book:
            raise HTTPException(status_code=404, detail="Book not found in library catalog")

        query_emb = retrieval_service.embed_model.encode(request.query, normalize_embeddings=True)
        matched_snippet = retrieval_service.find_best_matching_snippet(book["description"], query_emb)

        top_emo = max(book.get("emotions", {}).items(), key=lambda x: x[1])[0] if book.get("emotions") else "neutral"
        pacing_val = book.get("vibe_scores", {}).get("pacing", 0.0)
        vibe_sum = "slow-burn atmospheric" if pacing_val > 0.1 else ("fast-paced urgent" if pacing_val < -0.1 else "balanced")

        llm, provider_name = llm_service
        explanation = llm.generate_explanation(
            title=book["title"],
            authors=book["authors"],
            description=book["description"],
            query=request.query,
            matched_snippet=matched_snippet,
            dominant_emotion=top_emo,
            vibe_summary=vibe_sum,
        )

        return ExplainResponse(
            isbn13=request.isbn13,
            explanation=explanation,
            highlighted_snippet=matched_snippet,
            confidence=0.95 if "Gemini" in provider_name else 0.88,
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Explanation failed: {str(e)}")
