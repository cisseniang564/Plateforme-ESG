"""
Tests unitaires critiques — moteur de scoring ESG.

Couvre les calculs purs (sans DB) qui impactent directement les scores
communiqués aux clients et aux investisseurs.
"""
import pytest
from unittest.mock import AsyncMock


# ── Fixture : instancier le moteur sans connexion DB ─────────────────────────

@pytest.fixture
def engine():
    """ESGScoringEngine avec une session DB mock (aucun I/O)."""
    from app.services.esg_scoring_engine import ESGScoringEngine
    return ESGScoringEngine(db=AsyncMock())


# ═══════════════════════════════════════════════════════════════════════════════
# 1. _normalize_value
# ═══════════════════════════════════════════════════════════════════════════════

class TestNormalizeValue:
    """Normalisation d'une mesure brute vers 0-100."""

    def test_midpoint_higher_is_better(self, engine):
        # ENV-004 = énergie renouvelable, range [0,100], higher is better
        # Midpoint = 50 → normalized = 50
        result = engine._normalize_value(50.0, "ENV-004", higher_is_better=True)
        assert result == pytest.approx(50.0, abs=0.01)

    def test_maximum_higher_is_better(self, engine):
        # value == max → normalized == 100
        result = engine._normalize_value(100.0, "ENV-004", higher_is_better=True)
        assert result == pytest.approx(100.0, abs=0.01)

    def test_minimum_higher_is_better(self, engine):
        # value == min (0) → normalized == 0
        result = engine._normalize_value(0.0, "ENV-004", higher_is_better=True)
        assert result == pytest.approx(0.0, abs=0.01)

    def test_midpoint_lower_is_better(self, engine):
        # ENV-001 = émissions CO2, range [0,2000], lower is better
        # value = 1000 → raw_ratio = 0.5 → inverted = 50
        result = engine._normalize_value(1000.0, "ENV-001", higher_is_better=False)
        assert result == pytest.approx(50.0, abs=0.01)

    def test_zero_lower_is_better_gives_100(self, engine):
        # Zéro émissions → score parfait
        result = engine._normalize_value(0.0, "ENV-001", higher_is_better=False)
        assert result == pytest.approx(100.0, abs=0.01)

    def test_max_lower_is_better_gives_0(self, engine):
        # Valeur max d'émissions → score nul
        result = engine._normalize_value(2000.0, "ENV-001", higher_is_better=False)
        assert result == pytest.approx(0.0, abs=0.01)

    def test_exceeds_max_higher_is_better(self, engine):
        # Valeur au-delà du plafond → clampée à 0 (lower is better) or 0 (exceeds max)
        # higher_is_better=True, value > max → 0 (worst score)
        result = engine._normalize_value(9999.0, "ENV-001", higher_is_better=True)
        assert result == pytest.approx(0.0, abs=0.01)

    def test_below_min_lower_is_better(self, engine):
        # Valeur en-dessous du minimum → score parfait pour lower_is_better
        result = engine._normalize_value(-10.0, "ENV-001", higher_is_better=False)
        assert result == pytest.approx(100.0, abs=0.01)

    def test_unknown_indicator_uses_0_100_range(self, engine):
        # Indicateur inconnu → range [0,100], midpoint = 50
        result = engine._normalize_value(50.0, "UNKNOWN-999", higher_is_better=True)
        assert result == pytest.approx(50.0, abs=0.01)

    def test_output_always_in_0_100(self, engine):
        for val in [-500, 0, 50, 100, 5000]:
            r = engine._normalize_value(float(val), "ENV-004", higher_is_better=True)
            assert 0.0 <= r <= 100.0, f"Out of bounds for val={val}: got {r}"

    def test_equal_min_max_returns_50(self, engine):
        # Le BENCHMARK_RANGES d'un indicateur synthétique avec min=max
        engine.BENCHMARK_RANGES["TEST-EQ"] = {"min": 10, "max": 10}
        r = engine._normalize_value(10.0, "TEST-EQ", higher_is_better=True)
        assert r == pytest.approx(50.0, abs=0.01)


# ═══════════════════════════════════════════════════════════════════════════════
# 2. _calculate_rating
# ═══════════════════════════════════════════════════════════════════════════════

