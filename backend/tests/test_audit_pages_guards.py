"""Garde-fous statiques sur la piste d'audit et les revues d'auditeur."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "app"
REVIEWS = (ROOT / "api/v1/endpoints/auditor_reviews.py").read_text()
TRAIL = (ROOT / "api/v1/endpoints/audit_trail.py").read_text()
CHAIN = (ROOT / "services/audit_chain_service.py").read_text()


def test_decision_ne_revendique_ni_isae_ni_csrd():
    assert "ISAE 3000 § 51" not in REVIEWS
    assert "Art. 29a" not in REVIEWS
    assert "Signature électronique auditeur" not in REVIEWS


def test_endpoints_tenant_proteges_par_role():
    # create / list / lock : manager+ ; delete : admin+
    assert REVIEWS.count("require_any_role(*Roles.MANAGER_OR_ABOVE)") >= 3
    assert "require_any_role(*Roles.ADMIN_OR_ABOVE)" in REVIEWS
    assert "Depends(get_current_user)" not in REVIEWS


def test_erreur_interne_non_exposee_au_telechargement():
    assert 'f"Génération impossible' not in REVIEWS


def test_depot_de_pieces_desactive():
    assert "/tmp/esgflow_evidence" not in REVIEWS
    assert "status_code=501" in REVIEWS


def test_decision_et_invitation_tracees():
    assert '"auditor_decision"' in REVIEWS
    assert '"invite"' in REVIEWS


def test_verrou_consultatif_dans_le_scellement():
    assert "pg_advisory_xact_lock" in CHAIN


def test_verify_expose_les_entrees_non_scellees_et_les_limites():
    assert '"unsealed"' in CHAIN and '"limitations"' in CHAIN


def test_recherche_et_export_branches():
    assert "_apply_filters" in TRAIL
    assert '"/export"' in TRAIL
    assert "_csv_cell" in TRAIL


def test_csv_neutralise_les_formules():
    import re
    assert re.search(r'in \("=", "\+", "-", "@"', TRAIL)
