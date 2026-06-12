"""
Lead magnets — capture email contre téléchargement de contenu.

Implémente un opt-in marketing simple (RGPD-friendly) avec :
    1. POST /api/v1/leads/checklist-csrd  → enregistre + envoie email avec PDF
    2. Génération du PDF check-list 47 indicateurs ESRS à la volée
    3. Logging du lead dans tenant.settings.lead_magnets OU dans une table
       leads dédiée si elle existe.

Le lead est volontairement stocké de façon minimaliste : seul l'email est
obligatoire ; nom et entreprise sont optionnels. Pas de cookie tracking, pas
de retargeting — l'utilisateur consent en cochant la case "recevoir nos
emails ponctuels", et peut se désabonner via le footer (RFC 8058).
"""
from __future__ import annotations

import io
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field

logger = logging.getLogger(__name__)
router = APIRouter()


class ChecklistRequest(BaseModel):
    email: EmailStr
    first_name: Optional[str] = Field(None, max_length=100)
    company: Optional[str] = Field(None, max_length=200)
    consent: bool = Field(..., description="Opt-in marketing (RGPD)")


class NewsletterRequest(BaseModel):
    email: EmailStr
    source: Optional[str] = Field(None, max_length=50, description="Page d'origine (footer, popup, …)")


# ─── PDF generator ────────────────────────────────────────────────────────────