class TestCalculateRating:
    """Attribution du rating ESG depuis un score 0-100."""

    @pytest.mark.parametrize("score,expected", [
        (90.0, "AAA"),
        (85.0, "AAA"),  # exact threshold
        (84.9, "AA"),
        (75.0, "AA"),   # exact threshold
        (74.9, "A"),
        (65.0, "A"),    # exact threshold
        (64.9, "BBB"),
        (55.0, "BBB"),  # exact threshold
        (54.9, "BB"),
        (45.0, "BB"),   # exact threshold
        (44.9, "B"),
        (35.0, "B"),    # exact threshold
        (34.9, "CCC"),
        (25.0, "CCC"),  # exact threshold
        (24.9, "CC"),
        (15.0, "CC"),   # exact threshold
        (14.9, "C"),
        (0.0,  "C"),
    ])
    def test_rating_thresholds(self, engine, score, expected):
        assert engine._calculate_rating(score) == expected

    def test_perfect_score_is_aaa(self, engine):
        assert engine._calculate_rating(100.0) == "AAA"

    def test_zero_score_is_c(self, engine):
        assert engine._calculate_rating(0.0) == "C"


# ═══════════════════════════════════════════════════════════════════════════════
# 3. _calculate_overall_score
# ═══════════════════════════════════════════════════════════════════════════════

class TestCalculateOverallScore:
    """Score global pondéré E+S+G."""

    def _sector_weights(self, e, s, g):
        return {
            "environmental_weight": e,
            "social_weight": s,
            "governance_weight": g,
        }

    def test_equal_weights_equal_pillar_scores(self, engine):
        pillar_scores = {"environmental": 60.0, "social": 60.0, "governance": 60.0}
        weights = self._sector_weights(33.33, 33.33, 33.34)
        result = engine._calculate_overall_score(pillar_scores, weights)
        assert result == pytest.approx(60.0, abs=0.1)

    def test_energy_sector_weights_dominant_env(self, engine):
        # Énergie : E=45, S=30, G=25
        pillar_scores = {"environmental": 100.0, "social": 0.0, "governance": 0.0}
        weights = self._sector_weights(45.0, 30.0, 25.0)
        result = engine._calculate_overall_score(pillar_scores, weights)
        assert result == pytest.approx(45.0, abs=0.01)

    def test_all_pillars_100_gives_100(self, engine):
        pillar_scores = {"environmental": 100.0, "social": 100.0, "governance": 100.0}
        weights = self._sector_weights(33.33, 33.33, 33.34)
        result = engine._calculate_overall_score(pillar_scores, weights)
        assert result == pytest.approx(100.0, abs=0.1)

    def test_all_pillars_0_gives_0(self, engine):
        pillar_scores = {"environmental": 0.0, "social": 0.0, "governance": 0.0}
        weights = self._sector_weights(40.0, 35.0, 25.0)
        result = engine._calculate_overall_score(pillar_scores, weights)
        assert result == pytest.approx(0.0, abs=0.01)

    def test_finance_sector_governance_dominant(self, engine):
        # Finance : E=25, S=35, G=40 — bon score G compense mauvais E
        pillar_scores = {"environmental": 20.0, "social": 60.0, "governance": 90.0}
        weights = self._sector_weights(25.0, 35.0, 40.0)
        expected = (20.0 * 25 + 60.0 * 35 + 90.0 * 40) / 100.0
        result = engine._calculate_overall_score(pillar_scores, weights)
        assert result == pytest.approx(expected, abs=0.01)

    def test_weights_must_sum_to_100(self, engine):
        # Test d'invariant : si poids ≠ 100 le résultat est proportionnel
        pillar_scores = {"environmental": 50.0, "social": 50.0, "governance": 50.0}
        weights = self._sector_weights(50.0, 50.0, 50.0)  # intentionnellement 150
        result = engine._calculate_overall_score(pillar_scores, weights)
        assert result == pytest.approx(75.0, abs=0.01)  # (50*150)/100


# ═══════════════════════════════════════════════════════════════════════════════
# 4. _get_default_weights_for_sector
# ═══════════════════════════════════════════════════════════════════════════════

