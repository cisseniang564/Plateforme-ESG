"""
Analytics API — Intelligence, anomaly detection, ML forecasting & AI recommendations
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.services.analytics_service import AnalyticsService
from app.services.ml.forecasting_service import ForecastingService
from app.services.ml.anomaly_service import AnomalyDetectionService
from app.services.ml.recommendations_service import ESGRecommendationService
from app.config import get_settings

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
# Legacy endpoints (unchanged)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/anomalies")
async def detect_anomalies(
    year: Optional[int] = Query(None),
    db:   AsyncSession  = Depends(get_db),
    current_user: User  = Depends(get_current_user),
):
    """Detect anomalies in ESG data (statistical Z-score)."""
    service = AnalyticsService(db)
    anomalies = await service.detect_anomalies(current_user.tenant_id, year)
    return {"anomalies": anomalies, "count": len(anomalies)}


@router.get("/insights")
async def get_insights(
    year: int          = Query(...),
    db:   AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get intelligent insights on ESG performance."""
    service = AnalyticsService(db)
    insights = await service.get_insights(current_user.tenant_id, year)
    return insights


@router.get("/suggestions")
async def get_suggestions(
    year: int          = Query(...),
    db:   AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get rule-based improvement suggestions."""
    service = AnalyticsService(db)
    suggestions = await service.get_suggestions(current_user.tenant_id, year)
    return {"suggestions": suggestions, "count": len(suggestions)}


@router.get("/predictions")
async def get_predictions(
    horizon:      int         = Query(12, ge=3, le=36, description="Forecast horizon in months"),
    db:           AsyncSession = Depends(get_db),
    current_user: User        = Depends(get_current_user),
):
    """Predict ESG metric trends using linear regression extrapolation."""
    service = AnalyticsService(db)
    predictions = await service.get_predictions(current_user.tenant_id, horizon)
    return predictions


# ─────────────────────────────────────────────────────────────────────────────
# ML Forecasting — ARIMA / Holt-Winters / OLS avec intervalles de confiance
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/ml/forecast")
async def ml_forecast_all(
    horizon:        int            = Query(12, ge=3, le=36, description="Horizon en mois"),
    objective_pct:  Optional[float] = Query(
        None, description="Objectif de variation % (ex: -30 pour −30 %). Déclenche une alerte si non atteint."
    ),
    db:           AsyncSession      = Depends(get_db),
    current_user: User              = Depends(get_current_user),
):
    """
    ML forecast (ARIMA → Holt-Winters → OLS) pour tous les indicateurs
    avec ≥ 3 points historiques.  Retourne intervalles de confiance 95 %.
    """
    settings = get_settings()
    svc = ForecastingService(db)
    obj_pct = objective_pct if objective_pct is not None else settings.ML_DEFAULT_OBJECTIVE_PCT
    result  = await svc.forecast_all(
        tenant_id=current_user.tenant_id,
        horizon_months=horizon,
        objective_target_pct=obj_pct,
    )
    return result


@router.get("/ml/forecast/{indicator_id}")
async def ml_forecast_indicator(
    indicator_id:   UUID,
    horizon:        int            = Query(12, ge=3, le=36),
    objective_value: Optional[float] = Query(None, description="Valeur cible absolue (ex: 500 tCO2e)"),
    db:           AsyncSession      = Depends(get_db),
    current_user: User              = Depends(get_current_user),
):
    """ML forecast pour un indicateur spécifique."""
    svc = ForecastingService(db)
    return await svc.forecast_indicator(
        tenant_id=current_user.tenant_id,
        indicator_id=indicator_id,
        horizon_months=horizon,
        objective_value=objective_value,
    )


# ─────────────────────────────────────────────────────────────────────────────
# ML Anomaly Detection — Isolation Forest + Z-score hybride
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/ml/anomalies")
async def ml_detect_anomalies(
    pillar: Optional[str] = Query(
        None,
        description="Filtrer par pilier : environmental / social / governance",
    ),
    year:   Optional[int]  = Query(None, description="Filtrer par année"),
    limit:  int            = Query(20, ge=1, le=100),
    db:           AsyncSession = Depends(get_db),
    current_user: User        = Depends(get_current_user),
):
    """
    Détection d'anomalies ML (Isolation Forest + Z-score).
    Retourne chaque anomalie avec : sévérité, z-score, score IF,
    plage attendue et recommandations d'action concrètes.
    """
    svc = AnomalyDetectionService(db)
    return await svc.detect_anomalies(
        tenant_id=current_user.tenant_id,
        pillar=pillar,
        year=year,
        limit=limit,
    )


# ─────────────────────────────────────────────────────────────────────────────
# AI ESG Recommendations — OpenAI + fallback règles métier
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/ml/recommendations")
async def ai_recommendations(
    organization_id: Optional[UUID] = Query(None, description="Limiter à une organisation"),
    db:           AsyncSession       = Depends(get_db),
    current_user: User               = Depends(get_current_user),
):
    """
    Génère 3 recommandations ESG prioritaires avec gains estimés (tCO2e, €),
    difficulté, délai et ressources nécessaires.
    Utilise OpenAI gpt-4o-mini si OPENAI_API_KEY est configuré,
    sinon applique des règles métier basées sur le profil entreprise.
    """
    settings = get_settings()
    svc = ESGRecommendationService(
        db=db,
        openai_api_key=settings.OPENAI_API_KEY,
        model=settings.OPENAI_MODEL,
    )
    return await svc.generate_recommendations(
        tenant_id=current_user.tenant_id,
        organization_id=organization_id,
    )


# ─────────────────────────────────────────────────────────────────────────────
# AI ESG Chatbot — OpenAI GPT-4o-mini avec contexte entreprise + fallback KB
# ─────────────────────────────────────────────────────────────────────────────

class ChatMessagePayload(BaseModel):
    role: str   # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessagePayload]


@router.post("/chat")
async def ai_chat(
    body: ChatRequest,
    db:           AsyncSession = Depends(get_db),
    current_user: User         = Depends(get_current_user),
):
    """
    ESG AI chatbot — OpenAI GPT-4o-mini avec contexte entreprise en temps réel.
    Fallback automatique sur base de connaissances règles-métier si pas de clé API.
    """
    from app.services.ml.chat_service import ESGChatService
    cfg = get_settings()
    svc = ESGChatService(
        db=db,
        openai_api_key=cfg.OPENAI_API_KEY,
        model=cfg.OPENAI_MODEL,
    )
    messages = [{"role": m.role, "content": m.content} for m in body.messages]
    response = await svc.chat(current_user.tenant_id, messages)
    return {"response": response}
