"""Supply chain : seuils uniques, questions obligatoires, sérialisation honnête."""
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.api.v1.endpoints.supply_chain import _supplier_to_dict
from app.services.supply_chain_service import (
    SupplyChainService,
    risk_level_from_score,
)


@pytest.mark.parametrize(
    "score,level",
    [(100, "low"), (70, "low"), (69, "medium"), (50, "medium"), (49, "high"), (30, "high"), (29, "critical"), (0, "critical")],
)
def test_risk_thresholds(score, level):
    assert risk_level_from_score(score) == level


def test_compute_score_risk_matches_thresholds():
    svc = SupplyChainService(db=AsyncMock())
    out = svc.compute_esg_score({})
    expected = {"low": "Faible", "medium": "Moyen", "high": "Élevé", "critical": "Critique"}[
        risk_level_from_score(out["global_score"])
    ]
    assert out["risk"] == expected


def test_missing_required():
    assert SupplyChainService.missing_required({}) == ["scope1", "scope2", "headcount", "anticorruption"]
    full = {"scope1": 0, "scope2": 0, "headcount": 10, "anticorruption": False}
    assert SupplyChainService.missing_required(full) == []
    assert SupplyChainService.missing_required({**full, "headcount": ""}) == ["headcount"]


def _supplier(**kw):
    base = dict(
        id="1", tenant_id="t", name="Acme", country="France", category="Services",
        contact_email="a@b.fr", website=None, employees=3, annual_revenue_k_eur=None,
        spend_k_eur=10, risk_level="medium", status="pending", global_score=0,
        env_score=0, social_score=0, gov_score=0, flags=[], questionnaire_data=None,
        portal_token=None, portal_token_expires_at=None, questionnaire_completed_at=None,
        last_scored_at=None, created_at=None, updated_at=None,
    )
    base.update(kw)
    return SimpleNamespace(**base)


def test_new_supplier_is_not_evaluated():
    d = _supplier() and _supplier_to_dict(_supplier())
    assert d["status"] == "Non évalué"
    assert d["questionnaire_link_active"] is False
    assert d["questionnaire_completed"] is False


def test_active_link_means_in_progress():
    exp = datetime.now(timezone.utc) + timedelta(days=5)
    d = _supplier_to_dict(_supplier(portal_token="tok", portal_token_expires_at=exp))
    assert d["status"] == "En cours"
    assert d["questionnaire_link_active"] is True


def test_expired_link_is_not_in_progress():
    exp = datetime.now(timezone.utc) - timedelta(days=1)
    d = _supplier_to_dict(_supplier(portal_token="tok", portal_token_expires_at=exp))
    assert d["status"] == "Non évalué"


def test_scored_supplier_is_evaluated():
    d = _supplier_to_dict(_supplier(last_scored_at=datetime.now(timezone.utc), global_score=72, risk_level="low", status="active"))
    assert d["status"] == "Évalué"
    assert d["risk"] == "Faible"


def test_zero_is_a_real_answer():
    """0 accident / 0 % de turnover ne doivent pas être traités comme « non renseigné »."""
    svc = SupplyChainService(db=AsyncMock())
    base = {"scope1": 0, "scope2": 0, "headcount": 10, "anticorruption": True,
            "women_pct": 50, "training_hours": 40, "renewable_pct": 80, "recycling_pct": 80}
    zero = svc.compute_esg_score({**base, "accident_rate": 0, "turnover_pct": 0})
    missing = svc.compute_esg_score(base)
    assert zero["social_score"] > missing["social_score"]


def test_email_endpoint_does_not_lazy_load_tenant():
    """`current_user.tenant` déclenche un lazy-load async (greenlet_spawn) : l'email n'était jamais mis en file."""
    import inspect
    from app.api.v1.endpoints import supply_chain

    src = inspect.getsource(supply_chain.send_questionnaire)
    assert 'current_user, "tenant"' not in src
    assert "select(Tenant.name)" in src
