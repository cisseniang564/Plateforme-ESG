"""
Template Apply Service — seed DataEntry rows from a SectorTemplate.

The service is idempotent: applying the same template twice for the same year
does NOT duplicate entries. The collision key is (tenant, organization, year,
metric_name).

Two modes:
  * merge   — only insert rows that don't yet exist (default)
  * replace — delete prior template entries (collection_method='template_apply')
              for the year, then insert the full template

Each created row is flagged via:
  * ``collection_method = 'template_apply'``  (filter to find template-seeded rows)
  * ``data_source = 'Template sectoriel — {sector_label}'``  (audit trail)
  * ``quality_flags = {'estimated': True, 'requires_review': True}``  (warn users)
  * ``verification_status = 'pending'``  (block from validated reports)
"""
from __future__ import annotations

import logging
from datetime import date
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import select, delete, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.data_entry import DataEntry
from app.models.indicator import Indicator
from app.models.indicator_data import IndicatorData
from app.models.organization import Organization
from app.services.sectoral_templates import (
    SECTOR_TEMPLATES, SectorTemplate, get_template,
)


def _slugify(text: str, maxlen: int = 40) -> str:
    """Build a stable indicator code from a metric name."""
    import re
    s = re.sub(r'[^a-zA-Z0-9]+', '-', text.lower()).strip('-')
    return s[:maxlen].upper()

logger = logging.getLogger(__name__)


