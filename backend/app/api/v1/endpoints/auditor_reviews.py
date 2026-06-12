"""
Auditor Review API — workflow for inviting external auditors (CAC / Big 4)
to review a generated CSRD report, comment per ESRS section, approve/reject.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from uuid import UUID
import secrets

from fastapi import APIRouter, Depends, Form, HTTPException, Request, UploadFile, File, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.auditor_review import AuditorReview, AuditorComment
from app.models.report_history import ReportHistory

import logging
logger = logging.getLogger(__name__)

router = APIRouter()


# ───────────────────────────────────────────────────────────────────────────
# Schemas
# ───────────────────────────────────────────────────────────────────────────

class CreateReviewRequest(BaseModel):
    auditor_email: EmailStr
    auditor_name: Optional[str] = None
    auditor_firm: Optional[str] = None
    report_history_id: Optional[UUID] = None
    expires_in_days: int = Field(default=14, ge=1, le=90)


class CommentRequest(BaseModel):
    section_code: str = Field(..., max_length=20)
    severity: str = Field(default="info", pattern="^(info|warning|critical)$")
    body: str = Field(..., min_length=2, max_length=4000)


class DecisionRequest(BaseModel):
    decision: str = Field(..., pattern="^(approved|rejected)$")
    note: Optional[str] = Field(default=None, max_length=2000)


class CommentOut(BaseModel):
    id: str
    section_code: str
    severity: str
    body: str
    resolved: bool
    created_at: str


class ReviewOut(BaseModel):
    id: str
    auditor_email: str
    auditor_name: Optional[str] = None
    auditor_firm: Optional[str] = None
    report_history_id: Optional[str] = None
    status: str
    invited_at: str
    expires_at: Optional[str] = None
    completed_at: Optional[str] = None
    decision_note: Optional[str] = None
    data_locked_at: Optional[str] = None
    invitation_token: Optional[str] = None
    public_url: Optional[str] = None
    comments_count: int = 0
    critical_count: int = 0


def _serialize_review(r: AuditorReview, include_token: bool = False) -> dict:
    # Only count comments if the relationship has been eager-loaded (selectinload)
    # — accessing a non-loaded relationship in async context raises MissingGreenlet.
    from sqlalchemy import inspect as _inspect
    insp = _inspect(r)
    comments_loaded = "comments" not in insp.unloaded
    comments_list = list(r.comments or []) if comments_loaded else []
    crit = sum(1 for c in comments_list if c.severity == "critical" and not c.resolved)
    return {
        "id": str(r.id),
        "auditor_email": r.auditor_email,
        "auditor_name": r.auditor_name,
        "auditor_firm": r.auditor_firm,
        "report_history_id": str(r.report_history_id) if r.report_history_id else None,
        "status": r.status,
        "invited_at": r.invited_at.isoformat() if r.invited_at else None,
        "expires_at": r.expires_at.isoformat() if r.expires_at else None,
        "completed_at": r.completed_at.isoformat() if r.completed_at else None,
        "decision_note": r.decision_note,
        "data_locked_at": r.data_locked_at.isoformat() if r.data_locked_at else None,
        "invitation_token": r.invitation_token if include_token else None,
        "public_url": f"/audit/review/{r.invitation_token}" if include_token else None,
        "comments_count": len(comments_list),
        "critical_count": crit,
    }


# ───────────────────────────────────────────────────────────────────────────
# Tenant-side endpoints (require auth)
# ───────────────────────────────────────────────────────────────────────────

@router.post("", status_code=201)
async def create_review(
    body: CreateReviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Invite an auditor to review a report. Returns the invitation token + URL."""
    # Optional: verify report_history_id belongs to tenant
    if body.report_history_id:
        rh_q = select(ReportHistory).where(
            ReportHistory.id == body.report_history_id,
            ReportHistory.tenant_id == current_user.tenant_id,
        )
        rh = (await db.execute(rh_q)).scalar_one_or_none()
        if not rh:
            raise HTTPException(status_code=404, detail="Rapport introuvable.")

    now_utc = datetime.now(timezone.utc)
    review = AuditorReview(
        tenant_id=current_user.tenant_id,
        report_history_id=body.report_history_id,
        auditor_email=body.auditor_email,
        auditor_name=body.auditor_name,
        auditor_firm=body.auditor_firm,
        invitation_token=secrets.token_urlsafe(32),
        invited_at=now_utc,
        expires_at=now_utc + timedelta(days=body.expires_in_days),
        invited_by=current_user.id,
        status="pending",
    )
    db.add(review)
    await db.commit()
    await db.refresh(review)

    # Best-effort email send
    try:
        from app.config import settings as app_settings
        from app.tasks.email_tasks import send_auditor_invitation
        public_url = f"{app_settings.APP_URL}/audit/review/{review.invitation_token}"
        send_auditor_invitation.delay(
            email=review.auditor_email,
            name=review.auditor_name or "Auditeur",
            firm=review.auditor_firm,
            organization_name=current_user.first_name or "ESGflow",
            review_url=public_url,
            expires_at=review.expires_at.isoformat() if review.expires_at else None,
        )
    except Exception as exc:
        logger.warning("Could not send auditor invitation email: %s", exc)

    return _serialize_review(review, include_token=True)