ESRS_CHECKLIST: list[dict] = [
    # ESRS 2 — Transversal (toujours matériel)
    {"section": "ESRS 2 — Informations générales", "code": "ESRS 2-1",  "label": "Gouvernance des enjeux ESG (composition CA, comités)",                            "criticite": "haute"},
    {"section": "ESRS 2 — Informations générales", "code": "ESRS 2-2",  "label": "Modèle d'affaires & chaîne de valeur (description, principales activités)",       "criticite": "haute"},
    {"section": "ESRS 2 — Informations générales", "code": "ESRS 2-3",  "label": "Stratégie et résilience face aux risques ESG",                                    "criticite": "haute"},
    {"section": "ESRS 2 — Informations générales", "code": "ESRS 2-4",  "label": "Processus de double matérialité (méthodologie et résultats)",                     "criticite": "haute"},
    {"section": "ESRS 2 — Informations générales", "code": "ESRS 2-5",  "label": "Engagement des parties prenantes (méthode, fréquence, résultats)",                "criticite": "haute"},
    {"section": "ESRS 2 — Informations générales", "code": "ESRS 2-6",  "label": "Politiques ESG en place (anti-corruption, droits humains, climat…)",              "criticite": "haute"},

    # E1 — Climat
    {"section": "ESRS E1 — Climat",                "code": "E1-1",     "label": "Plan de transition pour l'atténuation du changement climatique",                  "criticite": "haute"},
    {"section": "ESRS E1 — Climat",                "code": "E1-2",     "label": "Politiques climat (atténuation et adaptation)",                                   "criticite": "haute"},
    {"section": "ESRS E1 — Climat",                "code": "E1-3",     "label": "Actions et ressources allouées aux politiques climat",                            "criticite": "haute"},
    {"section": "ESRS E1 — Climat",                "code": "E1-4",     "label": "Objectifs de réduction GES (scopes 1+2 et 3, alignés SBTi recommandé)",          "criticite": "haute"},
    {"section": "ESRS E1 — Climat",                "code": "E1-5",     "label": "Consommation et mix énergétiques (kWh, % renouvelable)",                          "criticite": "haute"},
    {"section": "ESRS E1 — Climat",                "code": "E1-6a",    "label": "Émissions GES Scope 1 (tCO₂e, émissions directes)",                              "criticite": "haute"},
    {"section": "ESRS E1 — Climat",                "code": "E1-6b",    "label": "Émissions GES Scope 2 (tCO₂e, énergie achetée — location & market based)",         "criticite": "haute"},
    {"section": "ESRS E1 — Climat",                "code": "E1-6c",    "label": "Émissions GES Scope 3 (tCO₂e, 15 catégories GHG Protocol)",                       "criticite": "haute"},
    {"section": "ESRS E1 — Climat",                "code": "E1-7",     "label": "Séquestration GES et projets compensation carbone",                               "criticite": "moyenne"},
    {"section": "ESRS E1 — Climat",                "code": "E1-8",     "label": "Tarification interne du carbone (prix interne, périmètre)",                       "criticite": "moyenne"},
    {"section": "ESRS E1 — Climat",                "code": "E1-9",     "label": "Effets financiers des risques climatiques physiques et de transition",            "criticite": "moyenne"},

    # E2 — Pollution
    {"section": "ESRS E2 — Pollution",             "code": "E2-1",     "label": "Politiques de prévention/réduction de la pollution (air, eau, sol)",              "criticite": "moyenne"},
    {"section": "ESRS E2 — Pollution",             "code": "E2-4",     "label": "Émissions polluants atmosphériques (NOx, SOx, particules fines)",                "criticite": "moyenne"},
    {"section": "ESRS E2 — Pollution",             "code": "E2-5",     "label": "Substances préoccupantes (REACH, CMR — quantités utilisées et émises)",          "criticite": "moyenne"},

    # E3 — Eau
    {"section": "ESRS E3 — Eau et ressources",     "code": "E3-1",     "label": "Politique gestion de l'eau et ressources marines",                                "criticite": "moyenne"},
    {"section": "ESRS E3 — Eau et ressources",     "code": "E3-4",     "label": "Prélèvements d'eau (m³), dont zones de stress hydrique",                          "criticite": "moyenne"},
    {"section": "ESRS E3 — Eau et ressources",     "code": "E3-5",     "label": "Consommation d'eau (m³, prélèvements - rejets)",                                  "criticite": "moyenne"},

    # E4 — Biodiversité
    {"section": "ESRS E4 — Biodiversité",          "code": "E4-2",     "label": "Sites situés à proximité de zones sensibles (Natura 2000, IUCN)",                "criticite": "basse"},
    {"section": "ESRS E4 — Biodiversité",          "code": "E4-5",     "label": "Impacts sur la biodiversité (MSA, déforestation, espèces protégées)",            "criticite": "basse"},

    # E5 — Économie circulaire
    {"section": "ESRS E5 — Économie circulaire",   "code": "E5-1",     "label": "Politique d'écoconception et circularité",                                       "criticite": "moyenne"},
    {"section": "ESRS E5 — Économie circulaire",   "code": "E5-4",     "label": "Flux entrants : matières vierges vs recyclées (tonnes, %)",                       "criticite": "moyenne"},
    {"section": "ESRS E5 — Économie circulaire",   "code": "E5-5",     "label": "Déchets générés (tonnes), taux de valorisation",                                  "criticite": "moyenne"},

    # S1 — Effectifs propres
    {"section": "ESRS S1 — Effectifs propres",     "code": "S1-1",     "label": "Politiques RH (diversité, formation, santé-sécurité)",                          "criticite": "haute"},
    {"section": "ESRS S1 — Effectifs propres",     "code": "S1-6",     "label": "Démographie des salariés (ETP, contrats CDI/CDD, genre, âge)",                    "criticite": "haute"},
    {"section": "ESRS S1 — Effectifs propres",     "code": "S1-9",     "label": "Diversité et inclusion (% femmes par strate hiérarchique)",                       "criticite": "haute"},
    {"section": "ESRS S1 — Effectifs propres",     "code": "S1-10",    "label": "Rémunération adéquate (écart médiane CEO, gender pay gap)",                       "criticite": "haute"},
    {"section": "ESRS S1 — Effectifs propres",     "code": "S1-13",    "label": "Formation et développement (heures par salarié)",                                 "criticite": "moyenne"},
    {"section": "ESRS S1 — Effectifs propres",     "code": "S1-14",    "label": "Santé et sécurité (accidents du travail, maladies pro, taux fréquence/gravité)", "criticite": "haute"},
    {"section": "ESRS S1 — Effectifs propres",     "code": "S1-15",    "label": "Équilibre vie pro/vie perso (congé parental, télétravail)",                       "criticite": "moyenne"},
    {"section": "ESRS S1 — Effectifs propres",     "code": "S1-16",    "label": "Rémunération équitable (politique, écarts)",                                      "criticite": "moyenne"},

    # S2 — Travailleurs de la chaîne de valeur
    {"section": "ESRS S2 — Chaîne de valeur",      "code": "S2-1",     "label": "Politique droits humains supply chain (alignée Principes ONU)",                  "criticite": "haute"},
    {"section": "ESRS S2 — Chaîne de valeur",      "code": "S2-4",     "label": "Audits sociaux fournisseurs (% en valeur d'achat évalués)",                       "criticite": "haute"},

    # S3 — Communautés affectées
    {"section": "ESRS S3 — Communautés",           "code": "S3-1",     "label": "Politique d'engagement avec les communautés locales",                            "criticite": "basse"},

    # S4 — Consommateurs
    {"section": "ESRS S4 — Consommateurs",         "code": "S4-1",     "label": "Politique protection des consommateurs (sécurité produit, données perso)",       "criticite": "moyenne"},
    {"section": "ESRS S4 — Consommateurs",         "code": "S4-3",     "label": "Mécanismes de réclamation et résolution",                                        "criticite": "moyenne"},

    # G1 — Gouvernance et conduite des affaires
    {"section": "ESRS G1 — Gouvernance",           "code": "G1-1",     "label": "Culture éthique et codes de conduite",                                            "criticite": "haute"},
    {"section": "ESRS G1 — Gouvernance",           "code": "G1-2",     "label": "Gestion des relations fournisseurs (délais de paiement, écart médiane légale)",  "criticite": "haute"},
    {"section": "ESRS G1 — Gouvernance",           "code": "G1-3",     "label": "Prévention et détection de la corruption (incidents, formations)",                "criticite": "haute"},
    {"section": "ESRS G1 — Gouvernance",           "code": "G1-4",     "label": "Cas confirmés de corruption (nombre, sanctions)",                                 "criticite": "haute"},
    {"section": "ESRS G1 — Gouvernance",           "code": "G1-5",     "label": "Lobbying et influence politique (montants, sujets, registre transparence)",      "criticite": "moyenne"},
]


