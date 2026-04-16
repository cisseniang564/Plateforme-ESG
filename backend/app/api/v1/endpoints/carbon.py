"""
Carbon / GHG Accounting API — Scope 1, 2 & 3 emissions (GHG Protocol / ADEME).
Reads real data from data_entries table.
"""
from typing import Any, Dict, List, Optional
from datetime import datetime, date
import json
import logging

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, extract, delete, and_

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.data_entry import DataEntry
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


def _get_redis():
    try:
        import redis as _redis
        redis_url = str(settings.REDIS_URL) if settings.REDIS_URL else "redis://redis:6379/0"
        return _redis.from_url(redis_url, decode_responses=True, socket_connect_timeout=2)
    except Exception as e:
        logger.warning("Carbon: Redis unavailable — %s", e)
        return None


def _scope_keywords(scope: int) -> list[str]:
    """Keywords to identify scope emissions in metric_name."""
    if scope == 1:
        return ['scope 1', 'scope1', 'émissions directes', 'ges direct', 'co2 direct', 'carbone direct', 'combustion']
    elif scope == 2:
        return ['scope 2', 'scope2', 'émissions indirectes énergie', 'electricité', 'électricité', 'énergie indirect']
    else:
        return ['scope 3', 'scope3', 'amont', 'aval', 'chaîne de valeur', 'achats', 'transport amont',
                'déplacements professionnels', 'télétravail', 'déchets', 'produits vendus']


def _matches_scope(metric_name: str, category: str, scope: int) -> bool:
    text = (metric_name + ' ' + category).lower()
    for kw in _scope_keywords(scope):
        if kw in text:
            return True
    return False