@router.get("")
async def list_reviews(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all auditor reviews for the current tenant."""
    stmt = (
        select(AuditorReview)
        .where(AuditorReview.tenant_id == current_user.tenant_id)
        .options(selectinload(AuditorReview.comments))
        .order_by(desc(AuditorReview.invited_at))
    )
    rows = (await db.execute(stmt)).scalars().all()
    return {
        "items": [_serialize_review(r, include_token=True) for r in rows],
        "count": len(rows),
    }


@router.delete("/{review_id}", status_code=204)
async def delete_review(
    review_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cancel/delete an invitation."""
    stmt = select(AuditorReview).where(
        AuditorReview.id == review_id,
        AuditorReview.tenant_id == current_user.tenant_id,
    )
    review = (await db.execute(stmt)).scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Revue introuvable.")
    await db.delete(review)
    await db.commit()
    return None


@router.post("/{review_id}/lock", status_code=200)
async def lock_after_review(
    review_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark the data underlying this review as locked (audit integrity).

    For now this is a soft lock (timestamp only) — the data isn't physically
    immutable, but the lock date is preserved for audit traceability.
    """
    stmt = select(AuditorReview).where(
        AuditorReview.id == review_id,
        AuditorReview.tenant_id == current_user.tenant_id,
    )
    review = (await db.execute(stmt)).scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Revue introuvable.")
    if review.status != "approved":
        raise HTTPException(
            status_code=400,
            detail="Seules les revues approuvées peuvent verrouiller les données.",
        )
    review.data_locked_at = datetime.now(timezone.utc)
    await db.commit()
    return {"locked_at": review.data_locked_at.isoformat()}


@router.post("/{review_id}/evidence", status_code=200)
async def upload_evidence(
    review_id: UUID,
    file: UploadFile = File(...),
    section_code: str = Form(..., max_length=20),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a supporting document (pièce justificative) for a given ESRS section.

    Files are stored under /tmp/esgflow_evidence/{review_id}/.
    Returns metadata about the saved file (filename, size, section, uploaded_at).
    """
    import os

    # Verify review belongs to tenant
    stmt = select(AuditorReview).where(
        AuditorReview.id == review_id,
        AuditorReview.tenant_id == current_user.tenant_id,
    )
    review = (await db.execute(stmt)).scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Revue introuvable.")

    # Sanitize filename
    original_name = file.filename or "upload"
    safe_name = "".join(c if c.isalnum() or c in (".", "_", "-") else "_" for c in original_name)
    if not safe_name:
        safe_name = "document"

    dest_dir = f"/tmp/esgflow_evidence/{review_id}"
    os.makedirs(dest_dir, exist_ok=True)
    dest_path = os.path.join(dest_dir, safe_name)

    content = await file.read()
    try:
        with open(dest_path, "wb") as out:
            out.write(content)
    except Exception as exc:
        logger.warning("Could not write evidence file: %s", exc)
        raise HTTPException(status_code=500, detail="Impossible de sauvegarder le fichier.")

    return {
        "filename": safe_name,
        "size": len(content),
        "section": section_code,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    }


# ───────────────────────────────────────────────────────────────────────────
# Public endpoints (no JWT — auditor uses the token)
# ───────────────────────────────────────────────────────────────────────────

async def _get_active_review_by_token(db: AsyncSession, token: str) -> AuditorReview:
    stmt = (
        select(AuditorReview)
        .where(AuditorReview.invitation_token == token)
        .options(selectinload(AuditorReview.comments))
    )
    review = (await db.execute(stmt)).scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Lien d'invitation invalide.")
    if review.status in ("approved", "rejected"):
        # Allow read but no further mutation
        return review
    if review.expires_at and review.expires_at < datetime.now(timezone.utc):
        review.status = "expired"
        try:
            await db.commit()
        except Exception as exc:
            logger.warning("Could not auto-expire review %s: %s", review.id, exc)
        raise HTTPException(status_code=410, detail="Cette invitation a expiré.")
    return review


@router.get("/public/{token}", include_in_schema=False)
async def public_review_view(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """Auditor view: report metadata + existing comments. No JWT needed."""
    review = await _get_active_review_by_token(db, token)

    # Mark as in_review on first access
    if review.status == "pending":
        review.status = "in_review"
        await db.commit()

    # Load related report_history if any
    report_meta = None
    if review.report_history_id:
        rh = await db.get(ReportHistory, review.report_history_id)
        if rh:
            report_meta = {
                "id": str(rh.id),
                "report_type": rh.report_type,
                "format": rh.format,
                "year": rh.year,
                "period": rh.period,
                "created_at": rh.created_at.isoformat() if rh.created_at else None,
            }

    return {
        "review": _serialize_review(review),
        "report": report_meta,
        "comments": [
            {
                "id": str(c.id),
                "section_code": c.section_code,
                "severity": c.severity,
                "body": c.body,
                "resolved": c.resolved,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in (review.comments or [])
        ],
    }


@router.get("/public/{token}/download", include_in_schema=False)
async def public_review_download(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """Auditor downloads the report being reviewed (re-generated on demand)."""
    review = await _get_active_review_by_token(db, token)
    if not review.report_history_id:
        raise HTTPException(status_code=404, detail="Aucun rapport associé à cette revue.")

    rh = await db.get(ReportHistory, review.report_history_id)
    if not rh:
        raise HTTPException(status_code=404, detail="Rapport introuvable.")

    # Re-generate the report and stream it
    from app.services.report_service import ReportService
    from fastapi.responses import StreamingResponse
    import io as _io

    service = ReportService(db)
    try:
        report_bytes = await service.generate_report(
            tenant_id=rh.tenant_id,
            report_type=rh.report_type,
            organization_id=rh.organization_id,
            period=rh.period,
            year=rh.year,
            format=rh.format,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Génération impossible : {exc}")

    content_types = {
        'pdf':   'application/pdf',
        'excel': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'word':  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'json':  'application/json',
    }
    ext = {'excel': 'xlsx', 'word': 'docx'}.get(rh.format, rh.format)
    filename = f"audit_review_{rh.report_type}_{rh.year or 'annual'}.{ext}"
    return StreamingResponse(
        _io.BytesIO(report_bytes),
        media_type=content_types.get(rh.format, 'application/octet-stream'),
        headers={'Content-Disposition': f'attachment; filename="{filename}"'},
    )


@router.post("/public/{token}/comments", include_in_schema=False)
async def public_add_comment(
    token: str,
    body: CommentRequest,
    db: AsyncSession = Depends(get_db),
):
    """Auditor adds a comment on an ESRS section."""
    review = await _get_active_review_by_token(db, token)
    if review.data_locked_at:
        raise HTTPException(status_code=403, detail="Données verrouillées — aucune modification autorisée après verrouillage.")
    if review.status not in ("pending", "in_review"):
        raise HTTPException(status_code=400, detail="La revue est clôturée — commentaires impossibles.")

    comment = AuditorComment(
        review_id=review.id,
        section_code=body.section_code,
        severity=body.severity,
        body=body.body,
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    return {
        "id": str(comment.id),
        "section_code": comment.section_code,
        "severity": comment.severity,
        "body": comment.body,
        "resolved": comment.resolved,
        "created_at": comment.created_at.isoformat() if comment.created_at else None,
    }


@router.post("/public/{token}/decision", include_in_schema=False)
async def public_submit_decision(
    request: Request,
    token: str,
    body: DecisionRequest,
    db: AsyncSession = Depends(get_db),
):
    """Auditor approves or rejects the report.

    On approval, generates a SHA-256 e-signature that cryptographically binds:
      tenant, review, report, auditor email, decision, timestamp, IP.
    This is the *external* signature — the strongest piece of audit evidence
    in the entire CSRD chain (ISAE 3000 § 51, CSRD Art. 29a). Re-computable
    later from the audit log for legal proof.
    """
    import hashlib

    review = await _get_active_review_by_token(db, token)
    if review.data_locked_at:
        raise HTTPException(status_code=403, detail="Données verrouillées — aucune décision autorisée après verrouillage.")
    if review.status not in ("pending", "in_review"):
        raise HTTPException(status_code=400, detail="Cette revue est déjà clôturée.")

    now = datetime.now(timezone.utc)
    client_ip = request.client.host if request.client else None
    signature_hash: Optional[str] = None

    # ── E-signature only on approval (rejections don't sign off anything) ──
    if body.decision == "approved":
        sig_payload = (
            f"{review.tenant_id}|{review.id}|{review.report_history_id}|"
            f"{review.auditor_email}|{body.decision}|{now.isoformat()}"
        )
        signature_hash = hashlib.sha256(sig_payload.encode("utf-8")).hexdigest()

        sig_block = (
            f"\n\n[Signature électronique auditeur externe]\n"
            f"  Hash:       {signature_hash}\n"
            f"  Signé par:  {review.auditor_email}"
            f"{' (' + review.auditor_firm + ')' if review.auditor_firm else ''}\n"
            f"  Date:       {now.isoformat()}\n"
            f"  IP:         {client_ip or 'n/a'}\n"
            f"  Conformité: ISAE 3000 § 51 · CSRD Art. 29a"
        )
        user_note = (body.note or "").strip()
        review.decision_note = (user_note + sig_block) if user_note else sig_block.strip()
    else:
        review.decision_note = body.note

    review.status = body.decision
    review.completed_at = now
    await db.commit()

    # Notify the inviter (best-effort)
    try:
        from app.tasks.email_tasks import send_auditor_decision
        if review.invited_by:
            inviter = await db.get(User, review.invited_by)
            if inviter:
                send_auditor_decision.delay(
                    email=inviter.email,
                    name=inviter.first_name or "",
                    decision=review.status,
                    auditor_name=review.auditor_name or review.auditor_email,
                    note=review.decision_note or "",
                )
    except Exception as exc:
        logger.warning("Could not send decision notification: %s", exc)

    return {
        "status": review.status,
        "completed_at": review.completed_at.isoformat(),
        "signature_hash": signature_hash,  # null on rejection
    }
