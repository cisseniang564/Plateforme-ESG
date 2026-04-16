"""
Email Service — Transactional emails via Resend.
All sends are fire-and-forget (wrapped in try/except) so they never block callers.
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)


def _get_resend():
    """Return resend module initialized with API key."""
    try:
        import resend as _resend
    except ImportError:
        raise ImportError("resend package not installed. Run: pip install resend")

    from app.config import settings
    key = getattr(settings, "RESEND_API_KEY", None)
    if not key or key.startswith("re_REPLACE"):
        raise ValueError("Resend not configured: set RESEND_API_KEY in .env")
    _resend.api_key = key
    return _resend


def _from_address() -> str:
    from app.config import settings
    name = getattr(settings, "RESEND_FROM_NAME", "ESGFlow Platform")
    email = getattr(settings, "RESEND_FROM_EMAIL", "noreply@esgflow.io")
    return f"{name} <{email}>"


def _app_url() -> str:
    from app.config import settings
    return getattr(settings, "APP_URL", "http://localhost:3000")


# ─── Base template ────────────────────────────────────────────────────────────

def _base_html(title: str, preheader: str, body_html: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>{title}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<span style="display:none;max-height:0;overflow:hidden;">{preheader}</span>

<!-- Wrapper -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

      <!-- Header -->
      <tr><td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:32px 40px;border-radius:16px 16px 0 0;text-align:center;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <div style="display:inline-block;background:#059669;width:4px;height:32px;vertical-align:middle;border-radius:2px;margin-right:12px;"></div>
              <span style="font-size:24px;font-weight:800;color:#ffffff;vertical-align:middle;letter-spacing:-0.5px;">ESGFlow</span>
            </td>
          </tr>
          <tr><td style="padding-top:8px;">
            <span style="font-size:11px;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;font-weight:600;">Plateforme de reporting ESG</span>
          </td></tr>
        </table>
      </td></tr>

      <!-- Body -->
      <tr><td style="background:#ffffff;padding:40px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
        {body_html}
      </td></tr>

      <!-- Footer -->
      <tr><td style="background:#f1f5f9;padding:24px 40px;border-radius:0 0 16px 16px;border:1px solid #e2e8f0;border-top:none;text-align:center;">
        <p style="margin:0 0 8px 0;font-size:12px;color:#64748b;">
          © {datetime.now().year} ESGFlow · Confidentiel
        </p>
        <p style="margin:0;font-size:11px;color:#94a3b8;">
          CSRD · ESRS · GRI · TCFD · GHG Protocol
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>"""


def _btn(text: str, url: str, color: str = "#059669") -> str:
    return f"""<table cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr><td style="background:{color};border-radius:10px;text-align:center;">
    <a href="{url}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:0.3px;">{text}</a>
  </td></tr>
</table>"""


def _h1(text: str) -> str:
    return f'<h1 style="margin:0 0 8px 0;font-size:26px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;">{text}</h1>'


def _p(text: str, color: str = "#475569", size: str = "15px") -> str:
    return f'<p style="margin:0 0 16px 0;font-size:{size};color:{color};line-height:1.6;">{text}</p>'


def _divider() -> str:
    return '<hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0;"/>'


def _badge(text: str, color: str = "#059669", bg: str = "#d1fae5") -> str:
    return f'<span style="display:inline-block;padding:4px 14px;background:{bg};color:{color};font-size:12px;font-weight:700;border-radius:20px;margin-bottom:20px;">{text}</span>'


def _kpi_row(items: list[tuple[str, str]]) -> str:
    cols = "".join(
        f"""<td style="text-align:center;padding:16px;background:#f8fafc;border-radius:10px;width:{100//len(items)}%;">
          <div style="font-size:22px;font-weight:800;color:#0f172a;">{val}</div>
          <div style="font-size:11px;color:#64748b;margin-top:4px;font-weight:600;">{label}</div>
        </td>"""
        for label, val in items
    )
    return f'<table width="100%" cellpadding="4" cellspacing="4" style="margin:20px 0;"><tr>{cols}</tr></table>'


# ─── Email Dispatcher ──────────────────────────────────────────────────────────

