"""
Validation datée de la matrice de double matérialité.

Quand la direction valide la matrice, on garde une copie figée des enjeux (« snapshot ») avec
une empreinte SHA-256. Les fonctions de ce module sont pures : elles ne touchent pas à la base.
"""
import hashlib
import json
from typing import Any, Dict, Iterable, List

# Seuil de matérialité appliqué par l'API (0-100) : un enjeu est matériel s'il dépasse ce seuil sur l'un des deux axes.
MATERIALITY_THRESHOLD = 60.0

# Champs d'un enjeu conservés dans la copie figée, et comparés pour détecter une modification.
SNAPSHOT_FIELDS = (
    "name", "category", "financial_impact", "esg_impact", "is_material", "esrs_topic", "iro_type",
    "iro_actual_or_potential", "time_horizon", "value_chain", "stakeholders", "rationale",
)


def snapshot_issues(issues: Iterable[Any]) -> List[Dict[str, Any]]:
    """Copie figée des enjeux (objets ORM ou dictionnaires), triée de façon stable."""
    out: List[Dict[str, Any]] = []
    for i in issues:
        get = (lambda k, i=i: i.get(k)) if isinstance(i, dict) else (lambda k, i=i: getattr(i, k, None))
        row = {"id": str(get("id"))}
        for f in SNAPSHOT_FIELDS:
            v = get(f)
            row[f] = float(v) if f in ("financial_impact", "esg_impact") and v is not None else v
        out.append(row)
    return sorted(out, key=lambda r: (str(r["name"]).lower(), r["id"]))


def snapshot_hash(snapshot: List[Dict[str, Any]]) -> str:
    """Empreinte SHA-256 de la copie figée : toute modification ultérieure du contenu la change."""
    canonical = json.dumps(snapshot, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def diff_snapshots(validated: List[Dict[str, Any]], current: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Ce qui a changé entre la dernière validation et l'état actuel de la matrice."""
    old = {r["id"]: r for r in validated}
    new = {r["id"]: r for r in current}
    added = [{"id": k, "name": new[k]["name"]} for k in new if k not in old]
    removed = [{"id": k, "name": old[k]["name"]} for k in old if k not in new]
    modified = []
    for k in new:
        if k in old:
            fields = [f for f in SNAPSHOT_FIELDS if old[k].get(f) != new[k].get(f)]
            if fields:
                modified.append({"id": k, "name": new[k]["name"], "fields": fields})
    return {
        "added": added, "removed": removed, "modified": modified,
        "total": len(added) + len(removed) + len(modified),
    }
