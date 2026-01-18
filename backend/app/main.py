"""FastAPI application entry point for MirrorCoach AI backend."""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import health_router, coaching_router

# Configure logging based on DEBUG setting
_settings = get_settings()
logging.basicConfig(
    level=logging.DEBUG if _settings.debug else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Reduce noise from websockets library
logging.getLogger("websockets").setLevel(logging.WARNING)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan context manager.

    Handles startup and shutdown events for the FastAPI application.
    """
    # Startup
    settings = get_settings()
    logger.info("Starting MirrorCoach AI Backend...")
    logger.info(f"Debug mode: {settings.debug}")
    logger.info(f"Gemini model: {settings.gemini_model}")
    logger.info(f"Gemini voice: {settings.gemini_voice}")

    if not settings.gemini_api_key:
        logger.warning("GEMINI_API_KEY not configured - coaching sessions will fail!")

    yield

    # Shutdown
    logger.info("Shutting down MirrorCoach AI Backend...")


# Create FastAPI application
app = FastAPI(
    title="MirrorCoach AI",
    description="Real-time AI communication coaching with video and audio feedback",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Configure CORS
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health_router)
app.include_router(coaching_router)


@app.get("/", tags=["Root"])
async def root() -> dict:
    """
    Root endpoint.

    Returns:
        Welcome message and API information
    """
    return {
        "service": "MirrorCoach AI",
        "version": "1.0.0",
        "description": "Real-time AI communication coaching",
        "docs": "/docs",
        "health": "/health",
        "websocket": "/ws/coaching/{skill}",
    }


if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
