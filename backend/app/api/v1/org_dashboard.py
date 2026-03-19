from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.org_dashboard import OrgDashboardResponse
from app.services.org_dashboard_service import build_org_dashboard

router = APIRouter(prefix="/orgs", tags=["Org Dashboard"])


@router.get("/{org_id}/dashboard", response_model=OrgDashboardResponse)
async def org_dashboard(org_id: str, db: AsyncSession = Depends(get_db)):
    try:
        return await build_org_dashboard(db=db, org_id=org_id)
    except ValueError as e:
        if str(e) == "ORG_NOT_FOUND":
            raise HTTPException(status_code=404, detail="Organization not found")
        raise
