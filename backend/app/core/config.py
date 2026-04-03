from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    PROJECT_NAME: str = "ЗАРЯ — Система мониторинга"
    API_PREFIX: str = "/api"

    DATABASE_URL: str = "postgresql+asyncpg://zarya:zarya_pass@localhost:5432/zarya_db"
    DATABASE_URL_SYNC: str = "postgresql://zarya:zarya_pass@localhost:5432/zarya_db"

    JWT_SECRET_KEY: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    S3_ENDPOINT: str = "http://localhost:9000"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"
    S3_BUCKET: str = "zarya-images"
    S3_REGION: str = "us-east-1"

    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    DEMO_MODE: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
