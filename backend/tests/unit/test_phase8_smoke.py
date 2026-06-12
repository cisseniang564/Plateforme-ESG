"""
Smoke tests for the production-grade services shipped in phases 4-8.

These cover the *pure* (no DB / no async) logic of each service: validation
rules, calculation engines, modal splits, statistical detectors. They are
fast (<1s total) and meant to catch regressions in core math/rules without
needing the full test harness.

Covered:
  - sbti_service.validate_commitment              (Phase 6)
  - commute_emissions_service.compute_commute_emissions  (Phase 8)
  - lca_service.compute                            (Phase 7)
  - anomaly_detection_service detectors            (Phase 4)
"""
import pytest
from datetime import datetime, date, timedelta
from uuid import uuid4
from unittest.mock import MagicMock

pytestmark = pytest.mark.unit


# ────────────────────────────────────────────────────────────────────────────
# Phase 6 — SBTi validation
# ────────────────────────────────────────────────────────────────────────────

class TestSBTiValidation:

    def _make_commitment(self, **overrides):
        from app.models.sbti_commitment import SBTiCommitment
        defaults = dict(
            id=uuid4(),
            tenant_id=uuid4(),
            organization_name="ACME Corp",
            sector="Industry",
            method="1.5C",
            baseline_year=datetime.utcnow().year - 1,
            baseline_scope1_tco2e=2500.0,
            baseline_scope2_tco2e=1500.0,
            baseline_scope3_tco2e=6000.0,
            baseline_total_tco2e=10000.0,
            near_term_target_year=datetime.utcnow().year + 7,
            near_term_reduction_pct=42.0,
            near_term_scope_coverage="scope1+2",
            net_zero_year=2050,
            long_term_reduction_pct=92.0,
            scope3_pct_of_total=60.0,
            scope3_screening_completed=True,
            scope3_target_pct=27.0,
            contact_email="dr.rse@acme.fr",
        )
        defaults.update(overrides)
        return SBTiCommitment(**defaults)

    def test_valid_commitment_passes(self):
        from app.services.sbti_service import validate_commitment
        c = self._make_commitment()
        result = validate_commitment(c)
        assert result.is_submission_ready is True
        assert result.blockers == 0

    def test_baseline_too_old_is_blocker(self):
        from app.services.sbti_service import validate_commitment
        c = self._make_commitment(baseline_year=datetime.utcnow().year - 10)
        result = validate_commitment(c)
        assert result.is_submission_ready is False
        assert any(i.code == "C1" and i.severity == "blocker" for i in result.issues)

    def test_short_horizon_is_blocker(self):
        from app.services.sbti_service import validate_commitment
        c = self._make_commitment(near_term_target_year=datetime.utcnow().year + 2)
        result = validate_commitment(c)
        assert any(i.code == "C2" and i.severity == "blocker" for i in result.issues)

    def test_15c_method_requires_42pct_annual_4_2(self):
        """1.5°C method requires >= 4.2%/yr linear reduction."""
        from app.services.sbti_service import validate_commitment
        # 7yr horizon × 4.2 = 29.4% minimum total; below that is a blocker
        c = self._make_commitment(near_term_reduction_pct=10.0)
        result = validate_commitment(c)
        assert any(i.code == "C3" and i.severity == "blocker" for i in result.issues)

    def test_net_zero_after_2050_is_blocker(self):
        from app.services.sbti_service import validate_commitment
        c = self._make_commitment(net_zero_year=2055)
        result = validate_commitment(c)
        assert any(i.code == "C4" and i.severity == "blocker" for i in result.issues)

    def test_scope3_target_required_when_scope3_above_40pct(self):
        from app.services.sbti_service import validate_commitment
        c = self._make_commitment(scope3_pct_of_total=60.0, scope3_target_pct=None)
        result = validate_commitment(c)
        assert any(i.code == "C7" and i.severity == "blocker" for i in result.issues)


# ────────────────────────────────────────────────────────────────────────────
# Phase 8 — Commute emissions
# ────────────────────────────────────────────────────────────────────────────

