"""SSO Configuration model."""
from typing import Optional
from sqlalchemy import String, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base, TenantMixin, UUIDMixin, TimestampMixin


class SSOConfig(Base, UUIDMixin, TenantMixin, TimestampMixin):
    """SSO configuration per tenant."""

    __tablename__ = "sso_configs"

    provider_name: Mapped[str] = mapped_column(
        String(100), nullable=False,
        comment="Display name e.g. 'Okta', 'Microsoft Entra'",
    )
    provider_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default="oidc",
        comment="oidc or saml",
    )
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # OIDC fields
    issuer_url: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True, comment="OIDC issuer URL",
    )
    client_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    client_secret_enc: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, comment="Encrypted client secret",
    )
    scopes: Mapped[Optional[str]] = mapped_column(
        String(200), nullable=True, default="openid email profile",
    )

    # Attribute mapping
    email_attribute: Mapped[str] = mapped_column(
        String(100), nullable=False, default="email",
    )
    first_name_attribute: Mapped[str] = mapped_column(
        String(100), nullable=False, default="given_name",
    )
    last_name_attribute: Mapped[str] = mapped_column(
        String(100), nullable=False, default="family_name",
    )

    # Domain restriction (optional)
    allowed_domains: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, comment="Comma-separated list of allowed email domains",
    )

    def __repr__(self) -> str:
        return f"<SSOConfig(tenant={self.tenant_id}, provider={self.provider_name})>"
