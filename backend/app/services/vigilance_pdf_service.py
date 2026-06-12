"""
Vigilance PDF Service — generate the Plan de vigilance as a PDF.

The output structure follows the AFA / Sherpa / Forum Citoyen pour la
RSE recommended layout for vigilance plans:

  1. Présentation de la société + périmètre couvert
  2. Cartographie des risques (résumé + tableau matrice)
  3. Procédures d'évaluation régulière
  4. Actions d'atténuation
  5. Mécanisme d'alerte
  6. Dispositif de suivi + évaluation
  7. Annexes (liste détaillée risques / actions / alertes)
"""
from __future__ import annotations

import io
from datetime import datetime
from typing import List

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether,
)

from app.models.vigilance import (
    VigilancePlan, VigilanceRisk, VigilanceAction, VigilanceAlert,
)

# ── Style palette ───────────────────────────────────────────────────────────
EMERALD = colors.HexColor("#064e3b")
EMERALD_SOFT = colors.HexColor("#d1fae5")
SLATE = colors.HexColor("#475569")
GRID = colors.HexColor("#cbd5e1")


def _styles():
    base = getSampleStyleSheet()
    base.add(ParagraphStyle(
        name="VigilanceTitle",
        parent=base["Title"],
        fontSize=22, textColor=EMERALD, spaceAfter=6, leading=26,
    ))
    base.add(ParagraphStyle(
        name="VigilanceSubtitle",
        parent=base["Normal"],
        fontSize=11, textColor=SLATE, spaceAfter=14, alignment=TA_CENTER,
    ))
    base.add(ParagraphStyle(
        name="SectionHeader",
        parent=base["Heading1"],
        fontSize=14, textColor=EMERALD, spaceBefore=18, spaceAfter=8,
        leading=18,
    ))
    base.add(ParagraphStyle(
        name="SubHeader",
        parent=base["Heading2"],
        fontSize=11, textColor=SLATE, spaceBefore=10, spaceAfter=4,
    ))
    base.add(ParagraphStyle(
        name="Body",
        parent=base["Normal"],
        fontSize=10, alignment=TA_JUSTIFY, leading=14, spaceAfter=6,
    ))
    base.add(ParagraphStyle(
        name="Small",
        parent=base["Normal"],
        fontSize=8.5, textColor=SLATE, leading=11,
    ))
    return base


_CATEGORY_LABELS = {
    "human_rights": "Droits humains",
    "freedoms": "Libertés fondamentales",
    "health_safety": "Santé & sécurité",
    "environment": "Environnement",
    "labor_rights": "Droits du travail",
    "corruption": "Corruption (Sapin 2)",
    "data_privacy": "Vie privée / RGPD",
    "other": "Autre",
}

_SCOPE_LABELS = {
    "own_operations": "Activités propres",
    "subsidiaries": "Filiales",
    "tier1_suppliers": "Fournisseurs directs",
    "tier2_plus": "Fournisseurs indirects",
    "subcontractors": "Sous-traitants",
    "clients": "Clients",
}

_STATUS_LABELS = {
    "planned": "Planifiée",
    "in_progress": "En cours",
    "done": "Terminée",
    "blocked": "Bloquée",
    "cancelled": "Annulée",
    "new": "Nouvelle",
    "under_review": "En examen",
    "investigating": "Enquête",
    "action_taken": "Action prise",
    "closed": "Clôturée",
    "dismissed": "Écartée",
}


def _heatmap_table(risks: List[VigilanceRisk]) -> Table:
    """Render the 5×5 severity (rows) × likelihood (cols) heatmap."""
    matrix = [[0] * 5 for _ in range(5)]
    for r in risks:
        sev = max(1, min(5, r.severity))
        lik = max(1, min(5, r.likelihood))
        matrix[sev - 1][lik - 1] += 1

    # Header row: probability levels
    data = [["Sévérité \\ Probabilité", "1 - Rare", "2 - Faible", "3 - Possible", "4 - Probable", "5 - Certain"]]
    sev_labels = ["1 - Mineure", "2 - Modérée", "3 - Significative", "4 - Majeure", "5 - Critique"]
    # Reverse so 5 (most severe) is on top
    for i in range(4, -1, -1):
        row = [sev_labels[i]]
        for j in range(5):
            row.append(str(matrix[i][j]) if matrix[i][j] > 0 else "—")
        data.append(row)

    t = Table(data, colWidths=[3.6 * cm] + [2.4 * cm] * 5)
    style = TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), EMERALD),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("GRID", (0, 0), (-1, -1), 0.5, GRID),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
        ("BACKGROUND", (0, 1), (0, -1), EMERALD_SOFT),
    ])
    # Color code cells by gross_score = sev * lik
    for i in range(5):
        for j in range(5):
            row_idx = 5 - i  # because we reversed
            sev = i + 1
            lik = j + 1
            score = sev * lik
            if score >= 15:
                bg = colors.HexColor("#fecaca")  # red light
            elif score >= 8:
                bg = colors.HexColor("#fed7aa")  # amber light
            elif score >= 4:
                bg = colors.HexColor("#fef3c7")  # yellow light
            else:
                bg = colors.HexColor("#d1fae5")  # green light
            style.add("BACKGROUND", (j + 1, row_idx), (j + 1, row_idx), bg)
    t.setStyle(style)
    return t


