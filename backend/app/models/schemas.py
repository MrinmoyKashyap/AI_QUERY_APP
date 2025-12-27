from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field


# ============== File Upload Schemas ==============

class DatasetInfo(BaseModel):
    """Information about an uploaded dataset."""
    id: str
    filename: str
    original_filename: str
    rows: int
    columns: int
    column_names: list[str]
    column_types: dict[str, str]
    file_size: int
    uploaded_at: datetime
    

class DatasetPreview(BaseModel):
    """Preview of dataset with sample data."""
    info: DatasetInfo
    preview_data: list[dict[str, Any]]
    

class DatasetListResponse(BaseModel):
    """Response for listing all datasets."""
    datasets: list[DatasetInfo]
    total: int


# ============== Query Schemas ==============

class QueryRequest(BaseModel):
    """Request to process a natural language query."""
    dataset_id: str
    query: str
    model: Optional[str] = None  # LLM model to use
    

class QueryResult(BaseModel):
    """Result of a natural language query."""
    query: str
    result_type: str  # 'table', 'value', 'text', 'error'
    data: Any
    explanation: str
    pandas_code: Optional[str] = None
    execution_time_ms: float
    

class QueryHistoryItem(BaseModel):
    """A single query history item."""
    id: str
    query: str
    result_type: str
    timestamp: datetime
    

# ============== Data Modification Schemas ==============

class DataModifyRequest(BaseModel):
    """Request to modify data using natural language."""
    dataset_id: str
    command: str
    model: Optional[str] = None  # LLM model to use
    

class DataModifyResult(BaseModel):
    """Result of a data modification operation."""
    success: bool
    message: str
    changes_made: str
    rows_affected: int
    pandas_code: Optional[str] = None


class CellUpdateRequest(BaseModel):
    """Request to update a specific cell."""
    row_index: int
    column_name: str
    new_value: Any
    

# ============== Chart Schemas ==============

class ChartRequest(BaseModel):
    """Request to generate a chart."""
    dataset_id: str
    query: str  # Natural language chart request
    model: Optional[str] = None  # LLM model to use
    

class ChartConfig(BaseModel):
    """Configuration for a chart."""
    chart_type: str  # 'bar', 'line', 'pie', 'scatter', 'area'
    title: str
    x_axis: Optional[str] = None
    y_axis: Optional[str] = None
    x_label: Optional[str] = None
    y_label: Optional[str] = None
    

class ChartData(BaseModel):
    """Data for rendering a chart."""
    config: ChartConfig
    data: list[dict[str, Any]]
    explanation: str


# ============== Common Schemas ==============

class ErrorResponse(BaseModel):
    """Standard error response."""
    error: str
    detail: Optional[str] = None
    

class SuccessResponse(BaseModel):
    """Standard success response."""
    success: bool = True
    message: str
