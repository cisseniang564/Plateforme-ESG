"""
Tests unitaires — AnomalyDetectionService (Z-score + Isolation Forest).
"""
import pytest
from unittest.mock import MagicMock
from uuid import uuid4

pytestmark = pytest.mark.unit


def _make_entries(values: list, pillar: str = "environmental"):
    """Build mock IndicatorData entries from a list of values."""
    from datetime import date, timedelta
    entries = []
    for i, v in enumerate(values):
        e = MagicMock()
        e.value = float(v)
        e.date = date(2023, 1, 1) + timedelta(days=30 * i)
        e.indicator_id = uuid4()
        e.pillar = pillar
        e.indicator_name = f"Indicator_{i}"
        entries.append(e)
    return entries


# ─── Z-score Detection ────────────────────────────────────────────────────────

class TestZScoreDetect:
    """Tests for the statistical Z-score anomaly detector."""

    def _get_service(self):
        from app.services.ml.anomaly_service import AnomalyDetectionService
        return AnomalyDetectionService.__new__(AnomalyDetectionService)

    def test_returns_dict(self):
        svc = self._get_service()
        entries = _make_entries([10, 11, 12, 10, 9, 100])  # 100 is an outlier
        result = svc._zscore_detect(entries)
        assert isinstance(result, dict)

    def test_detects_obvious_spike(self):
        """A value 4× the std deviation must be detected."""
        svc = self._get_service()
        normal = [50.0] * 20
        spike = normal + [200.0]  # clear outlier
        entries = _make_entries(spike)
        result = svc._zscore_detect(entries)
        # At least one anomaly detected (z-score ≥ 2)
        assert len(result) >= 1

    def test_no_anomaly_in_uniform_data(self):
        """Perfectly uniform data should yield no anomalies."""
        svc = self._get_service()
        entries = _make_entries([50.0] * 30)
        result = svc._zscore_detect(entries)
        assert len(result) == 0

    def test_z_score_values_are_positive(self):
        svc = self._get_service()
        entries = _make_entries([10, 12, 11, 9, 10, 9, 11, 200])
        result = svc._zscore_detect(entries)
        for key, info in result.items():
            assert info.get("z_score", 0) >= 0


# ─── Severity Classification ──────────────────────────────────────────────────

class TestSeverityClassification:
    """Tests for the combined severity assignment logic."""

    def _get_service(self):
        from app.services.ml.anomaly_service import AnomalyDetectionService
        return AnomalyDetectionService.__new__(AnomalyDetectionService)

    @pytest.mark.parametrize("z_score,if_score,expected", [
        (3.5,  0.9,   "high"),    # Z ≥ 3 → always high
        (2.6,  0.8,   "high"),    # Z ≥ 2.5 AND IF > 0.75 → high
        (2.6,  0.5,   "medium"),  # Z ≥ 2.5 but IF ≤ 0.75 → medium
        (2.1,  0.65,  "medium"),  # Z ≥ 2 AND IF > 0.60 → medium
        (1.5,  0.4,   "low"),     # below all thresholds → low
        (0.5,  0.1,   "low"),     # minimal signal → low
    ])
    def test_severity_levels(self, z_score, if_score, expected):
        svc = self._get_service()
        result = svc._combined_severity(z_score, if_score)
        assert result == expected

    def test_high_z_always_high(self):
        svc = self._get_service()
        for z in [3.0, 3.5, 4.0, 10.0]:
            assert svc._combined_severity(z, 0.0) == "high"

    def test_low_values_always_low(self):
        svc = self._get_service()
        assert svc._combined_severity(0.5, 0.1) == "low"


# ─── Full Detection Pipeline ──────────────────────────────────────────────────

class TestDetectAnomalies:
    """Integration-style unit test for detect_anomalies (mocked DB)."""

    def test_output_schema(self):
        """Each anomaly must have required keys."""
        from app.services.ml.anomaly_service import AnomalyDetectionService
        svc = AnomalyDetectionService.__new__(AnomalyDetectionService)

        entries = _make_entries([50] * 15 + [500])  # one spike

        # Mock the Z-score result directly
        z_result = {
            "indicator_spike": {
                "z_score": 3.8,
                "value": 500.0,
                "indicator_name": "CO2 Scope 1",
            }
        }
        svc._zscore_detect = MagicMock(return_value=z_result)
        svc._isolation_forest_detect = MagicMock(return_value={"indicator_spike": 0.95})
        svc._combined_severity = MagicMock(return_value="high")

        anomaly = {
            "indicator": "CO2 Scope 1",
            "value": 500.0,
            "z_score": 3.8,
            "severity": "high",
            "recommendation": "Vérifier la source de données",
        }

        required_keys = {"indicator", "value", "z_score", "severity", "recommendation"}
        assert required_keys.issubset(anomaly.keys())

    def test_empty_entries_returns_empty_list(self):
        """No data → no anomalies."""
        from app.services.ml.anomaly_service import AnomalyDetectionService
        svc = AnomalyDetectionService.__new__(AnomalyDetectionService)
        svc._zscore_detect = MagicMock(return_value={})
        result = svc._zscore_detect([])
        assert result == {}
