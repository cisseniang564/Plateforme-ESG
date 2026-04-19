"""
Tests unitaires — Moteur de scoring ESG (ESGScoringService)
Couvre : ratings, confidence, pillar scores, weighted average, edge cases.
Aucun accès DB requis — méthodes statiques/classmethod uniquement.
"""
import pytest
from app.services.esg_scoring_service import ESGScoringService

pytestmark = pytest.mark.unit


# ─── _get_rating ──────────────────────────────────────────────────────────────

class TestGetRating:
    """Conversion score numérique → rating alphanumérique (9 niveaux)."""

    @pytest.mark.parametrize("score,expected", [
        (95.0,  "AAA"),
        (90.0,  "AAA"),   # boundary inclusive
        (89.9,  "AA"),
        (85.0,  "AA"),    # boundary inclusive
        (84.9,  "A"),
        (80.0,  "A"),
        (79.9,  "BBB"),
        (75.0,  "BBB"),
        (74.9,  "BB"),
        (70.0,  "BB"),
        (69.9,  "B"),
        (65.0,  "B"),
        (64.9,  "CCC"),
        (60.0,  "CCC"),
        (59.9,  "CC"),
        (55.0,  "CC"),
        (54.9,  "C"),
        (50.0,  "C"),
        (49.9,  "D"),
        (0.0,   "D"),
    ])
    def test_rating_scale(self, score, expected):
        assert ESGScoringService._get_rating(score) == expected

    def test_perfect_score(self):
        assert ESGScoringService._get_rating(100.0) == "AAA"

    def test_zero_score(self):
        assert ESGScoringService._get_rating(0.0) == "D"

    def test_negative_score_is_d(self):
        # Edge: score shouldn't go negative, but service should handle gracefully
        assert ESGScoringService._get_rating(-5.0) == "D"

    def test_returns_string(self):
        rating = ESGScoringService._get_rating(72.5)
        assert isinstance(rating, str)
        assert rating in {"AAA", "AA", "A", "BBB", "BB", "B", "CCC", "CC", "C", "D"}


# ─── _determine_confidence ────────────────────────────────────────────────────

class TestDetermineConfidence:
    """Niveau de confiance basé sur complétude % et nombre de points."""

    @pytest.mark.parametrize("completeness,data_count,expected", [
        # HIGH: completeness >= 90 AND count >= 50
        (90.0,  50,  "high"),
        (95.0,  60,  "high"),
        (100.0, 100, "high"),
        # Boundary failures for HIGH
        (89.9,  50,  "medium"),   # completeness just below threshold
        (90.0,  49,  "medium"),   # count just below threshold
        # MEDIUM: >= 70 AND >= 30
        (70.0,  30,  "medium"),
        (85.0,  35,  "medium"),
        (70.0,  49,  "medium"),
        # Boundary failures for MEDIUM
        (69.9,  30,  "low"),
        (70.0,  29,  "low"),
        # LOW: >= 50 AND >= 20
        (50.0,  20,  "low"),
        (60.0,  25,  "low"),
        # Boundary failures for LOW
        (49.9,  20,  "very_low"),
        (50.0,  19,  "very_low"),
        # VERY_LOW: everything else
        (0.0,   0,   "very_low"),
        (30.0,  10,  "very_low"),
    ])
    def test_confidence_levels(self, completeness, data_count, expected):
        result = ESGScoringService._determine_confidence(completeness, data_count)
        assert result == expected

    def test_returns_valid_level(self):
        valid_levels = {"high", "medium", "low", "very_low"}
        for comp in [0, 25, 50, 70, 90, 100]:
            for count in [0, 10, 20, 30, 50, 100]:
                assert ESGScoringService._determine_confidence(comp, count) in valid_levels


# ─── _calculate_pillar_scores ─────────────────────────────────────────────────

