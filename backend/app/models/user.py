"""
User model - Platform users with authentication.
"""
from datetime import datetime, timezone

from typing import TYPE_CHECKING, Optional
from uuid import UUID

from sqlalchemy import JSON, Boolean, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PGUUID, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.tenant import Tenant
    from app.models.role import UserRole
    from app.models.role import Role


class User(Base, UUIDMixin, TenantMixin, TimestampMixin):
    """
    User model for authentication and authorization.

    Each user belongs to one tenant and can have multiple roles
    scoped to different organizations.

    Email uniqueness is enforced **per tenant** (composite unique constraint),
    not globally. This allows the same email address to exist in different
    tenants, which is the correct behaviour for a multi-tenant SaaS platform.
    """

    __tablename__ = "users"

    # Composite unique constraint: one email per tenant
    __table_args__ = (
        UniqueConstraint("tenant_id", "email", name="uq_users_tenant_email"),
    )

    # Authentication
    email: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
        # No global unique=True — uniqueness enforced by the composite constraint above
    )
    password_hash: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        comment="Hashed password (nullable for OAuth users)",
    )
    auth_provider: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="local",
        comment="Auth provider: local, google, microsoft, auth0",
    )
    auth_provider_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        comment="User ID from OAuth provider",
    )

    # Primary role (optional)
    role_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("roles.id"),
        nullable=True,
        index=True,
    )

    # Profile
    first_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    last_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    job_title: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    email_verified_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)

    # 2FA / MFA (TOTP)
    mfa_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    totp_secret: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    mfa_backup_codes: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)

    # Preferences
    locale: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        default="en",
        comment="Language preference: en, fr, es, de",
    )
    timezone: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="UTC",
    )
    notification_preferences: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
        server_default="{}",
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="users")

    # ✅ FIX: force FK path users.role_id -> roles.id
    role: Mapped["Role | None"] = relationship(
        "Role",
        back_populates="users",
        foreign_keys=[role_id],
    )

    # ✅ FIX: UserRole has TWO FKs to users (user_id + granted_by), so we must choose user_id
    user_roles: Mapped[list["UserRole"]] = relationship(
        "UserRole",
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="UserRole.user_id",
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email='{self.email}')>"

    @property
    def full_name(self) -> str:
        """Get user's full name."""
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        return self.email

    @property
    def is_email_verified(self) -> bool:
        """Check if email is verified."""
        return self.email_verified_at is not None

    @property
    def is_oauth_user(self) -> bool:
        """Check if user uses OAuth authentication."""
        return self.auth_provider != "local"

    def verify_email(self) -> None:
        """Mark email as verified."""
        self.email_verified_at = datetime.now(timezone.utc)

    def update_last_login(self) -> None:
        """Update last login timestamp."""
        self.last_login_at = datetime.now(timezone.utc)

    def deactivate(self) -> None:
        """Deactivate user account."""
        self.is_active = False

    def activate(self) -> None:
        """Activate user account."""
        self.is_active = True