"""
Stakeholder Survey API endpoints.

Implements the CSRD/ESRS 2 SBM-2 stakeholder engagement workflow:
  - Tenant side (authenticated): create / list / close surveys, view analytics,
    invite stakeholders.
  - Public side (token-only): load a survey to fill, submit a response. No JWT
    required so external stakeholders never need an ESGflow account.
"""
from __future__ import annotations

import secrets
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.stakeholder_survey import (
    StakeholderSurvey, StakeholderInvitation, StakeholderResponse,
)
from app.services.stakeholder_survey_service import (
    TEMPLATES, get_template, compute_analytics,
)


router = APIRouter()


# ───────────────────────────────────────────────────────────────────────────
# Pydantic schemas
# ───────────────────────────────────────────────────────────────────────────

class StakeholderIn(BaseModel):
    name: Optional[str] = None
    email: EmailStr
    organization: Optional[str] = None
    category: str = "other"  # employee | client | supplier | investor | ngo | regulator | other


class SurveyCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    description: Optional[str] = None
    topics: List[str]
    template_type: Optional[str] = None
    expires_in_days: Optional[int] = Field(default=30, ge=1, le=365)
    stakeholders: List[StakeholderIn] = []


class RatingIn(BaseModel):
    impact: Optional[float] = Field(default=None, ge=0, le=5)
    financial: Optional[float] = Field(default=None, ge=0, le=5)
    comment: Optional[str] = None


class PublicResponseIn(BaseModel):
    respondent_name: Optional[str] = None
    respondent_email: Optional[EmailStr] = None
    respondent_organization: Optional[str] = None
    respondent_category: str = "other"
    ratings: dict  # {topic_code: {impact, financial, comment?}}
    free_text: Optional[str] = None


# ───────────────────────────────────────────────────────────────────────────
# Serializers
# ───────────────────────────────────────────────────────────────────────────

def _serialize_invitation(inv: StakeholderInvitation, base_url: str = "") -> dict:
    return {
        "id":             str(inv.id),
        "name":           inv.name,
        "email":          inv.email,
        "organization":   inv.organization,
        "category":       inv.category,
        "personal_url":   f"{base_url}/survey/{inv.personal_token}" if base_url else f"/survey/{inv.personal_token}",
        "invited_at":     inv.invited_at.isoformat() if inv.invited_at else None,
        "responded_at":   inv.responded_at.isoformat() if inv.responded_at else None,
    }


def _serialize_response(r: StakeholderResponse) -> dict:
    return {
        "id":                       str(r.id),
        "respondent_name":          r.respondent_name,
        "respondent_email":         r.respondent_email,
        "respondent_organization":  r.respondent_organization,
        "respondent_category":      r.respondent_category,
        "ratings":                  r.ratings or {},
        "free_text":                r.free_text,
        "submitted_at":             r.submitted_at.isoformat() if r.submitted_at else None,
    }


def _serialize_survey(s: StakeholderSurvey, base_url: str = "", include_responses: bool = False) -> dict:
    out = {
        "id":             str(s.id),
        "name":           s.name,
        "description":    s.description,
        "topics":         s.topics or [],
        "template_type":  s.template_type,
        "status":         s.status,
        "public_token":   s.public_token,
        "public_url":     f"{base_url}/survey/{s.public_token}" if base_url else f"/survey/{s.public_token}",
        "expires_at":     s.expires_at.isoformat() if s.expires_at else None,
        "created_at":     s.created_at.isoformat() if s.created_at else None,
        "stakeholders":   [_serialize_invitation(i, base_url) for i in (s.invitations or [])],
        "response_count": len(s.responses or []),
    }
    if include_responses:
        out["responses"] = [_serialize_response(r) for r in (s.responses or [])]
    return out


# ───────────────────────────────────────────────────────────────────────────
# Tenant side endpoints
# ───────────────────────────────────────────────────────────────────────────

@router.get("/templates")
async def list_templates(current_user: User = Depends(get_current_user)):
    """List the 4 predefined survey templates (employee, customer, supplier, investor) + custom."""
    return {"templates": [t.to_dict() for t in TEMPLATES]}


