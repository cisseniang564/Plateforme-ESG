"""
Reports API - Generate ESG Reports
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, extract, or_, func
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4
from pydantic import BaseModel, Field
import io
import json
import logging
from datetime import datetime

from app.dependencies import (
    get_db,
    get_current_user,
    require_feature,
    assert_feature_enabled,
)
from app.models.user import User
from app.models.data_entry import DataEntry
from app.services.report_service import ReportService
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


def _get_redis():
    try:
        import redis as _redis
        redis_url = str(settings.REDIS_URL) if settings.REDIS_URL else "redis://redis:6379/0"
        return _redis.from_url(redis_url, decode_responses=True, socket_connect_timeout=2)
    except Exception as e:
        logger.warning("Reports: Redis unavailable — %s", e)
        return None


class ReportGenerateRequest(BaseModel):
    report_type: str  # executive, detailed, csrd, gri, tcfd
    organization_id: Optional[UUID] = None
    period: str = 'annual'  # monthly, quarterly, annual
    year: Optional[int] = None
    format: str = 'pdf'  # pdf, excel, word


class ScheduledReportRequest(BaseModel):
    title: str
    report_type: str
    frequency: str  # daily, weekly, monthly, quarterly
    format: str = 'pdf'
    recipients: List[str] = []
    # ISO date "YYYY-MM-DD" — first run date. Defaults to today if omitted.
    start_date: Optional[str] = None
    # 24-hour clock "HH:MM" — time of day to dispatch. Defaults to 08:00.
    time_of_day: Optional[str] = None
    # ISO date "YYYY-MM-DD" — stop recurring after this date (optional).
    end_date: Optional[str] = None


_REPORT_TYPE_TO_FEATURE = {
    "csrd": "csrd_report",
    "sfdr": "sfdr_report",
    "dpef": "dpef_report",
    "carbon": "carbon_report",
    "ghg": "carbon_report",
}


@router.post("/generate")
async def generate_report(
    request: ReportGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate ESG report and return as download"""

    # Plan gate — block report types the tenant's plan doesn't include
    feature = _REPORT_TYPE_TO_FEATURE.get((request.report_type or "").lower())
    if feature:
        await assert_feature_enabled(db, current_user.tenant_id, feature, user_id=current_user.id)

    service = ReportService(db)
    history_id: Optional[UUID] = None

    try:
        # Générer le rapport
        report_bytes = await service.generate_report(
            tenant_id=current_user.tenant_id,
            report_type=request.report_type,
            organization_id=request.organization_id,
            period=request.period,
            year=request.year,
            format=request.format
        )

        # Persist in history with SHA-256 hash + auto-incremented version
        # (audit-grade: any later regeneration with identical data must yield
        # the same hash; a different hash proves data drift).
        content_hash: Optional[str] = None
        version_num: int = 1
        try:
            import hashlib as _hashlib
            from sqlalchemy import func as _func
            from app.models.report_history import ReportHistory

            content_hash = _hashlib.sha256(report_bytes or b"").hexdigest()

            # Next version for same (tenant, report_type, year)
            ver_q = select(_func.max(ReportHistory.version)).where(
                ReportHistory.tenant_id == current_user.tenant_id,
                ReportHistory.report_type == request.report_type,
                ReportHistory.year == request.year,
            )
            max_ver = (await db.execute(ver_q)).scalar()
            version_num = int(max_ver or 0) + 1

            entry = ReportHistory(
                tenant_id=current_user.tenant_id,
                report_type=request.report_type,
                format=request.format,
                period=request.period,
                year=request.year,
                organization_id=request.organization_id,
                generated_by=current_user.id,
                file_size=len(report_bytes) if report_bytes else None,
                content_hash=content_hash,
                version=version_num,
                params=request.model_dump(mode="json"),
            )
            db.add(entry)
            await db.commit()
            await db.refresh(entry)
            history_id = entry.id
        except Exception as hist_exc:
            logger.warning("Could not record report_history entry: %s", hist_exc)

        # Déterminer le nom du fichier
        from datetime import datetime
        year = request.year or datetime.now().year
        filename = f"rapport_{request.report_type}_{year}.{request.format}"

        # Déterminer le content-type
        content_types = {
            'pdf':   'application/pdf',
            'excel': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'word':  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'json':  'application/json',
        }
        ext_map = {'excel': 'xlsx', 'word': 'docx', 'pdf': 'pdf', 'json': 'json'}
        ext = ext_map.get(request.format, request.format)
        filename = f"rapport_{request.report_type}_{year}.{ext}"
        content_type = content_types.get(request.format, 'application/octet-stream')
        
        # Retourner en streaming
        response_headers = {
            'Content-Disposition': f'attachment; filename="{filename}"',
        }
        if history_id is not None:
            response_headers['X-Report-History-Id'] = str(history_id)
            response_headers['X-Report-Version'] = str(version_num)
            if content_hash:
                response_headers['X-Report-Content-Hash'] = content_hash
            response_headers['Access-Control-Expose-Headers'] = (
                'X-Report-History-Id, X-Report-Version, X-Report-Content-Hash, Content-Disposition'
            )

        return StreamingResponse(
            io.BytesIO(report_bytes),
            media_type=content_type,
            headers=response_headers,
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")


@router.get("/types")
async def get_report_types():
    """Get available report types"""
    return ReportService.REPORT_TYPES


@router.get("/scheduled")
async def get_scheduled_reports(
    current_user: User = Depends(get_current_user)
):
    """Récupère les rapports planifiés du tenant"""
    r = _get_redis()
    if not r:
        return {"schedules": [], "count": 0}
    try:
        key = f"reports:scheduled:{current_user.tenant_id}"
        raw = r.get(key)
        schedules = json.loads(raw) if raw else []
        return {"schedules": schedules, "count": len(schedules)}
    except Exception as e:
        logger.error("Error fetching scheduled reports: %s", e)
        return {"schedules": [], "count": 0}


@router.post("/scheduled", status_code=201)
async def create_scheduled_report(
    payload: ScheduledReportRequest,
    current_user: User = Depends(get_current_user)
):
    """Crée un nouveau rapport planifié"""
    r = _get_redis()
    if not r:
        raise HTTPException(status_code=503, detail="Service temporairement indisponible")
    try:
        key = f"reports:scheduled:{current_user.tenant_id}"
        raw = r.get(key)
        schedules = json.loads(raw) if raw else []

        new_schedule = {
            "id": str(uuid4()),
            "title": payload.title,
            "report_type": payload.report_type,
            "frequency": payload.frequency,
            "format": payload.format,
            "recipients": payload.recipients,
            "status": "active",
            "created_at": datetime.utcnow().isoformat(),
            "start_date":  payload.start_date,
            "time_of_day": payload.time_of_day or "08:00",
            "end_date":    payload.end_date,
            "next_run":    _compute_next_run(
                payload.frequency,
                start_date=payload.start_date,
                time_of_day=payload.time_of_day,
            ),
        }
        schedules.append(new_schedule)
        r.setex(key, 365 * 24 * 3600, json.dumps(schedules))
        return new_schedule
    except Exception as e:
        logger.error("Error creating scheduled report: %s", e)
        raise HTTPException(status_code=500, detail="Erreur lors de la création")


@router.delete("/scheduled/{schedule_id}", status_code=204)
async def delete_scheduled_report(
    schedule_id: str,
    current_user: User = Depends(get_current_user)
):
    """Supprime un rapport planifié"""
    r = _get_redis()
    if not r:
        raise HTTPException(status_code=503, detail="Service temporairement indisponible")
    try:
        key = f"reports:scheduled:{current_user.tenant_id}"
        raw = r.get(key)
        schedules = json.loads(raw) if raw else []
        schedules = [s for s in schedules if s.get("id") != schedule_id]
        r.setex(key, 365 * 24 * 3600, json.dumps(schedules))
    except Exception as e:
        logger.error("Error deleting scheduled report: %s", e)


def _compute_next_run(
    frequency: str,
    start_date: Optional[str] = None,
    time_of_day: Optional[str] = None,
) -> str:
    """Calcule la prochaine exécution selon la fréquence.

    Si ``start_date`` (YYYY-MM-DD) est fourni ET dans le futur, c'est la
    première exécution. Sinon on calcule à partir d'aujourd'hui.
    ``time_of_day`` (HH:MM) est inclus dans le timestamp retourné pour que
    l'UI puisse afficher l'heure exacte (ex. « 08:00 le 30/06/2026 »).
    """
    from datetime import timedelta, datetime as _dt

    # Parse start_date if provided
    base: _dt
    if start_date:
        try:
            base = _dt.strptime(start_date, "%Y-%m-%d")
        except ValueError:
            base = _dt.utcnow()
    else:
        base = _dt.utcnow()

    # If the provided start is in the past, advance one period
    now = _dt.utcnow()
    if base <= now:
        delta_map = {
            "daily":     timedelta(days=1),
            "weekly":    timedelta(weeks=1),
            "monthly":   timedelta(days=30),
            "quarterly": timedelta(days=90),
        }
        base = now + delta_map.get(frequency, timedelta(days=30))

    # Attach time of day
    if time_of_day:
        try:
            hh, mm = time_of_day.split(":")
            base = base.replace(hour=int(hh), minute=int(mm), second=0, microsecond=0)
        except ValueError:
            pass
    return base.strftime("%Y-%m-%dT%H:%M:%S")


@router.get("/preview/{report_type}")
async def preview_report(
    report_type: str,
    year: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get preview data for report (metadata, not full PDF)"""

    VALID_TYPES = {"executive", "detailed", "csrd", "gri", "tcfd"}
    if report_type not in VALID_TYPES:
        raise HTTPException(status_code=400, detail=f"Type de rapport invalide: {report_type}")

    service = ReportService(db)

    try:
        data = await service._collect_data(
            tenant_id=current_user.tenant_id,
            organization_id=None,
            year=year
        )
        return {
            'report_type': report_type,
            'year': year or datetime.now().year,
            'stats': data['stats'],
            'data_points': {
                'environmental': len(data['entries']['environmental']),
                'social': len(data['entries']['social']),
                'governance': len(data['entries']['governance']),
            },
            'data_available': data['stats'].get('total_entries', 0) > 0,
        }
    except Exception as e:
        logger.warning("Report preview _collect_data failed for tenant %s: %s",
                       current_user.tenant_id, e)
        # Return empty but valid structure — never 500 for preview
        return {
            'report_type': report_type,
            'year': year or datetime.now().year,
            'stats': {'total_entries': 0, 'verified_count': 0, 'pending_count': 0},
            'data_points': {'environmental': 0, 'social': 0, 'governance': 0},
            'data_available': False,
        }


# ─── Multi-standards mapping ──────────────────────────────────────────────────

# Static ESRS catalog: 46 indicators mapped to GRI/CDP/TCFD/SDG.
# GRI coverage spans series 201-207 (economic), 301-308 (environment),
# 401-418 (social) plus universal standards (GRI 2) — broad enough to
# generate a GRI content index, not just the climate subset.
# 'cat_kw' and 'name_kw' are case-insensitive substrings matched against
# DataEntry.category and DataEntry.metric_name respectively.
# 'aggregate' = 'sum' (emissions) | 'latest' (rates/percentages/booleans)
_ESRS_CATALOG: List[Dict[str, Any]] = [
    # ── Environmental ────────────────────────────────────────────────────────
    {"esrs_code": "E1 / GHG-S1", "esrs_name": "Émissions GES Scope 1",
     "pillar": "E", "db_pillar": "environmental",
     "cat_kw": ["scope 1"], "name_kw": ["scope 1", "scope1", "direct"],
     "aggregate": "sum", "gri": "GRI 305-1", "cdp": "C6.1", "tcfd": "Metrics & Targets", "sdg": "SDG 13"},
    {"esrs_code": "E1 / GHG-S2", "esrs_name": "Émissions GES Scope 2",
     "pillar": "E", "db_pillar": "environmental",
     "cat_kw": ["scope 2"], "name_kw": ["scope 2", "scope2", "indirect"],
     "aggregate": "sum", "gri": "GRI 305-2", "cdp": "C6.3", "tcfd": "Metrics & Targets", "sdg": "SDG 13"},
    {"esrs_code": "E1 / GHG-S3", "esrs_name": "Émissions GES Scope 3",
     "pillar": "E", "db_pillar": "environmental",
     "cat_kw": ["scope 3"], "name_kw": ["scope 3", "scope3"],
     "aggregate": "sum", "gri": "GRI 305-3", "cdp": "C6.5", "tcfd": "Metrics & Targets", "sdg": "SDG 13"},
    {"esrs_code": "E1 / ENR-%", "esrs_name": "Part énergie renouvelable",
     "pillar": "E", "db_pillar": "environmental",
     "cat_kw": ["énergie", "energie", "energy"], "name_kw": ["renouvelable", "renewable", "enr"],
     "aggregate": "latest", "gri": "GRI 302-1", "cdp": "C8.2", "tcfd": "Metrics & Targets", "sdg": "SDG 7"},
    {"esrs_code": "E1 / INT-C", "esrs_name": "Intensité carbone",
     "pillar": "E", "db_pillar": "environmental",
     "cat_kw": [], "name_kw": ["intensité carbone", "carbon intensity"],
     "aggregate": "latest", "gri": "GRI 305-4", "cdp": "C6.10", "tcfd": "Metrics & Targets", "sdg": "SDG 13"},
    {"esrs_code": "E2 / POL-AIR", "esrs_name": "Émissions polluants atmosphériques",
     "pillar": "E", "db_pillar": "environmental",
     "cat_kw": ["pollution", "air"], "name_kw": ["polluant", "nox", "sox", "pm2", "voc"],
     "aggregate": "sum", "gri": "GRI 305-7", "cdp": "C7.1", "tcfd": None, "sdg": "SDG 3"},
    {"esrs_code": "E3 / EAU-CONS", "esrs_name": "Consommation d'eau",
     "pillar": "E", "db_pillar": "environmental",
     "cat_kw": ["eau", "water"], "name_kw": ["consommation eau", "eau totale", "water consumption", "m3"],
     "aggregate": "sum", "gri": "GRI 303-5", "cdp": "W1.2", "tcfd": None, "sdg": "SDG 6"},
    {"esrs_code": "E3 / EAU-REC", "esrs_name": "Eau recyclée",
     "pillar": "E", "db_pillar": "environmental",
     "cat_kw": ["eau", "water"], "name_kw": ["recyclée", "recycle", "reused"],
     "aggregate": "sum", "gri": "GRI 303-3", "cdp": "W1.2b", "tcfd": None, "sdg": "SDG 6"},
    {"esrs_code": "E4 / BIO-SITE", "esrs_name": "Sites zones protégées",
     "pillar": "E", "db_pillar": "environmental",
     "cat_kw": ["biodiversité", "biodiversity"], "name_kw": ["zone protégée", "protected", "biodiversité", "natura"],
     "aggregate": "latest", "gri": "GRI 304-1", "cdp": "B1.1", "tcfd": "Risks", "sdg": "SDG 15"},
    {"esrs_code": "E5 / DEC-REC", "esrs_name": "Taux de recyclage déchets",
     "pillar": "E", "db_pillar": "environmental",
     "cat_kw": ["déchet", "dechet", "waste"], "name_kw": ["recyclage", "recycling", "recyclé"],
     "aggregate": "latest", "gri": "GRI 306-4", "cdp": "W5.2", "tcfd": None, "sdg": "SDG 12"},
    # ── Social ───────────────────────────────────────────────────────────────
    {"esrs_code": "S1 / EFF-TOT", "esrs_name": "Effectif total",
     "pillar": "S", "db_pillar": "social",
     "cat_kw": ["emploi"], "name_kw": ["effectif total", "etp", "headcount"],
     "aggregate": "latest", "gri": "GRI 102-8", "cdp": None, "tcfd": None, "sdg": "SDG 8"},
    {"esrs_code": "S1 / EFF-F", "esrs_name": "Part des femmes",
     "pillar": "S", "db_pillar": "social",
     "cat_kw": ["diversité", "diversite"], "name_kw": ["femme", "women", "gender"],
     "aggregate": "latest", "gri": "GRI 405-1", "cdp": None, "tcfd": None, "sdg": "SDG 5"},
    {"esrs_code": "S1 / EFF-HAP", "esrs_name": "Écart salarial H/F",
     "pillar": "S", "db_pillar": "social",
     "cat_kw": ["diversité", "rémunération", "remuneration"], "name_kw": ["écart salari", "gender pay", "h/f", "egalité"],
     "aggregate": "latest", "gri": "GRI 405-2", "cdp": None, "tcfd": None, "sdg": "SDG 5"},
    {"esrs_code": "S1 / EFF-TF", "esrs_name": "Taux fréquence accidents",
     "pillar": "S", "db_pillar": "social",
     "cat_kw": ["santé", "sante", "sécurité", "securite"], "name_kw": ["accident", "fréquence", "taux fr", "injury"],
     "aggregate": "latest", "gri": "GRI 403-9", "cdp": None, "tcfd": None, "sdg": "SDG 3"},
    {"esrs_code": "S1 / FORM-H", "esrs_name": "Heures formation/salarié",
     "pillar": "S", "db_pillar": "social",
     "cat_kw": ["formation", "training"], "name_kw": ["heure", "hour", "formation"],
     "aggregate": "latest", "gri": "GRI 404-1", "cdp": None, "tcfd": None, "sdg": "SDG 4"},
    {"esrs_code": "S1 / EFF-TUR", "esrs_name": "Taux de turnover",
     "pillar": "S", "db_pillar": "social",
     "cat_kw": ["emploi", "rh"], "name_kw": ["turnover", "rotation", "attrition"],
     "aggregate": "latest", "gri": "GRI 401-1", "cdp": None, "tcfd": None, "sdg": "SDG 8"},
    # NB: les templates sectoriels sèment les données fournisseurs sous le pilier
    # governance — on cherche donc dans les deux piliers (db_pillar accepte une liste).
    {"esrs_code": "S2 / CHV-AUD", "esrs_name": "Audits fournisseurs droits humains",
     "pillar": "S", "db_pillar": ["social", "governance"],
     "cat_kw": [], "name_kw": ["fournisseurs audités", "audit fournisseur", "audits fournisseurs",
                               "droits humains", "supplier audit", "human rights"],
     "aggregate": "latest", "gri": "GRI 414-2", "cdp": None, "tcfd": None, "sdg": "SDG 10"},
    # ── Governance ───────────────────────────────────────────────────────────
    {"esrs_code": "G1 / ANTI-COR", "esrs_name": "Politique anti-corruption",
     "pillar": "G", "db_pillar": "governance",
     "cat_kw": ["éthique", "ethique"], "name_kw": ["anti-corruption", "anticorruption", "corruption"],
     "aggregate": "latest", "gri": "GRI 205-1", "cdp": None, "tcfd": "Governance", "sdg": "SDG 16"},
    {"esrs_code": "G1 / COMP", "esrs_name": "Formation compliance",
     "pillar": "G", "db_pillar": "governance",
     "cat_kw": ["éthique", "ethique", "compliance"], "name_kw": ["compliance", "conformité", "formation éthique"],
     "aggregate": "latest", "gri": "GRI 205-2", "cdp": None, "tcfd": "Governance", "sdg": "SDG 16"},
    {"esrs_code": "G1 / RISK", "esrs_name": "Processus gestion des risques ESG",
     "pillar": "G", "db_pillar": "governance",
     "cat_kw": ["risque", "risk"], "name_kw": ["risque esg", "risk management", "gestion risque"],
     "aggregate": "latest", "gri": "GRI 102-30", "cdp": "C1.1", "tcfd": "Risk Management", "sdg": "SDG 17"},
    {"esrs_code": "G1 / DIV-CA", "esrs_name": "Diversité Conseil d'administration",
     "pillar": "G", "db_pillar": "governance",
     "cat_kw": ["gouvernance"], "name_kw": ["administrateur", "conseil", "board", "indépendant"],
     "aggregate": "latest", "gri": "GRI 405-1", "cdp": None, "tcfd": "Governance", "sdg": "SDG 5"},
    # ── Extension GRI — Environnement (séries 301/302/303/306/308) ──────────
    {"esrs_code": "E1 / ENE-TOT", "esrs_name": "Consommation totale d'énergie",
     "pillar": "E", "db_pillar": "environmental",
     "cat_kw": [], "name_kw": ["consommation d'électricité", "consommation électricité", "électricité totale",
                               "énergie totale", "consommation totale d'énergie", "electricity consumption", "energy consumption"],
     "aggregate": "sum", "gri": "GRI 302-1", "cdp": "C8.2", "tcfd": "Metrics & Targets", "sdg": "SDG 7"},
    {"esrs_code": "E1 / INT-E", "esrs_name": "Intensité énergétique",
     "pillar": "E", "db_pillar": "environmental",
     "cat_kw": [], "name_kw": ["intensité énergétique", "energy intensity", "kwh/m²", "kwh/m2"],
     "aggregate": "latest", "gri": "GRI 302-3", "cdp": None, "tcfd": "Metrics & Targets", "sdg": "SDG 7"},
    {"esrs_code": "E3 / EAU-STRESS", "esrs_name": "Eau prélevée en zones de stress hydrique",
     "pillar": "E", "db_pillar": "environmental",
     "cat_kw": [], "name_kw": ["stress hydrique", "water stress"],
     "aggregate": "sum", "gri": "GRI 303-3", "cdp": "W4.1", "tcfd": "Risks", "sdg": "SDG 6"},
    {"esrs_code": "E3 / EAU-REJ", "esrs_name": "Rejets d'eau (effluents)",
     "pillar": "E", "db_pillar": "environmental",
     "cat_kw": [], "name_kw": ["rejets d'eau", "rejet eau", "effluent", "water discharge"],
     "aggregate": "sum", "gri": "GRI 303-4", "cdp": "W1.2", "tcfd": None, "sdg": "SDG 6"},
    {"esrs_code": "E5 / DEC-TOT", "esrs_name": "Déchets totaux générés",
     "pillar": "E", "db_pillar": "environmental",
     "cat_kw": [], "name_kw": ["déchets totaux", "déchets générés", "total waste", "déchets industriels",
                               "e-waste", "déchets électroniques"],
     "aggregate": "sum", "gri": "GRI 306-3", "cdp": "W5.1", "tcfd": None, "sdg": "SDG 12"},
    {"esrs_code": "E5 / DEC-DAN", "esrs_name": "Déchets dangereux générés",
     "pillar": "E", "db_pillar": "environmental",
     "cat_kw": [], "name_kw": ["déchets dangereux", "hazardous waste"],
     "aggregate": "sum", "gri": "GRI 306-3", "cdp": "W5.1a", "tcfd": None, "sdg": "SDG 12"},
    {"esrs_code": "E5 / MAT-PREM", "esrs_name": "Matières premières utilisées",
     "pillar": "E", "db_pillar": "environmental",
     "cat_kw": [], "name_kw": ["matières premières", "matériaux utilisés", "raw materials"],
     "aggregate": "sum", "gri": "GRI 301-1", "cdp": None, "tcfd": None, "sdg": "SDG 12"},
    # ── Extension GRI — Social (séries 202/401/403/406/413/414/416/418 + GRI 2) ─
    {"esrs_code": "S1 / EMB-NEW", "esrs_name": "Nouvelles embauches",
     "pillar": "S", "db_pillar": "social",
     "cat_kw": [], "name_kw": ["embauche", "nouvelles recrues", "new hires", "recrutement"],
     "aggregate": "sum", "gri": "GRI 401-1", "cdp": None, "tcfd": None, "sdg": "SDG 8"},
    {"esrs_code": "S1 / CONG-PAR", "esrs_name": "Retour de congé parental",
     "pillar": "S", "db_pillar": "social",
     "cat_kw": [], "name_kw": ["congé parental", "parental leave"],
     "aggregate": "latest", "gri": "GRI 401-3", "cdp": None, "tcfd": None, "sdg": "SDG 5"},
    {"esrs_code": "S1 / CONV-COLL", "esrs_name": "Couverture par convention collective",
     "pillar": "S", "db_pillar": "social",
     "cat_kw": [], "name_kw": ["convention collective", "collective bargaining"],
     "aggregate": "latest", "gri": "GRI 2-30", "cdp": None, "tcfd": None, "sdg": "SDG 8"},
    {"esrs_code": "S1 / MAL-PRO", "esrs_name": "Maladies professionnelles",
     "pillar": "S", "db_pillar": "social",
     "cat_kw": [], "name_kw": ["maladie professionnelle", "occupational disease"],
     "aggregate": "sum", "gri": "GRI 403-10", "cdp": None, "tcfd": None, "sdg": "SDG 3"},
    {"esrs_code": "S1 / DECES", "esrs_name": "Décès liés au travail",
     "pillar": "S", "db_pillar": "social",
     "cat_kw": [], "name_kw": ["décès", "fatalit"],
     "aggregate": "sum", "gri": "GRI 403-9", "cdp": None, "tcfd": None, "sdg": "SDG 3"},
    {"esrs_code": "S1 / DISCRIM", "esrs_name": "Incidents de discrimination",
     "pillar": "S", "db_pillar": "social",
     "cat_kw": [], "name_kw": ["discrimination"],
     "aggregate": "sum", "gri": "GRI 406-1", "cdp": None, "tcfd": None, "sdg": "SDG 10"},
    {"esrs_code": "S1 / SAL-MIN", "esrs_name": "Ratio salaire d'entrée / salaire minimum",
     "pillar": "S", "db_pillar": "social",
     "cat_kw": [], "name_kw": ["salaire d'entrée", "smic", "minimum wage", "salaire minimum"],
     "aggregate": "latest", "gri": "GRI 202-1", "cdp": None, "tcfd": None, "sdg": "SDG 1"},
    {"esrs_code": "S2 / CHV-SOC", "esrs_name": "Fournisseurs évalués sur critères sociaux",
     "pillar": "S", "db_pillar": ["social", "governance"],
     "cat_kw": [], "name_kw": ["fournisseurs évalués", "critères sociaux", "social screening", "code de conduite"],
     "aggregate": "latest", "gri": "GRI 414-1", "cdp": None, "tcfd": None, "sdg": "SDG 10"},
    {"esrs_code": "S3 / COMM-LOC", "esrs_name": "Programmes communautés locales",
     "pillar": "S", "db_pillar": "social",
     "cat_kw": [], "name_kw": ["communauté locale", "mécénat", "local communit"],
     "aggregate": "latest", "gri": "GRI 413-1", "cdp": None, "tcfd": None, "sdg": "SDG 11"},
    {"esrs_code": "S4 / SEC-PROD", "esrs_name": "Incidents sécurité produits",
     "pillar": "S", "db_pillar": "social",
     "cat_kw": [], "name_kw": ["sécurité produit", "rappel", "product safety", "pharmacovigilance"],
     "aggregate": "sum", "gri": "GRI 416-2", "cdp": None, "tcfd": None, "sdg": "SDG 12"},
    {"esrs_code": "S4 / DATA-PRIV", "esrs_name": "Violations de données personnelles",
     "pillar": "S", "db_pillar": "social",
     "cat_kw": [], "name_kw": ["violation de données", "fuite de données", "data breach", "cnil"],
     "aggregate": "sum", "gri": "GRI 418-1", "cdp": None, "tcfd": None, "sdg": "SDG 16"},
    # ── Extension GRI — Gouvernance & économique (séries 201/205/206/207/308/415 + GRI 2) ─
    {"esrs_code": "G1 / COR-COND", "esrs_name": "Condamnations pour corruption",
     "pillar": "G", "db_pillar": "governance",
     "cat_kw": [], "name_kw": ["condamnation", "corruption avérée", "amende corruption", "amendes liées à la corruption"],
     "aggregate": "sum", "gri": "GRI 205-3", "cdp": None, "tcfd": "Governance", "sdg": "SDG 16"},
    {"esrs_code": "G1 / ANTI-CONC", "esrs_name": "Actions anti-concurrentielles",
     "pillar": "G", "db_pillar": "governance",
     "cat_kw": [], "name_kw": ["anti-concurrentiel", "antitrust", "pratique concurrence"],
     "aggregate": "sum", "gri": "GRI 206-1", "cdp": None, "tcfd": None, "sdg": "SDG 16"},
    {"esrs_code": "G1 / POL-CONTRIB", "esrs_name": "Contributions politiques",
     "pillar": "G", "db_pillar": "governance",
     "cat_kw": [], "name_kw": ["contribution politique", "political contribution", "lobbying"],
     "aggregate": "sum", "gri": "GRI 415-1", "cdp": None, "tcfd": None, "sdg": "SDG 16"},
    {"esrs_code": "G1 / REM-RATIO", "esrs_name": "Ratio rémunération dirigeant / médiane",
     "pillar": "G", "db_pillar": "governance",
     "cat_kw": [], "name_kw": ["ratio rémunération", "pay ratio", "rémunération dirigeant"],
     "aggregate": "latest", "gri": "GRI 2-21", "cdp": None, "tcfd": "Governance", "sdg": "SDG 10"},
    {"esrs_code": "G1 / ECO-VAL", "esrs_name": "Valeur économique distribuée",
     "pillar": "G", "db_pillar": "governance",
     "cat_kw": [], "name_kw": ["valeur économique", "economic value", "valeur ajoutée distribuée"],
     "aggregate": "latest", "gri": "GRI 201-1", "cdp": None, "tcfd": None, "sdg": "SDG 8"},
    {"esrs_code": "G1 / TAX-PAYS", "esrs_name": "Impôts payés",
     "pillar": "G", "db_pillar": "governance",
     "cat_kw": [], "name_kw": ["impôts payés", "impôt sociétés", "taxes paid"],
     "aggregate": "sum", "gri": "GRI 207-4", "cdp": None, "tcfd": None, "sdg": "SDG 16"},
    {"esrs_code": "G1 / CHV-ENV", "esrs_name": "Fournisseurs évalués sur critères environnementaux",
     "pillar": "G", "db_pillar": "governance",
     "cat_kw": [], "name_kw": ["fournisseurs évalués sur critères environnementaux", "environmental screening",
                               "fournisseur environnement"],
     "aggregate": "latest", "gri": "GRI 308-1", "cdp": None, "tcfd": None, "sdg": "SDG 12"},
]


def _kw_match(text: str, keywords: List[str]) -> bool:
    """Case-insensitive substring match."""
    t = (text or "").lower()
    return any(kw.lower() in t for kw in keywords)


def _format_value(val: float, unit: str) -> str:
    """Format a numeric value for display."""
    unit = (unit or "").strip()
    if val is None:
        return None
    if val >= 1_000_000:
        return f"{val / 1_000_000:.2f} M {unit}".strip()
    if val >= 1_000:
        return f"{val:,.0f} {unit}".strip()
    if "%" in unit or val < 100:
        return f"{val:.1f} {unit}".strip()
    return f"{val:.0f} {unit}".strip()


@router.get("/multi-standards")
async def get_multi_standards_mapping(
    year: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _gate: None = Depends(require_feature("multi_standard")),
):
    """
    Retourne les 46 indicateurs ESRS mappés vers GRI/CDP/TCFD/SDG,
    enrichis avec les vraies valeurs de la base de données du tenant.
    """
    target_year = year or datetime.now().year

    # ── Fetch all DataEntry for this tenant + year range ──────────────────
    try:
        q = select(DataEntry).where(DataEntry.tenant_id == current_user.tenant_id)
        q = q.where(
            extract('year', DataEntry.period_start).in_([target_year, target_year - 1])
        )
        result = await db.execute(q)
        all_entries = result.scalars().all()
    except Exception as e:
        logger.warning("multi-standards: DB query failed for tenant %s: %s",
                       current_user.tenant_id, e)
        all_entries = []

    # ── Match entries to each ESRS indicator ──────────────────────────────
    indicators = []
    for ind in _ESRS_CATALOG:
        # db_pillar : str ou liste de str (certaines données, ex. fournisseurs,
        # sont saisies sous des piliers différents selon la source)
        raw_pillar = ind["db_pillar"]
        db_pillars = raw_pillar if isinstance(raw_pillar, list) else [raw_pillar]
        cat_kw: List[str] = ind["cat_kw"]
        name_kw: List[str] = ind["name_kw"]

        # Filter entries by pillar + keyword match
        matched = [
            e for e in all_entries
            if (e.pillar or "").lower() in db_pillars
            and (
                _kw_match(e.category or "", cat_kw)
                or _kw_match(e.metric_name or "", name_kw)
            )
            and e.value_numeric is not None
        ]

        # Derive value
        value_str: Optional[str] = None
        if matched:
            nums = [e.value_numeric for e in matched if e.value_numeric is not None]
            unit = matched[-1].unit or ""
            if ind["aggregate"] == "sum":
                total = sum(nums)
                value_str = _format_value(total, unit)
            else:
                # latest: take the entry with the most recent period_start
                latest = max(matched, key=lambda e: e.period_start)
                value_str = _format_value(latest.value_numeric, latest.unit or "")
                # Append text value if no numeric
                if value_str is None and latest.value_text:
                    value_str = latest.value_text

        # Also try text-only entries if no numeric
        if value_str is None:
            text_matched = [
                e for e in all_entries
                if (e.pillar or "").lower() in db_pillars
                and (
                    _kw_match(e.category or "", cat_kw)
                    or _kw_match(e.metric_name or "", name_kw)
                )
                and e.value_text
            ]
            if text_matched:
                latest_text = max(text_matched, key=lambda e: e.period_start)
                value_str = latest_text.value_text

        # Derive status
        if value_str is not None:
            # verified if at least one entry is verified
            any_verified = any(
                (e.verification_status or "").lower() == "verified" for e in matched
            )
            status = "validated" if any_verified else "partial"
        else:
            status = "missing"

        indicators.append({
            "esrs_code": ind["esrs_code"],
            "esrs_name": ind["esrs_name"],
            "pillar": ind["pillar"],
            "value": value_str,
            "status": status,
            "gri": ind.get("gri"),
            "cdp": ind.get("cdp"),
            "tcfd": ind.get("tcfd"),
            "sdg": ind.get("sdg"),
            "matched_entries": len(matched),
        })

    # ── Compute coverage stats ────────────────────────────────────────────
    n = len(indicators)
    gri_cov = round(sum(1 for i in indicators if i["gri"]) / n * 100) if n else 0
    cdp_cov = round(sum(1 for i in indicators if i["cdp"]) / n * 100) if n else 0
    tcfd_cov = round(sum(1 for i in indicators if i["tcfd"]) / n * 100) if n else 0

    validated_count = sum(1 for i in indicators if i["status"] == "validated")
    partial_count = sum(1 for i in indicators if i["status"] == "partial")
    missing_count = sum(1 for i in indicators if i["status"] == "missing")

    return {
        "year": target_year,
        "indicators": indicators,
        "coverage": {
            "csrd": 100,
            "gri": gri_cov,
            "cdp": cdp_cov,
            "tcfd": tcfd_cov,
        },
        "summary": {
            "total": n,
            "validated": validated_count,
            "partial": partial_count,
            "missing": missing_count,
            "data_available": len(all_entries) > 0,
        },
    }


# ─── Narrative CSRD generation ────────────────────────────────────────────────

class NarrativeRequest(BaseModel):
    esrs_section: str          # E1, E2, S1, G1, etc.
    year: Optional[int] = None
    organization_name: Optional[str] = None
    language: str = "fr"


_ESRS_NARRATIVE_TEMPLATES: Dict[str, Dict] = {
    "E1": {
        "title": "Changement climatique (ESRS E1)",
        "intro": "Conformément à l'ESRS E1, {org} communique les informations relatives à la gestion des risques et opportunités liés au changement climatique pour l'exercice {year}.",
        "sections": [
            ("Gouvernance climatique", "Le Conseil d'administration et la Direction générale intègrent les enjeux climatiques dans leur processus de décision stratégique. Une revue annuelle des risques et opportunités liés au climat est conduite."),
            ("Stratégie de décarbonation", "L'organisation s'est fixé des objectifs de réduction de ses émissions de gaz à effet de serre alignés avec une trajectoire compatible 1,5°C. Un plan de transition est en cours d'élaboration."),
            ("Émissions GES", "Les émissions de gaz à effet de serre couvrent les Scopes 1 (émissions directes), 2 (énergie achetée) et 3 (chaîne de valeur). Les facteurs d'émission ADEME et GHG Protocol sont appliqués."),
            ("Gestion des risques climatiques", "Une analyse des risques physiques (inondations, chaleur extrême) et des risques de transition (réglementation carbone, changements de marché) est réalisée annuellement."),
        ],
        "data_fields": ["scope1", "scope2", "scope3", "energie_renouvelable"],
        "metrics_label": "Indicateurs quantitatifs Scope 1/2/3",
    },
    "E2": {
        "title": "Pollution (ESRS E2)",
        "intro": "{org} rend compte de ses impacts sur la pollution de l'air, de l'eau et des sols pour l'exercice {year}, conformément à l'ESRS E2.",
        "sections": [
            ("Politique de prévention", "L'organisation applique une politique de prévention de la pollution couvrant les émissions dans l'air, les rejets dans l'eau et la contamination des sols."),
            ("Substances préoccupantes", "Un inventaire des substances chimiques utilisées est maintenu. Les substances extrêmement préoccupantes (SVHC) font l'objet d'un plan de substitution."),
        ],
        "data_fields": ["rejets_eau", "emissions_polluants", "dechets_dangereux"],
        "metrics_label": "Indicateurs pollution",
    },
    "E3": {
        "title": "Ressources hydriques et marines (ESRS E3)",
        "intro": "{org} communique sur sa gestion de l'eau et des ressources marines pour l'exercice {year}, conformément à l'ESRS E3.",
        "sections": [
            ("Gestion de l'eau", "L'organisation suit ses consommations d'eau par site et met en œuvre des mesures de réduction, notamment dans les zones de stress hydrique."),
            ("Qualité des rejets", "Les eaux usées industrielles sont traitées avant rejet. La qualité des effluents est contrôlée régulièrement."),
        ],
        "data_fields": ["consommation_eau", "rejets_eau_traites"],
        "metrics_label": "Indicateurs eau",
    },
    "E4": {
        "title": "Biodiversité et écosystèmes (ESRS E4)",
        "intro": "{org} rend compte de ses impacts et dépendances vis-à-vis de la biodiversité et des écosystèmes pour {year}, conformément à l'ESRS E4.",
        "sections": [
            ("Évaluation des impacts", "Une cartographie des sites opérationnels proches de zones protégées ou de haute valeur de biodiversité est réalisée."),
            ("Plan d'action biodiversité", "Des mesures de compensation et de restauration écologique sont intégrées dans les projets d'infrastructure."),
        ],
        "data_fields": ["surfaces_artificialisees", "sites_proteges"],
        "metrics_label": "Indicateurs biodiversité",
    },
    "E5": {
        "title": "Utilisation des ressources et économie circulaire (ESRS E5)",
        "intro": "{org} communique sur son approche de l'économie circulaire et de l'utilisation responsable des ressources pour {year}, conformément à l'ESRS E5.",
        "sections": [
            ("Gestion des déchets", "L'organisation suit les flux de déchets par catégorie (valorisés, recyclés, éliminés). L'objectif est d'atteindre un taux de valorisation supérieur à 80%."),
            ("Circularité des matières", "Des démarches d'éco-conception et de réutilisation des matières premières sont intégrées dans les processus de production."),
        ],
        "data_fields": ["dechets_produits", "taux_recyclage", "matieres_recyclees"],
        "metrics_label": "Indicateurs déchets & circularité",
    },
    "S1": {
        "title": "Effectifs propres (ESRS S1)",
        "intro": "Conformément à l'ESRS S1, {org} communique les informations relatives à ses effectifs propres pour l'exercice {year}.",
        "sections": [
            ("Conditions de travail", "L'organisation s'engage à offrir des conditions de travail dignes, incluant une rémunération équitable, des horaires respectueux et un environnement sûr."),
            ("Diversité et égalité", "Une politique de diversité et d'inclusion est en vigueur. Des objectifs de parité sont suivis au niveau du management."),
            ("Santé et sécurité", "Le taux de fréquence des accidents du travail (TF1) et le taux de gravité sont suivis mensuellement. Des actions préventives sont mises en œuvre."),
            ("Formation et développement", "Chaque salarié bénéficie en moyenne de N heures de formation par an. Des parcours de développement des compétences sont proposés."),
        ],
        "data_fields": ["effectif_total", "taux_accidents", "parité", "heures_formation"],
        "metrics_label": "Indicateurs RH & social",
    },
    "S2": {
        "title": "Travailleurs dans la chaîne de valeur (ESRS S2)",
        "intro": "{org} rend compte des impacts sur les travailleurs de sa chaîne d'approvisionnement pour {year}, conformément à l'ESRS S2.",
        "sections": [
            ("Évaluation des fournisseurs", "Les fournisseurs critiques font l'objet d'une évaluation ESG annuelle via questionnaire et/ou audit sur site. Un programme de vigilance renforcée est appliqué aux fournisseurs à risque."),
            ("Plan de vigilance", "Conformément à la loi française sur le devoir de vigilance (2017), un plan de vigilance est établi et mis à jour annuellement."),
        ],
        "data_fields": ["fournisseurs_evalues", "score_moyen_fournisseurs"],
        "metrics_label": "Indicateurs supply chain",
    },
    "G1": {
        "title": "Conduite des affaires (ESRS G1)",
        "intro": "Conformément à l'ESRS G1, {org} communique sur sa gouvernance, son éthique et ses pratiques de conduite des affaires pour l'exercice {year}.",
        "sections": [
            ("Gouvernance d'entreprise", "Le Conseil d'administration veille à l'intégration des enjeux de durabilité dans la stratégie. Sa composition et ses processus de décision respectent les principes d'indépendance et de diversité."),
            ("Lutte contre la corruption", "Une politique anticorruption conforme à la loi Sapin II est en vigueur. Des formations sont dispensées aux collaborateurs exposés."),
            ("Protection des lanceurs d'alerte", "Un dispositif d'alerte professionnelle (whistleblowing) conforme à la directive européenne est opérationnel."),
            ("Conformité fiscale", "L'organisation respecte ses obligations fiscales dans tous les pays où elle opère et ne recourt pas à des dispositifs d'optimisation fiscale agressive."),
        ],
        "data_fields": ["pct_independants_ca", "formations_ethique", "alertes_recues"],
        "metrics_label": "Indicateurs gouvernance",
    },
}


@router.get("/ixbrl-preview", include_in_schema=False)
async def ixbrl_preview(
    year: int = 2025,
    organization_id: Optional[UUID] = None,
    sections: Optional[str] = None,  # comma-separated: "E1,S1,G1"
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate an iXBRL/ESEF document covering one or more ESRS sections.

    Uses the production EFRAG ESRS XBRL Taxonomy (2024-12-31) namespace and the
    ESGflow concept catalog to tag values in-line. The document is regulator-
    ready in structure; for ESEF deposit it should still be validated through
    Arelle loaded with the official EFRAG taxonomy package.

    Query parameters
    ----------------
    sections : optional comma-separated list of ESRS section codes
               (``E1,S1,G1``). Defaults to all sections that have at least
               one fact matched from the tenant's data.
    """
    from app.services.ixbrl_service import iXBRLService
    svc = iXBRLService(db)

    section_list: Optional[List[str]] = None
    if sections:
        section_list = [s.strip().upper() for s in sections.split(",") if s.strip()]

    try:
        content = await svc.generate_report(
            tenant_id=current_user.tenant_id,
            organization_id=organization_id,
            year=year,
            sections=section_list,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Génération iXBRL impossible : {exc}")

    suffix = "_".join(section_list).lower() if section_list else "all"
    filename = f"esrs_{suffix}_{year}.xhtml"
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/xhtml+xml",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


@router.get("/ixbrl/catalog")
async def ixbrl_catalog(
    current_user: User = Depends(get_current_user),
):
    """Return the ESRS XBRL concept catalog used by the iXBRL generator.

    The frontend Tagging UI consumes this to build its concept picker so
    that backend and frontend stay in sync. Also exposes the official
    EFRAG namespace and unit definitions.
    """
    from app.services.esrs_taxonomy import (
        all_concepts, list_sections, UNIT_DEFINITIONS,
        ESRS_NS, ESRS_SCHEMA_REF,
    )
    return {
        "taxonomy": {
            "namespace": ESRS_NS,
            "schema_ref": ESRS_SCHEMA_REF,
            "version": "2024-12-31",
            "source": "EFRAG ESRS XBRL Taxonomy",
        },
        "sections": list_sections(),
        "units": UNIT_DEFINITIONS,
        "concepts": [c.to_dict() for c in all_concepts()],
    }


@router.get("/ixbrl/mapping-evidence", include_in_schema=False)
async def ixbrl_mapping_evidence(
    organization_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Auditor-facing mapping evidence (ESGflow metric → ESRS concept).

    Returns the JSON companion document that auditors should attach to the
    iXBRL deposit to trace fact provenance — required by ISAE 3000 for
    "reasonable assurance" engagements.
    """
    from app.services.ixbrl_service import iXBRLService
    svc = iXBRLService(db)
    try:
        content = await svc.get_mapping_evidence(
            tenant_id=current_user.tenant_id,
            organization_id=organization_id,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Génération mapping impossible : {exc}")
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/json",
        headers={"Content-Disposition": 'attachment; filename="esrs_mapping_evidence.json"'},
    )


@router.post("/ixbrl/validate")
async def ixbrl_validate(
    organization_id: Optional[UUID] = None,
    sections: Optional[str] = None,          # comma-separated: "E1,S1,G1"
    run_arelle: bool = True,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Validate an iXBRL/ESEF document against three layers:

    - **Layer 1 — Structural** : XML well-formedness, required namespaces,
      iXBRL element presence, context definitions.
    - **Layer 2 — Semantic** : ESRS mandatory concept check against the
      EFRAG concept catalog; unknown concept detection.
    - **Layer 3 — Arelle** : Full XSD validation via Arelle CLI loaded with
      the official EFRAG taxonomy (only if arelle-release is installed).

    The report is first generated on-the-fly from the tenant's data, then
    passed through the validation pipeline. Results include a structured
    list of issues (errors / warnings / infos) per layer.
    """
    from app.services.ixbrl_service import iXBRLService
    from app.services.arelle_validation_service import validate_ixbrl

    # 1. Generate the iXBRL document from tenant data
    svc = iXBRLService(db)
    section_list: Optional[List[str]] = None
    if sections:
        section_list = [s.strip().upper() for s in sections.split(",") if s.strip()]

    try:
        content = await svc.generate_report(
            tenant_id=current_user.tenant_id,
            organization_id=organization_id,
            sections=section_list,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Génération iXBRL impossible avant validation : {exc}",
        )

    # 2. Validate
    try:
        report = await validate_ixbrl(
            raw=content,
            sections=section_list,
            run_arelle=run_arelle,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la validation : {exc}",
        )

    return report.to_dict()


@router.post("/ixbrl/validate-upload")
async def ixbrl_validate_upload(
    file: bytes = None,
    sections: Optional[str] = None,
    run_arelle: bool = True,
    current_user: User = Depends(get_current_user),
):
    """
    Validate an iXBRL file uploaded directly by the user.
    Accepts raw XHTML/iXBRL bytes (max 10 MB).
    Same three-layer validation as /ixbrl/validate.
    """
    from app.services.arelle_validation_service import validate_ixbrl
    from fastapi import UploadFile, File
    raise HTTPException(
        status_code=501,
        detail="Upload validation — utilisez POST /ixbrl/validate avec generation auto.",
    )


@router.post("/generate-narrative")
async def generate_esrs_narrative(
    req: NarrativeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _gate: None = Depends(require_feature("ai_narrative")),
):
    """
    Génère un texte narratif ESRS-conforme pour une section donnée (E1, S1, G1…)
    en utilisant les données réelles du tenant. Prêt à copier-coller dans le rapport CSRD.
    """
    section = req.esrs_section.upper()
    tpl = _ESRS_NARRATIVE_TEMPLATES.get(section)
    if not tpl:
        raise HTTPException(status_code=404, detail=f"Section ESRS inconnue : {section}")

    year = req.year or datetime.now().year
    org_name = req.organization_name or "L'organisation"

    # Fetch real metrics for this section
    try:
        q = select(
            DataEntry.metric_name, DataEntry.value_numeric, DataEntry.unit
        ).where(
            DataEntry.tenant_id == current_user.tenant_id,
            extract("year", DataEntry.period_start) == year,
        )
        result = await db.execute(q)
        entries = result.fetchall()
        metrics_data: List[Dict] = [
            {"metric": r[0], "value": r[1], "unit": r[2]}
            for r in entries if r[1] is not None
        ]
    except Exception:
        metrics_data = []

    # Filter metrics relevant to this section (keyword match on data_fields)
    section_kws = tpl["data_fields"]
    relevant = [
        m for m in metrics_data
        if any(kw.lower() in (m["metric"] or "").lower() for kw in section_kws)
    ]

    # Build narrative text
    intro = tpl["intro"].format(org=org_name, year=year)
    body_parts = [f"## {tpl['title']}\n\n{intro}\n"]

    for subtitle, paragraph in tpl["sections"]:
        body_parts.append(f"### {subtitle}\n{paragraph}\n")

    if relevant:
        body_parts.append(f"### {tpl['metrics_label']} ({year})")
        for m in relevant[:10]:
            val = f"{m['value']:,.2f} {m['unit'] or ''}".strip()
            body_parts.append(f"- **{m['metric']}** : {val}")

    narrative_text = "\n".join(body_parts)

    return {
        "section": section,
        "title": tpl["title"],
        "year": year,
        "organization": org_name,
        "narrative": narrative_text,
        "metrics_used": len(relevant),
        "total_metrics_available": len(metrics_data),
        "completeness": "high" if relevant else "template_only",
    }


# ════════════════════════════════════════════════════════════════════════════
# AI-Powered Narrative Generation (LLM)
# ════════════════════════════════════════════════════════════════════════════

@router.post("/generate-narrative-ai")
async def generate_esrs_narrative_ai(
    req: NarrativeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _gate: None = Depends(require_feature("ai_narrative")),
):
    """
    Génère un narratif CSRD/ESRS professionnel via IA (OpenAI).
    Utilise les données réelles du tenant pour produire un texte personnalisé,
    chiffré et prêt pour le rapport annuel.
    Fallback: template enrichi si OpenAI non disponible.
    """
    import os as _os

    section = req.esrs_section.upper()
    tpl = _ESRS_NARRATIVE_TEMPLATES.get(section)
    if not tpl:
        raise HTTPException(status_code=404, detail=f"Section ESRS inconnue : {section}")

    year = req.year or datetime.now().year
    org_name = req.organization_name or "L'organisation"

    # Fetch real metrics
    try:
        q = select(
            DataEntry.metric_name, DataEntry.value_numeric, DataEntry.unit
        ).where(
            DataEntry.tenant_id == current_user.tenant_id,
            extract("year", DataEntry.period_start) == year,
        )
        result = await db.execute(q)
        entries = result.fetchall()
        metrics_data = [
            {"metric": r[0], "value": float(r[1]) if r[1] is not None else None, "unit": r[2]}
            for r in entries if r[1] is not None
        ]
    except Exception:
        metrics_data = []

    section_kws = tpl["data_fields"]
    relevant = [
        m for m in metrics_data
        if any(kw.lower() in (m["metric"] or "").lower() for kw in section_kws)
    ]

    metrics_block = "\n".join(
        f"- {m['metric']}: {m['value']:,.2f} {m['unit'] or ''}" for m in relevant[:20]
    ) if relevant else "Aucune donnée quantitative disponible pour cette section."

    openai_key = _os.getenv("OPENAI_API_KEY")
    ai_used = False
    narrative_text = ""

    if openai_key:
        try:
            import httpx as _httpx

            system_prompt = (
                "Tu es un expert CSRD/ESRS et rédacteur de rapports de durabilité. "
                "Tu rédiges des narratifs professionnels, factuels, chiffrés, conformes aux normes ESRS. "
                "Style : rapport annuel d'entreprise — formel, structuré, avec des titres Markdown (##, ###). "
                "Cite toujours les métriques fournies avec leurs unités. "
                "Ajoute des recommandations concrètes en fin de section. "
                "Longueur : 400-600 mots. Langue : français."
            )

            user_prompt = (
                f"Rédige la section {section} ({tpl['title']}) du rapport CSRD pour "
                f"l'entreprise « {org_name} » pour l'année {year}.\n\n"
                f"Données disponibles :\n{metrics_block}\n\n"
                f"Structure requise :\n"
                f"1. Contexte et enjeux du {section}\n"
                f"2. Politiques et engagements de l'entreprise\n"
                f"3. Indicateurs clés et performance {year}\n"
                f"4. Actions menées et résultats\n"
                f"5. Objectifs et perspectives\n\n"
                f"Rédige un texte professionnel prêt pour le rapport annuel."
            )

            async with _httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {openai_key}"},
                    json={
                        "model": "gpt-4o-mini",
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                        "max_tokens": 1500,
                        "temperature": 0.4,
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    narrative_text = data["choices"][0]["message"]["content"]
                    ai_used = True
        except Exception as exc:
            logger.warning("AI narrative generation failed, falling back to template: %s", exc)

    if not ai_used:
        intro = tpl["intro"].format(org=org_name, year=year)
        body_parts = [f"## {tpl['title']}\n\n{intro}\n"]
        for subtitle, paragraph in tpl["sections"]:
            body_parts.append(f"### {subtitle}\n{paragraph}\n")
        if relevant:
            body_parts.append(f"### {tpl['metrics_label']} ({year})")
            for m in relevant[:10]:
                val = f"{m['value']:,.2f} {m['unit'] or ''}".strip()
                body_parts.append(f"- **{m['metric']}** : {val}")
        body_parts.append(
            "\n\n> *Ce narratif a été généré à partir d'un modèle ESRS. "
            "Pour un texte personnalisé par IA, configurez votre clé OpenAI.*"
        )
        narrative_text = "\n".join(body_parts)

    return {
        "section": section,
        "title": tpl["title"],
        "year": year,
        "organization": org_name,
        "narrative": narrative_text,
        "ai_generated": ai_used,
        "metrics_used": len(relevant),
        "total_metrics_available": len(metrics_data),
        "completeness": "ai_enhanced" if ai_used else ("data_enriched" if relevant else "template_only"),
    }


# ════════════════════════════════════════════════════════════════════════════
# Report History + Sharing
# ════════════════════════════════════════════════════════════════════════════

import secrets as _secrets


@router.get("/history")
async def list_report_history(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List recent generated reports for the current tenant."""
    from app.models.report_history import ReportHistory
    from sqlalchemy import desc

    stmt = (
        select(ReportHistory)
        .where(ReportHistory.tenant_id == current_user.tenant_id)
        .order_by(desc(ReportHistory.created_at))
        .limit(max(1, min(limit, 200)))
    )
    rows = (await db.execute(stmt)).scalars().all()

    items = []
    for r in rows:
        share_active = bool(
            r.share_token
            and (not r.share_expires_at or r.share_expires_at > datetime.now(r.share_expires_at.tzinfo) if r.share_expires_at else True)
        )
        items.append({
            "id": str(r.id),
            "report_type": r.report_type,
            "format": r.format,
            "period": r.period,
            "year": r.year,
            "organization_id": str(r.organization_id) if r.organization_id else None,
            "generated_by": str(r.generated_by) if r.generated_by else None,
            "file_size": r.file_size,
            "content_hash": r.content_hash,
            "version": r.version,
            "share_active": share_active,
            "share_token": r.share_token if share_active else None,
            "share_expires_at": r.share_expires_at.isoformat() if r.share_expires_at else None,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })
    return {"items": items, "count": len(items)}


@router.delete("/history/{entry_id}", status_code=204)
async def delete_report_history(
    entry_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a single history entry."""
    from app.models.report_history import ReportHistory
    stmt = select(ReportHistory).where(
        ReportHistory.id == entry_id,
        ReportHistory.tenant_id == current_user.tenant_id,
    )
    entry = (await db.execute(stmt)).scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="History entry not found")
    await db.delete(entry)
    await db.commit()
    return None


class ShareRequest(BaseModel):
    expires_in_hours: int = 72  # default 3 days


@router.post("/history/{entry_id}/share")
async def share_report(
    entry_id: UUID,
    body: ShareRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create or refresh a share token for an entry. Returns the public URL path.

    The token is a 32-byte URL-safe random string. The public download endpoint
    re-generates the report on demand (we don't store the file bytes).
    """
    from app.models.report_history import ReportHistory
    from datetime import timedelta, timezone

    stmt = select(ReportHistory).where(
        ReportHistory.id == entry_id,
        ReportHistory.tenant_id == current_user.tenant_id,
    )
    entry = (await db.execute(stmt)).scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="History entry not found")

    hours = max(1, min(body.expires_in_hours, 24 * 30))  # 1h to 30 days
    entry.share_token = _secrets.token_urlsafe(24)
    entry.share_expires_at = datetime.now(timezone.utc) + timedelta(hours=hours)
    await db.commit()
    await db.refresh(entry)

    return {
        "token": entry.share_token,
        "expires_at": entry.share_expires_at.isoformat(),
        "public_path": f"/api/v1/reports/shared/{entry.share_token}",
    }


@router.delete("/history/{entry_id}/share", status_code=204)
async def revoke_share(
    entry_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Revoke an active share token (immediate)."""
    from app.models.report_history import ReportHistory
    stmt = select(ReportHistory).where(
        ReportHistory.id == entry_id,
        ReportHistory.tenant_id == current_user.tenant_id,
    )
    entry = (await db.execute(stmt)).scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="History entry not found")
    entry.share_token = None
    entry.share_expires_at = None
    await db.commit()
    return None


@router.get("/shared/{token}", include_in_schema=False)
async def public_download(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """Public download of a shared report. Token must be active and unexpired."""
    from app.models.report_history import ReportHistory
    from datetime import timezone

    stmt = select(ReportHistory).where(ReportHistory.share_token == token)
    entry = (await db.execute(stmt)).scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Lien invalide ou expiré.")
    if entry.share_expires_at and entry.share_expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Ce lien de partage a expiré.")

    # Regenerate the report on demand
    service = ReportService(db)
    try:
        report_bytes = await service.generate_report(
            tenant_id=entry.tenant_id,
            report_type=entry.report_type,
            organization_id=entry.organization_id,
            period=entry.period,
            year=entry.year,
            format=entry.format,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Régénération impossible : {exc}")

    content_types = {
        'pdf':   'application/pdf',
        'excel': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'word':  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'json':  'application/json',
    }
    ext_map = {'excel': 'xlsx', 'word': 'docx', 'pdf': 'pdf', 'json': 'json'}
    ext = ext_map.get(entry.format, entry.format)
    filename = f"rapport_partage_{entry.report_type}_{entry.year or 'annual'}.{ext}"
    return StreamingResponse(
        io.BytesIO(report_bytes),
        media_type=content_types.get(entry.format, 'application/octet-stream'),
        headers={'Content-Disposition': f'attachment; filename="{filename}"'},
    )


# ════════════════════════════════════════════════════════════════════════════
# Report verification (audit-grade) — public endpoint, no JWT
# ════════════════════════════════════════════════════════════════════════════


class VerifyRequest(BaseModel):
    content_hash: str = Field(..., min_length=64, max_length=64)  # 64 hex chars
    history_id: Optional[UUID] = None


@router.post("/verify", include_in_schema=True)
async def verify_report_hash(
    body: VerifyRequest,
    db: AsyncSession = Depends(get_db),
):
    """Public verification endpoint. Anyone with a hash (and optionally the
    history_id) can confirm that a report was indeed produced by ESGflow for
    a given tenant on a given date. We return only non-identifying metadata.

    No JWT — by design. The hash is the proof.
    """
    from app.models.report_history import ReportHistory

    stmt = select(ReportHistory).where(ReportHistory.content_hash == body.content_hash)
    if body.history_id:
        stmt = stmt.where(ReportHistory.id == body.history_id)
    rh = (await db.execute(stmt)).scalar_one_or_none()
    if not rh:
        return {
            "valid": False,
            "message": "Aucun rapport ESGflow ne correspond à ce hash.",
        }

    return {
        "valid": True,
        "report_id": str(rh.id),
        "report_type": rh.report_type,
        "format": rh.format,
        "year": rh.year,
        "period": rh.period,
        "version": rh.version,
        "generated_at": rh.created_at.isoformat() if rh.created_at else None,
        "file_size_bytes": rh.file_size,
        "tenant_id": str(rh.tenant_id),  # not personal data — opaque UUID
        "content_hash": rh.content_hash,
        "message": "Rapport authentifié par ESGflow.",
    }


@router.get("/history/{entry_id}/verify-current")
async def verify_current_regeneration(
    entry_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Re-generate a historical report and check whether its hash still matches.

    A mismatch means underlying data has changed since the original generation
    (audit-grade signal: report values may no longer be reproducible).
    """
    import hashlib as _hashlib
    from app.models.report_history import ReportHistory

    stmt = select(ReportHistory).where(
        ReportHistory.id == entry_id,
        ReportHistory.tenant_id == current_user.tenant_id,
    )
    rh = (await db.execute(stmt)).scalar_one_or_none()
    if not rh:
        raise HTTPException(status_code=404, detail="Rapport introuvable.")
    if not rh.content_hash:
        raise HTTPException(status_code=400, detail="Aucun hash original — rapport antérieur à la fonctionnalité.")

    service = ReportService(db)
    try:
        bytes_now = await service.generate_report(
            tenant_id=rh.tenant_id,
            report_type=rh.report_type,
            organization_id=rh.organization_id,
            period=rh.period,
            year=rh.year,
            format=rh.format,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Régénération impossible : {exc}")

    new_hash = _hashlib.sha256(bytes_now or b"").hexdigest()
    matches = new_hash == rh.content_hash

    return {
        "report_id": str(rh.id),
        "original_hash": rh.content_hash,
        "current_hash":  new_hash,
        "matches":       matches,
        "message": (
            "Le rapport est intégralement reproductible — les données sous-jacentes n'ont pas changé."
            if matches else
            "ATTENTION : la régénération produit un hash différent. Les données sous-jacentes ont été modifiées depuis. Si vous avez besoin du rapport original, conservez-en une copie."
        ),
    }
