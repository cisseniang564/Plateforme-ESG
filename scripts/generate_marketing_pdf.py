#!/usr/bin/env python3
"""
Generate a professional PDF version of the marketing strategy document.

Usage:
    cd /Users/cisseniang/Downloads/esgplatform
    /Users/cisseniang/Downloads/esgplatform/.claude/worktrees/elastic-moore/backend/.venv/bin/python \
        scripts/generate_marketing_pdf.py

Output: docs/ESG-Flow-Marketing-Strategy-2026.pdf
"""
from __future__ import annotations

import os
from datetime import datetime
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
    HRFlowable, KeepTogether, ListFlowable, ListItem, Image,
)


# ─── Brand palette ───────────────────────────────────────────────────────────
NAVY    = colors.HexColor('#0f172a')
NAVY_D  = colors.HexColor('#0c1424')
GREEN   = colors.HexColor('#10b981')
GREEN_L = colors.HexColor('#d1fae5')
BLUE    = colors.HexColor('#2563eb')
BLUE_L  = colors.HexColor('#dbeafe')
PURPLE  = colors.HexColor('#7c3aed')
PURPLE_L = colors.HexColor('#ede9fe')
AMBER   = colors.HexColor('#d97706')
AMBER_L = colors.HexColor('#fef3c7')
RED     = colors.HexColor('#dc2626')
RED_L   = colors.HexColor('#fee2e2')
GRAY_D  = colors.HexColor('#374151')
GRAY    = colors.HexColor('#6b7280')
GRAY_L  = colors.HexColor('#f3f4f6')
GRAY_M  = colors.HexColor('#e5e7eb')
WHITE   = colors.white


# ─── Styles ──────────────────────────────────────────────────────────────────
def s_title(size: int = 28, color=NAVY, leading: float | None = None) -> ParagraphStyle:
    return ParagraphStyle('title', fontSize=size, fontName='Helvetica-Bold',
                          textColor=color, alignment=0, leading=leading or size * 1.15,
                          spaceAfter=10)

def s_h1() -> ParagraphStyle:
    return ParagraphStyle('h1', fontSize=20, fontName='Helvetica-Bold',
                          textColor=NAVY, leading=26, spaceBefore=18, spaceAfter=8)

def s_h2() -> ParagraphStyle:
    return ParagraphStyle('h2', fontSize=15, fontName='Helvetica-Bold',
                          textColor=NAVY, leading=21, spaceBefore=14, spaceAfter=6)

def s_h3() -> ParagraphStyle:
    return ParagraphStyle('h3', fontSize=12, fontName='Helvetica-Bold',
                          textColor=GREEN, leading=16, spaceBefore=10, spaceAfter=4)

def s_body(color=GRAY_D, size: float = 10.5) -> ParagraphStyle:
    return ParagraphStyle('body', fontSize=size, fontName='Helvetica',
                          textColor=color, leading=size * 1.5, spaceAfter=6,
                          alignment=0)

def s_caption(color=GRAY) -> ParagraphStyle:
    return ParagraphStyle('caption', fontSize=8.5, fontName='Helvetica-Oblique',
                          textColor=color, leading=12, spaceAfter=4)

def s_chip(color, fg=WHITE) -> ParagraphStyle:
    return ParagraphStyle('chip', fontSize=8, fontName='Helvetica-Bold',
                          textColor=fg, alignment=1, leading=10)


# ─── Helpers ─────────────────────────────────────────────────────────────────
def hr(color=GREEN, thickness=1.5, width='100%', space_after=6) -> HRFlowable:
    return HRFlowable(width=width, thickness=thickness, color=color,
                      lineCap='round', spaceAfter=space_after)


def callout(text: str, color, bg, icon: str = '◆') -> Table:
    """Bandeau coloré pour TL;DR, alertes, conseils."""
    p = Paragraph(f'<font color="{_hex(color)}"><b>{icon}  </b></font>'
                  f'<font color="#111827">{text}</font>',
                  ParagraphStyle('callout', fontSize=10, leading=15,
                                 fontName='Helvetica'))
    t = Table([[p]], colWidths=[170 * mm])
    t.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, -1), bg),
        ('LINEBEFORE',    (0, 0), (0, -1), 4, color),
        ('TOPPADDING',    (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING',   (0, 0), (-1, -1), 14),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 14),
    ]))
    return t


def _hex(c):
    """reportlab color → hex string for inline <font> tags."""
    return '#%02x%02x%02x' % (int(c.red * 255), int(c.green * 255), int(c.blue * 255))


def kpi_card(value: str, label: str, color=NAVY, bg=GRAY_L) -> Table:
    """Carte KPI : grosse valeur + label."""
    t = Table([
        [Paragraph(f'<b>{value}</b>',
                   ParagraphStyle('kv', fontSize=18, leading=22, alignment=1,
                                  textColor=color))],
        [Paragraph(label, ParagraphStyle('kl', fontSize=8, leading=11,
                                          alignment=1, textColor=GRAY))],
    ], colWidths=[40 * mm], rowHeights=[12 * mm, 8 * mm])
    t.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, -1), bg),
        ('ALIGN',         (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN',        (0, 0), (0, 0), 'BOTTOM'),
        ('VALIGN',        (0, 1), (0, 1), 'TOP'),
        ('ROUNDEDCORNERS', [6]),
        ('TOPPADDING',    (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    return t


def kpi_row(items: list[tuple[str, str, object, object]]) -> Table:
    """4-card KPI strip."""
    cells = [kpi_card(v, l, c, bg) for v, l, c, bg in items]
    t = Table([cells], colWidths=[42 * mm] * len(items))
    t.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 2),
        ('RIGHTPADDING', (0, 0), (-1, -1), 2),
    ]))
    return t


def table_with_header(rows: list[list], col_widths: list, header_bg=NAVY,
                      header_fg=WHITE, alt_bg=GRAY_L) -> Table:
    """Tableau professionnel avec en-tête sombre + rayures alternées."""
    t = Table(rows, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, 0), header_bg),
        ('TEXTCOLOR',     (0, 0), (-1, 0), header_fg),
        ('FONTNAME',      (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE',      (0, 0), (-1, 0), 9),
        ('FONTSIZE',      (0, 1), (-1, -1), 8.5),
        ('FONTNAME',      (0, 1), (-1, -1), 'Helvetica'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, alt_bg]),
        ('GRID',          (0, 0), (-1, -1), 0.3, GRAY_M),
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING',    (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING',   (0, 0), (-1, -1), 8),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 8),
    ]))
    return t


