"""
Audit Chain Service — SHA-256 hash chain for the audit trail.

Each AuditLog entry's `entry_hash` is computed from a canonical representation
of its content plus the `previous_hash` (the hash of the previous entry in the
same tenant's chain). This produces an append-only chain where any modification
of a past entry breaks the chain downstream and is detectable via verification.

Design notes
------------
* One independent chain per tenant — multi-tenant safe.
* Genesis: the very first entry of a tenant has `previous_hash = None`.
* Canonical serialization uses sorted keys, ISO-8601 UTC, no whitespace.
* Hash format: lowercase hex SHA-256 (64 chars).
* This service does NOT replace the existing audit_service.log_change() —
  it is called by it transparently to compute the chain values.

Verification can be done via /audit-trail/verify which recomputes every hash
and ensures the chain is intact.
"""
from __future__ import annotations

import hashlib
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple
from uuid import UUID

from sqlalchemy import select, desc, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog

logger = logging.getLogger(__name__)

# Genesis hash sentinel — used in canonical hashing when previous_hash is NULL.
# Choosing a fixed string (rather than None or empty) avoids ambiguity in JSON
# serialization and makes the genesis entry's hash deterministic.
GENESIS_PREVIOUS_HASH = "0" * 64


def _to_serializable(value: Any) -> Any:
    """Recursively convert UUIDs, datetimes, and sets so json.dumps accepts them."""
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, datetime):
        # Always normalize to UTC ISO-8601 to make hashing deterministic across
        # timezones and serializations.
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc).isoformat()
    if isinstance(value, dict):
        return {k: _to_serializable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_to_serializable(v) for v in value]
    if isinstance(value, set):
        return sorted(_to_serializable(v) for v in value)
    # Fallback — stringify exotic types (Enum, Decimal, etc.) deterministically.
    return str(value)


def _canonical_payload(entry: AuditLog, previous_hash: Optional[str]) -> str:
    """
    Build a deterministic JSON string from an AuditLog row + the previous hash.

    This is the EXACT string that gets fed into SHA-256. Any change to its
    structure invalidates all downstream hashes — so the schema is fixed.
    """
    # `id` is included so that two otherwise identical entries (same tenant,
    # same entity, same action, same timestamp) still produce different hashes.
    # `created_at` is included so that re-ordering rows breaks the chain.
    payload: Dict[str, Any] = {
        "id": str(entry.id) if entry.id else None,
        "tenant_id": str(entry.tenant_id) if entry.tenant_id else None,
        "entity_type": entry.entity_type,
        "entity_id": str(entry.entity_id) if entry.entity_id else None,
        "action": entry.action,
        "user_id": str(entry.user_id) if entry.user_id else None,
        "user_email": entry.user_email,
        "old_values": _to_serializable(entry.old_values),
        "new_values": _to_serializable(entry.new_values),
        "change_reason": entry.change_reason,
        "ip_address": entry.ip_address,
        "user_agent": entry.user_agent,
        "entry_metadata": _to_serializable(entry.entry_metadata),
        "created_at": _to_serializable(entry.created_at),
        "previous_hash": previous_hash or GENESIS_PREVIOUS_HASH,
    }
    # sort_keys=True + separators=(',', ':') → canonical, no whitespace.
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def compute_entry_hash(entry: AuditLog, previous_hash: Optional[str]) -> str:
    """Compute the SHA-256 hex digest of an AuditLog entry."""
    canonical = _canonical_payload(entry, previous_hash)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


