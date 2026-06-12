"""
Auditor Review — workflow for inviting an external auditor (CAC, Big 4)
to review a generated report, leave comments per ESRS section, and approve
or reject. Once approved, the underlying data can be locked to preserve
audit integrity.
"""
from typing import TYPE_CHECKING, Optional
from uuid import UUID
from datetime import datetime

from sqlalchemy import String, Text, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.tenant import Tenant
    from app.models.user import User


class AuditorReview(Base, UUIDMixin, TenantMixin, TimestampMixin):
    """One review = one auditor invited on one report_history entry."""

    __tablename__ = "auditor_reviews"

    report_history_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("report_history.id", ondelete="SET NULL"),
        nullable=True,
    )
    auditor_email: Mapped[str] = mapped_column(String(255), nullable=False)
    auditor_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    auditor_firm: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # pending → in_review → approved | rejected | expired
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending", index=True)

    invitation_token: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    invited_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Final auditor decision message (one paragraph)
    decision_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    invited_by: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Locks underlying data after approval (audit integrity)
    data_locked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    tenant: Mapped["Tenant"] = relationship("Tenant")
    inviter: Mapped[Optional["User"]] = relationship("User", foreign_keys=[invited_by])
    comments: Mapped[list["AuditorComment"]] = relationship(
        "AuditorComment",
        back_populates="review",
        cascade="all, delete-orphan",
        order_by="AuditorComment.created_at.desc()",
    )

    def __repr__(self) -> str:
        return f"<AuditorReview(id={self.id}, status={self.status}, auditor={self.auditor_email})>"


class AuditorComment(Base, UUIDMixin, TimestampMixin):
    """A single comment / observation left by the auditor on a section."""

    __tablename__ = "auditor_comments"

    review_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("auditor_reviews.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    section_code: Mapped[str] = mapped_column(String(20), nullable=False, comment="ESRS section: E1, S1, G1, …")
    severity: Mapped[str] = mapped_column(String(20), nullable=False, default="info", comment="info | warning | critical")
    body: Mapped[str] = mapped_column(Text, nullable=False)
    resolved: Mapped[bool] = mapped_column(default=False)

    review: Mapped["AuditorReview"] = relationship("AuditorReview", back_populates="comments")

    def __repr__(self) -> str:
        return f"<AuditorComment(id={self.id}, section={self.section_code}, severity={self.severity})>"