@router.post("", status_code=201)
async def create_survey(
    body: SurveyCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new stakeholder survey with optional pre-invited respondents."""
    if not body.topics:
        # Allow template to fill topics if user didn't pick any
        tpl = get_template(body.template_type or "")
        if tpl and tpl.topics:
            topics = tpl.topics
        else:
            raise HTTPException(status_code=400, detail="Au moins un thème ESRS est requis.")
    else:
        topics = body.topics

    now = datetime.now(timezone.utc)
    expires = now + timedelta(days=body.expires_in_days or 30)

    survey = StakeholderSurvey(
        tenant_id=current_user.tenant_id,
        name=body.name.strip(),
        description=(body.description or "").strip() or None,
        topics=topics,
        template_type=body.template_type or "custom",
        status="draft",
        public_token=secrets.token_urlsafe(24),
        expires_at=expires,
        created_by=current_user.id,
    )
    db.add(survey)
    await db.flush()  # need survey.id before adding invitations

    for sh in body.stakeholders:
        if not sh.email:
            continue
        db.add(StakeholderInvitation(
            survey_id=survey.id,
            name=sh.name,
            email=sh.email,
            organization=sh.organization,
            category=sh.category or "other",
            personal_token=secrets.token_urlsafe(24),
            invited_at=now,
        ))

    await db.commit()
    await db.refresh(survey)

    base_url = str(request.base_url).rstrip("/").replace("/api/v1", "")
    return _serialize_survey(survey, base_url=base_url)


@router.get("")
async def list_surveys(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None,
):
    """List all surveys belonging to the current tenant."""
    q = (
        select(StakeholderSurvey)
        .where(StakeholderSurvey.tenant_id == current_user.tenant_id)
        .options(
            selectinload(StakeholderSurvey.invitations),
            selectinload(StakeholderSurvey.responses),
        )
        .order_by(desc(StakeholderSurvey.created_at))
    )
    rows = (await db.execute(q)).scalars().all()
    base_url = str(request.base_url).rstrip("/").replace("/api/v1", "") if request else ""
    return {"items": [_serialize_survey(s, base_url=base_url) for s in rows], "count": len(rows)}


@router.get("/{survey_id}")
async def get_survey(
    survey_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None,
):
    """Get a survey with full response details."""
    q = (
        select(StakeholderSurvey)
        .where(
            StakeholderSurvey.id == survey_id,
            StakeholderSurvey.tenant_id == current_user.tenant_id,
        )
        .options(
            selectinload(StakeholderSurvey.invitations),
            selectinload(StakeholderSurvey.responses),
        )
    )
    survey = (await db.execute(q)).scalar_one_or_none()
    if not survey:
        raise HTTPException(status_code=404, detail="Sondage introuvable.")
    base_url = str(request.base_url).rstrip("/").replace("/api/v1", "") if request else ""
    return _serialize_survey(survey, base_url=base_url, include_responses=True)


@router.get("/{survey_id}/analytics")
async def survey_analytics(
    survey_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Aggregated analytics (per-topic averages, response rate, free-text comments)."""
    q = (
        select(StakeholderSurvey)
        .where(
            StakeholderSurvey.id == survey_id,
            StakeholderSurvey.tenant_id == current_user.tenant_id,
        )
        .options(
            selectinload(StakeholderSurvey.invitations),
            selectinload(StakeholderSurvey.responses),
        )
    )
    survey = (await db.execute(q)).scalar_one_or_none()
    if not survey:
        raise HTTPException(status_code=404, detail="Sondage introuvable.")
    return await compute_analytics(db, survey)


@router.post("/{survey_id}/activate")
async def activate_survey(
    survey_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Move a survey from ``draft`` to ``active`` — public link starts accepting submissions."""
    q = select(StakeholderSurvey).where(
        StakeholderSurvey.id == survey_id,
        StakeholderSurvey.tenant_id == current_user.tenant_id,
    )
    survey = (await db.execute(q)).scalar_one_or_none()
    if not survey:
        raise HTTPException(status_code=404, detail="Sondage introuvable.")
    survey.status = "active"
    survey.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return {"id": str(survey.id), "status": survey.status}


@router.post("/{survey_id}/close")
async def close_survey(
    survey_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Close a survey — no more submissions accepted."""
    q = select(StakeholderSurvey).where(
        StakeholderSurvey.id == survey_id,
        StakeholderSurvey.tenant_id == current_user.tenant_id,
    )
    survey = (await db.execute(q)).scalar_one_or_none()
    if not survey:
        raise HTTPException(status_code=404, detail="Sondage introuvable.")
    survey.status = "closed"
    survey.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return {"id": str(survey.id), "status": survey.status}


@router.delete("/{survey_id}", status_code=204)
async def delete_survey(
    survey_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a survey (cascade-deletes invitations and responses)."""
    q = select(StakeholderSurvey).where(
        StakeholderSurvey.id == survey_id,
        StakeholderSurvey.tenant_id == current_user.tenant_id,
    )
    survey = (await db.execute(q)).scalar_one_or_none()
    if not survey:
        raise HTTPException(status_code=404, detail="Sondage introuvable.")
    await db.delete(survey)
    await db.commit()
    return None


# ───────────────────────────────────────────────────────────────────────────
# Public endpoints (no auth — uses token)
# ───────────────────────────────────────────────────────────────────────────

async def _load_survey_by_token(db: AsyncSession, token: str) -> tuple[StakeholderSurvey, Optional[StakeholderInvitation]]:
    """Look up survey by either its public token or a personal invitation token."""
    # First try as public token
    q = (
        select(StakeholderSurvey)
        .where(StakeholderSurvey.public_token == token)
        .options(selectinload(StakeholderSurvey.invitations))
    )
    survey = (await db.execute(q)).scalar_one_or_none()
    if survey:
        return survey, None

    # Then try as personal invitation token
    q = (
        select(StakeholderInvitation)
        .where(StakeholderInvitation.personal_token == token)
    )
    inv = (await db.execute(q)).scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Lien invalide ou expiré.")

    q = (
        select(StakeholderSurvey)
        .where(StakeholderSurvey.id == inv.survey_id)
        .options(selectinload(StakeholderSurvey.invitations))
    )
    survey = (await db.execute(q)).scalar_one_or_none()
    if not survey:
        raise HTTPException(status_code=404, detail="Sondage introuvable.")
    return survey, inv


@router.get("/public/{token}", include_in_schema=False)
async def public_get_survey(token: str, db: AsyncSession = Depends(get_db)):
    """Load survey metadata for a public respondent. No auth needed."""
    survey, invitation = await _load_survey_by_token(db, token)

    # Refuse if not active or expired
    if survey.status == "draft":
        raise HTTPException(status_code=403, detail="Ce sondage n'est pas encore ouvert.")
    if survey.status == "closed":
        raise HTTPException(status_code=410, detail="Ce sondage est clôturé.")
    if survey.expires_at and survey.expires_at < datetime.now(timezone.utc):
        survey.status = "closed"
        try:
            await db.commit()
        except Exception:
            pass
        raise HTTPException(status_code=410, detail="Ce sondage a expiré.")

    return {
        "id":            str(survey.id),
        "name":          survey.name,
        "description":   survey.description,
        "topics":        survey.topics or [],
        "template_type": survey.template_type,
        "expires_at":    survey.expires_at.isoformat() if survey.expires_at else None,
        "invitation": (
            {
                "id":           str(invitation.id),
                "name":         invitation.name,
                "email":        invitation.email,
                "organization": invitation.organization,
                "category":     invitation.category,
                "already_responded": invitation.responded_at is not None,
            } if invitation else None
        ),
    }


@router.post("/public/{token}/respond", include_in_schema=False)
async def public_submit_response(
    token: str,
    body: PublicResponseIn,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Submit a stakeholder response."""
    survey, invitation = await _load_survey_by_token(db, token)

    if survey.status != "active":
        raise HTTPException(status_code=410, detail="Ce sondage n'accepte plus de réponses.")
    if survey.expires_at and survey.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Ce sondage a expiré.")

    # Block double-submission via personal invitation
    if invitation and invitation.responded_at is not None:
        raise HTTPException(status_code=409, detail="Vous avez déjà répondu à ce sondage.")

    # Validate ratings against survey topics
    if not isinstance(body.ratings, dict):
        raise HTTPException(status_code=400, detail="Format ratings invalide.")
    cleaned_ratings: dict = {}
    for code in (survey.topics or []):
        r = body.ratings.get(code) or {}
        if not isinstance(r, dict):
            continue
        impact = r.get("impact")
        financial = r.get("financial")
        comment = r.get("comment")
        clean = {}
        try:
            if impact is not None:    clean["impact"] = max(0.0, min(5.0, float(impact)))
            if financial is not None: clean["financial"] = max(0.0, min(5.0, float(financial)))
            if comment:               clean["comment"] = str(comment)[:1000]
        except (TypeError, ValueError):
            pass
        if clean:
            cleaned_ratings[code] = clean

    if not cleaned_ratings:
        raise HTTPException(status_code=400, detail="Au moins une note (impact ou financier) est requise.")

    now = datetime.now(timezone.utc)
    client_ip = request.client.host if request.client else None

    # Prefill respondent info from invitation if available
    resp = StakeholderResponse(
        survey_id=survey.id,
        invitation_id=invitation.id if invitation else None,
        respondent_name=         body.respondent_name         or (invitation.name if invitation else None),
        respondent_email=        body.respondent_email        or (invitation.email if invitation else None),
        respondent_organization= body.respondent_organization or (invitation.organization if invitation else None),
        respondent_category=     body.respondent_category     or (invitation.category if invitation else "other"),
        ratings=cleaned_ratings,
        free_text=(body.free_text or "").strip()[:4000] or None,
        submitted_at=now,
        ip_address=client_ip,
    )
    db.add(resp)

    if invitation:
        invitation.responded_at = now

    await db.commit()
    return {
        "message": "Réponse enregistrée — merci pour votre contribution.",
        "submitted_at": now.isoformat(),
    }
