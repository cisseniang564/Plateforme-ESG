"""
Unit tests — Celery email tasks (app.tasks.email_tasks)

Strategy:
  - Celery is forced into *always-eager* mode so tasks run synchronously.
  - _email_svc() is patched to return a MagicMock, so no real HTTP calls.
  - Each test verifies that the task calls the correct EmailService method
    with the correct arguments and returns True on success.
"""
import pytest
from unittest.mock import MagicMock, patch

pytestmark = pytest.mark.unit


# ─── Celery eager-mode fixture ────────────────────────────────────────────────

@pytest.fixture(autouse=True, scope="module")
def celery_eager_mode():
    """Force Celery into always-eager mode for this module."""
    from app.tasks.celery_app import celery_app
    celery_app.conf.update(
        task_always_eager=True,
        task_eager_propagates=True,
    )
    yield
    celery_app.conf.update(
        task_always_eager=False,
        task_eager_propagates=False,
    )


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _make_svc(success: bool = True):
    """Return a mock EmailService class with all methods returning `success`."""
    svc = MagicMock()
    for method in (
        "send_welcome", "send_password_reset", "send_email_verification",
        "send_user_invited", "send_trial_ending_soon", "send_payment_failed",
        "send_trial_started", "send_subscription_activated",
        "send_subscription_canceled", "send_invoice_paid",
    ):
        getattr(svc, method).return_value = success
    return svc


def _run(task, svc, **kwargs):
    """Patch _email_svc, apply task synchronously, return EagerResult."""
    from app.tasks import email_tasks
    with patch.object(email_tasks, "_email_svc", return_value=svc):
        return task.apply(kwargs=kwargs)


# ─── send_welcome_email ───────────────────────────────────────────────────────

class TestSendWelcomeEmail:

    def test_calls_send_welcome(self):
        from app.tasks.email_tasks import send_welcome_email
        svc = _make_svc()
        _run(send_welcome_email, svc, email="a@b.com", first_name="Alice", company="ACME")
        svc.send_welcome.assert_called_once_with("a@b.com", "Alice", "ACME")

    def test_returns_true_on_success(self):
        from app.tasks.email_tasks import send_welcome_email
        svc = _make_svc(success=True)
        result = _run(send_welcome_email, svc, email="a@b.com", first_name="Alice", company="ACME")
        assert result.get() is True

    def test_raises_on_service_failure(self):
        """When service returns False the task calls self.retry() — Retry propagates in eager mode."""
        from app.tasks.email_tasks import send_welcome_email
        from app.tasks import email_tasks
        from celery.exceptions import Retry
        svc = _make_svc(success=False)
        with patch.object(email_tasks, "_email_svc", return_value=svc):
            with pytest.raises(Retry):
                send_welcome_email.apply(kwargs={"email": "a@b.com", "first_name": "X", "company": "Y"})

    def test_raises_on_exception(self):
        """ConnectionError triggers autoretry which raises Retry in eager mode."""
        from app.tasks.email_tasks import send_welcome_email
        from app.tasks import email_tasks
        from celery.exceptions import Retry
        svc = _make_svc()
        svc.send_welcome.side_effect = ConnectionError("timeout")
        with patch.object(email_tasks, "_email_svc", return_value=svc):
            with pytest.raises(Retry):
                send_welcome_email.apply(kwargs={"email": "a@b.com", "first_name": "X", "company": "Y"})


# ─── send_password_reset_email ────────────────────────────────────────────────

class TestSendPasswordResetEmail:

    def test_calls_send_password_reset(self):
        from app.tasks.email_tasks import send_password_reset_email
        svc = _make_svc()
        _run(
            send_password_reset_email, svc,
            email="reset@example.com", first_name="Bob",
            reset_url="https://app.com/reset?token=abc",
        )
        svc.send_password_reset.assert_called_once_with(
            "reset@example.com", "Bob", "https://app.com/reset?token=abc"
        )

    def test_returns_true(self):
        from app.tasks.email_tasks import send_password_reset_email
        svc = _make_svc()
        result = _run(
            send_password_reset_email, svc,
            email="x@y.com", first_name="", reset_url="https://app.com/reset",
        )
        assert result.get() is True


# ─── send_email_verification ──────────────────────────────────────────────────

class TestSendEmailVerification:

    def test_calls_send_email_verification(self):
        from app.tasks.email_tasks import send_email_verification
        svc = _make_svc()
        _run(
            send_email_verification, svc,
            email="verify@example.com", first_name="Carol",
            verify_url="https://app.com/verify?token=tok",
        )
        svc.send_email_verification.assert_called_once_with(
            "verify@example.com", "Carol", "https://app.com/verify?token=tok"
        )

    def test_returns_true(self):
        from app.tasks.email_tasks import send_email_verification
        svc = _make_svc()
        result = _run(
            send_email_verification, svc,
            email="v@example.com", first_name="Dave",
            verify_url="https://app.com/verify?token=xyz",
        )
        assert result.get() is True


# ─── send_user_invited_email ──────────────────────────────────────────────────

class TestSendUserInvitedEmail:

    def test_calls_send_user_invited(self):
        from app.tasks.email_tasks import send_user_invited_email
        svc = _make_svc()
        _run(
            send_user_invited_email, svc,
            email="supplier@vendor.com", inviter_name="Eve",
            company="SupplierCo",
            invite_url="https://greenconnect.cloud/supplier-portal/tok",
        )
        svc.send_user_invited.assert_called_once_with(
            "supplier@vendor.com", "Eve", "SupplierCo",
            "https://greenconnect.cloud/supplier-portal/tok",
        )

    def test_returns_true(self):
        from app.tasks.email_tasks import send_user_invited_email
        svc = _make_svc()
        result = _run(
            send_user_invited_email, svc,
            email="s@v.com", inviter_name="Frank",
            company="X", invite_url="https://app.com/portal/t",
        )
        assert result.get() is True


