from groq import Groq
import google.generativeai as genai
from typing import Optional
import json
from app.config import get_settings


# Available models configuration
AVAILABLE_MODELS = {
    "groq-llama-3.3-70b": {
        "provider": "groq",
        "model_id": "llama-3.3-70b-versatile",
        "name": "Groq Llama 3.3 70B",
        "description": "Fast inference with Llama 3.3 70B on Groq"
    },
    "gemini-2.0-flash": {
        "provider": "gemini",
        "model_id": "models/gemini-2.5-flash",
        "name": "Gemini 2.5 Flash",
        "description": "Google's latest Gemini 2.5 Flash model"
    }
}

DEFAULT_MODEL = "groq-llama-3.3-70b"


class LLMService:
    """Service for interacting with multiple LLM providers (Groq and Gemini)."""
    
    def __init__(self):
        settings = get_settings()
        
        # Initialize Groq client
        self.groq_client = None
        if settings.groq_api_key:
            self.groq_client = Groq(api_key=settings.groq_api_key)
        
        # Initialize Gemini
        self.gemini_model = None
        if settings.gemini_api_key:
            genai.configure(api_key=settings.gemini_api_key)
            self.gemini_model = genai.GenerativeModel("models/gemini-2.5-flash")
    
    def _get_model_config(self, model_key: str) -> dict:
        """Get model configuration, falling back to default if invalid."""
        if model_key not in AVAILABLE_MODELS:
            model_key = DEFAULT_MODEL
        return AVAILABLE_MODELS[model_key]
    
    async def _call_groq(self, prompt: str, temperature: float = 0.1, max_tokens: int = 1024) -> str:
        """Call Groq API."""
        if not self.groq_client:
            raise ValueError("Groq API key not configured")
        
        response = self.groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            max_tokens=max_tokens
        )
        return response.choices[0].message.content.strip()
    
    async def _call_gemini(self, prompt: str, temperature: float = 0.1, max_tokens: int = 1024) -> str:
        """Call Gemini API."""
        if not self.gemini_model:
            raise ValueError("Gemini API key not configured")
        
        generation_config = genai.GenerationConfig(
            temperature=temperature,
            max_output_tokens=max_tokens
        )
        response = self.gemini_model.generate_content(prompt, generation_config=generation_config)
        return response.text.strip()
    
    async def _call_llm(self, prompt: str, model_key: str = DEFAULT_MODEL, temperature: float = 0.1, max_tokens: int = 1024) -> str:
        """Call the appropriate LLM based on model selection."""
        config = self._get_model_config(model_key)
        
        if config["provider"] == "groq":
            return await self._call_groq(prompt, temperature, max_tokens)
        elif config["provider"] == "gemini":
            return await self._call_gemini(prompt, temperature, max_tokens)
        else:
            raise ValueError(f"Unknown provider: {config['provider']}")
    
    def _parse_json_response(self, text: str) -> dict:
        """Parse JSON from LLM response, handling markdown code blocks."""
        # Clean the response text
        if text.startswith('```json'):
            text = text[7:]
        if text.startswith('```'):
            text = text[3:]
        if text.endswith('```'):
            text = text[:-3]
        
        return json.loads(text.strip())
    
    async def generate_pandas_code(
        self,
        query: str,
        column_info: dict,
        sample_data: list[dict],
        model: str = DEFAULT_MODEL,
        use_pro: bool = False
    ) -> dict:
        """
        Generate Pandas code from a natural language query.
        """
        prompt = f"""You are a data analysis assistant. Generate Python Pandas code to answer the user's query.

DATASET INFORMATION:
- Columns: {column_info}
- Sample Data (first 3 rows): {sample_data[:3]}

USER QUERY: {query}

CRITICAL INSTRUCTIONS:
1. The DataFrame is already loaded as `df`
2. Store the final result in a variable called `result`
3. The result MUST be ONE of: DataFrame, Series, or a single value
4. Do NOT include imports or print statements
5. For multi-part questions, focus on the LIST or TABLE part (not counts)
6. If user asks "how many X AND list them", prioritize the list

EXAMPLES:
- "how many artists and list all" → result = df['artist'].unique()
- "count of X and show top 10" → result = df['X'].value_counts().head(10)
- "list all unique categories" → result = df['category'].unique()

IMPORTANT: Never create a DataFrame by mixing arrays of different lengths!

Respond in this exact JSON format:
{{
    "code": "your pandas code here",
    "explanation": "brief explanation of what the code does",
    "result_type": "table|value|text"
}}

Only output the JSON, nothing else."""

        try:
            text = await self._call_llm(prompt, model, temperature=0.1, max_tokens=1024)
            return self._parse_json_response(text)
        except json.JSONDecodeError:
            return {
                "code": "",
                "explanation": "Failed to parse response",
                "result_type": "error",
                "error": text if 'text' in dir() else "Unknown error"
            }
        except Exception as e:
            return {
                "code": "",
                "explanation": f"API error: {str(e)}",
                "result_type": "error",
                "error": str(e)
            }
    
    async def generate_data_modification_code(
        self,
        command: str,
        column_info: dict,
        sample_data: list[dict],
        model: str = DEFAULT_MODEL
    ) -> dict:
        """
        Generate Pandas code to modify the dataset.
        """
        prompt = f"""You are a data manipulation assistant. Generate Python Pandas code to modify the dataset based on the user's command.

DATASET INFORMATION:
- Columns and types: {column_info}
- Sample Data (first 3 rows): {sample_data[:3]}

USER COMMAND: {command}

INSTRUCTIONS:
1. The DataFrame is already loaded as `df`
2. Modify `df` in-place or reassign it
3. The final modified DataFrame MUST be stored in `df`
4. You can use pandas (pd) and numpy (np)
5. Handle any data type conversions carefully

COMMON OPERATIONS EXAMPLES:
- Add column: df['new_col'] = df['col1'] * df['col2']
- Delete column: df = df.drop(columns=['col_name'])
- Delete rows: df = df[df['col'] > 0]  # keep rows where col > 0
- Rename column: df = df.rename(columns={{'old': 'new'}})
- Fill nulls: df['col'] = df['col'].fillna(0)
- Replace values: df['col'] = df['col'].replace('old_val', 'new_val')
- Change dtype: df['col'] = df['col'].astype(float)
- Sort: df = df.sort_values('col', ascending=False)
- Add row: df = pd.concat([df, pd.DataFrame([{{'col1': val1, 'col2': val2}}])], ignore_index=True)
- Update cells: df.loc[df['col'] == 'value', 'target_col'] = 'new_value'

Respond in this exact JSON format:
{{
    "code": "your pandas code here",
    "explanation": "brief explanation of what changes will be made",
    "changes_description": "human-readable description of changes"
}}

Only output the JSON, nothing else."""

        try:
            text = await self._call_llm(prompt, model, temperature=0.1, max_tokens=1024)
            return self._parse_json_response(text)
        except json.JSONDecodeError:
            return {
                "code": "",
                "explanation": "Failed to parse response",
                "changes_description": "",
                "error": text if 'text' in dir() else "Unknown error"
            }
        except Exception as e:
            return {
                "code": "",
                "explanation": f"API error: {str(e)}",
                "changes_description": "",
                "error": str(e)
            }
    
    async def generate_chart_config(
        self,
        query: str,
        column_info: dict,
        sample_data: list[dict],
        model: str = DEFAULT_MODEL
    ) -> dict:
        """
        Generate chart configuration from natural language request.
        """
        prompt = f"""You are a data visualization expert. Generate pandas code to prepare data for a chart based on the user's request.

DATASET INFORMATION:
- Columns and types: {column_info}
- Sample Data (first 5 rows): {sample_data[:5]}

USER REQUEST: {query}

AVAILABLE CHART TYPES: bar, line, pie, scatter, area

CRITICAL INSTRUCTIONS:
1. Write pandas code that computes EXACTLY what the user asks for
2. For complex queries like "most popular, least popular, middle", you must SELECT/FILTER to those specific rows
3. The DataFrame is already loaded as `df`
4. Store the FINAL result in a variable called `result` - this should be a DataFrame with the data to chart
5. The result DataFrame should have a column for labels (x-axis) and a column for values (y-axis)
6. Do NOT use imports, matplotlib, or print statements
7. For "top N" or "bottom N", use .head() or .tail() after sorting
8. For "most and least", concatenate those specific rows

EXAMPLES:
- "top 5 by sales" → result = df.nlargest(5, 'sales')[['name', 'sales']]
- "most and least popular" → most = df.nlargest(1, 'popularity'); least = df.nsmallest(1, 'popularity'); result = pd.concat([most, least])[['name', 'popularity']]
- "distribution by category" → result = df.groupby('category').size().reset_index(name='count')

Respond in this exact JSON format:
{{
    "chart_type": "bar|line|pie|scatter|area",
    "title": "Descriptive chart title",
    "pandas_code": "your pandas code here - MUST store result in 'result' variable",
    "x_column": "column name for labels/x-axis in the result DataFrame",
    "y_column": "column name for values/y-axis in the result DataFrame",
    "explanation": "brief explanation of the visualization"
}}

Only output valid JSON, nothing else."""

        try:
            text = await self._call_llm(prompt, model, temperature=0.1, max_tokens=1500)
            return self._parse_json_response(text)
        except json.JSONDecodeError:
            return {
                "error": "Failed to parse response",
                "raw_response": text if 'text' in dir() else "Unknown"
            }
        except Exception as e:
            return {
                "error": f"API error: {str(e)}"
            }
    
    async def analyze_data(
        self,
        column_info: dict,
        statistics: dict,
        sample_data: list[dict],
        model: str = DEFAULT_MODEL
    ) -> str:
        """
        Generate a natural language analysis of the dataset.
        """
        prompt = f"""Analyze this dataset and provide insights.

DATASET INFORMATION:
- Columns: {column_info}
- Statistics: {statistics}
- Sample Data: {sample_data[:5]}

Provide a brief, insightful analysis covering:
1. Data overview (structure, types)
2. Key observations
3. Potential data quality issues
4. Suggested analyses or visualizations

Keep the response concise and actionable."""

        try:
            return await self._call_llm(prompt, model, temperature=0.3, max_tokens=1024)
        except Exception as e:
            return f"Error analyzing data: {str(e)}"


# Singleton instance
_llm_service: Optional[LLMService] = None


def get_llm_service() -> LLMService:
    """Get or create the LLM service singleton."""
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service


# Alias for backward compatibility
def get_gemini_service() -> LLMService:
    """Alias for get_llm_service for backward compatibility."""
    return get_llm_service()


def get_available_models() -> list[dict]:
    """Return list of available models."""
    return [
        {
            "id": model_id,
            "name": config["name"],
            "description": config["description"],
            "provider": config["provider"]
        }
        for model_id, config in AVAILABLE_MODELS.items()
    ]
