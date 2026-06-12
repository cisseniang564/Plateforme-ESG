"""
FEC Wizard — 3-step Scope 3 calculation from a French accounting file.

Workflow:
  1. POST /carbon/fec-wizard/preview    — upload .txt FEC, parse + map + calc
  2. POST /carbon/fec-wizard/commit     — confirm and persist DataEntries

The preview step does NOT persist anything — it only returns an in-memory
preview of what would be created. The user reviews, optionally tweaks the
year/organization, then commits.

Each preview is stored in Redis under a short ``preview_id`` so the commit
step doesn't need to re-parse the file (and we don't bloat the JWT).

Why a wizard rather than the existing /scope3/calculate?
  * Surfaces the FEC pipeline that is buried in the codebase (audit's pépite #2).
  * Provides a single 3-click flow (upload → preview → commit) for DAFs/CFOs.
  * Generates ALL the artifacts at once: DataEntries, Indicators, IndicatorData,
    so the CSRD progress dashboard reflects the import immediately.
"""
from __future__ import annotations

import json
import logging
import secrets
from datetime import date
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.organization import Organization
from app.services.fec_parser import parse_fec
from app.services.pcg_emission_mapper import aggregate_by_category

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/carbon/fec-wizard", tags=["FEC Wizard"])

# ── In-process preview cache (TTL 30 min) ──────────────────────────────────
# Stored in Redis if available; else falls back to an in-memory dict (single-
# tenant dev). The cache is per-user so concurrent uploads don't collide.
_MEMORY_CACHE: Dict[str, Dict[str, Any]] = {}


def _get_redis():
    try:
        from app.config import settings
        import redis as _r
        url = str(settings.REDIS_URL) if settings.REDIS_URL else "redis://redis:6379/0"
        client = _r.from_url(url, socket_timeout=2)
        client.ping()
        return client
    except Exception:
        return None


def _cache_set(key: str, value: Dict[str, Any], ttl: int = 1800) -> None:
    r = _get_redis()
    if r is not None:
        try:
            r.setex(key, ttl, json.dumps(value, default=str))
            return
        except Exception:
            pass
    _MEMORY_CACHE[key] = value


def _cache_get(key: str) -> Optional[Dict[str, Any]]:
    r = _get_redis()
    if r is not None:
        try:
            raw = r.get(key)
            if raw:
                return json.loads(raw)
        except Exception:
            pass
    return _MEMORY_CACHE.get(key)


def _cache_del(key: str) -> None:
    r = _get_redis()
    if r is not None:
        try:
            r.delete(key)
        except Exception:
            pass
    _MEMORY_CACHE.pop(key, None)


# ─── Schemas ────────────────────────────────────────────────────────────────
class CommitRequest(BaseModel):
    preview_id: str = Field(..., description="ID returned by /preview")
    organization_id: Optional[UUID] = None
    year: Optional[int] = Field(default=None, ge=2000, le=2100)
    exclude_categories: List[str] = Field(
        default_factory=list,
        description="Liste de category labels à exclure du commit (cases décochées dans l'UI)",
    )