def bullet(items: list[str], color=GRAY_D, size: float = 10) -> ListFlowable:
    """Liste à puces verts ESG Flow."""
    return ListFlowable(
        [ListItem(Paragraph(t, s_body(color, size)), leftIndent=12, value='●') for t in items],
        bulletType='bullet',
        bulletFontName='Helvetica-Bold',
        bulletColor=GREEN,
        leftIndent=18,
        bulletFontSize=10,
    )


def numbered(items: list[str], color=GRAY_D, size: float = 10) -> ListFlowable:
    return ListFlowable(
        [ListItem(Paragraph(t, s_body(color, size)), leftIndent=12) for t in items],
        bulletType='1',
        bulletFontName='Helvetica-Bold',
        bulletColor=NAVY,
        leftIndent=20,
        bulletFontSize=10,
    )


# ─── Page templates (header / footer) ────────────────────────────────────────
PAGE_W, PAGE_H = A4

def make_callbacks(generated_at: str):
    def first_page(canvas, doc):
        pass  # Cover handles itself

    def later_pages(canvas, doc):
        canvas.saveState()
        # Top emerald bar
        canvas.setFillColor(GREEN)
        canvas.rect(0, PAGE_H - 8 * mm, PAGE_W, 8 * mm, fill=1, stroke=0)
        # Brand wordmark
        canvas.setFillColor(NAVY_D)
        canvas.setFont('Helvetica-Bold', 9)
        canvas.drawString(20 * mm, PAGE_H - 14 * mm, 'ESG')
        canvas.setFillColor(GREEN)
        canvas.drawString(20 * mm + 13, PAGE_H - 14 * mm, 'FLOW')
        # Title in top right
        canvas.setFillColor(GRAY)
        canvas.setFont('Helvetica', 8)
        canvas.drawRightString(PAGE_W - 20 * mm, PAGE_H - 14 * mm,
                               'Stratégie Marketing 2026')

        # Footer line
        canvas.setStrokeColor(GRAY_M)
        canvas.setLineWidth(0.4)
        canvas.line(20 * mm, 15 * mm, PAGE_W - 20 * mm, 15 * mm)
        # Footer text
        canvas.setFillColor(GRAY)
        canvas.setFont('Helvetica', 7)
        canvas.drawString(20 * mm, 10 * mm,
                          f'© 2026 GreenConnect SAS · Confidentiel · Édité le {generated_at}')
        canvas.drawRightString(PAGE_W - 20 * mm, 10 * mm, f'Page {doc.page}')
        canvas.restoreState()

    return first_page, later_pages


# ─── Cover page ──────────────────────────────────────────────────────────────
def build_cover(story: list, logo_path: str | None = None):
    # Top navy band
    band = Table([['', '']], colWidths=[100 * mm, 70 * mm], rowHeights=[50 * mm])
    band.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), NAVY_D)]))
    story.append(band)
    story.append(HRFlowable(width='100%', thickness=6, color=GREEN, spaceAfter=18))

    if logo_path and os.path.exists(logo_path):
        try:
            story.append(Image(logo_path, width=40 * mm, height=40 * mm, kind='proportional'))
            story.append(Spacer(1, 8 * mm))
        except Exception:
            pass

    story.append(Spacer(1, 18 * mm))

    # Document type pill
    pill = Table([[Paragraph(
        '<font color="white"><b>DOCUMENT STRATÉGIQUE · CONFIDENTIEL</b></font>',
        ParagraphStyle('pill', fontSize=8, alignment=1, leading=10))]],
        colWidths=[80 * mm])
    pill.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), GREEN),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('ROUNDEDCORNERS', [6]),
    ]))
    pill_row = Table([[Paragraph('', s_caption()), pill, Paragraph('', s_caption())]],
                    colWidths=[45 * mm, 80 * mm, 45 * mm])
    pill_row.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'MIDDLE')]))
    story.append(pill_row)

    story.append(Spacer(1, 16 * mm))

    # Title
    story.append(Paragraph('Stratégie Marketing',
                            ParagraphStyle('cov1', fontSize=42, fontName='Helvetica-Bold',
                                           textColor=NAVY, alignment=1, leading=50)))
    story.append(Paragraph('ESG Flow · 2026',
                            ParagraphStyle('cov2', fontSize=22, fontName='Helvetica-Bold',
                                           textColor=GREEN, alignment=1, leading=28,
                                           spaceAfter=10)))

    story.append(Spacer(1, 4 * mm))
    story.append(hr(GREEN, 2, '40%', 12))

    story.append(Paragraph(
        'Plan d\'acquisition complet — de 0 à 50 clients payants en 12 mois<br/>'
        'sur le marché français des PME et ETI obligées CSRD.',
        ParagraphStyle('cov_desc', fontSize=11, alignment=1, textColor=GRAY,
                       leading=17)))

    story.append(Spacer(1, 30 * mm))

    # KPI footer
    story.append(kpi_row([
        ('50',       'clients payants visés', NAVY, GRAY_L),
        ('78 k€',    'ARR objectif 12 mois',   GREEN, GREEN_L),
        ('<800 €',   'CAC blended cible',      BLUE, BLUE_L),
        ('30-50 k€', 'budget marketing',       AMBER, AMBER_L),
    ]))

    story.append(Spacer(1, 24 * mm))
    story.append(Paragraph(
        f'Édition v1.0 · {datetime.now().strftime("%B %Y").capitalize()}',
        ParagraphStyle('cov_date', fontSize=9, alignment=1, textColor=GRAY)))
    story.append(Paragraph(
        'Préparé pour l\'équipe fondatrice GreenConnect SAS',
        ParagraphStyle('cov_for', fontSize=9, alignment=1, textColor=GRAY,
                       leading=12)))
    story.append(PageBreak())


