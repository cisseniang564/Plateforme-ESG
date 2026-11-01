"""Traçabilité du score ESG : la méthodologie publiée doit refléter les constantes réelles du moteur."""
import pytest

from app.services.esg_scoring_engine import ESGScoringEngine, METHOD_VERSION


def test_methodology_lists_every_indicator_with_its_real_range():
    m = ESGScoringEngine.methodology()
    codes = {i["code"] for i in m["indicators"]}
    assert codes == set(ESGScoringEngine.BENCHMARK_RANGES)
    carbon = next(i for i in m["indicators"] if i["code"] == "ENV-001")
    assert (carbon["range_min"], carbon["range_max"]) == (0, 2000)
    assert carbon["higher_is_better"] is False


def test_methodology_exposes_ratings_and_known_limitations():
    m = ESGScoringEngine.methodology()
    assert m["method_version"] == METHOD_VERSION
    assert m["rating_thresholds"][0] == {"rating": "AAA", "min_score": 85.0}
    assert any("taille" in l for l in m["limitations"])
    assert "PAS la couverture" in m["completeness_definition"]


def test_provenance_flags_pillars_without_data():
    details = {
        "environmental": {"indicators": [1, 2]},
        "social": {"indicators": []},
        "governance": {"indicators": [1]},
    }
    p = ESGScoringEngine._build_provenance(details)
    assert p["unmeasured_pillars"] == ["social"]
    assert p["indicators_per_pillar"] == {"environmental": 2, "social": 0, "governance": 1}


# ── Option « score adapté à la taille » ──────────────────────────────────────
from types import SimpleNamespace


def _engine(factor=1.0):
    e = ESGScoringEngine.__new__(ESGScoringEngine)
    e._size_factor = factor
    return e


def test_size_adjustment_is_off_by_default_and_does_not_change_scores():
    org = SimpleNamespace(score_size_adjusted=False, employee_count=5000)
    adj = ESGScoringEngine._size_adjustment_for(org)
    assert adj["applied"] is False and adj["factor"] == 1.0
    # 1 000 tCO2e sur la plage 0–2000 → 50 (le plus bas est meilleur), comme avant
    assert _engine(adj["factor"])._normalize_value(1000, "ENV-001", higher_is_better=False) == pytest.approx(50.0)


def test_size_adjustment_scales_absolute_indicators_with_headcount():
    org = SimpleNamespace(score_size_adjusted=True, employee_count=1000)
    adj = ESGScoringEngine._size_adjustment_for(org)
    assert adj == {"applied": True, "reason": None, "employees": 1000, "factor": 10.0, "reference_employees": 100}
    # même valeur, plage ×10 (0–20000) : 1 000 tCO2e devient très bon au lieu de moyen
    assert _engine(adj["factor"])._normalize_value(1000, "ENV-001", higher_is_better=False) == pytest.approx(95.0)


def test_size_adjustment_never_touches_percentage_indicators():
    e = _engine(10.0)
    assert e._normalize_value(50, "ENV-004", higher_is_better=True) == pytest.approx(50.0)  # % d'énergie renouvelable


def test_size_adjustment_without_headcount_is_reported_not_silently_applied():
    org = SimpleNamespace(score_size_adjusted=True, employee_count=None)
    adj = ESGScoringEngine._size_adjustment_for(org)
    assert adj["applied"] is False and adj["reason"] == "missing_employee_count" and adj["factor"] == 1.0