# ─── send_trial_ending_soon_email ─────────────────────────────────────────────

class TestSendTrialEndingSoonEmail:

    def test_calls_send_trial_ending_soon(self):
        from app.tasks.email_tasks import send_trial_ending_soon_email
        svc = _make_svc()
        _run(
            send_trial_ending_soon_email, svc,
            email="trial@example.com", first_name="Grace", days_left=3,
        )
        svc.send_trial_ending_soon.assert_called_once_with(
            "trial@example.com", "Grace", 3
        )

    def test_days_left_1(self):
        from app.tasks.email_tasks import send_trial_ending_soon_email
        svc = _make_svc()
        result = _run(
            send_trial_ending_soon_email, svc,
            email="t@t.com", first_name="Hector", days_left=1,
        )
        assert result.get() is True


# ─── send_payment_failed_email ────────────────────────────────────────────────

class TestSendPaymentFailedEmail:

    def test_calls_send_payment_failed(self):
        from app.tasks.email_tasks import send_payment_failed_email
        svc = _make_svc()
        _run(
            send_payment_failed_email, svc,
            email="pay@example.com", first_name="Iris",
            amount="49.00 EUR", retry_date="25/04/2026",
        )
        svc.send_payment_failed.assert_called_once_with(
            "pay@example.com", "Iris", "49.00 EUR", "25/04/2026"
        )

    def test_retry_date_none(self):
        from app.tasks.email_tasks import send_payment_failed_email
        svc = _make_svc()
        result = _run(
            send_payment_failed_email, svc,
            email="p@e.com", first_name="Jules",
            amount="99.00 EUR", retry_date=None,
        )
        assert result.get() is True


# ─── send_trial_started_email ─────────────────────────────────────────────────

class TestSendTrialStartedEmail:

    def test_calls_send_trial_started(self):
        from app.tasks.email_tasks import send_trial_started_email
        svc = _make_svc()
        _run(
            send_trial_started_email, svc,
            email="trial@example.com", first_name="Karl",
            company="StartupX", trial_end="02/05/2026",
        )
        svc.send_trial_started.assert_called_once_with(
            "trial@example.com", "Karl", "StartupX", "02/05/2026"
        )

    def test_returns_true(self):
        from app.tasks.email_tasks import send_trial_started_email
        svc = _make_svc()
        result = _run(
            send_trial_started_email, svc,
            email="t@t.com", first_name="Lena",
            company="Beta", trial_end="01/06/2026",
        )
        assert result.get() is True


# ─── send_subscription_activated_email ───────────────────────────────────────

class TestSendSubscriptionActivatedEmail:

    def test_calls_send_subscription_activated(self):
        from app.tasks.email_tasks import send_subscription_activated_email
        svc = _make_svc()
        _run(
            send_subscription_activated_email, svc,
            email="sub@example.com", first_name="Marco",
            plan_name="Pro", amount="49.00 EUR", next_date="19/05/2026",
        )
        svc.send_subscription_activated.assert_called_once_with(
            "sub@example.com", "Marco", "Pro", "49.00 EUR", "19/05/2026"
        )

    def test_returns_true(self):
        from app.tasks.email_tasks import send_subscription_activated_email
        svc = _make_svc()
        result = _run(
            send_subscription_activated_email, svc,
            email="s@e.com", first_name="Nina",
            plan_name="Enterprise", amount="199.00 EUR", next_date="—",
        )
        assert result.get() is True


# ─── send_subscription_canceled_email ────────────────────────────────────────

class TestSendSubscriptionCanceledEmail:

    def test_calls_send_subscription_canceled(self):
        from app.tasks.email_tasks import send_subscription_canceled_email
        svc = _make_svc()
        _run(
            send_subscription_canceled_email, svc,
            email="cancel@example.com", first_name="Oscar",
            plan_name="Pro", end_date="30/04/2026",
        )
        svc.send_subscription_canceled.assert_called_once_with(
            "cancel@example.com", "Oscar", "Pro", "30/04/2026"
        )

    def test_returns_true(self):
        from app.tasks.email_tasks import send_subscription_canceled_email
        svc = _make_svc()
        result = _run(
            send_subscription_canceled_email, svc,
            email="c@e.com", first_name="Paula",
            plan_name="Starter", end_date="01/05/2026",
        )
        assert result.get() is True


# ─── send_invoice_paid_email ──────────────────────────────────────────────────

class TestSendInvoicePaidEmail:

    def test_calls_send_invoice_paid(self):
        from app.tasks.email_tasks import send_invoice_paid_email
        svc = _make_svc()
        _run(
            send_invoice_paid_email, svc,
            email="invoice@example.com", first_name="Quinn",
            amount="49.00 EUR",
            invoice_url="https://stripe.com/invoices/inv_123",
            invoice_number="INV-0042",
        )
        svc.send_invoice_paid.assert_called_once_with(
            "invoice@example.com", "Quinn", "49.00 EUR",
            "https://stripe.com/invoices/inv_123", "INV-0042",
        )

    def test_returns_true(self):
        from app.tasks.email_tasks import send_invoice_paid_email
        svc = _make_svc()
        result = _run(
            send_invoice_paid_email, svc,
            email="i@e.com", first_name="Rachel",
            amount="99.00 EUR",
            invoice_url="https://stripe.com/invoices/inv_456",
            invoice_number="INV-0099",
        )
        assert result.get() is True