# ─── Sections ────────────────────────────────────────────────────────────────
def build_toc(story: list):
    story.append(Paragraph('Sommaire', s_h1()))
    story.append(hr())
    items = [
        ('1.',  'Résumé exécutif',                            3),
        ('2.',  'Marché & opportunité',                       4),
        ('3.',  'ICP et personas',                            5),
        ('4.',  'Positionnement & messages clés',             7),
        ('5.',  'Différenciation concurrentielle',            8),
        ('6.',  'Funnel d\'acquisition',                      9),
        ('7.',  'Canaux d\'acquisition',                     10),
        ('8.',  'Pricing & packaging',                       13),
        ('9.',  'Sales motion',                              14),
        ('10.', 'Tech stack marketing',                      15),
        ('11.', 'KPIs & dashboard',                          16),
        ('12.', 'Plan 90 jours',                             17),
        ('13.', 'Plan 12 mois',                              19),
        ('14.', 'Risques marketing',                         20),
        ('15.', 'Budget indicatif',                          21),
        ('16.', 'Quick wins immédiats',                      22),
        ('17.', 'Annexes & ressources',                      23),
    ]
    rows = [[Paragraph(f'<b>{n}</b>', s_body(NAVY, 10.5)),
             Paragraph(t,             s_body(GRAY_D, 10.5)),
             Paragraph(f'<font color="{_hex(GRAY)}">{p}</font>', s_body(GRAY, 10.5))]
            for n, t, p in items]
    t = Table(rows, colWidths=[12 * mm, 140 * mm, 18 * mm])
    t.setStyle(TableStyle([
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        ('LINEBELOW',     (0, 0), (-1, -1), 0.3, GRAY_M),
        ('ALIGN',         (-1, 0), (-1, -1), 'RIGHT'),
        ('TOPPADDING',    (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t)
    story.append(PageBreak())


def build_executive(story: list):
    story.append(Paragraph('1. Résumé exécutif', s_h1()))
    story.append(hr())
    story.append(callout(
        '<b>Positionnement :</b> « La conformité CSRD en libre-service, en français, à partir de 79 € par mois. »',
        GREEN, GREEN_L, '🎯'))
    story.append(Spacer(1, 4 * mm))

    story.append(Paragraph(
        "ESG Flow est la <b>première plateforme ESG/CSRD self-service pensée pour les PME et ETI françaises</b>. "
        "Là où Workiva (US, $30k-$150k/an, 3-6 mois de mise en route) et Sweep (US/EU, sales-led, $5k+/mois) "
        "ciblent le CAC 40, ESG Flow ouvre le reporting CSRD/ESRS à 79 €/mois en moins d'1 heure de setup.",
        s_body()))

    story.append(Paragraph('Cible principale (M0-M9)', s_h3()))
    story.append(Paragraph(
        "14 000 PME françaises de 50-500 salariés concernées par la <b>vague 2 CSRD</b> (publication 2026) ou la "
        "<b>CSDDD</b> (supply chain due diligence), aujourd'hui sans budget pour Workiva.",
        s_body()))

    story.append(Paragraph('Objectifs 12 mois', s_h3()))
    story.append(bullet([
        '<b>50 clients payants</b> (mix PME 79 € + ETI 199 €)',
        '<b>MRR</b> 6 500 € / mois (≈ 78 000 € ARR)',
        '<b>CAC blended</b> < 800 € (payback 4-8 mois)',
        '<b>3 références client</b> publiques exploitables',
    ]))

    story.append(Paragraph('Budget recommandé année 1', s_h3()))
    story.append(Paragraph(
        '30-50 k€, répartis : <b>60 %</b> SEO et contenu · <b>25 %</b> événementiel · <b>15 %</b> paid (LinkedIn Ads).',
        s_body()))
    story.append(PageBreak())


def build_market(story: list):
    story.append(Paragraph('2. Marché & opportunité', s_h1()))
    story.append(hr())

    story.append(Paragraph('Volumes TAM / SAM / SOM', s_h2()))
    rows = [
        ['Niveau', 'Définition', 'Volume', 'Valeur potentielle'],
        ['TAM',  'Entreprises FR avec obligation ou intention reporting ESG', '~120 000', '1,5 Md€/an'],
        ['SAM',  'PME/ETI 50-5 000 sal. FR (CSRD, CSDDD, ou clients RSE)',     '~28 000',  '480 M€/an'],
        ['SOM',  'Atteignable via SEO + outbound + partenariats (12 mois)',    '~500 leads', '1,2 M€ ARR théorique'],
    ]
    story.append(table_with_header(rows, [22 * mm, 90 * mm, 25 * mm, 35 * mm]))

    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph('Dynamique réglementaire (le vent dans le dos)', s_h2()))
    story.append(bullet([
        '<b>CSRD vague 2</b> (publication 2026 sur exercice 2025) : entreprises &gt;250 sal., 40 M€ CA, 20 M€ bilan → ~9 500 entreprises FR',
        '<b>Omnibus CSRD</b> (Feb 2025) : seuil relevé à 1 000 sal. / 450 M€ → marché obligation rétréci MAIS marché « voluntary reporting » des PME poussées par leurs clients grandit',
        '<b>CSDDD</b> (vigilance fournisseurs) : 2027-2029, impose audits supply chain',
        '<b>EU Taxonomy</b> : obligation cotées + financières',
        '<b>DPEF</b> (Art. L.225-102-1) : obligation française pour ~3 000 entreprises encore en vigueur',
    ]))
    story.append(Spacer(1, 6 * mm))
    story.append(callout(
        "<b>Timing exceptionnel.</b> 2025-2028 est la fenêtre dorée pour acquérir des clients qui DOIVENT se doter d'un outil ESG. Les fenêtres réglementaires de ce type sont rares — il faut occuper le terrain maintenant.",
        AMBER, AMBER_L, '⏰'))
    story.append(PageBreak())


def build_personas(story: list):
    story.append(Paragraph('3. ICP et personas', s_h1()))
    story.append(hr())

    story.append(Paragraph('ICP — Cible primaire', s_h2()))
    rows = [
        ['Critère', 'Valeur'],
        ['Type',          'SAS, SA, SARL, mutuelle, ESS françaises'],
        ['Effectif',      '50 à 500 salariés'],
        ['Chiffre d\'affaires', '10 M€ à 200 M€'],
        ['Secteur',       'Industrie, Services B2B, Distribution, Bâtiment, Agro (priorité secteurs régulés CSRD)'],
        ['Maturité ESG',  'Démarrage à intermédiaire (pas d\'équipe RSE dédiée)'],
        ['Trigger event', 'Demande client "Rapport CSRD ?", mention CSAC, AO RSE'],
        ['Budget annuel', '1 k€ - 5 k€ pour outil ESG (sweet spot ESG Flow)'],
    ]
    story.append(table_with_header(rows, [40 * mm, 130 * mm]))

    story.append(Spacer(1, 8 * mm))
    story.append(Paragraph('Persona 1 — Sophie, Directrice RSE/QSE débordée', s_h2()))
    story.append(Paragraph('<b>Profil</b> : 35-50 ans, double casquette QSE/RSE/Compliance, ETP 0,5 à 1 sur le sujet ESG.', s_body()))
    story.append(Paragraph('<b>Douleurs :</b>', s_h3()))
    story.append(bullet([
        '"On me demande un rapport CSRD pour 2026, je ne sais pas par où commencer"',
        '"Mon DAF refuse de payer 30k€/an pour Workiva"',
        '"J\'ai 7 fichiers Excel, je perds 3 jours/mois à les consolider"',
    ]))
    story.append(Paragraph('<b>Où la trouver :</b> LinkedIn, conférences C3D, webinaires AFNOR/ORSE, salons Produrable, Pollutec, Change NOW.', s_body()))

    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph('Persona 2 — Marc, DAF d\'ETI (signataire du chèque)', s_h2()))
    story.append(Paragraph('<b>Profil</b> : 40-55 ans, comptable de formation, valide les outils achetés.', s_body()))
    story.append(Paragraph('<b>Critères de décision :</b>', s_h3()))
    story.append(bullet([
        'ROI clair (vs cabinet conseil à 5-20 k€)',
        'Conformité légale opposable (audit trail)',
        'Hébergement européen (RGPD, souveraineté)',
        'Engagement contractuel souple (mensuel possible)',
    ]))
    story.append(Paragraph('<b>Où le trouver :</b> DAF Magazine, Option Finance, réseau DFCG, cabinets d\'expertise comptable.', s_body()))

    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph('Persona 3 — Julie, consultante RSE indépendante (prescriptrice)', s_h2()))
    story.append(Paragraph('<b>Profil</b> : 30-45 ans, ex-Big 4, freelance, 5-15 clients PME.', s_body()))
    story.append(Paragraph(
        '<b>Pourquoi nous l\'intéressons :</b> programme partenaire avec commission récurrente, white-label sur plan Groupe (449€), position de prescriptrice.',
        s_body()))
    story.append(PageBreak())


def build_positioning(story: list):
    story.append(Paragraph('4. Positionnement & messages clés', s_h1()))
    story.append(hr())
    story.append(callout(
        '<b>Pour</b> les PME et ETI françaises concernées par la CSRD,<br/>'
        '<b>ESG Flow</b> est la plateforme ESG la plus simple et la plus abordable<br/>'
        '<b>— là où</b> Workiva ou Sweep coûtent $30k-$150k/an, ESG Flow démarre à 79 €/mois et fonctionne en moins d\'une heure.',
        GREEN, GREEN_L, '💬'))

    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph('Les 5 messages clés (à décliner partout)', s_h2()))
    rows = [
        ['#', 'Message', 'Où l\'utiliser'],
        ['1', '« Conformité CSRD en libre-service »', 'Headline, pubs LinkedIn, SEO'],
        ['2', '« 10× moins cher qu\'un cabinet »',     'Comparatifs, démos'],
        ['3', '« Setup en moins d\'1 heure »',         'Démo, témoignages, paid'],
        ['4', '« Données hébergées en France · RGPD »', 'Pages sécurité, DSI'],
        ['5', '« Bilan carbone Scopes 1/2/3 inclus · facteurs ADEME »', 'Crédibilité technique'],
    ]
    story.append(table_with_header(rows, [10 * mm, 100 * mm, 60 * mm]))

    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph('Tone of voice', s_h2()))
    story.append(bullet([
        '<b>Pragmatique</b> — pas de jargon ESG inutile',
        '<b>Rassurant</b> sur la conformité — cite les références (ESRS, GHG Protocol, ADEME)',
        '<b>Direct</b> sur le prix — pas de "Contactez-nous", affiche-le',
        '<b>Français</b> — pas franglais (« rapport » pas « report », « tableau de bord » pas « dashboard »)',
    ]))
    story.append(PageBreak())


