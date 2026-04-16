"""Add suppliers table for supply chain ESG management

Revision ID: 004_add_suppliers_table
Revises: 003_fix_data_uploads_file_type
Create Date: 2026-04-15
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "004_add_suppliers_table"
down_revision: Union[str, None] = "003_fix_data_uploads_file_type"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "suppliers",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "tenant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tenants.id", ondelete="CASCADE"),
            nullable=False,
        ),
        # Identity
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("country", sa.String(100), nullable=True),
        sa.Column("category", sa.String(100), nullable=True),
        sa.Column("contact_email", sa.String(255), nullable=True),
        sa.Column("website", sa.String(500), nullable=True),
        # Size & financials
        sa.Column("employees", sa.Integer, nullable=True),
        sa.Column("annual_revenue_k_eur", sa.Numeric(12, 2), nullable=True),
        sa.Column("spend_k_eur", sa.Numeric(12, 2), nullable=True),
        # Risk & status
        sa.Column("risk_level", sa.String(20), nullable=True, server_default="medium"),
        sa.Column("status", sa.String(20), nullable=True, server_default="pending"),
        # ESG scores
        sa.Column("global_score", sa.Float, nullable=True),
        sa.Column("env_score", sa.Float, nullable=True),
        sa.Column("social_score", sa.Float, nullable=True),
        sa.Column("gov_score", sa.Float, nullable=True),
        # Structured data
        sa.Column("flags", postgresql.JSONB, nullable=True),
        sa.Column("questionnaire_data", postgresql.JSONB, nullable=True),
        # Portal token for supplier self-assessment
        sa.Column("portal_token", sa.String(64), nullable=True),
        sa.Column("portal_token_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("questionnaire_completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_scored_at", sa.DateTime(timezone=True), nullable=True),
        # Timestamps
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
    )

    # Index on tenant_id for efficient tenant-scoped queries
    op.create_index("ix_suppliers_tenant_id", "suppliers", ["tenant_id"])

    # Unique index on portal_token (partial: only non-NULL values)
    op.execute(
        """
        CREATE UNIQUE INDEX uq_suppliers_portal_token
        ON suppliers (portal_token)
        WHERE portal_token IS NOT NULL
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_suppliers_portal_token")
    op.drop_index("ix_suppliers_tenant_id", table_name="suppliers")
    op.drop_table("suppliers")
