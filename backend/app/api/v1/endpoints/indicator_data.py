"""
Indicator Data API endpoints.
"""
from uuid import UUID, uuid4
from datetime import datetime, date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.db.session import get_db
from app.middleware.auth_middleware import get_current_user_id
from app.models.user import User
from app.models.indicator_data import IndicatorData
from app.models.indicator import Indicator
from app.services.indicator_data_service import IndicatorDataService

router = APIRouter()


class IndicatorDataCreate(BaseModel):
    date: date
    value: float
    notes: Optional[str] = None
    source: str = "manual"
    is_estimated: bool = False


@router.post("/indicators/{indicator_id}/data")
async def add_indicator_data(
    indicator_id: UUID,
    payload: IndicatorDataCreate,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Add a single data point for an indicator."""
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    indicator_result = await db.execute(
        select(Indicator).where(
            Indicator.id == indicator_id,
            Indicator.tenant_id == user.tenant_id
        )
    )
    indicator = indicator_result.scalar_one_or_none()
    if not indicator:
        raise HTTPException(status_code=404, detail="Indicator not found")

    entry = IndicatorData(
        id=uuid4(),
        tenant_id=user.tenant_id,
        indicator_id=indicator_id,
        date=payload.date,
        value=payload.value,
        unit=indicator.unit,
        notes=payload.notes,
        source=payload.source,
        is_verified=False,
        is_estimated=payload.is_estimated,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)

    return {
        "id": str(entry.id),
        "date": entry.date.isoformat(),
        "value": entry.value,
        "unit": entry.unit,
        "notes": entry.notes,
        "source": entry.source,
        "is_verified": entry.is_verified,
        "is_estimated": entry.is_estimated,
    }


@router.post("/uploads/{upload_id}/import")
async def import_upload_data(
    upload_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Import data from upload to indicator_data table."""
    
    # Récupérer le tenant_id
    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Importer les données
    service = IndicatorDataService(db)
    result = await service.import_from_upload(
        upload_id=upload_id,
        tenant_id=user.tenant_id,
    )
    
    return result


@router.get("/indicators/{indicator_id}/data")
async def get_indicator_data(
    indicator_id: UUID,
    organization_id: Optional[UUID] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get time-series data for an indicator."""
    
    # Récupérer le tenant_id
    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Vérifier que l'indicator existe
    indicator_query = select(Indicator).where(
        Indicator.id == indicator_id,
        Indicator.tenant_id == user.tenant_id
    )
    indicator_result = await db.execute(indicator_query)
    indicator = indicator_result.scalar_one_or_none()
    
    if not indicator:
        raise HTTPException(status_code=404, detail="Indicator not found")
    
    # Parser les dates
    start = None
    end = None
    if start_date:
        try:
            start = datetime.strptime(start_date, '%Y-%m-%d')
        except:
            raise HTTPException(status_code=400, detail="Invalid start_date format. Use YYYY-MM-DD")
    
    if end_date:
        try:
            end = datetime.strptime(end_date, '%Y-%m-%d')
        except:
            raise HTTPException(status_code=400, detail="Invalid end_date format. Use YYYY-MM-DD")
    
    # Récupérer les données
    service = IndicatorDataService(db)
    data = await service.get_indicator_timeseries(
        indicator_id=indicator_id,
        tenant_id=user.tenant_id,
        organization_id=organization_id,
        start_date=start,
        end_date=end,
    )
    
    return {
        "indicator": {
            "id": str(indicator.id),
            "code": indicator.code,
            "name": indicator.name,
            "unit": indicator.unit,
        },
        "data": [{
            "id": str(d.id),
            "date": d.date.isoformat(),
            "value": d.value,
            "unit": d.unit,
            "notes": d.notes,
            "source": d.source,
            "is_verified": d.is_verified,
            "organization_id": str(d.organization_id) if d.organization_id else None,
        } for d in data]
    }


@router.get("/indicators/{indicator_id}/stats")
async def get_indicator_stats(
    indicator_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get statistics for an indicator."""
    
    # Récupérer le tenant_id
    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Récupérer les stats
    query = select(
        func.count(IndicatorData.id).label('count'),
        func.min(IndicatorData.value).label('min'),
        func.max(IndicatorData.value).label('max'),
        func.avg(IndicatorData.value).label('avg'),
        func.min(IndicatorData.date).label('first_date'),
        func.max(IndicatorData.date).label('last_date'),
    ).where(
        IndicatorData.indicator_id == indicator_id,
        IndicatorData.tenant_id == user.tenant_id
    )
    
    result = await db.execute(query)
    stats = result.one()
    
    return {
        "count": stats.count or 0,
        "min": float(stats.min) if stats.min is not None else None,
        "max": float(stats.max) if stats.max is not None else None,
        "avg": float(stats.avg) if stats.avg is not None else None,
        "first_date": stats.first_date.isoformat() if stats.first_date else None,
        "last_date": stats.last_date.isoformat() if stats.last_date else None,
    }


@router.get("/dashboard/pillar-data")
async def get_pillar_data(
    pillar: str = Query(..., description="environmental, social, or governance"),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get aggregated data for all indicators in a pillar."""
    
    # Récupérer le tenant_id
    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Récupérer les indicators du pillar
    indicators_query = select(Indicator).where(
        Indicator.tenant_id == user.tenant_id,
        Indicator.pillar == pillar,
        Indicator.is_active == True
    )
    indicators_result = await db.execute(indicators_query)
    indicators = list(indicators_result.scalars().all())
    
    # Pour chaque indicator, récupérer les dernières valeurs
    result = []
    for indicator in indicators:
        # Dernière valeur
        data_query = select(IndicatorData).where(
            IndicatorData.indicator_id == indicator.id,
            IndicatorData.tenant_id == user.tenant_id
        ).order_by(IndicatorData.date.desc()).limit(1)
        
        data_result = await db.execute(data_query)
        latest = data_result.scalar_one_or_none()
        
        if latest:
            result.append({
                "indicator_code": indicator.code,
                "indicator_name": indicator.name,
                "unit": indicator.unit,
                "latest_value": latest.value,
                "latest_date": latest.date.isoformat(),
            })
    
    return {
        "pillar": pillar,
        "indicators": result
    }
