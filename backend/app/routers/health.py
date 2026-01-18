"""Health check endpoints."""

import logging
from typing import Dict, Any

from fastapi import APIRouter, status
from pydantic import BaseModel

from app.config import get_settings
from app.prompts import get_available_skills

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/health", tags=["Health"])


class HealthResponse(BaseModel):
    """Health check response model."""

    status: str
    version: str = "1.0.0"
    service: str = "mirrorcoach-backend"


class ReadinessResponse(BaseModel):
    """Readiness check response model."""

    status: str
    checks: Dict[str, bool]


class ConfigResponse(BaseModel):
    """Non-sensitive configuration response."""

    gemini_model: str
    gemini_voice: str
    max_session_duration: int
    video_fps: int
    audio_chunk_ms: int
    available_skills: list[str]


@router.get(
    "",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Health check",
    description="Basic health check endpoint to verify the service is running.",
)
async def health_check() -> HealthResponse:
    """
    Basic health check endpoint.

    Returns:
        HealthResponse: Service health status
    """
    return HealthResponse(status="healthy")


@router.get(
    "/ready",
    response_model=ReadinessResponse,
    status_code=status.HTTP_200_OK,
    summary="Readiness check",
    description="Check if the service is ready to accept requests.",
)
async def readiness_check() -> ReadinessResponse:
    """
    Readiness check endpoint.

    Verifies that all required dependencies are available.

    Returns:
        ReadinessResponse: Service readiness status with individual checks
    """
    settings = get_settings()

    checks = {
        "config_loaded": True,
        "gemini_api_key_configured": bool(settings.gemini_api_key),
    }

    overall_status = "ready" if all(checks.values()) else "not_ready"

    return ReadinessResponse(status=overall_status, checks=checks)


@router.get(
    "/live",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Liveness check",
    description="Kubernetes liveness probe endpoint.",
)
async def liveness_check() -> HealthResponse:
    """
    Liveness check endpoint for Kubernetes.

    Returns:
        HealthResponse: Service liveness status
    """
    return HealthResponse(status="alive")


@router.get(
    "/config",
    response_model=ConfigResponse,
    status_code=status.HTTP_200_OK,
    summary="Get configuration",
    description="Get non-sensitive configuration values.",
)
async def get_config() -> ConfigResponse:
    """
    Get non-sensitive configuration values.

    Returns:
        ConfigResponse: Current configuration settings
    """
    settings = get_settings()

    return ConfigResponse(
        gemini_model=settings.gemini_model,
        gemini_voice=settings.gemini_voice,
        max_session_duration=settings.max_session_duration,
        video_fps=settings.video_fps,
        audio_chunk_ms=settings.audio_chunk_ms,
        available_skills=get_available_skills(),
    )
