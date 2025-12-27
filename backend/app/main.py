from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.routers import upload_router, query_router, data_router, charts_router, models_router

# Create FastAPI application
app = FastAPI(
    title="AI Data Query System",
    description="Natural language query system for data analysis with Gemini AI",
    version="1.0.0",
)

# Get settings
settings = get_settings()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(upload_router)
app.include_router(query_router)
app.include_router(data_router)
app.include_router(charts_router)
app.include_router(models_router)


# Load existing datasets on startup
@app.on_event("startup")
async def startup_event():
    """Load existing datasets from uploads directory on startup."""
    from app.utils.file_handler import load_existing_datasets
    load_existing_datasets()


@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "name": "AI Data Query System",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "endpoints": {
            "upload": "/api/upload",
            "datasets": "/api/datasets",
            "query": "/api/query",
            "data": "/api/data",
            "charts": "/api/charts",
            "models": "/api/models"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
