from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.indicator_data import IndicatorData
from app.models.indicator import Indicator

router = APIRouter(prefix="/api/v1/org-indicators", tags=["Org Indicators"])

@router.get("/{org_id}")
def get_org_indicators(org_id: str, db: Session = Depends(get_db)):
    rows = (
        db.query(IndicatorData)
        .filter(IndicatorData.organization_id == org_id)
        .all()
    )

    return {
        "organizationId": org_id,
        "totalPoints": len(rows)
    }
