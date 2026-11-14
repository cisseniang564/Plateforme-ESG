"""
Secteurs reconnus par le benchmarking (libellés, codes NAF, normalisation).

ESGFlow ne publie AUCUN quartile ni indicateur de référence « public » : les anciens
chiffres attribués à CDP, MSCI, Refinitiv ou ADEME n'étaient pas vérifiables et sur une
échelle (le score 0-100 d'ESGFlow) qu'aucune de ces sources ne publie. Les comparaisons
reposent uniquement sur des agrégats réels et anonymisés de la plateforme, publiés une
fois le seuil de k-anonymat atteint.
"""
from __future__ import annotations

# Nombre minimal d'organisations pour publier un agrégat (k-anonymat).
MIN_COHORT_SIZE = 5

SECTOR_BASELINES = {
    "tech": {"label": "Tech / Logiciels", "naf_codes": ["62", "63", "58"]},
    "finance": {"label": "Finance / Banque / Assurance", "naf_codes": ["64", "65", "66"]},
    "industry": {"label": "Industrie / Manufacture", "naf_codes": ["10", "11", "12", "13", "14", "15", "16", "17", "18",
                       "19", "20", "21", "22", "23", "24", "25", "26", "27",
                       "28", "29", "30", "31", "32", "33"]},
    "retail": {"label": "Commerce / Retail / Consommation", "naf_codes": ["45", "46", "47"]},
    "construction": {"label": "BTP / Construction / Immobilier", "naf_codes": ["41", "42", "43", "68"]},
    "transport": {"label": "Transport / Logistique", "naf_codes": ["49", "50", "51", "52", "53"]},
    "energy": {"label": "Énergie / Utilities", "naf_codes": ["35", "36"]},
    "healthcare": {"label": "Santé / Pharmacie", "naf_codes": ["86", "87", "21"]},
    "services": {"label": "Services / Conseil", "naf_codes": ["69", "70", "71", "73", "74", "78", "82"]},
    "agriculture": {"label": "Agriculture / Agroalimentaire", "naf_codes": ["01", "02", "03", "10", "11"]},
    "real_estate": {"label": "Immobilier / Foncier", "naf_codes": ["68", "41"]},
    "chemicals": {"label": "Chimie / Pharmacie", "naf_codes": ["20", "21"]},
    "telecoms": {"label": "Télécommunications / Médias", "naf_codes": ["61", "60", "59"]},
    "hospitality": {"label": "Tourisme / Hôtellerie / Restauration", "naf_codes": ["55", "56", "79"]},
    "textile": {"label": "Textile / Mode / Luxe", "naf_codes": ["13", "14", "15"]},
    "default": {"label": "Tous secteurs (référence générale)", "naf_codes": []},
    "default": {"label": "Tous secteurs", "naf_codes": []},
}


def normalize_sector(raw: str) -> str:
    """
    Normalize a free-text sector / industry label to one of our baseline keys.

    Matching is intentionally fuzzy — labels in the wild vary widely
    ("Software", "Tech", "IT services", "Édition de logiciels", etc.).
    """
    if not raw:
        return "default"
    s = raw.lower().strip()

    # NB: keywords must not be common substrings of unrelated words
    # (e.g. "usine" → matches "business", "vente" → "convention"). We use
    # substring matching for FR/EN flexibility, so anchor with discriminating
    # roots only.
    rules = [
        (["tech", "software", "logiciel", "saas", "informat", "digital", "édition"], "tech"),
        (["finance", "bank", "banque", "assur", "insurance", "fintech"],            "finance"),
        (["industr", "manufact", "fabric", "automotive", "automobil"],              "industry"),
        (["retail", "commerc", "distribut", "magasin", "consumer", "supermarch"],   "retail"),
        (["constru", "btp", "bâtim"],                                               "construction"),
        (["immobil", "real estate", "foncier", "property"],                         "real_estate"),
        (["transport", "logistique", "logistic", "fret", "shipping"],               "transport"),
        (["énergie", "energie", "energy", "utilit", "électric", "pétrole"],         "energy"),
        (["santé", "sante", "health", "médical", "biotech", "hôpita"],              "healthcare"),
        (["pharma", "chimie", "chemic", "laborat"],                                 "chemicals"),
        (["agri", "agroaliment", "aliment", "food", "boisson"],                     "agriculture"),
        (["télécom", "telecom", "média", "media", "broadcast"],                     "telecoms"),
        (["hôtel", "hotel", "restaur", "tourism", "tourisme", "héberg"],            "hospitality"),
        (["textile", "mode", "fashion", "luxe", "luxury", "habillem"],              "textile"),
        (["conseil", "consult", "audit", "avocat", "juridiq", "advisory"],          "services"),
    ]
    for keywords, code in rules:
        for kw in keywords:
            if kw in s:
                return code
    return "default"


def get_baseline(sector_key: str) -> dict:
    """Libellé et codes NAF d'un secteur normalisé ; repli sur ``default``."""
    return SECTOR_BASELINES.get(sector_key) or SECTOR_BASELINES["default"]
