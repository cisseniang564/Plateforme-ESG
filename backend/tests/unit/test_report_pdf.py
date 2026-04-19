"""
Tests unitaires — Génération de rapports PDF (ReportService)
Vérifie : output valide, tous les types, structure PDF, taille, pages.
"""
import io
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

pytestmark = pytest.mark.unit


TENANT_ID = uuid4()


def _make_mock_db():
    """Mock DB session qui retourne des données ESG réalistes."""
    from unittest.mock import AsyncMock

    # Simulate DataEntry objects
    mock_entry = MagicMock()
    mock_entry.pillar = "environmental"
    mock_entry.category = "E1"
    mock_entry.metric_name = "Émissions CO2 Scope 1"
    mock_entry.value_numeric = 750.5
    mock_entry.value_text = None
    mock_entry.unit = "tCO2eq"
    mock_entry.verification_status = "verified"

    mock_entry2 = MagicMock()
    mock_entry2.pillar = "social"
    mock_entry2.category = "S1"
    mock_entry2.metric_name = "Taux de rétention employés"
    mock_entry2.value_numeric = 88.0
    mock_entry2.value_text = None
    mock_entry2.unit = "%"
    mock_entry2.verification_status = "verified"

    mock_entry3 = MagicMock()
    mock_entry3.pillar = "governance"
    mock_entry3.category = "G1"
    mock_entry3.metric_name = "Indépendance Conseil d'Administration"
    mock_entry3.value_numeric = 75.0
    mock_entry3.value_text = None
    mock_entry3.unit = "%"
    mock_entry3.verification_status = "pending"

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [mock_entry, mock_entry2, mock_entry3]

    db = AsyncMock()
    db.execute = AsyncMock(return_value=mock_result)
    return db


def _is_valid_pdf(data: bytes) -> bool:
    """Check PDF magic bytes."""
    return data[:4] == b'%PDF'


class TestReportServiceInit:
    """Initialisation du service."""

    def test_report_types_defined(self):
        from app.services.report_service import ReportService
        assert "csrd" in ReportService.REPORT_TYPES
        assert "executive" in ReportService.REPORT_TYPES
        assert "detailed" in ReportService.REPORT_TYPES
        assert "gri" in ReportService.REPORT_TYPES
        assert "tcfd" in ReportService.REPORT_TYPES

    def test_report_types_have_name(self):
        from app.services.report_service import ReportService
        for key, val in ReportService.REPORT_TYPES.items():
            assert "name" in val, f"Report type '{key}' missing 'name'"
            assert len(val["name"]) > 0