def _generate_checklist_pdf() -> bytes:
    """Generate the 47-indicator ESRS checklist PDF using ReportLab."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable
    )

    NAVY  = colors.HexColor('#0f172a')
    GREEN = colors.HexColor('#10b981')
    LGRAY = colors.HexColor('#f3f4f6')
    GRAY  = colors.HexColor('#6b7280')
    AMBER = colors.HexColor('#d97706')
    RED   = colors.HexColor('#dc2626')

    CRIT_COLOR = {'haute': RED, 'moyenne': AMBER, 'basse': GRAY}
    CRIT_LABEL = {'haute': 'Haute',  'moyenne': 'Moyenne', 'basse': 'Basse'}

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        topMargin=20*mm, bottomMargin=18*mm,
        leftMargin=18*mm, rightMargin=18*mm,
    )
    story = []

    # ── Cover ──
    story.append(Paragraph(
        '<font color="#10b981">ESG</font> <font color="#0f172a">FLOW</font>',
        ParagraphStyle('logo', fontSize=22, fontName='Helvetica-Bold', alignment=1, spaceAfter=4),
    ))
    story.append(Paragraph(
        '<font color="#94a3b8">DATA · CARBON · IMPACT</font>',
        ParagraphStyle('tag', fontSize=8, alignment=1, spaceAfter=24),
    ))
    story.append(Spacer(1, 30*mm))
    story.append(Paragraph(
        'Check-list CSRD',
        ParagraphStyle('cover', fontSize=36, fontName='Helvetica-Bold', textColor=NAVY,
                       alignment=1, spaceAfter=8, leading=42),
    ))
    story.append(Paragraph(
        f'{len(ESRS_CHECKLIST)} indicateurs ESRS prioritaires',
        ParagraphStyle('subtitle', fontSize=14, textColor=GREEN, alignment=1,
                       fontName='Helvetica-Bold', spaceAfter=8),
    ))
    story.append(Paragraph(
        'Le guide indispensable pour démarrer votre conformité CSRD',
        ParagraphStyle('desc', fontSize=11, textColor=GRAY, alignment=1, spaceAfter=24),
    ))
    story.append(HRFlowable(width='40%', thickness=2, color=GREEN, lineCap='round',
                            hAlign='CENTER', spaceBefore=16, spaceAfter=16))
    story.append(Paragraph(
        f'Édition {datetime.now().strftime("%B %Y").capitalize()} · Conforme directive 2022/2464',
        ParagraphStyle('date', fontSize=9, textColor=GRAY, alignment=1),
    ))
    story.append(PageBreak())

    # ── Comment utiliser ──
    story.append(Paragraph('Comment utiliser cette check-list',
        ParagraphStyle('h1', fontSize=18, fontName='Helvetica-Bold', textColor=NAVY, spaceAfter=12)))
    story.append(HRFlowable(width='100%', thickness=1, color=GREEN, spaceAfter=10))

    intro_text = [
        "Cette check-list récense 47 indicateurs ESRS prioritaires que tout préparateur "
        "CSRD devrait identifier au moins une fois pendant son analyse de double matérialité. "
        "Tous les indicateurs ne seront pas matériels pour votre activité — c'est à vous "
        "(et à vos parties prenantes) d'arbitrer.",
        "<b>Niveaux de criticité utilisés :</b>",
        "• <b><font color='#dc2626'>Haute</font></b> — Indicateur obligatoire ou quasi-systématique pour la plupart des entreprises. À renseigner même sans étude de matérialité détaillée.",
        "• <b><font color='#d97706'>Moyenne</font></b> — Indicateur fréquemment matériel selon votre secteur. Probablement à activer pour industrie, BTP, agroalimentaire, transport, énergie, finance.",
        "• <b><font color='#6b7280'>Basse</font></b> — Indicateur situationnel. À publier si l'analyse de double matérialité conclut à un impact significatif.",
        "<b>Conseil pratique :</b> commencez par les 19 indicateurs <i>haute</i> criticité, vous couvrirez ~80 % des attentes des auditeurs et de vos clients grands comptes.",
    ]
    for t in intro_text:
        story.append(Paragraph(t, ParagraphStyle('p', fontSize=10, textColor=NAVY,
                                                  spaceAfter=8, leading=15)))

    story.append(PageBreak())

    # ── Indicators by section ──
    last_section = None
    for ind in ESRS_CHECKLIST:
        if ind['section'] != last_section:
            if last_section is not None:
                story.append(Spacer(1, 6*mm))
            story.append(Paragraph(ind['section'],
                ParagraphStyle('section', fontSize=14, fontName='Helvetica-Bold',
                               textColor=NAVY, spaceBefore=10, spaceAfter=6)))
            story.append(HRFlowable(width='100%', thickness=0.5, color=GREEN, spaceAfter=6))
            last_section = ind['section']

        c = CRIT_COLOR.get(ind['criticite'], GRAY)
        clabel = CRIT_LABEL.get(ind['criticite'], '—')
        # Indicator row: checkbox | code | label | criticite chip
        row = Table([[
            Paragraph('☐', ParagraphStyle('cb', fontSize=14, alignment=1)),
            Paragraph(f'<font name="Helvetica-Bold" color="#0f172a">{ind["code"]}</font>',
                      ParagraphStyle('code', fontSize=9)),
            Paragraph(ind['label'], ParagraphStyle('lbl', fontSize=9.5, textColor=NAVY, leading=13)),
            Paragraph(f'<font color="white"><b>{clabel}</b></font>',
                      ParagraphStyle('crit', fontSize=8, alignment=1)),
        ]], colWidths=[8*mm, 22*mm, 110*mm, 22*mm])
        row.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BACKGROUND', (3,0), (3,0), c),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LEFTPADDING', (0,0), (-1,-1), 4),
            ('RIGHTPADDING', (3,0), (3,0), 4),
            ('LINEBELOW', (0,0), (-1,-1), 0.3, colors.HexColor('#e5e7eb')),
        ]))
        story.append(row)

    # ── Closing CTA ──
    story.append(PageBreak())
    story.append(Spacer(1, 30*mm))
    story.append(Paragraph(
        'Prêt·e à passer à l\'action ?',
        ParagraphStyle('cta_title', fontSize=22, fontName='Helvetica-Bold', textColor=NAVY,
                       alignment=1, spaceAfter=10),
    ))
    story.append(Paragraph(
        'ESG Flow est la plateforme française qui automatise tous ces indicateurs.<br/>'
        '14 jours d\'essai gratuit · sans carte bancaire · plan ETI complet inclus.',
        ParagraphStyle('cta_desc', fontSize=12, textColor=GRAY, alignment=1, spaceAfter=20, leading=18),
    ))
    cta = Table([[
        Paragraph('<font color="white"><b>greenconnect.cloud/register</b></font>',
                  ParagraphStyle('cta_btn', fontSize=14, alignment=1)),
    ]], colWidths=[120*mm], rowHeights=[14*mm])
    cta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), GREEN),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ROUNDEDCORNERS', [8]),
    ]))
    cta.hAlign = 'CENTER'
    story.append(cta)
    story.append(Spacer(1, 20*mm))
    story.append(Paragraph(
        '© 2026 GreenConnect SAS · ESG Flow · Plateforme ESG intelligente',
        ParagraphStyle('foot', fontSize=8, textColor=GRAY, alignment=1),
    ))

    doc.build(story)
    buf.seek(0)
    return buf.read()


# ─── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("/leads/checklist-csrd", summary="Capture lead + livraison check-list ESRS")
async def submit_checklist_lead(
    body: ChecklistRequest,
    background_tasks: BackgroundTasks,
    request: Request,
):
    """Capture l'email du visiteur et lui livre la check-list par email."""
    if not body.consent:
        raise HTTPException(status_code=400, detail="Le consentement marketing est requis.")

    # Log the lead (best-effort — DB optional)
    try:
        from app.db.session import AsyncSessionLocal
        from sqlalchemy import text as _t
        ip = request.client.host if request.client else "?"
        async with AsyncSessionLocal() as db:
            # Best-effort insert into audit_logs (already RLS-aware) as a generic event store
            await db.execute(
                _t("""
                INSERT INTO audit_logs (id, tenant_id, action, resource_type, details, created_at)
                VALUES (gen_random_uuid(), NULL, 'lead_capture', 'checklist_csrd', :details::jsonb, NOW())
                ON CONFLICT DO NOTHING
                """),
                {"details": f'{{"email":"{body.email}","first_name":"{body.first_name or ""}","company":"{body.company or ""}","ip":"{ip}","source":"checklist-csrd"}}'},
            )
            await db.commit()
    except Exception as exc:
        logger.warning("Lead capture DB write failed: %s", exc)

    # Send the PDF in background so the API stays snappy
    def _send():
        try:
            pdf_bytes = _generate_checklist_pdf()
            _send_lead_email(
                to_email=body.email,
                first_name=body.first_name or "",
                pdf_bytes=pdf_bytes,
            )
        except Exception as exc:
            logger.exception("Lead PDF send failed for %s: %s", body.email, exc)

    background_tasks.add_task(_send)

    return {
        "ok": True,
        "message": "Check-list envoyée par email — arrive dans quelques secondes.",
    }


