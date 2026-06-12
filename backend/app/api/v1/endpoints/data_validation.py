from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, extract
from typing import List, Optional
from datetime import date, datetime, timedelta
from uuid import UUID
from pydantic import BaseModel
import hashlib

from app.dependencies import get_db, get_current_user
from app.models.data_entry import DataEntry
from app.models.audit_log import AuditLog
from app.models.user import User
from app.services.audit_service import log_change

router = APIRouter()

# ============= SCHEMAS =============

class ValidationAction(BaseModel):
    action: str  # verify, reject, flag
    reason: Optional[str] = None

class DataQualityStats(BaseModel):
    total_entries: int
    pending: int
    verified: int
    rejected: int
    flagged: int
    completeness_score: float
    avg_quality_score: float
    entries_with_source: int
    entries_with_attachments: int
    stale_entries: int  # >90 days old

class QualityIssue(BaseModel):
    id: UUID
    metric_name: str
    issue_type: str
    severity: str
    details: str
    created_at: datetime

class BatchValidateResult(BaseModel):
    validated: int
    skipped_self: int
    solo_mode: bool
    total_pending: int

# ============= HELPERS =============

async def _has_other_active_reviewer(db: AsyncSession, tenant_id, user_id) -> bool:
    """True if at least one OTHER active user exists in this tenant.

    Used to determine whether the strict 4-eyes / separation-of-duties rule
    can realistically be enforced. In single-user accounts (most TPE/PME
    tenants today), enforcing it would make the validation pipeline a
    permanent dead-end: nobody could ever verify or reject any entry.
    """
    result = await db.execute(
        select(func.count(User.id)).where(
            User.tenant_id == tenant_id,
            User.id != user_id,
            User.is_active.is_(True),
        )
    )
    return (result.scalar() or 0) > 0


def _sign_and_verify_entry(
    entry: DataEntry,
    current_user: User,
    now: datetime,
    client_ip: Optional[str],
    solo_mode: bool,
) -> str:
    """Mark an entry as verified and attach its CSRD e-signature.

    Returns the SHA-256 signature hash. Mutates ``entry`` in place
    (caller is responsible for committing).
    """
    sig_payload = (
        f"{entry.tenant_id}|{entry.id}|{entry.metric_name}|"
        f"{entry.value_numeric or entry.value_text}|{entry.unit}|"
        f"{current_user.id}|{now.isoformat()}"
    )
    signature = hashlib.sha256(sig_payload.encode("utf-8")).hexdigest()

    entry.verification_status = "verified"
    entry.verified_by = current_user.id
    entry.verified_at = now

    flags = dict(entry.quality_flags or {})
    e_signature = {
        "hash":      signature,
        "signed_by": str(current_user.id),
        "signer_email": current_user.email,
        "signed_at": now.isoformat(),
        "ip":        client_ip,
        "standard":  "ISAE 3000 · CSRD Art. 29a",
        "solo_mode": solo_mode,
    }
    if solo_mode:
        e_signature["note"] = (
            "Validation effectuée en mode mono-utilisateur (TPE) : aucun "
            "second collaborateur actif n'était disponible sur ce compte. "
            "Conformément aux modalités allégées prévues pour les petites "
            "entités, l'auteur de la saisie a procédé lui-même à la "
            "vérification."
        )
    flags["e_signature"] = e_signature
    entry.quality_flags = flags

    return signature

# ============= VALIDATION ENDPOINTS =============

