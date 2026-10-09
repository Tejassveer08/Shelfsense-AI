"""
FastAPI dependency injection provider for singleton services
"""

from typing import Optional, Tuple
from backend.app.services.retrieval import RetrievalService
from backend.app.services.similarity import SimilarityService
from backend.app.services.llm import get_llm_provider, BaseLLMProvider

_retrieval_service: Optional[RetrievalService] = None
_similarity_service: Optional[SimilarityService] = None
_llm_service: Optional[Tuple[BaseLLMProvider, str]] = None


def get_retrieval_service() -> RetrievalService:
    global _retrieval_service
    if _retrieval_service is None:
        _retrieval_service = RetrievalService()
    return _retrieval_service


def get_similarity_service() -> SimilarityService:
    global _similarity_service
    if _similarity_service is None:
        retrieval = get_retrieval_service()
        _similarity_service = SimilarityService(retrieval_service=retrieval)
    return _similarity_service


def get_llm_service() -> Tuple[BaseLLMProvider, str]:
    global _llm_service
    if _llm_service is None:
        _llm_service = get_llm_provider()
    return _llm_service
