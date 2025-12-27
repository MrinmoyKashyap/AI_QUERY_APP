from fastapi import APIRouter, HTTPException
from app.models import QueryRequest, QueryResult
from app.services.query_engine import get_query_engine
from app.utils.file_handler import get_dataset_info


router = APIRouter(prefix="/api", tags=["query"])

# In-memory query history (would use DB in production)
_query_history: dict[str, list[dict]] = {}


@router.post("/query", response_model=QueryResult)
async def process_query(request: QueryRequest):
    """
    Process a natural language query on a dataset.
    
    Uses Gemini to convert natural language to Pandas operations.
    """
    # Validate dataset exists
    if not get_dataset_info(request.dataset_id):
        raise HTTPException(
            status_code=404,
            detail=f"Dataset {request.dataset_id} not found"
        )
    
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    
    try:
        engine = get_query_engine()
        result = await engine.process_query(
            dataset_id=request.dataset_id,
            query=request.query,
            model=request.model
        )
        
        # Store in history
        if request.dataset_id not in _query_history:
            _query_history[request.dataset_id] = []
        
        _query_history[request.dataset_id].append({
            "query": request.query,
            "result_type": result.get('result_type'),
            "timestamp": None  # Would add proper timestamp
        })
        
        # Keep only last 50 queries per dataset
        _query_history[request.dataset_id] = _query_history[request.dataset_id][-50:]
        
        return QueryResult(
            query=request.query,
            result_type=result.get('result_type', 'error'),
            data=result.get('data'),
            explanation=result.get('explanation', ''),
            pandas_code=result.get('pandas_code'),
            execution_time_ms=result.get('execution_time_ms', 0)
        )
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")


@router.get("/query/history/{dataset_id}")
async def get_query_history(dataset_id: str, limit: int = 20):
    """Get query history for a dataset."""
    if not get_dataset_info(dataset_id):
        raise HTTPException(status_code=404, detail=f"Dataset {dataset_id} not found")
    
    history = _query_history.get(dataset_id, [])
    
    return {
        "dataset_id": dataset_id,
        "history": history[-limit:],
        "total": len(history)
    }


@router.get("/query/suggestions/{dataset_id}")
async def get_query_suggestions(dataset_id: str):
    """Get suggested queries based on dataset structure."""
    info = get_dataset_info(dataset_id)
    if not info:
        raise HTTPException(status_code=404, detail=f"Dataset {dataset_id} not found")
    
    columns = info['column_names']
    column_types = info['column_types']
    
    suggestions = [
        "Show me the first 10 rows",
        "How many rows are in this dataset?",
        "Show all columns and their types",
        "Give me basic statistics",
    ]
    
    # Add column-specific suggestions
    numeric_cols = [col for col, dtype in column_types.items() if dtype in ['integer', 'decimal']]
    text_cols = [col for col, dtype in column_types.items() if dtype == 'text']
    
    if numeric_cols:
        suggestions.append(f"What is the average {numeric_cols[0]}?")
        suggestions.append(f"What is the maximum {numeric_cols[0]}?")
    
    if text_cols:
        suggestions.append(f"How many unique {text_cols[0]} are there?")
    
    if len(columns) >= 2:
        suggestions.append(f"Group by {columns[0]} and show the count")
    
    return {"suggestions": suggestions[:10]}
