"""
SFDR models — Sustainable Finance Disclosure Regulation (EU 2019/2088).

Replaces the previous localStorage-only frontend persistence. The SFDR module
exposes:
  * SFDRReport — one logical "report" per (tenant, fund_id, year)
    holding the article classification (6/8/9), policy narrative.
  * SFDRPAIValue — one row per Principal Adverse Impact indicator (18 PAIs)
    for a given report.

Schemas align with:
  * Reglement (UE) 2019/2088 (SFDR)
  * Reglement Delegue (UE) 2022/1288 (RTS Annexes I et IV)
"""
from __future__ import annotations

from typing import TYPE_CHECKING, Optional
from uuid import UUID
from datetime import datetime
import enum

from sqlalchemy import (
    String, Text, Integer, Boolean, Numeric, DateTime,
    ForeignKey, Index, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSON, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TenantMixin, UUIDMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class SFDRArticle(str, enum.Enum):
    """Fund classification under SFDR — Articles 6, 8, 9 of the regulation."""
    ARTICLE_6 = "article6"
    ARTICLE_8 = "article8"
    ARTICLE_9 = "article9"


class SFDRReport(Base, UUIDMixin, TenantMixin, TimestampMixin):
    """A yearly SFDR disclosure for a single fund / mandate / scope."""
    __tablename__ = "sfdr_reports"

    year: Mapped[int] = mapped_column(Integer, nullable=False)
    fund_id: Mapped[str] = mapped_column(
        String(64), nullable=False,
        comment="Stable identifier (e.g. fund code, mandate slug)"
    )
    fund_name: Mapped[str] = mapped_column(String(255), nullable=False)
    article: Mapped[str] = mapped_column(
        String(20), nullable=False, default="article8",
        comment="One of SFDRArticle values"
    )
    policy_text: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True,
        comment="Policy narrative published in periodic disclosures"
    )
    policy_edited: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false",
        comment="True if user customized the boilerplate template"
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="draft", server_default="draft",
        comment="draft / approved / published"
    )
    published_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    pai_values: Mapped[list["SFDRPAIValue"]] = relationship(
        "SFDRPAIValue", back_populates="report",
        cascade="all, delete-orphan",
        primaryjoin="SFDRReport.id==SFDRPAIValue.report_id",
    )

    __table_args__ = (
        UniqueConstraint("tenant_id", "fund_id", "year", name="uq_sfdr_report"),
        Index("idx_sfdr_report_tenant_year", "tenant_id", "year"),
    )


class SFDRPAIValue(Base, UUIDMixin, TenantMixin, TimestampMixin):
    """One Principal Adverse Impact indicator value within a report."""
    __tablename__ = "sfdr_pai_values"

    report_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("sfdr_reports.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    metric_key: Mapped[str] = mapped_column(
        String(64), nullable=False,
        comment="Stable key (pai_1_ges_scope123, etc.)"
    )
    pai_number: Mapped[int] = mapped_column(
        Integer, nullable=False,
        comment="PAI indicator number (1-18) per RTS Annex I"
    )
    value: Mapped[Optional[float]] = mapped_column(Numeric(20, 4), nullable=True)
    unit: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    report: Mapped["SFDRReport"] = relationship(
        "SFDRReport", back_populates="pai_values",
        foreign_keys=[report_id],
    )

    __table_args__ = (
        UniqueConstraint("report_id", "metric_key", name="uq_sfdr_pai_metric"),
        Index("idx_sfdr_pai_tenant", "tenant_id"),
    )
