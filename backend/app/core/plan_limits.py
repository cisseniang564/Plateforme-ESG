"""
Single source of truth for plan limits and feature gates.

Every part of the system that needs to know what a plan includes
must import from here — never define limits elsewhere.

Plans
-----
free       → 3 users,     5 orgs,         1 000 API calls/month
pme        → 25 users,   50 orgs,       100 000 API calls/month  (249 €/month)
eti        → 100 users, 250 orgs,     1 000 000 API calls/month  (599 €/month)
groupe     → 500 users, unlimited,    5 000 000 API calls/month  (1 199 €/month)
enterprise → unlimited (on quote)

Legacy (kept for existing subscribers — do not use for new signups):
starter    → 10 users, 25 orgs,   10 000 API calls/month  (29 €/month)
pro        → 50 users, 100 orgs, 100 000 API calls/month  (99 €/month)
"""
from __future__ import annotations

from typing import Dict, Any

# ─── Quota limits ─────────────────────────────────────────────────────────────
PLAN_LIMITS: Dict[str, Dict[str, Any]] = {
    "free": {
        "max_users": 3,
        "max_orgs": 5,
        "max_monthly_api_calls": 1_000,
        "data_retention_months": 6,
        "features": [
            "basic_reports",
            "materiality_matrix",
            "esg_scoring",
            "data_entry",
        ],
    },
    # ── New commercial tiers ──────────────────────────────────────────────────
    "pme": {
        "max_users": 25,
        "max_orgs": 50,
        "max_monthly_api_calls": 100_000,
        "data_retention_months": 36,
        "features": [
            "basic_reports",
            "materiality_matrix",
            "esg_scoring",
            "data_entry",
            "csrd_reports",
            "dpef_reports",
            "carbon_reports",
            "sbti_tracking",
            "supply_chain",
            "fec_import",
            "api_access",
            "data_export",
            "taxonomy_alignment",
            "risk_register",
        ],
    },
    "eti": {
        "max_users": 100,
        "max_orgs": 250,
        "max_monthly_api_calls": 1_000_000,
        "data_retention_months": 60,
        "features": [
            "basic_reports",
            "materiality_matrix",
            "esg_scoring",
            "data_entry",
            "csrd_reports",
            "dpef_reports",
            "carbon_reports",
            "sbti_tracking",
            "supply_chain",
            "fec_import",
            "api_access",
            "data_export",
            "sfdr_reports",
            "ai_narrative",
            "ai_recommendations",
            "advanced_connectors",
            "benchmarking",
            "multi_standard",
            "risk_register",
            "taxonomy_alignment",
            "webhooks",
        ],
    },
    "groupe": {
        "max_users": 500,
        "max_orgs": -1,
        "max_monthly_api_calls": 5_000_000,
        "data_retention_months": 84,
        "features": [
            "basic_reports",
            "materiality_matrix",
            "esg_scoring",
            "data_entry",
            "csrd_reports",
            "dpef_reports",
            "carbon_reports",
            "sbti_tracking",
            "supply_chain",
            "fec_import",
            "api_access",
            "data_export",
            "sfdr_reports",
            "ai_narrative",
            "ai_recommendations",
            "advanced_connectors",
            "benchmarking",
            "multi_standard",
            "risk_register",
            "taxonomy_alignment",
            "webhooks",
            "sso_saml",
            "custom_branding",
        ],
    },
    # ── Legacy tiers (kept for existing subscribers, do not remove) ───────────
    "starter": {
        "max_users": 10,
        "max_orgs": 25,
        "max_monthly_api_calls": 10_000,
        "data_retention_months": 12,
        "features": [
            "basic_reports",
            "materiality_matrix",
            "esg_scoring",
            "data_entry",
            "csrd_reports",
            "dpef_reports",
            "carbon_reports",
            "sbti_tracking",
            "supply_chain",
            "fec_import",
            "api_access",
            "data_export",
        ],
    },
    "pro": {
        "max_users": 50,
        "max_orgs": 100,
        "max_monthly_api_calls": 100_000,
        "data_retention_months": 36,
        "features": [
            "basic_reports",
            "materiality_matrix",
            "esg_scoring",
            "data_entry",
            "csrd_reports",
            "dpef_reports",
            "carbon_reports",
            "sbti_tracking",
            "supply_chain",
            "fec_import",
            "api_access",
            "data_export",
            "sfdr_reports",
            "ai_narrative",
            "ai_recommendations",
            "advanced_connectors",
            "benchmarking",
            "multi_standard",
            "risk_register",
            "taxonomy_alignment",
            "webhooks",
        ],
    },
    "enterprise": {
        # Sentinel value: -1 means "unlimited"
        "max_users": -1,
        "max_orgs": -1,
        "max_monthly_api_calls": -1,
        "data_retention_months": 120,
        "features": [
            "basic_reports",
            "materiality_matrix",
            "esg_scoring",
            "data_entry",
            "csrd_reports",
            "dpef_reports",
            "carbon_reports",
            "sbti_tracking",
            "supply_chain",
            "fec_import",
            "api_access",
            "data_export",
            "sfdr_reports",
            "ai_narrative",
            "ai_recommendations",
            "advanced_connectors",
            "benchmarking",
            "multi_standard",
            "risk_register",
            "taxonomy_alignment",
            "webhooks",
            "sso_saml",
            "on_premise",
            "custom_branding",
            "priority_support_24_7",
            "sla_99_9",
        ],
    },
}

