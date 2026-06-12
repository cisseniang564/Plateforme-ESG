"""Add Vigilance module (Loi 2017-399 devoir de vigilance + Sapin 2).

Creates 4 tables:
  * vigilance_plans   — yearly Plan de vigilance (Art. L225-102-4)
  * vigilance_risks   — Cartographie des risques (severity × likelihood matrix)
  * vigilance_actions — Mitigation actions linked to risks
  * vigilance_alerts  — Internal alert channel (supports anonymous reports)

Aligned with:
  * Loi n°2017-399 du 27 mars 2017 (devoir de vigilance)
  * Loi n°2016-1691 du 9 décembre 2016 (Sapin 2)
  * Code de commerce art. L225-102-4 et L225-102-5
  * Décret n°2017-564 (mécanisme d'alerte Sapin 2 — Art. 8)

Revision ID: 009_vigilance
Revises: 008_notifications
Create Date: 2026-05-28
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "009_vigilance"
down_revision: Union[str, None] = "008_notifications"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── vigilance_plans ──────────────────────────────────────────────────────
    op.create_table(
        "vigilance_plans",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="draft"),
        sa.Column("risk_mapping_summary", sa.Text(), nullable=True),
        sa.Column("assessment_procedures", sa.Text(), nullable=True),
        sa.Column("mitigation_actions", sa.Text(), nullable=True),
        sa.Column("alert_mechanism", sa.Text(), nullable=True),
        sa.Column("monitoring_scheme", sa.Text(), nullable=True),
        sa.Column("covers_subsidiaries", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("covers_suppliers", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("covers_subcontractors", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("stakeholders_consulted", sa.Text(), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("published_url", sa.String(length=500), nullable=True),
        sa.Column("approved_by_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("tenant_id", "year", name="uq_vigilance_plan_tenant_year"),
    )
    op.create_index("idx_vigilance_plan_status", "vigilance_plans", ["tenant_id", "status"])

    # ── vigilance_risks ──────────────────────────────────────────────────────
    op.create_table(
        "vigilance_risks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("plan_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("vigilance_plans.id", ondelete="CASCADE"), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("category", sa.String(length=30), nullable=False, index=True),
        sa.Column("scope", sa.String(length=30), nullable=False),
        sa.Column("severity", sa.Integer(), nullable=False),
        sa.Column("likelihood", sa.Integer(), nullable=False),
        sa.Column("residual_severity", sa.Integer(), nullable=True),
        sa.Column("residual_likelihood", sa.Integer(), nullable=True),
        sa.Column("countries", postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column("source_reference", sa.String(length=255), nullable=True),
        sa.Column("owner_user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_vigilance_risk_plan", "vigilance_risks", ["plan_id"])
    op.create_index("idx_vigilance_risk_category", "vigilance_risks", ["tenant_id", "category"])
    op.create_index("idx_vigilance_risk_score", "vigilance_risks", ["tenant_id", "severity", "likelihood"])

    # ── vigilance_actions ────────────────────────────────────────────────────
    op.create_table(
        "vigilance_actions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("risk_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("vigilance_risks.id", ondelete="CASCADE"),
                  nullable=False, index=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="planned"),
        sa.Column("priority", sa.String(length=10), nullable=False, server_default="medium"),
        sa.Column("deadline", sa.Date(), nullable=True),
        sa.Column("completed_at", sa.Date(), nullable=True),
        sa.Column("owner_user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("budget_eur", sa.Integer(), nullable=True),
        sa.Column("evidence_url", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_vigilance_action_status", "vigilance_actions", ["tenant_id", "status"])
    op.create_index("idx_vigilance_action_deadline", "vigilance_actions", ["tenant_id", "deadline"])

    # ── vigilance_alerts ─────────────────────────────────────────────────────
    op.create_table(
        "vigilance_alerts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("case_number", sa.String(length=20), nullable=False),
        sa.Column("reporter_name", sa.String(length=150), nullable=True),
        sa.Column("reporter_email", sa.String(length=255), nullable=True),
        sa.Column("reporter_role", sa.String(length=100), nullable=True),
        sa.Column("is_anonymous", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("category", sa.String(length=30), nullable=False, index=True),
        sa.Column("severity", sa.String(length=10), nullable=False, server_default="medium"),
        sa.Column("subject", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("country", sa.String(length=2), nullable=True),
        sa.Column("location", sa.String(length=255), nullable=True),
        sa.Column("organization_concerned", sa.String(length=255), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="new"),
        sa.Column("assigned_to_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("closure_notes", sa.Text(), nullable=True),
        sa.Column("source", sa.String(length=50), nullable=True, server_default="web_form"),
        sa.Column("linked_risk_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("vigilance_risks.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("tenant_id", "case_number", name="uq_vigilance_alert_case"),
    )
    op.create_index("idx_vigilance_alert_status", "vigilance_alerts", ["tenant_id", "status"])
    op.create_index("idx_vigilance_alert_category", "vigilance_alerts", ["tenant_id", "category"])


def downgrade() -> None:
    op.drop_index("idx_vigilance_alert_category", table_name="vigilance_alerts")
    op.drop_index("idx_vigilance_alert_status", table_name="vigilance_alerts")
    op.drop_table("vigilance_alerts")

    op.drop_index("idx_vigilance_action_deadline", table_name="vigilance_actions")
    op.drop_index("idx_vigilance_action_status", table_name="vigilance_actions")
    op.drop_table("vigilance_actions")

    op.drop_index("idx_vigilance_risk_score", table_name="vigilance_risks")
    op.drop_index("idx_vigilance_risk_category", table_name="vigilance_risks")
    op.drop_index("idx_vigilance_risk_plan", table_name="vigilance_risks")
    op.drop_table("vigilance_risks")

    op.drop_index("idx_vigilance_plan_status", table_name="vigilance_plans")
    op.drop_table("vigilance_plans")