class TestCommuteEmissions:

    def test_basic_compute_returns_positive(self):
        from app.services.commute_emissions_service import compute_commute_emissions
        r = compute_commute_emissions(headcount=100)
        assert r.annual_tco2e_total > 0
        assert r.annual_kgco2e_per_employee > 0
        assert r.annual_pkm_per_employee == 14 * 2 * 215  # default distance × round-trip × 215 days

    def test_teleworking_reduces_emissions_proportionally(self):
        from app.services.commute_emissions_service import compute_commute_emissions
        r0 = compute_commute_emissions(headcount=100, teleworking_days_per_week=0)
        r2 = compute_commute_emissions(headcount=100, teleworking_days_per_week=2)
        # 2 days/week = 40% reduction in commute days
        assert r2.annual_tco2e_total < r0.annual_tco2e_total
        ratio = r2.annual_tco2e_total / r0.annual_tco2e_total
        assert 0.55 < ratio < 0.65  # ≈ 0.60 (1 - 2/5)

    def test_rural_profile_emits_more_than_urban(self):
        """Rural commuters drive more, so per-ETP emissions should be ~3-4× urban."""
        from app.services.commute_emissions_service import compute_commute_emissions
        urban = compute_commute_emissions(headcount=100, geographic_profile="dense_urban")
        rural = compute_commute_emissions(headcount=100, geographic_profile="rural")
        assert rural.annual_tco2e_total > urban.annual_tco2e_total * 2

    def test_modal_split_normalizes(self):
        """Custom modal_split that doesn't sum to 1.0 should be normalized."""
        from app.services.commute_emissions_service import compute_commute_emissions
        r = compute_commute_emissions(
            headcount=10,
            modal_split_override={"car_avg": 2.0, "metro": 3.0},  # sums to 5, should normalize
        )
        # Shares should sum to ~100% in the output
        total_share = sum(m.modal_share_pct for m in r.by_mode)
        assert 99 < total_share < 101

    def test_invalid_headcount_raises(self):
        from app.services.commute_emissions_service import compute_commute_emissions
        with pytest.raises(ValueError):
            compute_commute_emissions(headcount=0)


# ────────────────────────────────────────────────────────────────────────────
# Phase 7 — LCA computation
# ────────────────────────────────────────────────────────────────────────────

class TestLCACompute:

    def _make_product(self, stages=None, annual_volume=None):
        product = MagicMock()
        product.stages = stages or {}
        product.annual_volume = annual_volume
        return product

    def test_empty_product_returns_zero(self):
        from app.services.lca_service import compute
        r = compute(self._make_product())
        assert r.total_kg_co2e == 0
        assert r.annual_kg_co2e is None

    def test_basic_glass_bottle_lca(self):
        from app.services.lca_service import compute
        product = self._make_product(
            stages={
                "raw_material":  [{"factor_code": "glass_virgin",      "quantity": 0.20}],
                "manufacturing": [{"factor_code": "injection_molding", "quantity": 0.05}],
                "transport":     [{"factor_code": "truck_road",        "quantity": 0.4}],
            },
            annual_volume=100000,
        )
        r = compute(product)
        # 0.20 × 0.85 (glass) + 0.05 × 1.80 (injection) + 0.4 × 0.072 (truck) ≈ 0.289
        assert 0.25 < r.total_kg_co2e < 0.35
        assert r.annual_kg_co2e is not None and r.annual_kg_co2e > 25000
        # Glass virgin should be the hot spot (raw_material stage)
        assert r.largest_contributor is not None
        assert r.largest_contributor["factor_code"] == "glass_virgin"

    def test_recycling_credits_subtract(self):
        """eol_recycling has a negative factor — should reduce total."""
        from app.services.lca_service import compute
        without = self._make_product(stages={
            "raw_material": [{"factor_code": "glass_virgin", "quantity": 1.0}],
        })
        with_recycling = self._make_product(stages={
            "raw_material": [{"factor_code": "glass_virgin", "quantity": 1.0}],
            "end_of_life":  [{"factor_code": "eol_recycling", "quantity": 1.0}],
        })
        r_a = compute(without)
        r_b = compute(with_recycling)
        assert r_b.total_kg_co2e < r_a.total_kg_co2e

    def test_unknown_factor_yields_zero_emission(self):
        from app.services.lca_service import compute
        product = self._make_product(stages={
            "raw_material": [{"factor_code": "totally_made_up_factor", "quantity": 100}],
        })
        r = compute(product)
        # Item is still surfaced (so user sees the issue) but emits 0
        assert r.total_kg_co2e == 0
        # Should have at least one item with a "missing factor" note
        assert any(
            any(item.note and "introuvable" in item.note for item in s.items)
            for s in r.stages
        )


