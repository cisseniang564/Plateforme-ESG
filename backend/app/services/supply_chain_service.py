"""Supply Chain Service — PostgreSQL-backed supplier management."""
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.supplier import Supplier


class SupplyChainService:
    """Service layer for supply chain supplier management.

    Uses PostgreSQL (via SQLAlchemy AsyncSession) as the source of truth.
    Redis may optionally be layered on top as a cache.
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ── CRUD ──────────────────────────────────────────────────────────────────

    async def get_suppliers(self, tenant_id: UUID) -> List[Supplier]:
        """Return all suppliers belonging to a tenant."""
        result = await self.db.execute(
            select(Supplier).where(Supplier.tenant_id == tenant_id)
        )
        return list(result.scalars().all())

    async def create_supplier(self, tenant_id: UUID, data: dict) -> Supplier:
        """Create and persist a new supplier."""
        supplier = Supplier(tenant_id=tenant_id, **data)
        self.db.add(supplier)
        await self.db.commit()
        await self.db.refresh(supplier)
        return supplier

    async def get_supplier(
        self, tenant_id: UUID, supplier_id: UUID
    ) -> Optional[Supplier]:
        """Fetch a single supplier by id, scoped to the tenant."""
        result = await self.db.execute(
            select(Supplier).where(
                Supplier.id == supplier_id,
                Supplier.tenant_id == tenant_id,
            )
        )
        return result.scalar_one_or_none()

    async def update_supplier(
        self, tenant_id: UUID, supplier_id: UUID, data: dict
    ) -> Optional[Supplier]:
        """Update an existing supplier. Returns None if not found."""
        supplier = await self.get_supplier(tenant_id, supplier_id)
        if not supplier:
            return None
        for key, value in data.items():
            setattr(supplier, key, value)
        await self.db.commit()
        await self.db.refresh(supplier)
        return supplier

    async def delete_supplier(self, tenant_id: UUID, supplier_id: UUID) -> bool:
        """Delete a supplier. Returns False if not found."""
        supplier = await self.get_supplier(tenant_id, supplier_id)
        if not supplier:
            return False
        await self.db.delete(supplier)
        await self.db.commit()
        return True

    # ── Portal token ──────────────────────────────────────────────────────────

    async def generate_portal_token(
        self, tenant_id: UUID, supplier_id: UUID
    ) -> str:
        """Generate a unique portal token valid for 90 days."""
        token = secrets.token_urlsafe(48)
        expires_at = datetime.now(timezone.utc) + timedelta(days=90)

        supplier = await self.get_supplier(tenant_id, supplier_id)
        if not supplier:
            raise ValueError(f"Supplier {supplier_id} not found")

        supplier.portal_token = token
        supplier.portal_token_expires_at = expires_at
        await self.db.commit()
        return token

    async def get_by_portal_token(self, token: str) -> Optional[Supplier]:
        """Return the supplier for a valid, non-expired portal token."""
        result = await self.db.execute(
            select(Supplier).where(
                Supplier.portal_token == token,
                Supplier.portal_token_expires_at > datetime.now(timezone.utc),
            )
        )
        return result.scalar_one_or_none()

    # ── ESG scoring ───────────────────────────────────────────────────────────

    def compute_esg_score(self, answers: Dict[str, Any]) -> Dict[str, float]:
        """Compute ESG scores (0-100) from questionnaire answers.

        Mirrors the scoring logic originally in _compute_portal_score.
        """
        env_pts = 0
        soc_pts = 0
        gov_pts = 0

        # ── Environmental (max 30 pts) ────────────────────────────────────────
        renewable = float(answers.get("renewable_pct") or 0)
        recycling = float(answers.get("recycling_pct") or 0)
        scope1 = float(answers.get("scope1") or 0)
        scope2 = float(answers.get("scope2") or 0)
        headcount = max(float(answers.get("headcount") or 1), 1)
        emissions_per_fte = (scope1 + scope2) / headcount

        env_pts += 10 if renewable >= 50 else (6 if renewable >= 25 else 2)
        env_pts += 10 if recycling >= 70 else (6 if recycling >= 50 else 2)
        env_pts += 10 if emissions_per_fte < 3 else (6 if emissions_per_fte < 10 else 2)
        env_score = min(100, round(env_pts / 30 * 100))

        # ── Social (max 30 pts) ───────────────────────────────────────────────
        women = float(answers.get("women_pct") or 0)
        accident = float(answers.get("accident_rate") or 99)
        training = float(answers.get("training_hours") or 0)
        turnover = float(answers.get("turnover_pct") or 99)

        soc_pts += 10 if women >= 40 else (6 if women >= 30 else 2)
        soc_pts += 10 if accident < 2 else (6 if accident < 5 else 2)
        soc_pts += 10 if training >= 30 else (6 if training >= 20 else 2)
        soc_pts -= 3 if turnover > 20 else 0
        social_score = min(100, max(0, round(soc_pts / 30 * 100)))

        # ── Governance (max 36 pts) ───────────────────────────────────────────
        gov_pts += 12 if answers.get("anticorruption") in (True, "true", "oui", "yes", "1") else 0
        gov_pts += 10 if answers.get("supplier_code") in (True, "true", "oui", "yes", "1") else 0
        gov_pts += 8 if answers.get("iso14001") in (True, "true", "oui", "yes", "1") else 0
        compliance = float(answers.get("compliance_pct") or 0)
        gov_pts += 6 if compliance >= 80 else (3 if compliance >= 50 else 0)
        incidents = str(answers.get("incidents") or "0")
        gov_pts -= 5 if incidents in ("3 ou plus", "3") else (2 if incidents == "2" else 0)
        gov_score = min(100, max(0, round(gov_pts / 36 * 100)))

        global_score = round(env_score * 0.4 + social_score * 0.35 + gov_score * 0.25)
        risk = (
            "Faible" if global_score >= 70
            else ("Moyen" if global_score >= 50
                  else ("Élevé" if global_score >= 30
                        else "Critique"))
        )

        return {
            "env_score": env_score,
            "social_score": social_score,
            "gov_score": gov_score,
            "global_score": global_score,
            "risk": risk,
        }
