"""
Role + UserRole models - RBAC (roles and assignments).
Matches the DB schema:
- roles
- user_roles
"""
from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Optional, List
from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, UUIDMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.tenant import Tenant
    from app.models.organization import Organization


class Role(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "roles"

    # NULL for system roles, tenant_id for custom roles (per DB)
    tenant_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        comment="NULL for system roles, tenant_id for custom roles",
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="Role name: tenant_admin, esg_admin, esg_manager, etc.",
    )

    description: Mapped[Optional[str]] = mapped_column(
        String,
        nullable=True,
    )

    is_system_role: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        comment="True for predefined system roles",
    )

    # Relationships
    tenant: Mapped[Optional["Tenant"]] = relationship("Tenant")

    # ✅ FIX: force FK path User.role_id -> roles.id (otherwise ambiguous with user_roles)
    users: Mapped[List["User"]] = relationship(
        "User",
        back_populates="role",
        foreign_keys="User.role_id",
    )

    # Role assignments (many-to-many with extra columns) via user_roles
    user_roles: Mapped[List["UserRole"]] = relationship(
        "UserRole",
        back_populates="role",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Role(id={self.id}, name={self.name})>"


class UserRole(Base, UUIDMixin, TimestampMixin):
    """
    Association object for user_roles table.
    """
    __tablename__ = "user_roles"

    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    role_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("roles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # NULL for tenant-wide role, org_id for org-scoped role
    org_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        comment="NULL for tenant-wide role, org_id for org-scoped role",
    )

    granted_at: Mapped[datetime] = mapped_column(
        nullable=False,
        comment="When the role was granted",
    )

    granted_by: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="User who granted the role",
    )

    expires_at: Mapped[Optional[datetime]] = mapped_column(
        nullable=True,
        comment="Optional expiration for temporary roles",
    )

    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="user_roles",
        foreign_keys=[user_id],
    )

    role: Mapped["Role"] = relationship(
        "Role",
        back_populates="user_roles",
        foreign_keys=[role_id],
    )

    organization: Mapped[Optional["Organization"]] = relationship(
        "Organization",
        foreign_keys=[org_id],
    )

    granted_by_user: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[granted_by],
    )

    def __repr__(self) -> str:
        return f"<UserRole(id={self.id}, user_id={self.user_id}, role_id={self.role_id}, org_id={self.org_id})>"