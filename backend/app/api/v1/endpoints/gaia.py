"""
Gaïa — analyse des rapports existants des entreprises.

POST   /gaia/analyses              envoie un rapport (PDF, Word, texte) ; l'analyse tourne en arrière-plan
GET    /gaia/analyses              liste des analyses du client
GET    /gaia/analyses/{id}         détail (statut + résultat)
POST   /gaia/analyses/{id}/ask     pose une question sur le rapport
DELETE /gaia/analyses/{id}         supprime l'analyse
"""
import hashlib
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.session import SystemSessionLocal, get_db
from app.dependencies import get_current_user, require_feature
from app.models.report_analysis import ReportAnalysis
from app.models.user import User
from app.services import gaia_service as gaia

logger = logging.getLogger(__name__)
router = APIRouter()

MAX_FILE_BYTES = 20 * 1024 * 1024
MAX_PER_DAY = 20            # limite par client et par jour : maîtrise du coût de l'IA


class AskRequest(BaseModel):
    question: str = Field(min_length=3, max_length=1000)


def _summary(a: ReportAnalysis) -> dict:
    return {
        "id": str(a.id), "filename": a.filename, "status": a.status, "page_count": a.page_count,
        "created_at": a.created_at.isoformat() if a.created_at else None,
        "company": (a.result or {}).get("company"),
        "reporting_year": (a.result or {}).get("reporting_year"),
        "maturity_score": (a.result or {}).get("maturity_score"),
    }


def _detail(a: ReportAnalysis) -> dict:
    return {**_summary(a), "error": a.error, "result": a.result, "model": a.model}


async def _get_owned(db: AsyncSession, analysis_id: UUID, user: User) -> ReportAnalysis:
    row = (await db.execute(
        select(ReportAnalysis).where(ReportAnalysis.id == analysis_id, ReportAnalysis.tenant_id == user.tenant_id)
    )).scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Analyse introuvable.")
    return row


async def _run_analysis(analysis_id: UUID, tenant_id: UUID) -> None:
    """Tâche d'arrière-plan : appelle l'IA puis enregistre le résultat (ou l'erreur)."""
    async with SystemSessionLocal() as db:
        await db.execute(text("SELECT set_config('app.current_tenant_id', :t, false)"), {"t": str(tenant_id)})
        row = (await db.execute(select(ReportAnalysis).where(ReportAnalysis.id == analysis_id))).scalar_one_or_none()
        if not row:
            return
        try:
            result = await gaia.analyze_report(row.text_excerpt or "")
            row.result = result.model_dump()
            row.status = "done"
            row.model = gaia._model()
        except gaia.GaiaError as exc:
            row.status, row.error = "failed", str(exc)
        except Exception:  # noqa: BLE001 — l'utilisateur ne doit pas voir de détail technique
            logger.exception("Gaïa: analyse %s en échec", analysis_id)
            row.status, row.error = "failed", "L'analyse a échoué. Réessayez dans quelques minutes."
        await db.commit()


@router.post("/analyses", status_code=202)
async def create_analysis(
    background: BackgroundTasks,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _gate: None = Depends(require_feature("ai_narrative")),
):
    if not getattr(settings, "OPENAI_API_KEY", None):
        raise HTTPException(503, "Gaïa n'est pas encore configurée sur ce serveur (clé OpenAI manquante).")

    data = await file.read(MAX_FILE_BYTES + 1)
    if len(data) > MAX_FILE_BYTES:
        raise HTTPException(413, "Fichier trop volumineux (20 Mo maximum).")
    if not data:
        raise HTTPException(400, "Fichier vide.")

    since = datetime.now(timezone.utc) - timedelta(days=1)
    used = (await db.execute(
        select(func.count()).select_from(ReportAnalysis)
        .where(ReportAnalysis.tenant_id == user.tenant_id, ReportAnalysis.created_at >= since)
    )).scalar() or 0
    if used >= MAX_PER_DAY:
        raise HTTPException(429, f"Limite atteinte : {MAX_PER_DAY} analyses par jour. Réessayez demain.")

    filename = (file.filename or "rapport")[:255]
    try:
        body, pages = gaia.extract_text(filename, data)
        gaia.check_has_text(body)
    except gaia.GaiaError as exc:
        raise HTTPException(422, str(exc))

    row = ReportAnalysis(
        tenant_id=user.tenant_id, user_id=user.id, filename=filename, file_size=len(data),
        content_hash=hashlib.sha256(data).hexdigest(), page_count=pages or None,
        status="processing", text_excerpt=body[: gaia.EXCERPT_CHARS],
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    background.add_task(_run_analysis, row.id, user.tenant_id)
    return _summary(row)


@router.get("/analyses")
async def list_analyses(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(
        select(ReportAnalysis).where(ReportAnalysis.tenant_id == user.tenant_id)
        .order_by(ReportAnalysis.created_at.desc()).limit(50)
    )).scalars().all()
    return {"items": [_summary(r) for r in rows]}


@router.get("/analyses/{analysis_id}")
async def get_analysis(analysis_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return _detail(await _get_owned(db, analysis_id, user))


@router.post("/analyses/{analysis_id}/ask")
async def ask(
    analysis_id: UUID, body: AskRequest,
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
    _gate: None = Depends(require_feature("ai_narrative")),
):
    row = await _get_owned(db, analysis_id, user)
    if row.status != "done":
        raise HTTPException(409, "L'analyse n'est pas encore terminée.")
    try:
        answer = await gaia.answer_question(body.question, row.result, row.text_excerpt or "")
    except gaia.GaiaError as exc:
        raise HTTPException(503, str(exc))
    except Exception:  # noqa: BLE001
        logger.exception("Gaïa: question en échec")
        raise HTTPException(502, "Gaïa n'a pas pu répondre. Réessayez.")
    return {"answer": answer}


@router.delete("/analyses/{analysis_id}", status_code=204)
async def delete_analysis(analysis_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    row = await _get_owned(db, analysis_id, user)
    await db.delete(row)
    await db.commit()
