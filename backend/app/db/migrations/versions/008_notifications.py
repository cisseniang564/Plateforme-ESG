"""Add notifications table for proactive in-app + email notifications.

Replaces (additively) the audit_log-derived activity feed with a real
notifications store. Existing /notifications endpoint reads from both
sources and merges in the API layer.

Revision ID: 008_notifications
Revises: 007_org_multi_entity
Create Date: 2026-05-28
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "008_notifications"
down_revision: Union[str, None] = "007_org_multi_entity"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"),
                  nullable=True),
        sa.Column("type", sa.String(length=30), nullable=False, index=True),
        sa.Column("priority", sa.String(length=10), nullable=False, server_default="medium"),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("link", sa.String(length=500), nullable=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("dismissed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("dedupe_key", sa.String(length=255), nullable=True, index=True),
        sa.Column("metadata_json", postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_notif_tenant_user", "notifications", ["tenant_id", "user_id"])
    op.create_index("idx_notif_tenant_unread", "notifications", ["tenant_id", "read_at"])
    op.create_index("idx_notif_dedupe", "notifications", ["tenant_id", "dedupe_key"])


def downgrade() -> None:
    op.drop_index("idx_notif_dedupe", table_name="notifications")
    op.drop_index("idx_notif_tenant_unread", table_name="notifications")
    op.drop_index("idx_notif_tenant_user", table_name="notifications")
    op.drop_table("notifications")