# ─── Endpoints ──────────────────────────────────────────────────────────────
@router.post("/preview", summary="Étape 1 — Upload + parse + preview")
async def fec_preview(
    file: UploadFile = File(..., description="Fichier FEC .txt (Sage, Cegid, Pennylane…)"),
    year_hint: Optional[int] = Form(default=None, description="Année déduite des dates si non fournie"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Parse le FEC et retourne un preview agrégé (sans rien persister).

    Le preview contient :
      * stats globales (lignes, écritures, comptes uniques, période)
      * top 10 catégories par émissions CO2e
      * liste complète des catégories (cochables/décochables côté front)
      * un ``preview_id`` à passer à /commit
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename required")
    if file.size and file.size > 30 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="FEC > 30 MB. Découpez par exercice.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        entries = parse_fec(content, filename=file.filename)
    except Exception as exc:
        logger.warning("FEC parsing failed: %s", exc)
        raise HTTPException(
            status_code=400,
            detail=f"Format FEC invalide : {exc}. Vérifiez le séparateur (|, ;, tab) et l'encodage.",
        )

    if not entries:
        raise HTTPException(status_code=400, detail="Aucune écriture détectée dans le FEC.")

    aggregated = aggregate_by_category(entries)

    # Year detection: pick the median year from entries unless year_hint provided
    detected_years: Dict[int, int] = {}
    for e in entries:
        d = e.get("date") or ""
        if len(d) >= 4 and d[:4].isdigit():
            y = int(d[:4])
            detected_years[y] = detected_years.get(y, 0) + 1
    detected_year = year_hint or (
        sorted(detected_years.items(), key=lambda x: -x[1])[0][0] if detected_years else date.today().year - 1
    )

    # Split aggregated into environmental (with co2e) vs social/governance
    env_groups = [g for g in aggregated if g["pillar"] == "environmental"]
    other_groups = [g for g in aggregated if g["pillar"] != "environmental"]

    total_co2e_kg = sum(g.get("value", 0) for g in env_groups if g.get("unit") == "kgCO2e")
    total_co2e_t = round(total_co2e_kg / 1000, 2)

    total_amount_eur = sum(e.get("net_amount", 0) for e in entries)
    unique_accounts = len({e["compte_num"] for e in entries})

    # Top 10 environmental categories by CO2e
    env_groups_sorted = sorted(env_groups, key=lambda g: g.get("value", 0), reverse=True)
    top_10 = env_groups_sorted[:10]

    # Cache the full aggregated payload for the commit step
    preview_id = f"fec:{current_user.tenant_id}:{secrets.token_urlsafe(12)}"
    _cache_set(preview_id, {
        "tenant_id": str(current_user.tenant_id),
        "user_id": str(current_user.id),
        "filename": file.filename,
        "year": detected_year,
        "aggregated": aggregated,
        "entries_count": len(entries),
    })

    return {
        "preview_id": preview_id,
        "filename": file.filename,
        "year": detected_year,
        "stats": {
            "lines": len(entries),
            "unique_accounts": unique_accounts,
            "total_amount_eur": round(total_amount_eur, 2),
            "total_co2e_t": total_co2e_t,
            "env_categories_count": len(env_groups),
            "other_categories_count": len(other_groups),
        },
        "top_10_env": [
            {
                "category": g["category"],
                "metric_name": g["metric_name"],
                "amount_eur": round(g.get("total_amount_eur", 0), 2),
                "co2e_kg": round(g.get("value", 0), 2),
                "co2e_t": round(g.get("value", 0) / 1000, 3),
                "entry_count": g.get("entry_count", 0),
            }
            for g in top_10
        ],
        "all_env_categories": [
            {
                "category": g["category"],
                "metric_name": g["metric_name"],
                "amount_eur": round(g.get("total_amount_eur", 0), 2),
                "co2e_kg": round(g.get("value", 0), 2),
                "entry_count": g.get("entry_count", 0),
            }
            for g in env_groups
        ],
        "all_other_categories": [
            {
                "category": g["category"],
                "pillar": g["pillar"],
                "metric_name": g["metric_name"],
                "amount_eur": round(g.get("total_amount_eur", 0), 2),
                "entry_count": g.get("entry_count", 0),
            }
            for g in other_groups
        ],
    }


@router.post("/commit", summary="Étape 3 — Confirmer et créer les DataEntries")
async def fec_commit(
    body: CommitRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Persiste les entrées de la preview en :
      * DataEntries (vue Saisie de données)
      * Indicators (auto-créés si absents)
      * IndicatorData (alimente CSRD Progress)

    Idempotent par (tenant, organization, year, metric_name) en mode merge.
    """
    cached = _cache_get(body.preview_id)
    if cached is None:
        raise HTTPException(
            status_code=404,
            detail="Preview expirée. Re-uploadez le FEC (durée de vie : 30 min).",
        )
    if cached.get("tenant_id") != str(current_user.tenant_id):
        raise HTTPException(status_code=403, detail="Preview appartient à un autre tenant.")

    year = body.year or cached.get("year") or (date.today().year - 1)

    # Resolve organization
    org_id = body.organization_id
    if org_id is None:
        org_stmt = (
            select(Organization)
            .where(Organization.tenant_id == current_user.tenant_id)
            .limit(1)
        )
        result = await db.execute(org_stmt)
        org = result.scalar_one_or_none()
        if org is None:
            raise HTTPException(status_code=400, detail="Aucune organisation pour ce tenant.")
        org_id = org.id

    aggregated = cached.get("aggregated", [])
    excluded = {c.lower() for c in (body.exclude_categories or [])}

    # Reuse the template-apply path: it already handles DataEntry + Indicator + IndicatorData
    from app.models.data_entry import DataEntry
    from app.models.indicator import Indicator
    from app.models.indicator_data import IndicatorData

    def _slugify(text: str) -> str:
        import re
        s = re.sub(r"[^a-zA-Z0-9]+", "-", text.lower()).strip("-")
        return s[:40].upper()

    period_start = date(year, 1, 1)
    period_end = date(year, 12, 31)

    # Existing metric_names for dedupe
    existing_stmt = select(DataEntry.metric_name).where(
        DataEntry.tenant_id == current_user.tenant_id,
        DataEntry.organization_id == org_id,
        DataEntry.period_start == period_start,
    )
    result = await db.execute(existing_stmt)
    existing_names = {row[0].strip().lower() for row in result.all()}

    # Existing indicator codes
    ind_stmt = select(Indicator.code, Indicator.id).where(
        Indicator.tenant_id == current_user.tenant_id
    )
    ind_result = await db.execute(ind_stmt)
    existing_indicators: Dict[str, UUID] = {row[0]: row[1] for row in ind_result.all()}

    created = 0
    skipped_existing = 0
    skipped_excluded = 0
    indicators_created = 0
    ind_data_created = 0

    for g in aggregated:
        category_lower = (g.get("category") or "").lower()
        if category_lower in excluded:
            skipped_excluded += 1
            continue

        metric_name = g["metric_name"]
        key = metric_name.strip().lower()
        if key in existing_names:
            skipped_existing += 1
            continue

        pillar = g["pillar"]
        category = g["category"]
        unit = g.get("unit", "kgCO2e")
        value = float(g.get("value", 0))
        amount_eur = round(g.get("total_amount_eur", 0), 2)

        # 1. DataEntry
        notes = (
            f"Import FEC — {g.get('entry_count', 0)} écritures · {amount_eur:,.0f} €".replace(",", " ")
        )
        de = DataEntry(
            tenant_id=current_user.tenant_id,
            organization_id=org_id,
            period_start=period_start,
            period_end=period_end,
            period_type="annual",
            pillar=pillar,
            category=category,
            metric_name=metric_name,
            value_numeric=value,
            unit=unit,
            data_source=f"FEC Wizard — {cached.get('filename', 'fec.txt')}",
            collection_method="fec_wizard",
            verification_status="pending",
            quality_flags={
                "estimated": True,
                "requires_review": True,
                "method": "FEC × ADEME PCG",
                "entry_count": g.get("entry_count", 0),
                "amount_eur": amount_eur,
            },
            notes=notes,
            created_by=current_user.id,
        )
        db.add(de)
        created += 1

        # 2. Indicator
        code = f"FEC-{_slugify(metric_name)}"
        ind_id = existing_indicators.get(code)
        if ind_id is None:
            indicator = Indicator(
                tenant_id=current_user.tenant_id,
                code=code,
                name=metric_name,
                pillar=pillar,
                category=category,
                unit=unit,
                data_type="number",
                framework="ESRS",
                description=f"Indicateur dérivé du FEC — catégorie PCG : {category}",
                is_active=True,
            )
            db.add(indicator)
            await db.flush()
            ind_id = indicator.id
            existing_indicators[code] = ind_id
            indicators_created += 1

        # 3. IndicatorData (powers CSRD progress)
        idata = IndicatorData(
            tenant_id=current_user.tenant_id,
            indicator_id=ind_id,
            organization_id=org_id,
            date=period_end,
            value=value,
            unit=unit,
            source=f"FEC Wizard — {cached.get('filename', 'fec.txt')}",
        )
        db.add(idata)
        ind_data_created += 1

    await db.commit()
    _cache_del(body.preview_id)

    return {
        "year": year,
        "organization_id": str(org_id),
        "data_entries_created": created,
        "indicators_created": indicators_created,
        "indicator_data_created": ind_data_created,
        "skipped_existing": skipped_existing,
        "skipped_excluded": skipped_excluded,
        "total_aggregated": len(aggregated),
    }


@router.delete("/preview/{preview_id}", status_code=status.HTTP_204_NO_CONTENT,
               summary="Abandonner une preview")
async def fec_discard(
    preview_id: str,
    current_user: User = Depends(get_current_user),
):
    """Supprimer la preview du cache (cancel button)."""
    cached = _cache_get(preview_id)
    if cached and cached.get("tenant_id") == str(current_user.tenant_id):
        _cache_del(preview_id)
    return None
