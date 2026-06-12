"""
Email tasks — async wrappers around EmailService.
All tasks use auto-retry with exponential backoff.
"""
from __future__ import annotations

import logging
from typing import Optional

from celery import shared_task
from celery.utils.log import get_task_logger

logger = get_task_logger(__name__)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _email_svc():
    from app.services.email_service import EmailService
    return EmailService


# ─── Tasks ────────────────────────────────────────────────────────────────────

@shared_task(
    name="email.send_welcome",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=300,
)
def send_welcome_email(self, email: str, first_name: str, company: str) -> bool:
    """Send welcome email after registration."""
    logger.info("Sending welcome email to %s", email)
    result = _email_svc().send_welcome(email, first_name, company)
    if not result:
        raise self.retry(countdown=60 * (self.request.retries + 1))
    return result


@shared_task(
    name="email.send_password_reset",
    bind=True,
    max_retries=3,
    default_retry_delay=30,
)
def send_password_reset_email(self, email: str, first_name: str, reset_url: str) -> bool:
    """Send password reset email."""
    logger.info("Sending password reset to %s", email)
    result = _email_svc().send_password_reset(email, first_name, reset_url)
    if not result:
        raise self.retry(countdown=30)
    return result


@shared_task(
    name="email.send_email_verification",
    bind=True,
    max_retries=3,
    default_retry_delay=30,
)
def send_email_verification(self, email: str, first_name: str, verify_url: str) -> bool:
    """Send email verification link."""
    logger.info("Sending email verification to %s", email)
    result = _email_svc().send_email_verification(email, first_name, verify_url)
    if not result:
        raise self.retry(countdown=30)
    return result


