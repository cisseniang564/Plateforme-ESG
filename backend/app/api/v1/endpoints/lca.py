"""
LCA (Life Cycle Assessment) API endpoints.

Workflow:
  1. GET    /lca/factors                  — list ADEME impact factors (UI selector)
  2. POST   /lca/products                  — create a product with cradle-to-grave inputs
  3. GET    /lca/products                  — list all products for tenant
  4. GET    /lca/products/{id}             — get one with cached impact
  5. PUT    /lca/products/{id}             — update inputs (re-computes cache)
  6. DELETE /lca/products/{id}
  7. POST   /lca/products/{id}/compute     — force-recompute the impact
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.lca_product import LCAProduct
from app.services.lca_service import (
    compute, result_to_dict, list_impact_factors_payload,
)


router = APIRouter()


# ───────────────────────────────────────────────────────────────────────────
# Pydantic schemas
# ───────────────────────────────────────────────────────────────────────────

class StageItemIn(BaseModel):
    factor_code: str
    quantity: float = Field(ge=0)
    unit: Optional[str] = None
    note: Optional[str] = None


class ProductIn(BaseModel):
    sku:              Optional[str] = None
    name:             str = Field(min_length=1, max_length=255)
    description:      Optional[str] = None
    category:         Optional[str] = None
    functional_unit:  str = "1 unité"
    annual_volume:    Optional[float] = None
    organization_id:  Optional[UUID] = None
    standard:         Optional[str] = None
    notes:            Optional[str] = None
    stages: dict = Field(default_factory=dict)  # {raw_material: [StageItemIn,...], ...}


class ProductPatch(BaseModel):
    sku:              Optional[str] = None
    name:             Optional[str] = None
    description:      Optional[str] = None
    category:         Optional[str] = None
    functional_unit:  Optional[str] = None
    annual_volume:    Optional[float] = None
    organization_id:  Optional[UUID] = None
    standard:         Optional[str] = None
    notes:            Optional[str] = None
    stages:           Optional[dict] = None


# ───────────────────────────────────────────────────────────────────────────
# Serializer
# ───────────────────────────────────────────────────────────────────────────

def _serialize(p: LCAProduct, include_full: bool = False) -> dict:
    out = {
        "id":               str(p.id),
        "organization_id":  str(p.organization_id) if p.organization_id else None,
        "sku":              p.sku,
        "name":             p.name,
        "description":      p.description,
        "category":         p.category,
        "functional_unit":  p.functional_unit,
        "annual_volume":    p.annual_volume,
        "standard":         p.standard,
        "reviewer_name":    p.reviewer_name,
        "reviewer_date":    p.reviewer_date.isoformat() if p.reviewer_date else None,
        "notes":            p.notes,
        "cached_total_kgco2e":      p.cached_total_kgco2e,
        "cached_computed_at":       p.cached_computed_at.isoformat() if p.cached_computed_at else None,
        "created_at":       p.created_at.isoformat() if p.created_at else None,
        "updated_at":       p.updated_at.isoformat() if p.updated_at else None,
    }
    if include_full:
        out["stages"] = p.stages or {}
        out["cached_stages_breakdown"] = p.cached_stages_breakdown
    return out


# ───────────────────────────────────────────────────────────────────────────
# Endpoints
# ───────────────────────────────────────────────────────────────────────────

@router.get("/factors")
async def get_impact_factors(
    current_user: User = Depends(get_current_user),
):
    """Return the ADEME impact-factor catalog grouped by category."""
    return list_impact_factors_payload()


@router.get("/products")
async def list_products(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all products for the current tenant (cached impact included)."""
    q = (
        select(LCAProduct)
        .where(LCAProduct.tenant_id == current_user.tenant_id)
        .order_by(desc(LCAProduct.created_at))
    )
    rows = (await db.execute(q)).scalars().all()
    return {"items": [_serialize(p) for p in rows], "count": len(rows)}


