"""
Calculations API - Automatic ESG calculations
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from uuid import UUID

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.services.calculation_service import CalculationService

router = APIRouter()


@router.get("/metrics")
async def calculate_metrics(
    year: Optional[int] = Query(None),
    organization_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Calculate all automatic metrics"""
    
    service = CalculationService(db)
    
    results = await service.calculate_metrics(
        tenant_id=current_user.tenant_id,
        organization_id=organization_id,
        year=year,
    )
    
    return results


@router.get("/evolution/{metric_name}")
async def calculate_evolution(
    metric_name: str,
    current_year: int,
    previous_year: int,
    organization_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Calculate year-over-year evolution"""
    
    service = CalculationService(db)
    
    evolution = await service.calculate_evolution(
        tenant_id=current_user.tenant_id,
        metric_name=metric_name,
        current_year=current_year,
        previous_year=previous_year,
        organization_id=organization_id,
    )
    
    return evolution


@router.get("/kpis-summary")
async def get_kpis_summary(
    year: int = Query(...),
    organization_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get summary of calculated KPIs"""
    
    service = CalculationService(db)
    
    summary = await service.get_kpis_summary(
        tenant_id=current_user.tenant_id,
        year=year,
        organization_id=organization_id,
    )
    
    return summary


@router.get("/formulas")
async def get_available_formulas():
    """Get list of available calculation formulas"""
    
    formulas = {}
    for name, definition in CalculationService.FORMULAS.items():
        formulas[name] = {
            'inputs': definition['inputs'],
            'unit': definition['unit'],
            'category': definition['category'],
            'pillar': definition['pillar'],
        }
    
    return formulas
