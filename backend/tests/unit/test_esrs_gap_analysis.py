"""
Tests unitaires — ESRS gap-analysis (mapping données → datapoints ESRS).

Couvre les helpers purs de app/api/v1/endpoints/esrs.py :
  * _norm_pillar           — normalisation FR/EN du pilier (audit #22, Bug C)
  * _section_matches_entry — matching d'une DataEntry sur une section ESRS
  * _disclosure_detection  — état réel par disclosure (audit #22, Bug B) :
        'covered' / 'missing' / 'manual', en remplacement de l'ancien drapeau
        positionnel trompeur ("les N premières disclosures sont couvertes").
"""
from app.api.v1.endpoints.esrs import (
    _norm_pillar,
    _section_matches_entry,
    _disclosure_detection,
    DISCLOSURE_KEYWORDS,
    ESRS_SECTIONS,
)


def _section(code):
    return next(s for s in ESRS_SECTIONS if s["code"] == code)


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
    def test_matches_on_english_pillar(self):
        assert _section_matches_entry(_section("E1"), "environmental", "Climat", "Émissions CO2 scope 1") is True

    def test_matches_on_french_pillar(self):
        # Bug C : un pilier 'environnement' (FR) doit désormais matcher E1.
        assert _section_matches_entry(_section("E1"), "environnement", "Climat", "Émissions CO2 scope 1") is True

    def test_no_match_wrong_pillar(self):
        assert _section_matches_entry(_section("E1"), "social", "Formation", "Heures de formation") is False

    def test_no_match_without_keyword(self):
        assert _section_matches_entry(_section("E1"), "environmental", "Divers", "Indicateur sans rapport") is False


class TestDisclosureDetection:
    """Bug B — chaque disclosure reflète l'état réel de la donnée, pas un rang positionnel."""

    def test_quantitative_disclosure_covered_when_data_matches(self):
        # Une donnée d'émissions GES couvre E1-6 (et non pas E1-1 par position).
        entries = [("environmental", "Climat", "Émissions CO2 scope 1")]
        assert _disclosure_detection(_section("E1"), "E1-6", entries) == "covered"

    def test_quantitative_disclosure_missing_when_no_matching_data(self):
        # Données d'émissions présentes mais aucune sur l'énergie -> E1-5 manquant.
        entries = [("environmental", "Climat", "Émissions CO2 scope 1")]
        assert _disclosure_detection(_section("E1"), "E1-5", entries) == "missing"

    def test_narrative_disclosure_is_manual(self):
        # E1-1 (plan de transition) est narratif : ni couvert ni manquant -> manual,
        # même si des données climat existent (l'ancien code le marquait "couvert").
        entries = [("environmental", "Climat", "Émissions CO2 scope 1")]
        assert _disclosure_detection(_section("E1"), "E1-1", entries) == "manual"

    def test_detection_respects_pillar(self):
        # Une donnée 'social' ne doit pas couvrir une disclosure environnementale.
        entries = [("social", "RH", "Émissions de formation")]
        assert _disclosure_detection(_section("E1"), "E1-6", entries) == "missing"

    def test_french_pillar_entry_still_covers(self):
        entries = [("environnement", "Eau", "Consommation d'eau industrielle")]
        assert _disclosure_detection(_section("E3"), "E3-4", entries) == "covered"

    def test_narrative_only_sections_have_no_auto_disclosures(self):
        # ESRS 2, S2, S3, S4 sont entièrement narratifs : aucune disclosure mappée.
        for code in ("ESRS 2", "S2", "S3", "S4"):
            section = _section(code)
            ids = {d["id"] for d in section["disclosures"]}
            assert ids.isdisjoint(DISCLOSURE_KEYWORDS.keys()), f"{code} should be fully manual"

    def test_mapping_ids_exist_in_sections(self):
        # Garde-fou : chaque id mappé doit exister dans le catalogue ESRS.
        all_ids = {d["id"] for s in ESRS_SECTIONS for d in s["disclosures"]}
        for disc_id in DISCLOSURE_KEYWORDS:
            assert disc_id in all_ids, f"Mapped disclosure {disc_id} not found in ESRS_SECTIONS"
