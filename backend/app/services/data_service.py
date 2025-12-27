import pandas as pd
from typing import Any
from app.services.gemini_service import get_gemini_service
from app.utils.file_handler import get_dataframe, get_dataset_info, update_dataframe


class DataService:
    """Service for data manipulation operations."""
    
    def __init__(self):
        self.gemini = get_gemini_service()
    
    async def modify_data(
        self,
        dataset_id: str,
        command: str,
        model: str = None
    ) -> dict:
        """
        Modify dataset using natural language command.
        
        Args:
            dataset_id: Dataset to modify
            command: Natural language modification command
            
        Returns:
            Result dictionary
        """
        df = get_dataframe(dataset_id)
        if df is None:
            return {
                "success": False,
                "message": f"Dataset {dataset_id} not found",
                "changes_made": "",
                "rows_affected": 0,
                "pandas_code": None
            }
        
        info = get_dataset_info(dataset_id)
        column_info = info['column_types']
        sample_data = df.head(5).to_dict('records')
        
        # Get modification code from Gemini
        llm_response = await self.gemini.generate_data_modification_code(
            command=command,
            column_info=column_info,
            sample_data=sample_data,
            model=model
        )
        
        if 'error' in llm_response and not llm_response.get('code'):
            return {
                "success": False,
                "message": llm_response.get('explanation', 'Failed to process command'),
                "changes_made": "",
                "rows_affected": 0,
                "pandas_code": None
            }
        
        code = llm_response.get('code', '')
        
        # Execute the modification
        try:
            import numpy as np
            original_len = len(df)
            
            # Create a safe execution environment
            safe_builtins = {
                'len': len, 'range': range, 'str': str, 'int': int,
                'float': float, 'list': list, 'dict': dict, 'tuple': tuple,
                'set': set, 'min': min, 'max': max, 'sum': sum,
                'sorted': sorted, 'reversed': reversed, 'enumerate': enumerate,
                'zip': zip, 'map': map, 'filter': filter, 'abs': abs,
                'round': round, 'any': any, 'all': all, 'bool': bool,
                'type': type, 'isinstance': isinstance, 'print': print,
            }
            
            local_vars = {'df': df.copy(), 'pd': pd, 'np': np}
            
            exec(code, {"__builtins__": safe_builtins}, local_vars)
            
            modified_df = local_vars.get('df')
            if modified_df is None:
                return {
                    "success": False,
                    "message": "Modification did not produce a valid DataFrame",
                    "changes_made": "",
                    "rows_affected": 0,
                    "pandas_code": code
                }
            
            # Calculate rows affected
            new_len = len(modified_df)
            if new_len != original_len:
                rows_affected = abs(new_len - original_len)
            else:
                # Compare DataFrames to count changes
                rows_affected = (~df.eq(modified_df).all(axis=1)).sum() if len(df) == len(modified_df) else new_len
            
            # Save the modified DataFrame
            update_dataframe(dataset_id, modified_df)
            
            return {
                "success": True,
                "message": "Data modified successfully",
                "changes_made": llm_response.get('changes_description', ''),
                "rows_affected": int(rows_affected),
                "pandas_code": code
            }
            
        except Exception as e:
            return {
                "success": False,
                "message": f"Error executing modification: {str(e)}",
                "changes_made": "",
                "rows_affected": 0,
                "pandas_code": code
            }
    
    def update_cell(
        self,
        dataset_id: str,
        row_index: int,
        column_name: str,
        new_value: Any
    ) -> dict:
        """
        Update a specific cell in the dataset.
        
        Args:
            dataset_id: Dataset to modify
            row_index: Row index
            column_name: Column name
            new_value: New value for the cell
            
        Returns:
            Result dictionary
        """
        df = get_dataframe(dataset_id)
        if df is None:
            return {
                "success": False,
                "message": f"Dataset {dataset_id} not found"
            }
        
        if column_name not in df.columns:
            return {
                "success": False,
                "message": f"Column '{column_name}' not found"
            }
        
        if row_index < 0 or row_index >= len(df):
            return {
                "success": False,
                "message": f"Row index {row_index} out of range"
            }
        
        try:
            old_value = df.at[row_index, column_name]
            df.at[row_index, column_name] = new_value
            update_dataframe(dataset_id, df)
            
            return {
                "success": True,
                "message": f"Updated cell at row {row_index}, column '{column_name}'",
                "old_value": str(old_value),
                "new_value": str(new_value)
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Error updating cell: {str(e)}"
            }
    
    def get_paginated_data(
        self,
        dataset_id: str,
        page: int = 1,
        page_size: int = 50
    ) -> dict:
        """
        Get paginated data from a dataset.
        
        Args:
            dataset_id: Dataset ID
            page: Page number (1-indexed)
            page_size: Number of rows per page
            
        Returns:
            Paginated data dictionary
        """
        df = get_dataframe(dataset_id)
        if df is None:
            return {
                "success": False,
                "message": f"Dataset {dataset_id} not found",
                "data": [],
                "total_rows": 0,
                "total_pages": 0,
                "current_page": page
            }
        
        total_rows = len(df)
        total_pages = (total_rows + page_size - 1) // page_size
        
        # Ensure page is valid
        page = max(1, min(page, total_pages)) if total_pages > 0 else 1
        
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        
        page_data = df.iloc[start_idx:end_idx].to_dict('records')
        
        return {
            "success": True,
            "data": page_data,
            "total_rows": total_rows,
            "total_pages": total_pages,
            "current_page": page,
            "page_size": page_size
        }


# Singleton instance
_data_service = None


def get_data_service() -> DataService:
    """Get or create the data service singleton."""
    global _data_service
    if _data_service is None:
        _data_service = DataService()
    return _data_service
