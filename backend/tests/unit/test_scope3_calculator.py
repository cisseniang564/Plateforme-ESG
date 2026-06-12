"""
Tests unitaires — calculateur Scope 3 (spend-based / activity-based).

Les calculs d'émissions GES sont un élément contractuel et réglementaire
(GHG Protocol, Bilan Carbone ADEME). Ces tests vérifient l'exactitude
des calculs, la gestion des erreurs, et la cohérence des facteurs.
"""
import pytest
from app.services.scope3_calculator import (
    LineItem,
    calculate,
    get_factor,
    list_categories,
    SPEND_FACTORS,
    ACTIVITY_FACTORS,
)


# ═══════════════════════════════════════════════════════════════════════════════
# 1. get_factor — résolution des codes facteurs
# ═══════════════════════════════════════════════════════════════════════════════

class TestGetFactor:
    def test_known_spend_factor(self):
        f = get_factor("services_informatiques")
        assert f is not None
        assert f.code == "services_informatiques"
        assert f.factor == pytest.approx(0.110, abs=1e-6)
        assert f.unit == "kgCO2e/EUR"

    def test_known_activity_factor(self):
        f = get_factor("act_voiture_essence")
        assert f is not None
        assert f.factor > 0
        assert f.unit == "kgCO2e/km"

    def test_unknown_factor_returns_none(self):
        assert get_factor("facteur_inexistant_xyz") is None

    def test_all_factor_codes_are_unique(self):
        all_codes = [f.code for f in SPEND_FACTORS + ACTIVITY_FACTORS]
        assert len(all_codes) == len(set(all_codes)), "Duplicate factor codes detected"

    def test_all_factors_have_positive_factor_value(self):
        for f in SPEND_FACTORS + ACTIVITY_FACTORS:
            assert f.factor > 0, f"Non-positive factor for {f.code}: {f.factor}"

    def test_all_factors_have_valid_category_id(self):
        for f in SPEND_FACTORS + ACTIVITY_FACTORS:
            assert 1 <= f.category_id <= 15, (
                f"Invalid category_id {f.category_id} for {f.code}"
            )


# ═══════════════════════════════════════════════════════════════════════════════
# 2. calculate — calcul des émissions
# ═══════════════════════════════════════════════════════════════════════════════

