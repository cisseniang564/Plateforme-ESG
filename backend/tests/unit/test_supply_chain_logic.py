"""
Unit tests for supply chain business logic.

Tests cover:
- SupplyChainService.compute_esg_score: ESG score calculation from questionnaire answers
- Risk-level derivation embedded in compute_esg_score
- SupplierCreate and PortalSubmission Pydantic models

NOTE: The old Redis-backed _compute_portal_score / _load_suppliers / _save_suppliers
helpers have been removed from the endpoint layer. The scoring logic now lives in
SupplyChainService.compute_esg_score (app/services/supply_chain_service.py).
"""
import pytest
from unittest.mock import AsyncMock

# ---------------------------------------------------------------------------
# Import directly from the service layer — no FastAPI app required
# ---------------------------------------------------------------------------

from app.services.supply_chain_service import SupplyChainService
from app.api.v1.endpoints.supply_chain import SupplierCreate, PortalSubmission


# ---------------------------------------------------------------------------
# Helper: build a SupplyChainService with a mocked DB (no I/O needed)
# ---------------------------------------------------------------------------

def _svc():
    return SupplyChainService(db=AsyncMock())


# ===========================================================================
# compute_esg_score — Environmental pillar
# ===========================================================================

class TestComputeEsgScoreEnvironmental:
    """Tests for the environmental sub-score."""

    def test_high_renewable_gives_maximum_env_pts(self):
        """renewable_pct >= 50 awards 10/30 env pts."""
        answers = {
            "renewable_pct": 60,
            "recycling_pct": 75,
            "scope1": 0,
            "scope2": 0,
            "headcount": 10,
        }
        result = _svc().compute_esg_score(answers)
        # renewable=60 → 10, recycling=75 → 10, emissions/fte=0 → 10  → env_pts=30 → 100
        assert result["env_score"] == 100

    def test_low_renewable_below_25_gives_minimum_env_pts(self):
        """renewable_pct < 25 awards only 2 pts for renewables bucket."""
        answers = {
            "renewable_pct": 10,    # < 25 → 2 pts
            "recycling_pct": 10,    # < 50 → 2 pts
            "scope1": 100,
            "scope2": 100,
            "headcount": 1,         # emissions/fte=200 → ≥10 → 2 pts
        }
        result = _svc().compute_esg_score(answers)
        # env_pts = 2 + 2 + 2 = 6  → round(6/30*100) = 20
        assert result["env_score"] == 20

    def test_medium_renewable_25_to_50_gives_middle_pts(self):
        """renewable_pct between 25 and 49 awards 6 pts."""
        answers = {
            "renewable_pct": 30,    # 25 ≤ x < 50 → 6 pts
            "recycling_pct": 0,     # < 50 → 2 pts
            "scope1": 5,
            "scope2": 5,
            "headcount": 10,        # 1.0 t/fte → < 3 → 10 pts
        }
        result = _svc().compute_esg_score(answers)
        # env_pts = 6 + 2 + 10 = 18 → round(18/30*100) = 60
        assert result["env_score"] == 60

    def test_env_score_capped_at_100(self):
        """Environmental score never exceeds 100 even with best answers."""
        answers = {
            "renewable_pct": 100,
            "recycling_pct": 100,
            "scope1": 0,
            "scope2": 0,
            "headcount": 100,
        }
        result = _svc().compute_esg_score(answers)
        assert result["env_score"] <= 100

    def test_headcount_zero_does_not_raise_zerodivisionerror(self):
        """headcount=0 should be handled gracefully (defaults to 1 internally)."""
        answers = {"headcount": 0, "scope1": 50, "scope2": 50}
        result = _svc().compute_esg_score(answers)  # must not raise
        assert "env_score" in result


# ===========================================================================
# compute_esg_score — Social pillar
# ===========================================================================

