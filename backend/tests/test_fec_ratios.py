from app.services.pcg_emission_mapper import (
    PCG_EMISSION_MAP, PCG_SOCIAL_MAP, aggregate_by_category, co2e_kg, unconverted_spend,
)


def _e(acc, amt):
    return {"compte_num": acc, "net_amount": amt, "date": "2025-03-15"}


def test_co2e_units_per_keur():
    assert co2e_kg(10_000, 110) == 1100.0


def test_no_taxes_or_depreciation_converted():
    for acc in ("635", "661", "681", "63"):
        assert acc not in PCG_EMISSION_MAP


def test_energy_and_goods_are_listed_not_converted():
    rows = [_e("6061", 5000), _e("6251", 800)]
    out = unconverted_spend(rows)
    assert {o["account"] for o in out} >= {"6061", "6251"}
    assert out[0]["amount_eur"] >= out[-1]["amount_eur"]
    assert all(o["advice"] for o in out)


def test_no_invented_ademe_per_euro_factor_in_categories():
    import pathlib
    src = pathlib.Path("backend/app/api/v1/endpoints/carbon.py").read_text() if pathlib.Path("backend/app").exists() else pathlib.Path("app/api/v1/endpoints/carbon.py").read_text()
    assert '"factor": 0.85' not in src
