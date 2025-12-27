import os
import uuid
import aiofiles
import pandas as pd
from datetime import datetime
from pathlib import Path
from typing import Optional
from fastapi import UploadFile

from app.config import get_settings


# In-memory storage for dataset metadata (would use DB in production)
_datasets_store: dict[str, dict] = {}
_dataframes_cache: dict[str, pd.DataFrame] = {}


def get_upload_dir() -> Path:
    """Get the upload directory path, creating it if necessary."""
    settings = get_settings()
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    return upload_dir


def load_existing_datasets():
    """Load existing datasets from the uploads directory on startup."""
    upload_dir = get_upload_dir()
    
    for file_path in upload_dir.iterdir():
        if file_path.suffix.lower() in ['.csv', '.xlsx', '.xls']:
            dataset_id = file_path.stem  # Use filename without extension as ID
            
            # Skip if already registered
            if dataset_id in _datasets_store:
                continue
            
            try:
                df = load_dataframe(file_path)
                register_dataset(
                    dataset_id=dataset_id,
                    file_path=file_path,
                    original_filename=file_path.name,
                    df=df
                )
                print(f"Loaded existing dataset: {dataset_id}")
            except Exception as e:
                print(f"Failed to load dataset {file_path.name}: {e}")


async def save_uploaded_file(file: UploadFile) -> tuple[str, Path]:
    """
    Save an uploaded file and return its ID and path.
    
    Args:
        file: The uploaded file
        
    Returns:
        Tuple of (dataset_id, file_path)
    """
    dataset_id = str(uuid.uuid4())[:8]
    
    # Determine file extension
    original_filename = file.filename or "unknown"
    extension = Path(original_filename).suffix.lower()
    
    if extension not in ['.csv', '.xlsx', '.xls']:
        raise ValueError(f"Unsupported file format: {extension}. Use CSV or Excel files.")
    
    # Save file with unique name
    filename = f"{dataset_id}{extension}"
    file_path = get_upload_dir() / filename
    
    # Write file asynchronously
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    return dataset_id, file_path


def load_dataframe(file_path: Path) -> pd.DataFrame:
    """
    Load a dataframe from a file.
    
    Args:
        file_path: Path to the file
        
    Returns:
        Pandas DataFrame
    """
    extension = file_path.suffix.lower()
    
    if extension == '.csv':
        # Try multiple encodings for CSV files
        encodings = ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
        for encoding in encodings:
            try:
                df = pd.read_csv(file_path, encoding=encoding)
                return df
            except UnicodeDecodeError:
                continue
        # If all fail, try with error handling
        df = pd.read_csv(file_path, encoding='utf-8', errors='replace')
    elif extension in ['.xlsx', '.xls']:
        df = pd.read_excel(file_path)
    else:
        raise ValueError(f"Unsupported file format: {extension}")
    
    return df


def get_column_types(df: pd.DataFrame) -> dict[str, str]:
    """Get human-readable column types."""
    type_mapping = {
        'int64': 'integer',
        'int32': 'integer',
        'float64': 'decimal',
        'float32': 'decimal',
        'object': 'text',
        'bool': 'boolean',
        'datetime64[ns]': 'datetime',
        'category': 'category',
    }
    
    return {
        col: type_mapping.get(str(dtype), str(dtype))
        for col, dtype in df.dtypes.items()
    }


def register_dataset(
    dataset_id: str,
    file_path: Path,
    original_filename: str,
    df: pd.DataFrame
) -> dict:
    """
    Register a dataset in the store.
    
    Args:
        dataset_id: Unique dataset ID
        file_path: Path to the saved file
        original_filename: Original uploaded filename
        df: The loaded DataFrame
        
    Returns:
        Dataset info dictionary
    """
    info = {
        'id': dataset_id,
        'filename': file_path.name,
        'original_filename': original_filename,
        'file_path': str(file_path),
        'rows': len(df),
        'columns': len(df.columns),
        'column_names': df.columns.tolist(),
        'column_types': get_column_types(df),
        'file_size': file_path.stat().st_size,
        'uploaded_at': datetime.now(),
    }
    
    _datasets_store[dataset_id] = info
    _dataframes_cache[dataset_id] = df
    
    return info


def get_dataset_info(dataset_id: str) -> Optional[dict]:
    """Get dataset info by ID."""
    return _datasets_store.get(dataset_id)


def get_all_datasets() -> list[dict]:
    """Get all registered datasets."""
    return list(_datasets_store.values())


def get_dataframe(dataset_id: str) -> Optional[pd.DataFrame]:
    """
    Get a DataFrame by dataset ID.
    Loads from disk if not in cache.
    """
    if dataset_id in _dataframes_cache:
        return _dataframes_cache[dataset_id]
    
    info = _datasets_store.get(dataset_id)
    if info:
        file_path = Path(info['file_path'])
        if file_path.exists():
            df = load_dataframe(file_path)
            _dataframes_cache[dataset_id] = df
            return df
    
    return None


def update_dataframe(dataset_id: str, df: pd.DataFrame) -> bool:
    """
    Update a dataset's DataFrame and save to disk.
    
    Args:
        dataset_id: Dataset ID
        df: Updated DataFrame
        
    Returns:
        True if successful
    """
    info = _datasets_store.get(dataset_id)
    if not info:
        return False
    
    file_path = Path(info['file_path'])
    
    # Save based on file type
    if file_path.suffix == '.csv':
        df.to_csv(file_path, index=False)
    else:
        df.to_excel(file_path, index=False)
    
    # Update cache and info
    _dataframes_cache[dataset_id] = df
    info['rows'] = len(df)
    info['columns'] = len(df.columns)
    info['column_names'] = df.columns.tolist()
    info['column_types'] = get_column_types(df)
    
    return True


def delete_dataset(dataset_id: str) -> bool:
    """
    Delete a dataset and its file.
    
    Args:
        dataset_id: Dataset ID to delete
        
    Returns:
        True if successful
    """
    info = _datasets_store.get(dataset_id)
    if not info:
        return False
    
    # Delete file
    file_path = Path(info['file_path'])
    if file_path.exists():
        file_path.unlink()
    
    # Remove from stores
    del _datasets_store[dataset_id]
    if dataset_id in _dataframes_cache:
        del _dataframes_cache[dataset_id]
    
    return True
