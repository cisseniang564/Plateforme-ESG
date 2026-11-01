"""
Rapports planifiés : règles d'échéance (pures, sans réseau ni base, donc testables).

Les calendriers sont enregistrés par l'API (``/reports/scheduled``) ; la tâche
``reports.dispatch_scheduled`` s'appuie sur ces fonctions pour décider quoi générer.
"""
from __future__ import annotations

import calendar
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional


def _add_months(dt: datetime, months: int) -> datetime:
    """Même jour du mois suivant (ramené au dernier jour si le mois est plus court)."""
    month_index = dt.month - 1 + months
    year = dt.year + month_index // 12
    month = month_index % 12 + 1
    day = min(dt.day, calendar.monthrange(year, month)[1])
    return dt.replace(year=year, month=month, day=day)


def _parse(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", ""))
    except ValueError:
        return None


def next_run_after(schedule: Dict[str, Any], previous_run: datetime) -> datetime:
    """Prochaine échéance après ``previous_run`` selon la fréquence (heure du jour conservée)."""
    freq = schedule.get("frequency", "monthly")
    if freq == "daily":
        return previous_run + timedelta(days=1)
    if freq == "weekly":
        return previous_run + timedelta(weeks=1)
    if freq == "quarterly":
        return _add_months(previous_run, 3)
    return _add_months(previous_run, 1)  # monthly, et valeur par défaut


def is_due(schedule: Dict[str, Any], now: datetime) -> bool:
    """Vrai si le rapport est actif, échu, et non terminé (end_date)."""
    if schedule.get("status", "active") != "active":
        return False
    due_at = _parse(schedule.get("next_run"))
    if due_at is None or due_at > now:
        return False
    end = _parse(schedule.get("end_date"))
    if end is not None and now.date() > end.date():
        return False
    return True


def mark_run(schedule: Dict[str, Any], now: datetime, ok: bool, detail: str = "") -> Dict[str, Any]:
    """Copie du calendrier mise à jour après une exécution (succès ou échec)."""
    updated = dict(schedule)
    due_at = _parse(schedule.get("next_run")) or now
    # On rattrape le retard sans rejouer les exécutions manquées : une seule génération par passage.
    nxt = next_run_after(schedule, due_at)
    while nxt <= now:
        nxt = next_run_after(schedule, nxt)
    updated["next_run"] = nxt.isoformat()
    updated["last_run"] = now.isoformat()
    updated["last_status"] = "ok" if ok else "error"
    updated["last_detail"] = detail[:200]
    end = _parse(schedule.get("end_date"))
    if end is not None and nxt.date() > end.date():
        updated["status"] = "completed"
    return updated


def due_schedules(schedules: List[Dict[str, Any]], now: datetime) -> List[Dict[str, Any]]:
    return [s for s in schedules if is_due(s, now)]
