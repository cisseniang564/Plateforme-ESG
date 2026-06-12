"""
Email unsubscribe endpoint — minimal RFC 8058 / CAN-SPAM compliance.

Honours:
- GET  /unsubscribe?email=<addr>     (user-facing link in email footer)
- POST /unsubscribe                  (one-click from mail clients, body: email=<addr>)

Stores the opt-out flag in tenant.settings.email_opt_out — non-destructive,
no migration needed (settings is an existing JSON column).
The application email service should read this flag before dispatching
non-transactional emails. Transactional (password reset, payment receipt)
should still go through for legal/security reasons.
"""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, Form, HTTPException, Request, status
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.tenant import Tenant
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter()


async def _mark_opted_out(db: AsyncSession, email: str) -> bool:
    """Mark the tenant (via this user's tenant_id) as opted out from marketing emails.
    Returns True on success; False if user not found (silently — never leak)."""
    norm = (email or "").strip().lower()
    if not norm:
        return False
    try:
        result = await db.execute(select(User).where(User.email == norm))
        user = result.scalar_one_or_none()
        if not user:
            return False
        tenant = await db.get(Tenant, user.tenant_id)
        if not tenant:
            return False
        # Merge into existing settings JSON
        settings = dict(tenant.settings or {})
        opt_out = dict(settings.get("email_opt_out", {}))
        opt_out["marketing"] = True
        opt_out["unsubscribed_email"] = norm
        from datetime import datetime, timezone
        opt_out["unsubscribed_at"] = datetime.now(timezone.utc).isoformat()
        settings["email_opt_out"] = opt_out
        tenant.settings = settings
        await db.commit()
        logger.info("Email opt-out recorded for %s (tenant=%s)", norm, tenant.id)
        return True
    except Exception as exc:
        logger.warning("Unsubscribe failed for %s: %s", norm, exc)
        return False


def _confirmation_page(email: str, success: bool) -> str:
    """Plain HTML response — no React/JS required, works in any client."""
    msg_ok = (
        "<h1 style='color:#10b981'>Désabonnement confirmé</h1>"
        f"<p>L'adresse <strong>{email}</strong> ne recevra plus d'emails marketing de ESG Flow. "
        "Vous continuerez à recevoir les emails strictement nécessaires (réinitialisation de "
        "mot de passe, factures, sécurité du compte).</p>"
    )
    msg_ko = (
        "<h1 style='color:#dc2626'>Demande enregistrée</h1>"
        "<p>Si une adresse correspond à un compte ESG Flow, elle sera désabonnée. "
        "Pour toute question, contactez "
        "<a href='mailto:support@greenconnect.cloud'>support@greenconnect.cloud</a>.</p>"
    )
    return f"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Désabonnement — ESG Flow</title>
<style>
  body {{ margin:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif;
         background:#f8fafc; color:#0f172a; padding: 48px 16px; }}
  .card {{ max-width:520px; margin:48px auto; background:#fff; padding:32px;
           border-radius:16px; box-shadow:0 4px 20px rgba(0,0,0,0.08); }}
  h1 {{ font-size:22px; margin:0 0 12px 0; }}
  p {{ font-size:15px; line-height:1.6; color:#475569; }}
  a.btn {{ display:inline-block; margin-top:16px; padding:10px 20px;
           background:#10b981; color:#fff; border-radius:10px;
           text-decoration:none; font-weight:600; font-size:14px; }}
  .logo {{ font-weight:800; font-size:18px; letter-spacing:-0.5px; margin-bottom:24px; color:#0f172a; }}
  .logo span {{ color:#10b981; }}
</style>
</head>
<body>
<div class="card">
  <div class="logo">ESG<span> FLOW</span></div>
  {msg_ok if success else msg_ko}
  <a class="btn" href="https://greenconnect.cloud">Retour au site</a>
</div>
</body>
</html>"""


@router.get("/unsubscribe", include_in_schema=False)
async def unsubscribe_get(
    email: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
) -> HTMLResponse:
    """User-facing unsubscribe link from the email footer."""
    if not email:
        return HTMLResponse(_confirmation_page("", False), status_code=200)
    success = await _mark_opted_out(db, email)
    return HTMLResponse(_confirmation_page(email, success), status_code=200)


@router.post("/unsubscribe", include_in_schema=False)
async def unsubscribe_post(
    request: Request,
    email: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
) -> HTMLResponse:
    """One-click unsubscribe (RFC 8058) — triggered by mail clients (Gmail, Apple Mail).

    Accepts the address from the form (Resend usually replays it), or, when the
    client just POSTs with no body, recovers it from the query string.
    """
    if not email:
        email = request.query_params.get("email")
    if email:
        await _mark_opted_out(db, email)
    # RFC 8058 expects 2xx with empty/minimal body
    return HTMLResponse("OK", status_code=200)
