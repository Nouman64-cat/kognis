from enum import StrEnum
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class LLMProvider(StrEnum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/kognis"

    # Small pool for ~1GB RAM hosts
    db_pool_size: int = 5
    db_max_overflow: int = 0

    llm_provider: LLMProvider = LLMProvider.OPENAI
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"
    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-3-5-haiku-20241022"

    # Split large exams into multiple LLM calls (each batch ≤ this many questions).
    mcq_max_questions_per_batch: int = Field(default=20, ge=1, le=100)

    admin_api_key: str | None = None

    # JWT for admin login (set a long random string in production)
    jwt_secret: str | None = None
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 10080  # 7 days

    # Comma-separated origins, e.g. http://localhost:3000,https://app.example.com
    allowed_origins: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
