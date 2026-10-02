import os
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/meeting_rooms"
    ENVIRONMENT: str = "development"
    PORT: int = 8000
    FRONTEND_URL: str = ""
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,https://*.vercel.app"

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(__file__), "..", "..", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def sync_database_url(self) -> str:
        url = self.DATABASE_URL
        # SQLAlchemy 2.0 requires postgresql:// instead of postgres://
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        return url

    @property
    def parsed_cors_origins(self) -> list[str]:
        origins: list[str] = []
        if self.CORS_ORIGINS:
            origins.extend([o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()])
        if self.FRONTEND_URL:
            trimmed = self.FRONTEND_URL.strip().rstrip("/")
            if trimmed and trimmed not in origins:
                origins.append(trimmed)
        if not origins:
            return ["*"]
        return origins


@lru_cache
def get_settings() -> Settings:
    return Settings()
