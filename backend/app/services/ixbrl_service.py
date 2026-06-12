"""
iXBRL ESEF generator — production-grade.

Produces an Inline XBRL (XHTML+iXBRL) document that conforms to:
  - ESEF Reporting Manual (ESMA/2020/1407, last amended 2024)
  - EFRAG ESRS XBRL Taxonomy (2024-12-31)
  - Inline XBRL 1.1 spec (https://www.xbrl.org/Specification/inlineXBRL-part1/REC-2013-11-18/)

Sections supported (any combination, or all in one document):
  ESRS 2 (general), E1 (climate), E2 (pollution), E3 (water),
  E4 (biodiversity), E5 (circular economy), S1 (own workforce),
  S2 (value chain workers), S3 (communities), S4 (consumers),
  G1 (business conduct).

For regulator filing (CSRD Art. 8 ESEF deposit), the output should be
processed through Arelle (https://arelle.org/) loaded with the official
EFRAG taxonomy package — Arelle validates against the published XSD and
detects calculation/dimensional inconsistencies that this in-process
generator cannot enforce alone.
"""
from __future__ import annotations

import html
import json
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, Any, List, Optional, Iterable, Tuple
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.data_entry import DataEntry
from app.models.organization import Organization
from app.services.esrs_taxonomy import (
    ESRS_NS,
    ESRS_SCHEMA_REF,
    SCHEME_LEI,
    SCHEME_SIREN,
    UNIT_DEFINITIONS,
    ESRSConcept,
    all_concepts,
    concepts_by_section,
    match_concept_from_metric,
)


# ────────────────────────────────────────────────────────────────────────────
# Internal facts representation
# ────────────────────────────────────────────────────────────────────────────

@dataclass
class _Fact:
    """A resolved fact ready to be rendered in iXBRL."""
    concept: ESRSConcept
    value: float            # numeric value (already converted)
    raw_metric: str         # original ESGflow metric_name (for audit trail)
    source_entry_id: str    # DataEntry.id (for audit trail)


# ────────────────────────────────────────────────────────────────────────────
# Low-level iXBRL element renderers
# ────────────────────────────────────────────────────────────────────────────

def _format_number(value: float, decimals: int) -> str:
    """Format a number as a dot-decimal string suitable for an ix:nonFraction."""
    if decimals <= 0:
        return f"{int(round(value)):d}"
    return f"{value:.{decimals}f}"


def _ix_non_fraction(concept: str, value: float, unit_ref: str,
                     context_ref: str, decimals: int) -> str:
    """Render an Inline XBRL <ix:nonFraction> for a numeric fact."""
    fmt = "ixt:num-dot-decimal"
    return (
        f'<ix:nonFraction name="{html.escape(concept)}" '
        f'contextRef="{html.escape(context_ref)}" '
        f'unitRef="{html.escape(unit_ref)}" '
        f'decimals="{decimals}" '
        f'scale="0" '
        f'format="{fmt}">'
        f'{_format_number(value, max(0, decimals))}'
        f'</ix:nonFraction>'
    )


def _ix_non_numeric(concept: str, text: str, context_ref: str,
                    escape: bool = True) -> str:
    """Render an Inline XBRL <ix:nonNumeric> for a text/textBlock fact."""
    body = html.escape(text) if escape else text
    return (
        f'<ix:nonNumeric name="{html.escape(concept)}" '
        f'contextRef="{html.escape(context_ref)}">'
        f'{body}'
        f'</ix:nonNumeric>'
    )


# ────────────────────────────────────────────────────────────────────────────
# Service
# ────────────────────────────────────────────────────────────────────────────

