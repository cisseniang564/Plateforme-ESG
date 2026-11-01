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