class EmailService:
    """Dispatch transactional emails. All methods are fire-and-forget."""

    @staticmethod
    def _send(to: str, subject: str, html: str) -> bool:
        try:
            r = _get_resend()
            r.Emails.send({
                "from": _from_address(),
                "to": [to],
                "subject": subject,
                "html": html,
            })
            logger.info("Email sent to %s: %s", to, subject)
            return True
        except Exception as exc:
            logger.warning("Email send failed (%s): %s", subject, exc)
            return False

    # ── Welcome ───────────────────────────────────────────────────────────────

    @classmethod
    def send_welcome(cls, email: str, first_name: str, company: str) -> bool:
        app = _app_url()
        body = f"""
{_badge("Bienvenue sur ESGFlow 🎉")}
{_h1(f"Bonjour {first_name} !")}
{_p(f"Votre compte ESGFlow pour <strong>{company}</strong> est prêt. Vous bénéficiez d'un <strong>essai gratuit de 14 jours</strong> sur le plan Pro — aucune carte bancaire requise.")}
{_kpi_row([("Jours d'essai gratuit", "14"), ("Modules disponibles", "11"), ("Support", "Email")])}
{_btn("Accéder à la plateforme", f"{app}/app")}
{_divider()}
{_p("Des questions ? Notre équipe est disponible sur <a href='mailto:support@esgflow.io' style='color:#059669;'>support@esgflow.io</a>", "#64748b", "13px")}
"""
        return cls._send(email, f"Bienvenue sur ESGFlow — votre compte {company} est prêt", _base_html("Bienvenue", "Votre compte ESGFlow est prêt", body))

    # ── Trial ─────────────────────────────────────────────────────────────────

    @classmethod
    def send_trial_started(cls, email: str, first_name: str, company: str, trial_end: str) -> bool:
        app = _app_url()
        body = f"""
{_badge("Essai Pro démarré ✨", "#7c3aed", "#ede9fe")}
{_h1("Votre essai ESGFlow Pro commence !")}
{_p(f"Bonjour {first_name}, votre essai gratuit du plan <strong>Pro</strong> pour <strong>{company}</strong> est actif jusqu'au <strong>{trial_end}</strong>.")}
{_p("Pendant votre essai, vous avez accès à :")}
<ul style="color:#475569;font-size:14px;line-height:1.8;padding-left:20px;margin:0 0 20px 0;">
  <li>50 utilisateurs · 100 organisations</li>
  <li>10 000 appels API/mois</li>
  <li>Rapports CSRD / ESG avancés</li>
  <li>IA & analyses intelligentes</li>
  <li>Intégrations Google Sheets, Power BI…</li>
  <li>Enrichissement INSEE (10M+ entreprises)</li>
</ul>
{_btn("Explorer la plateforme", f"{app}/app")}
"""
        return cls._send(email, "Votre essai ESGFlow Pro commence aujourd'hui", _base_html("Essai Pro", "14 jours pour explorer ESGFlow Pro", body))

    @classmethod
    def send_trial_ending_soon(cls, email: str, first_name: str, days_left: int) -> bool:
        app = _app_url()
        body = f"""
{_badge(f"⏰ Plus que {days_left} jour{'s' if days_left > 1 else ''}", "#d97706", "#fef3c7")}
{_h1("Votre essai ESGFlow se termine bientôt")}
{_p(f"Bonjour {first_name}, votre essai gratuit se termine dans <strong>{days_left} jour{'s' if days_left > 1 else ''}</strong>. Pour continuer à utiliser ESGFlow, choisissez un plan.")}
{_btn("Choisir mon plan", f"{app}/app/settings?tab=billing", "#7c3aed")}
{_divider()}
{_p("Le plan <strong>Starter</strong> commence à 29€/mois. Aucune interruption de service.", "#64748b", "13px")}
"""
        return cls._send(email, f"Votre essai ESGFlow se termine dans {days_left} jour{'s' if days_left > 1 else ''}", _base_html("Essai bientôt terminé", f"Plus que {days_left} jours d'essai", body))

    # ── Password Reset ────────────────────────────────────────────────────────

    @classmethod
    def send_password_reset(cls, email: str, first_name: str, reset_url: str) -> bool:
        body = f"""
{_badge("Réinitialisation du mot de passe 🔐", "#2563eb", "#dbeafe")}
{_h1("Réinitialisez votre mot de passe")}
{_p(f"Bonjour {first_name}, nous avons reçu une demande de réinitialisation de mot de passe pour votre compte ESGFlow.")}
{_btn("Réinitialiser mon mot de passe", reset_url, "#2563eb")}
{_divider()}
{_p("Ce lien expire dans <strong>1 heure</strong>. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email — votre compte reste sécurisé.", "#64748b", "13px")}
"""
        return cls._send(email, "Réinitialisez votre mot de passe ESGFlow", _base_html("Mot de passe oublié", "Lien de réinitialisation de mot de passe", body))

    @classmethod
    def send_password_changed(cls, email: str, first_name: str) -> bool:
        body = f"""
{_badge("Mot de passe modifié ✅")}
{_h1("Votre mot de passe a été modifié")}
{_p(f"Bonjour {first_name}, votre mot de passe ESGFlow a bien été mis à jour.")}
{_p("Si vous n'êtes pas à l'origine de ce changement, contactez immédiatement notre support.", "#dc2626", "13px")}
{_btn("Accéder à mon compte", _app_url() + "/app")}
"""
        return cls._send(email, "Votre mot de passe ESGFlow a été modifié", _base_html("Mot de passe modifié", "Confirmation de changement de mot de passe", body))

    # ── Subscription events ───────────────────────────────────────────────────

    @classmethod
    def send_subscription_activated(cls, email: str, first_name: str, plan_name: str, amount: str, next_date: str) -> bool:
        app = _app_url()
        body = f"""
{_badge(f"Abonnement {plan_name} activé 🎉")}
{_h1(f"Bienvenue sur le plan {plan_name} !")}
{_p(f"Bonjour {first_name}, votre abonnement ESGFlow <strong>{plan_name}</strong> est maintenant actif.")}
{_kpi_row([("Montant", amount), ("Prochain renouvellement", next_date), ("Statut", "Actif ✓")])}
{_btn("Accéder à la plateforme", f"{app}/app")}
{_divider()}
{_p(f"Retrouvez vos factures dans <a href='{app}/app/settings?tab=billing' style='color:#059669;'>Paramètres → Facturation</a>.", "#64748b", "13px")}
"""
        return cls._send(email, f"Abonnement ESGFlow {plan_name} activé", _base_html(f"Plan {plan_name}", f"Votre abonnement {plan_name} est actif", body))

    @classmethod
    def send_payment_failed(cls, email: str, first_name: str, amount: str, retry_date: Optional[str] = None) -> bool:
        app = _app_url()
        body = f"""
{_badge("⚠️ Problème de paiement", "#dc2626", "#fee2e2")}
{_h1("Impossible de traiter votre paiement")}
{_p(f"Bonjour {first_name}, nous n'avons pas pu prélever <strong>{amount}</strong> sur votre moyen de paiement.")}
{_p("Pour éviter toute interruption de service, veuillez mettre à jour votre moyen de paiement.", "#dc2626")}
{_btn("Mettre à jour mon paiement", f"{app}/app/settings?tab=billing", "#dc2626")}
{_divider()}
{_p(f"{'Prochain essai de prélèvement le ' + retry_date + '.' if retry_date else 'Votre accès peut être limité si le paiement reste en échec.'}", "#64748b", "13px")}
"""
        return cls._send(email, "Problème de paiement sur votre abonnement ESGFlow", _base_html("Paiement échoué", "Action requise : paiement en échec", body))

    @classmethod
    def send_invoice_paid(cls, email: str, first_name: str, amount: str, invoice_url: str, invoice_number: str) -> bool:
        body = f"""
{_badge("Facture réglée ✅")}
{_h1("Votre paiement a bien été traité")}
{_p(f"Bonjour {first_name}, votre facture ESGFlow <strong>{invoice_number}</strong> de <strong>{amount}</strong> a été réglée avec succès.")}
{_btn("Télécharger la facture", invoice_url, "#2563eb")}
"""
        return cls._send(email, f"Facture ESGFlow {invoice_number} réglée — {amount}", _base_html("Facture payée", f"Facture {invoice_number} réglée", body))

    @classmethod
    def send_subscription_canceled(cls, email: str, first_name: str, plan_name: str, end_date: str) -> bool:
        app = _app_url()
        body = f"""
{_badge("Abonnement annulé", "#6b7280", "#f3f4f6")}
{_h1("Votre abonnement a été annulé")}
{_p(f"Bonjour {first_name}, votre abonnement ESGFlow <strong>{plan_name}</strong> a été annulé. Vous conservez l'accès jusqu'au <strong>{end_date}</strong>.")}
{_p("Vos données sont conservées pendant 90 jours après la fin de votre abonnement.")}
{_btn("Réactiver mon abonnement", f"{app}/app/settings?tab=billing", "#6b7280")}
"""
        return cls._send(email, "Votre abonnement ESGFlow a été annulé", _base_html("Abonnement annulé", "Confirmation d'annulation", body))

    # ── Email Verification ────────────────────────────────────────────────────

    @classmethod
    def send_email_verification(cls, email: str, first_name: str, verify_url: str) -> bool:
        body = f"""
{_badge("Vérification d'email 📧", "#2563eb", "#dbeafe")}
{_h1(f"Confirmez votre adresse email")}
{_p(f"Bonjour {first_name}, merci de vous être inscrit(e) sur ESGFlow. Veuillez confirmer votre adresse email en cliquant sur le bouton ci-dessous.")}
{_btn("Confirmer mon email", verify_url, "#2563eb")}
{_divider()}
{_p("Ce lien expire dans <strong>24 heures</strong>. Si vous n'avez pas créé de compte ESGFlow, ignorez cet email.", "#64748b", "13px")}
"""
        return cls._send(
            email,
            "Confirmez votre adresse email ESGFlow",
            _base_html("Vérification email", "Confirmez votre adresse email", body),
        )

    # ── User invitation ───────────────────────────────────────────────────────

    @classmethod
    def send_user_invited(cls, email: str, inviter_name: str, company: str, invite_url: str) -> bool:
        body = f"""
{_badge("Invitation ESGFlow 👋", "#7c3aed", "#ede9fe")}
{_h1(f"Vous êtes invité(e) sur ESGFlow")}
{_p(f"<strong>{inviter_name}</strong> vous invite à rejoindre <strong>{company}</strong> sur ESGFlow, la plateforme de reporting ESG professionnelle.")}
{_btn("Accepter l'invitation", invite_url, "#7c3aed")}
{_divider()}
{_p("Ce lien expire dans 7 jours.", "#64748b", "13px")}
"""
        return cls._send(email, f"{inviter_name} vous invite à rejoindre {company} sur ESGFlow", _base_html("Invitation ESGFlow", f"Invitation de {inviter_name}", body))
