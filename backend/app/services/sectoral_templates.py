"""
Sectoral Templates — pre-configured ESG datasets per industry sector.

Each template provides:
  * A list of typical *data entries* (DataEntry rows) for Scope 1/2/3 and
    Social/Governance dimensions, with realistic placeholder values that the
    user is expected to edit.
  * A short *narrative* the user can publish or adapt.
  * A mapping to the tenant's indicators (created on-the-fly if missing) so
    the CSRD Progress dashboard immediately reflects the new datapoints.

Values come from public sources where possible (ADEME sector averages, INSEE
typical sizes, sector ESG benchmarks). They are flagged as "estimated" via
``is_estimated=True`` so auditors aren't misled.

DESIGN NOTES
------------
* The unit and placeholder value are deliberately reasonable for an ETI of
  ~1000 employees / 100 M€ CA. The user should edit before publishing.
* We do NOT auto-publish to CSRD. The template only seeds data — the user
  must review + validate before reporting.
* Idempotent: re-applying the same template doesn't duplicate entries
  (matches on metric_name + year). A "replace" mode deletes prior template
  entries first.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from datetime import date


# ─── Data structures ───────────────────────────────────────────────────────
@dataclass(frozen=True)
class TemplateEntry:
    """One data entry seeded by a template."""
    metric_name: str       # Human-readable metric (e.g. "Émissions Scope 1 — Chaufferie gaz")
    pillar: str            # environmental / social / governance
    category: str          # Climat / Énergie / Emploi / Éthique / ...
    unit: str              # tCO2e, MWh, %, h, k€, ...
    value: float           # Placeholder value (must be edited)
    notes: str = ""        # Source / methodology explanation
    framework: str = "ESRS"  # ESRS / GRI / GHG Protocol / ADEME


@dataclass(frozen=True)
class SectorTemplate:
    sector_id: str           # Matches onboarding sectors (industry, retail, ...)
    label: str
    icon: str                # Emoji
    description: str
    entries: List[TemplateEntry] = field(default_factory=list)
    suggested_narratives: Dict[str, str] = field(default_factory=dict)


# ─── Template catalog ──────────────────────────────────────────────────────
INDUSTRY = SectorTemplate(
    sector_id="industry",
    label="Industrie manufacturière",
    icon="🏭",
    description="Production manufacturière — fortes émissions Scope 1 (procédés thermiques) et Scope 3 (achats matières + transport amont).",
    entries=[
        # Scope 1 — combustion fixe + procédés
        TemplateEntry("Émissions GES scope 1 — Combustion gaz naturel", "environmental", "Climat", "tCO2e", 1850.0,
                      "Chaudières + fours industriels. ADEME : 0.227 kgCO2e/kWh PCS gaz."),
        TemplateEntry("Émissions GES scope 1 — Procédés industriels (CO2 process)", "environmental", "Climat", "tCO2e", 920.0,
                      "Émissions liées aux réactions chimiques (ciment, acier, chaux)."),
        TemplateEntry("Émissions GES scope 1 — Fuites HFC réfrigération", "environmental", "Climat", "tCO2e", 145.0,
                      "Taux de fuite annuel × charge × PRG (R-410A = 2088, R-32 = 675)."),
        TemplateEntry("Émissions GES scope 1 — Flotte véhicules thermiques", "environmental", "Climat", "tCO2e", 380.0,
                      "Carburant routier société (ADEME : 2.49 kgCO2e/L gazole)."),
        # Scope 2 — électricité + chaleur
        TemplateEntry("Émissions GES scope 2 — Électricité (mix moyen FR)", "environmental", "Climat", "tCO2e", 410.0,
                      "ADEME mix électrique France 2023 : 0.0571 kgCO2e/kWh."),
        TemplateEntry("Consommation d'électricité totale", "environmental", "Énergie", "MWh", 7200.0,
                      "Inclut éclairage, force motrice, climatisation, air comprimé."),
        TemplateEntry("Part d'énergie renouvelable", "environmental", "Énergie", "%", 28.0,
                      "Mix incluant CEE achetés + autoproduction PV."),
        # Scope 3 prioritaire
        TemplateEntry("Émissions GES scope 3 cat.1 — Achats biens et services", "environmental", "Climat", "tCO2e", 12500.0,
                      "Estimation monétaire (PCG 60x) × facteurs ADEME secteur. À affiner via FEC."),
        TemplateEntry("Émissions GES scope 3 cat.4 — Transport amont", "environmental", "Climat", "tCO2e", 2100.0,
                      "Logistique fournisseurs : routier + maritime + aérien."),
        TemplateEntry("Émissions GES scope 3 cat.5 — Déchets opérations", "environmental", "Climat", "tCO2e", 180.0,
                      "Déchets dangereux + DIB (poids × facteur ADEME)."),
        TemplateEntry("Émissions GES scope 3 cat.6 — Déplacements professionnels", "environmental", "Climat", "tCO2e", 95.0,
                      "Train + avion + km voiture personnel."),
        # Eau / pollution / déchets
        TemplateEntry("Consommation d'eau totale", "environmental", "Eau", "m3", 18500.0,
                      "Refroidissement + procédés + sanitaires."),
        TemplateEntry("Déchets dangereux générés", "environmental", "Déchets", "t", 22.0,
                      "Solvants, huiles, métaux lourds, batteries."),
        TemplateEntry("Déchets industriels valorisés", "environmental", "Déchets", "%", 65.0,
                      "Recyclage + valorisation énergétique / total déchets."),
        # Social
        TemplateEntry("Effectif total (ETP)", "social", "Emploi", "personnes", 1100,
                      "ETP au 31/12."),
        TemplateEntry("Taux de turnover", "social", "Emploi", "%", 8.5,
                      "(Départs / effectif moyen) × 100."),
        TemplateEntry("Taux d'accidents du travail (TF1)", "social", "Santé & Sécurité", "%", 12.5,
                      "Nb accidents avec arrêt × 1M / heures travaillées."),
        TemplateEntry("Heures de formation par salarié", "social", "Formation", "h/an", 23.0,
                      "Formation interne + externe. Obligation > 250 ETP."),
        TemplateEntry("Part de femmes dans l'encadrement", "social", "Égalité", "%", 28.0,
                      "Cadres + comité de direction."),
        TemplateEntry("Index égalité professionnelle F/H", "social", "Égalité", "score", 87,
                      "Obligation > 50 salariés (Loi 2018-771)."),
        # Governance
        TemplateEntry("Part de femmes au conseil d'administration", "governance", "Gouvernance", "%", 40.0,
                      "Loi Copé-Zimmermann : 40% min."),
        TemplateEntry("Réunions du conseil d'administration", "governance", "Gouvernance", "nombre", 6),
        TemplateEntry("Salariés formés à l'éthique / anti-corruption", "governance", "Éthique", "%", 75.0,
                      "Sapin 2 : obligation > 500 salariés."),
        TemplateEntry("Signalements éthiques reçus", "governance", "Éthique", "nombre", 2),
    ],
    suggested_narratives={
        "business_model": "Production industrielle de [PRODUITS] sur [X] sites en [PAYS]. Activité B2B avec [N] clients principaux représentant [Y%] du CA.",
        "value_chain": "Amont : [N] fournisseurs critiques (matières premières, énergie, logistique). Aval : distribution directe et via [N] distributeurs.",
    },
)

RETAIL = SectorTemplate(
    sector_id="retail",
    label="Commerce & Distribution",
    icon="🛒",
    description="Distribution multi-sites — émissions concentrées sur Scope 3 (achats) + transport aval + énergie magasins.",
    entries=[
        TemplateEntry("Émissions GES scope 1 — Gaz naturel chauffage magasins", "environmental", "Climat", "tCO2e", 280.0,
                      "Chauffage des points de vente."),
        TemplateEntry("Émissions GES scope 1 — Fuites HFC réfrigération", "environmental", "Climat", "tCO2e", 420.0,
                      "Vitrines réfrigérées + entrepôts froids."),
        TemplateEntry("Émissions GES scope 1 — Flotte véhicules livraison", "environmental", "Climat", "tCO2e", 145.0,
                      "Camions <3,5t propriété + utilitaires."),
        TemplateEntry("Émissions GES scope 2 — Électricité magasins", "environmental", "Climat", "tCO2e", 320.0,
                      "Éclairage LED + climatisation + équipements."),
        TemplateEntry("Consommation d'électricité totale", "environmental", "Énergie", "MWh", 5600.0),
        TemplateEntry("Part d'énergie renouvelable", "environmental", "Énergie", "%", 35.0),
        TemplateEntry("Émissions GES scope 3 cat.1 — Achats marchandises", "environmental", "Climat", "tCO2e", 38500.0,
                      "Catégorie #1 du retail. À calculer via méthode hybride (volume + monétaire)."),
        TemplateEntry("Émissions GES scope 3 cat.4 — Transport amont", "environmental", "Climat", "tCO2e", 1850.0,
                      "Approvisionnement entrepôts depuis fournisseurs."),
        TemplateEntry("Émissions GES scope 3 cat.9 — Distribution aval", "environmental", "Climat", "tCO2e", 980.0,
                      "Livraison entrepôts → magasins → clients."),
        TemplateEntry("Émissions GES scope 3 cat.11 — Utilisation produits vendus", "environmental", "Climat", "tCO2e", 8200.0,
                      "Si vente d'appareils électriques / énergie embarquée."),
        TemplateEntry("Émissions GES scope 3 cat.12 — Fin de vie produits", "environmental", "Climat", "tCO2e", 950.0,
                      "Emballages + produits en fin de cycle."),
        TemplateEntry("Pertes alimentaires et gaspillage", "environmental", "Déchets", "t", 145.0,
                      "Articles invendus / périmés (rayons frais)."),
        TemplateEntry("Part de produits écoresponsables", "environmental", "Produits", "%", 18.0,
                      "Labels bio / équitable / Ecocert / FSC."),
        TemplateEntry("Effectif total (ETP)", "social", "Emploi", "personnes", 1450),
        TemplateEntry("Taux de turnover", "social", "Emploi", "%", 22.0,
                      "Plus élevé en retail vs autres secteurs (saisonniers)."),
        TemplateEntry("Taux d'accidents du travail (TF1)", "social", "Santé & Sécurité", "%", 35.0,
                      "Sectoriel élevé (port de charges, mouvements répétés)."),
        TemplateEntry("Heures de formation par salarié", "social", "Formation", "h/an", 14.0),
        TemplateEntry("Part de femmes dans l'encadrement", "social", "Égalité", "%", 42.0),
        TemplateEntry("Pourcentage employés couverts par convention collective", "social", "Conditions de travail", "%", 100.0,
                      "Convention nationale du commerce."),
        TemplateEntry("Fournisseurs audités sur droits humains", "governance", "Supply chain", "%", 35.0,
                      "Loi 2017-399 : obligation cartographie fournisseurs critiques."),
        TemplateEntry("Salariés formés à l'éthique / anti-corruption", "governance", "Éthique", "%", 60.0),
        TemplateEntry("Signalements éthiques reçus", "governance", "Éthique", "nombre", 4),
    ],
)

SERVICES = SectorTemplate(
    sector_id="services",
    label="Services & Conseil",
    icon="🤝",
    description="Activité tertiaire — émissions dominées par bureaux + déplacements professionnels + numérique.",
    entries=[
        TemplateEntry("Émissions GES scope 1 — Gaz naturel bureaux", "environmental", "Climat", "tCO2e", 65.0),
        TemplateEntry("Émissions GES scope 1 — Flotte de service", "environmental", "Climat", "tCO2e", 85.0),
        TemplateEntry("Émissions GES scope 2 — Électricité bureaux", "environmental", "Climat", "tCO2e", 95.0),
        TemplateEntry("Consommation d'électricité totale", "environmental", "Énergie", "MWh", 1700.0),
        TemplateEntry("Part d'énergie renouvelable", "environmental", "Énergie", "%", 60.0,
                      "Bureaux modernes équipés contrats verts."),
        TemplateEntry("Émissions GES scope 3 cat.1 — Achats services et matériels", "environmental", "Climat", "tCO2e", 1850.0,
                      "Prestations IT, conseil, fournitures bureau."),
        TemplateEntry("Émissions GES scope 3 cat.6 — Déplacements professionnels", "environmental", "Climat", "tCO2e", 720.0,
                      "Avion long-courrier + train + voiture client. Souvent #1 chez consultants."),
        TemplateEntry("Émissions GES scope 3 cat.7 — Déplacements domicile-travail", "environmental", "Climat", "tCO2e", 380.0,
                      "ADEME : 5.1 km×j moyen × facteur mobilité."),
        TemplateEntry("Empreinte carbone par salarié", "environmental", "Climat", "tCO2e/ETP", 4.5),
        TemplateEntry("Télétravail (jours/semaine moyen)", "social", "Conditions de travail", "jours", 2.3),
        TemplateEntry("Effectif total (ETP)", "social", "Emploi", "personnes", 350),
        TemplateEntry("Taux de turnover", "social", "Emploi", "%", 15.0),
        TemplateEntry("Heures de formation par salarié", "social", "Formation", "h/an", 38.0,
                      "Sectoriel élevé (montée en compétences continue)."),
        TemplateEntry("Part de femmes dans l'encadrement", "social", "Égalité", "%", 38.0),
        TemplateEntry("Index égalité professionnelle F/H", "social", "Égalité", "score", 91),
        TemplateEntry("Part de femmes au conseil d'administration", "governance", "Gouvernance", "%", 45.0),
        TemplateEntry("Salariés formés à l'éthique / anti-corruption", "governance", "Éthique", "%", 92.0,
                      "Sectoriel critique : sensibilité RGPD + conflits intérêt."),
        TemplateEntry("Budget RSE / CA", "governance", "Gouvernance", "%", 0.8),
    ],
)

AGRO = SectorTemplate(
    sector_id="agro",
    label="Agroalimentaire",
    icon="🌾",
    description="Production alimentaire — fortes émissions Scope 3 amont (matières premières agricoles) + eau + biodiversité.",
    entries=[
        TemplateEntry("Émissions GES scope 1 — Gaz naturel usines", "environmental", "Climat", "tCO2e", 1450.0,
                      "Cuisson, pasteurisation, séchage."),
        TemplateEntry("Émissions GES scope 1 — Fuites HFC réfrigération", "environmental", "Climat", "tCO2e", 380.0,
                      "Stockage produits froid + congélation."),
        TemplateEntry("Émissions GES scope 1 — Flotte camions frigorifiques", "environmental", "Climat", "tCO2e", 420.0),
        TemplateEntry("Émissions GES scope 2 — Électricité", "environmental", "Climat", "tCO2e", 285.0),
        TemplateEntry("Consommation d'électricité totale", "environmental", "Énergie", "MWh", 5000.0),
        TemplateEntry("Part d'énergie renouvelable", "environmental", "Énergie", "%", 22.0),
        TemplateEntry("Émissions GES scope 3 cat.1 — Matières premières agricoles", "environmental", "Climat", "tCO2e", 28500.0,
                      "Catégorie #1 agro : élevage + cultures (LULUCF inclus)."),
        TemplateEntry("Émissions GES scope 3 cat.4 — Transport amont", "environmental", "Climat", "tCO2e", 1850.0),
        TemplateEntry("Émissions GES scope 3 cat.9 — Distribution aval", "environmental", "Climat", "tCO2e", 980.0,
                      "Vers entrepôts distributeurs."),
        TemplateEntry("Émissions GES scope 3 cat.12 — Emballages fin de vie", "environmental", "Climat", "tCO2e", 1250.0,
                      "Carton + plastique + verre."),
        TemplateEntry("Consommation d'eau totale", "environmental", "Eau", "m3", 95000.0,
                      "Lavage matières + procédés + nettoyage CIP."),
        TemplateEntry("Consommation d'eau en zones de stress hydrique", "environmental", "Eau", "m3", 12000.0,
                      "Sites situés en zones WRI Aqueduct > 40%."),
        TemplateEntry("Pertes alimentaires et gaspillage", "environmental", "Déchets", "t", 380.0),
        TemplateEntry("Sites en zones sensibles biodiversité", "environmental", "Biodiversité", "nombre", 2,
                      "Natura 2000, zones humides, parcs nationaux."),
        TemplateEntry("Part de matières issues de l'agriculture durable", "environmental", "Produits", "%", 22.0,
                      "Labels bio / HVE / commerce équitable."),
        TemplateEntry("Effectif total (ETP)", "social", "Emploi", "personnes", 850),
        TemplateEntry("Taux d'accidents du travail (TF1)", "social", "Santé & Sécurité", "%", 38.0,
                      "Sectoriel élevé (machines, surfaces glissantes)."),
        TemplateEntry("Heures de formation par salarié", "social", "Formation", "h/an", 18.0),
        TemplateEntry("Fournisseurs audités sur droits humains", "governance", "Supply chain", "%", 45.0),
        TemplateEntry("Part de fournisseurs avec code de conduite signé", "governance", "Supply chain", "%", 78.0),
        TemplateEntry("Signalements éthiques reçus", "governance", "Éthique", "nombre", 3),
    ],
)

FINANCE = SectorTemplate(
    sector_id="finance",
    label="Finance & Assurance",
    icon="🏦",
    description="Services financiers — émissions opérationnelles faibles, mais émissions financées (PCAF) potentiellement énormes.",
    entries=[
        TemplateEntry("Émissions GES scope 1 — Bureaux", "environmental", "Climat", "tCO2e", 35.0),
        TemplateEntry("Émissions GES scope 2 — Électricité bureaux", "environmental", "Climat", "tCO2e", 75.0),
        TemplateEntry("Consommation d'électricité totale", "environmental", "Énergie", "MWh", 1300.0),
        TemplateEntry("Part d'énergie renouvelable", "environmental", "Énergie", "%", 65.0),
        TemplateEntry("Émissions GES scope 3 cat.15 — Investissements (PCAF)", "environmental", "Climat", "tCO2e", 145000.0,
                      "Émissions financées par le portefeuille (méthode PCAF). Habituellement >99% du total."),
        TemplateEntry("Émissions GES scope 3 cat.6 — Déplacements professionnels", "environmental", "Climat", "tCO2e", 320.0),
        TemplateEntry("Part d'actifs ESG dans le portefeuille", "governance", "Finance durable", "%", 42.0,
                      "Article 8 SFDR + Article 9 SFDR."),
        TemplateEntry("Financement de projets verts", "environmental", "Finance verte", "M€", 285.0,
                      "Green bonds + crédits projets alignés Taxonomie UE."),
        TemplateEntry("Effectif total (ETP)", "social", "Emploi", "personnes", 280),
        TemplateEntry("Taux de turnover", "social", "Emploi", "%", 11.0),
        TemplateEntry("Heures de formation par salarié", "social", "Formation", "h/an", 32.0),
        TemplateEntry("Part de femmes dans l'encadrement", "social", "Égalité", "%", 40.0),
        TemplateEntry("Index égalité professionnelle F/H", "social", "Égalité", "score", 89),
        TemplateEntry("Salariés formés à l'éthique / anti-corruption", "governance", "Éthique", "%", 100.0,
                      "Sectoriel : obligation ACPR + Sapin 2."),
        TemplateEntry("Taux d'incidents de conformité", "governance", "Conformité", "%", 0.8),
        TemplateEntry("Part de femmes au conseil d'administration", "governance", "Gouvernance", "%", 48.0),
        TemplateEntry("Signalements éthiques reçus", "governance", "Éthique", "nombre", 8),
    ],
)

PHARMA = SectorTemplate(
    sector_id="pharma",
    label="Santé & Pharma",
    icon="💊",
    description="Industrie pharmaceutique — émissions Scope 3 amont (APIs) + accès aux médicaments + biodiversité.",
    entries=[
        TemplateEntry("Émissions GES scope 1 — Gaz + procédés", "environmental", "Climat", "tCO2e", 980.0),
        TemplateEntry("Émissions GES scope 1 — Fuites HFC + autres GHG procédé", "environmental", "Climat", "tCO2e", 420.0),
        TemplateEntry("Émissions GES scope 2 — Électricité usines", "environmental", "Climat", "tCO2e", 380.0),
        TemplateEntry("Consommation d'électricité totale", "environmental", "Énergie", "MWh", 6700.0),
        TemplateEntry("Part d'énergie renouvelable", "environmental", "Énergie", "%", 32.0),
        TemplateEntry("Émissions GES scope 3 cat.1 — APIs et intermédiaires", "environmental", "Climat", "tCO2e", 18500.0,
                      "Catégorie #1 pharma : synthèse principes actifs souvent en Asie."),
        TemplateEntry("Émissions GES scope 3 cat.6 — Déplacements professionnels", "environmental", "Climat", "tCO2e", 450.0),
        TemplateEntry("Émissions GES scope 3 cat.11 — Utilisation produits", "environmental", "Climat", "tCO2e", 850.0,
                      "Inhalateurs gaz propulseurs (asthme, BPCO)."),
        TemplateEntry("Émissions GES scope 3 cat.12 — Fin de vie produits", "environmental", "Climat", "tCO2e", 320.0),
        TemplateEntry("Consommation d'eau totale", "environmental", "Eau", "m3", 45000.0),
        TemplateEntry("Substances de très haute préoccupation (SVHC)", "environmental", "Pollution", "t", 0.8),
        TemplateEntry("Effectif total (ETP)", "social", "Emploi", "personnes", 720),
        TemplateEntry("Heures de formation par salarié", "social", "Formation", "h/an", 45.0,
                      "Sectoriel critique : pharmacovigilance + qualité."),
        TemplateEntry("Part de femmes en R&D/tech", "social", "Égalité", "%", 52.0),
        TemplateEntry("Part de femmes au conseil d'administration", "governance", "Gouvernance", "%", 42.0),
        TemplateEntry("Salariés formés à l'éthique / anti-corruption", "governance", "Éthique", "%", 100.0,
                      "Obligation ANSM + sectoriel (relations praticiens)."),
        TemplateEntry("Incidents santé & sécurité produits", "social", "Sécurité produits", "nombre", 2,
                      "Rappels lots, alertes pharmacovigilance."),
        TemplateEntry("Signalements éthiques reçus", "governance", "Éthique", "nombre", 5),
    ],
)

TECH = SectorTemplate(
    sector_id="technology",
    label="Technologie & Digital",
    icon="💻",
    description="SaaS / tech — émissions concentrées sur datacenters (Scope 2 ou 3) + matériel + déplacements.",
    entries=[
        TemplateEntry("Émissions GES scope 1 — Bureaux", "environmental", "Climat", "tCO2e", 18.0),
        TemplateEntry("Émissions GES scope 2 — Datacenters (location-based)", "environmental", "Climat", "tCO2e", 145.0,
                      "Datacenters propriété OU calculés via PUE × consommation."),
        TemplateEntry("Consommation d'électricité datacenters", "environmental", "Énergie", "MWh", 2500.0),
        TemplateEntry("PUE des datacenters", "environmental", "Énergie", "ratio", 1.4,
                      "Power Usage Effectiveness moyen pondéré."),
        TemplateEntry("Part d'énergie renouvelable", "environmental", "Énergie", "%", 78.0,
                      "PPA + REC + autoproduction."),
        TemplateEntry("Émissions GES scope 3 cat.1 — Achats cloud + SaaS", "environmental", "Climat", "tCO2e", 850.0,
                      "AWS, GCP, Azure, Workday, Salesforce. Estimation monétaire."),
        TemplateEntry("Émissions GES scope 3 cat.2 — Immobilisations (serveurs, matériel)", "environmental", "Climat", "tCO2e", 320.0,
                      "Cycle de vie complet serveurs, postes, mobilier."),
        TemplateEntry("Émissions GES scope 3 cat.6 — Déplacements professionnels", "environmental", "Climat", "tCO2e", 380.0),
        TemplateEntry("Émissions GES scope 3 cat.7 — Déplacements domicile-travail", "environmental", "Climat", "tCO2e", 145.0),
        TemplateEntry("Déchets électroniques (e-waste)", "environmental", "Déchets", "t", 8.5,
                      "Serveurs + postes + matériel réseau en fin de vie."),
        TemplateEntry("Effectif total (ETP)", "social", "Emploi", "personnes", 480),
        TemplateEntry("Télétravail (jours/semaine moyen)", "social", "Conditions de travail", "jours", 3.0),
        TemplateEntry("Taux de turnover", "social", "Emploi", "%", 18.0,
                      "Sectoriel élevé : marché candidat très tendu."),
        TemplateEntry("Heures de formation par salarié", "social", "Formation", "h/an", 42.0),
        TemplateEntry("Part de femmes dans l'encadrement", "social", "Égalité", "%", 32.0,
                      "Sectoriel : effort continu sur la mixité."),
        TemplateEntry("Part de femmes en R&D/tech", "social", "Égalité", "%", 24.0),
        TemplateEntry("Investissement en cybersécurité", "governance", "Risques", "k€", 380.0),
        TemplateEntry("Incidents cybersécurité notifiés CNIL", "governance", "Risques", "nombre", 0),
        TemplateEntry("Salariés formés à l'éthique / RGPD", "governance", "Éthique", "%", 95.0),
        TemplateEntry("Signalements éthiques reçus", "governance", "Éthique", "nombre", 2),
    ],
)

IMMO = SectorTemplate(
    sector_id="immo",
    label="Immobilier & Construction",
    icon="🏢",
    description="Foncières et BTP — émissions liées au parc immobilier (exploitation + construction) + matériaux.",
    entries=[
        TemplateEntry("Émissions GES scope 1 — Gaz parc immobilier", "environmental", "Climat", "tCO2e", 1850.0,
                      "Chauffage immeubles en exploitation."),
        TemplateEntry("Émissions GES scope 2 — Électricité parties communes", "environmental", "Climat", "tCO2e", 180.0),
        TemplateEntry("Consommation d'électricité totale", "environmental", "Énergie", "MWh", 3200.0),
        TemplateEntry("Intensité énergétique du parc immobilier", "environmental", "Énergie", "kWh/m²", 220.0,
                      "Niveau DPE C/D moyen — cible <100 kWh/m² (DPE A/B)."),
        TemplateEntry("Émissions GES du parc (Scope 1+2 par m²)", "environmental", "Climat", "kgCO2e/m²", 38.0),
        TemplateEntry("Émissions GES scope 3 cat.2 — Construction (matériaux + chantiers)", "environmental", "Climat", "tCO2e", 12800.0,
                      "Béton, acier, isolation. Catégorie #1 pour BTP / développeur."),
        TemplateEntry("Émissions GES scope 3 cat.13 — Locataires (énergie occupants)", "environmental", "Climat", "tCO2e", 5400.0,
                      "Si bail commercial avec consommations locataires."),
        TemplateEntry("Part du parc certifié (HQE, BREEAM, LEED)", "environmental", "Certification", "%", 35.0),
        TemplateEntry("Part du parc en énergie renouvelable", "environmental", "Énergie", "%", 28.0),
        TemplateEntry("Sites en zones sensibles biodiversité", "environmental", "Biodiversité", "nombre", 1),
        TemplateEntry("Effectif total (ETP)", "social", "Emploi", "personnes", 220),
        TemplateEntry("Taux d'accidents du travail (TF1)", "social", "Santé & Sécurité", "%", 28.0,
                      "Sectoriel : chantiers, hauteur, manutention."),
        TemplateEntry("Heures de formation par salarié", "social", "Formation", "h/an", 26.0),
        TemplateEntry("Part de logements accessibles PMR", "social", "Inclusion", "%", 35.0),
        TemplateEntry("Taux d'occupation moyen", "governance", "Performance", "%", 92.0),
        TemplateEntry("Score satisfaction locataire", "social", "Clients", "score/10", 7.8),
        TemplateEntry("Fournisseurs audités (droits humains BTP)", "governance", "Supply chain", "%", 48.0),
        TemplateEntry("Signalements éthiques reçus", "governance", "Éthique", "nombre", 3),
    ],
)


VSME = SectorTemplate(
    sector_id="vsme",
    label="VSME — Norme volontaire PME",
    icon="📋",
    description=(
        "Norme volontaire EFRAG pour les PME non cotées (décembre 2024) — couvre les 11 "
        "exigences du Module de Base (B1–B11). Valeurs types pour une PME de ~50 salariés / "
        "10 M€ CA, à ajuster avant publication. Compatible demandes bancaires et donneurs d'ordre CSRD."
    ),
    entries=[
        # B3 — Énergie & émissions GES
        TemplateEntry("Consommation totale d'énergie", "environmental", "Énergie", "MWh", 450.0,
                      "VSME B3 : électricité + combustibles, tous sites confondus.", framework="VSME"),
        TemplateEntry("Part d'énergie renouvelable", "environmental", "Énergie", "%", 30.0,
                      "VSME B3 : part renouvelable de l'électricité consommée (contrats verts inclus).", framework="VSME"),
        TemplateEntry("Émissions GES scope 1 — Sources directes", "environmental", "Climat", "tCO2e", 85.0,
                      "VSME B3 : chauffage gaz + flotte véhicules. Facteurs ADEME.", framework="VSME"),
        TemplateEntry("Émissions GES scope 2 — Électricité (location-based)", "environmental", "Climat", "tCO2e", 25.0,
                      "VSME B3 : mix électrique national (ADEME France : 0.0571 kgCO2e/kWh).", framework="VSME"),
        TemplateEntry("Intensité GES par chiffre d'affaires", "environmental", "Climat", "tCO2e/M€", 11.0,
                      "VSME B3 (optionnel) : (Scope 1 + Scope 2) / CA en M€.", framework="VSME"),
        # B4 — Pollution
        TemplateEntry("Polluants soumis à déclaration réglementaire", "environmental", "Pollution", "nombre", 0,
                      "VSME B4 : substances déclarées au registre national des émissions (GEREP) le cas échéant.", framework="VSME"),
        # B5 — Biodiversité
        TemplateEntry("Sites en zones sensibles biodiversité", "environmental", "Biodiversité", "nombre", 0,
                      "VSME B5 : sites dans ou à proximité de zones protégées (Natura 2000, ZNIEFF).", framework="VSME"),
        TemplateEntry("Surface totale artificialisée", "environmental", "Biodiversité", "ha", 1.2,
                      "VSME B5 : emprise au sol bâtiments + parkings + voiries.", framework="VSME"),
        # B6 — Eau
        TemplateEntry("Prélèvement d'eau total", "environmental", "Eau", "m3", 1800.0,
                      "VSME B6 : eau de réseau + forages, tous usages.", framework="VSME"),
        TemplateEntry("Prélèvement d'eau en zones de stress hydrique", "environmental", "Eau", "m3", 0.0,
                      "VSME B6 : sites situés en zones de stress hydrique élevé (WRI Aqueduct).", framework="VSME"),
        # B7 — Ressources & économie circulaire
        TemplateEntry("Déchets totaux générés", "environmental", "Déchets", "t", 35.0,
                      "VSME B7 : déchets dangereux + non dangereux.", framework="VSME"),
        TemplateEntry("Déchets dangereux générés", "environmental", "Déchets", "t", 1.5,
                      "VSME B7 : solvants, huiles, DEEE, batteries.", framework="VSME"),
        TemplateEntry("Taux de recyclage des déchets", "environmental", "Déchets", "%", 55.0,
                      "VSME B7 : déchets orientés recyclage ou réemploi / total.", framework="VSME"),
        # B8 — Effectifs : caractéristiques générales
        TemplateEntry("Effectif total (ETP)", "social", "Emploi", "personnes", 48,
                      "VSME B8 : ETP au 31/12, par type de contrat et genre.", framework="VSME"),
        TemplateEntry("Part des femmes dans l'effectif", "social", "Égalité", "%", 45.0,
                      "VSME B8 : répartition par genre.", framework="VSME"),
        TemplateEntry("Part de contrats à durée indéterminée", "social", "Emploi", "%", 88.0,
                      "VSME B8 : CDI / effectif total.", framework="VSME"),
        # B9 — Santé & sécurité
        TemplateEntry("Accidents du travail avec arrêt", "social", "Santé & Sécurité", "nombre", 1,
                      "VSME B9 : accidents enregistrables sur l'exercice.", framework="VSME"),
        TemplateEntry("Décès liés au travail", "social", "Santé & Sécurité", "nombre", 0,
                      "VSME B9 : décès consécutifs à un accident du travail ou maladie professionnelle.", framework="VSME"),
        # B10 — Rémunération, négociation collective, formation
        TemplateEntry("Écart de rémunération femmes-hommes", "social", "Égalité", "%", 9.0,
                      "VSME B10 : écart de rémunération horaire brute moyenne.", framework="VSME"),
        TemplateEntry("Couverture par convention collective", "social", "Conditions de travail", "%", 100.0,
                      "VSME B10 : salariés couverts par une convention collective.", framework="VSME"),
        TemplateEntry("Heures de formation par salarié", "social", "Formation", "h/an", 12.0,
                      "VSME B10 : moyenne annuelle, par genre si disponible.", framework="VSME"),
        # B11 — Corruption
        TemplateEntry("Condamnations pour corruption", "governance", "Éthique", "nombre", 0,
                      "VSME B11 : condamnations prononcées sur l'exercice.", framework="VSME"),
        TemplateEntry("Amendes liées à la corruption", "governance", "Éthique", "k€", 0.0,
                      "VSME B11 : montant total des amendes corruption / pots-de-vin.", framework="VSME"),
    ],
    suggested_narratives={
        "b1_basis": "Rapport établi selon la norme VSME (EFRAG, décembre 2024), Module de Base, sur une base [individuelle/consolidée]. Périmètre : [ENTITÉ(S)], exercice [ANNÉE]. Sites : [LISTE].",
        "b2_practices": "L'entreprise a mis en place les pratiques suivantes en matière de transition durable : [POLITIQUES/PRATIQUES — ex. politique d'achats responsables, suivi énergétique mensuel, plan de sobriété]. Objectifs : [CIBLES le cas échéant].",
    },
)


# ─── Registry ───────────────────────────────────────────────────────────────
SECTOR_TEMPLATES: Dict[str, SectorTemplate] = {
    t.sector_id: t for t in [
        INDUSTRY, RETAIL, SERVICES, AGRO,
        FINANCE, PHARMA, TECH, IMMO, VSME,
    ]
}


def list_available_templates() -> List[Dict[str, Any]]:
    """Lightweight summary (used in the template gallery)."""
    out = []
    for t in SECTOR_TEMPLATES.values():
        by_pillar: Dict[str, int] = {}
        for e in t.entries:
            by_pillar[e.pillar] = by_pillar.get(e.pillar, 0) + 1
        out.append({
            "sector_id": t.sector_id,
            "label": t.label,
            "icon": t.icon,
            "description": t.description,
            "entry_count": len(t.entries),
            "by_pillar": by_pillar,
        })
    return out


def get_template(sector_id: str) -> Optional[SectorTemplate]:
    return SECTOR_TEMPLATES.get(sector_id)
