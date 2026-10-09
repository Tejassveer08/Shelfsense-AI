"""
GET /api/book/{isbn13} router for ShelfSense
Returns full metadata, DNA emotion radar scores, vibe scores, and similar books
"""

from fastapi import APIRouter, HTTPException, Depends
from backend.app.models.schemas import BookItem
from backend.app.services.dependencies import get_retrieval_service, get_similarity_service

router = APIRouter(prefix="/api", tags=["books"])


@router.get("/book/{isbn13}", response_model=BookItem)
async def get_book_by_isbn(
    isbn13: str,
    retrieval_service=Depends(get_retrieval_service),
):
    book = retrieval_service.catalog.get(isbn13)
    if not book:
        raise HTTPException(status_code=404, detail=f"Book with ISBN {isbn13} not found")

    return BookItem(
        isbn13=book["isbn13"],
        isbn10=book.get("isbn10", ""),
        title=book["title"],
        authors=book["authors"],
        categories=book["categories"],
        raw_category=book.get("raw_category", ""),
        thumbnail=book["thumbnail"],
        description=book["description"],
        published_year=book["published_year"],
        average_rating=book["average_rating"],
        num_pages=book["num_pages"],
        ratings_count=book["ratings_count"],
        emotions=book.get("emotions", {}),
        vibe_scores=book.get("vibe_scores", {}),
        galaxy_x=book.get("galaxy_x", 0.0),
        galaxy_y=book.get("galaxy_y", 0.0),
    )
