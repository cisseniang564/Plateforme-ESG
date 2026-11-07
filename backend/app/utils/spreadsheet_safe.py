"""Neutralisation de l'injection de formules (CSV / Excel).

Un texte qui commence par = + - @ (ou tabulation / retour chariot) est interprété comme une formule par
Excel et LibreOffice. Les exports contiennent des champs libres (notes, nom d'indicateur, texte d'un
questionnaire client importé…) : on les préfixe d'une apostrophe pour qu'ils restent du texte.
"""
from typing import Any

_DANGEROUS_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def safe_cell(value: Any) -> Any:
    """Renvoie la valeur inchangée, sauf pour une chaîne à risque qui est préfixée de « ' »."""
    if isinstance(value, str) and value.startswith(_DANGEROUS_PREFIXES):
        return "'" + value
    return value