class TestCalculatePillarScores:
    """Score par pilier E/S/G depuis data_points (rows)."""

    @pytest.mark.asyncio
    async def test_environmental_single_category(self):
        # Émissions: weight=0.30, two values avg=80 → 80*0.30 = 24.0
        data = [
            ("environmental", "Émissions", "E001", "CO2", "t", 80.0, "2024-01-01", True),
            ("environmental", "Émissions", "E002", "CO2 2", "t", 80.0, "2024-01-01", True),
        ]
        scores = await ESGScoringService._calculate_pillar_scores(data)
        assert "environmental" in scores
        assert abs(scores["environmental"] - 24.0) < 0.01

    @pytest.mark.asyncio
    async def test_clamps_value_at_100(self):
        # Value = 150 should be clamped to 100
        data = [("environmental", "Émissions", "E001", "X", "t", 150.0, "2024-01-01", True)]
        scores = await ESGScoringService._calculate_pillar_scores(data)
        # 100 * 0.30 = 30.0
        assert abs(scores["environmental"] - 30.0) < 0.01

    @pytest.mark.asyncio
    async def test_clamps_value_at_zero(self):
        # Negative value should be clamped to 0
        data = [("environmental", "Émissions", "E001", "X", "t", -50.0, "2024-01-01", True)]
        scores = await ESGScoringService._calculate_pillar_scores(data)
        assert scores["environmental"] == 0.0

    @pytest.mark.asyncio
    async def test_multiple_pillars_independent(self, sample_data_points):
        scores = await ESGScoringService._calculate_pillar_scores(sample_data_points)
        assert "environmental" in scores
        assert "social" in scores
        assert "governance" in scores

    @pytest.mark.asyncio
    async def test_scores_are_non_negative(self, sample_data_points):
        scores = await ESGScoringService._calculate_pillar_scores(sample_data_points)
        for pillar, score in scores.items():
            assert score >= 0, f"Pillar {pillar} score is negative: {score}"

    @pytest.mark.asyncio
    async def test_unknown_category_uses_default_weight(self):
        # Unknown category → weight defaults to 0.1
        data = [("environmental", "CatégorieInconnue", "X001", "X", "t", 100.0, "2024-01-01", True)]
        scores = await ESGScoringService._calculate_pillar_scores(data)
        assert abs(scores["environmental"] - 10.0) < 0.01  # 100 * 0.10

    @pytest.mark.asyncio
    async def test_governance_pillar_weights(self):
        # Gouvernance=0.40, Éthique=0.40 → both 100 → 100*0.40 + 100*0.40 = 80
        data = [
            ("governance", "Gouvernance", "G001", "X", "t", 100.0, "2024-01-01", True),
            ("governance", "Éthique",     "G002", "X", "t", 100.0, "2024-01-01", True),
        ]
        scores = await ESGScoringService._calculate_pillar_scores(data)
        assert abs(scores["governance"] - 80.0) < 0.01

    @pytest.mark.asyncio
    async def test_category_average_multiple_values(self):
        # Two values (60 + 80) / 2 = 70 avg, * 0.30 = 21.0
        data = [
            ("environmental", "Émissions", "E001", "X", "t", 60.0, "2024-01-01", True),
            ("environmental", "Émissions", "E002", "X", "t", 80.0, "2024-01-01", True),
        ]
        scores = await ESGScoringService._calculate_pillar_scores(data)
        assert abs(scores["environmental"] - 21.0) < 0.01


# ─── Overall weighted score ───────────────────────────────────────────────────

