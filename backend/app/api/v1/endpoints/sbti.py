"""
SBTi (Science Based Targets initiative) API endpoints.

Tenant-side workflow:
  1. POST   /sbti/commitments              — create a commitment
  2. GET    /sbti/commitments              — list (latest first)
  3. GET    /sbti/commitments/{id}         — get one
  4. PUT    /sbti/commitments/{id}         — update fields
  5. DELETE /sbti/commitments/{id}         — delete (only if not submitted)
  6. POST   /sbti/commitments/{id}/validate — run pre-flight checks
  7. POST   /sbti/commitments/{id}/submit   — mark as submitted to SBTi
  8. GET    /sbti/commitments/{id}/dossier  — download PDF dossier

The SBTi has no public submission API (validations are reviewed by humans
over ~6 months), so the workflow is: generate the PDF here + manually upload
to sciencebasedtargets.org/target-validation.
"""
from __future__ import annotations

import io
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.sbti_commitment import SBTiCommitment
from app.services.sbti_service import (
    validate_commitment,
    generate_dossier_pdf,
)


router = APIRouter()


# ───────────────────────────────────────────────────────────────────────────
# Pydantic schemas
# ───────────────────────────────────────────────────────────────────────────

class CommitmentIn(BaseModel):
    organization_id:           Optional[UUID] = None
    method:                    str = Field(default="1.5C", pattern="^(1\\.5C|WB2C|FLAG|SDA)$")
    baseline_year:             int = Field(ge=2000, le=2030)
    baseline_scope1_tco2e:     Optional[float] = None
    baseline_scope2_tco2e:     Optional[float] = None
    baseline_scope3_tco2e:     Optional[float] = None
    baseline_total_tco2e:      float = Field(gt=0)
    near_term_target_year:     int = Field(ge=2025, le=2050)
    near_term_reduction_pct:   float = Field(ge=0, le=100)
    near_term_scope_coverage:  Optional[str] = "scope1+2"
    net_zero_year:             Optional[int] = Field(default=None, ge=2030, le=2070)
    long_term_reduction_pct:   Optional[float] = Field(default=None, ge=0, le=100)
    scope3_screening_completed: bool = False
    scope3_pct_of_total:       Optional[float] = Field(default=None, ge=0, le=100)
    scope3_target_pct:         Optional[float] = Field(default=None, ge=0, le=100)
    organization_name:         Optional[str] = None
    sector:                    Optional[str] = None
    revenue_meur:              Optional[float] = None
    employees:                 Optional[int]   = None
    contact_name:              Optional[str] = None
    contact_email:             Optional[EmailStr] = None
    contact_role:              Optional[str] = None
    notes:                     Optional[str] = None


class CommitmentPatch(BaseModel):
    method:                    Optional[str] = Field(default=None, pattern="^(1\\.5C|WB2C|FLAG|SDA)$")
    baseline_year:             Optional[int] = Field(default=None, ge=2000, le=2030)
    baseline_scope1_tco2e:     Optional[float] = None
    baseline_scope2_tco2e:     Optional[float] = None
    baseline_scope3_tco2e:     Optional[float] = None
    baseline_total_tco2e:      Optional[float] = Field(default=None, gt=0)
    near_term_target_year:     Optional[int] = Field(default=None, ge=2025, le=2050)
    near_term_reduction_pct:   Optional[float] = Field(default=None, ge=0, le=100)
    near_term_scope_coverage:  Optional[str] = None
    net_zero_year:             Optional[int] = Field(default=None, ge=2030, le=2070)
    long_term_reduction_pct:   Optional[float] = Field(default=None, ge=0, le=100)
    scope3_screening_completed: Optional[bool] = None
    scope3_pct_of_total:       Optional[float] = Field(default=None, ge=0, le=100)
    scope3_target_pct:         Optional[float] = Field(default=None, ge=0, le=100)
    organization_name:         Optional[str] = None
    sector:                    Optional[str] = None
    revenue_meur:              Optional[float] = None
    employees:                 Optional[int]   = None
    contact_name:              Optional[str] = None
    contact_email:             Optional[EmailStr] = None
    contact_role:              Optional[str] = None
    notes:                     Optional[str] = None
    status:                    Optional[str] = Field(default=None, pattern="^(not_committed|letter_sent|targets_set|submitted|validated|rejected)$")


# ───────────────────────────────────────────────────────────────────────────
# Serializer
# ───────────────────────────────────────────────────────────────────────────

