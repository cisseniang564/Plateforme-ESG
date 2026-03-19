"""
Analytics API - Intelligence and anomaly detection
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.services.analytics_service import AnalyticsService

router = APIRouter()


@router.get("/anomalies")
async def detect_anomalies(
    year: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Detect anomalies in ESG data"""
    service = AnalyticsService(db)
    anomalies = await service.detect_anomalies(current_user.tenant_id, year)
    return {'anomalies': anomalies, 'count': len(anomalies)}


@router.get("/insights")
async def get_insights(
    year: int = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get intelligent insights"""
    service = AnalyticsService(db)
    insights = await service.get_insights(current_user.tenant_id, year)
    return insights


@router.get("/suggestions")
async def get_suggestions(
    year: int = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get AI-powered suggestions"""
    service = AnalyticsService(db)
    suggestions = await service.get_suggestions(current_user.tenant_id, year)
    return {'suggestions': suggestions, 'count': len(suggestions)}


@router.get("/predictions")
async def get_predictions(
    horizon: int = Query(12, ge=3, le=36, description="Forecast horizon in months"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Predict ESG metric trends using linear regression extrapolation."""
    service = AnalyticsService(db)
    predictions = await service.get_predictions(current_user.tenant_id, horizon)
    return predictions
