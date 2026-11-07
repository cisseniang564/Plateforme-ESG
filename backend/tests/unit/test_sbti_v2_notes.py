"""Les notes V2.0 sont informatives : elles ne changent jamais blockers/warnings/ready."""
from datetime import datetime
from types import SimpleNamespace

from app.services.sbti_service import validate_commitment

NOW = datetime.utcnow().year


def _commitment(**kw):
    base = dict(
        baseline_year=NOW - 1, near_term_target_year=NOW + 5, near_term_reduction_pct=25.0,
        method="1.5C", net_zero_year=2050, long_term_reduction_pct=90.0,
        scope3_pct_of_total=10.0, scope3_target_pct=None, scope3_screening_completed=True,
        near_term_scope_coverage="scope1,scope2", organization_name="Acme", contact_email="a@b.fr",
    )
    base.update(kw)
    return SimpleNamespace(**base)


def _codes(res):
    return [(i.severity, i.code) for i in res.issues]


def test_notes_v2_toujours_presentes_et_informatives():
    res = validate_commitment(_commitment())
    v2 = [i for i in res.issues if i.code == "V2.0"]
    assert v2 and all(i.severity == "info" for i in v2)
    assert any("catégorie A" in i.message_fr for i in v2)


def test_horizon_different_de_5_ans_signale_en_info():
    res = validate_commitment(_commitment(near_term_target_year=NOW + 8))
    assert any(i.code == "V2.0" and "5 ans" in i.message_fr and "8" in i.message_fr for i in res.issues)


def test_horizon_5_ans_pas_de_note_horizon():
    res = validate_commitment(_commitment())
    assert not any("votre cible est à" in i.message_fr for i in res.issues)


def test_les_notes_v2_ne_comptent_ni_comme_blocage_ni_comme_avertissement():
    res = validate_commitment(_commitment())
    assert res.blockers == sum(1 for i in res.issues if i.severity == "blocker")
    assert res.warnings == sum(1 for i in res.issues if i.severity == "warning")