class TestCalculate:
    def test_single_line_spend(self):
        # services_informatiques : factor = 0.110 kgCO2e/EUR
        lines = [LineItem(factor_code="services_informatiques", quantity=1000.0)]
        result = calculate(lines)
        assert result["total_kgco2e"] == pytest.approx(110.0, abs=0.01)
        assert result["total_tco2e"] == pytest.approx(0.110, abs=0.001)

    def test_single_line_activity(self):
        # act_voiture_essence : factor = 0.193 kgCO2e/km
        lines = [LineItem(factor_code="act_voiture_essence", quantity=500.0)]
        result = calculate(lines)
        assert result["total_kgco2e"] == pytest.approx(96.5, abs=0.01)

    def test_multiple_lines_sum(self):
        lines = [
            LineItem(factor_code="services_informatiques", quantity=1000.0),  # 110 kg
            LineItem(factor_code="services_conseil",        quantity=500.0),   # 47.5 kg
        ]
        result = calculate(lines)
        assert result["total_kgco2e"] == pytest.approx(157.5, abs=0.1)
        assert len(result["details"]) == 2

    def test_empty_lines_returns_zero(self):
        result = calculate([])
        assert result["total_kgco2e"] == 0.0
        assert result["total_tco2e"] == 0.0
        assert result["details"] == []

    def test_unknown_factor_code_generates_warning(self):
        lines = [LineItem(factor_code="facteur_inconnu", quantity=100.0)]
        result = calculate(lines)
        assert result["total_kgco2e"] == 0.0
        assert len(result["warnings"]) == 1
        assert "facteur_inconnu" in result["warnings"][0].lower()

    def test_negative_quantity_generates_warning(self):
        lines = [LineItem(factor_code="services_informatiques", quantity=-50.0)]
        result = calculate(lines)
        assert result["total_kgco2e"] == 0.0
        assert len(result["warnings"]) == 1

    def test_zero_quantity_contributes_zero_emissions(self):
        lines = [LineItem(factor_code="services_informatiques", quantity=0.0)]
        result = calculate(lines)
        assert result["total_kgco2e"] == 0.0

    def test_by_category_aggregation(self):
        # Deux lignes dans la même catégorie (cat 1 - biens et services)
        lines = [
            LineItem(factor_code="services_informatiques", quantity=1000.0),  # cat 1
            LineItem(factor_code="marketing_communication",  quantity=500.0),  # cat 1
        ]
        result = calculate(lines)
        cats = {c["category_id"]: c for c in result["by_category"]}
        assert 1 in cats
        expected_kg = 1000.0 * 0.110 + 500.0 * 0.155
        assert cats[1]["kgco2e"] == pytest.approx(expected_kg, abs=0.1)

    def test_by_category_multiple_categories(self):
        lines = [
            LineItem(factor_code="services_informatiques", quantity=1000.0),  # cat 1
            LineItem(factor_code="immobilisations_machines", quantity=500.0),  # cat 2
            LineItem(factor_code="deplacement_train",        quantity=200.0),  # cat 6
        ]
        result = calculate(lines)
        cat_ids = [c["category_id"] for c in result["by_category"]]
        assert 1 in cat_ids
        assert 2 in cat_ids
        assert 6 in cat_ids

    def test_tonne_conversion_accuracy(self):
        # 1000 kgCO2e = 1 tCO2e exactly
        lines = [LineItem(factor_code="services_informatiques", quantity=1000.0 / 0.110)]
        result = calculate(lines)
        assert result["total_tco2e"] == pytest.approx(
            result["total_kgco2e"] / 1000.0, abs=0.001
        )

    def test_detail_structure(self):
        lines = [LineItem(
            factor_code="services_informatiques",
            quantity=100.0,
            label="Achat SaaS Salesforce"
        )]
        result = calculate(lines)
        d = result["details"][0]
        assert d["factor_code"] == "services_informatiques"
        assert d["quantity"] == 100.0
        assert d["emissions_kgco2e"] == pytest.approx(11.0, abs=0.01)
        assert d["user_label"] == "Achat SaaS Salesforce"

    def test_high_emitter_alimentaire(self):
        # alimentation_restauration : 1.200 kgCO2e/EUR
        lines = [LineItem(factor_code="alimentation_restauration", quantity=10_000.0)]
        result = calculate(lines)
        assert result["total_kgco2e"] == pytest.approx(12_000.0, abs=0.1)

    def test_air_travel_highest_deplacements(self):
        # deplacement_avion_court : 1.250 kgCO2e/EUR
        lines = [LineItem(factor_code="deplacement_avion_court", quantity=1.0)]
        r = calculate(lines)
        # Avion doit être > train (0.020)
        r_train = calculate([LineItem(factor_code="deplacement_train", quantity=1.0)])
        assert r["total_kgco2e"] > r_train["total_kgco2e"]

    def test_mixed_valid_and_invalid_lines(self):
        lines = [
            LineItem(factor_code="services_informatiques", quantity=1000.0),
            LineItem(factor_code="INVALID", quantity=500.0),
        ]
        result = calculate(lines)
        # Seule la ligne valide contribue
        assert result["total_kgco2e"] == pytest.approx(110.0, abs=0.01)
        assert len(result["warnings"]) == 1


# ═══════════════════════════════════════════════════════════════════════════════
# 3. list_categories — inventaire GHG Protocol
# ═══════════════════════════════════════════════════════════════════════════════

class TestListCategories:
    def test_returns_15_categories(self):
        cats = list_categories()
        assert len(cats) == 15

    def test_category_ids_are_1_to_15(self):
        cats = list_categories()
        ids = [c["category_id"] for c in cats]
        assert sorted(ids) == list(range(1, 16))

    def test_each_category_has_required_keys(self):
        for cat in list_categories():
            assert "category_id" in cat
            assert "label" in cat
            assert "spend_factors" in cat
            assert "activity_factors" in cat

    def test_category_1_has_spend_factors(self):
        cats = {c["category_id"]: c for c in list_categories()}
        assert len(cats[1]["spend_factors"]) > 0

    def test_no_category_has_negative_factor(self):
        for cat in list_categories():
            for f in cat["spend_factors"] + cat["activity_factors"]:
                assert f["factor"] > 0, f"Negative factor in cat {cat['category_id']}: {f}"
