"""Les quotas affichés par /billing/features doivent être ceux de la source de vérité (core/plan_limits)."""
import pytest

from app.api.v1.endpoints.billing import PLAN_LIMITS as BILLING_LIMITS
from app.core.plan_limits import PLAN_LIMITS as CORE_LIMITS, is_unlimited

UNLIMITED_DISPLAY = 9999   # convention d'affichage de billing.py


@pytest.mark.parametrize("tier", ["free", "pme", "eti", "groupe", "starter", "pro"])
def test_billing_limits_match_core(tier):
    core, shown = CORE_LIMITS[tier], BILLING_LIMITS[tier]
    for key in ("max_users", "max_orgs", "max_monthly_api_calls"):
        expected = UNLIMITED_DISPLAY if is_unlimited(core[key]) else core[key]
        assert shown[key] == expected, f"{tier}.{key}: billing={shown[key]} core={core[key]}"
