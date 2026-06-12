"""Add SHA-256 hash chain to audit_logs (entry_hash, previous_hash).

The chain creates an append-only structure where any modification of a past
entry breaks the chain downstream and is detectable via /audit-trail/verify.

Revision ID: 006_audit_log_hash_chain
Revises: 005_add_report_history
Create Date: 2026-05-27
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "006_audit_log_hash_chain"
down_revision: Union[str, None] = "005_add_report_history"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # entry_hash: SHA-256 hex of (canonical content + previous_hash), 64 chars.
    op.add_column(
        "audit_logs",
        sa.Column(
            "entry_hash",
            sa.String(length=64),
            nullable=True,
            comment="SHA-256 hex of (canonical content + previous_hash). 64 chars.",
        ),
    )
    # previous_hash: pointer to the previous entry's hash in the per-tenant chain.
    op.add_column(
        "audit_logs",
        sa.Column(
            "previous_hash",
            sa.String(length=64),
            nullable=True,
            comment="Previous entry_hash in the per-tenant chain. NULL for genesis.",
        ),
    )

    # Indexes for efficient lookup and verification walks.
    op.create_index(
        "idx_audit_entry_hash",
        "audit_logs",
        ["entry_hash"],
        unique=False,
    )
    op.create_index(
        "idx_audit_tenant_created",
        "audit_logs",
        ["tenant_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("idx_audit_tenant_created", table_name="audit_logs")
    op.drop_index("idx_audit_entry_hash", table_name="audit_logs")
    op.drop_column("audit_logs", "previous_hash")
    op.drop_column("audit_logs", "entry_hash")
