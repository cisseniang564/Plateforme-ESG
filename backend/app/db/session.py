"""
Database session management.
"""
import logging
from typing import AsyncGenerator

from fastapi import Request
from sqlalchemy import inspect as sa_inspect, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.config import settings

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# SafeAsyncSession — wraps ``refresh()`` so a failed reload doesn't leave the
# instance in "expired" state. Without this guard, when ``refresh()`` raises
# (RLS hiding the just-inserted row, network blip, …) SQLAlchemy has already
# expired the attributes — and the next attribute read triggers a synchronous
# lazy-load that crashes with ``MissingGreenlet: greenlet_spawn has not been
# called`` because we're in an async context.
#
# Strategy: snapshot the loaded attribute dict *before* refresh, attempt the
# refresh, and on failure restore the snapshot so attributes stay readable
# from in-memory state.
# ─────────────────────────────────────────────────────────────────────────────
class SafeAsyncSession(AsyncSession):
    async def refresh(self, instance, *args, **kwargs):  # type: ignore[override]
        # Snapshot the currently loaded attributes (column properties only)
        try:
            state = sa_inspect(instance)
            snapshot = {
                key: state.dict.get(key)
                for key in state.dict.keys()
                if key in state.attrs.keys()
            }
        except Exception:
            snapshot = None

        try:
            return await super().refresh(instance, *args, **kwargs)
        except Exception as exc:
            logger.warning(
                "Refresh failed for %s — restoring in-memory state. Error: %s",
                type(instance).__name__, exc,
            )
            # Restore attributes from snapshot so downstream code can still
            # read them without triggering a sync lazy-load.
            if snapshot:
                try:
                    state = sa_inspect(instance)
                    for key, value in snapshot.items():
                        try:
                            state.dict[key] = value
                        except Exception:
                            pass
                except Exception:
                    pass
            return instance

# Create async engine
engine = create_async_engine(
    str(settings.DATABASE_URL),
    echo=settings.APP_DEBUG,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_timeout=settings.DATABASE_POOL_TIMEOUT,
    pool_recycle=settings.DATABASE_POOL_RECYCLE,
    pool_pre_ping=True,
    poolclass=NullPool if settings.APP_ENV == "test" else None,
)

