"""Rapport VSME : mapping des saisies vers les modules B3–B11 et génération du PDF."""
import asyncio

from app.services.report_service import ReportService


def test_vsme_is_a_known_report_type():
    assert 'vsme' in ReportService.REPORT_TYPES
    assert set(ReportService.VSME_MODULES) == {'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9', 'B10', 'B11'}


def test_esrs_sections_map_to_vsme_modules():
    f = ReportService._vsme_module_for
    assert f('E1', 'Émissions scope 1') == 'B3'
    assert f('E3', 'Prélèvements d\'eau') == 'B6'
    assert f('E5', 'Déchets') == 'B7'
    assert f('G1', 'Amendes corruption') == 'B11'
    assert f('S2', 'Travailleurs de la chaîne de valeur') is None  # pas de module de base


def test_social_entries_are_split_by_keyword_with_b8_default():
    f = ReportService._vsme_module_for
    assert f('S1', "Taux d'accidents du travail") == 'B9'
    assert f('S1', 'Écart de rémunération F/H') == 'B10'
    assert f('S1', 'Heures de formation') == 'B10'
    assert f('S1', 'Effectif total') == 'B8'


def test_vsme_pdf_is_generated_with_and_without_data():
    svc = ReportService.__new__(ReportService)
    stats = {'total_entries': 0, 'verified_count': 0, 'pending_count': 0, 'score': 0, 'rating': 'N/A',
             'environmental_score': 0.0, 'social_score': 0.0, 'governance_score': 0.0, 'period_months': None,
             'by_pillar': {'environmental': 0, 'social': 0, 'governance': 0}}
    empty = {'stats': stats, 'org_name': 'Atelier Demo', 'by_section': {}, 'entries': {}}
    filled = {**empty, 'by_section': {'E1': [{'metric_name': 'Émissions scope 1', 'value': 12.5, 'unit': 'tCO2e', 'verification_status': 'verified'}],
                                       'S1': [{'metric_name': 'Effectif total', 'value': 240, 'unit': 'nombre', 'verification_status': 'pending'}]}}
    for data in (empty, filled):
        pdf = svc._generate_vsme_pdf(data, 2026)
        assert pdf[:4] == b'%PDF' and len(pdf) > 2000