def build_competitors(story: list):
    story.append(Paragraph('5. Différenciation concurrentielle', s_h1()))
    story.append(hr())

    story.append(Paragraph('vs Workiva (US, $30k+/an)', s_h2()))
    rows = [
        ['Argument', 'Usage dans le marketing'],
        ['100× moins cher',                          'Pubs comparatives, démo'],
        ['3-6 mois de setup en moins',               'Témoignages clients'],
        ['Français natif (pas seulement traduit)',   'Marketing FR, pages secteur'],
        ['Hébergement UE / hors CLOUD Act',          'Pages sécurité, DSI grand compte'],
    ]
    story.append(table_with_header(rows, [80 * mm, 90 * mm]))

    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph('vs Sweep / Greenly (carbone-focused)', s_h2()))
    rows = [
        ['Argument', 'Usage'],
        ['ESG complète (E + S + G), pas juste carbone', 'Comparatifs'],
        ['CSRD/ESRS natif (eux moins matures)',          'SEO CSRD'],
        ['Audit trail hash SHA-256 vérifiable',          'Pages sécurité'],
    ]
    story.append(table_with_header(rows, [80 * mm, 90 * mm]))

    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph('vs cabinets de conseil (Mazars, EY, KPMG)', s_h2()))
    rows = [
        ['Argument', 'Usage'],
        ['79 €/mois vs 15-50 k€/mission',                 'Comparatifs prix'],
        ['Pas de dépendance à un consultant',              'Outbound DAF'],
        ['Possibilité d\'intégrer un cabinet partenaire',  'Programme partenaires'],
    ]
    story.append(table_with_header(rows, [80 * mm, 90 * mm]))
    story.append(PageBreak())


