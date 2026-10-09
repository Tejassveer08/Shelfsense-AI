"""
POST /api/similar router for ShelfSense
Handles Taste Profile recommendation & Contrast Mode
"""

from fastapi import APIRouter, HTTPException, Depends
from backend.app.models.schemas import SimilarRequest, SimilarResponse
from backend.app.services.dependencies import get_similarity_service

router = APIRouter(prefix="/api", tags=["similar"])


@router.post("/similar", response_model=SimilarResponse)
async def get_similar_books(
    request: SimilarRequest,
    similarity_service=Depends(get_similarity_service),
):
    try:
        # Check if Contrast Mode was requested
        if request.modifier and len(request.isbn13s) == 1:
            base_isbn = request.isbn13s[0]
            results, base_title = similarity_service.recommend_with_contrast(
                base_isbn13=base_isbn,
                modifier=request.modifier,
                limit=request.limit,
            )
            return SimilarResponse(
                results=results,
                total=len(results),
                mode="contrast_mode",
                attributed_to=[base_title],
                modifier_applied=request.modifier,
            )
        else:
            # Taste Profile mode
            results, attributed_titles = similarity_service.recommend_from_taste_profile(
                isbn13s=request.isbn13s,
                ratings=request.ratings,
                limit=request.limit,
            )
            return SimilarResponse(
                results=results,
                total=len(results),
                mode="taste_profile",
                attributed_to=attributed_titles,
            )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Similarity recommendation failed: {str(e)}")
