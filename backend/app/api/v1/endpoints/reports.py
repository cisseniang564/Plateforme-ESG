"""
Reports API - Generate ESG Reports
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, extract, or_, func
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4
from pydantic import BaseModel
import io
import json
import logging
from datetime import datetime

from app.dependencies import get_db, get_current_user
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


@router.post("/generate")
async def generate_report(
    request: ReportGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate ESG report and return as download"""
    
    service = ReportService(db)
    
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
        return StreamingResponse(
            io.BytesIO(report_bytes),
            media_type=content_type,
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"'
            }
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
            "next_run": _compute_next_run(payload.frequency),
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


def _compute_next_run(frequency: str) -> str:
    """Calcule la prochaine exécution selon la fréquence"""
    from datetime import timedelta
    delta_map = {
        "daily": timedelta(days=1),
        "weekly": timedelta(weeks=1),
        "monthly": timedelta(days=30),
        "quarterly": timedelta(days=90),
    }
    delta = delta_map.get(frequency, timedelta(days=30))
    return (datetime.utcnow() + delta).strftime("%Y-%m-%d")


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

# Static ESRS catalog: 21 indicators mapped to GRI/CDP/TCFD/SDG.
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
    {"esrs_code": "S2 / CHV-AUD", "esrs_name": "Audits fournisseurs droits humains",
     "pillar": "S", "db_pillar": "social",
     "cat_kw": ["fournisseur", "supply chain"], "name_kw": ["audit", "fournisseur", "droits"],
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
    current_user: User = Depends(get_current_user)
):
    """
    Retourne les 21 indicateurs ESRS mappés vers GRI/CDP/TCFD/SDG,
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
        db_pillar = ind["db_pillar"]
        cat_kw: List[str] = ind["cat_kw"]
        name_kw: List[str] = ind["name_kw"]

        # Filter entries by pillar + keyword match
        matched = [
            e for e in all_entries
            if (e.pillar or "").lower() == db_pillar
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
                if (e.pillar or "").lower() == db_pillar
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


@router.post("/generate-narrative")
async def generate_esrs_narrative(
    req: NarrativeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
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
