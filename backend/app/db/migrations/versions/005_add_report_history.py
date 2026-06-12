"""Add report_history table

Revision ID: 005_add_report_history
Revises: 004_add_suppliers_table
Create Date: 2026-05-11
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "005_add_report_history"
down_revision: Union[str, None] = "004_add_suppliers_table"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "report_history",
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
            index=True,
        ),
        sa.Column("report_type", sa.String(50), nullable=False),
        sa.Column("format", sa.String(10), nullable=False),
        sa.Column("period", sa.String(20), nullable=False, server_default="annual"),
        sa.Column("year", sa.Integer, nullable=True),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "generated_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("file_size", sa.Integer, nullable=True),
        sa.Column("params", postgresql.JSONB, nullable=True),
        sa.Column("share_token", sa.String(64), nullable=True),
        sa.Column("share_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_message", sa.Text, nullable=True),
        # Timestamps
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    op.create_index("ix_report_history_tenant_created", "report_history", ["tenant_id", "created_at"])
    op.create_unique_constraint("uq_report_history_share_token", "report_history", ["share_token"])


def downgrade() -> None:
    op.drop_constraint("uq_report_history_share_token", "report_history", type_="unique")
    op.drop_index("ix_report_history_tenant_created", table_name="report_history")
    op.drop_table("report_history")
