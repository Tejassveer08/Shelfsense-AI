"""
GET /api/galaxy router for ShelfSense
Serves precomputed 2D UMAP projection coordinates for the Discovery Galaxy scatter plot
"""

import json
from pathlib import Path
from fastapi import APIRouter, HTTPException
from backend.app.models.schemas import GalaxyResponse, GalaxyNode

router = APIRouter(prefix="/api", tags=["galaxy"])


@router.get("/galaxy", response_model=GalaxyResponse)
async def get_galaxy_nodes():
    galaxy_path = Path("data/galaxy_nodes.json")
    if not galaxy_path.exists():
        raise HTTPException(status_code=503, detail="Discovery Galaxy data is currently compiling. Please try again shortly.")

    try:
        with open(galaxy_path, "r", encoding="utf-8") as f:
            nodes_data = json.load(f)

        nodes = [GalaxyNode(**n) for n in nodes_data]
        categories = sorted(list(set(n.category for n in nodes)))

        return GalaxyResponse(
            total=len(nodes),
            nodes=nodes,
            categories=categories,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load galaxy data: {str(e)}")