def _risks_table(risks: List[VigilanceRisk]) -> Table:
    rows = [["#", "Risque", "Catégorie", "Périmètre", "Brut", "Résiduel"]]
    for i, r in enumerate(risks, start=1):
        residual = (
            f"{r.residual_severity * r.residual_likelihood}"
            if r.residual_severity and r.residual_likelihood else "—"
        )
        rows.append([
            str(i),
            r.title[:55] + ("…" if len(r.title) > 55 else ""),
            _CATEGORY_LABELS.get(r.category, r.category),
            _SCOPE_LABELS.get(r.scope, r.scope),
            f"{r.severity * r.likelihood}",
            residual,
        ])
    if not risks:
        rows.append(["—", "Aucun risque enregistré.", "", "", "", ""])

    t = Table(rows, colWidths=[0.8 * cm, 6.5 * cm, 3.2 * cm, 3.3 * cm, 1.5 * cm, 1.8 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), EMERALD),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8.5),
        ("FONTSIZE", (0, 1), (-1, -1), 8.5),
        ("ALIGN", (4, 1), (5, -1), "CENTER"),
        ("ALIGN", (0, 1), (0, -1), "CENTER"),
        ("GRID", (0, 0), (-1, -1), 0.4, GRID),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
    ]))
    return t


def _actions_table(actions: List[VigilanceAction]) -> Table:
    rows = [["Action", "Statut", "Échéance", "Priorité", "Budget €"]]
    for a in actions:
        rows.append([
            a.title[:60] + ("…" if len(a.title) > 60 else ""),
            _STATUS_LABELS.get(a.status, a.status),
            a.deadline.isoformat() if a.deadline else "—",
            a.priority,
            f"{a.budget_eur:,}".replace(",", " ") if a.budget_eur else "—",
        ])
    if not actions:
        rows.append(["Aucune action enregistrée.", "", "", "", ""])

    t = Table(rows, colWidths=[8 * cm, 2.5 * cm, 2.4 * cm, 2 * cm, 2.2 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), EMERALD),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8.5),
        ("FONTSIZE", (0, 1), (-1, -1), 8.5),
        ("GRID", (0, 0), (-1, -1), 0.4, GRID),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
    ]))
    return t