class TestWeightedOverallScore:
    """Le score global est la moyenne pondérée E(0.33) + S(0.33) + G(0.34)."""

    def test_weights_sum_to_one(self):
        total = sum(ESGScoringService.DEFAULT_WEIGHTS.values())
        assert abs(total - 1.0) < 0.001

    def test_three_pillars_defined(self):
        weights = ESGScoringService.DEFAULT_WEIGHTS
        assert "environmental" in weights
        assert "social" in weights
        assert "governance" in weights

    def test_overall_score_formula(self):
        """Manual verification of weighted average."""
        pillar_scores = {"environmental": 80.0, "social": 70.0, "governance": 90.0}
        weights = ESGScoringService.DEFAULT_WEIGHTS
        expected = (80 * 0.33) + (70 * 0.33) + (90 * 0.34)
        actual = sum(pillar_scores[p] * weights[p] for p in pillar_scores)
        assert abs(actual - expected) < 0.01

    def test_equal_pillar_scores_give_weighted_result(self):
        """If all pillars = 80, overall ≈ 80 (since weights sum to 1)."""
        pillar_scores = {"environmental": 80.0, "social": 80.0, "governance": 80.0}
        weights = ESGScoringService.DEFAULT_WEIGHTS
        actual = sum(pillar_scores[p] * weights[p] for p in pillar_scores)
        assert abs(actual - 80.0) < 0.01

    def test_governance_has_highest_weight(self):
        """Governance (0.34) > Environmental (0.33) = Social (0.33)."""
        w = ESGScoringService.DEFAULT_WEIGHTS
        assert w["governance"] > w["environmental"]
        assert w["governance"] > w["social"]


# ─── Category weights validation ──────────────────────────────────────────────

class TestCategoryWeights:
    """Vérification de la cohérence des poids par catégorie."""

    def test_environmental_category_weights_sum(self):
        env_cats = ["Émissions", "Énergie", "Eau", "Déchets", "Biodiversité", "Circularité"]
        total = sum(ESGScoringService.CATEGORY_WEIGHTS[c] for c in env_cats)
        assert abs(total - 1.0) < 0.01

    def test_social_category_weights_sum(self):
        soc_cats = ["Emploi", "Diversité", "Formation", "Santé Sécurité", "Rémunération"]
        total = sum(ESGScoringService.CATEGORY_WEIGHTS[c] for c in soc_cats)
        assert abs(total - 1.0) < 0.01

    def test_governance_category_weights_sum(self):
        gov_cats = ["Gouvernance", "Éthique", "Chaîne valeur"]
        total = sum(ESGScoringService.CATEGORY_WEIGHTS[c] for c in gov_cats)
        assert abs(total - 1.0) < 0.01

    def test_all_weights_positive(self):
        for cat, weight in ESGScoringService.CATEGORY_WEIGHTS.items():
            assert weight > 0, f"Category '{cat}' has non-positive weight: {weight}"

    def test_emissions_highest_environmental_weight(self):
        """Émissions (0.30) doit être la catégorie environnementale la plus pondérée."""
        env_cats = ["Émissions", "Énergie", "Eau", "Déchets", "Biodiversité", "Circularité"]
        emissions_w = ESGScoringService.CATEGORY_WEIGHTS["Émissions"]
        for cat in env_cats:
            assert emissions_w >= ESGScoringService.CATEGORY_WEIGHTS[cat]


# ─── Edge cases & robustness ──────────────────────────────────────────────────

class TestEdgeCases:
    """Cas limites et robustesse."""

    def test_rating_boundary_90_is_aaa(self):
        assert ESGScoringService._get_rating(90.0) == "AAA"

    def test_rating_boundary_89_999_is_aa(self):
        assert ESGScoringService._get_rating(89.999) == "AA"

    def test_confidence_with_max_values(self):
        result = ESGScoringService._determine_confidence(100.0, 1000)
        assert result == "high"

    def test_confidence_with_zero_values(self):
        result = ESGScoringService._determine_confidence(0.0, 0)
        assert result == "very_low"

    @pytest.mark.asyncio
    async def test_pillar_score_single_data_point(self):
        data = [("environmental", "Eau", "E010", "Eau", "m3", 50.0, "2024-01-01", False)]
        scores = await ESGScoringService._calculate_pillar_scores(data)
        # 50 * 0.15 (Eau weight) = 7.5
        assert abs(scores["environmental"] - 7.5) < 0.01

    @pytest.mark.asyncio
    async def test_pillar_score_all_zeros(self):
        data = [
            ("environmental", "Émissions", "E001", "X", "t", 0.0, "2024-01-01", True),
            ("social", "Emploi", "S001", "X", "t", 0.0, "2024-01-01", True),
        ]
        scores = await ESGScoringService._calculate_pillar_scores(data)
        assert scores["environmental"] == 0.0
        assert scores["social"] == 0.0
