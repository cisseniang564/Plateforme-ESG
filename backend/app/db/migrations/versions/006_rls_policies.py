"""Row-Level Security policies for all tenant-scoped tables.

Revision ID: 006
Revises: 005
Create Date: 2026-05-16

Tables covered (organizations + users already have RLS from 001):
  api_keys, audit_logs, auditor_reviews, data_entries, data_uploads,
  esg_scores, framework_assessments, indicator_data, indicator_formulas,
  indicators, integrations, materiality_issues, report_history,
  sector_weights, sso_configs, suppliers, webhooks, webhook_deliveries,
  roles (nullable tenant_id — system + tenant roles).

auditor_comments: no tenant_id column — protected through cascade FK
  from auditor_reviews; no direct RLS needed.

user_roles: join table without tenant_id — protected by RLS on parent tables.
"""
from alembic import op

revision: str = "006"
down_revision: str = "005"
branch_labels = None
depends_on = None

# Tables with a direct tenant_id column that need full RLS.
_TENANT_TABLES = [
    "api_keys",
    "audit_logs",
    "auditor_reviews",
    "data_entries",
    "data_uploads",
    "esg_scores",
    "framework_assessments",
    "indicator_data",
    "indicator_formulas",
    "indicators",
    "integrations",
    "materiality_issues",
    "report_history",
    "sector_weights",
    "sso_configs",
    "suppliers",
    "webhooks",
    "webhook_deliveries",
]

_POLICY_NAME = "tenant_isolation"
_USING = "tenant_id = current_setting('app.current_tenant_id', true)::uuid"
_CHECK = _USING  # same expression for INSERT / UPDATE checks


def upgrade() -> None:
    # ── Standard tenant tables ────────────────────────────────────────────────
    for table in _TENANT_TABLES:
        # Idempotent: DROP IF EXISTS before (re-)creating so reruns are safe.
        op.execute(f"DROP POLICY IF EXISTS {_POLICY_NAME} ON {table}")
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
        op.execute(f"""
            CREATE POLICY {_POLICY_NAME} ON {table}
                FOR ALL
                USING ({_USING})
                WITH CHECK ({_CHECK})
        """)

    # ── roles: nullable tenant_id (NULL = system role, shared across tenants) ─
    # Policy: allow rows where tenant_id IS NULL (system roles) OR matches caller.
    op.execute("DROP POLICY IF EXISTS tenant_isolation ON roles")
    op.execute("ALTER TABLE roles ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE roles FORCE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY tenant_isolation ON roles
            FOR ALL
            USING (
                tenant_id IS NULL
                OR tenant_id = current_setting('app.current_tenant_id', true)::uuid
            )
            WITH CHECK (
                tenant_id IS NULL
                OR tenant_id = current_setting('app.current_tenant_id', true)::uuid
            )
    """)

    # ── Bypass for the application superuser role (if used) ───────────────────
    # Grants the app DB user the ability to bypass RLS when running migrations
    # or admin tasks. This does NOT affect runtime queries (which run as the
    # same role but always set app.current_tenant_id before querying).
    # Nothing to do here — BYPASSRLS should be granted at the DB-role level,
    # not in a migration. Left as a comment for ops reference.


def downgrade() -> None:
    for table in _TENANT_TABLES:
        op.execute(f"DROP POLICY IF EXISTS {_POLICY_NAME} ON {table}")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")

    op.execute("DROP POLICY IF EXISTS tenant_isolation ON roles")
    op.execute("ALTER TABLE roles DISABLE ROW LEVEL SECURITY")
