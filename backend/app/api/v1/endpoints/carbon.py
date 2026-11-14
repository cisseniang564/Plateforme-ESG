"""
Carbon / GHG Accounting API — Scope 1, 2 & 3 emissions (GHG Protocol / ADEME).
Reads real data from data_entries table.
"""
from typing import Any, Dict, List, Optional
from datetime import datetime, date
import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, extract, delete, and_
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.data_entry import DataEntry
from app.models.framework_assessment import FrameworkAssessment
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


import re as _re_mod

_SCOPE3_CAT_RE = _re_mod.compile(r'scope\s*3\s*cat\.?\s*(\d+)')
_CAT_RE = _re_mod.compile(r'(?:cat(?:[ée]gorie)?\.?\s*|cat)(\d+)')


def _scope3_cat_id(metric_name: str, category: str) -> Optional[int]:
    """Numéro de catégorie Scope 3 (1-15) d'une saisie, sinon None.

    Reconnaît « Scope 3 Cat.4 … » (imports) ET « Cat. 4 - … » avec la
    catégorie « Scope 3 » (format écrit par /save-scope3, qui n'était
    auparavant jamais relu).
    """
    m = _SCOPE3_CAT_RE.search((metric_name or '').lower())
    if m:
        n = int(m.group(1))
        return n if 1 <= n <= 15 else None
    cat_l = (category or '').lower()
    if 'scope 3' in cat_l or 'scope3' in cat_l:
        # « Cat. 4 - … », « scope3_cat7_commuting », ou « … Scope 3 catégorie 7 » en catégorie
        m = _CAT_RE.search((metric_name or '').lower()) or _CAT_RE.search(cat_l)
        if m:
            n = int(m.group(1))
            return n if 1 <= n <= 15 else None
    return None


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

        # Scope 3 : « Scope 3 Cat.N » ou « Cat. N - … » (catégorie « Scope 3 »)
        cat_id = _scope3_cat_id(metric, cat)
        if cat_id is not None:
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
    """Catégories Scope 3 (référentiel GHG Protocol) — sans facteur d'émission.

    Aucun facteur n'est publié ici : les facteurs réels dépendent du poste
    (Base Empreinte ADEME) et doivent être choisis par l'utilisateur.
    """
    return [
        {"id": 1, "name": "Achats de biens & services"},
        {"id": 2, "name": "Biens d'équipement"},
        {"id": 3, "name": "Énergie (non incluse scope 1&2)"},
        {"id": 4, "name": "Transport amont (fret)"},
        {"id": 5, "name": "Déchets générés"},
        {"id": 6, "name": "Déplacements professionnels"},
        {"id": 7, "name": "Immobilisations"},
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
            if _scope3_cat_id(metric, cat) is not None:
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


_PLAN_FRAMEWORK = "decarb_plan"
_PLAN_MAX_BYTES = 512 * 1024  # garde-fou : un plan réaliste fait quelques Ko


async def _load_plan(db: AsyncSession, tenant_id: Any) -> Optional[Dict[str, Any]]:
    result = await db.execute(
        select(FrameworkAssessment).where(
            FrameworkAssessment.tenant_id == tenant_id,
            FrameworkAssessment.framework == _PLAN_FRAMEWORK,
        ).order_by(FrameworkAssessment.updated_at.desc()).limit(1)
    )
    row = result.scalar_one_or_none()
    return row.data if row and isinstance(row.data, dict) else None


async def _store_plan(db: AsyncSession, tenant_id: Any, payload: Dict[str, Any]) -> None:
    """Upsert du plan du tenant (une seule ligne par tenant, user_id NULL)."""
    existing = await db.execute(
        select(FrameworkAssessment).where(
            FrameworkAssessment.tenant_id == tenant_id,
            FrameworkAssessment.framework == _PLAN_FRAMEWORK,
        ).order_by(FrameworkAssessment.updated_at.desc()).limit(1)
    )
    row = existing.scalar_one_or_none()
    if row:
        row.data = payload
    else:
        await db.execute(
            pg_insert(FrameworkAssessment)
            .values(tenant_id=tenant_id, user_id=None, framework=_PLAN_FRAMEWORK, data=payload)
            .on_conflict_do_nothing()
        )
    await db.commit()


@router.get("/plan", response_model=Dict[str, Any])
async def get_decarb_plan(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Charge le plan de décarbonation du tenant (PostgreSQL).

    Reprise de l'existant : si aucun plan n'est en base mais qu'un ancien plan
    existe encore dans Redis (ancien stockage), il est renvoyé et recopié en base.
    """
    try:
        plan = await _load_plan(db, current_user.tenant_id)
    except Exception as e:
        logger.error("get_decarb_plan DB error: %s", e)
        raise HTTPException(status_code=503, detail="Plan de décarbonation momentanément indisponible")
    if plan is not None:
        return plan

    r = _get_redis()
    if r:
        try:
            legacy = r.get(f"decarb:plan:{current_user.tenant_id}")
            if legacy:
                data = json.loads(legacy)
                if isinstance(data, dict):
                    try:
                        await _store_plan(db, current_user.tenant_id, data)
                    except Exception as e:  # la reprise ne doit pas bloquer la lecture
                        await db.rollback()
                        logger.warning("decarb plan legacy copy failed: %s", e)
                    return data
        except Exception as e:
            logger.warning("get_decarb_plan Redis (legacy) error: %s", e)
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
    # La page affiche déjà la valeur Cat. 7 issue du calcul domicile-travail :
    # on la remplace pour ne pas la compter deux fois.
    await db.execute(
        delete(DataEntry).where(
            and_(
                DataEntry.tenant_id == current_user.tenant_id,
                DataEntry.metric_name == "scope3_cat7_commuting",
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


class SaveScope12Payload(BaseModel):
    year: int
    scope1: float = 0.0
    scope2: float = 0.0


@router.post("/save-scope12", response_model=Dict[str, Any])
async def save_scope12(
    payload: SaveScope12Payload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Enregistre les totaux Scope 1 et Scope 2 saisis (remplace la saisie manuelle de l'année)."""
    if payload.scope1 < 0 or payload.scope2 < 0:
        raise HTTPException(status_code=422, detail="Les émissions ne peuvent pas être négatives.")

    year = payload.year
    await db.execute(
        delete(DataEntry).where(
            and_(
                DataEntry.tenant_id == current_user.tenant_id,
                DataEntry.pillar == "environmental",
                DataEntry.collection_method == "manual_scope12",
                extract("year", DataEntry.period_start) == year,
            )
        )
    )
    inserted = 0
    for label, category, value in (
        ("Scope 1 - Émissions directes", "Scope 1", payload.scope1),
        ("Scope 2 - Énergie achetée", "Scope 2", payload.scope2),
    ):
        if value <= 0:
            continue
        db.add(DataEntry(
            tenant_id=current_user.tenant_id,
            created_by=current_user.id,
            pillar="environmental",
            category=category,
            metric_name=label,
            value_numeric=value,
            unit="tCO2e",
            period_start=date(year, 1, 1),
            period_end=date(year, 12, 31),
            period_type="annual",
            data_source="Saisie manuelle",
            collection_method="manual_scope12",
            verification_status="pending",
        ))
        inserted += 1
    await db.commit()
    return {"saved": True, "inserted": inserted, "year": year}


@router.post("/plan", response_model=Dict[str, Any])
async def save_decarb_plan(
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Enregistre le plan de décarbonation du tenant dans PostgreSQL."""
    if len(json.dumps(payload, default=str)) > _PLAN_MAX_BYTES:
        raise HTTPException(status_code=413, detail="Plan trop volumineux")
    try:
        await _store_plan(db, current_user.tenant_id, payload)
        return {"saved": True}
    except Exception as e:
        await db.rollback()
        logger.error("save_decarb_plan DB error: %s", e)
        return {"saved": False}


@router.get("/beges-export.xlsx", summary="Export BEGES.xlsx au format ADEME (Art. L229-25)")
async def export_beges_xlsx(
    year: Optional[int] = Query(None, description="Année de reporting (défaut: N-1)"),
    organization_id: Optional[str] = Query(None, description="UUID de l'organisation (défaut: première du tenant)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Génère et télécharge un fichier .xlsx prêt à soumettre sur bilans-ges.ademe.fr.

    Le fichier contient 6 feuilles :
      1. Identité     — raison sociale, SIREN, NACE, périmètre
      2. Synthèse     — totaux par scope avec %
      3. Scope 1      — émissions directes
      4. Scope 2      — émissions indirectes énergie
      5. Scope 3      — 15 catégories GHG Protocol
      6. Plan d'actions — réduction visée (à compléter)

    Aligné avec l'Article L229-25 du Code de l'environnement, le Décret
    2022-982 et la méthode réglementaire ADEME v5.
    """
    from fastapi.responses import StreamingResponse
    from uuid import UUID as UUIDType
    from app.services.beges_export_service import BEGESExportService

    org_uuid: Optional[UUIDType] = None
    if organization_id:
        try:
            org_uuid = UUIDType(organization_id)
        except ValueError:
            org_uuid = None

    service = BEGESExportService(db, current_user.tenant_id)
    xlsx_bytes = await service.generate(organization_id=org_uuid, year=year)

    year_label = year or (datetime.utcnow().year - 1)
    filename = f"BEGES_{year_label}.xlsx"

    return StreamingResponse(
        iter([xlsx_bytes]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
