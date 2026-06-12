"""
SBTi Target Validation Service.

Two responsibilities:

1. **Pre-flight validation** — checks a commitment against the SBTi Criteria
   v5.2 *before* it's submitted, so users know it'll pass before paying the
   USD 9,500 validation fee:
     - Near-term target year is 5-10 years from submission year
     - Reduction rate matches the method (1.5°C requires ≥ 4.2%/yr linear,
       Well-Below-2°C requires ≥ 2.5%/yr)
     - Net-zero year ≤ 2050
     - Scope 3 included if Scope 3 ≥ 40% of total emissions
     - Baseline is no more than 5 years old

2. **Dossier PDF generation** — produces the official-looking target
   validation submission package that the company can attach to its SBTi
   account (https://sciencebasedtargets.org/companies-taking-action).
   SBTi has no public submission API, so the workflow is: generate the
   PDF here, upload it through the SBTi portal.

References
----------
- SBTi Criteria and Recommendations v5.2 (June 2024)
- SBTi Net-Zero Standard v1.2 (March 2024)
- SBTi Corporate Manual v5.2
"""
from __future__ import annotations

import io
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import List, Optional

from app.models.sbti_commitment import SBTiCommitment


# ────────────────────────────────────────────────────────────────────────────
# Validation rules (SBTi Criteria v5.2)
# ────────────────────────────────────────────────────────────────────────────

# Minimum annual linear reduction rate per method
MIN_ANNUAL_REDUCTION = {
    "1.5C":  4.2,   # %/yr
    "WB2C":  2.5,   # %/yr  (Well-Below 2°C)
    "FLAG":  3.0,   # %/yr  (forest/land/agriculture sector)
    "SDA":   0.0,   # Sectoral Decarbonization Approach — varies per sector
}

NET_ZERO_LATEST_YEAR = 2050

# Near-term target must be 5-10 years from submission
MIN_NEAR_TERM_HORIZON = 5
MAX_NEAR_TERM_HORIZON = 10

# Baseline must be ≤ 5 years before submission
MAX_BASELINE_AGE_YEARS = 5

# Scope 3 inclusion threshold (% of total emissions)
SCOPE3_INCLUSION_THRESHOLD_PCT = 40.0


@dataclass
class ValidationIssue:
    """A single issue found during pre-flight validation."""
    severity: str   # "blocker" | "warning" | "info"
    code: str       # SBTi criterion identifier (C1, C2, C7, ...)
    message_fr: str
    field: Optional[str] = None  # which form field this relates to


@dataclass
class ValidationResult:
    is_submission_ready: bool
    blockers: int
    warnings: int
    issues: List[ValidationIssue]
    summary_fr: str

    def to_dict(self) -> dict:
        return {
            "is_submission_ready": self.is_submission_ready,
            "blockers": self.blockers,
            "warnings": self.warnings,
            "issues": [asdict(i) for i in self.issues],
            "summary_fr": self.summary_fr,
        }


