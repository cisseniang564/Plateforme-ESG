"""
Bridge endpoint - Indicateurs par entreprise (format stable).
"""
from uuid import UUID
from typing import Optional
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel

from app.db.session import get_db
from app.middleware.auth_middleware import get_current_user_id
from app.models.user import User
from app.models.indicator import Indicator
from app.models.indicator_data import IndicatorData
from app.models.organization import Organization

router = APIRouter()


class KPIResponse(BaseModel):
    code: str
    label: str
    value: float
    unit: str
    pillar: str
    source: str
    last_updated_at: str


class CompanyIndicatorsResponse(BaseModel):
    company_id: str
    company_name: str
    year: Optional[int]
    kpis: list[KPIResponse]
    data_completeness: float
    total_indicators: int


@router.get("/companies/{company_id}/indicators")
async def get_company_indicators(
    company_id: UUID,
    year: Optional[int] = Query(None, description="Filter by year"),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> CompanyIndicatorsResponse:
    """
    Bridge endpoint : retourne tous les indicateurs d'une entreprise.
    Format stable et prévisible pour le frontend.
    """
    
    # Get user tenant
    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get organization
    org_query = select(Organization).where(
        and_(
            Organization.id == company_id,
            Organization.tenant_id == user.tenant_id
        )
    )
    org_result = await db.execute(org_query)
    organization = org_result.scalar_one_or_none()
    
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Build query for indicator data
    query = (
        select(IndicatorData, Indicator)
        .join(Indicator, IndicatorData.indicator_id == Indicator.id)
        .where(
            and_(
                IndicatorData.tenant_id == user.tenant_id,
                IndicatorData.organization_id == company_id
            )
        )
    )
    
    # Filter by year if provided
    if year:
        query = query.where(
            and_(
                IndicatorData.date >= date(year, 1, 1),
                IndicatorData.date <= date(year, 12, 31)
            )
        )
    
    # Execute
    result = await db.execute(query)
    rows = list(result.all())
    
    # Group by indicator (take latest value)
    indicators_map: dict[str, tuple[IndicatorData, Indicator]] = {}
    
    for data, indicator in rows:
        code = indicator.code
        if code not in indicators_map or data.date > indicators_map[code][0].date:
            indicators_map[code] = (data, indicator)
    
    # Format KPIs
    kpis = []
    for data, indicator in indicators_map.values():
        kpis.append(
            KPIResponse(
                code=indicator.code,
                label=indicator.name,
                value=float(data.value),
                unit=data.unit or indicator.unit,
                pillar=indicator.pillar.value if hasattr(indicator.pillar, 'value') else str(indicator.pillar),
                source=data.source or "manual",
                last_updated_at=data.updated_at.isoformat() if data.updated_at else datetime.utcnow().isoformat()
            )
        )
    
    # Calculate completeness
    total_indicators_query = select(Indicator).where(
        and_(
            Indicator.tenant_id == user.tenant_id,
            Indicator.is_active == True
        )
    )
    total_result = await db.execute(total_indicators_query)
    total_active_indicators = len(list(total_result.scalars().all()))
    
    completeness = (len(kpis) / total_active_indicators * 100) if total_active_indicators > 0 else 0.0
    
    return CompanyIndicatorsResponse(
        company_id=str(company_id),
        company_name=organization.name,
        year=year,
        kpis=kpis,
        data_completeness=round(completeness, 2),
        total_indicators=total_active_indicators
    )
