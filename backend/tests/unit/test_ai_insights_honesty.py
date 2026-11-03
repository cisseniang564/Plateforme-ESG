"""Les recommandations ne promettent plus de score : plus de total « +40 pts » ni de projection à 100/100."""
import inspect

from app.api.v1.endpoints import ai_insights


def test_plus_de_total_de_gain_additionne():
    src = inspect.getsource(ai_insights)
    assert "total_gain_est" not in src          # ni la variable, ni le champ de réponse
    assert "gain_is_indicative" in src


def test_les_gains_par_action_restent_des_ordres_de_grandeur_fixes():
    recos = ai_insights._generate_recommendations(40.0, 40.0, 40.0, 10)
    assert recos, "avec des scores faibles, des recommandations sont attendues"
    assert all(isinstance(r["score_gain_est"], int) and r["score_gain_est"] > 0 for r in recos)
    # Preuve qu'additionner n'a pas de sens : la somme dépasse largement ce qu'un score peut gagner.
    assert sum(r["score_gain_est"] for r in recos) > 40