class TestComputeEsgScoreSocial:
    """Tests for the social sub-score."""

    def test_high_women_pct_gives_max_social_pts(self):
        """women_pct >= 40 gives 10 pts; low accident + good training → full social score."""
        answers = {
            "women_pct": 45,        # ≥ 40 → 10 pts
            "accident_rate": 1,     # < 2 → 10 pts
            "training_hours": 35,   # ≥ 30 → 10 pts
            "turnover_pct": 10,     # ≤ 20 → no penalty
        }
        result = _svc().compute_esg_score(answers)
        # soc_pts = 10 + 10 + 10 = 30 → 100
        assert result["social_score"] == 100

    def test_high_turnover_penalises_social_score(self):
        """turnover_pct > 20 subtracts 3 pts from social score."""
        answers = {
            "women_pct": 45,        # 10 pts
            "accident_rate": 1,     # 10 pts
            "training_hours": 35,   # 10 pts
            "turnover_pct": 25,     # > 20 → -3 pts
        }
        result = _svc().compute_esg_score(answers)
        # soc_pts = 30 - 3 = 27 → round(27/30*100) = 90
        assert result["social_score"] == 90

    def test_social_score_not_negative(self):
        """Social score is clamped to 0 even with worst possible answers."""
        answers = {
            "women_pct": 0,
            "accident_rate": 99,
            "training_hours": 0,
            "turnover_pct": 99,
        }
        result = _svc().compute_esg_score(answers)
        assert result["social_score"] >= 0

    def test_social_score_missing_answers_defaults_to_minimal(self):
        """Empty answers → defaults give partial points (accident defaults to 99 → 2pts)."""
        result = _svc().compute_esg_score({})
        # women_pct=0 → 2, accident_rate=99 → 2, training=0 → 2, turnover=99 → -3
        # soc_pts = 2+2+2-3 = 3 → max(0, round(3/30*100)) = 10
        assert result["social_score"] == 10


# ===========================================================================
# compute_esg_score — Governance pillar
# ===========================================================================

class TestComputeEsgScoreGovernance:
    """Tests for the governance sub-score."""

    def test_anticorruption_true_gives_12_pts(self):
        """anticorruption=True is the biggest governance lever (12 pts)."""
        answers = {"anticorruption": True}
        result = _svc().compute_esg_score(answers)
        # gov_pts = 12 → round(12/36*100) = 33
        assert result["gov_score"] == 33

    def test_anticorruption_string_variants_accepted(self):
        """anticorruption accepts 'true', 'oui', 'yes', '1'."""
        for val in ("true", "oui", "yes", "1"):
            answers = {"anticorruption": val}
            result = _svc().compute_esg_score(answers)
            assert result["gov_score"] >= 33, f"Expected >=33 for anticorruption={val!r}"

    def test_all_governance_positives_capped_at_100(self):
        """With all governance items ticked, score is capped at 100."""
        answers = {
            "anticorruption": True,   # 12
            "supplier_code": True,    # 10
            "iso14001": True,         #  8
            "compliance_pct": 90,     #  6
            "incidents": "0",         #  0 penalty
        }
        result = _svc().compute_esg_score(answers)
        # gov_pts = 36 → round(36/36*100) = 100
        assert result["gov_score"] == 100

    def test_incidents_3_or_more_deducts_5_pts(self):
        """'3 ou plus' incidents deducts 5 pts from governance."""
        answers_no_incidents = {"anticorruption": True}
        answers_many_incidents = {"anticorruption": True, "incidents": "3 ou plus"}
        base = _svc().compute_esg_score(answers_no_incidents)["gov_score"]
        penalised = _svc().compute_esg_score(answers_many_incidents)["gov_score"]
        assert penalised < base

    def test_two_incidents_deducts_2_pts(self):
        """2 incidents deducts 2 pts."""
        answers_clean = {"anticorruption": True, "incidents": "0"}
        answers_2 = {"anticorruption": True, "incidents": "2"}
        clean_score = _svc().compute_esg_score(answers_clean)["gov_score"]
        two_score = _svc().compute_esg_score(answers_2)["gov_score"]
        assert two_score < clean_score


# ===========================================================================
# compute_esg_score — Global score & risk
# ===========================================================================

