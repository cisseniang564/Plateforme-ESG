"""Garde-fous sur la collecte : saisie manuelle, import de fichier, validation."""
from datetime import date
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1] / "app"
ENTRY = (ROOT / "api/v1/endpoints/data_entry.py").read_text()
IMPORT_API = (ROOT / "api/v1/endpoints/esg_import.py").read_text()
IMPORT_SVC = (ROOT / "services/esg_data_import_service.py").read_text()
VALIDATION = (ROOT / "api/v1/endpoints/data_validation.py").read_text()
FEC = (ROOT / "api/v1/endpoints/sage_cegid.py").read_text()


def test_ecritures_reservees_aux_contributeurs():
    assert ENTRY.count("require_any_role(*Roles.ENTRY_OR_ABOVE)") == 3      # create, update, delete
    assert IMPORT_API.count("require_any_role(*Roles.ENTRY_OR_ABOVE)") == 2  # preview, import
    assert "require_any_role(*Roles.ENTRY_OR_ABOVE)" in FEC
    assert "require_any_role(*Roles.MANAGER_OR_ABOVE)" in VALIDATION         # validation en lot


def test_zero_est_une_valeur_valide():
    assert "if not entry.value_numeric and not entry.value_text" not in ENTRY
    assert "entry.value_numeric is None" in ENTRY
    assert "db_entry.value_numeric or db_entry.value_text" not in ENTRY


def test_pas_de_promesse_de_revocation_ni_de_norme():
    for src in (ENTRY, VALIDATION):
        assert "révoquer la vérification" not in src
    assert '"standard":  "ISAE 3000' not in VALIDATION
    assert "modalités allégées" not in VALIDATION


def test_rejet_exige_un_motif_et_un_role_de_controle():
    assert "Indiquez le motif du rejet." in VALIDATION
    assert "Roles.MANAGER_OR_ABOVE" in VALIDATION


def test_import_protege_contre_le_double_envoi_et_les_fuites():
    assert "AlreadyImportedError" in IMPORT_SVC and "status_code=409" in IMPORT_API
    assert "status_code=404" in IMPORT_API
    assert 'raise ValueError("Upload not found")' not in IMPORT_SVC
    assert "'error': str(exc)" not in IMPORT_SVC          # pas d'erreur SQL brute côté client
    assert "'error_details':           res.get('errors_detail'" in IMPORT_SVC   # clé lue par le front
    assert "'row': 'all', 'error': str(exc)" not in IMPORT_SVC
    assert "'intent':" in IMPORT_API


def test_import_trace_dans_la_chaine_d_audit():
    assert "_audit_import" in IMPORT_SVC and "log_change(" in IMPORT_SVC
    assert "self.db.add(AuditLog(" not in IMPORT_SVC      # plus d'entrée non scellée
    assert "log_change(" in FEC


def test_export_reprend_les_filtres_de_la_liste():
    export = ENTRY[ENTRY.index('@router.get("/export")'):]
    assert "search: Optional[str]" in export and "collection_method: Optional[str]" in export


def test_schema_de_saisie():
    try:
        from app.api.v1.endpoints.data_entry import DataEntryCreate
    except Exception as exc:  # environnement local sans configuration complète
        pytest.skip(f"module non importable ici : {exc}")
    base = dict(period_start=date(2025, 1, 1), period_end=date(2025, 12, 31),
                pillar="Environmental", category="energy", metric_name="  kWh ")
    ok = DataEntryCreate(**base, value_numeric=0)
    assert ok.pillar == "environmental" and ok.metric_name == "kWh" and ok.value_numeric == 0
    with pytest.raises(Exception):
        DataEntryCreate(**{**base, "pillar": "env"})
    with pytest.raises(Exception):
        DataEntryCreate(**{**base, "period_end": date(2024, 1, 1)})
    with pytest.raises(Exception):
        DataEntryCreate(**{**base, "metric_name": "   "})
