"""
Scope 3 Calculator API
======================

Endpoints:
  GET  /scope3/factors           — catalogue complet des facteurs ADEME
  GET  /scope3/categories        — 15 catégories GHG Protocol structurées
  POST /scope3/calculate         — calcul à partir d'une liste de lignes
  POST /scope3/import-from-spend — import en masse depuis le FEC comptable
"""
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.services.scope3_calculator import (
    SPEND_FACTORS, ACTIVITY_FACTORS, list_categories, calculate, LineItem,
)

router = APIRouter()


# ─── Schemas ────────────────────────────────────────────────────────────────

class LineIn(BaseModel):
    factor_code: str = Field(..., description="Identifiant du facteur ADEME (cf. /factors)")
    quantity: float = Field(..., ge=0, description="Dépense en € ou activité (km/kWh/t selon le facteur)")
    label: Optional[str] = Field(default=None, description="Libellé libre (ex: fournisseur, projet)")


class CalculateRequest(BaseModel):
    lines: List[LineIn] = Field(..., min_length=1, max_length=5000)


class FactorOut(BaseModel):
    code: str
    label: str
    category_id: int
    category_name: str
    unit: str
    factor: float
    source: str
    notes: Optional[str] = None


def _factor_to_dict(f) -> Dict[str, Any]:
    return {
        "code": f.code, "label": f.label,
        "category_id": f.category_id, "category_name": f.category_name,
        "unit": f.unit, "factor": f.factor,
        "source": f.source, "notes": f.notes,
    }


# ─── Endpoints ──────────────────────────────────────────────────────────────

@router.get("/factors")
async def get_factors(
    current_user: User = Depends(get_current_user),
):
    """Return the full ADEME emission factors catalog (spend + activity)."""
    return {
        "spend_based": [_factor_to_dict(f) for f in SPEND_FACTORS],
        "activity_based": [_factor_to_dict(f) for f in ACTIVITY_FACTORS],
        "source": "ADEME Base Empreinte 2024",
        "total_factors": len(SPEND_FACTORS) + len(ACTIVITY_FACTORS),
    }


@router.get("/categories")
async def get_categories(
    current_user: User = Depends(get_current_user),
):
    """Return the 15 GHG Protocol Scope 3 categories with their factors."""
    return {
        "categories": list_categories(),
        "framework": "GHG Protocol Corporate Value Chain (Scope 3) Standard",
        "source": "ADEME Base Empreinte 2024",
    }


@router.post("/calculate")
async def calculate_scope3(
    body: CalculateRequest,
    current_user: User = Depends(get_current_user),
):
    """Compute total Scope 3 emissions from a list of input lines."""
    lines = [LineItem(factor_code=l.factor_code, quantity=l.quantity, label=l.label) for l in body.lines]
    result = calculate(lines)
    if not result["details"] and result["warnings"]:
        raise HTTPException(
            status_code=400,
            detail={"error": "Aucune ligne valide", "warnings": result["warnings"]},
        )
    return result


class ImportSpendRow(BaseModel):
    """One row coming from the company FEC / accounting export."""
    supplier_name: Optional[str] = None
    description: Optional[str] = None
    amount_eur: float = Field(..., ge=0)
    suggested_category: Optional[str] = None  # NACE/NAF code or free text
    factor_code: Optional[str] = None         # user-mapped factor; falls back to default


class ImportSpendRequest(BaseModel):
    rows: List[ImportSpendRow] = Field(..., min_length=1, max_length=10000)
    default_factor_code: str = Field(
        default="services_conseil",
        description="Facteur à utiliser pour les lignes non mappées",
    )


@router.post("/import-from-spend")
async def import_from_spend(
    body: ImportSpendRequest,
    current_user: User = Depends(get_current_user),
):
    """Bulk-compute Scope 3 emissions from an accounting export.

    Each row is mapped to a factor (user-provided if available, otherwise the
    default). Returns per-row results + aggregate.
    """
    lines: List[LineItem] = []
    for r in body.rows:
        code = r.factor_code or body.default_factor_code
        lines.append(LineItem(
            factor_code=code,
            quantity=r.amount_eur,
            label=r.supplier_name or r.description,
        ))
    result = calculate(lines)
    result["rows_processed"] = len(lines)
    return result
