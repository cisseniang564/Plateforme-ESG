"""
Tests unitaires — ESRS gap-analysis (mapping données → standards ESRS).

Couvre les helpers purs de app/api/v1/endpoints/esrs.py corrigés lors de
l'audit #22 :
  * _covered_count   — heuristique de couverture (Bug A : arrondi banker's)
  * _norm_pillar     — normalisation FR/EN du pilier (Bug C)
  * _section_matches_entry — matching d'une DataEntry sur une section ESRS
"""
from app.api.v1.endpoints.esrs import (
    _covered_count,
    _norm_pillar,
    _section_matches_entry,
    ESRS_SECTIONS,
)


class TestCoveredCount:
    """Bug A — round(matching*0.5) utilisait l'arrondi pair (round(0.5)==0)."""

    def test_zero_entries_zero_coverage(self):
        assert _covered_count(0, 9) == 0

    def test_single_entry_covers_at_least_one(self):
        # Auparavant round(0.5) == 0 → une donnée = 0 % de couverture.
        assert _covered_count(1, 9) == 1

    def test_no_bankers_rounding_artifact(self):
        # round(2.5) renvoyait 2 ; ceil(5/2) = 3.
        assert _covered_count(5, 9) == 3
        assert _covered_count(3, 9) == 2

    def test_saturates_at_n_disc(self):
        assert _covered_count(100, 6) == 6
        assert _covered_count(12, 6) == 6

    def test_monotonic_non_decreasing(self):
        prev = -1
        for m in range(0, 40):
            c = _covered_count(m, 9)
            assert c >= prev, f"coverage decreased at matching={m}"
            assert c <= 9
            prev = c

    def test_empty_section(self):
        assert _covered_count(5, 0) == 0


class TestNormPillar:
    """Bug C — les entrées au pilier FR ('environnement', 'gouvernance') étaient ignorées."""

    def test_french_maps_to_english(self):
        assert _norm_pillar("environnement") == "environmental"
        assert _norm_pillar("gouvernance") == "governance"

    def test_english_passthrough(self):
        assert _norm_pillar("environmental") == "environmental"
        assert _norm_pillar("social") == "social"
        assert _norm_pillar("governance") == "governance"

    def test_case_and_accent_insensitive(self):
        assert _norm_pillar("Gouvernance") == "governance"
        assert _norm_pillar("  ENVIRONNEMENT ") == "environmental"


class TestSectionMatching:
    def _e1(self):
        return next(s for s in ESRS_SECTIONS if s["code"] == "E1")

    def test_matches_on_english_pillar(self):
        assert _section_matches_entry(self._e1(), "environmental", "Climat", "Émissions CO2 scope 1") is True

    def test_matches_on_french_pillar(self):
        # Bug C : un pilier 'environnement' (FR) doit désormais matcher E1.
        assert _section_matches_entry(self._e1(), "environnement", "Climat", "Émissions CO2 scope 1") is True

    def test_no_match_wrong_pillar(self):
        assert _section_matches_entry(self._e1(), "social", "Formation", "Heures de formation") is False

    def test_no_match_without_keyword(self):
        assert _section_matches_entry(self._e1(), "environmental", "Divers", "Indicateur sans rapport") is False