@router.post("/entries/{entry_id}/validate")
async def validate_entry(
    entry_id: UUID,
    validation: ValidationAction,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Validate, reject, or flag a data entry"""
    
    # Get entry
    result = await db.execute(
        select(DataEntry).where(
            DataEntry.id == entry_id,
            DataEntry.tenant_id == current_user.tenant_id
        )
    )
    entry = result.scalar_one_or_none()

    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    # ── Separation of duties ────────────────────────────────────────────
    # The user who created an entry should not self-verify or self-reject it
    # (4-eyes principle, CSRD / ISAE 3000). Flagging is allowed though —
    # raising a concern about your own entry is encouraged.
    #
    # Exception — "mode solo" (TPE) : si AUCUN autre utilisateur actif
    # n'existe dans le compte, bloquer la validation rendrait le pipeline
    # totalement inutilisable (impossible de jamais sortir de "en attente").
    # Dans ce cas, on autorise l'auto-validation et on le trace explicitement
    # dans la signature électronique (voir _sign_and_verify_entry).
    is_own_entry = entry.created_by is not None and entry.created_by == current_user.id
    solo_mode = False
    if validation.action in ("verify", "reject") and is_own_entry:
        has_other_reviewer = await _has_other_active_reviewer(
            db, current_user.tenant_id, current_user.id
        )
        if has_other_reviewer:
            raise HTTPException(
                status_code=403,
                detail=(
                    "Séparation des pouvoirs : vous ne pouvez pas "
                    f"{'vérifier' if validation.action == 'verify' else 'rejeter'} "
                    "une saisie que vous avez créée. Un autre utilisateur de votre "
                    "organisation doit la valider."
                ),
            )
        solo_mode = True

    # ── Block re-verification of locked entries ─────────────────────────
    if (entry.verification_status or "").lower() == "verified" and validation.action != "flag":
        raise HTTPException(
            status_code=403,
            detail=(
                "Cette entrée est déjà vérifiée et verrouillée. "
                "Pour la modifier, un administrateur doit révoquer la vérification."
            ),
        )

    # Store old values for audit
    old_status = entry.verification_status
    now = datetime.utcnow()
    client_ip = request.client.host if request.client else None
    signature = None

    # Update status
    if validation.action == "verify":
        # ── E-signature: SHA-256 cryptographic proof of verification ──
        # Binds the approver, the entry's data, and the timestamp.
        # Re-computable later for legal proof (CSRD Art. 29a, ISAE 3000).
        signature = _sign_and_verify_entry(entry, current_user, now, client_ip, solo_mode)
    elif validation.action == "reject":
        entry.verification_status = "rejected"
        entry.verified_by = current_user.id
        entry.verified_at = now
    elif validation.action == "flag":
        entry.verification_status = "flagged"
        if not entry.quality_flags:
            entry.quality_flags = {}
        flags = dict(entry.quality_flags or {})
        flags["manual_flag"] = {
            "flagged_by": str(current_user.id),
            "reason": validation.reason,
            "flagged_at": now.isoformat()
        }
        entry.quality_flags = flags
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

    await db.commit()

    # Log the validation action — includes signature for auditability
    await log_change(
        db=db,
        tenant_id=current_user.tenant_id,
        entity_type="data_entries",
        entity_id=entry.id,
        action=validation.action,
        user=current_user,
        old_values={"verification_status": old_status},
        new_values={
            "verification_status": entry.verification_status,
            **({"signature_hash": signature} if signature else {}),
        },
        change_reason=validation.reason,
        ip_address=client_ip,
    )

    return {
        "message": f"Entry {validation.action}d successfully",
        "entry_id": entry.id,
        "new_status": entry.verification_status,
        "signature_hash": signature,  # null if not verify
        "solo_mode": solo_mode,
    }

@router.post("/batch-validate", response_model=BatchValidateResult)
async def batch_validate(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Vérifie en un clic toutes les entrées « en attente » du tenant.

    Respecte la séparation des pouvoirs (4-yeux, CSRD Art. 29a) :
    - les entrées créées par UN AUTRE utilisateur sont validées immédiatement ;
    - les entrées créées par l'utilisateur courant ne sont validées QUE si
      aucun autre utilisateur actif n'existe dans le compte (mode solo / TPE).
      Sinon elles sont laissées « en attente » — un collègue doit les valider.

    Les entrées déjà vérifiées, rejetées ou marquées sont ignorées : seules
    les entrées « pending » sont concernées.
    """
    result = await db.execute(
        select(DataEntry).where(
            DataEntry.tenant_id == current_user.tenant_id,
            DataEntry.verification_status == "pending",
        )
    )
    entries = result.scalars().all()
    total_pending = len(entries)

    has_other_reviewer = await _has_other_active_reviewer(
        db, current_user.tenant_id, current_user.id
    )
    solo_mode = not has_other_reviewer

    now = datetime.utcnow()
    client_ip = request.client.host if request.client else None

    validated = 0
    skipped_self = 0

    for entry in entries:
        is_own_entry = entry.created_by is not None and entry.created_by == current_user.id
        if is_own_entry and not solo_mode:
            skipped_self += 1
            continue

        old_status = entry.verification_status
        entry_solo_mode = is_own_entry and solo_mode
        signature = _sign_and_verify_entry(entry, current_user, now, client_ip, entry_solo_mode)
        validated += 1

        await log_change(
            db=db,
            tenant_id=current_user.tenant_id,
            entity_type="data_entries",
            entity_id=entry.id,
            action="verify",
            user=current_user,
            old_values={"verification_status": old_status},
            new_values={
                "verification_status": entry.verification_status,
                "signature_hash": signature,
            },
            change_reason="Validation en lot",
            ip_address=client_ip,
        )

    if validated:
        await db.commit()

    return BatchValidateResult(
        validated=validated,
        skipped_self=skipped_self,
        solo_mode=solo_mode,
        total_pending=total_pending,
    )

@router.get("/quality/stats", response_model=DataQualityStats)
async def get_quality_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get overall data quality statistics"""
    
    # Total entries
    total_result = await db.execute(
        select(func.count(DataEntry.id)).where(
            DataEntry.tenant_id == current_user.tenant_id
        )
    )
    total = total_result.scalar() or 0
    
    if total == 0:
        return DataQualityStats(
            total_entries=0,
            pending=0,
            verified=0,
            rejected=0,
            flagged=0,
            completeness_score=0,
            avg_quality_score=0,
            entries_with_source=0,
            entries_with_attachments=0,
            stale_entries=0
        )
    
    # Count by status
    status_result = await db.execute(
        select(
            DataEntry.verification_status,
            func.count(DataEntry.id)
        ).where(
            DataEntry.tenant_id == current_user.tenant_id
        ).group_by(DataEntry.verification_status)
    )
    status_counts = {row[0]: row[1] for row in status_result}
    
    # Entries with source
    source_result = await db.execute(
        select(func.count(DataEntry.id)).where(
            DataEntry.tenant_id == current_user.tenant_id,
            DataEntry.data_source.isnot(None),
            DataEntry.data_source != ''
        )
    )
    with_source = source_result.scalar() or 0
    
    # Entries with attachments
    attachments_result = await db.execute(
        select(func.count(DataEntry.id)).where(
            DataEntry.tenant_id == current_user.tenant_id,
            DataEntry.attachments.isnot(None)
        )
    )
    with_attachments = attachments_result.scalar() or 0
    
    # Stale entries (>90 days old)
    stale_date = datetime.utcnow() - timedelta(days=90)
    stale_result = await db.execute(
        select(func.count(DataEntry.id)).where(
            DataEntry.tenant_id == current_user.tenant_id,
            DataEntry.created_at < stale_date,
            DataEntry.verification_status == 'pending'
        )
    )
    stale = stale_result.scalar() or 0
    
    # Average quality score
    quality_result = await db.execute(
        select(func.avg(DataEntry.quality_score)).where(
            DataEntry.tenant_id == current_user.tenant_id,
            DataEntry.quality_score.isnot(None)
        )
    )
    avg_quality = quality_result.scalar() or 0
    
    # Completeness score (% with source)
    completeness = (with_source / total * 100) if total > 0 else 0
    
    return DataQualityStats(
        total_entries=total,
        pending=status_counts.get('pending', 0),
        verified=status_counts.get('verified', 0),
        rejected=status_counts.get('rejected', 0),
        flagged=status_counts.get('flagged', 0),
        completeness_score=round(completeness, 2),
        avg_quality_score=round(float(avg_quality), 2),
        entries_with_source=with_source,
        entries_with_attachments=with_attachments,
        stale_entries=stale
    )

@router.get("/quality/anomalies")
async def get_quality_anomalies(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    min_confidence: float = 0.4,
    refresh: bool = False,
):
    """ML-detected anomalies on recent data entries.

    Combines z-score, IQR, isolation forest, magnitude shifts (unit confusion),
    sign flips, and year-over-year deltas. Each finding has a confidence
    score and a human-readable French explanation. Use the ``min_confidence``
    query param to filter low-signal findings.

    Results are cached for 5 minutes per (tenant, params). Pass
    ``refresh=true`` to force a fresh computation.
    """
    from app.services.anomaly_detection_service import detect_anomalies
    anomalies = await detect_anomalies(
        db=db,
        tenant_id=current_user.tenant_id,
        min_confidence=min_confidence,
        use_cache=not refresh,
    )
    sev_counts: dict = {}
    for a in anomalies:
        sev_counts[a.severity] = sev_counts.get(a.severity, 0) + 1
    return {
        "total": len(anomalies),
        "by_severity": sev_counts,
        "anomalies": [a.to_dict() for a in anomalies],
    }


@router.get("/quality/issues", response_model=List[QualityIssue])
async def get_quality_issues(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of data quality issues requiring attention (static rules + ML)."""

    issues = []

    # ── ML-detected anomalies (high & critical only — UI also has dedicated tab) ──
    try:
        from app.services.anomaly_detection_service import detect_anomalies
        anomalies = await detect_anomalies(
            db=db,
            tenant_id=current_user.tenant_id,
            min_confidence=0.5,
        )
        for a in anomalies:
            if a.severity not in ("high", "critical"):
                continue
            try:
                anomaly_entry_id = UUID(a.entry_id)
            except (ValueError, TypeError):
                continue
            issues.append(QualityIssue(
                id=anomaly_entry_id,
                metric_name=a.metric_name,
                issue_type=f"anomaly_{a.anomaly_type}",
                severity=a.severity,
                details=a.reason_fr,
                created_at=datetime.utcnow(),
            ))
    except Exception:
        # Don't let ML failure block the rules-based issues
        pass
    
    # Missing sources
    missing_source = await db.execute(
        select(DataEntry).where(
            DataEntry.tenant_id == current_user.tenant_id,
            DataEntry.verification_status == 'pending',
            or_(
                DataEntry.data_source.is_(None),
                DataEntry.data_source == ''
            )
        ).limit(20)
    )
    
    for entry in missing_source.scalars():
        issues.append(QualityIssue(
            id=entry.id,
            metric_name=entry.metric_name,
            issue_type="missing_source",
            severity="medium",
            details=f"No data source specified for {entry.metric_name}",
            created_at=entry.created_at
        ))
    
    # Stale entries
    stale_date = datetime.utcnow() - timedelta(days=90)
    stale_entries = await db.execute(
        select(DataEntry).where(
            DataEntry.tenant_id == current_user.tenant_id,
            DataEntry.verification_status == 'pending',
            DataEntry.created_at < stale_date
        ).limit(20)
    )
    
    for entry in stale_entries.scalars():
        days_old = (datetime.utcnow() - entry.created_at).days
        issues.append(QualityIssue(
            id=entry.id,
            metric_name=entry.metric_name,
            issue_type="stale",
            severity="high" if days_old > 180 else "medium",
            details=f"Pending validation for {days_old} days",
            created_at=entry.created_at
        ))
    
    # Flagged entries
    flagged = await db.execute(
        select(DataEntry).where(
            DataEntry.tenant_id == current_user.tenant_id,
            DataEntry.verification_status == 'flagged'
        ).limit(20)
    )
    
    for entry in flagged.scalars():
        issues.append(QualityIssue(
            id=entry.id,
            metric_name=entry.metric_name,
            issue_type="flagged",
            severity="high",
            details=f"Flagged for review: {entry.quality_flags.get('manual_flag', {}).get('reason', 'No reason')}",
            created_at=entry.created_at
        ))
    
    return issues

@router.get("/entries/{entry_id}/history")
async def get_entry_history(
    entry_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get complete audit history for a data entry"""
    
    # Verify entry exists and belongs to tenant
    result = await db.execute(
        select(DataEntry).where(
            DataEntry.id == entry_id,
            DataEntry.tenant_id == current_user.tenant_id
        )
    )
    entry = result.scalar_one_or_none()
    
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    # Get audit logs
    logs_result = await db.execute(
        select(AuditLog).where(
            AuditLog.entity_type == "data_entries",
            AuditLog.entity_id == entry_id,
            AuditLog.tenant_id == current_user.tenant_id
        ).order_by(AuditLog.created_at.desc())
    )
    
    logs = logs_result.scalars().all()
    
    return {
        "entry_id": entry_id,
        "metric_name": entry.metric_name,
        "current_status": entry.verification_status,
        "history": [
            {
                "id": log.id,
                "action": log.action,
                "user_email": log.user_email,
                "timestamp": log.created_at,
                "old_values": log.old_values,
                "new_values": log.new_values,
                "reason": log.change_reason
            }
            for log in logs
        ]
    }