def build_funnel(story: list):
    story.append(Paragraph('6. Funnel d\'acquisition', s_h1()))
    story.append(hr())

    stages = [
        ('AWARENESS',   'J\'ai un problème CSRD',
            ['SEO long-tail (12 mots clés ciblés)', 'LinkedIn organique + ads',
             'Articles invités Maddyness, DAF Magazine', 'Webinaires mensuels',
             'Posts LinkedIn 3×/sem'], GREEN, GREEN_L),
        ('INTEREST',    'Comment résoudre ?',
            ['Lead magnets (PDF, calculator)', 'Comparateurs vs Workiva/Sweep/Persefoni',
             'Page démo guidée', 'Newsletter mensuelle ESG'], BLUE, BLUE_L),
        ('EVALUATION',  'Est-ce que ça marche ?',
            ['Essai gratuit 14j ETI sans CB', 'Tour produit in-app',
             'Démo perso 30 min sur Calendly', 'Bibliothèque cas d\'usage'], PURPLE, PURPLE_L),
        ('PURCHASE',    'Je m\'engage',
            ['Stripe self-service (PME/ETI)', 'Devis perso (Groupe/Enterprise)',
             'Garantie 30j satisfait/remboursé'], AMBER, AMBER_L),
        ('ADVOCACY',    'Je recommande',
            ['NPS post-rapport CSRD', 'Programme parrainage (1 mois off)',
             'Études de cas', 'Communauté Slack utilisateurs'], RED, RED_L),
    ]

    for stage, intent, actions, fg, bg in stages:
        header = Table([[
            Paragraph(f'<font color="white"><b>{stage}</b></font>',
                      ParagraphStyle('sh', fontSize=10, alignment=1, leading=12)),
            Paragraph(f'<font color="white"><i>« {intent} »</i></font>',
                      ParagraphStyle('si', fontSize=9, alignment=1, leading=12)),
        ]], colWidths=[40 * mm, 130 * mm])
        header.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), fg),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(header)
        story.append(Spacer(1, 2))
        story.append(bullet(actions))
        story.append(Spacer(1, 6))

    story.append(PageBreak())


def build_channels(story: list):
    story.append(Paragraph('7. Canaux d\'acquisition', s_h1()))
    story.append(hr())
    story.append(Paragraph('Ordonnés par ROI estimé année 1.', s_caption()))

    story.append(Paragraph('🥇 Canal #1 — SEO long-tail (priorité absolue)', s_h2()))
    story.append(Paragraph(
        "Les acheteurs B2B SaaS recherchent activement leur solution. Coût marginal d'un lead organique = ~0 €. ROI long terme imbattable.",
        s_body()))
    story.append(Paragraph('Top 12 mots-clés à viser', s_h3()))
    rows = [
        ['Mot-clé', 'Volume/mois (estim.)', 'Diff.', 'Statut'],
        ['logiciel CSRD',                        '1 300', 'Moy',  '/pricing'],
        ['logiciel ESG',                          '880',  'Moy',  '/pricing'],
        ['outil reporting CSRD',                  '480',  'Faib', '/pricing'],
        ['bilan carbone entreprise logiciel',     '720',  'Moy',  '/guide/bilan-carbone-entreprise ✓'],
        ['taxonomie UE outil',                    '320',  'Faib', '/guide/taxonomie ✓'],
        ['import FEC bilan carbone',              '110',  'Faib', '/guide/scope3-fec ✓'],
        ['solution CSRD PME',                     '90',   'Faib', '/pricing'],
        ['alternative Workiva',                   '70',   'Faib', '/compare/workiva ✓'],
        ['alternative Sweep',                     '50',   'Faib', '/compare/sweep ✓'],
        ['ESRS E1 obligations',                   '260',  'Moy',  'NOUVEAU /guide/esrs-e1'],
        ['CSDDD obligations PME',                 '180',  'Faib', '/guide/csddd-supply-chain ✓'],
        ['DPEF rapport modèle',                   '410',  'Moy',  'NOUVEAU /guide/dpef'],
    ]
    story.append(table_with_header(rows, [60 * mm, 35 * mm, 18 * mm, 57 * mm]))

    story.append(Spacer(1, 8 * mm))
    story.append(Paragraph('🥈 Canal #2 — LinkedIn (organique + paid)', s_h2()))
    story.append(Paragraph(
        "<b>Organique</b> (compte fondateur) : 3 posts/semaine (1 leadership ESG · 1 cas client anonymisé · 1 polémique réglementaire). "
        "Newsletter LinkedIn gratuite « ESG sans bullshit » — objectif 500 abonnés à 12 mois.",
        s_body()))
    story.append(Paragraph(
        "<b>Paid</b> : Budget 1 500-3 000 €/mois. Audience : Directeur RSE + DAF + Resp QSE × FR × 50-500 sal. "
        "Asset = lead magnet PDF « Check-list 47 indicateurs ESRS ». KPI cible : CPL &lt; 50 € → CAC &lt; 800 € (16 leads pour 1 client).",
        s_body()))

    story.append(Paragraph('🥉 Canal #3 — Événements & salons', s_h2()))
    rows = [
        ['Événement',                'Période',           'Coût stand',      'Audience'],
        ['Produrable',               'Septembre',         '5-10 k€',         'Directeurs RSE, achats responsables'],
        ['Pollutec',                 'Octobre biennal',   '8-15 k€',         'Industrie, environnement'],
        ['Change NOW',               'Mai',               '12 k€ stand',     'Climat, scale-ups'],
        ['Salon des Maires (AMF)',   'Novembre',          '6 k€',            'Secteur public, collectivités'],
        ['Sustainable Brands Paris', 'Juin',              '5 k€',            'Marques B2C'],
        ['VivaTech',                 'Juin',              '25 k€',           'Tech + investisseurs'],
    ]
    story.append(table_with_header(rows, [40 * mm, 28 * mm, 25 * mm, 77 * mm]))
    story.append(Paragraph(
        '<b>Recommandation année 1 :</b> 1 seul gros salon (Produrable) + 2-3 conférences thématiques en mode speaker (gratuit, plus de visibilité que stand).',
        s_caption()))

    story.append(PageBreak())

    story.append(Paragraph('Canal #4 — Partenariats / écosystème', s_h2()))
    story.append(Paragraph('4 catégories à activer dès M0-M3 :', s_body()))
    story.append(bullet([
        '<b>Cabinets d\'expertise comptable</b> (Pennylane, Cegid, Sage + cabinets indé) — co-marketing + commission récurrente 15-20 %',
        '<b>Consultants RSE indépendants</b> — programme formel : formation gratuite + 20 % commission',
        '<b>Réseaux entreprises</b> — Bpifrance, MEDEF, CCI Paris IDF, C3D, APEC, WTTJ Climate',
        '<b>Partenaires data / connecteurs</b> — Enedis (déjà ✓), GRDF, RTE, Pennylane, Qonto, ADEME Base Carbone (déjà ✓), Climatiq',
    ]))

    story.append(Paragraph('Canal #5 — Content marketing & thought leadership', s_h2()))
    story.append(Paragraph(
        "<b>Pillar pages</b> — objectif : devenir LE référent SEO français sur 4 sujets. Chaque pillar = 5 000-8 000 mots + 6-10 articles satellites.",
        s_body()))
    story.append(bullet([
        '/guide/csrd-pme — Guide complet CSRD pour PME <font color="' + _hex(GREEN) + '">✓ livré</font>',
        '/guide/bilan-carbone-entreprise — Méthode + obligations + outil <font color="' + _hex(GREEN) + '">✓ livré</font>',
        '/guide/csddd-supply-chain — Devoir vigilance supply chain <font color="' + _hex(GREEN) + '">✓ livré</font>',
        '/guide/taxonomie — Comprendre + appliquer <font color="' + _hex(GREEN) + '">✓ livré</font>',
    ]))
    story.append(Paragraph(
        '<b>Formats secondaires :</b> calculateurs gratuits (« Suis-je obligé CSRD ? »), templates Excel (DPEF gratuit), études sectorielles (« Maturité ESG des PME industrielles 2026 »).',
        s_body()))
    story.append(PageBreak())


