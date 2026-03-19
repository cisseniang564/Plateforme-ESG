from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from typing import Dict, List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization
from app.models.indicator import Indicator
from app.models.indicator_data import IndicatorData

from app.schemas.org_dashboard import (
    OrgDashboardResponse,
    PillarSummary,
    IndicatorKPI,
    IndicatorStats,
    IndicatorPoint,
)


async def build_org_dashboard(db: AsyncSession, org_id: str) -> OrgDashboardResponse:
    org = await db.get(Organization, org_id)
    if not org:
        raise ValueError("ORG_NOT_FOUND")

    stmt = (
        select(
            Indicator.code,
            Indicator.name,
            Indicator.pillar,
            Indicator.unit,
            IndicatorData.date,
            IndicatorData.value,
            IndicatorData.source,
            IndicatorData.is_verified,
            IndicatorData.is_estimated,
            IndicatorData.updated_at,
        )
        .join(Indicator, Indicator.id == IndicatorData.indicator_id)
        .where(IndicatorData.organization_id == org_id)
        .order_by(Indicator.code.asc(), IndicatorData.date.asc())
    )

    res = await db.execute(stmt)
    rows = res.all()

    if not rows:
        return OrgDashboardResponse(
            organizationId=str(org_id),
            organizationName=org.name,
            totalPoints=0,
            lastUpdatedAt=None,
            pillarSummary=[],
            kpis=[],
        )

    by_indicator: Dict[str, List[Tuple]] = defaultdict(list)
    last_updated: Optional[datetime] = None

    for r in rows:
        code = r[0]
        by_indicator[code].append(r)
        upd = r[9]
        if upd and (last_updated is None or upd > last_updated):
            last_updated = upd

    pillar_acc = defaultdict(lambda: {"indicators": 0, "points": 0, "verified": 0, "estimated": 0})
    kpis: List[IndicatorKPI] = []

    for code, points in by_indicator.items():
        name = points[0][1]
        pillar = points[0][2]
        unit = points[0][3]

        values = [float(p[5]) for p in points]
        stats = IndicatorStats(
            current=values[-1],
            avg=sum(values) / len(values),
            min=min(values),
            max=max(values),
        )

        series = [
            IndicatorPoint(date=p[4], value=float(p[5]), source=p[6])
            for p in points
        ]

        kpis.append(
            IndicatorKPI(
                code=code,
                name=name,
                pillar=pillar,
                unit=unit,
                stats=stats,
                series=series,
            )
        )

        pillar_acc[pillar]["indicators"] += 1
        pillar_acc[pillar]["points"] += len(points)
        pillar_acc[pillar]["verified"] += sum(1 for p in points if p[7])
        pillar_acc[pillar]["estimated"] += sum(1 for p in points if p[8])

    pillar_summary: List[PillarSummary] = []
    for pillar, agg in pillar_acc.items():
        pts = agg["points"]
        verified = agg["verified"]
        estimated = agg["estimated"]
        pillar_summary.append(
            PillarSummary(
                pillar=pillar,
                indicators=agg["indicators"],
                points=pts,
                verified_points=verified,
                estimated_points=estimated,
                verified_rate=(verified / pts) if pts else 0.0,
                estimated_rate=(estimated / pts) if pts else 0.0,
            )
        )

    order = {"environmental": 1, "social": 2, "governance": 3}
    pillar_summary.sort(key=lambda x: order.get(x.pillar, 99))
    kpis.sort(key=lambda x: (order.get(x.pillar, 99), x.code))

    return OrgDashboardResponse(
        organizationId=str(org_id),
        organizationName=org.name,
        totalPoints=len(rows),
        lastUpdatedAt=last_updated,
        pillarSummary=pillar_summary,
        kpis=kpis,
    )
