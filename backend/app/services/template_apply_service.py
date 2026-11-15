"""
Template Apply Service — crée les indicateurs d'un template sectoriel.

Depuis 2026-11 : aucune valeur n'est plus créée (ni DataEntry, ni IndicatorData).
Les valeurs indicatives du catalogue ne sont jamais présentées comme des données
de l'entreprise. revert() supprime les valeurs créées par les anciennes versions.

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

        # Le template ne crée QUE des indicateurs (nom, unité, pilier, méthode) :
        # aucune valeur n'est saisie à la place de l'entreprise. Les anciennes
        # valeurs créées par les versions précédentes se retirent avec revert().
        ind_stmt = select(Indicator.code).where(Indicator.tenant_id == self.tenant_id)
        existing_codes = {row[0] for row in (await self.db.execute(ind_stmt)).all()}

        indicators_created = 0
        indicators_existing = 0
        for entry in template.entries:
            ind_code = f"TPL-{_slugify(entry.metric_name, 32)}"
            if ind_code in existing_codes:
                indicators_existing += 1
                continue
            self.db.add(Indicator(
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
            ))
            existing_codes.add(ind_code)
            indicators_created += 1

        await self.db.commit()

        return {
            "indicators_created": indicators_created,
            "indicators_existing": indicators_existing,
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
        """Supprime toutes les valeurs créées par les anciennes versions des templates.

        Cible uniquement ce qui porte la marque d'un template (DataEntry avec
        collection_method='template_apply', IndicatorData dont la source commence par
        « Template sectoriel ») : les valeurs saisies par l'utilisateur ne sont jamais touchées.
        Les paramètres organization_id / year sont conservés pour compatibilité.
        """
        de_result = await self.db.execute(delete(DataEntry).where(
            DataEntry.tenant_id == self.tenant_id,
            DataEntry.collection_method == "template_apply",
        ))
        id_result = await self.db.execute(delete(IndicatorData).where(
            IndicatorData.tenant_id == self.tenant_id,
            IndicatorData.source.like("Template sectoriel%"),
        ))
        await self.db.commit()
        return {
            "deleted": de_result.rowcount or 0,
            "indicator_data_deleted": id_result.rowcount or 0,
        }
