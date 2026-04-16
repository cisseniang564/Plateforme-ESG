# backend/app/api/v1/endpoints/benchmarks.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.services.sector_benchmark_service import SectorBenchmarkService
from app.db.session import get_db

router = APIRouter(prefix="/benchmarking", tags=["Benchmarking"])

@router.get("/sector/{sector}")
async def get_sector_benchmarks(
    sector: str,
    year: Optional[int] = Query(None, ge=2020, le=2030),
    db: AsyncSession = Depends(get_db)
):
    """Récupère les benchmarks ESG pour un secteur"""
    service = SectorBenchmarkService(db)
    benchmarks = await service.get_sector_benchmarks(sector, year)

    if not benchmarks:
        raise HTTPException(
            status_code=404,
            detail=f"Aucun benchmark trouvé pour le secteur {sector}"
        )

    return benchmarks

@router.get("/company/{company_id}/position")
async def get_company_position(
    company_id: str,
    sector: str = Query(..., description="Secteur d'activité"),
    db: AsyncSession = Depends(get_db)
):
    """Détermine la position d'une entreprise dans son secteur"""
    service = SectorBenchmarkService(db)
    position = await service.get_company_position(company_id, sector)

    if not position:
        raise HTTPException(
            status_code=404,
            detail="Impossible de déterminer la position de l'entreprise"
        )

    return position