def build_pricing(story: list):
    story.append(Paragraph('8. Pricing & packaging', s_h1()))
    story.append(hr())
    story.append(Paragraph('Synthèse — déjà déployé en production.', s_caption()))
    rows = [
        ['Plan',       'Prix mensuel', 'Annuel (-20 %)', 'Cible'],
        ['Gratuit',    '0 €',          '—',              'Découverte / TPE (3 users)'],
        ['PME',        '79 €',         '63 €/mois',      '50-249 sal. CSRD light'],
        ['ETI',        '199 €',        '159 €/mois',     '250-2 999 sal. CSRD/CSDDD complet'],
        ['Groupe',     '449 €',        '359 €/mois',     '3 000+ sal. + SSO + multi-entités'],
        ['Enterprise', 'Devis',        '—',              'Grands groupes + sur-mesure'],
    ]
    story.append(table_with_header(rows, [25 * mm, 28 * mm, 32 * mm, 85 * mm]))

    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph('Garanties & politique', s_h2()))
    story.append(bullet([
        '<b>Essai 14 jours</b> sur plan ETI, sans CB',
        '<b>Garantie 30 jours satisfait ou remboursé</b> (à ajouter pour rassurer DAF)',
        '<b>Engagement</b> mensuel résiliable ou annuel -20 %',
        '<b>Bypass admin</b> : admin@greenconnect.cloud bénéficie d\'enterprise pour tests',
    ]))
    story.append(PageBreak())


def build_sales(story: list):
    story.append(Paragraph('9. Sales motion', s_h1()))
    story.append(hr())
    story.append(Paragraph('Modèle hybride PLG + sales-assist', s_h2()))
    story.append(Paragraph('<b>PLG (Product-Led Growth)</b> pour PME :', s_h3()))
    story.append(bullet([
        'Signup self-service → essai 14j → conversion auto Stripe',
        'Email automation séquence 14j (J0, J3, J7, J11, J13, J14, J21 si trial échu)',
        'Pas de sales humain sauf demande explicite',
    ]))
    story.append(Paragraph('<b>Sales-assist</b> pour ETI/Groupe :', s_h3()))
    story.append(bullet([
        'Formulaire « Demander une démo » sur landing',
        'Calendly intégré → démo perso 30 min',
        'Suivi CRM (HubSpot ou Brevo) → cycle 2-6 semaines',
        'KPI cible : 25 % conversion démo → trial → signature',
    ]))
    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph('Scripts & templates à préparer (priorité M1-M2)', s_h2()))
    story.append(numbered([
        'Email 1er contact outbound (5 versions A/B)',
        'Script démo 30 min (slides + scénarios)',
        'Email relance fin de trial (J11, J13)',
        'Email churn prevention (mois 6, mois 11)',
        'Email upgrade PME → ETI (signal : >10 users actifs)',
    ]))
    story.append(PageBreak())


def build_techstack(story: list):
    story.append(Paragraph('10. Tech stack marketing', s_h1()))
    story.append(hr())
    rows = [
        ['Outil',        'Catégorie',                'Coût/mois',  'Priorité'],
        ['Sentry ✓',     'Monitoring erreurs',        '30 €',       'En place'],
        ['Resend ✓',     'Emails transactionnels',     '0-40 €',     'En place'],
        ['Brevo (ou HubSpot Free)', 'CRM + email marketing', '0-30 €', 'M0'],
        ['Plausible ou Matomo',     'Analytics RGPD',        '9-20 €', 'M0'],
        ['Calendly',     'Booking démo',              '0-15 €',     'M0'],
        ['Notion / Linear', 'Roadmap publique',        '0 €',        'M0'],
        ['Tally / Typeform', 'Formulaires lead magnet', '25-50 €',   'M1'],
        ['Crisp / Intercom Lite', 'Chat in-app',       '25-99 €',   'M2'],
        ['Senja',        'Testimonials / témoignages',  '19 €',      'M2'],
        ['Ahrefs Lite',  'SEO research',               '99 €',      'M3'],
        ['Buffer / Hootsuite', 'Programmation LinkedIn', '15 €',    'M3'],
    ]
    story.append(table_with_header(rows, [50 * mm, 60 * mm, 25 * mm, 35 * mm]))
    story.append(Spacer(1, 4 * mm))
    story.append(callout(
        '<b>Total stack M0-M3 :</b> ~100 €/mois · <b>M3-M12 :</b> ~250-400 €/mois.',
        BLUE, BLUE_L, '💰'))
    story.append(PageBreak())


def build_kpis(story: list):
    story.append(Paragraph('11. KPIs & dashboard mensuel', s_h1()))
    story.append(hr())
    rows = [
        ['Métrique',                       'Cible M3', 'Cible M6', 'Cible M12'],
        ['Visiteurs uniques /mois',         '1 500',   '5 000',   '15 000'],
        ['Signups gratuits /mois',          '30',      '100',     '300'],
        ['Trial → paid conversion',         '5 %',     '8 %',     '12 %'],
        ['MRR (€)',                         '800',     '2 800',   '6 500'],
        ['CAC blended (€)',                 '1 500',   '1 000',   '700'],
        ['LTV (€) — estim.',                '1 800',   '2 400',   '3 200'],
        ['Ratio LTV/CAC',                   '1,2',     '2,4',     '4,6'],
        ['NPS',                             '30',      '40',      '50'],
        ['Churn mensuel',                   '< 5 %',   '< 4 %',   '< 3 %'],
        ['Pages indexées Google',           '30',      '80',      '250'],
        ['Backlinks DA>30',                 '5',       '25',      '80'],
    ]
    story.append(table_with_header(rows, [62 * mm, 30 * mm, 30 * mm, 30 * mm]))
    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph(
        '<b>Dashboard à monter</b> dans Google Looker Studio (gratuit) avec sources Stripe + Plausible + Brevo + Search Console. Cadence mensuelle de revue (1er lundi).',
        s_body()))
    story.append(PageBreak())