def _serialize(c: SBTiCommitment) -> dict:
    return {
        "id":                          str(c.id),
        "organization_id":             str(c.organization_id) if c.organization_id else None,
        "status":                      c.status,
        "method":                      c.method,
        "baseline_year":               c.baseline_year,
        "baseline_scope1_tco2e":       c.baseline_scope1_tco2e,
        "baseline_scope2_tco2e":       c.baseline_scope2_tco2e,
        "baseline_scope3_tco2e":       c.baseline_scope3_tco2e,
        "baseline_total_tco2e":        c.baseline_total_tco2e,
        "near_term_target_year":       c.near_term_target_year,
        "near_term_reduction_pct":     c.near_term_reduction_pct,
        "near_term_scope_coverage":    c.near_term_scope_coverage,
        "net_zero_year":               c.net_zero_year,
        "long_term_reduction_pct":     c.long_term_reduction_pct,
        "scope3_screening_completed":  c.scope3_screening_completed,
        "scope3_pct_of_total":         c.scope3_pct_of_total,
        "scope3_target_pct":           c.scope3_target_pct,
        "commitment_letter_sent_at":   c.commitment_letter_sent_at.isoformat() if c.commitment_letter_sent_at else None,
        "target_submission_sent_at":   c.target_submission_sent_at.isoformat() if c.target_submission_sent_at else None,
        "validated_at":                c.validated_at.isoformat() if c.validated_at else None,
        "sbti_company_id":             c.sbti_company_id,
        "organization_name":           c.organization_name,
        "sector":                      c.sector,
        "revenue_meur":                c.revenue_meur,
        "employees":                   c.employees,
        "contact_name":                c.contact_name,
        "contact_email":               c.contact_email,
        "contact_role":                c.contact_role,
        "notes":                       c.notes,
        "last_validation":             c.last_validation,
        "created_at":                  c.created_at.isoformat() if c.created_at else None,
        "updated_at":                  c.updated_at.isoformat() if c.updated_at else None,
    }


# ───────────────────────────────────────────────────────────────────────────
# Endpoints
# ───────────────────────────────────────────────────────────────────────────

@router.get("/commitments")
async def list_commitments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all SBTi commitments for the current tenant (latest first)."""
    q = (
        select(SBTiCommitment)
        .where(SBTiCommitment.tenant_id == current_user.tenant_id)
        .order_by(desc(SBTiCommitment.created_at))
    )
    rows = (await db.execute(q)).scalars().all()
    return {"items": [_serialize(c) for c in rows], "count": len(rows)}


@router.post("/commitments", status_code=201)
async def create_commitment(
    body: CommitmentIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new SBTi commitment."""
    c = SBTiCommitment(
        tenant_id=current_user.tenant_id,
        status="targets_set",  # defaults to "targets set" once they're saving the form
        created_by=current_user.id,
        **body.model_dump(exclude_none=False),
    )
    db.add(c)
    await db.commit()
    await db.refresh(c)
    return _serialize(c)


@router.get("/commitments/{commitment_id}")
async def get_commitment(
    commitment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = await _load(db, commitment_id, current_user.tenant_id)
    return _serialize(c)


@router.put("/commitments/{commitment_id}")
async def update_commitment(
    commitment_id: UUID,
    body: CommitmentPatch,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = await _load(db, commitment_id, current_user.tenant_id)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(c, k, v)
    c.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(c)
    return _serialize(c)


@router.delete("/commitments/{commitment_id}", status_code=204)
async def delete_commitment(
    commitment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = await _load(db, commitment_id, current_user.tenant_id)
    if c.target_submission_sent_at is not None or c.status == "validated":
        raise HTTPException(
            status_code=400,
            detail="Engagement déjà soumis à SBTi — la suppression est interdite (audit trail).",
        )
    await db.delete(c)
    await db.commit()


@router.post("/commitments/{commitment_id}/validate")
async def run_validation(
    commitment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Run pre-flight SBTi Criteria v5.2 checks and persist the result snapshot."""
    c = await _load(db, commitment_id, current_user.tenant_id)
    result = validate_commitment(c)
    c.last_validation = result.to_dict()
    c.updated_at = datetime.utcnow()
    await db.commit()
    return result.to_dict()


@router.post("/commitments/{commitment_id}/submit")
async def mark_submitted(
    commitment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mark the commitment as submitted to SBTi.

    Refuses to mark if the pre-flight validation has any blockers — users
    must fix them first. The transition is one-way (no un-submit) for audit
    integrity.
    """
    c = await _load(db, commitment_id, current_user.tenant_id)
    result = validate_commitment(c)
    if not result.is_submission_ready:
        raise HTTPException(
            status_code=400,
            detail=f"Soumission impossible : {result.blockers} critère(s) bloquant(s). Corrigez avant d'envoyer.",
        )
    c.status = "submitted"
    c.target_submission_sent_at = datetime.utcnow()
    c.last_validation = result.to_dict()
    await db.commit()
    return {"status": c.status, "submitted_at": c.target_submission_sent_at.isoformat()}


@router.get("/commitments/{commitment_id}/dossier", include_in_schema=False)
async def download_dossier(
    commitment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download the SBTi target validation dossier PDF."""
    c = await _load(db, commitment_id, current_user.tenant_id)
    result = validate_commitment(c)
    try:
        pdf_bytes = generate_dossier_pdf(c, result)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Génération PDF impossible : {exc}")

    filename = f"sbti_dossier_{(c.organization_name or 'org').lower().replace(' ', '_')}_{c.baseline_year}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


async def _load(db: AsyncSession, commitment_id: UUID, tenant_id: UUID) -> SBTiCommitment:
    q = select(SBTiCommitment).where(
        SBTiCommitment.id == commitment_id,
        SBTiCommitment.tenant_id == tenant_id,
    )
    c = (await db.execute(q)).scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Engagement SBTi introuvable.")
    return c
