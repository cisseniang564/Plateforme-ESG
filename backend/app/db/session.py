"""
Database session management.
"""
from typing import AsyncGenerator

from fastapi import Request
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.config import settings

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

# Async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
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

    Using ``transaction_local=true`` scopes these variables to the current
    transaction only, preventing any context leakage across pooled connections.

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
                    text("SELECT set_config('app.current_tenant_id', :tid, true)"),
                    {"tid": str(tenant_id)},
                )
            if user_id:
                await session.execute(
                    text("SELECT set_config('app.current_user_id', :uid, true)"),
                    {"uid": str(user_id)},
                )

            yield session
            await session.commit()

        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """
    Create all tables from the current metadata.

    For development and testing only — use Alembic migrations in production.
    """
    from app.db.base import Base  # noqa: PLC0415 (local import avoids circular refs)

    if settings.APP_ENV in {"development", "test"}:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)


async def close_db() -> None:
    """Dispose of all pooled connections."""
    await engine.dispose()
