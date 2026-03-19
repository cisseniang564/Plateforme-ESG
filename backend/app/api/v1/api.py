"""
API Router - Include all endpoint routers.
"""
from fastapi import APIRouter

from app.api.v1.endpoints import indicators
from app.api.v1.org_dashboard import router as org_dashboard_router

api_router = APIRouter()

api_router.include_router(indicators.router, prefix="/indicators", tags=["indicators"])
api_router.include_router(org_dashboard_router)

# Materiality & Risks
from app.api.v1.endpoints import materiality
api_router.include_router(materiality.router, prefix="/materiality", tags=["materiality"])
