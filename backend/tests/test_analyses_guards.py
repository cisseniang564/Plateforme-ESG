"""Garde-fous « Analyses » : pas de chiffres inventés présentés comme des données."""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1] / "app"


def _read(rel):
    return (ROOT / rel).read_text()


def test_benchmark_baselines_have_no_numbers_or_fake_sources():
    src = _read("data/benchmark_baselines.py")
    assert "median" not in src and "p25" not in src
    for fake in ("CDP Tech", "MSCI Financials", "carbon_intensity_per_revenue", '"source":'):
        assert fake not in src


def test_benchmark_service_returns_no_values_when_cohort_too_small():
    src = _read("services/sector_benchmark_service.py")
    assert "insufficient_cohort" in src
    assert "public_reference" not in src
    assert 'baseline["overall"]' not in src and 'baseline["indicators"]' not in src


def test_recommendations_never_carry_numeric_gains():
    src = _read("services/ml/recommendations_service.py")
    assert not re.search(r'"gain_(tco2e|eur)":\s*[0-9]', src)
    assert 'r["gain_tco2e"] = None' in src and 'r["gain_eur"] = None' in src


def test_forecast_requires_enough_history():
    from importlib import import_module

    try:
        mod = import_module("app.services.ml.forecasting_service")
    except ModuleNotFoundError:  # dépendances optionnelles absentes localement
        return
    assert mod.MIN_FORECAST_POINTS >= 6


def test_eco_design_tips_have_no_invented_percentages():
    src = _read("api/v1/endpoints/lca.py")
    assert not re.search(r'"impact": "-\d', src)


def test_chat_prompt_forbids_invented_figures_and_reports_source():
    assert "N'invente jamais" in _read("services/ml/chat_service.py")
    assert '"source": svc.last_source' in _read("api/v1/endpoints/analytics.py")