class iXBRLService:
    """
    Production-grade iXBRL/ESEF generator.

    Usage:
        svc = iXBRLService(db)
        xhtml_bytes = await svc.generate_report(
            tenant_id=tid, year=2025, sections=["E1", "S1", "G1"],
        )
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    # ─── Public API ────────────────────────────────────────────────────────

    async def generate_report(
        self,
        tenant_id: UUID,
        organization_id: Optional[UUID] = None,
        year: int = 2025,
        sections: Optional[List[str]] = None,
        narrative_overrides: Optional[Dict[str, str]] = None,
    ) -> bytes:
        """
        Build a multi-section iXBRL/XHTML document for the given tenant/year.

        Parameters
        ----------
        sections
            ESRS standard codes to include (e.g. ``["E1", "S1", "G1"]``).
            Defaults to all sections that have at least one matched fact.
        narrative_overrides
            ``{concept_id: text}`` to inject user-provided narrative blocks
            for textBlock concepts (typically from the CSRD Builder).
        """
        org_name, legal_id, scheme = await self._resolve_organization(
            tenant_id, organization_id,
        )

        # Resolve facts from DB entries
        facts = await self._resolve_facts(tenant_id, organization_id)

        # Determine sections to render
        present = sorted({f.concept.standard for f in facts})
        sections_to_render = (
            [s for s in (sections or present)]
            if (sections or present)
            else ["ESRS E1"]
        )
        # Normalize: accept "E1" → "ESRS E1"
        sections_to_render = [
            s if s.upper().startswith("ESRS") else f"ESRS {s.upper()}"
            for s in sections_to_render
        ]

        # Group facts by section
        facts_by_section: Dict[str, List[_Fact]] = {}
        for f in facts:
            facts_by_section.setdefault(f.concept.standard, []).append(f)

        # Contexts: one duration + one instant per fiscal year
        ctx_duration = f"FY{year}_D"
        ctx_instant  = f"FY{year}_I"

        # Render body
        body_html = self._render_body(
            org_name=org_name,
            legal_id=legal_id,
            year=year,
            sections=sections_to_render,
            facts_by_section=facts_by_section,
            ctx_duration=ctx_duration,
            ctx_instant=ctx_instant,
            narrative_overrides=narrative_overrides or {},
        )

        # Hidden header (contexts + units)
        used_units = self._collect_used_units(facts)
        header_html = self._render_header(
            legal_id=legal_id,
            scheme=scheme,
            ctx_duration=ctx_duration,
            ctx_instant=ctx_instant,
            year=year,
            used_units=used_units,
        )

        return self._wrap_document(
            org_name=org_name,
            year=year,
            sections=sections_to_render,
            header=header_html,
            body=body_html,
        ).encode("utf-8")

    # Backward-compat alias used by older code paths
    async def generate_e1_climate(
        self,
        tenant_id: UUID,
        organization_id: Optional[UUID] = None,
        year: int = 2025,
    ) -> bytes:
        return await self.generate_report(
            tenant_id=tenant_id,
            organization_id=organization_id,
            year=year,
            sections=["E1"],
        )

    async def get_mapping_evidence(
        self,
        tenant_id: UUID,
        organization_id: Optional[UUID] = None,
    ) -> bytes:
        """
        Return a companion JSON document mapping ESGflow metrics → ESRS concepts.

        Used by auditors to trace the provenance of each tagged fact. Should be
        shipped alongside the .xhtml file when filing with the regulator or
        the assurance provider.
        """
        facts = await self._resolve_facts(tenant_id, organization_id)
        payload = {
            "generated_at": datetime.utcnow().isoformat(),
            "tenant_id": str(tenant_id),
            "organization_id": str(organization_id) if organization_id else None,
            "taxonomy": {
                "namespace": ESRS_NS,
                "schema_ref": ESRS_SCHEMA_REF,
                "version": "2024-12-31",
                "source": "EFRAG ESRS XBRL Taxonomy",
            },
            "mappings": [
                {
                    "esrs_concept":       f.concept.concept_id,
                    "esrs_label_fr":      f.concept.label_fr,
                    "esrs_section":       f.concept.standard,
                    "esrs_disclosure":    f.concept.disclosure,
                    "esgflow_metric":     f.raw_metric,
                    "esgflow_entry_id":   f.source_entry_id,
                    "value":              f.value,
                    "unit_ref":           f.concept.unit_ref,
                    "decimals":           f.concept.decimals,
                    "period_type":        f.concept.period_type,
                }
                for f in facts
            ],
        }
        return json.dumps(payload, indent=2, ensure_ascii=False).encode("utf-8")

    # ─── Internals ─────────────────────────────────────────────────────────

    async def _resolve_organization(
        self,
        tenant_id: UUID,
        organization_id: Optional[UUID],
    ) -> Tuple[str, str, str]:
        """Return (name, legal_identifier, scheme_uri)."""
        org_name = "Organisation"
        legal_id = "NON-RENSEIGNE"
        scheme = SCHEME_SIREN
        try:
            if organization_id:
                q = select(Organization).where(Organization.id == organization_id)
            else:
                q = select(Organization).where(Organization.tenant_id == tenant_id).limit(1)
            org = (await self.db.execute(q)).scalar_one_or_none()
            if org:
                org_name = org.name or org_name
                # Prefer LEI (international standard) over SIREN.
                lei = getattr(org, "lei", None)
                siret = getattr(org, "siret", None) or getattr(org, "siren", None)
                if lei:
                    legal_id = lei
                    scheme = SCHEME_LEI
                elif siret:
                    legal_id = str(siret)
                    scheme = SCHEME_SIREN
        except Exception:
            pass
        return org_name, legal_id, scheme

    async def _resolve_facts(
        self,
        tenant_id: UUID,
        organization_id: Optional[UUID],
    ) -> List[_Fact]:
        """Pull DataEntry rows and match each to its ESRS concept."""
        q = select(DataEntry).where(DataEntry.tenant_id == tenant_id)
        if organization_id:
            q = q.where(DataEntry.organization_id == organization_id)
        rows = (await self.db.execute(q)).scalars().all()

        facts: List[_Fact] = []
        for e in rows:
            if e.value_numeric is None:
                continue
            concept = match_concept_from_metric(e.metric_name or "")
            if concept is None:
                continue
            facts.append(_Fact(
                concept=concept,
                value=float(e.value_numeric),
                raw_metric=e.metric_name or "",
                source_entry_id=str(e.id),
            ))
        return facts

    def _collect_used_units(self, facts: Iterable[_Fact]) -> List[str]:
        """Return distinct unit_ref keys actually used in this report."""
        seen = set()
        for f in facts:
            if f.concept.unit_ref:
                seen.add(f.concept.unit_ref)
        # Always include EUR — narrative blocks often reference monetary values
        if "EUR" not in seen:
            seen.add("EUR")
        return sorted(seen)

    # ─── Rendering ─────────────────────────────────────────────────────────

    def _render_header(
        self,
        legal_id: str,
        scheme: str,
        ctx_duration: str,
        ctx_instant: str,
        year: int,
        used_units: List[str],
    ) -> str:
        units_xml = "\n        ".join(
            f'<xbrli:unit id="{html.escape(uid)}"><xbrli:measure>{html.escape(UNIT_DEFINITIONS[uid]["measure"])}</xbrli:measure></xbrli:unit>'
            for uid in used_units if uid in UNIT_DEFINITIONS
        )
        return f"""<ix:header>
    <ix:hidden>
      <ix:references>
        <link:schemaRef xlink:type="simple" xlink:href="{html.escape(ESRS_SCHEMA_REF)}"/>
      </ix:references>
      <ix:resources>
        <xbrli:context id="{html.escape(ctx_duration)}">
          <xbrli:entity>
            <xbrli:identifier scheme="{html.escape(scheme)}">{html.escape(legal_id)}</xbrli:identifier>
          </xbrli:entity>
          <xbrli:period>
            <xbrli:startDate>{year}-01-01</xbrli:startDate>
            <xbrli:endDate>{year}-12-31</xbrli:endDate>
          </xbrli:period>
        </xbrli:context>
        <xbrli:context id="{html.escape(ctx_instant)}">
          <xbrli:entity>
            <xbrli:identifier scheme="{html.escape(scheme)}">{html.escape(legal_id)}</xbrli:identifier>
          </xbrli:entity>
          <xbrli:period>
            <xbrli:instant>{year}-12-31</xbrli:instant>
          </xbrli:period>
        </xbrli:context>
        {units_xml}
      </ix:resources>
    </ix:hidden>
  </ix:header>"""

    def _render_section(
        self,
        section_code: str,
        facts: List[_Fact],
        ctx_duration: str,
        ctx_instant: str,
        narrative_overrides: Dict[str, str],
    ) -> str:
        """Render one ESRS section as an HTML <section>."""
        section_facts: Dict[str, _Fact] = {f.concept.concept_id: f for f in facts}

        # All concepts in this section, ordered: required first, then optional
        catalog = sorted(
            concepts_by_section(section_code),
            key=lambda c: (not c.required, c.disclosure, c.concept_id),
        )

        lis: List[str] = []
        for c in catalog:
            ctx = ctx_duration if c.period_type == "duration" else ctx_instant
            required_chip = (
                ' <span class="chip chip-required" title="Concept obligatoire">obligatoire</span>'
                if c.required else ''
            )
            disclosure = f' <span class="chip chip-dr">{html.escape(c.disclosure)}</span>'

            if c.data_type in ("decimal", "integer", "monetaryItemType"):
                f = section_facts.get(c.concept_id)
                if f is not None:
                    decimals = c.decimals if c.decimals is not None else 0
                    tagged = _ix_non_fraction(
                        concept=c.concept_id,
                        value=f.value,
                        unit_ref=c.unit_ref or "pure",
                        context_ref=ctx,
                        decimals=decimals,
                    )
                    unit_label = (UNIT_DEFINITIONS.get(c.unit_ref or "", {})
                                  .get("label", ""))
                    lis.append(
                        f'<li><strong>{html.escape(c.label_fr)}</strong>'
                        f'{required_chip}{disclosure} : {tagged}'
                        f' <small class="unit">{html.escape(unit_label)}</small></li>'
                    )
                else:
                    # Show as "not reported" for required concepts
                    if c.required:
                        lis.append(
                            f'<li class="missing"><strong>{html.escape(c.label_fr)}</strong>'
                            f'{required_chip}{disclosure} : '
                            f'<em class="muted">non renseigné</em></li>'
                        )
            elif c.data_type in ("textBlock", "string"):
                # Use user override if provided; otherwise show placeholder for required.
                text = narrative_overrides.get(c.concept_id)
                if text:
                    tagged = _ix_non_numeric(c.concept_id, text, ctx_duration)
                    lis.append(
                        f'<li><strong>{html.escape(c.label_fr)}</strong>'
                        f'{required_chip}{disclosure}<br/>'
                        f'<div class="narrative">{tagged}</div></li>'
                    )
                elif c.required:
                    lis.append(
                        f'<li class="missing"><strong>{html.escape(c.label_fr)}</strong>'
                        f'{required_chip}{disclosure} : '
                        f'<em class="muted">narratif non fourni</em></li>'
                    )

        if not lis:
            return ""

        return (
            f'<section id="{html.escape(section_code.replace(" ", "_"))}">'
            f'<h2>{html.escape(section_code)}</h2>'
            f'<ul class="concepts">{"".join(lis)}</ul>'
            f'</section>'
        )

    def _render_body(
        self,
        org_name: str,
        legal_id: str,
        year: int,
        sections: List[str],
        facts_by_section: Dict[str, List[_Fact]],
        ctx_duration: str,
        ctx_instant: str,
        narrative_overrides: Dict[str, str],
    ) -> str:
        cover = (
            f'<header class="cover">'
            f'<h1>Rapport CSRD / ESRS — {html.escape(org_name)}</h1>'
            f'<div class="meta">'
            f'<div><strong>Entité déclarante :</strong> {html.escape(org_name)}</div>'
            f'<div><strong>Identifiant légal :</strong> {html.escape(legal_id)}</div>'
            f'<div><strong>Exercice :</strong> {year}</div>'
            f'<div><strong>Format :</strong> Inline XBRL (ESEF) — '
            f'<a href="{html.escape(ESRS_SCHEMA_REF)}" target="_blank" rel="noopener">'
            f'EFRAG ESRS Taxonomy 2024-12-31</a></div>'
            f'</div>'
            f'</header>'
        )

        toc_items = "".join(
            f'<li><a href="#{html.escape(s.replace(" ", "_"))}">{html.escape(s)}</a></li>'
            for s in sections
        )
        toc = f'<nav class="toc"><strong>Sections</strong><ul>{toc_items}</ul></nav>'

        rendered = []
        for s in sections:
            rendered.append(self._render_section(
                section_code=s,
                facts=facts_by_section.get(s, []),
                ctx_duration=ctx_duration,
                ctx_instant=ctx_instant,
                narrative_overrides=narrative_overrides,
            ))

        footer = (
            f'<footer class="legal">'
            f'<p><strong>Conformité :</strong> Ce document est généré conformément à la '
            f'taxonomie ESRS XBRL publiée par l\'EFRAG (version 2024-12-31, espace de noms '
            f'<code>{html.escape(ESRS_NS)}</code>).</p>'
            f'<p>Pour le dépôt officiel ESEF, l\'archive iXBRL doit être validée via Arelle '
            f'(<a href="https://arelle.org/" target="_blank" rel="noopener">arelle.org</a>) '
            f'chargée avec le package taxonomique officiel EFRAG, puis transmise à l\'AMF/ESMA '
            f'selon le calendrier CSRD applicable.</p>'
            f'<p class="generated">Généré le {html.escape(datetime.utcnow().isoformat())} UTC '
            f'par ESGflow.</p>'
            f'</footer>'
        )

        return cover + toc + "".join(rendered) + footer

    def _wrap_document(
        self,
        org_name: str,
        year: int,
        sections: List[str],
        header: str,
        body: str,
    ) -> str:
        """Wrap header + body in a full XHTML/iXBRL document."""
        sections_str = " · ".join(sections)
        return f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml"
      xmlns:ix="http://www.xbrl.org/2013/inlineXBRL"
      xmlns:ixt="http://www.xbrl.org/inlineXBRL/transformation/2020-02-12"
      xmlns:xbrli="http://www.xbrl.org/2003/instance"
      xmlns:xbrldi="http://xbrl.org/2006/xbrldi"
      xmlns:link="http://www.xbrl.org/2003/linkbase"
      xmlns:xlink="http://www.w3.org/1999/xlink"
      xmlns:iso4217="http://www.xbrl.org/2003/iso4217"
      xmlns:utr="http://www.xbrl.org/2009/utr"
      xmlns:esrs="{html.escape(ESRS_NS)}"
      xml:lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>Rapport ESRS — {html.escape(org_name)} — {year}</title>
  <meta name="generator" content="ESGflow iXBRL Generator"/>
  <meta name="esrs-taxonomy" content="2024-12-31"/>
  <meta name="esrs-sections" content="{html.escape(sections_str)}"/>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            max-width: 920px; margin: 2rem auto; padding: 0 1.5rem;
            color: #0f172a; line-height: 1.6; }}
    h1 {{ color: #0f766e; border-bottom: 2px solid #99f6e4; padding-bottom: .5rem; }}
    h2 {{ color: #047857; margin-top: 2.5rem; padding-top: 1rem;
          border-top: 1px solid #e2e8f0; }}
    a {{ color: #0e7490; }}
    .cover .meta {{ background: #f8fafc; border-left: 4px solid #0f766e;
                    padding: 1rem 1.25rem; margin: 1rem 0;
                    border-radius: 0 8px 8px 0; font-size: .92rem; }}
    .cover .meta div {{ margin: .2rem 0; }}
    .toc {{ background: #f1f5f9; padding: 1rem 1.25rem; border-radius: 8px;
            margin: 1.5rem 0; }}
    .toc ul {{ margin: .5rem 0 0; padding-left: 1.2rem; }}
    .toc li {{ margin: .2rem 0; }}
    ul.concepts {{ list-style: none; padding: 0; }}
    ul.concepts li {{ padding: .8rem 1rem; margin: .4rem 0;
                       background: #ffffff; border: 1px solid #e2e8f0;
                       border-radius: 8px; }}
    ul.concepts li.missing {{ background: #fef9c3; border-color: #fde68a; }}
    .narrative {{ background: #f0f9ff; padding: .6rem .9rem; margin-top: .4rem;
                  border-left: 3px solid #0ea5e9; border-radius: 0 6px 6px 0; }}
    .chip {{ display: inline-block; padding: 1px 7px; border-radius: 4px;
             font-size: .68rem; font-weight: 600; margin-left: .3rem;
             vertical-align: middle; }}
    .chip-required {{ background: #fee2e2; color: #991b1b; }}
    .chip-dr {{ background: #ddd6fe; color: #5b21b6; font-family: ui-monospace, monospace; }}
    .muted {{ color: #94a3b8; font-style: italic; }}
    .unit {{ color: #64748b; font-size: .85rem; }}
    /* iXBRL tag highlighting — disabled by default, can be turned on
       by viewers for visual review. */
    ix\\:nonFraction {{ background: #fef3c7; padding: 1px 5px; border-radius: 3px;
                        font-weight: 600; }}
    ix\\:nonNumeric  {{ display: block; background: #dbeafe; padding: .3rem .6rem;
                        border-radius: 4px; }}
    .legal {{ margin-top: 4rem; padding: 1.2rem 1.4rem; background: #f8fafc;
              border-top: 2px solid #cbd5e1; border-radius: 8px;
              font-size: .85rem; color: #475569; }}
    .legal p {{ margin: .4rem 0; }}
    .generated {{ color: #94a3b8; font-size: .78rem; }}
  </style>

  {header}
</head>
<body>
  {body}
</body>
</html>"""
