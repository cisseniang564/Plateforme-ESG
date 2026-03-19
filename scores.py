from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app import schemas
from app.api import deps
from app.models import ESGScore
from app.db.session import get_db

router = APIRouter()

@router.get("/", response_model=List[schemas.ESGScore])
async def get_scores(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: Any = Depends(deps.get_current_user)
):
    """Récupère la liste des scores ESG"""
    result = await db.execute(
        select(ESGScore)
        .where(ESGScore.tenant_id == current_user.tenant_id)
        .offset(skip)
        .limit(limit)
        .order_by(ESGScore.calculation_date.desc())
    )
    scores = result.scalars().all()
    return scores

@router.get("/{score_id}", response_model=schemas.ESGScore)
async def get_score(
    score_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(deps.get_current_user)
):
    """Récupère un score ESG par son ID"""
    result = await db.execute(
        select(ESGScore)
        .where(
            ESGScore.id == score_id,
            ESGScore.tenant_id == current_user.tenant_id
        )
    )
    score = result.scalar_one_or_none()
    if not score:
        raise HTTPException(status_code=404, detail="Score not found")
    return score

@router.get("/organization/{organization_id}", response_model=List[schemas.ESGScore])
async def get_organization_scores(
    organization_id: str,
    db: AsyncSession = Depends(get_db),
    limit: int = 12,
    current_user: Any = Depends(deps.get_current_user)
):
    """Récupère l'historique des scores d'une organisation"""
    result = await db.execute(
        select(ESGScore)
        .where(
            ESGScore.organization_id == organization_id,
            ESGScore.tenant_id == current_user.tenant_id
        )
        .order_by(ESGScore.calculation_date.desc())
        .limit(limit)
    )
    scores = result.scalars().all()
    return scores

@router.get("/{score_id}/details", response_model=schemas.ESGScoreDetail)
async def get_score_details(
    score_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(deps.get_current_user)
):
    """Récupère les détails d'un score ESG"""
    result = await db.execute(
        select(ESGScore)
        .where(
            ESGScore.id == score_id,
            ESGScore.tenant_id == current_user.tenant_id
        )
    )
    score = result.scalar_one_or_none()
    if not score:
        raise HTTPException(status_code=404, detail="Score not found")
    
    return {
        "id": score.id,
        "organization_id": score.organization_id,
        "calculation_date": score.calculation_date,
        "overall_score": score.overall_score,
        "environmental_score": score.environmental_score,
        "social_score": score.social_score,
        "governance_score": score.governance_score,
        "rating": score.rating,
        "data_completeness": score.data_completeness,
        "confidence_level": score.confidence_level,
        "percentile_rank": score.percentile_rank,
        "sector_median": score.sector_median,
        "best_pillar": score.best_pillar if hasattr(score, 'best_pillar') else None,
        "worst_pillar": score.worst_pillar if hasattr(score, 'worst_pillar') else None,
        "indicator_contributions": score.indicator_contributions,
        "created_at": score.created_at,
        "updated_at": score.updated_at
    }
