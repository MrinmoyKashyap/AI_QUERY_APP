import time
import pandas as pd
from typing import Any
from app.services.gemini_service import get_gemini_service
from app.utils.file_handler import get_dataframe, get_dataset_info


class QueryEngine:
    """Engine for processing natural language queries on datasets."""
    
    def __init__(self):
        self._gemini = None
    
    @property
    def gemini(self):
        """Lazy initialization of Gemini service."""
        if self._gemini is None:
            self._gemini = get_gemini_service()
        return self._gemini
    
    async def process_query(
        self,
        dataset_id: str,
        query: str,
        model: str = None
    ) -> dict:
        """
        Process a natural language query on a dataset.
        
        Args:
            dataset_id: The dataset to query
            query: Natural language query
            
        Returns:
            Query result dictionary
        """
        start_time = time.time()
        
        # Get dataset
        df = get_dataframe(dataset_id)
        if df is None:
            return {
                "result_type": "error",
                "data": None,
                "explanation": f"Dataset {dataset_id} not found",
                "pandas_code": None,
                "execution_time_ms": 0
            }
        
        info = get_dataset_info(dataset_id)
        
        # Get column info and sample data
        column_info = info['column_types']
        sample_data = df.head(5).to_dict('records')
        
        # Check for simple queries that don't need LLM
        simple_result = self._handle_simple_query(query, df)
        if simple_result:
            simple_result['execution_time_ms'] = (time.time() - start_time) * 1000
            return simple_result
        
        # Use Gemini to generate code
        llm_response = await self.gemini.generate_pandas_code(
            query=query,
            column_info=column_info,
            sample_data=sample_data,
            model=model
        )
        
        if 'error' in llm_response:
            return {
                "result_type": "error",
                "data": None,
                "explanation": llm_response.get('explanation', 'Failed to process query'),
                "pandas_code": None,
                "execution_time_ms": (time.time() - start_time) * 1000
            }
        
        # Execute the generated code
        code = llm_response.get('code', '')
        result = self._execute_code(df, code)
        
        execution_time = (time.time() - start_time) * 1000
        
        if result['success']:
            return {
                "result_type": llm_response.get('result_type', 'table'),
                "data": result['data'],
                "explanation": llm_response.get('explanation', ''),
                "pandas_code": code,
                "execution_time_ms": execution_time
            }
        else:
            return {
                "result_type": "error",
                "data": None,
                "explanation": f"Error executing query: {result['error']}",
                "pandas_code": code,
                "execution_time_ms": execution_time
            }
    
    def _handle_simple_query(self, query: str, df: pd.DataFrame) -> dict | None:
        """Handle simple queries without LLM."""
        query_lower = query.lower().strip()
        
        # Show first/head rows
        if any(phrase in query_lower for phrase in ['show first', 'first rows', 'head', 'show me the data', 'preview']):
            # Extract number if specified
            import re
            match = re.search(r'(\d+)', query)
            n = int(match.group(1)) if match else 10
            n = min(n, 100)  # Limit to 100 rows
            
            return {
                "result_type": "table",
                "data": df.head(n).to_dict('records'),
                "explanation": f"Showing first {n} rows of the dataset",
                "pandas_code": f"df.head({n})"
            }
        
        # Show last/tail rows
        if any(phrase in query_lower for phrase in ['show last', 'last rows', 'tail']):
            import re
            match = re.search(r'(\d+)', query)
            n = int(match.group(1)) if match else 10
            n = min(n, 100)
            
            return {
                "result_type": "table",
                "data": df.tail(n).to_dict('records'),
                "explanation": f"Showing last {n} rows of the dataset",
                "pandas_code": f"df.tail({n})"
            }
        
        # Show all columns
        if any(phrase in query_lower for phrase in ['columns', 'column names', 'what columns', 'list columns']):
            return {
                "result_type": "table",
                "data": [{"column": col, "type": str(dtype)} for col, dtype in df.dtypes.items()],
                "explanation": "List of all columns and their data types",
                "pandas_code": "df.dtypes"
            }
        
        # Dataset shape/size
        if any(phrase in query_lower for phrase in ['how many rows', 'how many columns', 'shape', 'size', 'dimensions']):
            return {
                "result_type": "value",
                "data": {"rows": len(df), "columns": len(df.columns)},
                "explanation": f"The dataset has {len(df)} rows and {len(df.columns)} columns",
                "pandas_code": "df.shape"
            }
        
        # Basic statistics
        if any(phrase in query_lower for phrase in ['describe', 'statistics', 'summary', 'stats']):
            stats = df.describe(include='all').to_dict()
            return {
                "result_type": "table",
                "data": df.describe(include='all').T.reset_index().rename(columns={'index': 'column'}).to_dict('records'),
                "explanation": "Statistical summary of the dataset",
                "pandas_code": "df.describe(include='all')"
            }
        
        return None
    
    def _execute_code(self, df: pd.DataFrame, code: str) -> dict:
        """
        Safely execute generated Pandas code.
        
        Args:
            df: The DataFrame to operate on
            code: Python code to execute
            
        Returns:
            Dictionary with 'success', 'data', and optionally 'error'
        """
        try:
            # Create a restricted execution environment with safe builtins
            safe_builtins = {
                'len': len,
                'range': range,
                'str': str,
                'int': int,
                'float': float,
                'list': list,
                'dict': dict,
                'tuple': tuple,
                'set': set,
                'min': min,
                'max': max,
                'sum': sum,
                'sorted': sorted,
                'reversed': reversed,
                'enumerate': enumerate,
                'zip': zip,
                'map': map,
                'filter': filter,
                'abs': abs,
                'round': round,
                'any': any,
                'all': all,
                'bool': bool,
                'type': type,
                'isinstance': isinstance,
                'print': print,  # For debugging
            }
            
            local_vars = {'df': df.copy(), 'pd': pd}
            
            # Execute the code
            exec(code, {"__builtins__": safe_builtins}, local_vars)
            
            # Get the result
            result = local_vars.get('result', None)
            
            if result is None:
                return {
                    "success": False,
                    "error": "No 'result' variable found in generated code"
                }
            
            # Convert result to serializable format
            import numpy as np
            
            if isinstance(result, pd.DataFrame):
                data = result.head(1000).to_dict('records')  # Limit rows
            elif isinstance(result, pd.Series):
                # Convert Series to list of records
                data = [{"index": str(k), "value": v} for k, v in result.head(1000).items()]
            elif isinstance(result, np.ndarray):
                # Convert numpy array to list of records
                items = result.tolist()[:1000]  # Limit to 1000
                data = [{"value": str(item)} for item in items]
            elif isinstance(result, (list, tuple)):
                # Convert list to records
                items = list(result)[:1000]
                data = [{"value": str(item)} for item in items]
            elif isinstance(result, (int, float, str, bool, np.integer, np.floating)):
                # Handle both Python scalars and numpy scalars
                if isinstance(result, (np.integer, np.floating)):
                    data = result.item()  # Convert numpy scalar to Python scalar
                else:
                    data = result
            elif hasattr(result, 'tolist'):
                # Handle other array-like objects
                items = result.tolist()[:1000]
                data = [{"value": str(item)} for item in items]
            else:
                data = str(result)
            
            return {
                "success": True,
                "data": data
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }


# Singleton instance
_query_engine = None


def get_query_engine() -> QueryEngine:
    """Get or create the query engine singleton."""
    global _query_engine
    if _query_engine is None:
        _query_engine = QueryEngine()
    return _query_engine
