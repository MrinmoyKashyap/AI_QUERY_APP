from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.models import ChartRequest, ChartData
from app.services.chart_service import get_chart_service
from app.utils.file_handler import get_dataset_info


router = APIRouter(prefix="/api/charts", tags=["charts"])


class QuickChartRequest(BaseModel):
    """Request for generating a chart with explicit configuration."""
    dataset_id: str
    chart_type: str
    x_column: str
    y_column: Optional[str] = None
    aggregation: str = "none"


@router.post("/generate")
async def generate_chart(request: ChartRequest):
    """
    Generate chart data from natural language request.
    
    Examples:
    - "Create a bar chart of sales by region"
    - "Show me a line chart of revenue over time"
    - "Make a pie chart of category distribution"
    """
    if not get_dataset_info(request.dataset_id):
        raise HTTPException(
            status_code=404,
            detail=f"Dataset {request.dataset_id} not found"
        )
    
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    
    try:
        service = get_chart_service()
        result = await service.generate_chart(
            dataset_id=request.dataset_id,
            query=request.query,
            model=request.model
        )
        
        if not result.get('success'):
            error_msg = result.get('error', 'Failed to generate chart')
            print(f"Chart generation failed: {error_msg}")
            raise HTTPException(status_code=400, detail=error_msg)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error generating chart: {str(e)}")


@router.post("/quick")
async def generate_quick_chart(request: QuickChartRequest):
    """
    Generate a chart with explicit configuration (no LLM).
    
    Faster alternative when you know exactly what chart you want.
    """
    if not get_dataset_info(request.dataset_id):
        raise HTTPException(
            status_code=404,
            detail=f"Dataset {request.dataset_id} not found"
        )
    
    try:
        service = get_chart_service()
        result = service.generate_quick_chart(
            dataset_id=request.dataset_id,
            chart_type=request.chart_type,
            x_column=request.x_column,
            y_column=request.y_column,
            aggregation=request.aggregation
        )
        
        if not result.get('success'):
            raise HTTPException(status_code=400, detail=result.get('error', 'Failed to generate chart'))
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating chart: {str(e)}")


@router.get("/types")
async def get_chart_types():
    """Get list of available chart types."""
    service = get_chart_service()
    return {"chart_types": service.get_available_chart_types()}