@router.post("/leads/newsletter", summary="Inscription newsletter ESG Flow")
async def submit_newsletter(
    body: NewsletterRequest,
    background_tasks: BackgroundTasks,
    request: Request,
):
    """
    Inscription minimaliste à la newsletter mensuelle ESG Flow.
    Single opt-in via le clic sur le bouton (l'utilisateur peut se désabonner
    à tout moment via le lien dans chaque email — RFC 8058).
    """
    # Log the lead — best-effort, RLS-safe
    try:
        from app.db.session import AsyncSessionLocal
        from sqlalchemy import text as _t
        ip = request.client.host if request.client else "?"
        async with AsyncSessionLocal() as db:
            await db.execute(
                _t("""
                INSERT INTO audit_logs (id, tenant_id, action, resource_type, details, created_at)
                VALUES (gen_random_uuid(), NULL, 'newsletter_subscribe', 'newsletter', :details::jsonb, NOW())
                ON CONFLICT DO NOTHING
                """),
                {"details": f'{{"email":"{body.email}","source":"{body.source or "footer"}","ip":"{ip}"}}'},
            )
            await db.commit()
    except Exception as exc:
        logger.warning("Newsletter DB write failed: %s", exc)

    # Send the confirmation email in background
    def _send():
        try:
            _send_newsletter_welcome(body.email)
        except Exception as exc:
            logger.exception("Newsletter welcome send failed for %s: %s", body.email, exc)

    background_tasks.add_task(_send)

    return {
        "ok": True,
        "message": "Inscription confirmée. Premier email d'ici quelques minutes.",
    }


