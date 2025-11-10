import streamlit as st
import pandas as pd
import os
import google.generativeai as genai
from dotenv import load_dotenv

# --- Security: Define a list of forbidden keywords ---
# This is a basic security measure to prevent dangerous code execution.
FORBIDDEN_KEYWORDS = [
    'import', 'os', 'sys', 'subprocess', 'eval', 'exec',
    'open', 'read', 'write', 'socket', 'requests', '__'
]

# --- Page Configuration ---
st.set_page_config(
    page_title="AI Data Query Assistant",
    page_icon="📊",
    layout="wide"
)

# --- Functions ---

@st.cache_data # Caches the data loading to improve performance
def load_data(uploaded_file):
    """Loads data from the uploaded Excel file."""
    try:
        df = pd.read_excel(uploaded_file)
        # Attempt to convert date-like columns to datetime objects
        for col in df.columns:
            if df[col].dtype == 'object':
                try:
                    df[col] = pd.to_datetime(df[col], errors='coerce')
                except Exception:
                    pass
        return df
    except Exception as e:
        st.error(f"Error loading data: {e}")
        return None

def get_llm_response(df_head, user_query):
    """Constructs a prompt and gets a code response from the LLM."""
    # Load API key from .env file
    load_dotenv()
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        st.error("Google API key not found. Please set it in the .env file.")
        return None
    
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-pro')

    prompt = f"""
    You are an expert Python programmer specializing in Pandas.
    You are given a pandas DataFrame named `df`.
    The DataFrame has these columns: {', '.join(df.columns)}.

    Here are the first 5 rows of the data:
    {df_head.to_string()}

    Your task is to write a single, executable line of Python code to answer the user's question.
    - The code must operate on the DataFrame `df`.
    - The code must not contain any of the following keywords: {', '.join(FORBIDDEN_KEYWORDS)}.
    - The final output of the code should be the data that answers the question.
    - Return ONLY the Python code, without any explanation, comments, or markdown.

    User's question: "{user_query}"
    """
    try:
        response = model.generate_content(prompt)
        code = response.text.strip().replace("```python", "").replace("```", "").strip()
        return code
    except Exception as e:
        st.error(f"An error occurred with the AI model: {e}")
        return None

def is_code_safe(code):
    """Checks if the generated code contains any forbidden keywords."""
    for keyword in FORBIDDEN_KEYWORDS:
        if keyword in code:
            return False, f"Execution blocked: Code contains forbidden keyword ('{keyword}')."
    return True, ""

def execute_code(code, df):
    """Safely executes the generated code."""
    is_safe, message = is_code_safe(code)
    if not is_safe:
        st.error(message)
        return None

    try:
        # Create a local scope for execution with only the DataFrame 'df' available
        local_scope = {'df': df, 'pd': pd}
        # The exec function will run the code and we can extract the result
        exec(f"result = {code}", {}, local_scope)
        return local_scope.get('result')
    except Exception as e:
        st.error(f"Error executing code: {e}")
        return None

# --- Main Application UI ---
st.title("📊 AI Data Query Assistant")
st.write("Upload your Excel sales data and ask questions in plain English!")

uploaded_file = st.file_uploader("Choose an Excel file", type="xlsx")

if uploaded_file is not None:
    df = load_data(uploaded_file)
    if df is not None:
        st.success("File uploaded and data loaded successfully!")
        st.write("### Data Preview")
        st.dataframe(df.head())

        query = st.text_input("Ask a question about your data:", placeholder="e.g., Show me all sales from January")

        if st.button("Get Answer"):
            if query:
                with st.spinner("AI is thinking..."):
                    generated_code = get_llm_response(df.head(), query)
                    if generated_code:
                        st.write("### 🤖 Generated Code")
                        st.code(generated_code, language="python")
                        
                        result = execute_code(generated_code, df)
                        
                        if result is not None:
                            st.write("### ✅ Answer")
                            st.dataframe(result)
            else:
                st.warning("Please enter a question.")
else:
    st.info("Please upload an Excel file to get started.")