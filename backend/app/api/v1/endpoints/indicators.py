"""
Indicators API - Compatible with existing frontend
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, extract, text
from typing import List, Optional
from datetime import date
from uuid import UUID
from pydantic import BaseModel

from app.dependencies import get_db, get_optional_current_user, get_current_user
from app.models.user import User
from app.models.data_entry import DataEntry

router = APIRouter()

# ============= SCHEMAS =============

class IndicatorBase(BaseModel):
    code: str
    name: str
    pillar: str
    category: Optional[str] = None
    unit: str
    data_type: str
    description: Optional[str] = None
    framework: Optional[str] = None
    target_value: Optional[float] = None

class IndicatorResponse(IndicatorBase):
    id: str
    is_active: bool
    is_mandatory: bool
    
    class Config:
        from_attributes = True

class IndicatorWithStats(IndicatorResponse):
    data_count: int
    latest_value: Optional[float] = None
    latest_date: Optional[str] = None

class DataPoint(BaseModel):
    date: str
    value: float
    unit: str
    source: Optional[str] = None

# ============= ENDPOINTS =============

@router.get("/", response_model=List[IndicatorResponse])
async def list_indicators(
    pillar: Optional[str] = None,
    is_active: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """List all indicators - Auth optional for backward compatibility"""
    
    # Si pas d'auth, utiliser le tenant par défaut
    if current_user:
        tenant_id = str(current_user.tenant_id)
    else:
        # Utiliser le tenant Demo Company par défaut
        tenant_id = '00000000-0000-0000-0000-000000000001'
    
    sql = """
        SELECT id, code, name, pillar, category, unit, data_type, 
               description, framework, target_value, is_active, is_mandatory
        FROM indicators
        WHERE tenant_id = :tenant_id
          AND is_active = :is_active
    """
    
    params = {
        "tenant_id": tenant_id,
        "is_active": is_active
    }
    
    if pillar:
        sql += " AND pillar = :pillar"
        params["pillar"] = pillar
    
    sql += " ORDER BY pillar, code"
    
    result = await db.execute(text(sql), params)
    rows = result.fetchall()
    
    return [
        IndicatorResponse(
            id=str(row.id),
            code=row.code,
            name=row.name,
            pillar=row.pillar,
            category=row.category,
            unit=row.unit,
            data_type=row.data_type,
            description=row.description,
            framework=row.framework,
            target_value=float(row.target_value) if row.target_value else None,
            is_active=row.is_active,
            is_mandatory=row.is_mandatory
        )
        for row in rows
    ]

@router.get("/{indicator_id}", response_model=IndicatorResponse)
async def get_indicator(
    indicator_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Get single indicator"""
    
    if current_user:
        tenant_id = str(current_user.tenant_id)
    else:
        tenant_id = '00000000-0000-0000-0000-000000000001'
    
    sql = """
        SELECT id, code, name, pillar, category, unit, data_type, 
               description, framework, target_value, is_active, is_mandatory
        FROM indicators
        WHERE id = :indicator_id AND tenant_id = :tenant_id
    """
    
    result = await db.execute(
        text(sql),
        {"indicator_id": str(indicator_id), "tenant_id": tenant_id}
    )
    row = result.fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="Indicator not found")
    
    return IndicatorResponse(
        id=str(row.id),
        code=row.code,
        name=row.name,
        pillar=row.pillar,
        category=row.category,
        unit=row.unit,
        data_type=row.data_type,
        description=row.description,
        framework=row.framework,
        target_value=float(row.target_value) if row.target_value else None,
        is_active=row.is_active,
        is_mandatory=row.is_mandatory
    )

@router.get("/{indicator_id}/data", response_model=List[DataPoint])
async def get_indicator_data(
    indicator_id: UUID,
    year: Optional[int] = None,
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all data points for an indicator"""
    
    query = select(
        DataEntry.period_start,
        DataEntry.value_numeric,
        DataEntry.unit,
        DataEntry.data_source
    ).where(
        DataEntry.indicator_id == indicator_id,
        DataEntry.tenant_id == current_user.tenant_id
    )
    
    if year:
        query = query.where(extract('year', DataEntry.period_start) == year)
    
    query = query.order_by(DataEntry.period_start.desc()).limit(limit)
    
    result = await db.execute(query)
    return [
        DataPoint(
            date=row.period_start.isoformat(),
            value=float(row.value_numeric),
            unit=row.unit or '',
            source=row.data_source
        )
        for row in result
        if row.value_numeric is not None
    ]

@router.get("/{indicator_id}/stats")
async def get_indicator_stats(
    indicator_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get statistics for an indicator"""
    
    sql = """
        SELECT 
            COUNT(*) as data_count,
            MAX(value_numeric) as max_value,
            MIN(value_numeric) as min_value,
            AVG(value_numeric) as avg_value,
            MAX(period_start) as latest_date,
            (SELECT value_numeric FROM data_entries 
             WHERE indicator_id = :indicator_id 
               AND tenant_id = :tenant_id
             ORDER BY period_start DESC LIMIT 1) as latest_value
        FROM data_entries
        WHERE indicator_id = :indicator_id
          AND tenant_id = :tenant_id
          AND value_numeric IS NOT NULL
    """
    
    result = await db.execute(
        text(sql),
        {
            "indicator_id": str(indicator_id),
            "tenant_id": str(current_user.tenant_id)
        }
    )
    row = result.fetchone()
    
    if not row or row.data_count == 0:
        return {
            "data_count": 0,
            "latest_value": None,
            "latest_date": None,
            "avg_value": None,
            "min_value": None,
            "max_value": None
        }
    
    return {
        "data_count": row.data_count,
        "latest_value": float(row.latest_value) if row.latest_value else None,
        "latest_date": row.latest_date.isoformat() if row.latest_date else None,
        "avg_value": float(row.avg_value) if row.avg_value else None,
        "min_value": float(row.min_value) if row.min_value else None,
        "max_value": float(row.max_value) if row.max_value else None
    }
