"""Migrate SFDR (localStorage) + Taxonomy (Redis volatile) to proper DB tables.

Creates 4 tables:
  * sfdr_reports        — one per (tenant, fund_id, year), holds article + policy
  * sfdr_pai_values     — 18 PAI indicators per report
  * taxonomy_assessments — one per (tenant, year), holds context + denominators
  * taxonomy_activities — individual NACE activities with eligibility/alignment

Removes the persistence risks identified in the internal audit:
  * SFDR data loss when user clears cookies or changes device (localStorage)
  * Taxonomy data loss on Redis restart (volatile cache)

Revision ID: 010_sfdr_taxonomy_db
Revises: 009_vigilance
Create Date: 2026-05-30
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "010_sfdr_taxonomy_db"
down_revision: Union[str, None] = "009_vigilance"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── sfdr_reports ─────────────────────────────────────────────────────────
    op.create_table(
        "sfdr_reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("fund_id", sa.String(length=64), nullable=False),
        sa.Column("fund_name", sa.String(length=255), nullable=False),
        sa.Column("article", sa.String(length=20), nullable=False, server_default="article8"),
        sa.Column("policy_text", sa.Text(), nullable=True),
        sa.Column("policy_edited", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="draft"),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("tenant_id", "fund_id", "year", name="uq_sfdr_report"),
    )
    op.create_index("idx_sfdr_report_tenant_year", "sfdr_reports", ["tenant_id", "year"])

    # ── sfdr_pai_values ──────────────────────────────────────────────────────
    op.create_table(
        "sfdr_pai_values",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("report_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("sfdr_reports.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("metric_key", sa.String(length=64), nullable=False),
        sa.Column("pai_number", sa.Integer(), nullable=False),
        sa.Column("value", sa.Numeric(20, 4), nullable=True),
        sa.Column("unit", sa.String(length=50), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("report_id", "metric_key", name="uq_sfdr_pai_metric"),
    )
    op.create_index("idx_sfdr_pai_tenant", "sfdr_pai_values", ["tenant_id"])

    # ── taxonomy_assessments ─────────────────────────────────────────────────
    op.create_table(
        "taxonomy_assessments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="draft"),
        sa.Column("total_turnover_eur", sa.Numeric(20, 2), nullable=True),
        sa.Column("total_capex_eur", sa.Numeric(20, 2), nullable=True),
        sa.Column("total_opex_eur", sa.Numeric(20, 2), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("tenant_id", "year", name="uq_taxonomy_assess"),
    )
    op.create_index("idx_taxonomy_assess_tenant", "taxonomy_assessments", ["tenant_id"])

    # ── taxonomy_activities ──────────────────────────────────────────────────
    op.create_table(
        "taxonomy_activities",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("assessment_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("taxonomy_assessments.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("activity_code", sa.String(length=50), nullable=True),
        sa.Column("label", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("objective", sa.String(length=40), nullable=False, server_default="climate_mitigation"),
        sa.Column("is_eligible", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="unassessed"),
        sa.Column("substantial_contribution", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("dnsh_climate_mitigation", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("dnsh_climate_adaptation", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("dnsh_water_marine", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("dnsh_circular_economy", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("dnsh_pollution", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("dnsh_biodiversity", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("minimum_safeguards", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("turnover_eur", sa.Numeric(20, 2), nullable=True),
        sa.Column("capex_eur", sa.Numeric(20, 2), nullable=True),
        sa.Column("opex_eur", sa.Numeric(20, 2), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("evidence_url", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_taxonomy_act_assess", "taxonomy_activities", ["assessment_id"])
    op.create_index("idx_taxonomy_act_status", "taxonomy_activities", ["tenant_id", "status"])
    op.create_index("idx_taxonomy_act_objective", "taxonomy_activities", ["tenant_id", "objective"])


def downgrade() -> None:
    op.drop_index("idx_taxonomy_act_objective", table_name="taxonomy_activities")
    op.drop_index("idx_taxonomy_act_status", table_name="taxonomy_activities")
    op.drop_index("idx_taxonomy_act_assess", table_name="taxonomy_activities")
    op.drop_table("taxonomy_activities")

    op.drop_index("idx_taxonomy_assess_tenant", table_name="taxonomy_assessments")
    op.drop_table("taxonomy_assessments")

    op.drop_index("idx_sfdr_pai_tenant", table_name="sfdr_pai_values")
    op.drop_table("sfdr_pai_values")

    op.drop_index("idx_sfdr_report_tenant_year", table_name="sfdr_reports")
    op.drop_table("sfdr_reports")
