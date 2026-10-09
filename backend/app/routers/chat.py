"""
POST /api/chat router for ShelfSense
Handles conversational refine drawer interactions and live recommendation updates
"""

from fastapi import APIRouter, HTTPException, Depends
from backend.app.models.schemas import ChatRequest, ChatResponse, Filters, VibeSliders
from backend.app.services.dependencies import get_retrieval_service, get_llm_service

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat_refine(
    request: ChatRequest,
    retrieval_service=Depends(get_retrieval_service),
    llm_service=Depends(get_llm_service),
):
    try:
        if not request.messages:
            raise HTTPException(status_code=400, detail="Messages array cannot be empty")

        llm, _ = llm_service
        reply, updates = llm.generate_chat_refinement(
            messages=request.messages,
            current_state=request.state or {},
        )

        # Merge updates with current state
        state = request.state or {}
        new_query = updates.get("updated_query") or state.get("query", "compelling books")
        
        # Merge sliders
        cur_sliders = state.get("sliders", {})
        merged_sliders = {**cur_sliders, **updates.get("sliders", {})}
        active_sliders = VibeSliders(**{k: v for k, v in merged_sliders.items() if v is not None})

        # Merge filters
        cur_filters = state.get("filters", {})
        merged_filters = {**cur_filters, **updates.get("filters", {})}
        active_filters = Filters(**{k: v for k, v in merged_filters.items() if v is not None})

        # Re-execute search with refined parameters
        results, _ = retrieval_service.search(
            query=new_query,
            filters=active_filters,
            sliders=active_sliders,
            limit=12,
        )

        return ChatResponse(
            reply=reply,
            updated_query=new_query,
            updated_filters=active_filters.model_dump(exclude_none=True),
            updated_sliders=active_sliders.model_dump(),
            results=results,
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Chat refinement failed: {str(e)}")
