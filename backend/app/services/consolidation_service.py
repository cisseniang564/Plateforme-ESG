"""
Consolidation Service — roll-up ESG indicators across an organization hierarchy.

Given a parent organization, this service:
  1. Walks its subtree (parent + all descendants).
  2. Applies each subsidiary's consolidation_method:
     - full        → contribute 100% of the indicator value
     - proportional → contribute value × (ownership_percentage / 100)
     - equity       → exclude from rollup (equity-accounted, not consolidated)
     - none         → exclude
  3. Sums the contributions per indicator/period.

The service treats only numeric indicators. Qualitative indicators (text,
boolean) are NOT consolidated — they remain per-organization.

Aligned with:
  * IFRS 10 (consolidated financial statements)
  * Code de commerce art. L233-16 (méthodes de consolidation)
  * ESRS 2 General Disclosures BP-2 (basis of preparation)
"""
from __future__ import annotations

import logging
from decimal import Decimal
from typing import Dict, List, Optional, Set, Tuple
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization
from app.models.indicator_data import IndicatorData
from app.models.indicator import Indicator

logger = logging.getLogger(__name__)


class ConsolidationService:
    """Service to compute consolidated ESG metrics for a parent organization."""

    def __init__(self, db: AsyncSession, tenant_id: UUID):
        self.db = db
        self.tenant_id = tenant_id

    # ── Public API ────────────────────────────────────────────────────────────

    async def consolidate(
        self,
        parent_org_id: UUID,
        period: Optional[str] = None,
        indicator_codes: Optional[List[str]] = None,
    ) -> Dict:
        """
        Build a consolidated report for *parent_org_id*.

        Args:
            parent_org_id: The org whose subtree should be aggregated.
            period: ISO date or year to filter ("2025" or "2025-12-31").
                    If None, aggregate all available data.
            indicator_codes: Limit to these indicators (None = all).

        Returns:
            Dict with shape matching ConsolidatedReportResponse schema.
        """
        parent = await self._get_org(parent_org_id)
        if parent is None:
            return self._empty_report(parent_org_id, period)

        # Collect the full subtree (parent + descendants).
        subtree = await self._collect_subtree(parent_org_id)
        included_ids = [o.id for o in subtree if self._is_consolidated(o)]
        excluded = len(subtree) - len(included_ids)

        if not included_ids:
            logger.info(
                "Consolidation: org %s has no consolidated descendants", parent_org_id
            )
            return self._empty_report(parent_org_id, period, parent_name=parent.name)

        # Compute weights per org (1.0 for full, fraction for proportional).
        weights: Dict[UUID, Decimal] = {
            o.id: o.effective_ownership() for o in subtree if o.id in set(included_ids)
        }

        # Aggregate indicators with weights applied.
        indicators = await self._aggregate_indicators(
            org_ids=list(weights.keys()),
            weights=weights,
            period=period,
            indicator_codes=indicator_codes,
        )

        # Detect the dominant method to label the report.
        methods = {o.consolidation_method or "full" for o in subtree if o.id in weights}
        label = "mixed" if len(methods) > 1 else next(iter(methods), "full")

        return {
            "parent_org_id": parent_org_id,
            "parent_org_name": parent.name,
            "period": period,
            "method": label,
            "indicators": indicators,
            "descendants_included": len(included_ids) - 1,  # exclude parent itself
            "descendants_excluded": excluded,
        }

    async def get_tree(self, root_org_id: Optional[UUID] = None) -> List[Dict]:
        """
        Return the hierarchy as a nested tree.

        If root_org_id is None, returns all root organizations (parent_org_id IS NULL)
        of the tenant with their children recursively.

        Returns a list of dicts compatible with OrganizationTreeNode schema.
        """
        stmt = select(Organization).where(Organization.tenant_id == self.tenant_id)
        if root_org_id is None:
            stmt = stmt.where(Organization.parent_org_id.is_(None))
        else:
            stmt = stmt.where(Organization.id == root_org_id)

        result = await self.db.execute(stmt)
        roots = result.scalars().all()

        # Load all orgs of the tenant once, then build the tree in memory
        # (avoids N+1 queries on deeply nested trees).
        all_orgs_stmt = select(Organization).where(
            Organization.tenant_id == self.tenant_id
        )
        all_orgs_result = await self.db.execute(all_orgs_stmt)
        all_orgs = list(all_orgs_result.scalars().all())

        by_parent: Dict[Optional[UUID], List[Organization]] = {}
        for org in all_orgs:
            by_parent.setdefault(org.parent_org_id, []).append(org)

        def serialize(org: Organization) -> Dict:
            return {
                "id": org.id,
                "name": org.name,
                "org_type": org.org_type,
                "consolidation_method": org.consolidation_method,
                "ownership_percentage": org.ownership_percentage,
                "is_active": org.is_active,
                "children": [serialize(child) for child in by_parent.get(org.id, [])],
            }

        return [serialize(r) for r in roots]

    # ── Internal helpers ──────────────────────────────────────────────────────

    async def _get_org(self, org_id: UUID) -> Optional[Organization]:
        stmt = select(Organization).where(
            Organization.id == org_id,
            Organization.tenant_id == self.tenant_id,
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def _collect_subtree(self, root_id: UUID) -> List[Organization]:
        """
        Return root + all descendants as a flat list. Uses an iterative BFS
        to avoid stack overflow on very deep hierarchies (rare but cheap to
        guard against).
        """
        # Load all orgs of the tenant once — avoids N round-trips per level.
        stmt = select(Organization).where(Organization.tenant_id == self.tenant_id)
        result = await self.db.execute(stmt)
        all_orgs = list(result.scalars().all())
        by_parent: Dict[Optional[UUID], List[Organization]] = {}
        by_id: Dict[UUID, Organization] = {}
        for org in all_orgs:
            by_parent.setdefault(org.parent_org_id, []).append(org)
            by_id[org.id] = org

        root = by_id.get(root_id)
        if root is None:
            return []

        out: List[Organization] = [root]
        queue: List[Organization] = [root]
        seen: Set[UUID] = {root.id}

        while queue:
            current = queue.pop(0)
            for child in by_parent.get(current.id, []):
                if child.id in seen:
                    # Defensive: cycle guard (the create endpoint already blocks
                    # cycles but a manual DB edit could create one).
                    logger.warning("Cycle detected at org %s — skipping", child.id)
                    continue
                seen.add(child.id)
                out.append(child)
                queue.append(child)

        return out

    @staticmethod
    def _is_consolidated(org: Organization) -> bool:
        """An org is included in rollups if its method is full or proportional."""
        method = (org.consolidation_method or "full").lower()
        return method in ("full", "proportional")

    async def _aggregate_indicators(
        self,
        org_ids: List[UUID],
        weights: Dict[UUID, Decimal],
        period: Optional[str],
        indicator_codes: Optional[List[str]],
    ) -> List[Dict]:
        """Sum numeric indicators across org_ids with per-org weights applied."""
        stmt = (
            select(IndicatorData, Indicator)
            .join(Indicator, IndicatorData.indicator_id == Indicator.id)
            .where(
                IndicatorData.tenant_id == self.tenant_id,
                IndicatorData.organization_id.in_(org_ids),
            )
        )
        if period:
            # Match prefix on period (e.g. "2025" matches "2025-12-31").
            # IndicatorData uses a single `date` column for the observation date.
            import sqlalchemy as sa
            stmt = stmt.where(sa.func.cast(IndicatorData.date, sa.String).like(f"{period}%"))

        if indicator_codes:
            stmt = stmt.where(Indicator.code.in_(indicator_codes))

        result = await self.db.execute(stmt)
        rows = result.all()

        # Bucket by (indicator_code, period) → accumulator
        buckets: Dict[Tuple[str, str], Dict] = {}
        for data, indicator in rows:
            # Only consolidate numeric values.
            try:
                raw_value = Decimal(str(data.value)) if data.value is not None else None
            except (TypeError, ValueError):
                continue
            if raw_value is None:
                continue

            weight = weights.get(data.organization_id, Decimal("1"))
            contribution = raw_value * weight

            period_str = data.date.isoformat() if data.date else "all"
            key = (indicator.code, period_str)
            bucket = buckets.setdefault(
                key,
                {
                    "indicator_code": indicator.code,
                    "indicator_name": indicator.name,
                    "unit": indicator.unit,
                    "period": period_str,
                    "value": Decimal("0"),
                    "contributing_orgs": 0,
                },
            )
            bucket["value"] += contribution
            bucket["contributing_orgs"] += 1

        # Quantize values for clean output (avoid 12.000000000001 artifacts).
        return [
            {**b, "value": b["value"].quantize(Decimal("0.0001"))}
            for b in buckets.values()
        ]

    @staticmethod
    def _date_str_type():
        """Helper to cast period_start to text for prefix matching."""
        import sqlalchemy as sa
        return sa.String

    @staticmethod
    def _empty_report(
        parent_id: UUID,
        period: Optional[str],
        parent_name: str = "",
    ) -> Dict:
        return {
            "parent_org_id": parent_id,
            "parent_org_name": parent_name,
            "period": period,
            "method": "none",
            "indicators": [],
            "descendants_included": 0,
            "descendants_excluded": 0,
        }
