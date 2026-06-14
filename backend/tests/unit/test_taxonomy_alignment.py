"""
Tests unitaires — Données de référence EU Taxonomy 2020/852

Le catalogue d'activités de référence, les 6 objectifs environnementaux, les
secteurs éligibles et les critères DNSH sont servis tels quels au frontend
(page « Alignement Taxonomie »). Ces tests verrouillent leur intégrité.

NB : la logique d'alignement / d'éligibilité et le calcul des KPIs financiers
(CapEx/OpEx/CA) sont réalisés côté frontend (TaxonomyAlignment.tsx) et côté
service DB (taxonomy_assessment_service). Les anciens endpoints REST
/taxonomy/{assess,plan,report,kpis}, sans appelant et porteurs de bugs latents,
ont été supprimés (code mort) — ainsi que leurs tests de logique dupliquée.
"""
from app.api.v1.endpoints.taxonomy import (
    REFERENCE_ACTIVITIES,
    OBJECTIVES,
    SECTORS,
    DNSH_CRITERIA,
)


class TestReferenceData:
    def test_six_environmental_objectives(self):
        assert len(OBJECTIVES) == 6
        ids = [o["id"] for o in OBJECTIVES]
        assert "mitigation" in ids
        assert "adaptation" in ids
        assert "biodiversity" in ids

    def test_eight_sectors(self):
        assert len(SECTORS) == 8

    def test_reference_activities_have_required_fields(self):
        for act in REFERENCE_ACTIVITIES:
            assert "id" in act, f"Missing 'id' in activity: {act}"
            assert "name" in act, f"Missing 'name' in activity: {act}"
            assert "sector" in act, f"Missing 'sector' in activity: {act}"
            assert "objective" in act, f"Missing 'objective' in activity: {act}"

    def test_reference_activity_ids_unique(self):
        ids = [a["id"] for a in REFERENCE_ACTIVITIES]
        assert len(ids) == len(set(ids)), "Reference activity ids must be unique"

    def test_reference_activity_names_unique(self):
        # Several activities legitimately share a NACE code (e.g. D35.11 is used
        # by solar, wind, hydraulic and geothermal electricity production). The
        # frontend reload therefore matches saved rows back to the catalog by the
        # UNIQUE activity name (see TaxonomyAlignment.tsx). Lock that invariant in
        # so a future duplicate name can't silently re-introduce the collision.
        names = [a["name"] for a in REFERENCE_ACTIVITIES]
        assert len(names) == len(set(names)), "Reference activity names must be unique"

    def test_dnsh_default_covers_all_six_objectives(self):
        # The DNSH endpoint serves these keys and the frontend drops the
        # activity's own objective, leaving the 5 others to evaluate. _default
        # must therefore carry all 6 objectives — including 'mitigation', whose
        # absence previously let non-mitigation activities reach "Aligned"
        # without ever being shown the climate-mitigation DNSH check.
        default = DNSH_CRITERIA["_default"]
        for obj in ("mitigation", "adaptation", "water", "circular", "pollution", "biodiversity"):
            assert obj in default, f"DNSH _default missing objective: {obj}"

    def test_all_objective_codes_are_1_to_6(self):
        codes = {o["code"] for o in OBJECTIVES}
        for c in codes:
            assert int(c) in range(1, 7), f"Invalid objective code: {c}"
