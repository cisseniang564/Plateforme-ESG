"""
ESG Scores API endpoints.
"""
from uuid import UUID
from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.middleware.auth_middleware import get_current_user_id
from app.models.user import User
from app.models.esg_score import ESGScore
from app.services.score_calculation_service import ScoreCalculationService

router = APIRouter()


@router.post("/calculate")
async def calculate_score(
    calculation_date: Optional[str] = Query(None, description="Date for score calculation (YYYY-MM-DD). Defaults to today."),
    organization_id: Optional[UUID] = Query(None),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Calculate ESG score for a specific date."""
    
    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if calculation_date:
        try:
            calc_date = datetime.strptime(calculation_date, '%Y-%m-%d').date()
        except:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    else:
        calc_date = date.today()
    
    service = ScoreCalculationService(db)
    score = await service.calculate_score(
        tenant_id=user.tenant_id,
        calculation_date=calc_date,
        organization_id=organization_id,
    )
    
    return {
        "id": str(score.id),
        "calculation_date": score.calculation_date.isoformat(),
        "overall_score": round(score.overall_score, 2),
        "environmental_score": round(score.environmental_score, 2),
        "social_score": round(score.social_score, 2),
        "governance_score": round(score.governance_score, 2),
        "grade": score.grade,
        "best_pillar": score.best_pillar,
    "worst_pillar": score.worst_pillar,
        "data_points_count": score.data_points_count,
        "calculated_at": score.calculated_at.isoformat() if score.calculated_at else None,
    }


@router.get("/latest")
async def get_latest_score(
    organization_id: Optional[UUID] = Query(None),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get the most recent ESG score."""
    
    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    query = select(ESGScore).where(ESGScore.tenant_id == user.tenant_id)
    
    if organization_id:
        query = query.where(ESGScore.organization_id == organization_id)
    else:
        query = query.where(ESGScore.organization_id.is_(None))
    
    query = query.order_by(ESGScore.calculation_date.desc()).limit(1)
    
    result = await db.execute(query)
    score = result.scalar_one_or_none()
    
    if not score:
        service = ScoreCalculationService(db)
        score = await service.calculate_score(
            tenant_id=user.tenant_id,
            calculation_date=date.today(),
            organization_id=organization_id,
        )
    
    return {
        "id": str(score.id),
        "calculation_date": score.calculation_date.isoformat(),
        "overall_score": round(score.overall_score, 2),
        "environmental_score": round(score.environmental_score, 2),
        "social_score": round(score.social_score, 2),
        "governance_score": round(score.governance_score, 2),
        "grade": score.grade,
        "best_pillar": score.best_pillar,
        "worst_pillar": score.worst_pillar
    }


@router.get("/history")
async def get_score_history(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    organization_id: Optional[UUID] = Query(None),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get historical ESG scores."""
    
    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    start = None
    end = None
    
    if start_date:
        try:
            start = datetime.strptime(start_date, '%Y-%m-%d').date()
        except:
            raise HTTPException(status_code=400, detail="Invalid start_date format. Use YYYY-MM-DD")
    
    if end_date:
        try:
            end = datetime.strptime(end_date, '%Y-%m-%d').date()
        except:
            raise HTTPException(status_code=400, detail="Invalid end_date format. Use YYYY-MM-DD")
    
    if not start:
        start = date.today() - timedelta(days=180)
    
    service = ScoreCalculationService(db)
    scores = await service.get_score_history(
        tenant_id=user.tenant_id,
        organization_id=organization_id,
        start_date=start,
        end_date=end,
    )
    
    return {
        "scores": [{
            "id": str(s.id),
            "calculation_date": s.calculation_date.isoformat(),
            "overall_score": round(s.overall_score, 2),
            "environmental_score": round(s.environmental_score, 2),
            "social_score": round(s.social_score, 2),
            "governance_score": round(s.governance_score, 2),
            "grade": s.grade,
        } for s in scores],
        "count": len(scores),
    }


@router.get("/compare-organizations")
async def compare_organizations(
    calculation_date: Optional[str] = Query(None, description="Date for comparison (YYYY-MM-DD). Defaults to today."),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Compare scores across all organizations."""
    
    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if calculation_date:
        try:
            calc_date = datetime.strptime(calculation_date, '%Y-%m-%d').date()
        except:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    else:
        calc_date = date.today()
    
    service = ScoreCalculationService(db)
    comparison = await service.compare_organizations(
        tenant_id=user.tenant_id,
        calculation_date=calc_date,
    )
    
    return {
        "comparison_date": calc_date.isoformat(),
        "organizations": comparison,
        "count": len(comparison),
    }


@router.get("/alerts")
async def get_performance_alerts(
    organization_id: Optional[UUID] = Query(None),
    threshold: float = Query(5.0, ge=0, le=100, description="Alert threshold percentage"),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get performance drop alerts."""
    
    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    service = ScoreCalculationService(db)
    alerts = await service.detect_performance_alerts(
        tenant_id=user.tenant_id,
        organization_id=organization_id,
        threshold_percentage=threshold,
    )
    
    return {
        "alerts": alerts,
        "count": len(alerts),
        "threshold": threshold,
    }


@router.get("/trends")
async def get_score_trends(
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get score trends and evolution."""
    
    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    query = select(ESGScore).where(
        ESGScore.tenant_id == user.tenant_id,
        ESGScore.organization_id.is_(None)
    ).order_by(ESGScore.calculation_date.desc()).limit(2)
    
    result = await db.execute(query)
    scores = list(result.scalars().all())
    
    if len(scores) < 2:
        return {
            "current_score": scores[0].overall_score if scores else 0,
            "trend": 0,
            "change": 0,
            "message": "Not enough data to calculate trend"
        }
    
    current = scores[0]
    previous = scores[1]
    
    change = current.overall_score - previous.overall_score
    trend_percentage = (change / previous.overall_score * 100) if previous.overall_score > 0 else 0
    
    return {
        "current_score": round(current.overall_score, 2),
        "previous_score": round(previous.overall_score, 2),
        "change": round(change, 2),
        "trend_percentage": round(trend_percentage, 2),
        "trend_direction": "up" if change > 0 else "down" if change < 0 else "stable",
        "pillars": {
            "environmental": {
                "current": round(current.environmental_score, 2),
                "change": round(current.environmental_score - previous.environmental_score, 2),
            },
            "social": {
                "current": round(current.social_score, 2),
                "change": round(current.social_score - previous.social_score, 2),
            },
            "governance": {
                "current": round(current.governance_score, 2),
                "change": round(current.governance_score - previous.governance_score, 2),
            },
        },
    }