# Async session factory — uses SafeAsyncSession so a failed refresh() doesn't
# leave instances in an expired state that crashes on the next attribute read.
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=SafeAsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db(request: Request) -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency — yields an async database session.

    Row-Level Security context
    --------------------------
    Before yielding, this function sets two PostgreSQL session variables in the
    **same** connection that will be used by the endpoint:

    - ``app.current_tenant_id`` — used by RLS policies to filter rows by tenant
    - ``app.current_user_id``   — used by audit-trigger functions

    Uses ``is_local=false`` (session-wide) so the context survives ``commit()``
    calls within the request. WITHOUT this, any ``db.refresh()`` or follow-up
    SELECT after a commit would run with an empty RLS context and fail with
    "Could not refresh instance" because the row gets filtered out by the
    USING policy.

    To prevent context leakage across pooled connections, the ``finally``
    block clears both settings before the connection is returned to the pool.

    Usage::

        @app.get("/items")
        async def read_items(db: AsyncSession = Depends(get_db)):
            result = await db.execute(select(Item))
            return result.scalars().all()
    """
    async with AsyncSessionLocal() as session:
        try:
            # Set RLS context variables in the same connection used by the query
            tenant_id = getattr(request.state, "tenant_id", None)
            user_id = getattr(request.state, "user_id", None)

            if tenant_id:
                await session.execute(
                    text("SELECT set_config('app.current_tenant_id', :tid, false)"),
                    {"tid": str(tenant_id)},
                )
            if user_id:
                await session.execute(
                    text("SELECT set_config('app.current_user_id', :uid, false)"),
                    {"uid": str(user_id)},
                )

            yield session
            await session.commit()

        except Exception:
            await session.rollback()
            raise
        finally:
            # Clear RLS context BEFORE the connection returns to the pool —
            # prevents one request's tenant from leaking into the next request
            # that ends up on the same pooled connection.
            try:
                await session.execute(
                    text("SELECT set_config('app.current_tenant_id', '', false)")
                )
                await session.execute(
                    text("SELECT set_config('app.current_user_id', '', false)")
                )
                await session.commit()  # commit the reset
            except Exception:
                pass
            await session.close()


async def init_db() -> None:
    """
    Create all tables from the current metadata.

    For development and testing only — use Alembic migrations in production.
    Also runs incremental ADD COLUMN IF NOT EXISTS for new columns added to
    existing models, so that hot-reload picks them up automatically.
    """
    from app.db.base import Base  # noqa: PLC0415 (local import avoids circular refs)

    # ── Incremental schema migrations — run in ALL environments ──────────────
    # Every statement is idempotent (IF NOT EXISTS / safe DDL).
    # create_all() is limited to dev/test; incremental DDL runs everywhere so
    # new tables and columns are created on the production server at startup.
    # Tables with a direct tenant_id column that need RLS policies.
    _rls_tables = [
        "api_keys", "audit_logs", "auditor_reviews",
        "data_entries", "data_uploads", "esg_scores",
        "framework_assessments", "indicator_data", "indicator_formulas",
        "indicators", "integrations", "materiality_issues",
        "report_history", "sector_weights", "sso_configs",
        "suppliers", "webhooks", "webhook_deliveries",
    ]
    _rls_using = "tenant_id = current_setting('app.current_tenant_id', true)::uuid"

    _migrations: list[str] = [
        # ── 2FA fields on users ───────────────────────────────────────────────
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(64)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_backup_codes JSONB",

        # ── Score data window (6m/1y/3y/5y) persisted on each ESG score row ─
        "ALTER TABLE esg_scores ADD COLUMN IF NOT EXISTS period_months INTEGER DEFAULT 12",

        # ── CSRD IRO classification on materiality issues (ESRS 1 §43) ───────
        "ALTER TABLE materiality_issues ADD COLUMN IF NOT EXISTS iro_type VARCHAR(20)",
        "ALTER TABLE materiality_issues ADD COLUMN IF NOT EXISTS iro_actual_or_potential VARCHAR(20)",
        "ALTER TABLE materiality_issues ADD COLUMN IF NOT EXISTS esrs_topic VARCHAR(10)",

        # ── Framework assessments (CDP, CSDDD, climate, investor, iXBRL) ─────
        """
        CREATE TABLE IF NOT EXISTS framework_assessments (
            id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            user_id     UUID                 REFERENCES users(id)   ON DELETE SET NULL,
            framework   VARCHAR(50) NOT NULL,
            data        JSONB,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """,
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_framework_assessments_tenant_user_framework
            ON framework_assessments (tenant_id, user_id, framework)
        """,
        "CREATE INDEX IF NOT EXISTS ix_framework_assessments_tenant_id ON framework_assessments (tenant_id)",
        "CREATE INDEX IF NOT EXISTS ix_framework_assessments_user_id   ON framework_assessments (user_id)",
        "CREATE INDEX IF NOT EXISTS ix_framework_assessments_framework  ON framework_assessments (framework)",
    ]

    # ── RLS policy migrations (idempotent: DROP IF EXISTS then CREATE) ────────
    for _tbl in _rls_tables:
        _migrations += [
            f"DROP POLICY IF EXISTS tenant_isolation ON {_tbl}",
            f"ALTER TABLE {_tbl} ENABLE ROW LEVEL SECURITY",
            f"ALTER TABLE {_tbl} FORCE ROW LEVEL SECURITY",
            f"CREATE POLICY tenant_isolation ON {_tbl} FOR ALL USING ({_rls_using}) WITH CHECK ({_rls_using})",
        ]

    # roles: nullable tenant_id (NULL = system role shared across tenants)
    _migrations += [
        "DROP POLICY IF EXISTS tenant_isolation ON roles",
        "ALTER TABLE roles ENABLE ROW LEVEL SECURITY",
        "ALTER TABLE roles FORCE ROW LEVEL SECURITY",
        """
        CREATE POLICY tenant_isolation ON roles FOR ALL
            USING (
                tenant_id IS NULL
                OR tenant_id = current_setting('app.current_tenant_id', true)::uuid
            )
            WITH CHECK (
                tenant_id IS NULL
                OR tenant_id = current_setting('app.current_tenant_id', true)::uuid
            )
        """,
    ]

    # tenants: allow bootstrap (registration, demo) when no RLS context is set
    _migrations += [
        "DROP POLICY IF EXISTS tenants_self_isolation ON tenants",
        "ALTER TABLE tenants ENABLE ROW LEVEL SECURITY",
        "ALTER TABLE tenants FORCE ROW LEVEL SECURITY",
        """
        CREATE POLICY tenants_self_isolation ON tenants FOR ALL
            USING (
                id = (NULLIF(current_setting('app.current_tenant_id', true), ''))::uuid
                OR NULLIF(current_setting('app.current_tenant_id', true), '') IS NULL
            )
            WITH CHECK (true)
        """,
    ]

    async with engine.begin() as conn:
        # create_all only in dev/test — Alembic owns production schema otherwise
        if settings.APP_ENV in {"development", "test"}:
            await conn.run_sync(Base.metadata.create_all)

        for sql in _migrations:
            try:
                await conn.execute(text(sql))
            except Exception:
                pass  # already exists — safe to ignore


async def close_db() -> None:
    """Dispose of all pooled connections."""
    await engine.dispose()