@router.post("/products", status_code=201)
async def create_product(
    body: ProductIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new LCA product and compute its impact immediately."""
    p = LCAProduct(
        tenant_id=current_user.tenant_id,
        created_by=current_user.id,
        **body.model_dump(),
    )
    db.add(p)
    await db.flush()

    # Compute + cache
    result = compute(p)
    p.cached_total_kgco2e = result.total_kg_co2e
    p.cached_stages_breakdown = result_to_dict(result)
    p.cached_computed_at = datetime.utcnow()

    await db.commit()
    await db.refresh(p)
    return {**_serialize(p, include_full=True), "impact": result_to_dict(result)}


@router.get("/products/{product_id}")
async def get_product(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get one product with its full LCA breakdown."""
    p = await _load(db, product_id, current_user.tenant_id)
    result = compute(p)
    return {**_serialize(p, include_full=True), "impact": result_to_dict(result)}


@router.put("/products/{product_id}")
async def update_product(
    product_id: UUID,
    body: ProductPatch,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update product fields (re-computes impact if stages change)."""
    p = await _load(db, product_id, current_user.tenant_id)
    fields = body.model_dump(exclude_unset=True)
    for k, v in fields.items():
        setattr(p, k, v)
    p.updated_at = datetime.utcnow()
    # Always re-compute to keep the cache in sync
    result = compute(p)
    p.cached_total_kgco2e = result.total_kg_co2e
    p.cached_stages_breakdown = result_to_dict(result)
    p.cached_computed_at = datetime.utcnow()
    await db.commit()
    await db.refresh(p)
    return {**_serialize(p, include_full=True), "impact": result_to_dict(result)}


@router.delete("/products/{product_id}", status_code=204)
async def delete_product(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    p = await _load(db, product_id, current_user.tenant_id)
    await db.delete(p)
    await db.commit()


@router.post("/products/{product_id}/compute")
async def recompute(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Force a fresh impact calculation (and update the cache)."""
    p = await _load(db, product_id, current_user.tenant_id)
    result = compute(p)
    p.cached_total_kgco2e = result.total_kg_co2e
    p.cached_stages_breakdown = result_to_dict(result)
    p.cached_computed_at = datetime.utcnow()
    await db.commit()
    return result_to_dict(result)


@router.post("/products/compare")
async def compare_products(
    body: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Compare 2-5 products side by side.

    Body: { "product_ids": ["uuid1", "uuid2", ...] }
    Returns per-product breakdown + delta analysis + eco-design recommendations.
    """
    product_ids = body.get("product_ids", [])
    if len(product_ids) < 2 or len(product_ids) > 5:
        raise HTTPException(400, "Comparez entre 2 et 5 produits.")

    results = []
    for pid in product_ids:
        try:
            p = await _load(db, UUID(pid), current_user.tenant_id)
        except HTTPException:
            continue
        r = compute(p)
        results.append({
            "id": str(p.id),
            "name": p.name,
            "sku": p.sku,
            "functional_unit": p.functional_unit,
            "total_kg_co2e": r.total_kg_co2e,
            "annual_kg_co2e": r.annual_kg_co2e,
            "stages": [
                {"stage": s.stage, "label_fr": s.label_fr,
                 "total_kg_co2e": s.total_kg_co2e, "pct_of_total": s.pct_of_total}
                for s in r.stages
            ],
            "largest_contributor": r.largest_contributor,
        })

    if len(results) < 2:
        raise HTTPException(400, "Pas assez de produits valides pour comparer.")

    # Delta analysis: reference = first product
    ref = results[0]
    for r in results[1:]:
        r["delta_vs_ref_pct"] = round(
            100 * (r["total_kg_co2e"] - ref["total_kg_co2e"]) / ref["total_kg_co2e"], 1
        ) if ref["total_kg_co2e"] > 0 else 0.0

    # Eco-design recommendations based on hotspots
    recommendations = _generate_eco_recommendations(results)

    return {
        "products": results,
        "reference": ref["name"],
        "recommendations": recommendations,
    }


@router.get("/eco-design-tips")
async def eco_design_tips(
    current_user: User = Depends(get_current_user),
):
    """Return generic eco-design recommendations by lifecycle stage."""
    return {"tips": ECO_DESIGN_TIPS}


@router.get("/stats")
async def lca_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Portfolio-level LCA statistics."""
    from sqlalchemy import func
    q = select(
        func.count(LCAProduct.id).label("total_products"),
        func.sum(LCAProduct.cached_total_kgco2e).label("total_kgco2e"),
        func.avg(LCAProduct.cached_total_kgco2e).label("avg_kgco2e"),
        func.min(LCAProduct.cached_total_kgco2e).label("min_kgco2e"),
        func.max(LCAProduct.cached_total_kgco2e).label("max_kgco2e"),
    ).where(LCAProduct.tenant_id == current_user.tenant_id)
    row = (await db.execute(q)).one()
    return {
        "total_products": row.total_products or 0,
        "total_kgco2e": round(row.total_kgco2e or 0, 2),
        "avg_kgco2e": round(row.avg_kgco2e or 0, 2),
        "min_kgco2e": round(row.min_kgco2e or 0, 2),
        "max_kgco2e": round(row.max_kgco2e or 0, 2),
    }


# ───────────────────────────────────────────────────────────────────────────
# Eco-design recommendations engine
# ───────────────────────────────────────────────────────────────────────────

ECO_DESIGN_TIPS = {
    "raw_material": [
        {"tip": "Privilégier les matières recyclées (rPET, acier EAF, alu recyclé)", "impact": "-40 à -80% vs vierge", "effort": "moyen"},
        {"tip": "Substituer les plastiques par des biomatériaux (PLA, chanvre, lin)", "impact": "-20 à -50%", "effort": "élevé"},
        {"tip": "Réduire la masse matière par éco-conception (topologie, nervures)", "impact": "-10 à -30%", "effort": "moyen"},
        {"tip": "Sourcer localement pour réduire le transport amont", "impact": "-5 à -15%", "effort": "faible"},
    ],
    "manufacturing": [
        {"tip": "Optimiser le taux de chute matière (nesting, réutilisation chutes)", "impact": "-5 à -15%", "effort": "faible"},
        {"tip": "Électrifier les process thermiques (fours, séchage)", "impact": "-20 à -60%", "effort": "élevé"},
        {"tip": "Basculer sur de l'énergie renouvelable (PPA, autoconsommation)", "impact": "-30 à -80%", "effort": "moyen"},
    ],
    "transport": [
        {"tip": "Optimiser le taux de remplissage des camions (palettisation)", "impact": "-10 à -25%", "effort": "faible"},
        {"tip": "Basculer du routier vers le ferroviaire ou le maritime", "impact": "-60 à -90%", "effort": "moyen"},
        {"tip": "Relocaliser la production pour raccourcir les flux", "impact": "-30 à -70%", "effort": "élevé"},
    ],
    "packaging": [
        {"tip": "Réduire le poids d'emballage (film vs carton, suppression suremballage)", "impact": "-20 à -50%", "effort": "faible"},
        {"tip": "Passer aux emballages réutilisables ou consignés", "impact": "-60 à -90%", "effort": "moyen"},
        {"tip": "Utiliser du carton recyclé ou des matériaux biosourcés", "impact": "-30 à -60%", "effort": "faible"},
    ],
    "use_phase": [
        {"tip": "Réduire la consommation énergétique en usage (efficacité, veille)", "impact": "-10 à -40%", "effort": "moyen"},
        {"tip": "Allonger la durée de vie (réparabilité, modularité)", "impact": "-20 à -50%", "effort": "moyen"},
        {"tip": "Proposer un service de maintenance / reconditionnement", "impact": "-15 à -30%", "effort": "moyen"},
    ],
    "end_of_life": [
        {"tip": "Concevoir pour le démontage et le tri des matériaux", "impact": "-10 à -30%", "effort": "moyen"},
        {"tip": "Privilégier les matériaux mono-matière (recyclabilité)", "impact": "-15 à -40%", "effort": "moyen"},
        {"tip": "Mettre en place une filière de reprise / collecte", "impact": "-20 à -50%", "effort": "élevé"},
    ],
}


def _generate_eco_recommendations(results: list) -> list:
    """Generate contextual recommendations based on comparison hotspots."""
    recs = []
    for r in results:
        if not r.get("stages"):
            continue
        # Find dominant stage
        worst_stage = max(r["stages"], key=lambda s: s["total_kg_co2e"])
        stage_key = worst_stage["stage"]
        tips = ECO_DESIGN_TIPS.get(stage_key, [])
        if tips:
            recs.append({
                "product": r["name"],
                "hotspot_stage": worst_stage["label_fr"],
                "hotspot_pct": worst_stage["pct_of_total"],
                "recommendation": tips[0]["tip"],
                "potential_impact": tips[0]["impact"],
            })
    return recs


async def _load(db: AsyncSession, product_id: UUID, tenant_id: UUID) -> LCAProduct:
    q = select(LCAProduct).where(
        LCAProduct.id == product_id,
        LCAProduct.tenant_id == tenant_id,
    )
    p = (await db.execute(q)).scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Produit LCA introuvable.")
    return p
