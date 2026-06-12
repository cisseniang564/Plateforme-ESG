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
    name = getattr(settings, "RESEND_FROM_NAME", "ESG Flow")
    email = getattr(settings, "RESEND_FROM_EMAIL", "noreply@greenconnect.cloud")
    return f"{name} <{email}>"


def _app_url() -> str:
    from app.config import settings
    return getattr(settings, "APP_URL", "https://greenconnect.cloud")


def _support_email() -> str:
    from app.config import settings
    return getattr(settings, "SUPPORT_EMAIL", "support@greenconnect.cloud")


def _unsubscribe_email() -> str:
    from app.config import settings
    return getattr(settings, "UNSUBSCRIBE_EMAIL", "unsubscribe@greenconnect.cloud")


def _unsubscribe_url(email: str) -> str:
    """Public unsubscribe URL — backend honours GET with ?email=… token.
    Hits the API path so it reaches the backend container (nginx routes / to the SPA).
    """
    import urllib.parse
    return f"{_app_url()}/api/v1/unsubscribe?email={urllib.parse.quote(email)}"


# ─── Base template ────────────────────────────────────────────────────────────

def _base_html(title: str, preheader: str, body_html: str, recipient_email: str = "") -> str:
    unsub_url = _unsubscribe_url(recipient_email) if recipient_email else f"{_app_url()}/unsubscribe"
    unsub_mailto = f"mailto:{_unsubscribe_email()}?subject=unsubscribe"
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
      <tr><td style="background:linear-gradient(135deg,#0c1424 0%,#0f172a 100%);padding:32px 40px;border-radius:16px 16px 0 0;text-align:center;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center">
              <img src="{_app_url()}/brand/icon-esgflow-v3-128.png" alt="ESG Flow" width="56" height="56" style="display:block;margin:0 auto 12px auto;border-radius:12px;"/>
              <div style="font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;line-height:1;">
                ESG<span style="color:#10b981;"> FLOW</span>
              </div>
            </td>
          </tr>
          <tr><td style="padding-top:10px;text-align:center;">
            <span style="font-size:10px;color:#94a3b8;letter-spacing:2.5px;text-transform:uppercase;font-weight:600;">Data · Carbon · Impact</span>
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
          © {datetime.now().year} GreenConnect SAS · ESG Flow · Plateforme ESG intelligente
        </p>
        <p style="margin:0 0 12px 0;font-size:11px;color:#94a3b8;">
          CSRD · ESRS · GRI · TCFD · GHG Protocol
        </p>
        <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.6;">
          Vous recevez cet email car vous avez un compte ESG Flow.<br/>
          <a href="{unsub_url}" style="color:#64748b;text-decoration:underline;">Se désabonner</a>
          &nbsp;·&nbsp;
          <a href="{unsub_mailto}" style="color:#64748b;text-decoration:underline;">par email</a>
          &nbsp;·&nbsp;
          <a href="{_app_url()}/privacy-policy" style="color:#64748b;text-decoration:underline;">Confidentialité</a>
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
        """Send a transactional email via Resend.
        Always includes RFC 2369 + RFC 8058 unsubscribe headers so providers
        (Gmail, Outlook, Apple Mail) show a native unsubscribe button and we
        stay compliant with CAN-SPAM / RGPD bulk-mail rules.
        """
        try:
            r = _get_resend()
            unsub_url = _unsubscribe_url(to)
            unsub_mailto = f"mailto:{_unsubscribe_email()}?subject=unsubscribe"
            r.Emails.send({
                "from": _from_address(),
                "to": [to],
                "subject": subject,
                "html": html,
                "headers": {
                    "List-Unsubscribe": f"<{unsub_mailto}>, <{unsub_url}>",
                    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
                    "X-Entity-Ref-ID": "esgflow-transactional",
                },
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
{_badge("Bienvenue sur ESG Flow 🎉")}
{_h1(f"Bonjour {first_name} !")}
{_p(f"Votre compte ESG Flow pour <strong>{company}</strong> est prêt. Vous démarrez avec un <strong>essai gratuit de 14 jours</strong> incluant toutes les fonctionnalités du plan <strong>ETI</strong> — sans carte bancaire, sans engagement.")}
{_kpi_row([("Essai gratuit", "14 jours"), ("Plan inclus", "ETI"), ("Engagement", "Aucun")])}
{_btn("Accéder à la plateforme", f"{app}/app")}
<p style="margin:24px 0 12px 0;font-size:14px;color:#475569;font-weight:600;">Pour bien démarrer :</p>
<ol style="color:#475569;font-size:14px;line-height:1.8;padding-left:20px;margin:0 0 20px 0;">
  <li>Compléter votre profil d'organisation</li>
  <li>Importer vos premières données (saisie manuelle, CSV, FEC ou connecteur)</li>
  <li>Lancer le calcul de votre score ESG</li>
  <li>Générer un premier rapport CSRD / Bilan Carbone</li>
</ol>
{_divider()}
{_p(f"Une question ? Notre équipe est disponible sur <a href='mailto:{_support_email()}' style='color:#059669;'>{_support_email()}</a>", "#64748b", "13px")}
"""
        return cls._send(email, f"Bienvenue sur ESG Flow — votre compte {company} est prêt", _base_html("Bienvenue", "Votre compte ESG Flow est prêt", body, email))

    # ── Trial ─────────────────────────────────────────────────────────────────

    @classmethod
    def send_trial_started(cls, email: str, first_name: str, company: str, trial_end: str) -> bool:
        app = _app_url()
        body = f"""
{_badge("Essai ETI démarré ✨", "#10b981", "#d1fae5")}
{_h1("Votre essai ESG Flow commence !")}
{_p(f"Bonjour {first_name}, votre essai gratuit du plan <strong>ETI</strong> pour <strong>{company}</strong> est actif jusqu'au <strong>{trial_end}</strong>.")}
{_p("Pendant 14 jours, profitez de toutes les fonctionnalités ETI :")}
<ul style="color:#475569;font-size:14px;line-height:1.8;padding-left:20px;margin:0 0 20px 0;">
  <li>Jusqu'à 75 utilisateurs · 150 organisations</li>
  <li>Rapports CSRD / ESRS, DPEF, SFDR, Bilan Carbone</li>
  <li>IA narrative pour la rédaction de rapports</li>
  <li>Connecteurs avancés (Enedis, FEC, Climatiq…)</li>
  <li>Benchmarking sectoriel · Multi-référentiels</li>
  <li>Piste d'audit certifiable (hash SHA-256, versioning)</li>
</ul>
{_btn("Explorer la plateforme", f"{app}/app")}
"""
        return cls._send(email, "Votre essai ESG Flow ETI commence aujourd'hui", _base_html("Essai ETI", "14 jours pour explorer ESG Flow ETI", body, email))

    @classmethod
    def send_trial_ending_soon(cls, email: str, first_name: str, days_left: int) -> bool:
        app = _app_url()
        body = f"""
{_badge(f"⏰ Plus que {days_left} jour{'s' if days_left > 1 else ''}", "#d97706", "#fef3c7")}
{_h1("Votre essai ESG Flow se termine bientôt")}
{_p(f"Bonjour {first_name}, votre essai gratuit se termine dans <strong>{days_left} jour{'s' if days_left > 1 else ''}</strong>. Pour continuer à utiliser ESG Flow, choisissez un plan.")}
{_btn("Choisir mon plan", f"{app}/app/settings?tab=billing", "#7c3aed")}
{_divider()}
{_p("Le plan <strong>PME</strong> commence à 79 €/mois — aucune interruption de service, données conservées.", "#64748b", "13px")}
"""
        return cls._send(email, f"Votre essai ESG Flow se termine dans {days_left} jour{'s' if days_left > 1 else ''}", _base_html("Essai bientôt terminé", f"Plus que {days_left} jours d'essai", body, email))

    # ── Onboarding nurture sequence (J3 / J7 / J11 / J13) ───────────────────
    #
    # Stratégie : convertir l'essai gratuit en abonnement en lui rappelant les
    # "moments de bascule" entre une démo curieuse et un usage opérationnel.
    # Chaque email a une intention précise (pas un ping inutile).

    @classmethod
    def send_trial_day3(cls, email: str, first_name: str) -> bool:
        """J+3 — Découverte : montrer les 3 cas d'usage immédiats."""
        app = _app_url()
        body = f"""
{_badge("J+3 · On vous accompagne 🚀", "#2563eb", "#dbeafe")}
{_h1(f"3 choses que vous pouvez tester aujourd'hui")}
{_p(f"Bonjour {first_name}, vous venez de démarrer votre essai ESG Flow — bravo. Pour ne pas rester au stade de la démo curieuse, voici 3 actions concrètes à faire <strong>cette semaine</strong> :")}
<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
  <tr><td style="padding:14px 18px;background:#f0fdf4;border-left:4px solid #10b981;border-radius:4px;">
    <p style="margin:0 0 4px 0;font-size:14px;color:#065f46;font-weight:700;">1. Importez votre FEC comptable</p>
    <p style="margin:0;font-size:13px;color:#475569;line-height:1.5;">15 minutes — votre Scope 3 spend-based est calculé automatiquement avec les facteurs ADEME.</p>
  </td></tr>
  <tr><td style="height:8px;"></td></tr>
  <tr><td style="padding:14px 18px;background:#eff6ff;border-left:4px solid #2563eb;border-radius:4px;">
    <p style="margin:0 0 4px 0;font-size:14px;color:#1e40af;font-weight:700;">2. Lancez votre analyse de double matérialité</p>
    <p style="margin:0;font-size:13px;color:#475569;line-height:1.5;">L'outil intégré vous guide étape par étape. Comptez 30-45 min.</p>
  </td></tr>
  <tr><td style="height:8px;"></td></tr>
  <tr><td style="padding:14px 18px;background:#fef3c7;border-left:4px solid #d97706;border-radius:4px;">
    <p style="margin:0 0 4px 0;font-size:14px;color:#92400e;font-weight:700;">3. Générez un rapport CSRD test</p>
    <p style="margin:0;font-size:13px;color:#475569;line-height:1.5;">Même partiel, voir la sortie PDF aide à convaincre votre DAF et votre commissaire aux comptes.</p>
  </td></tr>
</table>
{_btn("Continuer mon essai", f"{app}/app")}
{_divider()}
{_p(f"Une question ? Répondez à cet email, on lit tout. — L'équipe ESG Flow", "#64748b", "13px")}
"""
        return cls._send(email, "Vos 3 prochaines étapes sur ESG Flow", _base_html("J+3", "3 actions pour profiter de votre essai", body, email))

    @classmethod
    def send_trial_day7(cls, email: str, first_name: str, *, indicators_filled: int = 0) -> bool:
        """J+7 — Mid-trial : démontrer la valeur déjà créée, social proof."""
        app = _app_url()
        progress_block = ""
        if indicators_filled > 0:
            progress_block = _kpi_row([
                ("Indicateurs renseignés", str(indicators_filled)),
                ("Heures économisées", f"{round(indicators_filled * 0.4)}h"),
                ("Vs cabinet conseil", "~15× moins cher"),
            ])
        body = f"""
{_badge("Mi-parcours · J+7 ✨", "#10b981", "#d1fae5")}
{_h1(f"Vous êtes à mi-parcours, {first_name}")}
{_p("7 jours déjà — vous avez encore 7 jours pour explorer toutes les fonctionnalités ETI. Quelques chiffres pour situer vos progrès :")}
{progress_block}
<p style="margin:20px 0 10px 0;font-size:14px;color:#475569;font-weight:600;">Témoignage client :</p>
<blockquote style="margin:0;padding:16px 20px;background:#f8fafc;border-left:3px solid #10b981;border-radius:4px;">
  <p style="margin:0 0 8px 0;font-size:14px;color:#0f172a;line-height:1.6;font-style:italic;">
    « On avait reçu un devis de 18 k€ d'un cabinet pour notre 1er rapport CSRD. Avec ESG Flow, on l'a fait en interne en 6 semaines, pour 2 388 €/an. Le commissaire aux comptes a validé l'audit trail sans réserve. »
  </p>
  <p style="margin:0;font-size:12px;color:#64748b;">— Directrice RSE, PME industrielle 180 salariés (Auvergne)</p>
</blockquote>
{_btn("Reprendre où je m'étais arrêté·e", f"{app}/app")}
"""
        return cls._send(email, "À mi-parcours de votre essai ESG Flow", _base_html("J+7", "Votre essai progresse", body, email))

    @classmethod
    def send_trial_day11(cls, email: str, first_name: str) -> bool:
        """J+11 — Urgence douce : trois jours restants, choisir un plan."""
        app = _app_url()
        body = f"""
{_badge("⏳ J+11 · Plus que 3 jours", "#d97706", "#fef3c7")}
{_h1(f"3 jours pour choisir votre plan, {first_name}")}
{_p("Votre essai gratuit ETI se termine dans 3 jours. Pour <strong>ne pas perdre votre travail</strong> (indicateurs, matrice, rapports brouillons), choisissez un plan avant la date de fin.")}
<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border-collapse:collapse;">
  <tr><td style="padding:18px;background:#f0fdf4;border:2px solid #10b981;border-radius:12px;">
    <p style="margin:0 0 4px 0;font-size:11px;color:#065f46;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Recommandé pour vous</p>
    <p style="margin:0 0 4px 0;font-size:22px;font-weight:800;color:#0f172a;">Plan PME · <span style="color:#10b981;">79 €/mois</span></p>
    <p style="margin:0;font-size:13px;color:#475569;line-height:1.6;">15 utilisateurs · 30 organisations · CSRD complet · Bilan carbone · Import FEC · Taxonomie UE</p>
  </td></tr>
</table>
{_btn("Choisir mon plan PME (79 €/mois)", f"{app}/app/billing")}
{_divider()}
{_p("Besoin d'IA narrative, connecteurs avancés et benchmark sectoriel ? Passez à ETI (199 €/mois) — vous conservez tout ce que vous avez déjà fait pendant l'essai.", "#64748b", "13px")}
{_p(f"Une question avant de décider ? <a href='mailto:{_support_email()}' style='color:#10b981;'>Écrivez-nous</a>, on répond sous 2 h en jour ouvré.", "#64748b", "13px")}
"""
        return cls._send(email, "Plus que 3 jours d'essai — choisissez votre plan", _base_html("J+11", "Votre essai se termine dans 3 jours", body, email))

    @classmethod
    def send_trial_day13(cls, email: str, first_name: str) -> bool:
        """J+13 — Dernier rappel : 24h avant la fin de l'essai."""
        app = _app_url()
        body = f"""
{_badge("🚨 DEMAIN · Fin de votre essai", "#dc2626", "#fee2e2")}
{_h1(f"{first_name}, votre essai se termine dans 24 h")}
{_p("Dernier rappel : sans choix de plan d'ici demain, votre compte ESG Flow va passer en mode lecture seule. Vos données sont conservées 30 jours, mais vous ne pourrez plus :")}
<ul style="color:#475569;font-size:14px;line-height:1.8;padding-left:20px;margin:0 0 20px 0;">
  <li>Saisir de nouveaux indicateurs</li>
  <li>Générer de nouveaux rapports</li>
  <li>Utiliser l'IA narrative</li>
  <li>Importer du FEC ou connecter Enedis</li>
</ul>
{_btn("Activer mon plan maintenant", f"{app}/app/billing")}
{_divider()}
<p style="margin:0;font-size:13px;color:#64748b;">
  <strong>Pas convaincu·e ?</strong> Répondez à cet email et dites-nous ce qui vous a manqué — on prend le feedback très au sérieux et on peut souvent vous aider en 15 min.
</p>
"""
        return cls._send(email, "🚨 Dernière chance — activer votre plan ESG Flow", _base_html("J+13", "Votre essai se termine demain", body, email))

    @classmethod
    def send_trial_expired(cls, email: str, first_name: str) -> bool:
        """J+15 — Trial terminé sans conversion : porte ouverte avec offre spéciale."""
        app = _app_url()
        body = f"""
{_badge("Votre essai est terminé", "#64748b", "#f1f5f9")}
{_h1(f"On garde votre travail au chaud, {first_name}")}
{_p("Votre essai gratuit ETI s'est terminé hier. Pas de panique : <strong>vos données restent stockées 30 jours</strong>, et vous pouvez réactiver votre compte en un clic.")}
<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
  <tr><td style="padding:18px;background:#fef3c7;border-left:4px solid #d97706;border-radius:4px;">
    <p style="margin:0 0 6px 0;font-size:14px;color:#92400e;font-weight:700;">🎁 Offre fidélité — 1 mois offert</p>
    <p style="margin:0;font-size:13px;color:#475569;line-height:1.5;">Souscrivez dans les 7 prochains jours et recevez automatiquement <strong>1 mois supplémentaire offert</strong>. Code appliqué automatiquement.</p>
  </td></tr>
</table>
{_btn("Réactiver mon compte", f"{app}/app/billing")}
{_divider()}
{_p(f"Vous ne reviendrez pas ? Pas grave. Dites-nous pourquoi en <a href='mailto:{_support_email()}' style='color:#10b981;'>2 lignes</a> — ça nous aide à améliorer.", "#64748b", "13px")}
"""
        return cls._send(email, "Votre compte ESG Flow vous attend (1 mois offert)", _base_html("Essai terminé", "Réactivez votre compte avec 1 mois offert", body, email))

    # ── Password Reset ────────────────────────────────────────────────────────

    @classmethod
    def send_password_reset(cls, email: str, first_name: str, reset_url: str) -> bool:
        body = f"""
{_badge("Réinitialisation du mot de passe 🔐", "#2563eb", "#dbeafe")}
{_h1("Réinitialisez votre mot de passe")}
{_p(f"Bonjour {first_name}, nous avons reçu une demande de réinitialisation de mot de passe pour votre compte ESG Flow.")}
{_btn("Réinitialiser mon mot de passe", reset_url, "#2563eb")}
{_divider()}
{_p("Ce lien expire dans <strong>1 heure</strong>. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email — votre compte reste sécurisé.", "#64748b", "13px")}
"""
        return cls._send(email, "Réinitialisez votre mot de passe ESG Flow", _base_html("Mot de passe oublié", "Lien de réinitialisation de mot de passe", body, email))

    @classmethod
    def send_password_changed(cls, email: str, first_name: str) -> bool:
        body = f"""
{_badge("Mot de passe modifié ✅")}
{_h1("Votre mot de passe a été modifié")}
{_p(f"Bonjour {first_name}, votre mot de passe ESG Flow a bien été mis à jour.")}
{_p("Si vous n'êtes pas à l'origine de ce changement, contactez immédiatement notre support.", "#dc2626", "13px")}
{_btn("Accéder à mon compte", _app_url() + "/app")}
"""
        return cls._send(email, "Votre mot de passe ESG Flow a été modifié", _base_html("Mot de passe modifié", "Confirmation de changement de mot de passe", body, email))

    # ── Subscription events ───────────────────────────────────────────────────

    @classmethod
    def send_subscription_activated(cls, email: str, first_name: str, plan_name: str, amount: str, next_date: str) -> bool:
        app = _app_url()
        body = f"""
{_badge(f"Abonnement {plan_name} activé 🎉")}
{_h1(f"Bienvenue sur le plan {plan_name} !")}
{_p(f"Bonjour {first_name}, votre abonnement ESG Flow <strong>{plan_name}</strong> est maintenant actif.")}
{_kpi_row([("Montant", amount), ("Prochain renouvellement", next_date), ("Statut", "Actif ✓")])}
{_btn("Accéder à la plateforme", f"{app}/app")}
{_divider()}
{_p(f"Retrouvez vos factures dans <a href='{app}/app/settings?tab=billing' style='color:#059669;'>Paramètres → Facturation</a>.", "#64748b", "13px")}
"""
        return cls._send(email, f"Abonnement ESG Flow {plan_name} activé", _base_html(f"Plan {plan_name}", f"Votre abonnement {plan_name} est actif", body))

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
        return cls._send(email, "Problème de paiement sur votre abonnement ESG Flow", _base_html("Paiement échoué", "Action requise : paiement en échec", body, email))

    @classmethod
    def send_invoice_paid(cls, email: str, first_name: str, amount: str, invoice_url: str, invoice_number: str) -> bool:
        body = f"""
{_badge("Facture réglée ✅")}
{_h1("Votre paiement a bien été traité")}
{_p(f"Bonjour {first_name}, votre facture ESG Flow <strong>{invoice_number}</strong> de <strong>{amount}</strong> a été réglée avec succès.")}
{_btn("Télécharger la facture", invoice_url, "#2563eb")}
"""
        return cls._send(email, f"Facture ESG Flow {invoice_number} réglée — {amount}", _base_html("Facture payée", f"Facture {invoice_number} réglée", body))

    @classmethod
    def send_subscription_canceled(cls, email: str, first_name: str, plan_name: str, end_date: str) -> bool:
        app = _app_url()
        body = f"""
{_badge("Abonnement annulé", "#6b7280", "#f3f4f6")}
{_h1("Votre abonnement a été annulé")}
{_p(f"Bonjour {first_name}, votre abonnement ESG Flow <strong>{plan_name}</strong> a été annulé. Vous conservez l'accès jusqu'au <strong>{end_date}</strong>.")}
{_p("Vos données sont conservées pendant 90 jours après la fin de votre abonnement.")}
{_btn("Réactiver mon abonnement", f"{app}/app/settings?tab=billing", "#6b7280")}
"""
        return cls._send(email, "Votre abonnement ESG Flow a été annulé", _base_html("Abonnement annulé", "Confirmation d'annulation", body, email))

    # ── Email Verification ────────────────────────────────────────────────────

    @classmethod
    def send_email_verification(cls, email: str, first_name: str, verify_url: str) -> bool:
        body = f"""
{_badge("Vérification d'email 📧", "#2563eb", "#dbeafe")}
{_h1(f"Confirmez votre adresse email")}
{_p(f"Bonjour {first_name}, merci de vous être inscrit(e) sur ESG Flow. Veuillez confirmer votre adresse email en cliquant sur le bouton ci-dessous.")}
{_btn("Confirmer mon email", verify_url, "#2563eb")}
{_divider()}
{_p("Ce lien expire dans <strong>24 heures</strong>. Si vous n'avez pas créé de compte ESG Flow, ignorez cet email.", "#64748b", "13px")}
"""
        return cls._send(
            email,
            "Confirmez votre adresse email ESG Flow",
            _base_html("Vérification email", "Confirmez votre adresse email", body, email),
        )

    # ── User invitation ───────────────────────────────────────────────────────

    @classmethod
    def send_user_invited(cls, email: str, inviter_name: str, company: str, invite_url: str) -> bool:
        body = f"""
{_badge("Invitation ESG Flow 👋", "#7c3aed", "#ede9fe")}
{_h1(f"Vous êtes invité(e) sur ESG Flow")}
{_p(f"<strong>{inviter_name}</strong> vous invite à rejoindre <strong>{company}</strong> sur ESG Flow, la plateforme de reporting ESG professionnelle.")}
{_btn("Accepter l'invitation", invite_url, "#7c3aed")}
{_divider()}
{_p("Ce lien expire dans 7 jours.", "#64748b", "13px")}
"""
        return cls._send(email, f"{inviter_name} vous invite à rejoindre {company} sur ESG Flow", _base_html("Invitation ESG Flow", f"Invitation de {inviter_name}", body))
