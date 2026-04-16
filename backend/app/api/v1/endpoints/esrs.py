"""
ESRS Gap Analysis — maps existing data entries to the 10 ESRS standards
and returns section-by-section coverage, missing disclosures, and priority actions.
"""
import logging
import csv
import io
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Dict, Any, Optional

from app.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.data_entry import DataEntry

logger = logging.getLogger(__name__)
router = APIRouter()

# ─── ESRS Section definitions ─────────────────────────────────────────────────

ESRS_SECTIONS = [
    {
        "code": "ESRS 2",
        "label": "Informations générales",
        "pillar": "governance",
        "short": "Général",
        "description": "Informations générales obligatoires pour toutes les entreprises soumises à la CSRD.",
        "keywords": ["gouvernance", "gouvernance", "strategy", "strategie", "business", "model"],
        "disclosures": [
            {"id": "GOV-1", "label": "Rôle de la direction sur les questions de durabilité"},
            {"id": "GOV-2", "label": "Informations fournies aux organes directeurs"},
            {"id": "GOV-3", "label": "Intégration dans les processus d'entreprise"},
            {"id": "GOV-4", "label": "Déclaration de diligence raisonnable"},
            {"id": "GOV-5", "label": "Gestion des risques et opportunités"},
            {"id": "SBM-1", "label": "Stratégie, modèle d'affaires et chaîne de valeur"},
            {"id": "SBM-3", "label": "Impacts, risques et opportunités matériels"},
        ],
        "pillar_color": "governance",
    },
    {
        "code": "E1",
        "label": "Changement climatique",
        "pillar": "environmental",
        "short": "Climat",
        "description": "Atténuation et adaptation au changement climatique, émissions de gaz à effet de serre Scopes 1, 2 et 3.",
        "keywords": ["emission", "co2", "carbone", "carbon", "ghg", "energie", "energy", "climate", "scope", "gaz"],
        "disclosures": [
            {"id": "E1-1", "label": "Plan de transition pour l'atténuation du changement climatique"},
            {"id": "E1-2", "label": "Politiques relatives au changement climatique"},
            {"id": "E1-3", "label": "Actions et ressources liées au changement climatique"},
            {"id": "E1-4", "label": "Objectifs liés au changement climatique"},
            {"id": "E1-5", "label": "Consommation et mix énergétique"},
            {"id": "E1-6", "label": "Émissions brutes de GES Scope 1, 2 et 3"},
            {"id": "E1-7", "label": "Absorptions et projets de crédits carbone"},
            {"id": "E1-8", "label": "Exposition aux risques physiques climatiques"},
            {"id": "E1-9", "label": "Opportunités de transition climatique"},
        ],
        "pillar_color": "environmental",
    },
    {
        "code": "E2",
        "label": "Pollution",
        "pillar": "environmental",
        "short": "Pollution",
        "description": "Pollution de l'air, de l'eau et des sols, substances préoccupantes et microplastiques.",
        "keywords": ["pollution", "dechet", "waste", "chemical", "chimique", "polluant", "air", "sol"],
        "disclosures": [
            {"id": "E2-1", "label": "Politiques liées à la pollution"},
            {"id": "E2-2", "label": "Actions et ressources liées à la pollution"},
            {"id": "E2-3", "label": "Objectifs liés à la pollution"},
            {"id": "E2-4", "label": "Pollution de l'air, de l'eau et des sols"},
            {"id": "E2-5", "label": "Substances préoccupantes et très préoccupantes"},
            {"id": "E2-6", "label": "Incidences financières liées à la pollution"},
        ],
        "pillar_color": "environmental",
    },
    {
        "code": "E3",
        "label": "Eau et ressources marines",
        "pillar": "environmental",
        "short": "Eau",
        "description": "Consommation d'eau, rejets dans les milieux aquatiques et ressources marines.",
        "keywords": ["eau", "water", "hydrique", "marin", "marine", "ocean", "riviere"],
        "disclosures": [
            {"id": "E3-1", "label": "Politiques liées à l'eau et aux ressources marines"},
            {"id": "E3-2", "label": "Actions et ressources liées à l'eau"},
            {"id": "E3-3", "label": "Objectifs liés à l'eau"},
            {"id": "E3-4", "label": "Consommation d'eau"},
            {"id": "E3-5", "label": "Incidences financières liées à l'eau"},
        ],
        "pillar_color": "environmental",
    },
    {
        "code": "E4",
        "label": "Biodiversité & écosystèmes",
        "pillar": "environmental",
        "short": "Biodiversité",
        "description": "Impacts sur la biodiversité, utilisation des terres et état des écosystèmes.",
        "keywords": ["biodiversite", "biodiversity", "land", "sol", "terrain", "foret", "forest", "ecosysteme"],
        "disclosures": [
            {"id": "E4-1", "label": "Plan de transition et considérations de biodiversité"},
            {"id": "E4-2", "label": "Politiques liées à la biodiversité et aux écosystèmes"},
            {"id": "E4-3", "label": "Actions et ressources liées à la biodiversité"},
            {"id": "E4-4", "label": "Objectifs liés à la biodiversité"},
            {"id": "E4-5", "label": "Indicateurs d'impact sur la biodiversité"},
            {"id": "E4-6", "label": "Incidences financières liées à la biodiversité"},
        ],
        "pillar_color": "environmental",
    },
    {
        "code": "E5",
        "label": "Utilisation des ressources",
        "pillar": "environmental",
        "short": "Ressources",
        "description": "Économie circulaire, déchets, utilisation des ressources et matières premières.",
        "keywords": ["resource", "recyclage", "recycling", "dechet", "waste", "circulaire", "matiere", "material"],
        "disclosures": [
            {"id": "E5-1", "label": "Politiques liées à l'utilisation des ressources"},
            {"id": "E5-2", "label": "Actions et ressources liées à l'économie circulaire"},
            {"id": "E5-3", "label": "Objectifs liés à l'utilisation des ressources"},
            {"id": "E5-4", "label": "Flux entrants de ressources"},
            {"id": "E5-5", "label": "Flux sortants de ressources (déchets)"},
            {"id": "E5-6", "label": "Incidences financières liées aux ressources"},
        ],
        "pillar_color": "environmental",
    },
    {
        "code": "S1",
        "label": "Effectifs propres",
        "pillar": "social",
        "short": "RH",
        "description": "Conditions de travail, santé et sécurité, droits des travailleurs et développement des compétences.",
        "keywords": ["employe", "employee", "staff", "rh", "hr", "formation", "training", "salarie", "travail", "sante", "securite", "parite", "egalite", "diversite"],
        "disclosures": [
            {"id": "S1-1", "label": "Politiques liées aux effectifs propres"},
            {"id": "S1-2", "label": "Processus de dialogue avec les travailleurs"},
            {"id": "S1-3", "label": "Processus pour remédier aux incidences négatives"},
            {"id": "S1-4", "label": "Mécanismes de réclamation"},
            {"id": "S1-5", "label": "Objectifs liés aux effectifs propres"},
            {"id": "S1-6", "label": "Caractéristiques des effectifs"},
            {"id": "S1-7", "label": "Caractéristiques des travailleurs non-salariés"},
            {"id": "S1-8", "label": "Couverture des conventions collectives"},
            {"id": "S1-9", "label": "Diversité des organes de gouvernance"},
            {"id": "S1-14", "label": "Santé et sécurité au travail"},
            {"id": "S1-16", "label": "Rémunération et écarts de salaires"},
        ],
        "pillar_color": "social",
    },
    {
        "code": "S2",
        "label": "Travailleurs chaîne de valeur",
        "pillar": "social",
        "short": "Fournisseurs",
        "description": "Conditions de travail et droits des travailleurs chez les fournisseurs et sous-traitants.",
        "keywords": ["fournisseur", "supplier", "supply", "chaine", "chain", "sous-traitant", "achat"],
        "disclosures": [
            {"id": "S2-1", "label": "Politiques liées aux travailleurs de la chaîne"},
            {"id": "S2-2", "label": "Processus de dialogue"},
            {"id": "S2-3", "label": "Processus de remédiation"},
            {"id": "S2-4", "label": "Mesures pour la chaîne de valeur"},
            {"id": "S2-5", "label": "Objectifs liés à la chaîne de valeur"},
        ],
        "pillar_color": "social",
    },
    {
        "code": "S3",
        "label": "Communautés affectées",
        "pillar": "social",
        "short": "Communautés",
        "description": "Impacts sur les communautés locales et les peuples autochtones.",
        "keywords": ["communaute", "community", "local", "territoire", "social", "impact social"],
        "disclosures": [
            {"id": "S3-1", "label": "Politiques liées aux communautés"},
            {"id": "S3-2", "label": "Processus de dialogue avec les communautés"},
            {"id": "S3-3", "label": "Processus de remédiation"},
            {"id": "S3-4", "label": "Mesures pour les communautés affectées"},
            {"id": "S3-5", "label": "Objectifs liés aux communautés"},
        ],
        "pillar_color": "social",
    },
    {
        "code": "S4",
        "label": "Consommateurs & utilisateurs",
        "pillar": "social",
        "short": "Clients",
        "description": "Impacts sur les consommateurs finaux, protection des données et pratiques commerciales.",
        "keywords": ["consommateur", "consumer", "client", "customer", "user", "utilisateur", "donnee", "data"],
        "disclosures": [
            {"id": "S4-1", "label": "Politiques liées aux consommateurs"},
            {"id": "S4-2", "label": "Processus de dialogue avec les consommateurs"},
            {"id": "S4-3", "label": "Processus de remédiation"},
            {"id": "S4-4", "label": "Mesures pour les consommateurs"},
            {"id": "S4-5", "label": "Objectifs liés aux consommateurs"},
        ],
        "pillar_color": "social",
    },
    {
        "code": "G1",
        "label": "Conduite des affaires",
        "pillar": "governance",
        "short": "Gouvernance",
        "description": "Culture d'entreprise, politique anti-corruption, relations fournisseurs et gestion des risques.",
        "keywords": ["gouvernance", "governance", "ethique", "ethics", "corruption", "compliance", "conformite", "risque", "risk", "audit"],
        "disclosures": [
            {"id": "G1-1", "label": "Culture d'entreprise et politiques anti-corruption"},
            {"id": "G1-2", "label": "Gestion des relations fournisseurs"},
            {"id": "G1-3", "label": "Prévention de la corruption et des pots-de-vin"},
            {"id": "G1-4", "label": "Incidents de corruption avérés"},
            {"id": "G1-5", "label": "Activités de lobbying"},
            {"id": "G1-6", "label": "Délais de paiement"},
        ],
        "pillar_color": "governance",
    },
]