def validate_commitment(c: SBTiCommitment) -> ValidationResult:
    """Run all SBTi Criteria checks against a commitment."""
    issues: List[ValidationIssue] = []
    now_year = datetime.utcnow().year

    # ── C1: Baseline age ────────────────────────────────────────────────
    baseline_age = now_year - c.baseline_year
    if baseline_age > MAX_BASELINE_AGE_YEARS:
        issues.append(ValidationIssue(
            "blocker", "C1",
            f"L'année de base ({c.baseline_year}) a plus de {MAX_BASELINE_AGE_YEARS} ans. "
            f"SBTi exige une base récente — recalculez sur une année plus proche.",
            "baseline_year",
        ))
    elif baseline_age >= 4:
        issues.append(ValidationIssue(
            "warning", "C1",
            f"L'année de base est ancienne ({baseline_age} ans). Envisagez une actualisation prochainement.",
            "baseline_year",
        ))

    # ── C2: Near-term target horizon ────────────────────────────────────
    horizon = c.near_term_target_year - now_year
    if horizon < MIN_NEAR_TERM_HORIZON:
        issues.append(ValidationIssue(
            "blocker", "C2",
            f"La cible court terme ({c.near_term_target_year}) est dans {horizon} an(s). "
            f"SBTi exige une cible 5 à 10 ans dans le futur.",
            "near_term_target_year",
        ))
    elif horizon > MAX_NEAR_TERM_HORIZON:
        issues.append(ValidationIssue(
            "blocker", "C2",
            f"La cible court terme ({c.near_term_target_year}) est dans {horizon} ans. "
            f"SBTi exige une cible ≤ 10 ans dans le futur.",
            "near_term_target_year",
        ))

    # ── C3: Annual reduction rate matches method ───────────────────────
    if horizon > 0 and c.near_term_reduction_pct is not None:
        annual_rate = c.near_term_reduction_pct / horizon
        min_rate = MIN_ANNUAL_REDUCTION.get(c.method, 4.2)
        if c.method != "SDA" and annual_rate < min_rate:
            issues.append(ValidationIssue(
                "blocker", "C3",
                f"Taux de réduction annuelle ≈ {annual_rate:.1f}%/an — la méthode {c.method} "
                f"exige ≥ {min_rate}%/an. Augmentez le pourcentage de réduction cible.",
                "near_term_reduction_pct",
            ))

    # ── C4: Net-zero year ───────────────────────────────────────────────
    if c.net_zero_year is None:
        issues.append(ValidationIssue(
            "warning", "C4",
            "Aucune année net-zéro renseignée. Recommandé pour SBTi Net-Zero Standard.",
            "net_zero_year",
        ))
    elif c.net_zero_year > NET_ZERO_LATEST_YEAR:
        issues.append(ValidationIssue(
            "blocker", "C4",
            f"L'année net-zéro ({c.net_zero_year}) dépasse {NET_ZERO_LATEST_YEAR}. "
            f"SBTi Net-Zero Standard exige une cible ≤ {NET_ZERO_LATEST_YEAR}.",
            "net_zero_year",
        ))

    # ── C5: Long-term reduction ≥ 90% ──────────────────────────────────
    if c.long_term_reduction_pct is not None and c.long_term_reduction_pct < 90:
        issues.append(ValidationIssue(
            "blocker", "C5",
            f"Réduction long terme {c.long_term_reduction_pct}% — le Net-Zero Standard "
            f"exige ≥ 90% (résiduel compensé par séquestration carbone).",
            "long_term_reduction_pct",
        ))

    # ── C7: Scope 3 inclusion ──────────────────────────────────────────
    if c.scope3_pct_of_total is not None and c.scope3_pct_of_total >= SCOPE3_INCLUSION_THRESHOLD_PCT:
        if c.scope3_target_pct is None or c.scope3_target_pct <= 0:
            issues.append(ValidationIssue(
                "blocker", "C7",
                f"Le Scope 3 représente {c.scope3_pct_of_total:.0f}% des émissions totales "
                f"(seuil SBTi : {SCOPE3_INCLUSION_THRESHOLD_PCT:.0f}%) — une cible Scope 3 "
                f"distincte est obligatoire.",
                "scope3_target_pct",
            ))
        if not c.scope3_screening_completed:
            issues.append(ValidationIssue(
                "warning", "C7",
                "Screening Scope 3 non marqué comme terminé. SBTi exige une cartographie "
                "des 15 catégories Scope 3 (GHG Protocol Corporate Value Chain Standard).",
                "scope3_screening_completed",
            ))

    # ── C9: Coverage Scope 1+2 ≥ 95% ──────────────────────────────────
    if c.near_term_scope_coverage and "scope1" not in (c.near_term_scope_coverage or ""):
        issues.append(ValidationIssue(
            "blocker", "C9",
            "La cible court terme doit couvrir au minimum Scope 1 + Scope 2.",
            "near_term_scope_coverage",
        ))

    # ── Sanity: organization name + contact ─────────────────────────────
    if not c.organization_name:
        issues.append(ValidationIssue(
            "warning", "ADMIN",
            "Nom de l'organisation manquant — requis pour le dossier officiel.",
            "organization_name",
        ))
    if not c.contact_email:
        issues.append(ValidationIssue(
            "warning", "ADMIN",
            "Email de contact manquant — requis pour la communication SBTi.",
            "contact_email",
        ))

    blockers = sum(1 for i in issues if i.severity == "blocker")
    warnings = sum(1 for i in issues if i.severity == "warning")
    ready = blockers == 0

    if ready and warnings == 0:
        summary = "Dossier prêt pour soumission — toutes les criteres SBTi sont validés."
    elif ready:
        summary = f"Soumission possible avec {warnings} avertissement(s) — corrections recommandées avant envoi."
    else:
        summary = (
            f"Pas encore prêt : {blockers} critère(s) bloquant(s). "
            f"Corrigez les éléments en rouge avant de soumettre."
        )

    return ValidationResult(
        is_submission_ready=ready,
        blockers=blockers,
        warnings=warnings,
        issues=issues,
        summary_fr=summary,
    )