def build_plan90(story: list):
    story.append(Paragraph('12. Plan 90 jours (M0-M3) — actions concrètes', s_h1()))
    story.append(hr())

    months = [
        ('Mois 1 — Fondations & contenu pillier', [
            ('S1', 'SIRET dans Privacy + mentions, SPF/DKIM Resend vérifiés, rotation Stripe live key'),
            ('S1', 'Soumettre sitemap.xml à Google Search Console + Bing'),
            ('S2', 'Créer LinkedIn Company + post de lancement'),
            ('S2', 'Rédiger pillar #1 (Guide CSRD PME — 5k mots) — ✓ déjà livré'),
            ('S3', 'Setup Brevo CRM + 1ère séquence email post-trial — partiellement fait'),
            ('S3', 'Setup Plausible Analytics — code en place, activer compte'),
            ('S4', 'Publier pillar #1 + 3 satellites + diffusion LinkedIn'),
            ('S4', 'Demander 3 démos à des contacts du réseau (validation produit)'),
        ]),
        ('Mois 2 — Premiers leads & démo', [
            ('S5', 'Pillar #2 : "Bilan carbone entreprise" — ✓ déjà livré'),
            ('S5', 'Outreach 30 Directeurs RSE LinkedIn (personnalisé)'),
            ('S6', 'Lead magnet PDF "Check-list 47 ESRS" — ✓ déjà livré + landing'),
            ('S6', 'Webinaire #1 : "CSRD pour PME — par où commencer" (40-80 inscrits)'),
            ('S7', 'Pillar #3 : "CSDDD" — ✓ déjà livré'),
            ('S7', 'Inscriptions partenaires : 5 cabinets RSE + 2 experts-comptables'),
            ('S8', 'Bilan : conversion signup → trial > 30 % ? Ajuster funnel'),
        ]),
        ('Mois 3 — Outreach + premières signatures', [
            ('S9',  'Pillar #4 : "Taxonomie UE en pratique"'),
            ('S9',  'Refonte page tarifs avec FAQ + sceau "30j satisfait"'),
            ('S10', 'Lancement LinkedIn Ads budget 1 500 € / 4 semaines'),
            ('S10', 'Webinaire #2 + replay YouTube + clip TikTok/Reels'),
            ('S11', 'Premier salon professionnel (CCI, Bpifrance, ou similaire local)'),
            ('S11', '5 demandes de témoignages clients (early access compris)'),
            ('S12', 'Bilan trimestre : 5 paiements actifs, MRR > 400 €'),
        ]),
    ]

    for title, items in months:
        story.append(Paragraph(title, s_h2()))
        rows = [['Sem.', 'Action']]
        rows.extend([s, t] for s, t in items)
        story.append(table_with_header(rows, [18 * mm, 152 * mm]))
        story.append(Spacer(1, 4 * mm))

    story.append(PageBreak())


def build_plan12(story: list):
    story.append(Paragraph('13. Plan 12 mois (vision macro)', s_h1()))
    story.append(hr())
    rows = [
        ['Trimestre', 'Focus principal',                                        'MRR cible', 'Effectif'],
        ['T1 (M0-M3)', 'Fondations + SEO content + 1ers leads',                  '400 €',     '1 (founder)'],
        ['T2 (M4-M6)', 'Partenariats + paid ads + 1er recrutement (SDR / marketing)', '1 800 €', '1-2'],
        ['T3 (M7-M9)', 'Scaling SEO + 1er événement + SOC 2 Type I',             '3 800 €',   '2'],
        ['T4 (M10-M12)', 'Acquisition ETI + lever de fonds seed possible',       '6 500 €',   '2-3'],
    ]
    story.append(table_with_header(rows, [25 * mm, 90 * mm, 25 * mm, 30 * mm]))
    story.append(Spacer(1, 8 * mm))
    story.append(callout(
        '<b>Hypothèse macro :</b> si MRR cible 6 500 € atteint à M12, ARR = 78 000 €. <b>Ratio dépense marketing / ARR année 1 = ~50 %</b>, classique pour un SaaS B2B en démarrage. Viser 30 % à T2 année 2.',
        GREEN, GREEN_L, '📈'))
    story.append(PageBreak())


def build_risks(story: list):
    story.append(Paragraph('14. Risques marketing & mitigation', s_h1()))
    story.append(hr())
    rows = [
        ['Risque',                                       'Proba.', 'Impact',   'Mitigation'],
        ['Workiva entre sur le segment PME',              'Faible', 'Élevé',   'Verrouiller marché FR vite (3-6 mois) avec brand + références'],
        ['Sweep / Greenly lèvent et écrasent en SEO',    'Moyenne', 'Élevé',   'Pillar pages SEO durs à déloger + niche CSRD (eux = carbone)'],
        ['Omnibus CSRD réduit l\'obligation',             'Élevée', 'Moyen',   'Pivot message vers voluntary reporting + CSDDD + supply chain client'],
        ['Salaire founder trop bas',                      'Moyenne', 'Moyen',   'Levée pré-seed 200-500 k€ après 10 clients payants'],
        ['CAC > LTV',                                     'Faible', 'Critique','Bloquer paid ads tant que CAC < LTV/3'],
    ]
    story.append(table_with_header(rows, [55 * mm, 18 * mm, 18 * mm, 79 * mm]))
    story.append(PageBreak())


def build_budget(story: list):
    story.append(Paragraph('15. Budget marketing année 1', s_h1()))
    story.append(hr())
    rows = [
        ['Poste',                       'M0-M3',  'M4-M6',   'M7-M9',                  'M10-M12', 'Total'],
        ['SEO content (rédaction + IA)', '1 500 €', '1 500 €', '2 000 €',              '2 000 €', '7 000 €'],
        ['LinkedIn Ads',                 '0 €',     '4 500 €', '4 500 €',              '4 500 €', '13 500 €'],
        ['Outils & stack',               '300 €',   '600 €',   '900 €',                '1 200 €', '3 000 €'],
        ['Événements / salons',          '500 €',   '1 500 €', '6 000 € (Produrable)', '1 500 €', '9 500 €'],
        ['Lead magnets / production',    '500 €',   '1 000 €', '1 000 €',              '1 000 €', '3 500 €'],
        ['Avis G2 / Capterra (boost)',   '0 €',     '800 €',   '800 €',                '800 €',   '2 400 €'],
        ['TOTAL',                        '2 800 €', '9 900 €', '15 200 €',             '11 000 €','38 900 €'],
    ]
    t = table_with_header(rows, [50 * mm, 22 * mm, 22 * mm, 35 * mm, 22 * mm, 22 * mm])
    # Highlight TOTAL row
    last_row_idx = len(rows) - 1
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, last_row_idx), (-1, last_row_idx), GREEN_L),
        ('FONTNAME',   (0, last_row_idx), (-1, last_row_idx), 'Helvetica-Bold'),
    ]))
    story.append(t)
    story.append(PageBreak())


