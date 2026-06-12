"""Generic framework data endpoint.

Handles GET / POST for:
  - climate_scenarios
  - investor_relations
  - ixbrl

All data is stored as JSONB in framework_assessments, keyed by
(tenant_id, user_id, framework).  Zero Redis dependency.
"""
import logging
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends, Request, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user
from app.db.session import get_db
from app.models.framework_assessment import FrameworkAssessment
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/framework-data", tags=["Framework Data"])

# Allowed keys — security allowlist so clients can't write arbitrary keys
_ALLOWED = frozenset({"climate_scenarios", "investor_relations", "ixbrl"})


class FrameworkSaveRequest(BaseModel):
    data: Dict[str, Any] = {}


@router.get("/{framework_key}")
async def get_framework_data(
    framework_key: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return saved framework data for the current user."""
    if framework_key not in _ALLOWED:
        raise HTTPException(status_code=400, detail=f"Unknown framework: {framework_key}")

    tenant_id = getattr(request.state, "tenant_id", None)
    if not tenant_id:
        return {"data": {}, "last_saved": None}

    try:
        result = await db.execute(
            select(FrameworkAssessment).where(
                FrameworkAssessment.tenant_id == tenant_id,
                FrameworkAssessment.user_id == current_user.id,
                FrameworkAssessment.framework == framework_key,
            )
        )
        row = result.scalar_one_or_none()
        if row and row.data:
            return row.data  # payload already includes last_saved
        return {"data": {}, "last_saved": None}
    except Exception as exc:
        logger.warning("framework_data GET error (%s, tenant=%s): %s", framework_key, tenant_id, exc)
        return {"data": {}, "last_saved": None}


@router.post("/{framework_key}")
async def save_framework_data(
    framework_key: str,
    req: FrameworkSaveRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upsert framework data for the current user."""
    if framework_key not in _ALLOWED:
        raise HTTPException(status_code=400, detail=f"Unknown framework: {framework_key}")

    tenant_id = getattr(request.state, "tenant_id", None)
    now_iso = datetime.now(timezone.utc).isoformat()
    payload = {**req.data, "last_saved": now_iso}

    if not tenant_id:
        logger.warning("framework_data save skipped: no tenant_id (framework=%s)", framework_key)
        return {"status": "saved", "last_saved": now_iso}

    try:
        await db.execute(
            pg_insert(FrameworkAssessment)
            .values(
                tenant_id=tenant_id,
                user_id=current_user.id,
                framework=framework_key,
                data=payload,
            )
            .on_conflict_do_update(
                index_elements=["tenant_id", "user_id", "framework"],
                set_={"data": payload, "updated_at": datetime.now(timezone.utc)},
            )
        )
        await db.flush()
    except Exception as exc:
        logger.warning("framework_data save error (%s, tenant=%s): %s", framework_key, tenant_id, exc)

    return {"status": "saved", "last_saved": now_iso}
