# AI Data Query System

A professional AI-powered data query system where users can upload datasets, query them using natural language, generate interactive charts, and modify data through AI commands.

## Features

- 📤 **File Upload**: Support for CSV and Excel files
- 💬 **Natural Language Queries**: Ask questions about your data in plain English
- 📊 **Interactive Charts**: Generate bar, line, pie, scatter, and area charts
- ✏️ **Data Modification**: Transform your data using natural language commands
- 🎨 **Modern UI**: Beautiful dark theme with smooth animations

## Tech Stack

### Backend
- **Python 3.11+** with FastAPI
- **Pandas** for data manipulation
- **Google Gemini AI** for natural language processing

### Frontend
- **Next.js 14** with TypeScript
- **TailwindCSS** for styling
- **Recharts** for visualizations
- **Radix UI** for accessible components

## Getting Started

### Prerequisites

- Python 3.11 or higher
- Node.js 18 or higher
- Gemini API key (get one free at https://aistudio.google.com/apikey)

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   ```

3. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - Mac/Linux: `source venv/bin/activate`

4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. Create `.env` file with your Gemini API key:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

6. Start the backend server:
   ```bash
   uvicorn app.main:app --reload
   ```

   The API will be available at http://localhost:8000

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

   The app will be available at http://localhost:3000

## Usage

1. **Upload a Dataset**: Drag and drop a CSV or Excel file
2. **Query Your Data**: Ask questions like "Show me the first 10 rows" or "What is the average sales?"
3. **Generate Charts**: Request visualizations like "Create a bar chart of sales by region"
4. **Modify Data**: Use commands like "Add a new column 'total' as price * quantity"

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/upload` | POST | Upload a dataset |
| `/api/datasets` | GET | List all datasets |
| `/api/datasets/{id}` | GET | Get dataset data |
| `/api/datasets/{id}` | DELETE | Delete a dataset |
| `/api/query` | POST | Process natural language query |
| `/api/charts/generate` | POST | Generate chart from query |
| `/api/data/modify` | POST | Modify data with command |

## Project Structure

```
AI_DATA_QUERY/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app
│   │   ├── config.py        # Settings
│   │   ├── routers/         # API routes
│   │   ├── services/        # Business logic
│   │   ├── models/          # Pydantic schemas
│   │   └── utils/           # Utilities
│   ├── uploads/             # Uploaded files
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js app
│   │   ├── components/      # React components
│   │   └── lib/             # Utilities & API
│   └── package.json
│
└── README.md
```

## License

MIT License
