import json
import logging
import re
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Any, Dict, List, Optional
from datetime import datetime, date
from uuid import UUID
from pydantic import BaseModel, Field, field_validator

from app.config import settings
from app.dependencies import get_db, get_current_user
from app.models.materiality import MaterialityIssue, ESGRisk
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()

# ============= SCHEMAS =============

class MaterialityIssueCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: str
    financial_impact: float = Field(50.0, ge=0, le=100)
    esg_impact: float = Field(50.0, ge=0, le=100)
    stakeholders: Optional[str] = None
    data_sources: Optional[str] = None

class MaterialityIssueUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    financial_impact: Optional[float] = Field(None, ge=0, le=100)
    esg_impact: Optional[float] = Field(None, ge=0, le=100)
    stakeholders: Optional[str] = None
    data_sources: Optional[str] = None

class MaterialityIssueResponse(BaseModel):
    id: str | UUID
    name: str
    description: Optional[str]
    category: str
    financial_impact: float
    esg_impact: float
    is_material: bool
    priority: Optional[str]
    stakeholders: Optional[str]
    data_sources: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

def _coerce_target_date(v: Any) -> Optional[datetime]:
    if v is None or v == '':
        return None
    if isinstance(v, datetime):
        return v
    if isinstance(v, date):
        return datetime(v.year, v.month, v.day)
    if isinstance(v, str):
        # "YYYY-MM-DD" from HTML date input
        if len(v) == 10 and v[4] == '-':
            return datetime.fromisoformat(v + 'T00:00:00')
        return datetime.fromisoformat(v)
    return v

class ESGRiskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: str
    probability: int = Field(3, ge=1, le=5)
    impact: int = Field(3, ge=1, le=5)
    mitigation_plan: Optional[str] = None
    responsible_person: Optional[str] = None
    target_date: Optional[datetime] = None
    materiality_issue_id: Optional[str] = None

    @field_validator('target_date', mode='before')
    @classmethod
    def parse_target_date(cls, v: Any) -> Optional[datetime]:
        return _coerce_target_date(v)

class ESGRiskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    probability: Optional[int] = Field(None, ge=1, le=5)
    impact: Optional[int] = Field(None, ge=1, le=5)
    mitigation_plan: Optional[str] = None
    mitigation_status: Optional[str] = None
    responsible_person: Optional[str] = None
    target_date: Optional[datetime] = None
    status: Optional[str] = None

    @field_validator('target_date', mode='before')
    @classmethod
    def parse_target_date(cls, v: Any) -> Optional[datetime]:
        return _coerce_target_date(v)

class ESGRiskResponse(BaseModel):
    id: str | UUID
    title: str
    description: Optional[str]
    category: str
    probability: int
    impact: int
    risk_score: int
    severity: str
    status: str
    mitigation_plan: Optional[str]
    mitigation_status: Optional[str]
    responsible_person: Optional[str]
    target_date: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ============= MATERIALITY ENDPOINTS =============