# ────────────────────────────────────────────────────────────────────────────
# Phase 4 — Anomaly detection (pure functions)
# ────────────────────────────────────────────────────────────────────────────

class TestAnomalyDetectors:
    """Tests on the per-detector helpers (no DB / async needed)."""

    def _make_entries(self, values, metric="scope1", organization_id=None):
        """Build mock DataEntry rows."""
        entries = []
        for i, v in enumerate(values):
            e = MagicMock()
            e.id = uuid4()
            e.metric_name = metric
            e.value_numeric = v
            e.period_start = date(2024, 1, 1) + timedelta(days=30 * i)
            e.organization_id = organization_id or uuid4()
            entries.append(e)
        return entries

    def test_zscore_flags_outlier(self):
        from app.services.anomaly_detection_service import _zscore_outliers
        # 20 normal values tightly clustered + 1 extreme outlier far enough to clear σ ≥ 3.5
        # Once the outlier is included, σ grows so the test value must be very far.
        values = [100] * 20 + [10000]
        entries = self._make_entries(values)
        anomalies = _zscore_outliers(entries)
        assert len(anomalies) >= 1
        flagged_values = {a.value for a in anomalies}
        assert 10000 in flagged_values

    def test_magnitude_detects_unit_confusion(self):
        """10× the median should be flagged as a magnitude shift."""
        from app.services.anomaly_detection_service import _magnitude_shifts
        # 5 normal entries around 100, 1 entry at 1000 (10×)
        values = [95, 100, 105, 100, 95, 1000]
        entries = self._make_entries(values)
        anomalies = _magnitude_shifts(entries)
        flagged_values = {a.value for a in anomalies}
        assert 1000 in flagged_values

    def test_sign_flip_flags_negative(self):
        """A negative value in a normally-positive metric is flagged."""
        from app.services.anomaly_detection_service import _sign_flips
        values = [100, 95, 105, 110, -50]  # only 4 positive but >= 80%
        entries = self._make_entries(values)
        anomalies = _sign_flips(entries)
        assert any(a.value == -50 for a in anomalies)

    def test_yoy_delta_flags_jump(self):
        """A +100% YoY jump on the same metric should be flagged."""
        from app.services.anomaly_detection_service import _yoy_deltas
        # Sequential dates, value doubles between two consecutive entries
        same_org = uuid4()
        entries = self._make_entries([100, 100, 100, 100, 250], organization_id=same_org)
        anomalies = _yoy_deltas(entries)
        assert any(a.value == 250 for a in anomalies)

    def test_zscore_requires_minimum_samples(self):
        """With <5 samples z-score detector should not flag anything."""
        from app.services.anomaly_detection_service import _zscore_outliers
        entries = self._make_entries([100, 200, 300])  # only 3 samples
        anomalies = _zscore_outliers(entries)
        assert anomalies == []


# ────────────────────────────────────────────────────────────────────────────
# Phase 5 — Sector benchmark normalization (pure function)
# ────────────────────────────────────────────────────────────────────────────

class TestSectorNormalization:

    @pytest.mark.parametrize("raw,expected", [
        ("Software / SaaS",                    "tech"),
        ("Édition de logiciels",               "tech"),
        ("Banque privée",                      "finance"),
        ("Industrie automobile",               "industry"),
        ("Commerce de détail",                 "retail"),
        ("BTP gros œuvre",                     "construction"),
        ("Transport routier",                  "transport"),
        ("Énergie renouvelable",               "energy"),
        ("Santé / pharma",                     "healthcare"),
        ("Cabinet de conseil",                 "services"),
        ("Unknown business",                   "default"),
        ("",                                   "default"),
    ])
    def test_sector_normalization(self, raw, expected):
        from app.data.benchmark_baselines import normalize_sector
        assert normalize_sector(raw) == expected
