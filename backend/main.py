from contextlib import asynccontextmanager

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from app.api import admin, public, submit
from app.config import get_settings


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Migrations manage schema; no create_all in production.
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Kognis", version="0.1.0", lifespan=lifespan)

    if settings.allowed_origins.strip():
        origins = [o.strip() for o in settings.allowed_origins.split(",") if o.strip()]
        app.add_middleware(
            CORSMiddleware,
            allow_origins=origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    v1 = "/api/v1"
    app.include_router(admin.router, prefix=f"{v1}/admin")
    app.include_router(public.router, prefix=v1)
    app.include_router(submit.router, prefix=v1)

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok", "llm": settings.llm_provider.value}

    return app


app = create_app()
