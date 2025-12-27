from fastapi import APIRouter
from app.services.gemini_service import get_available_models, DEFAULT_MODEL


router = APIRouter(prefix="/api", tags=["models"])


@router.get("/models")
async def list_models():
    """
    Get list of available LLM models.
    
    Returns models that can be used for queries, chart generation,
    and data modification.
    """
    models = get_available_models()
    return {
        "models": models,
        "default": DEFAULT_MODEL
    }
