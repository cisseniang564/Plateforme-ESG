"""
FrameworkAssessment model — stores questionnaire data per user × framework.

Replaces Redis-backed persistence for CDP, CSDDD, climate scenarios,
investor relations and iXBRL modules.
"""
from typing import TYPE_CHECKING, Optional
from uuid import UUID

from sqlalchemy import String, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, UUIDMixin, TenantMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.tenant import Tenant
    from app.models.user import User


class FrameworkAssessment(Base, UUIDMixin, TenantMixin, TimestampMixin):
    """
    Stores a user's questionnaire / assessment data for a given reporting
    framework (cdp, csddd, climate_scenarios, investor_relations, ixbrl).

    There is at most one row per (tenant_id, user_id, framework) triplet,
    enforced by a unique index.  Full payload is kept in the ``data`` JSONB
    column so the model does not need to evolve every time a questionnaire
    section changes.
    """

    __tablename__ = "framework_assessments"

    # TenantMixin already declares __table_args__ = ({"info": ...},)
    # We extend it to add the unique constraint.
    __table_args__ = (
        UniqueConstraint(
            "tenant_id", "user_id", "framework",
            name="uq_framework_assessments_tenant_user_framework",
        ),
        {"info": {"rls_enabled": True}},
    )

    user_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    framework: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        comment="cdp | csddd | climate_scenarios | investor_relations | ixbrl",
    )

    data: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True,
        comment="Full questionnaire payload (responses, metadata, year, …)",
    )

    # Relationships (viewonly — no cascade writes through these)
    tenant: Mapped["Tenant"] = relationship(
        "Tenant",
        foreign_keys="FrameworkAssessment.tenant_id",
        viewonly=True,
    )
    user: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[user_id],
        viewonly=True,
    )
