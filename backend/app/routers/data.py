from fastapi import APIRouter, HTTPException
from app.models import DataModifyRequest, DataModifyResult, CellUpdateRequest
from app.services.data_service import get_data_service
from app.utils.file_handler import get_dataset_info


router = APIRouter(prefix="/api/data", tags=["data"])


@router.post("/modify", response_model=DataModifyResult)
async def modify_data(request: DataModifyRequest):
    """
    Modify dataset using natural language command.
    
    Examples:
    - "Add a new column 'total' that is price * quantity"
    - "Delete rows where age is less than 18"
    - "Replace all 'N/A' values with 0"
    """
    if not get_dataset_info(request.dataset_id):
        raise HTTPException(
            status_code=404,
            detail=f"Dataset {request.dataset_id} not found"
        )
    
    if not request.command.strip():
        raise HTTPException(status_code=400, detail="Command cannot be empty")
    
    try:
        service = get_data_service()
        result = await service.modify_data(
            dataset_id=request.dataset_id,
            command=request.command,
            model=request.model
        )
        
        return DataModifyResult(**result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error modifying data: {str(e)}")


@router.get("/{dataset_id}")
async def get_data(dataset_id: str, page: int = 1, page_size: int = 50):
    """Get paginated data from a dataset."""
    if not get_dataset_info(dataset_id):
        raise HTTPException(status_code=404, detail=f"Dataset {dataset_id} not found")
    
    service = get_data_service()
    result = service.get_paginated_data(
        dataset_id=dataset_id,
        page=page,
        page_size=min(page_size, 100)
    )
    
    if not result['success']:
        raise HTTPException(status_code=404, detail=result['message'])
    
    return result


@router.put("/{dataset_id}/cell")
async def update_cell(dataset_id: str, request: CellUpdateRequest):
    """Update a specific cell in the dataset."""
    if not get_dataset_info(dataset_id):
        raise HTTPException(status_code=404, detail=f"Dataset {dataset_id} not found")
    
    service = get_data_service()
    result = service.update_cell(
        dataset_id=dataset_id,
        row_index=request.row_index,
        column_name=request.column_name,
        new_value=request.new_value
    )
    
    if not result['success']:
        raise HTTPException(status_code=400, detail=result['message'])
    
    return result