def _normalize(text: str) -> str:
    """Lowercase + remove accents for keyword matching."""
    import unicodedata
    nfkd = unicodedata.normalize("NFKD", text.lower())
    return "".join(c for c in nfkd if not unicodedata.combining(c))


def _section_matches_entry(section: Dict, pillar: str, category: str, metric: str) -> bool:
    """Return True if a DataEntry seems relevant to this ESRS section."""
    entry_text = _normalize(f"{pillar} {category} {metric}")
    # Pillar must match (loose: governance matches both ESRS 2 and G1)
    if section["pillar"] != pillar:
        return False
    return any(_normalize(kw) in entry_text for kw in section["keywords"])


@router.get("/standards")
async def list_esrs_standards(
    current_user: User = Depends(get_current_user),
):
    """List all ESRS standards with disclosure counts."""
    return [
        {
            "code": s["code"],
            "label": s["label"],
            "short": s["short"],
            "pillar": s["pillar"],
            "description": s["description"],
            "disclosure_count": len(s["disclosures"]),
        }
        for s in ESRS_SECTIONS
    ]


@router.get("/gap-analysis")
async def get_esrs_gap_analysis(
    year: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Analyse the gap between existing data entries and ESRS required disclosures.
    Returns section-by-section coverage with status and actionable gaps.
    """
    # Fetch all data entries for this tenant
    stmt = select(DataEntry).where(DataEntry.tenant_id == current_user.tenant_id)
    result = await db.execute(stmt)
    entries = result.scalars().all()

    total_entries = len(entries)

    # Build a list of (pillar, category, metric_name) tuples for matching
    entry_tuples = [
        (e.pillar or "", e.category or "", e.metric_name or "")
        for e in entries
    ]

    # Count entries per pillar for a quick summary
    pillar_counts: Dict[str, int] = {}
    for e in entries:
        p = (e.pillar or "other").lower()
        pillar_counts[p] = pillar_counts.get(p, 0) + 1

    sections_out = []
    total_disclosures = 0
    covered_disclosures = 0

    for section in ESRS_SECTIONS:
        # Count how many data entries match this section
        matching = sum(
            1 for (p, c, m) in entry_tuples
            if _section_matches_entry(section, p, c, m)
        )

        disclosures = section["disclosures"]
        n_disc = len(disclosures)
        total_disclosures += n_disc

        # Heuristic coverage: each matching entry covers ~0.5 disclosures (capped at n_disc)
        # More entries → more disclosures covered, but requires diverse data
        if matching == 0:
            covered = 0
        elif matching >= n_disc * 2:
            covered = n_disc
        else:
            # Linear scale: 1 entry covers ~0.5 disclosures
            covered = min(n_disc, round(matching * 0.5))

        covered_disclosures += covered
        coverage_pct = round((covered / n_disc) * 100) if n_disc else 0

        # Status
        if coverage_pct >= 80:
            status = "ready"
        elif coverage_pct >= 30:
            status = "partial"
        else:
            status = "missing"

        # Mark disclosures as covered/missing based on heuristic
        disc_out = []
        for i, d in enumerate(disclosures):
            disc_out.append({
                "id": d["id"],
                "label": d["label"],
                "covered": i < covered,
            })

        sections_out.append({
            "code": section["code"],
            "label": section["label"],
            "short": section["short"],
            "pillar": section["pillar"],
            "pillar_color": section["pillar_color"],
            "description": section["description"],
            "coverage_pct": coverage_pct,
            "status": status,
            "matching_entries": matching,
            "disclosures_total": n_disc,
            "disclosures_covered": covered,
            "disclosures_missing": n_disc - covered,
            "disclosures": disc_out,
        })

    overall_pct = round((covered_disclosures / total_disclosures) * 100) if total_disclosures else 0

    ready_count = sum(1 for s in sections_out if s["status"] == "ready")
    partial_count = sum(1 for s in sections_out if s["status"] == "partial")
    missing_count = sum(1 for s in sections_out if s["status"] == "missing")

    return {
        "overall_coverage_pct": overall_pct,
        "total_entries": total_entries,
        "total_sections": len(ESRS_SECTIONS),
        "sections_ready": ready_count,
        "sections_partial": partial_count,
        "sections_missing": missing_count,
        "total_disclosures": total_disclosures,
        "covered_disclosures": covered_disclosures,
        "pillar_counts": pillar_counts,
        "sections": sections_out,
    }


@router.post("/gap-analysis/export")
async def export_gap_analysis(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export ESRS gap analysis as CSV."""
    stmt = select(DataEntry).where(DataEntry.tenant_id == current_user.tenant_id)
    result = await db.execute(stmt)
    entries = result.scalars().all()
    entry_tuples = [(e.pillar or "", e.category or "", e.metric_name or "") for e in entries]

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Standard", "Pilier", "Code Disclosure", "Disclosure", "Statut"])

    for section in ESRS_SECTIONS:
        matching = sum(1 for (p, c, m) in entry_tuples if _section_matches_entry(section, p, c, m))
        n_disc = len(section["disclosures"])
        if matching == 0:
            covered = 0
        elif matching >= n_disc * 2:
            covered = n_disc
        else:
            covered = min(n_disc, round(matching * 0.5))

        for i, d in enumerate(section["disclosures"]):
            status = "Couvert" if i < covered else "Manquant"
            writer.writerow([section["label"], section["pillar"], d["id"], d["label"], status])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=esrs_gap_analysis.csv"}
    )