def build_quickwins(story: list):
    story.append(Paragraph('16. Quick wins immédiats', s_h1()))
    story.append(hr())

    story.append(Paragraph('Aujourd\'hui (15 min - 1 h chacun)', s_h2()))
    story.append(bullet([
        'Renseigner <b>SIRET</b> dans Privacy Policy + Mentions légales',
        'Soumettre <b>sitemap.xml</b> à Google Search Console',
        'Créer compte <b>LinkedIn Company</b> + post de lancement',
        'Activer <b>Plausible Analytics</b> (déjà câblé, juste set VITE_ANALYTICS_DOMAIN)',
    ]))

    story.append(Paragraph('Cette semaine', s_h2()))
    story.append(bullet([
        'Ajouter <b>/status</b> dans footer landing — ✓ déjà fait',
        'Vérifier <b>SPF + DKIM</b> verts dans Resend dashboard',
        'Tester welcome email en boîte de réception (pas spam)',
        'Demander 5 démos à votre réseau personnel (validation)',
        'Réserver compte <b>Brevo</b> (gratuit) + import 30 premiers contacts',
    ]))

    story.append(Paragraph('Ce mois-ci', s_h2()))
    story.append(bullet([
        '✓ Publier 1er article pillar 5 000+ mots (CSRD PME) — fait',
        '✓ Publier 2e pillar (Bilan Carbone) — fait',
        '✓ Publier 3e pillar (CSDDD) — fait',
        'Solliciter 3 premiers utilisateurs payants en early access (3 mois offerts contre témoignage public)',
        'Mettre en place tracking conversion Stripe → Brevo',
        'Animer 1 webinaire (40-80 inscrits) « CSRD : par où commencer »',
    ]))
    story.append(PageBreak())


def build_appendix(story: list):
    story.append(Paragraph('17. Annexes & ressources', s_h1()))
    story.append(hr())

    story.append(Paragraph('Sources réglementaires officielles', s_h2()))
    story.append(bullet([
        '<b>CSRD</b> : https://eur-lex.europa.eu/eli/dir/2022/2464',
        '<b>ESRS Set 1</b> (EFRAG) : https://www.efrag.org/lab6',
        '<b>Omnibus simplification</b> (Commission, Feb 2025) : https://commission.europa.eu',
        '<b>CSDDD</b> : https://eur-lex.europa.eu/eli/dir/2024/1760',
        '<b>Base Carbone® ADEME</b> : https://base-carbone.fr',
    ]))

    story.append(Paragraph('Concurrents à surveiller (alerts Google + LinkedIn)', s_h2()))
    story.append(Paragraph(
        'Workiva · Sweep · Persefoni · Plan A · Greenly · Apiday · EcoVadis · Watershed',
        s_body()))

    story.append(Paragraph('Réseaux professionnels à rejoindre', s_h2()))
    story.append(bullet([
        '<b>C3D</b> — Collège des Directeurs du Développement Durable',
        '<b>APCC</b> — Association Professionnelle des Consultants Climat',
        '<b>DFCG</b> — Directeurs Financiers de France (cible DAF)',
        '<b>Sustainable Brands France</b>',
        '<b>Climate Tech France</b>',
    ]))

    story.append(Paragraph('Médias à pitcher', s_h2()))
    story.append(bullet([
        '<b>Tech / startup :</b> Maddyness, Frenchweb, Welcome to the Jungle',
        '<b>RSE / impact :</b> Carenews, Republik Retail',
        '<b>Cible DAF :</b> DAF Magazine, Option Finance, AGEFI',
        '<b>Grand média :</b> Le Monde Énergie & Environnement (à plus long terme)',
    ]))

    story.append(Spacer(1, 10 * mm))
    story.append(hr(GRAY_M, 0.5))
    story.append(Paragraph(
        '<b>Document préparé pour GreenConnect SAS</b> · v1.0 · '
        f'{datetime.now().strftime("%B %Y").capitalize()}<br/>'
        'Prochaine révision recommandée : T3 2026 (après bilan M0-M6).',
        ParagraphStyle('appendix-foot', fontSize=9, textColor=GRAY, alignment=1,
                       leading=14)))


# ─── Main ────────────────────────────────────────────────────────────────────
def main():
    repo_root = Path(__file__).resolve().parent.parent
    out_dir = repo_root / 'docs'
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / 'ESG-Flow-Marketing-Strategy-2026.pdf'
    logo_path = repo_root / 'frontend' / 'public' / 'brand' / 'logo-mark-256.png'

    doc = SimpleDocTemplate(
        str(out_path), pagesize=A4,
        topMargin=22 * mm, bottomMargin=20 * mm,
        leftMargin=20 * mm, rightMargin=20 * mm,
        title='Stratégie Marketing ESG Flow 2026',
        author='GreenConnect SAS',
        subject='Plan d\'acquisition GTM PME / ETI françaises',
        creator='ESG Flow PDF generator',
    )

    story: list = []
    build_cover(story, str(logo_path))
    build_toc(story)
    build_executive(story)
    build_market(story)
    build_personas(story)
    build_positioning(story)
    build_competitors(story)
    build_funnel(story)
    build_channels(story)
    build_pricing(story)
    build_sales(story)
    build_techstack(story)
    build_kpis(story)
    build_plan90(story)
    build_plan12(story)
    build_risks(story)
    build_budget(story)
    build_quickwins(story)
    build_appendix(story)

    first_cb, later_cb = make_callbacks(datetime.now().strftime('%d/%m/%Y'))
    doc.build(story, onFirstPage=first_cb, onLaterPages=later_cb)

    size_kb = out_path.stat().st_size / 1024
    print(f'PDF generated: {out_path}')
    print(f'Size: {size_kb:.1f} KB · pages: ~{len(story) // 10}')


if __name__ == '__main__':
    main()
