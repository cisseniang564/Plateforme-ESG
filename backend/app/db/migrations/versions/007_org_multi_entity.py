"""Add multi-entity hierarchy + business fields to organizations.

Adds parent_org_id (self-referential FK), legal identifiers (SIREN, LEI, VAT),
business metrics (employees, revenue, surface), consolidation method and
ownership percentage. Unblocks the Group plan (1199 €/mois) which previously
sold a 'multi-entité consolidation' feature without a real schema to back it.

Revision ID: 007_org_multi_entity
Revises: 006_audit_log_hash_chain
Create Date: 2026-05-27
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "007_org_multi_entity"
down_revision: Union[str, None] = "006_audit_log_hash_chain"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Identity ─────────────────────────────────────────────────────────────
    op.add_column("organizations", sa.Column("legal_name", sa.String(length=255), nullable=True))

    # ── Legal identifiers ────────────────────────────────────────────────────
    op.add_column("organizations", sa.Column("siren", sa.String(length=9), nullable=True))
    op.add_column("organizations", sa.Column("siret", sa.String(length=14), nullable=True))
    op.add_column("organizations", sa.Column("lei_code", sa.String(length=20), nullable=True))
    op.add_column("organizations", sa.Column("vat_number", sa.String(length=20), nullable=True))
    op.create_index("ix_organizations_siren", "organizations", ["siren"])

    # ── Sector & geography ───────────────────────────────────────────────────
    op.add_column("organizations", sa.Column("sector_code", sa.String(length=20), nullable=True))
    op.add_column(
        "organizations",
        sa.Column("country_code", sa.String(length=2), nullable=True, server_default="FR"),
    )
    op.create_index("ix_organizations_sector", "organizations", ["sector_code"])

    # ── Business metrics ─────────────────────────────────────────────────────
    op.add_column("organizations", sa.Column("employee_count", sa.Integer(), nullable=True))
    op.add_column("organizations", sa.Column("revenue_eur", sa.Numeric(15, 2), nullable=True))
    op.add_column("organizations", sa.Column("surface_m2", sa.Numeric(12, 2), nullable=True))

    # ── Multi-entity hierarchy ───────────────────────────────────────────────
    op.add_column(
        "organizations",
        sa.Column(
            "parent_org_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.add_column(
        "organizations",
        sa.Column(
            "consolidation_method",
            sa.String(length=20),
            nullable=True,
            server_default="full",
        ),
    )
    op.add_column(
        "organizations",
        sa.Column(
            "ownership_percentage",
            sa.Numeric(5, 2),
            nullable=True,
            server_default="100.00",
        ),
    )

    # ── State ────────────────────────────────────────────────────────────────
    op.add_column(
        "organizations",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
    )

    # ── Indexes ──────────────────────────────────────────────────────────────
    op.create_index(
        "idx_org_tenant_parent",
        "organizations",
        ["tenant_id", "parent_org_id"],
    )
    op.create_index(
        "idx_org_tenant_active",
        "organizations",
        ["tenant_id", "is_active"],
    )
    # FK index helps the children query (children of an org).
    op.create_index(
        "ix_organizations_parent_org_id",
        "organizations",
        ["parent_org_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_organizations_parent_org_id", table_name="organizations")
    op.drop_index("idx_org_tenant_active", table_name="organizations")
    op.drop_index("idx_org_tenant_parent", table_name="organizations")
    op.drop_index("ix_organizations_sector", table_name="organizations")
    op.drop_index("ix_organizations_siren", table_name="organizations")

    op.drop_column("organizations", "is_active")
    op.drop_column("organizations", "ownership_percentage")
    op.drop_column("organizations", "consolidation_method")
    op.drop_column("organizations", "parent_org_id")
    op.drop_column("organizations", "surface_m2")
    op.drop_column("organizations", "revenue_eur")
    op.drop_column("organizations", "employee_count")
    op.drop_column("organizations", "country_code")
    op.drop_column("organizations", "sector_code")
    op.drop_column("organizations", "vat_number")
    op.drop_column("organizations", "lei_code")
    op.drop_column("organizations", "siret")
    op.drop_column("organizations", "siren")
    op.drop_column("organizations", "legal_name")