# The minimum plan required to access a given feature.
# Used to display targeted upgrade prompts.
FEATURE_MIN_PLAN: Dict[str, str] = {
    "csrd_reports":         "pme",
    "dpef_reports":         "pme",
    "carbon_reports":       "pme",
    "sbti_tracking":        "pme",
    "supply_chain":         "pme",
    "fec_import":           "pme",
    "api_access":           "pme",
    "data_export":          "pme",
    "taxonomy_alignment":   "pme",
    "risk_register":        "pme",
    "sfdr_reports":         "eti",
    "ai_narrative":         "eti",
    "ai_recommendations":   "eti",
    "advanced_connectors":  "eti",
    "benchmarking":         "eti",
    "multi_standard":       "eti",
    "webhooks":             "eti",
    "sso_saml":             "groupe",
    "custom_branding":      "groupe",
    "on_premise":           "enterprise",
    "priority_support_24_7": "enterprise",
    "sla_99_9":             "enterprise",
}

# Warning threshold: emit warnings when usage exceeds this fraction
QUOTA_WARNING_THRESHOLD = 0.80  # 80%

# Plan ordering for upgrade comparisons (new tiers first, legacy kept for compat)
PLAN_ORDER = ["free", "pme", "eti", "groupe", "enterprise"]
PLAN_ORDER_LEGACY = ["free", "starter", "pro", "enterprise"]


def get_limits(tier: str) -> Dict[str, Any]:
    """Return plan limits for a given tier (defaults to free if unknown)."""
    return PLAN_LIMITS.get(tier, PLAN_LIMITS["free"])


def has_feature(tier: str, feature: str) -> bool:
    """True if the given plan tier includes a feature."""
    return feature in PLAN_LIMITS.get(tier, PLAN_LIMITS["free"]).get("features", [])


def is_unlimited(value: int) -> bool:
    """True if the limit sentinel means 'no limit'."""
    return value < 0


def can_create(current_count: int, limit: int) -> bool:
    """True if creating one more resource is allowed under this limit."""
    if is_unlimited(limit):
        return True
    return current_count < limit


def quota_pct(current: int, limit: int) -> float:
    """Usage as a fraction 0.0–1.0 (returns 0 for unlimited plans)."""
    if is_unlimited(limit) or limit == 0:
        return 0.0
    return min(current / limit, 1.0)
