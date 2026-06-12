"""
Stakeholder Engagement Surveys.

Models the CSRD/ESRS "stakeholder engagement" requirement (ESRS 2 SBM-2):
external stakeholders rate the materiality of ESRS topics for the organization,
their answers feed the double-materiality matrix.

Tables
------
- ``stakeholder_surveys``    one survey campaign per tenant
- ``stakeholder_invitations`` invited respondents (personalized links)
- ``stakeholder_responses``   one submission (anonymous or invited)
"""
from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4
from typing import Optional

from sqlalchemy import (
    Column, String, Text, DateTime, ForeignKey, Index, JSON,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship, Mapped, mapped_column

from app.db.base import Base


# ────────────────────────────────────────────────────────────────────────────
# Survey campaign
# ────────────────────────────────────────────────────────────────────────────

class StakeholderSurvey(Base):
    __tablename__ = "stakeholder_surveys"

    id:              Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id:       Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False, index=True)

    name:            Mapped[str]                = mapped_column(String(255), nullable=False)
    description:     Mapped[Optional[str]]      = mapped_column(Text, nullable=True)

    # ESRS topic codes covered: ["E1", "E2", "S1", "G1", ...]
    topics:          Mapped[list]               = mapped_column(JSON, nullable=False, default=list)

    # "employee" | "customer" | "supplier" | "investor" | "custom"
    template_type:   Mapped[Optional[str]]      = mapped_column(String(32), nullable=True)

    # "draft" | "active" | "closed"
    status:          Mapped[str]                = mapped_column(String(16), nullable=False, default="draft", index=True)

    # Shared public token (anyone with the link can respond anonymously)
    public_token:    Mapped[str]                = mapped_column(String(64), nullable=False, unique=True, index=True)

    expires_at:      Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    created_by:      Mapped[Optional[UUID]]     = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    created_at:      Mapped[datetime]           = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at:      Mapped[datetime]           = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    invitations:     Mapped[list["StakeholderInvitation"]] = relationship(
        "StakeholderInvitation", back_populates="survey",
        cascade="all, delete-orphan", lazy="selectin",
    )
    responses:       Mapped[list["StakeholderResponse"]] = relationship(
        "StakeholderResponse", back_populates="survey",
        cascade="all, delete-orphan", lazy="selectin",
    )

    __table_args__ = (
        Index("ix_stakeholder_surveys_tenant_status", "tenant_id", "status"),
    )


# ────────────────────────────────────────────────────────────────────────────
# Personalized invitation (one per recipient, optional)
# ────────────────────────────────────────────────────────────────────────────

class StakeholderInvitation(Base):
    __tablename__ = "stakeholder_invitations"

    id:              Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    survey_id:       Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("stakeholder_surveys.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )

    name:            Mapped[Optional[str]] = mapped_column(String(255))
    email:           Mapped[str]           = mapped_column(String(255), nullable=False)
    organization:    Mapped[Optional[str]] = mapped_column(String(255))

    # employee | client | supplier | investor | ngo | regulator | other
    category:        Mapped[str]           = mapped_column(String(32), nullable=False, default="other")

    # Personalized token — preferable for tracked response rates.
    personal_token:  Mapped[str]           = mapped_column(String(64), nullable=False, unique=True, index=True)

    invited_at:      Mapped[datetime]              = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    responded_at:    Mapped[Optional[datetime]]   = mapped_column(DateTime, nullable=True)

    survey:          Mapped["StakeholderSurvey"]  = relationship("StakeholderSurvey", back_populates="invitations")


# ────────────────────────────────────────────────────────────────────────────
# Response (one submission)
# ────────────────────────────────────────────────────────────────────────────

class StakeholderResponse(Base):
    __tablename__ = "stakeholder_responses"

    id:              Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    survey_id:       Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("stakeholder_surveys.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    invitation_id:   Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("stakeholder_invitations.id", ondelete="SET NULL"),
        nullable=True,
    )

    respondent_name:         Mapped[Optional[str]] = mapped_column(String(255))
    respondent_email:        Mapped[Optional[str]] = mapped_column(String(255))
    respondent_organization: Mapped[Optional[str]] = mapped_column(String(255))
    respondent_category:     Mapped[str]           = mapped_column(String(32), nullable=False, default="other")

    # {topic_code: {"impact": 1-5, "financial": 1-5, "comment": "..."}}
    ratings:                 Mapped[dict]          = mapped_column(JSON, nullable=False, default=dict)

    free_text:               Mapped[Optional[str]] = mapped_column(Text)

    submitted_at:            Mapped[datetime]      = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    ip_address:              Mapped[Optional[str]] = mapped_column(String(64))

    survey:                  Mapped["StakeholderSurvey"] = relationship("StakeholderSurvey", back_populates="responses")