@shared_task(
    name="email.send_user_invited",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def send_user_invited_email(
    self, email: str, inviter_name: str, company: str, invite_url: str
) -> bool:
    """Send invitation email to a new user."""
    logger.info("Sending invitation to %s from %s", email, inviter_name)
    result = _email_svc().send_user_invited(email, inviter_name, company, invite_url)
    if not result:
        raise self.retry(countdown=60)
    return result


@shared_task(
    name="email.send_trial_ending_soon",
    bind=True,
    max_retries=2,
    default_retry_delay=300,
)
def send_trial_ending_soon_email(self, email: str, first_name: str, days_left: int) -> bool:
    """Notify user that their trial is ending."""
    logger.info("Trial ending soon email to %s (%d days left)", email, days_left)
    result = _email_svc().send_trial_ending_soon(email, first_name, days_left)
    if not result:
        raise self.retry(countdown=300)
    return result


@shared_task(
    name="email.send_payment_failed",
    bind=True,
    max_retries=3,
    default_retry_delay=120,
)
def send_payment_failed_email(
    self, email: str, first_name: str, amount: str, retry_date: Optional[str] = None
) -> bool:
    """Notify user of a failed payment."""
    logger.info("Payment failed email to %s", email)
    result = _email_svc().send_payment_failed(email, first_name, amount, retry_date)
    if not result:
        raise self.retry(countdown=120)
    return result


@shared_task(
    name="email.send_trial_started",
    bind=True,
    max_retries=2,
    default_retry_delay=60,
)
def send_trial_started_email(
    self, email: str, first_name: str, company: str, trial_end: str
) -> bool:
    """Send trial started confirmation email."""
    logger.info("Trial started email to %s", email)
    result = _email_svc().send_trial_started(email, first_name, company, trial_end)
    if not result:
        raise self.retry(countdown=60)
    return result


@shared_task(
    name="email.send_subscription_activated",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def send_subscription_activated_email(
    self, email: str, first_name: str, plan_name: str, amount: str, next_date: str
) -> bool:
    """Notify user that their subscription was activated."""
    logger.info("Subscription activated email to %s (plan=%s)", email, plan_name)
    result = _email_svc().send_subscription_activated(email, first_name, plan_name, amount, next_date)
    if not result:
        raise self.retry(countdown=60)
    return result


@shared_task(
    name="email.send_subscription_canceled",
    bind=True,
    max_retries=2,
    default_retry_delay=120,
)
def send_subscription_canceled_email(
    self, email: str, first_name: str, plan_name: str, end_date: str
) -> bool:
    """Notify user that their subscription was canceled."""
    logger.info("Subscription canceled email to %s", email)
    result = _email_svc().send_subscription_canceled(email, first_name, plan_name, end_date)
    if not result:
        raise self.retry(countdown=120)
    return result


@shared_task(
    name="email.send_invoice_paid",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def send_invoice_paid_email(
    self, email: str, first_name: str, amount: str, invoice_url: str, invoice_number: str
) -> bool:
    """Send invoice paid confirmation email."""
    logger.info("Invoice paid email to %s (%s)", email, invoice_number)
    result = _email_svc().send_invoice_paid(email, first_name, amount, invoice_url, invoice_number)
    if not result:
        raise self.retry(countdown=60)
    return result


# ─── Auditor workflow ─────────────────────────────────────────────────────────

@shared_task(
    name="email.send_auditor_invitation",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def send_auditor_invitation(
    self,
    email: str,
    name: str,
    firm: Optional[str],
    organization_name: str,
    review_url: str,
    expires_at: Optional[str],
) -> bool:
    """Notify an external auditor that they have been invited to review a CSRD report."""
    logger.info("Sending auditor invitation to %s", email)
    firm_line = f" ({firm})" if firm else ""
    expires_line = (
        f"<p style='color:#64748b;font-size:13px;margin-top:8px'>Lien valable jusqu'au "
        f"<strong>{expires_at[:10]}</strong>.</p>"
        if expires_at else ""
    )
    html = f"""<!doctype html>
<html><body style="margin:0;padding:24px;background:#f9fafb;font-family:system-ui,-apple-system,sans-serif">
<div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.08)">
  <span style="display:inline-block;padding:4px 12px;background:#ecfdf5;color:#047857;border-radius:20px;font-size:12px;font-weight:700">REVUE D'AUDIT CSRD</span>
  <h1 style="font-size:22px;color:#0f172a;margin:16px 0 8px">Bonjour {name}{firm_line},</h1>
  <p style="color:#475569;font-size:15px;line-height:1.6">
    L'organisation <strong>{organization_name}</strong> vous invite à examiner son rapport ESG / CSRD avant publication.
  </p>
  <p style="color:#475569;font-size:15px;line-height:1.6">
    Vous pourrez consulter le rapport, télécharger les pièces, laisser des commentaires section par section
    (information / avertissement / critique), puis émettre votre décision finale.
  </p>
  <div style="text-align:center;margin:28px 0">
    <a href="{review_url}" style="display:inline-block;padding:14px 28px;background:#10b981;color:white;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px">Accéder au rapport</a>
  </div>
  {expires_line}
  <p style="color:#94a3b8;font-size:12px;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:16px">
    Ce lien est unique et personnel — ne le partagez pas. Si vous n'attendiez pas cette invitation, vous pouvez l'ignorer.
  </p>
</div>
</body></html>"""
    result = _email_svc()._send(email, f"Invitation à auditer le rapport ESG de {organization_name}", html)
    if not result:
        raise self.retry(countdown=60)
    return result


@shared_task(
    name="email.send_auditor_decision",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def send_auditor_decision(
    self,
    email: str,
    name: str,
    decision: str,
    auditor_name: str,
    note: str = "",
) -> bool:
    """Notify the inviter that the auditor has approved/rejected the report."""
    logger.info("Sending auditor decision (%s) to %s", decision, email)
    is_approved = decision == "approved"
    badge_color = "#047857" if is_approved else "#b91c1c"
    badge_bg = "#ecfdf5" if is_approved else "#fef2f2"
    title = "✅ Rapport approuvé par l'auditeur" if is_approved else "❌ Rapport rejeté par l'auditeur"
    note_html = (
        f"<div style='background:#f8fafc;border-left:4px solid {badge_color};padding:12px 16px;margin:16px 0;border-radius:6px'>"
        f"<p style='color:#475569;font-size:14px;margin:0;font-style:italic'>« {note} »</p></div>"
        if note else ""
    )
    html = f"""<!doctype html>
<html><body style="margin:0;padding:24px;background:#f9fafb;font-family:system-ui,-apple-system,sans-serif">
<div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.08)">
  <span style="display:inline-block;padding:4px 12px;background:{badge_bg};color:{badge_color};border-radius:20px;font-size:12px;font-weight:700">DÉCISION AUDITEUR</span>
  <h1 style="font-size:22px;color:#0f172a;margin:16px 0 8px">{title}</h1>
  <p style="color:#475569;font-size:15px;line-height:1.6">
    Bonjour {name},<br>
    L'auditeur <strong>{auditor_name}</strong> a {'approuvé' if is_approved else 'rejeté'} la revue de votre rapport.
  </p>
  {note_html}
  <p style="color:#94a3b8;font-size:12px;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:16px">
    Connectez-vous à la plateforme pour consulter les commentaires détaillés et les éventuelles actions à mener.
  </p>
</div>
</body></html>"""
    result = _email_svc()._send(email, title, html)
    if not result:
        raise self.retry(countdown=60)
    return result
