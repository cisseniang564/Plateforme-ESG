"""Les templates sectoriels ne créent plus de valeurs à la place de l'entreprise."""
import inspect

from app.services import template_apply_service as tas


def test_apply_ne_cree_que_des_indicateurs():
    src = inspect.getsource(tas.TemplateApplyService.apply)
    assert "DataEntry(" not in src
    assert "IndicatorData(" not in src
    assert "value" not in src.split('"""')[-1].replace("values", "")


def test_apercu_sans_valeur():
    src = inspect.getsource(tas.TemplateApplyService.preview)
    assert '"value"' not in src


def test_nettoyage_ne_touche_que_les_valeurs_de_template():
    src = inspect.getsource(tas.TemplateApplyService.revert)
    assert 'collection_method == "template_apply"' in src
    assert 'source.like("Template sectoriel%")' in src
