"""
Benchmarking API endpoints.

Exposes cross-tenant sector benchmarks with k-anonymity protection, plus a
fallback to public reference baselines (CDP/MSCI/ADEME) when the cohort is
too small for safe aggregation.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.db.session import get_db
from app.dependencies import require_feature
from app.services.sector_benchmark_service import (
    SectorBenchmarkService,
    list_available_sectors,
)


router = APIRouter(prefix="/benchmarks", tags=["Benchmarking"])


@router.get("/sectors")
async def list_sectors(
    _gate: None = Depends(require_feature("benchmark")),
):
    """List all sectors with available benchmarks (real or reference)."""
    return {"sectors": list_available_sectors()}


@router.get("/sector/{sector}")
async def get_sector_benchmarks(
    sector: str,
    year: Optional[int] = Query(None, ge=2020, le=2030),
    db: AsyncSession = Depends(get_db),
    _gate: None = Depends(require_feature("benchmark")),
):
    """ESG benchmarks for a sector.

    Returns per-pillar quartiles (overall + E + S + G), plus reference
    indicators (carbon intensity, gender pay gap, etc.). The ``source``
    field tells the UI whether the response is real cross-tenant data
    (``cross_tenant``) or a public reference baseline (``public_reference``).
    """
    service = SectorBenchmarkService(db)
    benchmarks = await service.get_sector_benchmarks(sector, year)

    if not benchmarks:
        raise HTTPException(
            status_code=404,
            detail=f"Aucun benchmark trouvé pour le secteur {sector}",
        )

    return benchmarks


@router.get("/company/{company_id}/position")
async def get_company_position(
    company_id: str,
    sector: str = Query(..., description="Secteur d'activité"),
    year: Optional[int] = Query(None, ge=2020, le=2030),
    db: AsyncSession = Depends(get_db),
    _gate: None = Depends(require_feature("benchmark")),
):
    """Position of an organization within its sector benchmarks."""
    service = SectorBenchmarkService(db)
    position = await service.get_company_position(company_id, sector, year)

    if not position:
        raise HTTPException(
            status_code=404,
            detail="Impossible de déterminer la position de l'entreprise",
        )

    return position