def generate_vigilance_pdf(
    plan: VigilancePlan,
    risks: List[VigilanceRisk],
    actions: List[VigilanceAction],
    alerts: List[VigilanceAlert],
) -> bytes:
    """Build the Plan de vigilance PDF and return its bytes."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=2 * cm, rightMargin=2 * cm,
        topMargin=2 * cm, bottomMargin=2 * cm,
        title=f"Plan de vigilance {plan.year}",
    )
    styles = _styles()
    story = []

    # ── Cover ───────────────────────────────────────────────────────────────
    story.append(Spacer(1, 4 * cm))
    story.append(Paragraph(f"Plan de vigilance {plan.year}", styles["VigilanceTitle"]))
    story.append(Paragraph(
        "Article L225-102-4 du Code de commerce — Loi n°2017-399 du 27 mars 2017",
        styles["VigilanceSubtitle"],
    ))
    story.append(Spacer(1, 2 * cm))
    cover_data = [
        ["Année de référence", str(plan.year)],
        ["Statut du plan", _STATUS_LABELS.get(plan.status, plan.status).capitalize()],
        ["Périmètre — Filiales", "✓ Inclus" if plan.covers_subsidiaries else "✗ Hors périmètre"],
        ["Périmètre — Fournisseurs", "✓ Inclus" if plan.covers_suppliers else "✗ Hors périmètre"],
        ["Périmètre — Sous-traitants", "✓ Inclus" if plan.covers_subcontractors else "✗ Hors périmètre"],
        ["Risques identifiés", str(len(risks))],
        ["Actions d'atténuation", str(len(actions))],
        ["Alertes (cumul)", str(len(alerts))],
        ["Date d'édition", datetime.now().strftime("%d/%m/%Y")],
    ]
    cover_table = Table(cover_data, colWidths=[6 * cm, 8 * cm])
    cover_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("BACKGROUND", (0, 0), (0, -1), EMERALD_SOFT),
        ("GRID", (0, 0), (-1, -1), 0.4, GRID),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(cover_table)
    story.append(PageBreak())

    # ── 1. Présentation & périmètre ─────────────────────────────────────────
    story.append(Paragraph("1. Présentation et périmètre", styles["SectionHeader"]))
    story.append(Paragraph(
        "Le présent plan de vigilance est établi en application de l'article L225-102-4 "
        "du Code de commerce. Il identifie les risques d'atteintes graves envers les "
        "droits humains et libertés fondamentales, la santé et la sécurité des personnes "
        "ainsi que l'environnement, résultant des activités de la société, de ses "
        "filiales et de la chaîne de valeur (fournisseurs et sous-traitants).",
        styles["Body"],
    ))

    if plan.stakeholders_consulted:
        story.append(Paragraph("Parties prenantes consultées", styles["SubHeader"]))
        story.append(Paragraph(plan.stakeholders_consulted, styles["Body"]))

    # ── 2. Cartographie des risques ─────────────────────────────────────────
    story.append(Paragraph("2. Cartographie des risques", styles["SectionHeader"]))
    if plan.risk_mapping_summary:
        story.append(Paragraph(plan.risk_mapping_summary, styles["Body"]))
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph("Matrice sévérité × probabilité", styles["SubHeader"]))
    story.append(_heatmap_table(risks))
    story.append(Spacer(1, 0.5 * cm))
    story.append(Paragraph(
        f"Sur {len(risks)} risque(s) identifié(s), "
        f"{sum(1 for r in risks if r.severity * r.likelihood >= 15)} sont classés critiques "
        f"(score brut ≥ 15) et nécessitent un plan d'action prioritaire.",
        styles["Small"],
    ))

    # ── 3. Procédures d'évaluation ──────────────────────────────────────────
    story.append(Paragraph("3. Procédures d'évaluation régulière", styles["SectionHeader"]))
    story.append(Paragraph(
        plan.assessment_procedures or
        "Procédures d'évaluation à compléter : audits, questionnaires fournisseurs, "
        "visites de sites, due diligence pré-contractuelle, indicateurs de suivi.",
        styles["Body"],
    ))

    # ── 4. Actions d'atténuation ────────────────────────────────────────────
    story.append(Paragraph("4. Actions adaptées d'atténuation des risques", styles["SectionHeader"]))
    if plan.mitigation_actions:
        story.append(Paragraph(plan.mitigation_actions, styles["Body"]))

    # ── 5. Mécanisme d'alerte ───────────────────────────────────────────────
    story.append(Paragraph("5. Mécanisme d'alerte et de recueil des signalements", styles["SectionHeader"]))
    story.append(Paragraph(
        plan.alert_mechanism or
        "Le mécanisme d'alerte permet à tout collaborateur, fournisseur ou partie prenante "
        "de signaler une atteinte grave de manière confidentielle et, le cas échéant, anonyme. "
        "Les signalements sont enregistrés dans un registre dédié, instruits par une cellule "
        "indépendante et tracés jusqu'à leur clôture.",
        styles["Body"],
    ))
    alert_stats = [
        ["Indicateur", "Cumul", "Année courante"],
        ["Signalements reçus", str(len(alerts)),
         str(sum(1 for a in alerts if a.created_at.year == datetime.now().year))],
        ["Signalements clôturés", str(sum(1 for a in alerts if a.status in {"closed", "dismissed"})),
         str(sum(1 for a in alerts if a.status in {"closed", "dismissed"}
                 and a.created_at.year == datetime.now().year))],
        ["Signalements ouverts", str(sum(1 for a in alerts if a.status not in {"closed", "dismissed"})),
         str(sum(1 for a in alerts if a.status not in {"closed", "dismissed"}
                 and a.created_at.year == datetime.now().year))],
    ]
    alert_table = Table(alert_stats, colWidths=[8 * cm, 3 * cm, 3.5 * cm])
    alert_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), EMERALD),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.4, GRID),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
    ]))
    story.append(Spacer(1, 0.3 * cm))
    story.append(alert_table)

    # ── 6. Suivi & évaluation ───────────────────────────────────────────────
    story.append(Paragraph("6. Dispositif de suivi des mesures et évaluation", styles["SectionHeader"]))
    story.append(Paragraph(
        plan.monitoring_scheme or
        "Le dispositif de suivi assure le pilotage régulier des actions d'atténuation, "
        "mesure leur efficacité (réduction du risque résiduel) et alimente la révision "
        "annuelle du plan de vigilance.",
        styles["Body"],
    ))

    # ── Annexe — Détail des risques ─────────────────────────────────────────
    story.append(PageBreak())
    story.append(Paragraph("Annexe A — Détail des risques", styles["SectionHeader"]))
    story.append(_risks_table(risks))

    # ── Annexe — Détail des actions ─────────────────────────────────────────
    if actions:
        story.append(Spacer(1, 0.5 * cm))
        story.append(Paragraph("Annexe B — Détail des actions d'atténuation", styles["SectionHeader"]))
        story.append(_actions_table(actions))

    # ── Footer note ─────────────────────────────────────────────────────────
    story.append(Spacer(1, 1 * cm))
    story.append(Paragraph(
        "Document généré automatiquement par ESG Flow. "
        "Conforme aux exigences de l'Article L225-102-4 du Code de commerce. "
        "Doit être intégré au rapport de gestion annuel et publié sur le site internet de la société.",
        styles["Small"],
    ))

    doc.build(story)
    buf.seek(0)
    return buf.read()