@router.post("/issues", response_model=MaterialityIssueResponse)
async def create_materiality_issue(
    issue: MaterialityIssueCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new materiality issue"""
    
    # Calculate if material (threshold: both > 60)
    is_material = issue.financial_impact > 60 and issue.esg_impact > 60
    
    # Calculate priority
    avg_score = (issue.financial_impact + issue.esg_impact) / 2
    if avg_score >= 75:
        priority = "high"
    elif avg_score >= 50:
        priority = "medium"
    else:
        priority = "low"
    
    db_issue = MaterialityIssue(
        tenant_id=current_user.tenant_id,
        is_material=is_material,
        priority=priority,
        **issue.dict()
    )
    
    db.add(db_issue)
    await db.commit()
    await db.refresh(db_issue)
    
    return db_issue

@router.get("/issues", response_model=List[MaterialityIssueResponse])
async def get_materiality_issues(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all materiality issues"""
    result = await db.execute(
        select(MaterialityIssue).where(
            MaterialityIssue.tenant_id == current_user.tenant_id
        )
    )
    issues = result.scalars().all()
    
    return issues

@router.get("/issues/{issue_id}", response_model=MaterialityIssueResponse)
async def get_materiality_issue(
    issue_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific materiality issue"""
    result = await db.execute(
        select(MaterialityIssue).where(
            MaterialityIssue.id == issue_id,
            MaterialityIssue.tenant_id == current_user.tenant_id
        )
    )
    issue = result.scalar_one_or_none()
    
    if not issue:
        raise HTTPException(status_code=404, detail="Materiality issue not found")
    
    return issue

@router.put("/issues/{issue_id}", response_model=MaterialityIssueResponse)
async def update_materiality_issue(
    issue_id: str,
    issue_update: MaterialityIssueUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a materiality issue"""
    result = await db.execute(
        select(MaterialityIssue).where(
            MaterialityIssue.id == issue_id,
            MaterialityIssue.tenant_id == current_user.tenant_id
        )
    )
    db_issue = result.scalar_one_or_none()
    
    if not db_issue:
        raise HTTPException(status_code=404, detail="Materiality issue not found")
    
    update_data = issue_update.dict(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(db_issue, field, value)
    
    # Recalculate materiality
    if db_issue.financial_impact and db_issue.esg_impact:
        db_issue.is_material = db_issue.financial_impact > 60 and db_issue.esg_impact > 60
        avg_score = (db_issue.financial_impact + db_issue.esg_impact) / 2
        db_issue.priority = "high" if avg_score >= 75 else "medium" if avg_score >= 50 else "low"
    
    await db.commit()
    await db.refresh(db_issue)
    
    return db_issue

@router.delete("/issues/{issue_id}")
async def delete_materiality_issue(
    issue_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a materiality issue"""
    result = await db.execute(
        select(MaterialityIssue).where(
            MaterialityIssue.id == issue_id,
            MaterialityIssue.tenant_id == current_user.tenant_id
        )
    )
    db_issue = result.scalar_one_or_none()
    
    if not db_issue:
        raise HTTPException(status_code=404, detail="Materiality issue not found")
    
    await db.delete(db_issue)
    await db.commit()
    
    return {"message": "Materiality issue deleted"}

# ============= RISKS ENDPOINTS =============

@router.post("/risks", response_model=ESGRiskResponse)
async def create_risk(
    risk: ESGRiskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new ESG risk"""
    
    # Calculate risk score
    risk_score = risk.probability * risk.impact
    
    # Determine severity
    if risk_score >= 20:
        severity = "critical"
    elif risk_score >= 12:
        severity = "high"
    elif risk_score >= 6:
        severity = "medium"
    else:
        severity = "low"
    
    db_risk = ESGRisk(
        tenant_id=current_user.tenant_id,
        risk_score=risk_score,
        severity=severity,
        mitigation_status="not_started",
        status="active",
        **risk.dict()
    )
    
    db.add(db_risk)
    await db.commit()
    await db.refresh(db_risk)
    
    return db_risk

@router.get("/risks", response_model=List[ESGRiskResponse])
async def get_risks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all ESG risks"""
    result = await db.execute(
        select(ESGRisk).where(
            ESGRisk.tenant_id == current_user.tenant_id
        )
    )
    risks = result.scalars().all()
    
    return risks

@router.get("/risks/{risk_id}", response_model=ESGRiskResponse)
async def get_risk(
    risk_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific risk"""
    result = await db.execute(
        select(ESGRisk).where(
            ESGRisk.id == risk_id,
            ESGRisk.tenant_id == current_user.tenant_id
        )
    )
    risk = result.scalar_one_or_none()
    
    if not risk:
        raise HTTPException(status_code=404, detail="Risk not found")
    
    return risk

@router.put("/risks/{risk_id}", response_model=ESGRiskResponse)
async def update_risk(
    risk_id: str,
    risk_update: ESGRiskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a risk"""
    result = await db.execute(
        select(ESGRisk).where(
            ESGRisk.id == risk_id,
            ESGRisk.tenant_id == current_user.tenant_id
        )
    )
    db_risk = result.scalar_one_or_none()
    
    if not db_risk:
        raise HTTPException(status_code=404, detail="Risk not found")
    
    update_data = risk_update.dict(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(db_risk, field, value)
    
    # Recalculate risk score
    if db_risk.probability and db_risk.impact:
        db_risk.risk_score = db_risk.probability * db_risk.impact
        if db_risk.risk_score >= 20:
            db_risk.severity = "critical"
        elif db_risk.risk_score >= 12:
            db_risk.severity = "high"
        elif db_risk.risk_score >= 6:
            db_risk.severity = "medium"
        else:
            db_risk.severity = "low"
    
    await db.commit()
    await db.refresh(db_risk)
    
    return db_risk

@router.delete("/risks/{risk_id}")
async def delete_risk(
    risk_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a risk"""
    result = await db.execute(
        select(ESGRisk).where(
            ESGRisk.id == risk_id,
            ESGRisk.tenant_id == current_user.tenant_id
        )
    )
    db_risk = result.scalar_one_or_none()

    if not db_risk:
        raise HTTPException(status_code=404, detail="Risk not found")

    await db.delete(db_risk)
    await db.commit()

    return {"message": "Risk deleted"}


# ============= AI MITIGATION ENDPOINT =============

class AIMitigationRequest(BaseModel):
    """Request body for AI mitigation generation.

    `save=True` persists the generated plan in the risk's `mitigation_plan` field
    and updates `mitigation_status` to `in_progress`.
    """
    save: bool = False
    extra_context: Optional[str] = Field(
        None,
        description="Contexte additionnel libre fourni par l'utilisateur (secteur, contraintes).",
        max_length=1000,
    )


class AIMitigationAction(BaseModel):
    title: str
    detail: str
    effort: str  # low | medium | high
    timeline: str  # ex: "0-3 mois"


class AIMitigationResponse(BaseModel):
    risk_id: str
    summary: str
    actions: List[AIMitigationAction]
    kpis: List[str]
    estimated_residual_score: Optional[int] = None
    estimated_effort: str  # low | medium | high
    timeline: str
    source: str  # "openai" | "rule_based"
    saved: bool = False


# ─── OpenAI helper (mirrors ai_insights.py pattern, kept local to avoid a hard import dep) ──

def _get_openai_client():
    api_key = getattr(settings, "OPENAI_API_KEY", None)
    if not api_key:
        return None
    try:
        from openai import AsyncOpenAI
        return AsyncOpenAI(api_key=api_key)
    except ImportError:
        logger.warning("openai package not installed")
        return None


_MITIGATION_SYSTEM_PROMPT = (
    "Tu es un expert ESG (CSRD/ESRS, ISO 31000) spécialisé en gestion des risques. "
    "À partir d'un risque ESG décrit par l'utilisateur, tu produis un plan de mitigation "
    "structuré, concret et actionnable. Réponds en français. "
    "Tu DOIS répondre UNIQUEMENT par un JSON valide qui respecte le schéma suivant — "
    "AUCUN texte avant ou après le JSON :\n"
    '{\n'
    '  "summary": "résumé synthétique de la stratégie de mitigation (2-3 phrases)",\n'
    '  "actions": [\n'
    '    {"title": "...", "detail": "...", "effort": "low|medium|high", "timeline": "0-3 mois|3-6 mois|6-12 mois|>12 mois"}\n'
    '  ],\n'
    '  "kpis": ["KPI 1", "KPI 2", "KPI 3"],\n'
    '  "estimated_residual_score": entier 1-25,\n'
    '  "estimated_effort": "low|medium|high",\n'
    '  "timeline": "0-6 mois|6-12 mois|>12 mois"\n'
    '}\n'
    "4 à 6 actions priorisées. KPIs mesurables. Pas de promesse irréaliste."
)


def _strip_json(content: str) -> str:
    """Strip optional ```json fences around the LLM output."""
    if not content:
        return content
    txt = content.strip()
    if txt.startswith("```"):
        # ```json\n...\n``` or ```\n...\n```
        txt = re.sub(r"^```(?:json)?\s*", "", txt)
        txt = re.sub(r"\s*```$", "", txt)
    return txt.strip()


async def _call_openai_mitigation(risk: ESGRisk, extra_context: Optional[str]) -> Optional[Dict[str, Any]]:
    client = _get_openai_client()
    if client is None:
        return None
    try:
        prompt_lines = [
            f"Titre du risque : {risk.title}",
            f"Catégorie : {risk.category}",
            f"Description : {risk.description or '(non fournie)'}",
            f"Probabilité : {risk.probability}/5",
            f"Impact : {risk.impact}/5",
            f"Score actuel : {risk.risk_score}/25 (sévérité : {risk.severity or 'n/a'})",
        ]
        if extra_context:
            prompt_lines.append(f"Contexte additionnel : {extra_context}")
        prompt_lines.append(
            "\nGénère le plan de mitigation au format JSON strict décrit dans les instructions système."
        )
        model = getattr(settings, "OPENAI_MODEL", "gpt-4o-mini")
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": _MITIGATION_SYSTEM_PROMPT},
                {"role": "user", "content": "\n".join(prompt_lines)},
            ],
            max_tokens=900,
            temperature=0.3,
            response_format={"type": "json_object"},
        )
        raw = response.choices[0].message.content or ""
        parsed = json.loads(_strip_json(raw))
        # Sanity: required keys
        if not isinstance(parsed, dict) or "actions" not in parsed:
            return None
        return parsed
    except Exception as exc:
        logger.warning("AI mitigation OpenAI call failed: %s", exc)
        return None


# ─── Rule-based fallback ──────────────────────────────────────────────────────

_FALLBACK_LIBRARY = {
    "environmental": {
        "summary": (
            "Stratégie environnementale combinant la mesure rigoureuse de l'impact, "
            "la mise en place d'actions correctives chiffrées et l'engagement de la chaîne de valeur."
        ),
        "actions": [
            {"title": "Cartographier l'exposition", "detail": "Identifier les sites et processus les plus exposés via un diagnostic carbone/biodiversité/eau initial.", "effort": "low", "timeline": "0-3 mois"},
            {"title": "Définir un objectif chiffré", "detail": "Fixer un objectif de réduction (-X %/an) aligné SBTi ou TNFD, validé en CODIR.", "effort": "medium", "timeline": "0-3 mois"},
            {"title": "Déployer un plan d'action priorisé", "detail": "Lancer les 3 actions à plus fort effet de levier (efficacité énergétique, achats responsables, scope 3).", "effort": "high", "timeline": "3-6 mois"},
            {"title": "Engager fournisseurs clés", "detail": "Faire signer une charte ESG aux 10 fournisseurs majeurs et auditer 3 d'entre eux.", "effort": "medium", "timeline": "6-12 mois"},
            {"title": "Suivre et reporter", "detail": "Mettre à jour mensuellement le tableau de bord, publier l'avancement dans le rapport CSRD ESRS E.", "effort": "low", "timeline": "0-3 mois"},
        ],
        "kpis": [
            "Émissions GES (tCO2e) Scope 1+2 mensuelles",
            "% de réduction vs année de référence",
            "Couverture des fournisseurs sous engagement ESG (%)",
            "Conformité ESRS E (% d'indicateurs renseignés)",
        ],
    },
    "social": {
        "summary": (
            "Plan social structuré autour de la mesure des indicateurs RH, la prévention des risques humains "
            "et la formalisation des engagements via des politiques approuvées en CODIR."
        ),
        "actions": [
            {"title": "Audit social initial", "detail": "Calculer Index Égalité, taux de fréquence accidents, taux de formation et identifier les écarts vs benchmark sectoriel.", "effort": "low", "timeline": "0-3 mois"},
            {"title": "Politique RH formalisée", "detail": "Rédiger et faire approuver une politique RH/diversité par le CODIR, la publier en interne et en externe.", "effort": "medium", "timeline": "0-3 mois"},
            {"title": "Plan d'action correctif", "detail": "Déployer un plan correctif sur le Top 3 des écarts (égalité, sécurité, formation) avec un budget dédié.", "effort": "high", "timeline": "3-6 mois"},
            {"title": "Dialogue social renforcé", "detail": "Mettre en place une instance mensuelle dirigeants/IRP sur les KPIs sociaux.", "effort": "medium", "timeline": "0-6 mois"},
            {"title": "Engagement chaîne d'appro", "detail": "Cartographier les fournisseurs à risque social (devoir de vigilance) et auditer les 5 plus exposés.", "effort": "high", "timeline": "6-12 mois"},
        ],
        "kpis": [
            "Index Égalité Professionnelle (/100)",
            "Taux de fréquence accidents (TF)",
            "Heures de formation par ETP",
            "Turnover annuel (%)",
        ],
    },
    "governance": {
        "summary": (
            "Renforcement de la gouvernance par la formalisation des politiques, l'amélioration de la transparence "
            "du reporting et la mise en place de mécanismes de contrôle indépendants."
        ),
        "actions": [
            {"title": "Politique ESG approuvée par le CA", "detail": "Rédiger une politique ESG d'une page (vision, engagements, KPIs) et la faire approuver au plus haut niveau.", "effort": "low", "timeline": "0-3 mois"},
            {"title": "Dispositif anti-corruption", "detail": "Mettre à jour le code de conduite, déployer une plateforme d'alerte conforme Sapin II, former 100% du management.", "effort": "medium", "timeline": "0-6 mois"},
            {"title": "Cartographie risques annuelle", "detail": "Réaliser une cartographie des risques ESG et de corruption tenue à jour annuellement, validée par le Comité d'Audit.", "effort": "medium", "timeline": "3-6 mois"},
            {"title": "Vérification tierce du reporting", "detail": "Faire vérifier les 20 indicateurs ESG les plus matériels par un auditeur indépendant (assurance limitée puis raisonnable).", "effort": "high", "timeline": "6-12 mois"},
            {"title": "Rémunération variable indexée ESG", "detail": "Lier 10-15% de la rémunération variable des dirigeants à des KPIs ESG mesurables.", "effort": "medium", "timeline": "6-12 mois"},
        ],
        "kpis": [
            "% d'indicateurs ESG vérifiés par un tiers",
            "Nombre d'alertes éthiques traitées / délai de traitement (jours)",
            "% des dirigeants formés à l'anti-corruption",
            "% de la rémunération variable indexée ESG",
        ],
    },
}


def _fallback_mitigation(risk: ESGRisk) -> Dict[str, Any]:
    """Generate a deterministic, category-aware mitigation plan when no LLM is available."""
    cat = (risk.category or "environmental").lower()
    base = _FALLBACK_LIBRARY.get(cat, _FALLBACK_LIBRARY["environmental"])
    severity = (risk.severity or "medium").lower()
    score = int(risk.risk_score or risk.probability * risk.impact)

    # Estimate residual score by removing ~40-60% depending on severity
    reduction = {"critical": 0.4, "high": 0.5, "medium": 0.6, "low": 0.7}.get(severity, 0.6)
    residual = max(1, int(round(score * reduction)))

    # Effort scaled to severity
    effort = {"critical": "high", "high": "high", "medium": "medium", "low": "low"}.get(severity, "medium")
    timeline = "6-12 mois" if severity in ("critical", "high") else "0-6 mois"

    return {
        "summary": base["summary"],
        "actions": base["actions"],
        "kpis": base["kpis"],
        "estimated_residual_score": residual,
        "estimated_effort": effort,
        "timeline": timeline,
    }


@router.post("/risks/{risk_id}/ai-mitigation", response_model=AIMitigationResponse)
async def generate_risk_mitigation(
    risk_id: str,
    req: Optional[AIMitigationRequest] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a structured AI mitigation plan for an ESG risk.

    Hybrid behavior: if OPENAI_API_KEY is configured, calls OpenAI in JSON-mode;
    otherwise returns a deterministic, category-aware rule-based plan.

    With `save=true`, persists the plan summary into the risk's mitigation_plan
    field and sets mitigation_status to "in_progress".
    """
    body = req or AIMitigationRequest()

    # ── 1. Load + verify ownership ────────────────────────────────────────
    result = await db.execute(
        select(ESGRisk).where(
            ESGRisk.id == risk_id,
            ESGRisk.tenant_id == current_user.tenant_id,
        )
    )
    risk = result.scalar_one_or_none()
    if not risk:
        raise HTTPException(status_code=404, detail="Risk not found")

    # ── 2. Try OpenAI, fall back to rule-based ────────────────────────────
    ai_data = await _call_openai_mitigation(risk, body.extra_context)
    source = "openai" if ai_data else "rule_based"
    data = ai_data or _fallback_mitigation(risk)

    # ── 3. Normalise actions list (LLM may emit different shapes) ─────────
    raw_actions = data.get("actions") or []
    normalized_actions: List[Dict[str, str]] = []
    for a in raw_actions[:8]:  # hard cap
        if not isinstance(a, dict):
            continue
        normalized_actions.append({
            "title": str(a.get("title") or "Action").strip()[:160],
            "detail": str(a.get("detail") or a.get("description") or "").strip()[:600],
            "effort": str(a.get("effort") or "medium").lower(),
            "timeline": str(a.get("timeline") or "0-6 mois").strip()[:60],
        })
    if not normalized_actions:
        # Defensive: ensure we always return at least the fallback actions
        normalized_actions = _fallback_mitigation(risk)["actions"]

    kpis = [str(k).strip()[:200] for k in (data.get("kpis") or []) if str(k).strip()][:6]
    if not kpis:
        kpis = _fallback_mitigation(risk)["kpis"]

    summary = str(data.get("summary") or "").strip() or _fallback_mitigation(risk)["summary"]

    # Coerce residual score safely
    residual_raw = data.get("estimated_residual_score")
    residual: Optional[int] = None
    if residual_raw is not None:
        try:
            residual = max(1, min(25, int(residual_raw)))
        except (TypeError, ValueError):
            residual = None
    if residual is None:
        residual = _fallback_mitigation(risk)["estimated_residual_score"]

    effort = str(data.get("estimated_effort") or "medium").lower()
    if effort not in {"low", "medium", "high"}:
        effort = "medium"
    timeline = str(data.get("timeline") or "0-6 mois").strip()[:60]

    # ── 4. Optionally persist to the risk ─────────────────────────────────
    saved = False
    if body.save:
        plan_text_lines = [summary, ""]
        for i, a in enumerate(normalized_actions, 1):
            plan_text_lines.append(
                f"{i}. {a['title']} ({a['effort']}, {a['timeline']}) — {a['detail']}"
            )
        if kpis:
            plan_text_lines.append("")
            plan_text_lines.append("KPIs à suivre :")
            for k in kpis:
                plan_text_lines.append(f"- {k}")
        risk.mitigation_plan = "\n".join(plan_text_lines)[:4000]
        if not risk.mitigation_status or risk.mitigation_status == "not_started":
            risk.mitigation_status = "in_progress"
        await db.commit()
        saved = True

    return AIMitigationResponse(
        risk_id=str(risk.id),
        summary=summary,
        actions=[AIMitigationAction(**a) for a in normalized_actions],
        kpis=kpis,
        estimated_residual_score=residual,
        estimated_effort=effort,
        timeline=timeline,
        source=source,
        saved=saved,
    )