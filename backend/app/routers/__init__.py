# Routers package
from app.routers.health import router as health_router
from app.routers.coaching import router as coaching_router

__all__ = [
    "health_router",
    "coaching_router",
]