async def get_latest_hash(db: AsyncSession, tenant_id: UUID) -> Optional[str]:
    """
    Return the `entry_hash` of the most recent AuditLog entry for *tenant_id*.

    Returns None if the tenant has no audit entries yet (next entry will be
    the genesis of its chain).
    """
    stmt = (
        select(AuditLog.entry_hash)
        .where(AuditLog.tenant_id == tenant_id)
        .where(AuditLog.entry_hash.is_not(None))
        .order_by(desc(AuditLog.created_at), desc(AuditLog.id))
        .limit(1)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def seal_entry(db: AsyncSession, entry: AuditLog) -> AuditLog:
    """
    Compute and attach `entry_hash` + `previous_hash` to *entry*.

    Call this AFTER the entry has been added to the session (so it has an id
    and a created_at), but BEFORE the final commit. The caller is responsible
    for committing.

    Idempotent: if the entry already has an `entry_hash`, it is left untouched.
    """
    if entry.entry_hash:
        return entry

    if not entry.tenant_id:
        # Defensive — we cannot chain entries without a tenant.
        logger.warning("seal_entry called on entry without tenant_id (id=%s)", entry.id)
        return entry

    # Sérialise les scellements concurrents d'un même tenant : sans verrou, deux
    # écritures simultanées lisent le même « dernier hash » et créent une
    # fourche, que la vérification signalerait ensuite à tort comme une
    # altération. Le verrou est relâché au commit/rollback de la transaction.
    try:
        await db.execute(
            text("SELECT pg_advisory_xact_lock(hashtextextended(:k, 0))"),
            {"k": f"audit_chain:{entry.tenant_id}"},
        )
    except Exception as exc:  # base non-PostgreSQL (tests) : pas de verrou
        logger.debug("advisory lock indisponible : %s", exc)

    previous_hash = await get_latest_hash(db, entry.tenant_id)
    # created_at vaut NOW() = début de la transaction : une transaction longue
    # peut donc porter une date antérieure à une entrée déjà scellée, ce qui
    # inverserait l'ordre de la chaîne. Sous le verrou, on date l'entrée à
    # l'instant du scellement pour que l'ordre chronologique = l'ordre de chaîne.
    entry.created_at = datetime.now(timezone.utc)
    # L'entrée vient d'être flushée : elle est elle-même sans hash, donc exclue
    # de get_latest_hash (entry_hash IS NOT NULL).
    entry.previous_hash = previous_hash  # may be None for genesis
    entry.entry_hash = compute_entry_hash(entry, previous_hash)
    return entry


# ─── Verification ────────────────────────────────────────────────────────────


async def verify_chain(
    db: AsyncSession,
    tenant_id: UUID,
    limit: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Walk the tenant's audit chain in chronological order and verify integrity.

    For each entry we recompute the SHA-256 from its current content + the
    previous entry's stored hash. A mismatch means either:
      * the entry's content was tampered with after creation, or
      * an entry was inserted/deleted between two existing entries.

    Returns a structured report:
        {
            "tenant_id": "...",
            "checked": 1234,
            "valid": 1233,
            "invalid": 1,
            "first_broken_at": "2026-05-27T12:34:56+00:00",
            "first_broken_id": "...",
            "is_valid": False,
            "checked_at": "...",
        }

    If *limit* is given, only the most recent N entries are walked (from oldest
    to newest within that window) — useful for quick health checks.
    """
    stmt = (
        select(AuditLog)
        .where(AuditLog.tenant_id == tenant_id)
        .order_by(AuditLog.created_at.asc(), AuditLog.id.asc())
    )
    if limit:
        # Take the most-recent N then re-sort ascending below.
        stmt = (
            select(AuditLog)
            .where(AuditLog.tenant_id == tenant_id)
            .order_by(desc(AuditLog.created_at), desc(AuditLog.id))
            .limit(limit)
        )

    result = await db.execute(stmt)
    rows = list(result.scalars().all())
    if limit:
        rows.reverse()  # back to chronological order

    checked = 0       # entrées scellées effectivement vérifiées
    unsealed = 0      # entrées sans empreinte (antérieures à la chaîne)
    invalid = 0
    first_broken_id: Optional[str] = None
    first_broken_at: Optional[str] = None

    def _mark_broken(entry: AuditLog) -> None:
        nonlocal invalid, first_broken_id, first_broken_at
        invalid += 1
        if first_broken_id is None:
            first_broken_id = str(entry.id)
            first_broken_at = entry.created_at.isoformat() if entry.created_at else None

    previous_hash: Optional[str] = None
    is_first_sealed = True
    for entry in rows:
        # Entrées antérieures au déploiement de la chaîne : comptées à part,
        # elles ne sont ni « valides » ni « invalides » (voir backfill_chain()).
        if entry.entry_hash is None:
            unsealed += 1
            continue

        checked += 1

        # Fenêtre partielle (limit) : le premier maillon n'a pas de prédécesseur
        # dans la fenêtre, on ne peut contrôler que son propre hash.
        if not (limit and is_first_sealed):
            if (entry.previous_hash or None) != (previous_hash or None):
                _mark_broken(entry)
                previous_hash = entry.entry_hash
                is_first_sealed = False
                continue
        is_first_sealed = False

        if compute_entry_hash(entry, entry.previous_hash) != entry.entry_hash:
            _mark_broken(entry)

        previous_hash = entry.entry_hash

    return {
        "tenant_id": str(tenant_id),
        "checked": checked,
        "valid": checked - invalid,
        "invalid": invalid,
        "unsealed": unsealed,
        "partial": bool(limit),
        "is_valid": invalid == 0 and checked > 0,
        "first_broken_id": first_broken_id,
        "first_broken_at": first_broken_at,
        "checked_at": datetime.now(timezone.utc).isoformat(),
        # Limite connue de toute chaîne de hachage : la suppression des toutes
        # dernières entrées n'est pas détectable sans ancrage externe.
        "limitations": "Détecte la modification ou la suppression d'une entrée antérieure ; "
                       "ne détecte pas la suppression des dernières entrées sans ancrage externe.",
    }


# ─── One-time backfill ──────────────────────────────────────────────────────


async def backfill_chain(
    db: AsyncSession,
    tenant_id: UUID,
    batch_size: int = 500,
) -> Tuple[int, int]:
    """
    Compute and persist hashes for legacy entries that pre-date the chain.

    Returns (processed, skipped). Idempotent: entries that already have a
    hash are not touched. Walks in chronological order so the chain is
    built correctly.

    The caller is responsible for committing.
    """
    stmt = (
        select(AuditLog)
        .where(AuditLog.tenant_id == tenant_id)
        .order_by(AuditLog.created_at.asc(), AuditLog.id.asc())
    )
    result = await db.execute(stmt)
    rows = list(result.scalars().all())

    processed = 0
    skipped = 0
    previous_hash: Optional[str] = None

    for i, entry in enumerate(rows):
        if entry.entry_hash:
            # Already sealed — preserve and continue.
            previous_hash = entry.entry_hash
            skipped += 1
            continue

        entry.previous_hash = previous_hash
        entry.entry_hash = compute_entry_hash(entry, previous_hash)
        previous_hash = entry.entry_hash
        processed += 1

        # Periodic flush to avoid huge in-memory sessions on big chains.
        if batch_size and (i + 1) % batch_size == 0:
            await db.flush()

    if processed:
        await db.flush()

    return processed, skipped
