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
from app.models.organization import Organization
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
    
    pillars = {"environmental": score.environmental_score, "social": score.social_score, "governance": score.governance_score}
    return {
        "id": str(score.id),
        "calculation_date": score.calculation_date.isoformat(),
        "overall_score": round(score.overall_score, 2),
        "environmental_score": round(score.environmental_score, 2),
        "social_score": round(score.social_score, 2),
        "governance_score": round(score.governance_score, 2),
        "grade": score.rating,
        "best_pillar": max(pillars, key=pillars.get),
        "worst_pillar": min(pillars, key=pillars.get),
        "data_points_count": None,
        "calculated_at": score.created_at.isoformat() if score.created_at else None,
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
    
    # Resolve organization_id — required (NOT NULL in DB)
    if not organization_id:
        org_result = await db.execute(
            select(Organization).where(Organization.tenant_id == user.tenant_id).limit(1)
        )
        org = org_result.scalar_one_or_none()
        if org:
            organization_id = org.id

    query = select(ESGScore).where(ESGScore.tenant_id == user.tenant_id)
    if organization_id:
        query = query.where(ESGScore.organization_id == organization_id)
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
        "grade": score.rating,
        "best_pillar": max({"environmental": score.environmental_score, "social": score.social_score, "governance": score.governance_score}, key=lambda k: {"environmental": score.environmental_score, "social": score.social_score, "governance": score.governance_score}[k]),
        "worst_pillar": min({"environmental": score.environmental_score, "social": score.social_score, "governance": score.governance_score}, key=lambda k: {"environmental": score.environmental_score, "social": score.social_score, "governance": score.governance_score}[k]),
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
            "grade": s.rating,
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
    
    # Get the 2 most recent distinct calculation dates for this tenant
    # then average scores across all orgs per date for a tenant-level trend
    from sqlalchemy import func as sqlfunc, distinct
    dates_result = await db.execute(
        select(distinct(ESGScore.calculation_date))
        .where(ESGScore.tenant_id == user.tenant_id)
        .order_by(ESGScore.calculation_date.desc())
        .limit(2)
    )
    dates = [row[0] for row in dates_result.all()]

    if len(dates) < 2:
        # Only one date available — return current average with no trend
        if dates:
            avg_result = await db.execute(
                select(
                    sqlfunc.avg(ESGScore.overall_score),
                    sqlfunc.avg(ESGScore.environmental_score),
                    sqlfunc.avg(ESGScore.social_score),
                    sqlfunc.avg(ESGScore.governance_score),
                ).where(
                    ESGScore.tenant_id == user.tenant_id,
                    ESGScore.calculation_date == dates[0],
                )
            )
            row = avg_result.first()
            return {
                "current_score": round(row[0] or 0, 2),
                "trend": 0,
                "change": 0,
                "message": "Not enough history to calculate trend",
            }
        return {"current_score": 0, "trend": 0, "change": 0, "message": "No scores available"}

    # Average per date
    async def _avg_for_date(d):
        r = await db.execute(
            select(
                sqlfunc.avg(ESGScore.overall_score),
                sqlfunc.avg(ESGScore.environmental_score),
                sqlfunc.avg(ESGScore.social_score),
                sqlfunc.avg(ESGScore.governance_score),
            ).where(ESGScore.tenant_id == user.tenant_id, ESGScore.calculation_date == d)
        )
        return r.first()

    cur_row = await _avg_for_date(dates[0])
    prev_row = await _avg_for_date(dates[1])

    cur_overall  = round(cur_row[0]  or 0, 2)
    prev_overall = round(prev_row[0] or 0, 2)
    change = round(cur_overall - prev_overall, 2)
    trend_pct = round((change / prev_overall * 100) if prev_overall > 0 else 0, 2)

    return {
        "current_score":    cur_overall,
        "previous_score":   prev_overall,
        "change":           change,
        "trend_percentage": trend_pct,
        "trend_direction":  "up" if change > 0 else "down" if change < 0 else "stable",
        "pillars": {
            "environmental": {
                "current": round(cur_row[1]  or 0, 2),
                "change":  round((cur_row[1] or 0) - (prev_row[1] or 0), 2),
            },
            "social": {
                "current": round(cur_row[2]  or 0, 2),
                "change":  round((cur_row[2] or 0) - (prev_row[2] or 0), 2),
            },
            "governance": {
                "current": round(cur_row[3]  or 0, 2),
                "change":  round((cur_row[3] or 0) - (prev_row[3] or 0), 2),
            },
        },
    }
