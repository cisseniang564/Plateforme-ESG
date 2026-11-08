"""Jeux de règles SBTi : v5.x jusqu'au 31/01/2027, V2.0 ensuite."""
from datetime import date, datetime
from types import SimpleNamespace

from app.services.sbti_service import ruleset_for, validate_commitment

NOW = datetime.utcnow().year


def _c(**kw):
    base = dict(
        baseline_year=NOW - 1, near_term_target_year=NOW + 5, near_term_reduction_pct=25.0,
        method="1.5C", net_zero_year=2050, long_term_reduction_pct=90.0,
        scope3_pct_of_total=10.0, scope3_target_pct=None, scope3_screening_completed=True,
        near_term_scope_coverage="scope1,scope2", organization_name="Acme", contact_email="a@b.fr",
    )
    base.update(kw)
    return SimpleNamespace(**base)


def _sev(res, code):
    return [i.severity for i in res.issues if i.code == code]


def test_ruleset_selon_la_date():
    assert ruleset_for(date(2027, 1, 31)) == "v5"
    assert ruleset_for(date(2027, 2, 1)) == "v2"


def test_v5_conserve_les_regles_historiques():
    res = validate_commitment(_c(near_term_target_year=NOW + 8, near_term_reduction_pct=10.0), ruleset="v5")
    assert res.ruleset == "v5" and "Near-Term v5.x" in res.summary_fr
    assert "blocker" in _sev(res, "C3")          # taux annuel < 4,2 %
    assert "blocker" not in _sev(res, "C2")      # 8 ans reste admis en v5


def test_v2_horizon_strictement_5_ans():
    assert "blocker" in _sev(validate_commitment(_c(near_term_target_year=NOW + 8), ruleset="v2"), "C2")
    assert "blocker" not in _sev(validate_commitment(_c(), ruleset="v2"), "C2")


def test_v2_plus_de_taux_annuel_fixe():
    res = validate_commitment(_c(near_term_reduction_pct=10.0), ruleset="v2")
    assert _sev(res, "C3") == ["info"]


def test_v2_scope3_devient_avertissement():
    c = _c(scope3_pct_of_total=60.0)
    assert "blocker" in _sev(validate_commitment(c, ruleset="v5"), "C7")
    res = validate_commitment(c, ruleset="v2")
    assert "blocker" not in _sev(res, "C7") and "warning" in _sev(res, "C7")


def test_v2_signale_cibles_s1_s2_et_base_recente():
    res = validate_commitment(_c(baseline_year=NOW - 3), ruleset="v2")
    assert "warning" in _sev(res, "V2.0")
    assert "warning" in _sev(res, "C1")


def test_defaut_suit_la_date():
    res = validate_commitment(_c())
    assert res.ruleset == ruleset_for()