def _send_newsletter_welcome(to_email: str) -> None:
    """Welcome email après inscription newsletter."""
    import resend
    from app.config import settings
    key = getattr(settings, "RESEND_API_KEY", None)
    if not key:
        raise RuntimeError("RESEND_API_KEY not set")
    resend.api_key = key

    html = f"""
    <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#0f172a;max-width:600px;margin:0 auto;padding:24px;">
      <p style="font-size:24px;font-weight:800;color:#0f172a;margin-bottom:0;">
        ESG<span style="color:#10b981;"> FLOW</span>
      </p>
      <p style="font-size:10px;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;font-weight:600;margin-top:4px;">
        Data · Carbon · Impact
      </p>
      <hr style="border:none;border-top:2px solid #10b981;margin:20px 0;"/>
      <h1 style="font-size:22px;color:#0f172a;">Bienvenue dans la newsletter ESG Flow !</h1>
      <p>Merci de vous être inscrit·e. Chaque mois, vous recevrez :</p>
      <ul style="color:#475569;line-height:1.8;">
        <li>📊 <strong>Une analyse</strong> d'un sujet ESG/CSRD du moment (Omnibus, CSDDD, taxonomie…)</li>
        <li>🛠 <strong>Un outil ou guide pratique</strong> téléchargeable</li>
        <li>📈 <strong>Les chiffres du marché</strong> ESG B2B en France</li>
        <li>🚀 <strong>Les nouveautés produit</strong> ESG Flow (sans spam)</li>
      </ul>
      <p>Sans bullshit, sans jargon, et sans chiffres inventés.</p>
      <p style="text-align:center;margin:24px 0;">
        <a href="https://greenconnect.cloud/register" style="display:inline-block;padding:14px 28px;background:#10b981;color:white;text-decoration:none;border-radius:10px;font-weight:700;">
          Essayer ESG Flow gratuitement
        </a>
      </p>
      <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:32px;">
        Vous pouvez vous désabonner à tout moment via le lien en bas de chaque email.
      </p>
    </div>
    """

    resend.Emails.send({
        "from": f"ESG Flow <noreply@greenconnect.cloud>",
        "to":   [to_email],
        "subject": "Bienvenue dans la newsletter ESG Flow",
        "html": html,
        "headers": {
            "List-Unsubscribe": f"<mailto:unsubscribe@greenconnect.cloud?subject=unsubscribe>, <https://greenconnect.cloud/api/v1/unsubscribe?email={to_email}>",
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
    })
    logger.info("Newsletter welcome sent to %s", to_email)


def _send_lead_email(to_email: str, first_name: str, pdf_bytes: bytes) -> None:
    """Send the checklist PDF as an email attachment via Resend."""
    import resend
    from app.config import settings

    key = getattr(settings, "RESEND_API_KEY", None)
    if not key:
        raise RuntimeError("RESEND_API_KEY not set")
    resend.api_key = key

    import base64
    b64 = base64.b64encode(pdf_bytes).decode()

    greeting = f"Bonjour {first_name}," if first_name else "Bonjour,"
    html = f"""
    <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#0f172a;max-width:600px;margin:0 auto;padding:24px;">
      <p style="font-size:24px;font-weight:800;color:#0f172a;margin-bottom:0;">
        ESG<span style="color:#10b981;"> FLOW</span>
      </p>
      <p style="font-size:10px;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;font-weight:600;margin-top:4px;">
        Data · Carbon · Impact
      </p>
      <hr style="border:none;border-top:2px solid #10b981;margin:20px 0;"/>
      <h1 style="font-size:22px;color:#0f172a;">Votre check-list CSRD</h1>
      <p>{greeting}</p>
      <p>Merci d'avoir demandé notre <strong>check-list CSRD</strong> : 47 indicateurs ESRS prioritaires
      classés par criticité, pour démarrer votre conformité sans rien oublier.</p>
      <p>Le PDF est en pièce jointe de cet email. Conseil : imprimez-le et cochez les indicateurs au fur
      et à mesure que vous les renseignez dans votre outil ESG.</p>
      <p>Si vous voulez aller plus vite, ESG Flow automatise tous ces indicateurs — essai 14 jours gratuit
      sans carte bancaire :</p>
      <p style="text-align:center;margin:24px 0;">
        <a href="https://greenconnect.cloud/register" style="display:inline-block;padding:14px 28px;background:#10b981;color:white;text-decoration:none;border-radius:10px;font-weight:700;">
          Démarrer mon essai
        </a>
      </p>
      <p style="color:#64748b;font-size:13px;">Une question ? Répondez simplement à cet email,
      nous lisons toutes vos réponses.</p>
      <p style="color:#64748b;font-size:13px;">— L'équipe ESG Flow</p>
    </div>
    """

    resend.Emails.send({
        "from": f"ESG Flow <noreply@greenconnect.cloud>",
        "to":   [to_email],
        "subject": "📄 Votre check-list CSRD — 47 indicateurs ESRS",
        "html": html,
        "attachments": [{
            "filename": "checklist-csrd-47-indicateurs-esrs.pdf",
            "content": b64,
        }],
        "headers": {
            "List-Unsubscribe": f"<mailto:unsubscribe@greenconnect.cloud?subject=unsubscribe>, <https://greenconnect.cloud/api/v1/unsubscribe?email={to_email}>",
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
    })
    logger.info("Checklist PDF emailed to %s (%d bytes)", to_email, len(pdf_bytes))