class TemplateApplyService:
    """Seed DataEntry rows from a sectoral template."""

    def __init__(self, db: AsyncSession, tenant_id: UUID):
        self.db = db
        self.tenant_id = tenant_id

    async def _resolve_org(self, organization_id: Optional[UUID]) -> Optional[Organization]:
        if organization_id:
            org = await self.db.get(Organization, organization_id)
            if org and org.tenant_id == self.tenant_id:
                return org
        # fallback: first org of the tenant
        result = await self.db.execute(
            select(Organization)
            .where(Organization.tenant_id == self.tenant_id)
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def list_templates(self) -> List[Dict[str, Any]]:
        """Return summary for the gallery."""
        from app.services.sectoral_templates import list_available_templates
        return list_available_templates()

    async def preview(self, sector_id: str) -> Dict[str, Any]:
        """Return the full entry list for the preview modal."""
        template = get_template(sector_id)
        if template is None:
            return {"error": "Unknown sector"}
        return {
            "sector_id": template.sector_id,
            "label": template.label,
            "icon": template.icon,
            "description": template.description,
            "entry_count": len(template.entries),
            "entries": [
                {
                    "metric_name": e.metric_name,
                    "pillar": e.pillar,
                    "category": e.category,
                    "unit": e.unit,
                    "value": e.value,
                    "framework": e.framework,
                    "notes": e.notes,
                }
                for e in template.entries
            ],
            "narratives": template.suggested_narratives,
        }

    async def apply(
        self,
        sector_id: str,
        organization_id: Optional[UUID] = None,
        year: Optional[int] = None,
        mode: str = "merge",
        created_by_id: Optional[UUID] = None,
    ) -> Dict[str, Any]:
        """
        Apply template to the tenant.

        Args:
            sector_id: Which template to apply (industry, retail, ...).
            organization_id: Target organization; defaults to first org.
            year: Reporting year; defaults to last completed year.
            mode: 'merge' (skip existing) or 'replace' (delete template rows first).
            created_by_id: User id stamped on entries.

        Returns:
            {"created": N, "skipped": N, "replaced": N, "entries_total": N}
        """
        from datetime import datetime as _dt

        template = get_template(sector_id)
        if template is None:
            return {"error": f"Unknown sector '{sector_id}'"}

        year = year or (_dt.utcnow().year - 1)
        period_start = date(year, 1, 1)
        period_end = date(year, 12, 31)

        org = await self._resolve_org(organization_id)
        if org is None:
            return {"error": "No organization found for tenant — create one first."}

        # IndicatorData.source est un varchar(50) — tronquer pour ne jamais dépasser.
        source_label = f"Template sectoriel — {template.label}"[:50]

        replaced = 0
        if mode == "replace":
            # Delete prior template-seeded rows for this (org, year).
            stmt = delete(DataEntry).where(
                DataEntry.tenant_id == self.tenant_id,
                DataEntry.organization_id == org.id,
                DataEntry.period_start == period_start,
                DataEntry.collection_method == "template_apply",
            )
            result = await self.db.execute(stmt)
            replaced = result.rowcount or 0

        # Load existing metric_names for this (org, year) to dedupe DataEntries.
        existing_stmt = select(DataEntry.metric_name).where(
            DataEntry.tenant_id == self.tenant_id,
            DataEntry.organization_id == org.id,
            DataEntry.period_start == period_start,
        )
        result = await self.db.execute(existing_stmt)
        existing_names = {row[0].strip().lower() for row in result.all()}

        # Load existing indicator codes for this tenant (to reuse or create).
        ind_stmt = select(Indicator.code, Indicator.id).where(Indicator.tenant_id == self.tenant_id)
        ind_result = await self.db.execute(ind_stmt)
        existing_indicators: Dict[str, UUID] = {row[0]: row[1] for row in ind_result.all()}

        created = 0
        skipped = 0
        indicators_created = 0
        ind_data_created = 0
        period_date = period_end  # Use end-of-year date for IndicatorData.date

        for entry in template.entries:
            key = entry.metric_name.strip().lower()
            if mode == "merge" and key in existing_names:
                skipped += 1
                continue

            # 1. DataEntry (legacy / wide view)
            data_entry = DataEntry(
                tenant_id=self.tenant_id,
                organization_id=org.id,
                period_start=period_start,
                period_end=period_end,
                period_type="annual",
                pillar=entry.pillar,
                category=entry.category,
                metric_name=entry.metric_name,
                value_numeric=entry.value,
                unit=entry.unit,
                data_source=source_label,
                collection_method="template_apply",
                verification_status="pending",
                quality_flags={"estimated": True, "requires_review": True, "template": sector_id},
                notes=entry.notes or None,
                created_by=created_by_id,
            )
            self.db.add(data_entry)
            created += 1

            # 2. Indicator (reused if a code already exists, created otherwise)
            ind_code = f"TPL-{_slugify(entry.metric_name, 32)}"
            ind_id = existing_indicators.get(ind_code)
            if ind_id is None:
                indicator = Indicator(
                    tenant_id=self.tenant_id,
                    code=ind_code,
                    name=entry.metric_name,
                    pillar=entry.pillar,
                    category=entry.category,
                    unit=entry.unit,
                    data_type="number",
                    framework=entry.framework,
                    description=entry.notes or entry.metric_name,
                    is_active=True,
                )
                self.db.add(indicator)
                await self.db.flush()
                ind_id = indicator.id
                existing_indicators[ind_code] = ind_id
                indicators_created += 1

            # 3. IndicatorData (powers the CSRD progress dashboard)
            ind_data = IndicatorData(
                tenant_id=self.tenant_id,
                indicator_id=ind_id,
                organization_id=org.id,
                date=period_date,
                value=float(entry.value),
                unit=entry.unit,
                source=source_label,
            )
            self.db.add(ind_data)
            ind_data_created += 1

        await self.db.commit()

        return {
            "created": created,
            "skipped": skipped,
            "replaced": replaced,
            "indicators_created": indicators_created,
            "indicator_data_created": ind_data_created,
            "entries_total": len(template.entries),
            "year": year,
            "organization_id": str(org.id),
            "organization_name": org.name,
            "sector_label": template.label,
        }

    async def revert(
        self,
        organization_id: Optional[UUID] = None,
        year: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Delete template-seeded entries (DataEntry + IndicatorData) for the (org, year)."""
        from datetime import datetime as _dt
        year = year or (_dt.utcnow().year - 1)
        period_start = date(year, 1, 1)
        period_end = date(year, 12, 31)

        org = await self._resolve_org(organization_id)
        if org is None:
            return {"error": "No organization found"}

        # 1. Delete DataEntry rows
        de_stmt = delete(DataEntry).where(
            DataEntry.tenant_id == self.tenant_id,
            DataEntry.organization_id == org.id,
            DataEntry.period_start == period_start,
            DataEntry.collection_method == "template_apply",
        )
        de_result = await self.db.execute(de_stmt)

        # 2. Delete IndicatorData rows for TPL-* indicators in the year
        tpl_ind_codes_stmt = select(Indicator.id).where(
            Indicator.tenant_id == self.tenant_id,
            Indicator.code.like("TPL-%"),
        )
        tpl_ind_result = await self.db.execute(tpl_ind_codes_stmt)
        tpl_ind_ids = [row[0] for row in tpl_ind_result.all()]

        ind_data_deleted = 0
        if tpl_ind_ids:
            id_stmt = delete(IndicatorData).where(
                IndicatorData.tenant_id == self.tenant_id,
                IndicatorData.organization_id == org.id,
                IndicatorData.indicator_id.in_(tpl_ind_ids),
                IndicatorData.date == period_end,
            )
            id_result = await self.db.execute(id_stmt)
            ind_data_deleted = id_result.rowcount or 0

        await self.db.commit()
        return {
            "deleted": de_result.rowcount or 0,
            "indicator_data_deleted": ind_data_deleted,
            "year": year,
        }