class TestDefaultWeightsForSector:
    """Pondérations sectorielles par défaut."""

    @pytest.mark.parametrize("sector,expected", [
        ("energie",     {"E": 45.0, "S": 30.0, "G": 25.0}),
        ("finance",     {"E": 25.0, "S": 35.0, "G": 40.0}),
        ("agriculture", {"E": 50.0, "S": 30.0, "G": 20.0}),
        ("tech",        {"E": 20.0, "S": 40.0, "G": 40.0}),
        ("services",    {"E": 25.0, "S": 40.0, "G": 35.0}),
        ("default",     {"E": 33.33, "S": 33.33, "G": 33.34}),
        ("unknown",     {"E": 33.33, "S": 33.33, "G": 33.34}),  # fallback
    ])
    def test_sector_weights(self, engine, sector, expected):
        result = engine._get_default_weights_for_sector(sector)
        for key in ("E", "S", "G"):
            assert result[key] == pytest.approx(expected[key], abs=0.01)

    def test_all_sectors_sum_to_100(self, engine):
        sectors = ["energie", "industrie", "finance", "tech",
                   "agriculture", "commerce", "services", "default"]
        for sector in sectors:
            w = engine._get_default_weights_for_sector(sector)
            total = w["E"] + w["S"] + w["G"]
            assert total == pytest.approx(100.0, abs=0.01), (
                f"Sector '{sector}' weights sum to {total}, expected 100"
            )


# ═══════════════════════════════════════════════════════════════════════════════
# 5. _calculate_pillar_scores (synchrone, aucun I/O DB)
# ═══════════════════════════════════════════════════════════════════════════════

class TestCalculatePillarScores:
    """Scores par pilier depuis des données d'indicateurs."""

    def _make_indicator(self, pillar: str, score: float, weight: float = 1.0):
        return {
            "pillar": pillar,
            "normalized_score": score,
            "weight": weight,
            "name": "test",
            "avg_value": 0.0,
            "unit": "unit",
            "trend": "stable",
            "count": 12,
        }

    @pytest.mark.asyncio
    async def test_single_environmental_indicator(self, engine):
        data = {"ENV-001": self._make_indicator("environmental", 75.0)}
        sector_weights = {"indicator_weights": {}}
        scores, details = await engine._calculate_pillar_scores(data, sector_weights)
        assert scores["environmental"] == pytest.approx(75.0, abs=0.01)
        assert scores["social"] == 0.0
        assert scores["governance"] == 0.0

    @pytest.mark.asyncio
    async def test_weighted_average_same_pillar(self, engine):
        # Deux indicateurs E: scores 80 (w=2) et 40 (w=1) → expected 66.67
        data = {
            "ENV-001": self._make_indicator("environmental", 80.0, weight=2.0),
            "ENV-002": self._make_indicator("environmental", 40.0, weight=1.0),
        }
        scores, _ = await engine._calculate_pillar_scores(data, {"indicator_weights": {}})
        assert scores["environmental"] == pytest.approx(80 * 2 / 3 + 40 / 3, abs=0.01)

    @pytest.mark.asyncio
    async def test_all_pillars_populated(self, engine):
        data = {
            "ENV-001": self._make_indicator("e", 60.0),
            "SOC-001": self._make_indicator("s", 70.0),
            "GOV-001": self._make_indicator("g", 80.0),
        }
        scores, _ = await engine._calculate_pillar_scores(data, {"indicator_weights": {}})
        assert scores["environmental"] == pytest.approx(60.0, abs=0.01)
        assert scores["social"] == pytest.approx(70.0, abs=0.01)
        assert scores["governance"] == pytest.approx(80.0, abs=0.01)

    @pytest.mark.asyncio
    async def test_empty_indicator_data_gives_zeros(self, engine):
        scores, _ = await engine._calculate_pillar_scores({}, {"indicator_weights": {}})
        assert all(v == 0.0 for v in scores.values())

    @pytest.mark.asyncio
    async def test_pillar_aliases_all_map_correctly(self, engine):
        """Tests de robustesse : tous les alias (fr/en) mappent au bon pilier."""
        for alias in ("environmental", "environnement", "e"):
            data = {"X": self._make_indicator(alias, 50.0)}
            scores, _ = await engine._calculate_pillar_scores(data, {"indicator_weights": {}})
            assert scores["environmental"] == pytest.approx(50.0, abs=0.01), (
                f"Alias '{alias}' didn't map to environmental"
            )
        for alias in ("social", "s"):
            data = {"X": self._make_indicator(alias, 50.0)}
            scores, _ = await engine._calculate_pillar_scores(data, {"indicator_weights": {}})
            assert scores["social"] == pytest.approx(50.0, abs=0.01)
        for alias in ("governance", "gouvernance", "g"):
            data = {"X": self._make_indicator(alias, 50.0)}
            scores, _ = await engine._calculate_pillar_scores(data, {"indicator_weights": {}})
            assert scores["governance"] == pytest.approx(50.0, abs=0.01)