@router.get("/scope-summary", response_model=Dict[str, Any])
async def get_scope_summary(
    organization_id: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return Scope 1, 2 & 3 emission totals read from data_entries."""

    target_year = year or datetime.now().year

    from uuid import UUID
    from app.models.organization import Organization

    # Resolve organization: use provided ID or fall back to tenant's first org
    resolved_org_id = None
    if organization_id:
        try:
            resolved_org_id = UUID(organization_id)
        except ValueError:
            pass
    else:
        # Default: first organization of the tenant (the main/own org)
        org_res = await db.execute(
            select(Organization)
            .where(Organization.tenant_id == current_user.tenant_id)
            .order_by(Organization.created_at.asc())
            .limit(1)
        )
        first_org = org_res.scalar_one_or_none()
        if first_org:
            resolved_org_id = first_org.id

    # Base query: environmental pillar, current year, single org
    q = select(DataEntry).where(
        DataEntry.tenant_id == current_user.tenant_id,
        DataEntry.pillar == 'environmental',
        DataEntry.value_numeric.isnot(None),
        extract('year', DataEntry.period_start) == target_year,
    )
    if resolved_org_id:
        q = q.where(DataEntry.organization_id == resolved_org_id)

    result = await db.execute(q)
    entries = result.scalars().all()

    scope1_total = 0.0
    scope2_total = 0.0
    scope3_by_cat: dict = {}   # cat_id (int) → total tCO2e

    import re as _re

    for entry in entries:
        metric = entry.metric_name or ''
        cat = entry.category or ''
        val = entry.value_numeric or 0.0

        unit = (entry.unit or '').lower()
        if unit not in ('tco2e', 'tco2', 'co2e', 'co2', 'kgco2e', ''):
            continue
        if unit == 'kgco2e':
            val = val / 1000

        # Scope 3 detection via "Scope 3 Cat.N" pattern
        m = _re.search(r'scope\s*3\s*cat\.?\s*(\d+)', metric.lower())
        if m:
            cat_id = int(m.group(1))
            scope3_by_cat[cat_id] = scope3_by_cat.get(cat_id, 0.0) + val
            continue

        # Scope 1 / Scope 2
        if _matches_scope(metric, cat, 1):
            scope1_total += val
        elif _matches_scope(metric, cat, 2):
            scope2_total += val

    scope3_total = sum(scope3_by_cat.values())
    total_all = round(scope1_total + scope2_total + scope3_total, 2)

    return {
        "year": target_year,
        "organization_id": organization_id,
        "total_tco2e": total_all,
        "scope1": {
            "total_tco2e": round(scope1_total, 2),
        },
        "scope2": {
            "total_tco2e": round(scope2_total, 2),
            "market_based": round(scope2_total, 2),
            "location_based": round(scope2_total * 1.05, 2),
        },
        "scope3": {
            "total_tco2e": round(scope3_total, 2),
            # Dict cat_id (str) → tCO2e so frontend can map by category ID
            "by_category": {str(k): round(v, 2) for k, v in scope3_by_cat.items()},
        },
        "has_real_data": len(entries) > 0,
        "entries_count": len(entries),
    }


@router.get("/categories", response_model=List[Dict[str, Any]])
async def get_scope3_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return Scope 3 category reference data with ADEME emission factors."""
    return [
        {"id": 1, "name": "Achats de biens & services",       "factor": 0.85, "unit": "kgCO2e/€"},
        {"id": 2, "name": "Biens d'équipement",                "factor": 0.45, "unit": "kgCO2e/€"},
        {"id": 3, "name": "Énergie (non incluse scope 1&2)",   "factor": 0.23, "unit": "kgCO2e/kWh"},
        {"id": 4, "name": "Transport amont (fret)",            "factor": 0.062,"unit": "kgCO2e/tkm"},
        {"id": 5, "name": "Déchets générés",                   "factor": 0.44, "unit": "kgCO2e/kg"},
        {"id": 6, "name": "Déplacements professionnels",       "factor": 0.184,"unit": "kgCO2e/km"},
        {"id": 7, "name": "Immobilisations",                   "factor": 0.38, "unit": "kgCO2e/€"},
    ]


@router.get("/history", response_model=Dict[str, Any])
async def get_emissions_history(
    organization_id: Optional[str] = Query(None),
    years: int = Query(5, ge=2, le=10),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return annual Scope 1+2+3 totals for the last N years (real data only)."""
    import re as _re
    current_year = datetime.now().year
    history = []

    from uuid import UUID
    from app.models.organization import Organization

    resolved_org_id = None
    if organization_id:
        try:
            resolved_org_id = UUID(organization_id)
        except ValueError:
            pass
    else:
        org_res = await db.execute(
            select(Organization)
            .where(Organization.tenant_id == current_user.tenant_id)
            .order_by(Organization.created_at.asc())
            .limit(1)
        )
        first_org = org_res.scalar_one_or_none()
        if first_org:
            resolved_org_id = first_org.id

    for yr in range(current_year - years + 1, current_year + 1):
        q = select(DataEntry).where(
            DataEntry.tenant_id == current_user.tenant_id,
            DataEntry.pillar == 'environmental',
            DataEntry.value_numeric.isnot(None),
            extract('year', DataEntry.period_start) == yr,
        )
        if resolved_org_id:
            q = q.where(DataEntry.organization_id == resolved_org_id)

        result = await db.execute(q)
        entries = result.scalars().all()

        s1, s2, s3 = 0.0, 0.0, 0.0
        for entry in entries:
            metric = entry.metric_name or ''
            cat = entry.category or ''
            val = entry.value_numeric or 0.0
            unit = (entry.unit or '').lower()
            if unit not in ('tco2e', 'tco2', 'co2e', 'co2', 'kgco2e', ''):
                continue
            if unit == 'kgco2e':
                val = val / 1000
            m = _re.search(r'scope\s*3\s*cat\.?\s*(\d+)', metric.lower())
            if m:
                s3 += val
                continue
            if _matches_scope(metric, cat, 1):
                s1 += val
            elif _matches_scope(metric, cat, 2):
                s2 += val
            elif _matches_scope(metric, cat, 3):
                s3 += val

        total = round(s1 + s2 + s3, 2)
        history.append({
            "year": yr,
            "total_tco2e": total,
            "scope1": round(s1, 2),
            "scope2": round(s2, 2),
            "scope3": round(s3, 2),
            "has_data": len(entries) > 0,
        })

    return {"history": history, "years": years}


@router.get("/plan", response_model=Dict[str, Any])
async def get_decarb_plan(
    current_user: User = Depends(get_current_user),
):
    """Load the tenant's saved decarbonization plan from Redis."""
    r = _get_redis()
    if r:
        try:
            key = f"decarb:plan:{current_user.tenant_id}"
            data = r.get(key)
            if data:
                return json.loads(data)
        except Exception as e:
            logger.warning("get_decarb_plan Redis error: %s", e)
    return {"actions": []}


class Scope3Entry(BaseModel):
    cat_id: int          # 1-15
    name: str            # Category name
    num: str             # "Cat. 1"
    value: float         # tCO2e entered by user
    unit: str = "tCO2e"
    ademe_factor: Optional[float] = None
    ademe_unit: Optional[str] = None


class SaveScope3Payload(BaseModel):
    year: int
    entries: List[Scope3Entry]


@router.post("/save-scope3", response_model=Dict[str, Any])
async def save_scope3(
    payload: SaveScope3Payload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upsert Scope 3 category values entered by the user in BilanCarbone.
    Deletes existing Scope 3 data-entries for the year then inserts new ones.
    """
    year = payload.year
    period_start = date(year, 1, 1)
    period_end   = date(year, 12, 31)

    # Delete previous manual Scope 3 entries for this tenant / year
    await db.execute(
        delete(DataEntry).where(
            and_(
                DataEntry.tenant_id == current_user.tenant_id,
                DataEntry.pillar == "environmental",
                DataEntry.category == "Scope 3",
                DataEntry.collection_method == "manual_scope3",
                extract("year", DataEntry.period_start) == year,
            )
        )
    )

    inserted = 0
    for e in payload.entries:
        notes_parts = []
        if e.ademe_factor is not None:
            notes_parts.append(f"Facteur ADEME : {e.ademe_factor} {e.ademe_unit or ''}")
        entry = DataEntry(
            tenant_id=current_user.tenant_id,
            created_by=current_user.id,
            pillar="environmental",
            category="Scope 3",
            metric_name=f"{e.num} - {e.name}",
            value_numeric=e.value,
            unit=e.unit,
            period_start=period_start,
            period_end=period_end,
            period_type="annual",
            data_source="ADEME Base Empreinte® — saisie manuelle",
            collection_method="manual_scope3",
            notes="; ".join(notes_parts) if notes_parts else None,
            verification_status="pending",
        )
        db.add(entry)
        inserted += 1

    await db.commit()
    return {"saved": True, "inserted": inserted, "year": year}


@router.post("/plan", response_model=Dict[str, Any])
async def save_decarb_plan(
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
):
    """Save the tenant's decarbonization plan to Redis (TTL 1 year)."""
    r = _get_redis()
    if r:
        try:
            key = f"decarb:plan:{current_user.tenant_id}"
            r.set(key, json.dumps(payload), ex=365 * 24 * 3600)
            return {"saved": True}
        except Exception as e:
            logger.warning("save_decarb_plan Redis error: %s", e)
    return {"saved": False}
