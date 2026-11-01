"""
Questionnaires RSE reçus des clients.

POST   /questionnaires               dépose un questionnaire (Excel, Word, PDF, CSV, texte) ou colle ses questions
GET    /questionnaires               liste
GET    /questionnaires/{id}          détail (statut, questions, réponses pré-remplies et sources)
PUT    /questionnaires/{id}/answers  enregistre les réponses relues / validées par l'utilisateur
GET    /questionnaires/{id}/export   export Excel
DELETE /questionnaires/{id}
"""
import io
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, Literal, Optional
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.session import SystemSessionLocal, get_db
from app.dependencies import get_current_user
from app.models.client_questionnaire import ClientQuestionnaire
from app.models.user import User
from app.services import gaia_service as gaia
from app.services import questionnaire_service as qs

logger = logging.getLogger(__name__)
router = APIRouter()

MAX_FILE_BYTES = 10 * 1024 * 1024
MAX_PER_DAY = 10   # par client : maîtrise du coût de l'IA


class AnswerUpdate(BaseModel):
    answer: Optional[str] = Field(default=None, max_length=4000)
    status: Literal["prefilled", "validated", "to_complete"] = "validated"


class AnswersPayload(BaseModel):
    answers: Dict[str, AnswerUpdate]


def _counts(questions: Optional[list]) -> dict:
    qs_ = questions or []
    return {
        "total": len(qs_),
        "validated": sum(1 for q in qs_ if q.get("status") == "validated"),
        "prefilled": sum(1 for q in qs_ if q.get("status") == "prefilled"),
        "to_complete": sum(1 for q in qs_ if q.get("status") == "to_complete"),
    }


def _summary(row: ClientQuestionnaire) -> dict:
    return {
        "id": str(row.id), "title": row.title, "client_name": row.client_name, "status": row.status,
        "created_at": row.created_at.isoformat() if row.created_at else None, "counts": _counts(row.questions),
    }


def _detail(row: ClientQuestionnaire) -> dict:
    return {**_summary(row), "error": row.error, "questions": row.questions or []}


async def _get_owned(db: AsyncSession, qid: UUID, user: User) -> ClientQuestionnaire:
    row = (await db.execute(
        select(ClientQuestionnaire).where(ClientQuestionnaire.id == qid, ClientQuestionnaire.tenant_id == user.tenant_id)
    )).scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Questionnaire introuvable.")
    return row


async def _run(qid: UUID, tenant_id: UUID) -> None:
    """Arrière-plan : extrait les questions, les pré-remplit à partir des données saisies, enregistre."""
    async with SystemSessionLocal() as db:
        await db.execute(text("SELECT set_config('app.current_tenant_id', :t, false)"), {"t": str(tenant_id)})
        row = (await db.execute(select(ClientQuestionnaire).where(ClientQuestionnaire.id == qid))).scalar_one_or_none()
        if not row:
            return
        try:
            extracted = await qs.extract_questions(row.text_excerpt or "")
            facts = await qs.build_facts(db, tenant_id)
            row.questions = await qs.prefill(extracted["questions"], facts)
            row.client_name = row.client_name or extracted["client"]
            row.status, row.model = "ready", gaia._model()
        except gaia.GaiaError as exc:
            row.status, row.error = "failed", str(exc)
        except Exception:  # noqa: BLE001 — pas de détail technique pour l'utilisateur
            logger.exception("Questionnaire %s en échec", qid)
            row.status, row.error = "failed", "Le traitement a échoué. Réessayez dans quelques minutes."
        await db.commit()


@router.post("", status_code=202)
async def create_questionnaire(
    background: BackgroundTasks,
    file: Optional[UploadFile] = File(default=None),
    pasted_text: Optional[str] = Form(default=None),
    client_name: Optional[str] = Form(default=None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    since = datetime.now(timezone.utc) - timedelta(days=1)
    used = (await db.execute(
        select(func.count()).select_from(ClientQuestionnaire)
        .where(ClientQuestionnaire.tenant_id == user.tenant_id, ClientQuestionnaire.created_at >= since)
    )).scalar() or 0
    if used >= MAX_PER_DAY:
        raise HTTPException(429, f"Limite atteinte : {MAX_PER_DAY} questionnaires par jour. Réessayez demain.")

    try:
        if file is not None and file.filename:
            data = await file.read(MAX_FILE_BYTES + 1)
            if len(data) > MAX_FILE_BYTES:
                raise HTTPException(413, "Fichier trop volumineux (10 Mo maximum).")
            if not data:
                raise HTTPException(400, "Fichier vide.")
            title, size = file.filename[:255], len(data)
            body = qs.extract_questionnaire_text(file.filename, data)
        elif pasted_text and pasted_text.strip():
            title, size, body = "Questions collées", len(pasted_text), pasted_text
        else:
            raise HTTPException(400, "Envoyez un fichier ou collez les questions.")
        qs.check_has_questions_text(body)
    except gaia.GaiaError as exc:
        raise HTTPException(422, str(exc))

    if not getattr(settings, "OPENAI_API_KEY", None):
        raise HTTPException(503, "L'IA n'est pas encore configurée sur ce serveur (clé OpenAI manquante).")

    row = ClientQuestionnaire(
        tenant_id=user.tenant_id, user_id=user.id, title=title, file_size=size,
        client_name=(client_name or "").strip()[:200] or None, status="processing",
        text_excerpt=body[: qs.MAX_TEXT_CHARS],
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    background.add_task(_run, row.id, user.tenant_id)
    return _summary(row)


@router.get("")
async def list_questionnaires(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(
        select(ClientQuestionnaire).where(ClientQuestionnaire.tenant_id == user.tenant_id)
        .order_by(ClientQuestionnaire.created_at.desc()).limit(50)
    )).scalars().all()
    return {"items": [_summary(r) for r in rows]}


@router.get("/{qid}")
async def get_questionnaire(qid: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return _detail(await _get_owned(db, qid, user))


@router.put("/{qid}/answers")
async def save_answers(qid: UUID, body: AnswersPayload, user: User = Depends(get_current_user),
                       db: AsyncSession = Depends(get_db)):
    row = await _get_owned(db, qid, user)
    if row.status != "ready":
        raise HTTPException(409, "Le questionnaire n'est pas encore prêt.")
    updated = []
    for q in row.questions or []:
        change = body.answers.get(q["id"])
        if change is None:
            updated.append(q)
            continue
        answer = (change.answer or "").strip() or None
        status = change.status
        if status == "validated" and not answer:
            status = "to_complete"      # on ne « valide » pas une réponse vide
        if answer is None and status == "prefilled":
            status = "to_complete"
        updated.append({**q, "answer": answer, "status": status})
    row.questions = updated        # nouvelle liste : SQLAlchemy détecte le changement de la colonne JSON
    await db.commit()
    return _detail(row)


@router.get("/{qid}/export")
async def export_questionnaire(qid: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    row = await _get_owned(db, qid, user)
    if row.status != "ready":
        raise HTTPException(409, "Le questionnaire n'est pas encore prêt.")
    content = qs.export_xlsx(row.title, row.client_name, row.questions or [])
    safe = "".join(c if c.isalnum() or c in "-_" else "-" for c in (row.title.rsplit(".", 1)[0] or "questionnaire"))[:60]
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="reponses-{safe}.xlsx"'},
    )


@router.delete("/{qid}", status_code=204)
async def delete_questionnaire(qid: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    row = await _get_owned(db, qid, user)
    await db.delete(row)
    await db.commit()