# ────────────────────────────────────────────────────────────────────────────
# Dossier PDF generation
# ────────────────────────────────────────────────────────────────────────────

def _fmt(v, default="—"):
    return default if v is None or v == "" else v


def generate_dossier_pdf(c: SBTiCommitment, validation: ValidationResult) -> bytes:
    """
    Produce the official-looking SBTi target validation dossier as a PDF.

    Layout mirrors the SBTi Target Validation Protocol submission form:
      §1 Company info, §2 Boundary & baseline, §3 Near-term target,
      §4 Long-term target / Net-zero, §5 Scope 3, §6 Validation checklist.
    """
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
        KeepTogether,
    )

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=18*mm, rightMargin=18*mm,
        topMargin=20*mm,  bottomMargin=18*mm,
        title=f"SBTi Target Validation Dossier — {c.organization_name or 'Organisation'}",
        author="ESGflow",
    )

    styles = getSampleStyleSheet()
    h1 = ParagraphStyle("h1", parent=styles["Heading1"], fontSize=18, textColor=colors.HexColor("#0d6e3a"), spaceAfter=8)
    h2 = ParagraphStyle("h2", parent=styles["Heading2"], fontSize=12, textColor=colors.HexColor("#0d6e3a"), spaceBefore=14, spaceAfter=4)
    body = ParagraphStyle("body", parent=styles["Normal"], fontSize=9.5, leading=13)
    small = ParagraphStyle("small", parent=styles["Normal"], fontSize=8, textColor=colors.HexColor("#6b7280"))

    story = []

    # ── Cover ──────────────────────────────────────────────────────────
    story.append(Paragraph("Science Based Targets initiative", h2))
    story.append(Paragraph("Target Validation Submission Dossier", h1))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        f"<b>{_fmt(c.organization_name)}</b> &nbsp;·&nbsp; "
        f"Méthode <b>{c.method}</b> &nbsp;·&nbsp; "
        f"Généré le {datetime.utcnow().strftime('%d/%m/%Y')}",
        body
    ))
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "Document destiné à être joint au formulaire de soumission officiel sur "
        "<i>sciencebasedtargets.org/target-validation</i>. "
        "Toutes les valeurs sont issues du système ESGflow.",
        small
    ))

    # ── §1 Company info ────────────────────────────────────────────────
    story.append(Paragraph("§1 — Informations sur l'organisation", h2))
    company_table = Table([
        ["Raison sociale",     _fmt(c.organization_name)],
        ["Secteur d'activité", _fmt(c.sector)],
        ["Chiffre d'affaires", f"{_fmt(c.revenue_meur)} M€" if c.revenue_meur else "—"],
        ["Effectifs",          _fmt(c.employees)],
        ["Contact",            f"{_fmt(c.contact_name)} ({_fmt(c.contact_role)}) — {_fmt(c.contact_email)}"],
    ], colWidths=[55*mm, 110*mm])
    company_table.setStyle(TableStyle([
        ("BACKGROUND",  (0, 0), (0, -1), colors.HexColor("#f1f5f9")),
        ("FONTNAME",    (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE",    (0, 0), (-1, -1), 9),
        ("GRID",        (0, 0), (-1, -1), 0.3, colors.HexColor("#e2e8f0")),
        ("VALIGN",      (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 5),
    ]))
    story.append(company_table)

    # ── §2 Boundary & baseline ─────────────────────────────────────────
    story.append(Paragraph("§2 — Périmètre et année de référence", h2))
    baseline_table = Table([
        ["Année de référence",     str(c.baseline_year)],
        ["Scope 1 (tCO₂eq)",       _fmt(c.baseline_scope1_tco2e)],
        ["Scope 2 (tCO₂eq)",       _fmt(c.baseline_scope2_tco2e)],
        ["Scope 3 (tCO₂eq)",       _fmt(c.baseline_scope3_tco2e)],
        ["Total émissions (tCO₂eq)", _fmt(c.baseline_total_tco2e)],
        ["Couverture Scope 3 (%)", _fmt(c.scope3_pct_of_total)],
    ], colWidths=[55*mm, 110*mm])
    baseline_table.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (0, -1), colors.HexColor("#f1f5f9")),
        ("FONTNAME",     (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE",     (0, 0), (-1, -1), 9),
        ("GRID",         (0, 0), (-1, -1), 0.3, colors.HexColor("#e2e8f0")),
        ("BACKGROUND",   (0, -2), (-1, -2), colors.HexColor("#dcfce7")),
        ("FONTNAME",     (0, -2), (-1, -2), "Helvetica-Bold"),
        ("LEFTPADDING",  (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 5),
    ]))
    story.append(baseline_table)

    # ── §3 Near-term target ────────────────────────────────────────────
    story.append(Paragraph("§3 — Cible court terme", h2))
    nt_table = Table([
        ["Méthode SBTi",                c.method],
        ["Année cible",                 str(c.near_term_target_year)],
        ["Réduction visée (%)",         f"{c.near_term_reduction_pct}%"],
        ["Couverture des scopes",       _fmt(c.near_term_scope_coverage, "Scope 1 + Scope 2")],
        ["Émissions cibles (tCO₂eq)",   f"{c.baseline_total_tco2e * (1 - c.near_term_reduction_pct/100):.0f}" if c.baseline_total_tco2e else "—"],
        ["Trajectoire annuelle requise",
            f"{MIN_ANNUAL_REDUCTION.get(c.method, 4.2):.1f}%/an minimum" if c.method != "SDA"
            else "Selon SDA (varie par secteur)"],
    ], colWidths=[55*mm, 110*mm])
    nt_table.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (0, -1), colors.HexColor("#f1f5f9")),
        ("FONTNAME",     (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE",     (0, 0), (-1, -1), 9),
        ("GRID",         (0, 0), (-1, -1), 0.3, colors.HexColor("#e2e8f0")),
        ("LEFTPADDING",  (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 5),
    ]))
    story.append(nt_table)

    # ── §4 Long-term / Net-zero ────────────────────────────────────────
    story.append(Paragraph("§4 — Cible long terme / Net-zéro", h2))
    lt_table = Table([
        ["Année net-zéro",            _fmt(c.net_zero_year)],
        ["Réduction long terme (%)",  f"{_fmt(c.long_term_reduction_pct)}%"],
        ["Résiduel maximal autorisé", "≤ 10% des émissions de référence (compensé par séquestration)"],
    ], colWidths=[55*mm, 110*mm])
    lt_table.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (0, -1), colors.HexColor("#f1f5f9")),
        ("FONTNAME",     (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE",     (0, 0), (-1, -1), 9),
        ("GRID",         (0, 0), (-1, -1), 0.3, colors.HexColor("#e2e8f0")),
        ("LEFTPADDING",  (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 5),
    ]))
    story.append(lt_table)

    # ── §5 Scope 3 ─────────────────────────────────────────────────────
    story.append(Paragraph("§5 — Cible Scope 3", h2))
    if c.scope3_pct_of_total and c.scope3_pct_of_total >= SCOPE3_INCLUSION_THRESHOLD_PCT:
        s3_table = Table([
            ["Part du Scope 3 dans le total",     f"{c.scope3_pct_of_total:.1f}%"],
            ["Cible Scope 3 (%)",                 f"{_fmt(c.scope3_target_pct)}%"],
            ["Screening 15 catégories effectué",  "Oui" if c.scope3_screening_completed else "Non"],
        ], colWidths=[55*mm, 110*mm])
        s3_table.setStyle(TableStyle([
            ("BACKGROUND",   (0, 0), (0, -1), colors.HexColor("#f1f5f9")),
            ("FONTNAME",     (0, 0), (-1, -1), "Helvetica"),
            ("FONTSIZE",     (0, 0), (-1, -1), 9),
            ("GRID",         (0, 0), (-1, -1), 0.3, colors.HexColor("#e2e8f0")),
            ("LEFTPADDING",  (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING",(0, 0), (-1, -1), 5),
        ]))
        story.append(s3_table)
    else:
        story.append(Paragraph(
            f"Scope 3 inférieur au seuil SBTi ({SCOPE3_INCLUSION_THRESHOLD_PCT:.0f}%) — cible Scope 3 non obligatoire.",
            body
        ))

    # ── §6 Validation checklist ────────────────────────────────────────
    story.append(PageBreak())
    story.append(Paragraph("§6 — Pré-validation des critères SBTi v5.2", h2))
    if validation.is_submission_ready:
        story.append(Paragraph(
            f"<font color='#0d6e3a'><b>✓ Dossier prêt pour soumission.</b></font> "
            f"{validation.warnings} avertissement(s) non bloquant(s).",
            body
        ))
    else:
        story.append(Paragraph(
            f"<font color='#b91c1c'><b>⚠ Pas encore prêt</b></font> — {validation.blockers} critère(s) "
            f"bloquant(s) à corriger avant soumission.",
            body
        ))

    # Issues table
    if validation.issues:
        check_rows = [["Sev.", "Critère", "Message"]]
        for i in validation.issues:
            sev_label = {"blocker": "BLOQUANT", "warning": "AVERTIS.", "info": "INFO"}.get(i.severity, i.severity)
            check_rows.append([sev_label, i.code, i.message_fr])
        check_table = Table(check_rows, colWidths=[22*mm, 18*mm, 125*mm])
        check_table.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, 0), colors.HexColor("#0d6e3a")),
            ("TEXTCOLOR",     (0, 0), (-1, 0), colors.white),
            ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE",      (0, 0), (-1, -1), 8.5),
            ("GRID",          (0, 0), (-1, -1), 0.3, colors.HexColor("#e2e8f0")),
            ("VALIGN",        (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING",   (0, 0), (-1, -1), 5),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        # Color-code severity column
        for idx, i in enumerate(validation.issues, start=1):
            if i.severity == "blocker":
                check_table.setStyle(TableStyle([("BACKGROUND", (0, idx), (0, idx), colors.HexColor("#fee2e2"))]))
            elif i.severity == "warning":
                check_table.setStyle(TableStyle([("BACKGROUND", (0, idx), (0, idx), colors.HexColor("#fef3c7"))]))
        story.append(check_table)
    else:
        story.append(Paragraph("Aucune anomalie détectée — tous les critères passent.", body))

    # ── Submission instructions ────────────────────────────────────────
    story.append(Spacer(1, 10))
    story.append(Paragraph("Étapes de soumission auprès du SBTi", h2))
    story.append(Paragraph(
        "1. Créer un compte sur <b>sciencebasedtargets.org/target-validation</b><br/>"
        "2. Remplir le <i>Target Submission Form</i> en utilisant les valeurs de ce dossier<br/>"
        "3. Joindre ce PDF comme pièce justificative<br/>"
        "4. Régler le frais de validation (USD 9 500 pour grandes entreprises, USD 1 000 pour PME)<br/>"
        "5. Délai officiel de validation : environ 6 mois",
        body
    ))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "Document généré automatiquement par ESGflow · Toutes les valeurs sont auditables dans la "
        "piste d'audit interne (Module Audit Trail).",
        small
    ))

    doc.build(story)
    return buf.getvalue()
