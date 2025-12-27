from fastapi import APIRouter, UploadFile, File, HTTPException
from app.models import DatasetInfo, DatasetPreview, DatasetListResponse
from app.utils.file_handler import (
    save_uploaded_file,
    load_dataframe,
    register_dataset,
    get_dataset_info,
    get_all_datasets,
    get_dataframe,
    delete_dataset,
)


router = APIRouter(prefix="/api", tags=["upload"])


@router.post("/upload", response_model=DatasetPreview)
async def upload_file(file: UploadFile = File(...)):
    """
    Upload a CSV or Excel file.
    
    Returns dataset info and a preview of the data.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    
    # Validate file type
    allowed_extensions = ['.csv', '.xlsx', '.xls']
    if not any(file.filename.lower().endswith(ext) for ext in allowed_extensions):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
        )
    
    try:
        # Save the file
        dataset_id, file_path = await save_uploaded_file(file)
        
        # Load and register the dataset
        df = load_dataframe(file_path)
        info = register_dataset(dataset_id, file_path, file.filename, df)
        
        # Get preview data
        preview_data = df.head(10).to_dict('records')
        
        return DatasetPreview(
            info=DatasetInfo(**info),
            preview_data=preview_data
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


@router.get("/datasets", response_model=DatasetListResponse)
async def list_datasets():
    """Get list of all uploaded datasets."""
    datasets = get_all_datasets()
    return DatasetListResponse(
        datasets=[DatasetInfo(**d) for d in datasets],
        total=len(datasets)
    )


@router.get("/datasets/{dataset_id}")
async def get_dataset(dataset_id: str, page: int = 1, page_size: int = 50):
    """
    Get dataset info and paginated data.
    
    Args:
        dataset_id: Dataset ID
        page: Page number (1-indexed)
        page_size: Rows per page (max 100)
    """
    info = get_dataset_info(dataset_id)
    if not info:
        raise HTTPException(status_code=404, detail=f"Dataset {dataset_id} not found")
    
    df = get_dataframe(dataset_id)
    if df is None:
        raise HTTPException(status_code=404, detail=f"Dataset data not found")
    
    # Limit page size
    page_size = min(page_size, 100)
    
    total_rows = len(df)
    total_pages = (total_rows + page_size - 1) // page_size
    page = max(1, min(page, total_pages)) if total_pages > 0 else 1
    
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    
    return {
        "info": DatasetInfo(**info),
        "data": df.iloc[start_idx:end_idx].to_dict('records'),
        "pagination": {
            "current_page": page,
            "page_size": page_size,
            "total_rows": total_rows,
            "total_pages": total_pages
        }
    }


@router.delete("/datasets/{dataset_id}")
async def remove_dataset(dataset_id: str):
    """Delete a dataset."""
    if not get_dataset_info(dataset_id):
        raise HTTPException(status_code=404, detail=f"Dataset {dataset_id} not found")
    
    success = delete_dataset(dataset_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete dataset")
    
    return {"success": True, "message": f"Dataset {dataset_id} deleted"}


@router.get("/datasets/{dataset_id}/export")
async def export_dataset(dataset_id: str):
    """
    Export dataset as CSV.
    
    Returns the full dataset as a CSV file download.
    """
    from fastapi.responses import StreamingResponse
    import io
    
    info = get_dataset_info(dataset_id)
    if not info:
        raise HTTPException(status_code=404, detail=f"Dataset {dataset_id} not found")
    
    df = get_dataframe(dataset_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Dataset data not found")
    
    # Convert to CSV
    csv_buffer = io.StringIO()
    df.to_csv(csv_buffer, index=False)
    csv_buffer.seek(0)
    
    filename = info.get('original_filename', 'export').replace('.xlsx', '.csv').replace('.xls', '.csv')
    if not filename.endswith('.csv'):
        filename = filename + '.csv'
    
    return StreamingResponse(
        iter([csv_buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

