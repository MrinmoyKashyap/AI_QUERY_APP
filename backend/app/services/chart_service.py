import pandas as pd
from typing import Any
from app.services.gemini_service import get_gemini_service
from app.utils.file_handler import get_dataframe, get_dataset_info


class ChartService:
    """Service for generating chart data."""
    
    CHART_TYPES = ['bar', 'line', 'pie', 'scatter', 'area']
    
    def __init__(self):
        self.gemini = get_gemini_service()
    
    async def generate_chart(
        self,
        dataset_id: str,
        query: str,
        model: str = None
    ) -> dict:
        """
        Generate chart data from natural language request.
        
        Args:
            dataset_id: Dataset to visualize
            query: Natural language chart request
            
        Returns:
            Chart configuration and data
        """
        df = get_dataframe(dataset_id)
        if df is None:
            return {
                "success": False,
                "error": f"Dataset {dataset_id} not found"
            }
        
        info = get_dataset_info(dataset_id)
        column_info = info['column_types']
        sample_data = df.head(5).to_dict('records')
        
        # Get chart config from Gemini
        llm_response = await self.gemini.generate_chart_config(
            query=query,
            column_info=column_info,
            sample_data=sample_data,
            model=model
        )
        
        if 'error' in llm_response and not llm_response.get('chart_type'):
            return {
                "success": False,
                "error": llm_response.get('error', 'Failed to generate chart configuration')
            }
        
        # Prepare chart data
        try:
            chart_type = llm_response.get('chart_type', 'bar')
            pandas_code = llm_response.get('pandas_code', '')
            x_col = llm_response.get('x_column')
            y_col = llm_response.get('y_column')
            
            chart_df = None
            
            # Try to execute the pandas code first
            if pandas_code:
                try:
                    # Allowed builtins for safe execution
                    safe_builtins = {
                        'len': len,
                        'range': range,
                        'str': str,
                        'int': int,
                        'float': float,
                        'list': list,
                        'dict': dict,
                        'min': min,
                        'max': max,
                        'sum': sum,
                        'sorted': sorted,
                        'abs': abs,
                        'round': round,
                    }
                    
                    local_vars = {'df': df.copy(), 'pd': pd}
                    exec(pandas_code, {"__builtins__": safe_builtins}, local_vars)
                    
                    # Get result from execution
                    chart_df = local_vars.get('result')
                    
                    if chart_df is None:
                        # Fallback to chart_data if result not found
                        chart_df = local_vars.get('chart_data', local_vars.get('data'))
                    
                except Exception as code_error:
                    print(f"Pandas code execution failed: {code_error}")
                    print(f"Code was: {pandas_code}")
                    # Will fall through to fallback below
            
            # Fallback: use column-based approach if no result
            if chart_df is None or (isinstance(chart_df, pd.DataFrame) and len(chart_df) == 0):
                # For pie charts, prefer text columns with few unique values for labels
                if chart_type == 'pie':
                    x_col = self._find_best_category_column(df, x_col)
                    y_col = self._find_best_numeric_column(df, y_col)
                else:
                    # Validate columns exist
                    if x_col and x_col not in df.columns:
                        x_col = self._find_similar_column(df, x_col)
                    if y_col and y_col not in df.columns and y_col != 'count':
                        y_col = self._find_similar_column(df, y_col)
                
                chart_df = self._prepare_chart_data(df, x_col, y_col, 'count', None)
            
            # Convert to records for frontend (replace NaN with None for JSON compatibility)
            if isinstance(chart_df, pd.DataFrame):
                chart_df = chart_df.fillna(0)  # Replace NaN with 0 for charts
                data = chart_df.head(100).to_dict('records')
            elif isinstance(chart_df, pd.Series):
                chart_df = chart_df.fillna(0)
                data = chart_df.reset_index().head(100).to_dict('records')
            else:
                data = []
            
            return {
                "success": True,
                "config": {
                    "chart_type": chart_type,
                    "title": llm_response.get('title', 'Chart'),
                    "x_axis": x_col,
                    "y_axis": y_col,
                    "x_label": x_col,
                    "y_label": y_col
                },
                "data": data,
                "explanation": llm_response.get('explanation', '')
            }
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return {
                "success": False,
                "error": f"Error preparing chart data: {str(e)}"
            }
    
    def _find_similar_column(self, df: pd.DataFrame, col_name: str) -> str:
        """Find a column with similar name (case-insensitive partial match)."""
        if not col_name:
            return df.columns[0] if len(df.columns) > 0 else None
        
        col_lower = col_name.lower()
        
        # Exact match (case insensitive)
        for col in df.columns:
            if col.lower() == col_lower:
                return col
        
        # Partial match
        for col in df.columns:
            if col_lower in col.lower() or col.lower() in col_lower:
                return col
        
        # Default to first column
        return df.columns[0] if len(df.columns) > 0 else None
    
    def _find_best_category_column(self, df: pd.DataFrame, preferred: str = None) -> str:
        """Find the best category column for pie chart labels (text with few unique values)."""
        # Try preferred column first
        if preferred and preferred in df.columns:
            return preferred
        
        best_col = None
        best_score = -1
        
        for col in df.columns:
            # Skip numeric-looking columns and ID-like columns
            unique_count = df[col].nunique()
            
            # Skip if too many unique values (> 20) or too few (1)
            if unique_count > 20 or unique_count < 2:
                continue
            
            # Prefer object/string columns
            if df[col].dtype == 'object':
                # Check if values look like IDs (long alphanumeric strings)
                sample_val = str(df[col].dropna().iloc[0]) if len(df[col].dropna()) > 0 else ""
                if len(sample_val) > 20 and sample_val.isalnum():
                    continue  # Skip ID-like columns
                
                score = 100 - unique_count  # Fewer unique values = better
                if score > best_score:
                    best_score = score
                    best_col = col
        
        # If no good category column found, use first object column
        if not best_col:
            for col in df.columns:
                if df[col].dtype == 'object':
                    return col
        
        return best_col or df.columns[0]
    
    def _find_best_numeric_column(self, df: pd.DataFrame, preferred: str = None) -> str:
        """Find the best numeric column for pie chart values."""
        # Try preferred column first
        if preferred and preferred in df.columns:
            if df[preferred].dtype in ['int64', 'float64', 'int32', 'float32']:
                return preferred
        
        # Find first numeric column
        for col in df.columns:
            if df[col].dtype in ['int64', 'float64', 'int32', 'float32']:
                return col
        
        # Default to count
        return 'count'
    
    def _prepare_chart_data(
        self,
        df: pd.DataFrame,
        x_col: str,
        y_col: str,
        aggregation: str,
        group_by: str = None
    ) -> pd.DataFrame:
        """Prepare data for charting based on configuration."""
        
        if not x_col or x_col not in df.columns:
            # Default to first column
            x_col = df.columns[0]
        
        if y_col == 'count' or aggregation == 'count':
            # Count occurrences
            result = df[x_col].value_counts().reset_index()
            result.columns = [x_col, 'count']
            return result
        
        if not y_col or y_col not in df.columns:
            # Default to counting
            result = df[x_col].value_counts().reset_index()
            result.columns = [x_col, 'count']
            return result
        
        if aggregation == 'none':
            return df[[x_col, y_col]].dropna()
        
        # Apply aggregation
        agg_funcs = {
            'sum': 'sum',
            'mean': 'mean',
            'max': 'max',
            'min': 'min',
            'count': 'count'
        }
        
        agg_func = agg_funcs.get(aggregation, 'sum')
        result = df.groupby(x_col)[y_col].agg(agg_func).reset_index()
        
        return result
    
    def get_available_chart_types(self) -> list[dict]:
        """Get list of available chart types with descriptions."""
        return [
            {"type": "bar", "name": "Bar Chart", "description": "Compare categories"},
            {"type": "line", "name": "Line Chart", "description": "Show trends over time"},
            {"type": "pie", "name": "Pie Chart", "description": "Show proportions"},
            {"type": "scatter", "name": "Scatter Plot", "description": "Show relationships"},
            {"type": "area", "name": "Area Chart", "description": "Show cumulative values"}
        ]
    
    def generate_quick_chart(
        self,
        dataset_id: str,
        chart_type: str,
        x_column: str,
        y_column: str = None,
        aggregation: str = 'none'
    ) -> dict:
        """
        Generate a chart with explicit configuration (no LLM).
        
        Args:
            dataset_id: Dataset ID
            chart_type: Type of chart
            x_column: Column for x-axis
            y_column: Column for y-axis
            aggregation: Aggregation function
            
        Returns:
            Chart data
        """
        df = get_dataframe(dataset_id)
        if df is None:
            return {
                "success": False,
                "error": f"Dataset {dataset_id} not found"
            }
        
        if chart_type not in self.CHART_TYPES:
            return {
                "success": False,
                "error": f"Invalid chart type. Available: {self.CHART_TYPES}"
            }
        
        try:
            chart_df = self._prepare_chart_data(df, x_column, y_column, aggregation)
            
            return {
                "success": True,
                "config": {
                    "chart_type": chart_type,
                    "title": f"{y_column or 'Count'} by {x_column}",
                    "x_axis": x_column,
                    "y_axis": y_column or 'count',
                    "x_label": x_column,
                    "y_label": y_column or 'Count'
                },
                "data": chart_df.head(100).to_dict('records'),
                "explanation": f"Chart showing {y_column or 'count'} by {x_column}"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }


# Singleton instance
_chart_service = None


def get_chart_service() -> ChartService:
    """Get or create the chart service singleton."""
    global _chart_service
    if _chart_service is None:
        _chart_service = ChartService()
    return _chart_service