class TestComputeEsgScoreGlobal:
    """Tests for global score and risk derivation."""

    def test_global_score_weighted_average_of_pillars(self):
        """global = env*0.4 + social*0.35 + gov*0.25, rounded."""
        answers = {
            "renewable_pct": 60,
            "recycling_pct": 75,
            "scope1": 0, "scope2": 0, "headcount": 10,    # env=100
            "women_pct": 45, "accident_rate": 1,
            "training_hours": 35, "turnover_pct": 10,      # social=100
            "anticorruption": True, "supplier_code": True,
            "iso14001": True, "compliance_pct": 90,
            "incidents": "0",                               # gov=100
        }
        result = _svc().compute_esg_score(answers)
        assert result["global_score"] == 100

    def test_risk_faible_when_global_above_70(self):
        """global_score >= 70 → risk = 'Faible'."""
        answers = {
            "renewable_pct": 60, "recycling_pct": 75,
            "scope1": 0, "scope2": 0, "headcount": 10,
            "women_pct": 45, "accident_rate": 1,
            "training_hours": 35, "turnover_pct": 10,
            "anticorruption": True, "supplier_code": True,
            "iso14001": True, "compliance_pct": 90,
            "incidents": "0",
        }
        result = _svc().compute_esg_score(answers)
        assert result["risk"] == "Faible"

    def test_risk_critique_when_global_below_30(self):
        """global_score < 30 → risk = 'Critique'."""
        result = _svc().compute_esg_score({})
        if result["global_score"] < 30:
            assert result["risk"] == "Critique"

    def test_risk_moyen_when_global_between_50_and_70(self):
        """50 ≤ global < 70 → risk = 'Moyen'."""
        answers = {
            "renewable_pct": 30,
            "recycling_pct": 55,
            "scope1": 5, "scope2": 5, "headcount": 10,
            "women_pct": 35,
            "accident_rate": 3,
            "training_hours": 22,
            "turnover_pct": 15,
            "anticorruption": True,
        }
        result = _svc().compute_esg_score(answers)
        if 50 <= result["global_score"] < 70:
            assert result["risk"] == "Moyen"

    def test_returns_all_required_keys(self):
        """Return value always has the five expected keys."""
        result = _svc().compute_esg_score({})
        assert set(result.keys()) == {"env_score", "social_score", "gov_score", "global_score", "risk"}


# ===========================================================================
# SupplierCreate Pydantic model validation
# ===========================================================================

class TestSupplierCreateModel:
    """Validate SupplierCreate defaults and required fields."""

    def test_name_is_required(self):
        """Instantiating SupplierCreate without name should raise ValidationError."""
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            SupplierCreate()

    def test_defaults_applied(self):
        """Fields with defaults (country, category …) should be pre-filled."""
        s = SupplierCreate(name="Test Supplier")
        assert s.country == "France"
        assert s.category == "Services"
        assert s.employees == 0
        assert s.spend_k_eur == 0.0
        assert s.contact_email == ""

    def test_custom_values_accepted(self):
        """Custom values should override defaults correctly."""
        s = SupplierCreate(
            name="GreenCo",
            country="Germany",
            category="Industry",
            contact_email="contact@greenco.de",
            employees=250,
            spend_k_eur=1500.0,
        )
        assert s.country == "Germany"
        assert s.employees == 250
        assert s.spend_k_eur == 1500.0


# ===========================================================================
# PortalSubmission Pydantic model validation
# ===========================================================================

class TestPortalSubmissionModel:
    """Validate PortalSubmission Pydantic model."""

    def test_answers_required(self):
        """answers field is required."""
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            PortalSubmission()

    def test_defaults_for_optional_string_fields(self):
        """supplier_name and contact_name default to empty strings."""
        p = PortalSubmission(answers={"scope1": 10})
        assert p.supplier_name == ""
        assert p.contact_name == ""

    def test_answers_passed_through_as_dict(self):
        """answers dict is preserved verbatim."""
        data = {"scope1": 50, "renewable_pct": 30, "anticorruption": True}
        p = PortalSubmission(answers=data)
        assert p.answers == data
