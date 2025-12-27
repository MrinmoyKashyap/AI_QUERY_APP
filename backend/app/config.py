import os
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # LLM API Keys
    gemini_api_key: str = ""
    groq_api_key: str = ""
    
    # Application
    app_env: str = "development"
    debug: bool = True
    
    # File Upload
    max_file_size_mb: int = 100
    upload_dir: str = "uploads"
    
    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


def get_settings() -> Settings:
    """Get settings instance (reloads each time for development)."""
    return Settings()
