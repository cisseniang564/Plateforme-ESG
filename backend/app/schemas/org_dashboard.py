from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel


class IndicatorPoint(BaseModel):
    date: date
    value: float
    source: str


class IndicatorStats(BaseModel):
    current: float
    avg: float
    min: float
    max: float


class IndicatorKPI(BaseModel):
    code: str
    name: str
    pillar: str
    unit: Optional[str] = None
    stats: IndicatorStats
    series: List[IndicatorPoint]


class PillarSummary(BaseModel):
    pillar: str
    indicators: int
    points: int
    verified_points: int
    estimated_points: int
    verified_rate: float
    estimated_rate: float


class OrgDashboardResponse(BaseModel):
    organizationId: str
    organizationName: str
    totalPoints: int
    lastUpdatedAt: Optional[datetime] = None
    pillarSummary: List[PillarSummary]
    kpis: List[IndicatorKPI]
