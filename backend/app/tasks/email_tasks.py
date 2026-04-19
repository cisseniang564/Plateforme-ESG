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