class TestReportGeneration:
    """Génération de PDF — chaque type doit produire un PDF valide."""

    @pytest.mark.asyncio
    async def test_csrd_generates_pdf_bytes(self):
        from app.services.report_service import ReportService
        db = _make_mock_db()
        svc = ReportService(db)
        pdf = await svc.generate_report(TENANT_ID, "csrd", year=2024)
        assert isinstance(pdf, bytes)
        assert len(pdf) > 0

    @pytest.mark.asyncio
    async def test_csrd_output_is_valid_pdf(self):
        from app.services.report_service import ReportService
        db = _make_mock_db()
        svc = ReportService(db)
        pdf = await svc.generate_report(TENANT_ID, "csrd", year=2024)
        assert _is_valid_pdf(pdf), "Output does not start with PDF magic bytes (%PDF)"

    @pytest.mark.asyncio
    @pytest.mark.parametrize("report_type", ["executive", "detailed", "csrd", "gri", "tcfd"])
    async def test_all_report_types_generate(self, report_type):
        from app.services.report_service import ReportService
        db = _make_mock_db()
        svc = ReportService(db)
        pdf = await svc.generate_report(TENANT_ID, report_type, year=2024)
        assert _is_valid_pdf(pdf), f"Invalid PDF for report type: {report_type}"
        assert len(pdf) > 1024, f"PDF too small for report type: {report_type} ({len(pdf)} bytes)"

    @pytest.mark.asyncio
    async def test_invalid_report_type_raises(self):
        from app.services.report_service import ReportService
        db = _make_mock_db()
        svc = ReportService(db)
        with pytest.raises(ValueError, match="Unknown report type"):
            await svc.generate_report(TENANT_ID, "invalid_type", year=2024)

    @pytest.mark.asyncio
    async def test_invalid_format_raises(self):
        from app.services.report_service import ReportService
        db = _make_mock_db()
        svc = ReportService(db)
        with pytest.raises(ValueError, match="Unsupported format"):
            await svc.generate_report(TENANT_ID, "csrd", year=2024, format="docx")

    @pytest.mark.asyncio
    async def test_pdf_has_multiple_pages(self):
        """A CSRD report should have at least 3 pages."""
        import re
        from app.services.report_service import ReportService
        db = _make_mock_db()
        svc = ReportService(db)
        pdf = await svc.generate_report(TENANT_ID, "csrd", year=2024)
        page_objects = re.findall(rb'/Type /Page[^s]', pdf)
        assert len(page_objects) >= 3, f"Expected >= 3 pages, found {len(page_objects)}"

    @pytest.mark.asyncio
    async def test_pdf_minimum_size(self):
        """PDF should be at least 5KB — ensures real content was generated."""
        from app.services.report_service import ReportService
        db = _make_mock_db()
        svc = ReportService(db)
        pdf = await svc.generate_report(TENANT_ID, "csrd", year=2024)
        assert len(pdf) >= 5_000, f"PDF suspiciously small: {len(pdf)} bytes"


class TestDataCollection:
    """_collect_data doit agréger correctement les données par pilier et section."""

    @pytest.mark.asyncio
    async def test_collect_data_structure(self):
        from app.services.report_service import ReportService
        db = _make_mock_db()
        svc = ReportService(db)
        data = await svc._collect_data(TENANT_ID, None, 2024)
        assert "entries" in data
        assert "by_section" in data
        assert "stats" in data

    @pytest.mark.asyncio
    async def test_stats_has_required_keys(self):
        from app.services.report_service import ReportService
        db = _make_mock_db()
        svc = ReportService(db)
        data = await svc._collect_data(TENANT_ID, None, 2024)
        stats = data["stats"]
        assert "total_entries" in stats
        assert "verified_count" in stats
        assert "pending_count" in stats
        assert "score" in stats
        assert "by_pillar" in stats

    @pytest.mark.asyncio
    async def test_score_is_percentage(self):
        from app.services.report_service import ReportService
        db = _make_mock_db()
        svc = ReportService(db)
        data = await svc._collect_data(TENANT_ID, None, 2024)
        score = data["stats"]["score"]
        assert 0 <= score <= 100, f"Score out of range: {score}"

    @pytest.mark.asyncio
    async def test_by_pillar_counts(self):
        from app.services.report_service import ReportService
        db = _make_mock_db()
        svc = ReportService(db)
        data = await svc._collect_data(TENANT_ID, None, 2024)
        by_pillar = data["stats"]["by_pillar"]
        assert "environmental" in by_pillar
        assert "social" in by_pillar
        assert "governance" in by_pillar
        # 3 mock entries: 1 env, 1 social, 1 governance
        assert by_pillar["environmental"] == 1
        assert by_pillar["social"] == 1
        assert by_pillar["governance"] == 1

    @pytest.mark.asyncio
    async def test_empty_db_returns_zero_stats(self):
        """Empty DB → total_entries = 0, score = 0."""
        from app.services.report_service import ReportService
        from unittest.mock import AsyncMock, MagicMock

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []
        db = AsyncMock()
        db.execute = AsyncMock(return_value=mock_result)

        svc = ReportService(db)
        data = await svc._collect_data(TENANT_ID, None, 2024)
        assert data["stats"]["total_entries"] == 0
        assert data["stats"]["score"] == 0
