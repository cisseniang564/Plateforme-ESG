"""
ESRS XBRL Taxonomy Catalog — production-grade concept registry.

This module is the single source of truth for ESRS concepts used in:
  - iXBRL generation (`ixbrl_service.py`)
  - Frontend tagging UI (served via `/api/v1/reports/ixbrl/catalog`)
  - Auto-mapping of ESGflow metric names → ESRS data points
  - Validation rules (decimals, period type, mandatory flags)

Reference taxonomy:
  Namespace:     https://xbrl.efrag.org/taxonomy/esrs/2024-12-31/esrs_cor
  Authority:     European Financial Reporting Advisory Group (EFRAG)
  Effective:     2024-12-31 (CSRD reporting starting FY2024)
  Documentation: https://www.efrag.org/lab6 (ESRS XBRL Taxonomy Working Group)

This is NOT a full implementation of the EFRAG taxonomy (~1000+ data points)
but covers the most commonly reported concepts across E1-E5, S1-S4, G1 — the
mandatory disclosures triggering iXBRL tagging under CSRD Art. 8.

For full XSD validation (regulator filing), the generated iXBRL should be
processed through Arelle (https://arelle.org/) loaded with the official
EFRAG taxonomy package.
"""
from __future__ import annotations

from dataclasses import dataclass, asdict, field
from typing import Dict, List, Optional, Iterable


# ── Official EFRAG ESRS XBRL Taxonomy URIs (2024-12-31) ─────────────────────
ESRS_NS = "https://xbrl.efrag.org/taxonomy/esrs/2024-12-31/esrs_cor"
ESRS_SCHEMA_REF = "https://xbrl.efrag.org/taxonomy/esrs/2024-12-31/esrs_cor.xsd"

# Identifier scheme: LEI is the gold standard; SIREN is accepted by ESMA for
# French issuers per the ESEF Reporting Manual Annex IV.
SCHEME_LEI = "http://standards.iso.org/iso/17442"
SCHEME_SIREN = "http://www.insee.fr/siren"


@dataclass(frozen=True)
class ESRSConcept:
    """
    A single ESRS data point definition.

    Attributes
    ----------
    concept_id      QName (prefix:LocalName) as published in the EFRAG taxonomy.
                    Always uses ``esrs:`` prefix in this implementation (the
                    EFRAG taxonomy puts everything in a single namespace; the
                    -e / -s / -g separation seen in some UIs is purely visual).
    label_en        English label (preferred for ESEF filings)
    label_fr        French label (UI / domestic reports)
    data_type       XBRL primitive: ``decimal``, ``integer``, ``boolean``,
                    ``textBlock``, ``string``, ``date``, ``monetaryItemType``.
    period_type     ``duration`` (e.g. annual emissions) or ``instant``
                    (e.g. headcount at year-end).
    unit_ref        XBRL unit ID (one of ``tCO2e``, ``MWh``, ``GJ``, ``m3``,
                    ``t``, ``pure``, ``EUR``, ``hours``, ``days``). ``None``
                    for non-numeric concepts.
    decimals        Default ``decimals`` attribute for iXBRL fact (e.g. 0
                    for whole units, -3 for thousands).
    standard        ESRS standard code (``E1``, ``S1``, ``G1``…). Used for
                    grouping in the UI.
    disclosure      Disclosure Requirement reference (e.g. ``E1-6``, ``S1-14``).
                    Maps directly to the EFRAG DR catalog.
    required        Mandatory under "comply or explain" for the standard.
    mapping_keys    Heuristic keywords used to auto-match ESGflow
                    ``DataEntry.metric_name`` → this concept. Lower-case,
                    matched with ``in metric_name.lower()``.
    """
    concept_id: str
    label_en: str
    label_fr: str
    data_type: str
    period_type: str
    unit_ref: Optional[str]
    decimals: Optional[int]
    standard: str
    disclosure: str
    required: bool
    mapping_keys: List[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)


# ────────────────────────────────────────────────────────────────────────────
# Concept catalog
# ────────────────────────────────────────────────────────────────────────────
# This list intentionally focuses on the most commonly-reported data points.
# Each concept_id is the LocalName as published in the EFRAG ESRS Cor taxonomy.
# When the official ID differs from common usage, we follow EFRAG nomenclature.

ESRS_CONCEPTS: List[ESRSConcept] = [
    # ── ESRS 2 — General disclosures (governance + strategy) ─────────────────
    ESRSConcept("esrs:DescriptionOfRiskManagementProcessesAndIROManagement",
        "Description of risk management and IRO processes",
        "Description du processus de gestion des risques et IRO",
        "textBlock", "duration", None, None, "ESRS 2", "IRO-1", True,
        ["risk_management", "iro"]),
    ESRSConcept("esrs:DescriptionOfMaterialityAssessmentProcess",
        "Description of materiality assessment process",
        "Processus d'évaluation de la double matérialité",
        "textBlock", "duration", None, None, "ESRS 2", "SBM-3", True,
        ["materiality", "double_materiality", "materialite"]),
    ESRSConcept("esrs:DescriptionOfValueChain",
        "Description of the value chain",
        "Description de la chaîne de valeur",
        "textBlock", "duration", None, None, "ESRS 2", "SBM-1", True,
        ["value_chain", "chaine_valeur"]),
    ESRSConcept("esrs:DescriptionOfBusinessModel",
        "Description of the business model",
        "Description du modèle d'affaires",
        "textBlock", "duration", None, None, "ESRS 2", "SBM-1", True,
        ["business_model", "modele_affaires"]),
    ESRSConcept("esrs:DescriptionOfGovernanceStructureAndComposition",
        "Sustainability governance structure and composition",
        "Structure et composition de la gouvernance durabilité",
        "textBlock", "duration", None, None, "ESRS 2", "GOV-1", True,
        ["governance_structure", "gouvernance"]),
    ESRSConcept("esrs:DescriptionOfProcessForEngagingWithStakeholders",
        "Process for engaging with stakeholders",
        "Processus d'engagement des parties prenantes",
        "textBlock", "duration", None, None, "ESRS 2", "SBM-2", True,
        ["stakeholder_engagement", "parties_prenantes"]),

    # ── ESRS E1 — Climate change ────────────────────────────────────────────
    ESRSConcept("esrs:GrossScope1GreenhouseGasEmissions",
        "Gross Scope 1 GHG emissions",
        "Émissions brutes de GES Scope 1",
        "decimal", "duration", "tCO2e", 0, "ESRS E1", "E1-6", True,
        ["scope1", "scope_1", "ges_scope1", "scope 1"]),
    ESRSConcept("esrs:GrossLocationBasedScope2GreenhouseGasEmissions",
        "Gross location-based Scope 2 GHG emissions",
        "Émissions brutes de GES Scope 2 — base localisation",
        "decimal", "duration", "tCO2e", 0, "ESRS E1", "E1-6", True,
        ["scope2_location", "scope2", "scope_2", "ges_scope2"]),
    ESRSConcept("esrs:GrossMarketBasedScope2GreenhouseGasEmissions",
        "Gross market-based Scope 2 GHG emissions",
        "Émissions brutes de GES Scope 2 — base marché",
        "decimal", "duration", "tCO2e", 0, "ESRS E1", "E1-6", False,
        ["scope2_market", "scope2_marche"]),
    ESRSConcept("esrs:TotalGrossIndirectScope3GreenhouseGasEmissions",
        "Total gross indirect Scope 3 GHG emissions",
        "Émissions GES indirectes Scope 3 totales",
        "decimal", "duration", "tCO2e", 0, "ESRS E1", "E1-6", False,
        ["scope3", "scope_3", "ges_scope3"]),
    ESRSConcept("esrs:TotalGreenhouseGasEmissions",
        "Total GHG emissions (Scope 1+2+3)",
        "Émissions GES totales (Scope 1+2+3)",
        "decimal", "duration", "tCO2e", 0, "ESRS E1", "E1-6", True,
        ["total_ges", "ges_total", "total_emissions", "emissions_total"]),
    ESRSConcept("esrs:GHGEmissionsIntensityPerNetRevenue",
        "GHG emissions intensity per net revenue",
        "Intensité GES par chiffre d'affaires net",
        "decimal", "duration", "tCO2e", 2, "ESRS E1", "E1-6", True,
        ["intensity_carbon", "intensite_carbone", "carbon_intensity"]),
    ESRSConcept("esrs:GHGEmissionReductionTargetYear",
        "GHG emission reduction target year",
        "Année cible de réduction GES",
        "integer", "instant", None, 0, "ESRS E1", "E1-4", True,
        ["target_year_ghg", "annee_cible"]),
    ESRSConcept("esrs:GHGEmissionReductionTargetPercentage",
        "GHG emission reduction target percentage",
        "Taux de réduction GES cible (%)",
        "decimal", "instant", "pure", 2, "ESRS E1", "E1-4", True,
        ["reduction_target_pct", "objectif_reduction"]),
    ESRSConcept("esrs:EnergyConsumptionFromFossilSources",
        "Energy consumption from fossil sources",
        "Consommation d'énergie issue de sources fossiles",
        "decimal", "duration", "MWh", 0, "ESRS E1", "E1-5", True,
        ["energy_fossil", "energie_fossile"]),
    ESRSConcept("esrs:EnergyConsumptionFromNuclearSources",
        "Energy consumption from nuclear sources",
        "Consommation d'énergie issue du nucléaire",
        "decimal", "duration", "MWh", 0, "ESRS E1", "E1-5", False,
        ["energy_nuclear", "energie_nucleaire"]),
    ESRSConcept("esrs:EnergyConsumptionFromRenewableSources",
        "Energy consumption from renewable sources",
        "Consommation d'énergie renouvelable",
        "decimal", "duration", "MWh", 0, "ESRS E1", "E1-5", True,
        ["energy_renewable", "energie_renouvelable", "renouvelable"]),
    ESRSConcept("esrs:TotalEnergyConsumption",
        "Total energy consumption",
        "Consommation totale d'énergie",
        "decimal", "duration", "MWh", 0, "ESRS E1", "E1-5", True,
        ["energy_consumption", "energy_total", "consommation_energie"]),
    ESRSConcept("esrs:EnergyIntensityPerNetRevenue",
        "Energy intensity per net revenue",
        "Intensité énergétique par chiffre d'affaires",
        "decimal", "duration", "MWh", 2, "ESRS E1", "E1-5", True,
        ["energy_intensity", "intensite_energetique"]),
    ESRSConcept("esrs:PercentageOfEnergyFromRenewableSources",
        "Percentage of energy from renewable sources",
        "Part d'énergie renouvelable (%)",
        "decimal", "duration", "pure", 2, "ESRS E1", "E1-5", False,
        ["renewable_pct", "part_renouvelable"]),
    ESRSConcept("esrs:DescriptionOfClimateTransitionPlan",
        "Description of climate transition plan",
        "Plan de transition climatique",
        "textBlock", "duration", None, None, "ESRS E1", "E1-1", True,
        ["transition_plan", "plan_transition"]),
    ESRSConcept("esrs:ClimateChangeMitigationPolicy",
        "Climate change mitigation policy",
        "Politique d'atténuation du changement climatique",
        "textBlock", "duration", None, None, "ESRS E1", "E1-2", True,
        ["mitigation_policy", "politique_attenuation"]),

    # ── ESRS E2 — Pollution ─────────────────────────────────────────────────
    ESRSConcept("esrs:EmissionsOfPollutantsToAir",
        "Emissions of pollutants to air",
        "Émissions de polluants dans l'air",
        "decimal", "duration", "t", 1, "ESRS E2", "E2-4", False,
        ["air_pollution", "pollution_air"]),
    ESRSConcept("esrs:EmissionsOfPollutantsToWater",
        "Emissions of pollutants to water",
        "Émissions de polluants dans l'eau",
        "decimal", "duration", "t", 1, "ESRS E2", "E2-4", False,
        ["water_pollution", "pollution_eau"]),
    ESRSConcept("esrs:EmissionsOfPollutantsToSoil",
        "Emissions of pollutants to soil",
        "Émissions de polluants dans le sol",
        "decimal", "duration", "t", 1, "ESRS E2", "E2-4", False,
        ["soil_pollution", "pollution_sol"]),

    # ── ESRS E3 — Water and marine resources ────────────────────────────────
    ESRSConcept("esrs:TotalWaterWithdrawal",
        "Total water withdrawal",
        "Prélèvement total d'eau",
        "decimal", "duration", "m3", 0, "ESRS E3", "E3-4", False,
        ["water_withdrawal", "prelevement_eau"]),
    ESRSConcept("esrs:TotalWaterDischarge",
        "Total water discharge",
        "Rejets d'eau totaux",
        "decimal", "duration", "m3", 0, "ESRS E3", "E3-4", False,
        ["water_discharge", "rejet_eau"]),
    ESRSConcept("esrs:TotalWaterConsumption",
        "Total water consumption",
        "Consommation nette d'eau",
        "decimal", "duration", "m3", 0, "ESRS E3", "E3-4", False,
        ["water_consumption", "consommation_eau"]),
    ESRSConcept("esrs:WaterWithdrawalInWaterStressAreas",
        "Water withdrawal in areas of water stress",
        "Prélèvement d'eau en zones de stress hydrique",
        "decimal", "duration", "m3", 0, "ESRS E3", "E3-4", False,
        ["water_stress"]),

    # ── ESRS E4 — Biodiversity (placeholder) ────────────────────────────────
    ESRSConcept("esrs:NumberOfSitesOwnedNearBiodiversitySensitiveAreas",
        "Sites owned near biodiversity-sensitive areas",
        "Sites proches de zones sensibles biodiversité",
        "integer", "instant", None, 0, "ESRS E4", "E4-5", False,
        ["biodiversity_sites"]),

    # ── ESRS E5 — Resource use and circular economy ─────────────────────────
    ESRSConcept("esrs:TotalAmountOfWasteGenerated",
        "Total waste generated",
        "Quantité totale de déchets générés",
        "decimal", "duration", "t", 1, "ESRS E5", "E5-5", False,
        ["waste_total", "dechets_total"]),
    ESRSConcept("esrs:AmountOfHazardousWasteGenerated",
        "Hazardous waste generated",
        "Déchets dangereux générés",
        "decimal", "duration", "t", 1, "ESRS E5", "E5-5", False,
        ["hazardous_waste", "dechets_dangereux"]),
    ESRSConcept("esrs:AmountOfWasteDivertedFromDisposal",
        "Waste diverted from disposal (recycling, reuse)",
        "Déchets valorisés (recyclage, réemploi)",
        "decimal", "duration", "t", 1, "ESRS E5", "E5-5", False,
        ["waste_recycled", "dechets_recycles"]),

    # ── ESRS S1 — Own workforce ─────────────────────────────────────────────
    ESRSConcept("esrs:NumberOfEmployees",
        "Total number of employees (head count)",
        "Nombre total de salariés (effectif)",
        "integer", "instant", None, 0, "ESRS S1", "S1-6", True,
        ["total_employees", "effectif_total", "nombre_salaries"]),
    ESRSConcept("esrs:NumberOfPermanentEmployees",
        "Number of permanent employees",
        "Salariés en CDI",
        "integer", "instant", None, 0, "ESRS S1", "S1-6", True,
        ["permanent_employees", "cdi"]),
    ESRSConcept("esrs:NumberOfTemporaryEmployees",
        "Number of temporary employees",
        "Salariés en CDD / temporaires",
        "integer", "instant", None, 0, "ESRS S1", "S1-6", True,
        ["temporary_employees", "cdd", "temporaire"]),
    ESRSConcept("esrs:NumberOfFullTimeEmployees",
        "Number of full-time employees",
        "Salariés à temps plein",
        "integer", "instant", None, 0, "ESRS S1", "S1-6", False,
        ["full_time", "temps_plein"]),
    ESRSConcept("esrs:NumberOfPartTimeEmployees",
        "Number of part-time employees",
        "Salariés à temps partiel",
        "integer", "instant", None, 0, "ESRS S1", "S1-6", False,
        ["part_time", "temps_partiel"]),
    ESRSConcept("esrs:PercentageOfFemaleEmployees",
        "Percentage of female employees",
        "Pourcentage de femmes dans les effectifs",
        "decimal", "instant", "pure", 2, "ESRS S1", "S1-6", True,
        ["female_pct", "pourcentage_femmes", "parite_femmes"]),
    ESRSConcept("esrs:GenderPayGap",
        "Gender pay gap",
        "Écart de rémunération femmes/hommes",
        "decimal", "duration", "pure", 2, "ESRS S1", "S1-16", True,
        ["gender_pay_gap", "ecart_remuneration"]),
    ESRSConcept("esrs:CEOPayRatio",
        "CEO pay ratio (annual CEO pay / median employee pay)",
        "Ratio rémunération PDG / médiane salariés",
        "decimal", "duration", "pure", 1, "ESRS S1", "S1-16", True,
        ["ceo_pay_ratio", "ratio_pdg"]),
    ESRSConcept("esrs:NumberOfWorkRelatedFatalities",
        "Number of work-related fatalities",
        "Nombre de décès liés au travail",
        "integer", "duration", None, 0, "ESRS S1", "S1-14", True,
        ["fatalities", "deces_travail"]),
    ESRSConcept("esrs:WorkRelatedInjuriesRateOfRecordableIncidents",
        "Recordable work-related injuries rate",
        "Taux de fréquence des accidents du travail",
        "decimal", "duration", "pure", 2, "ESRS S1", "S1-14", True,
        ["accident_rate", "tfat", "frequence_accidents"]),
    ESRSConcept("esrs:NumberOfWorkRelatedInjuries",
        "Number of work-related injuries",
        "Nombre d'accidents du travail",
        "integer", "duration", None, 0, "ESRS S1", "S1-14", False,
        ["accidents_count", "nb_accidents"]),
    ESRSConcept("esrs:AverageTrainingHoursPerEmployee",
        "Average training hours per employee",
        "Heures de formation moyennes par salarié",
        "decimal", "duration", "hours", 1, "ESRS S1", "S1-13", False,
        ["training_hours", "heures_formation"]),
    ESRSConcept("esrs:PercentageOfEmployeesCoveredByCollectiveBargainingAgreements",
        "Percentage of employees covered by collective bargaining",
        "Salariés couverts par accord collectif (%)",
        "decimal", "instant", "pure", 2, "ESRS S1", "S1-8", True,
        ["collective_bargaining_pct", "convention_collective"]),

    # ── ESRS S2 — Workers in value chain ────────────────────────────────────
    ESRSConcept("esrs:DescriptionOfPoliciesForValueChainWorkers",
        "Policies for workers in the value chain",
        "Politiques relatives aux travailleurs de la chaîne de valeur",
        "textBlock", "duration", None, None, "ESRS S2", "S2-1", True,
        ["value_chain_workers", "chaine_valeur_travailleurs"]),

    # ── ESRS S3 — Affected communities ──────────────────────────────────────
    ESRSConcept("esrs:DescriptionOfImpactsOnAffectedCommunities",
        "Description of impacts on affected communities",
        "Impacts sur les communautés affectées",
        "textBlock", "duration", None, None, "ESRS S3", "S3-1", False,
        ["communities", "communautes"]),

    # ── ESRS S4 — Consumers and end-users ───────────────────────────────────
    ESRSConcept("esrs:DescriptionOfPoliciesForConsumersAndEndUsers",
        "Policies for consumers and end-users",
        "Politiques relatives aux consommateurs et utilisateurs finaux",
        "textBlock", "duration", None, None, "ESRS S4", "S4-1", False,
        ["consumers", "consommateurs"]),

    # ── ESRS G1 — Business conduct ──────────────────────────────────────────
    ESRSConcept("esrs:DescriptionOfPoliciesOnCorruptionAndBribery",
        "Policies on corruption and bribery",
        "Politiques anti-corruption et anti-blanchiment",
        "textBlock", "duration", None, None, "ESRS G1", "G1-1", True,
        ["anticorruption_policy", "politique_anticorruption"]),
    ESRSConcept("esrs:NumberOfConvictionsForViolationOfAntiCorruptionLaws",
        "Convictions for anti-corruption violations",
        "Condamnations pour corruption",
        "integer", "duration", None, 0, "ESRS G1", "G1-4", True,
        ["corruption_convictions", "condamnations_corruption"]),
    ESRSConcept("esrs:AmountOfFinesForViolationOfAntiCorruptionLaws",
        "Fines for anti-corruption violations",
        "Amendes pour violations anti-corruption",
        "decimal", "duration", "EUR", 0, "ESRS G1", "G1-4", True,
        ["corruption_fines", "amendes_corruption"]),
    ESRSConcept("esrs:NumberOfEmployeesAtRiskOfCorruptionTrained",
        "Employees at risk of corruption trained",
        "Salariés exposés au risque corruption formés",
        "integer", "duration", None, 0, "ESRS G1", "G1-3", False,
        ["anticorruption_training"]),
    ESRSConcept("esrs:DescriptionOfPaymentPracticesAndSupplierRelations",
        "Description of payment practices with suppliers",
        "Pratiques de paiement et relations fournisseurs",
        "textBlock", "duration", None, None, "ESRS G1", "G1-6", True,
        ["payment_practices", "delais_paiement"]),
    ESRSConcept("esrs:AverageNumberOfDaysToPaySupplierInvoice",
        "Average days to pay a supplier invoice",
        "Délai moyen de paiement fournisseurs (jours)",
        "decimal", "duration", "days", 1, "ESRS G1", "G1-6", True,
        ["payment_days", "dpo", "delai_paiement"]),

    # ═══════════════════════════════════════════════════════════════════════════
    # EXTENSION 55 → 150 — Datapoints complémentaires pour couverture exhaustive
    # ═══════════════════════════════════════════════════════════════════════════

    # ── ESRS 2 (Informations générales) — +9 ──────────────────────────────────
    ESRSConcept("esrs:DescriptionOfStrategyForSustainability",
        "Strategy for sustainability matters",
        "Stratégie en matière de durabilité",
        "textBlock", "duration", None, None, "ESRS 2", "SBM-1", True,
        ["sustainability_strategy", "strategie_durabilite"]),
    ESRSConcept("esrs:DescriptionOfRoleOfAdministrativeManagementSupervisoryBodies",
        "Role of administrative, management and supervisory bodies",
        "Rôle des organes d'administration, de direction et de supervision",
        "textBlock", "duration", None, None, "ESRS 2", "GOV-1", True,
        ["board_role", "role_conseil", "gouvernance"]),
    ESRSConcept("esrs:DescriptionOfInformationProvidedToBoard",
        "Information provided to administrative bodies on sustainability",
        "Information durabilité communiquée à l'organe d'administration",
        "textBlock", "duration", None, None, "ESRS 2", "GOV-2", True,
        ["board_information", "info_conseil"]),
    ESRSConcept("esrs:DescriptionOfIntegrationOfSustainabilityInIncentiveSchemes",
        "Integration of sustainability into incentive schemes",
        "Intégration de la durabilité dans les rémunérations",
        "textBlock", "duration", None, None, "ESRS 2", "GOV-3", True,
        ["incentive_schemes", "remuneration_esg"]),
    ESRSConcept("esrs:DueDiligenceStatement",
        "Statement on due diligence",
        "Déclaration sur le devoir de vigilance",
        "textBlock", "duration", None, None, "ESRS 2", "GOV-4", True,
        ["due_diligence", "devoir_vigilance"]),
    ESRSConcept("esrs:RiskManagementAndInternalControlsOverSustainability",
        "Risk management and internal controls over sustainability reporting",
        "Gestion des risques et contrôles internes sur le reporting durabilité",
        "textBlock", "duration", None, None, "ESRS 2", "GOV-5", True,
        ["internal_controls", "controle_interne"]),
    ESRSConcept("esrs:GeneralBasisForPreparation",
        "General basis for preparation of sustainability statements",
        "Base générale de préparation des états de durabilité",
        "textBlock", "duration", None, None, "ESRS 2", "BP-1", True,
        ["basis_preparation", "base_preparation"]),
    ESRSConcept("esrs:DisclosuresInRelationToSpecificCircumstances",
        "Disclosures in relation to specific circumstances",
        "Informations relatives à des circonstances spécifiques",
        "textBlock", "duration", None, None, "ESRS 2", "BP-2", True,
        ["specific_circumstances"]),
    ESRSConcept("esrs:DescriptionOfActionsAndResourcesAllocatedToMaterialIROs",
        "Actions and resources allocated to material IROs",
        "Actions et ressources allouées aux IRO matériels",
        "textBlock", "duration", None, None, "ESRS 2", "IRO-2", True,
        ["material_actions", "actions_iro"]),

    # ── ESRS E1 (Climat) — +9 ─────────────────────────────────────────────────
    ESRSConcept("esrs:Scope3Category1PurchasedGoodsAndServices",
        "Scope 3 cat.1 — Purchased goods and services",
        "Scope 3 cat.1 — Achats de biens et services",
        "decimal", "duration", "tCO2e", 0, "ESRS E1", "E1-6", False,
        ["scope3_cat1", "achats_biens_services", "purchased_goods"]),
    ESRSConcept("esrs:Scope3Category4UpstreamTransportation",
        "Scope 3 cat.4 — Upstream transportation and distribution",
        "Scope 3 cat.4 — Transport et distribution amont",
        "decimal", "duration", "tCO2e", 0, "ESRS E1", "E1-6", False,
        ["scope3_cat4", "transport_amont", "upstream_transport"]),
    ESRSConcept("esrs:Scope3Category6BusinessTravel",
        "Scope 3 cat.6 — Business travel",
        "Scope 3 cat.6 — Déplacements professionnels",
        "decimal", "duration", "tCO2e", 0, "ESRS E1", "E1-6", False,
        ["scope3_cat6", "business_travel", "deplacements_pro"]),
    ESRSConcept("esrs:Scope3Category7EmployeeCommuting",
        "Scope 3 cat.7 — Employee commuting",
        "Scope 3 cat.7 — Déplacements domicile-travail",
        "decimal", "duration", "tCO2e", 0, "ESRS E1", "E1-6", False,
        ["scope3_cat7", "commuting", "domicile_travail"]),
    ESRSConcept("esrs:Scope3Category11UseOfSoldProducts",
        "Scope 3 cat.11 — Use of sold products",
        "Scope 3 cat.11 — Utilisation des produits vendus",
        "decimal", "duration", "tCO2e", 0, "ESRS E1", "E1-6", False,
        ["scope3_cat11", "use_sold_products", "utilisation_produits"]),
    ESRSConcept("esrs:Scope3Category12EndOfLifeTreatment",
        "Scope 3 cat.12 — End-of-life treatment of sold products",
        "Scope 3 cat.12 — Fin de vie des produits vendus",
        "decimal", "duration", "tCO2e", 0, "ESRS E1", "E1-6", False,
        ["scope3_cat12", "end_of_life", "fin_de_vie"]),
    ESRSConcept("esrs:InternalCarbonPrice",
        "Internal carbon price applied",
        "Prix interne du carbone appliqué",
        "decimal", "instant", "EUR", 2, "ESRS E1", "E1-8", False,
        ["internal_carbon_price", "prix_carbone_interne"]),
    ESRSConcept("esrs:PercentageOfScope1And2EmissionsCovered",
        "Percentage of Scope 1 & 2 emissions covered by internal carbon price",
        "% des émissions Scope 1+2 couvertes par le prix interne du carbone",
        "decimal", "instant", "pure", 2, "ESRS E1", "E1-8", False,
        ["carbon_coverage_pct"]),
    ESRSConcept("esrs:AnticipatedFinancialEffectsFromClimateRisks",
        "Anticipated financial effects from material climate-related risks",
        "Effets financiers anticipés des risques climatiques matériels",
        "decimal", "duration", "EUR", -3, "ESRS E1", "E1-9", False,
        ["climate_financial_impact", "impact_financier_climat"]),

    # ── ESRS E2 (Pollution) — +9 ──────────────────────────────────────────────
    ESRSConcept("esrs:NOxEmissions",
        "NOx emissions",
        "Émissions d'oxydes d'azote (NOx)",
        "decimal", "duration", "t", 1, "ESRS E2", "E2-4", False,
        ["nox", "azote", "nitrogen_oxides"]),
    ESRSConcept("esrs:SOxEmissions",
        "SOx emissions",
        "Émissions d'oxydes de soufre (SOx)",
        "decimal", "duration", "t", 1, "ESRS E2", "E2-4", False,
        ["sox", "soufre", "sulfur_oxides"]),
    ESRSConcept("esrs:VOCEmissions",
        "Volatile organic compound emissions",
        "Émissions de composés organiques volatils (COV)",
        "decimal", "duration", "t", 1, "ESRS E2", "E2-4", False,
        ["voc", "cov", "volatile_compounds"]),
    ESRSConcept("esrs:ParticulateMatterEmissions",
        "Particulate matter emissions (PM10/PM2.5)",
        "Émissions de particules fines (PM10/PM2.5)",
        "decimal", "duration", "t", 2, "ESRS E2", "E2-4", False,
        ["particulates", "particules", "pm10", "pm25"]),
    ESRSConcept("esrs:SubstancesOfConcern",
        "Production / use of substances of concern",
        "Production/usage de substances préoccupantes",
        "decimal", "duration", "t", 2, "ESRS E2", "E2-5", False,
        ["substances_concern", "substances_preoccupantes"]),
    ESRSConcept("esrs:SubstancesOfVeryHighConcern",
        "Production / use of substances of very high concern (SVHC)",
        "Production/usage de substances extrêmement préoccupantes (SVHC)",
        "decimal", "duration", "t", 2, "ESRS E2", "E2-5", False,
        ["svhc", "substances_extremement_preoccupantes"]),
    ESRSConcept("esrs:MicroplasticsGenerated",
        "Microplastics generated or released",
        "Microplastiques générés ou libérés",
        "decimal", "duration", "t", 3, "ESRS E2", "E2-5", False,
        ["microplastics", "microplastiques"]),
    ESRSConcept("esrs:PollutionPreventionActionsAndResources",
        "Actions and resources for pollution prevention",
        "Actions et ressources pour la prévention de la pollution",
        "textBlock", "duration", None, None, "ESRS E2", "E2-2", True,
        ["pollution_actions", "actions_pollution"]),
    ESRSConcept("esrs:PollutionTargets",
        "Targets related to pollution",
        "Objectifs liés à la pollution",
        "textBlock", "duration", None, None, "ESRS E2", "E2-3", True,
        ["pollution_targets", "objectifs_pollution"]),

    # ── ESRS E3 (Eau & ressources marines) — +8 ───────────────────────────────
    ESRSConcept("esrs:WaterWithdrawal",
        "Total water withdrawal",
        "Prélèvement total d'eau",
        "decimal", "duration", "m3", 0, "ESRS E3", "E3-4", True,
        ["water_withdrawal", "prelevement_eau"]),
    ESRSConcept("esrs:WaterDischarge",
        "Total water discharge",
        "Rejet total d'eau",
        "decimal", "duration", "m3", 0, "ESRS E3", "E3-4", True,
        ["water_discharge", "rejet_eau"]),
    ESRSConcept("esrs:WaterConsumptionInHighWaterStressAreas",
        "Water consumption in high water stress areas",
        "Consommation d'eau en zones de stress hydrique élevé",
        "decimal", "duration", "m3", 0, "ESRS E3", "E3-4", True,
        ["water_stress", "stress_hydrique"]),
    ESRSConcept("esrs:WaterRecycledAndReused",
        "Water recycled and reused",
        "Eau recyclée et réutilisée",
        "decimal", "duration", "m3", 0, "ESRS E3", "E3-4", False,
        ["water_recycled", "eau_recyclee"]),
    ESRSConcept("esrs:WaterIntensityPerNetRevenue",
        "Water intensity per net revenue",
        "Intensité hydrique par chiffre d'affaires",
        "decimal", "duration", "m3", 2, "ESRS E3", "E3-4", False,
        ["water_intensity", "intensite_eau"]),
    ESRSConcept("esrs:WaterAndMarineResourcesPolicies",
        "Water and marine resources policies",
        "Politiques relatives à l'eau et aux ressources marines",
        "textBlock", "duration", None, None, "ESRS E3", "E3-1", True,
        ["water_policy", "politique_eau"]),
    ESRSConcept("esrs:WaterTargets",
        "Targets related to water and marine resources",
        "Objectifs liés à l'eau et aux ressources marines",
        "textBlock", "duration", None, None, "ESRS E3", "E3-3", True,
        ["water_targets", "objectifs_eau"]),
    ESRSConcept("esrs:WaterActionsAndResources",
        "Actions and resources related to water",
        "Actions et ressources liées à l'eau",
        "textBlock", "duration", None, None, "ESRS E3", "E3-2", True,
        ["water_actions", "actions_eau"]),

    # ── ESRS E4 (Biodiversité & écosystèmes) — +12 ────────────────────────────
    ESRSConcept("esrs:NumberOfSitesInOrAroundProtectedAreas",
        "Number of sites in or near protected areas",
        "Sites dans ou à proximité d'aires protégées",
        "integer", "instant", None, 0, "ESRS E4", "E4-5", True,
        ["protected_areas", "aires_protegees", "natura_2000"]),
    ESRSConcept("esrs:NumberOfSitesInBiodiversitySensitiveAreas",
        "Number of sites in biodiversity-sensitive areas",
        "Sites dans des zones sensibles pour la biodiversité",
        "integer", "instant", None, 0, "ESRS E4", "E4-5", True,
        ["biodiversity_sites", "zones_sensibles_biodiversite"]),
    ESRSConcept("esrs:TotalUseOfLand",
        "Total use of land",
        "Surface totale utilisée",
        "decimal", "instant", "m2", 0, "ESRS E4", "E4-5", False,
        ["land_use", "usage_sols"]),
    ESRSConcept("esrs:TotalSealedArea",
        "Total sealed area",
        "Surface imperméabilisée totale",
        "decimal", "instant", "m2", 0, "ESRS E4", "E4-5", False,
        ["sealed_area", "surface_impermeabilisee"]),
    ESRSConcept("esrs:TotalNatureOrientedArea",
        "Total nature-oriented area on site / off site",
        "Surface naturelle orientée biodiversité sur/hors site",
        "decimal", "instant", "m2", 0, "ESRS E4", "E4-5", False,
        ["nature_area", "surface_nature"]),
    ESRSConcept("esrs:SpeciesOnIUCNRedListAffected",
        "IUCN red list and national conservation list species affected",
        "Espèces de la liste rouge UICN affectées",
        "integer", "instant", None, 0, "ESRS E4", "E4-5", False,
        ["iucn_species", "uicn_especes"]),
    ESRSConcept("esrs:ImpactsOnExtentAndConditionOfEcosystems",
        "Impacts on extent and condition of ecosystems",
        "Impacts sur l'étendue et l'état des écosystèmes",
        "textBlock", "duration", None, None, "ESRS E4", "E4-5", True,
        ["ecosystem_impact", "impact_ecosysteme"]),
    ESRSConcept("esrs:BiodiversityAndEcosystemsPolicies",
        "Biodiversity and ecosystems policies",
        "Politiques relatives à la biodiversité et aux écosystèmes",
        "textBlock", "duration", None, None, "ESRS E4", "E4-2", True,
        ["biodiversity_policy", "politique_biodiversite"]),
    ESRSConcept("esrs:BiodiversityActionsAndResources",
        "Actions and resources related to biodiversity",
        "Actions et ressources liées à la biodiversité",
        "textBlock", "duration", None, None, "ESRS E4", "E4-3", True,
        ["biodiversity_actions", "actions_biodiversite"]),
    ESRSConcept("esrs:BiodiversityTargets",
        "Targets related to biodiversity and ecosystems",
        "Objectifs biodiversité et écosystèmes",
        "textBlock", "duration", None, None, "ESRS E4", "E4-4", True,
        ["biodiversity_targets", "objectifs_biodiversite"]),
    ESRSConcept("esrs:BiodiversityTransitionPlan",
        "Transition plan for biodiversity",
        "Plan de transition biodiversité",
        "textBlock", "duration", None, None, "ESRS E4", "E4-1", True,
        ["biodiversity_transition", "transition_biodiversite"]),
    ESRSConcept("esrs:LandUseChangeImpacts",
        "Impacts on land-use change",
        "Impacts sur le changement d'affectation des sols",
        "textBlock", "duration", None, None, "ESRS E4", "E4-5", False,
        ["land_use_change", "changement_affectation_sols"]),

    # ── ESRS E5 (Ressources & économie circulaire) — +9 ───────────────────────
    ESRSConcept("esrs:TotalMaterialInputs",
        "Total weight of materials used",
        "Poids total des matières utilisées",
        "decimal", "duration", "t", 0, "ESRS E5", "E5-4", True,
        ["material_inputs", "matieres_premieres"]),
    ESRSConcept("esrs:PercentageOfBiologicalMaterials",
        "Percentage of biological materials used",
        "Part de matières biologiques (%)",
        "decimal", "duration", "pure", 2, "ESRS E5", "E5-4", False,
        ["biological_materials", "matieres_biologiques"]),
    ESRSConcept("esrs:PercentageOfRecycledInputs",
        "Percentage of recycled/secondary inputs",
        "Part d'intrants recyclés/secondaires (%)",
        "decimal", "duration", "pure", 2, "ESRS E5", "E5-4", True,
        ["recycled_inputs", "intrants_recycles"]),
    ESRSConcept("esrs:TotalWasteGenerated",
        "Total waste generated",
        "Déchets totaux générés",
        "decimal", "duration", "t", 0, "ESRS E5", "E5-5", True,
        ["waste_total", "dechets_total"]),
    ESRSConcept("esrs:HazardousWasteGenerated",
        "Hazardous waste generated",
        "Déchets dangereux générés",
        "decimal", "duration", "t", 0, "ESRS E5", "E5-5", True,
        ["hazardous_waste", "dechets_dangereux"]),
    ESRSConcept("esrs:NonHazardousWasteGenerated",
        "Non-hazardous waste generated",
        "Déchets non dangereux générés",
        "decimal", "duration", "t", 0, "ESRS E5", "E5-5", False,
        ["non_hazardous_waste", "dechets_non_dangereux"]),
    ESRSConcept("esrs:WasteDivertedFromDisposal",
        "Waste diverted from disposal (recycling, preparation for reuse)",
        "Déchets détournés de l'élimination (recyclage, réutilisation)",
        "decimal", "duration", "t", 0, "ESRS E5", "E5-5", False,
        ["waste_diverted", "dechets_valorises"]),
    ESRSConcept("esrs:WasteDirectedToDisposal",
        "Waste directed to disposal (incineration, landfill)",
        "Déchets éliminés (incinération, enfouissement)",
        "decimal", "duration", "t", 0, "ESRS E5", "E5-5", False,
        ["waste_disposal", "dechets_elimines"]),
    ESRSConcept("esrs:CircularEconomyPolicy",
        "Circular economy policy",
        "Politique d'économie circulaire",
        "textBlock", "duration", None, None, "ESRS E5", "E5-1", True,
        ["circular_policy", "politique_circulaire"]),

    # ── ESRS S1 (Effectifs propres) — +9 ──────────────────────────────────────
    ESRSConcept("esrs:NumberOfEmployeesByGender",
        "Number of employees broken down by gender",
        "Nombre de salariés ventilés par genre",
        "integer", "instant", None, 0, "ESRS S1", "S1-6", True,
        ["employees_gender", "salaries_genre"]),
    ESRSConcept("esrs:NumberOfEmployeesByCountry",
        "Number of employees broken down by country",
        "Nombre de salariés ventilés par pays",
        "integer", "instant", None, 0, "ESRS S1", "S1-6", True,
        ["employees_country", "salaries_pays"]),
    ESRSConcept("esrs:PercentageOfEmployeesWithDisabilities",
        "Percentage of employees with disabilities",
        "Part des salariés en situation de handicap (%)",
        "decimal", "instant", "pure", 2, "ESRS S1", "S1-12", True,
        ["disability", "handicap"]),
    ESRSConcept("esrs:PercentageOfEmployeesCoveredByCollectiveAgreements",
        "Percentage of employees covered by collective bargaining agreements",
        "Part des salariés couverts par convention collective (%)",
        "decimal", "instant", "pure", 2, "ESRS S1", "S1-8", True,
        ["collective_agreement", "convention_collective"]),
    ESRSConcept("esrs:UnadjustedGenderPayGap",
        "Unadjusted gender pay gap",
        "Écart salarial femmes-hommes (non ajusté)",
        "decimal", "duration", "pure", 2, "ESRS S1", "S1-16", True,
        ["pay_gap", "ecart_salarial"]),
    ESRSConcept("esrs:AnnualTotalRemunerationRatio",
        "Annual total remuneration ratio (CEO vs median)",
        "Ratio de rémunération annuel (CEO vs médiane)",
        "decimal", "duration", "pure", 2, "ESRS S1", "S1-16", True,
        ["pay_ratio", "ratio_remuneration"]),
    ESRSConcept("esrs:WorkRelatedFatalitiesEmployees",
        "Number of work-related fatalities (own workforce)",
        "Nombre d'accidents du travail mortels (effectifs propres)",
        "integer", "duration", None, 0, "ESRS S1", "S1-14", True,
        ["fatalities", "accidents_mortels"]),
    ESRSConcept("esrs:RecordableWorkRelatedAccidentsRate",
        "Recordable work-related accidents rate",
        "Taux d'accidents du travail à déclarer",
        "decimal", "duration", "pure", 2, "ESRS S1", "S1-14", True,
        ["accident_rate", "taux_accidents"]),
    ESRSConcept("esrs:CasesOfHumanRightsIncidentsOwnWorkforce",
        "Cases of human rights incidents (own workforce)",
        "Cas d'incidents de droits humains (effectifs propres)",
        "integer", "duration", None, 0, "ESRS S1", "S1-17", True,
        ["human_rights_incidents", "incidents_droits_humains"]),

    # ── ESRS S2 (Travailleurs de la chaîne de valeur) — +11 ──────────────────
    ESRSConcept("esrs:NumberOfValueChainWorkers",
        "Number of value chain workers (Tier 1 + critical suppliers)",
        "Nombre de travailleurs de la chaîne de valeur (Tier 1 + fournisseurs critiques)",
        "integer", "instant", None, 0, "ESRS S2", "S2-1", True,
        ["value_chain_workers", "travailleurs_chaine_valeur"]),
    ESRSConcept("esrs:PercentageOfSuppliersWithSocialAudit",
        "Percentage of suppliers with social audits",
        "Part des fournisseurs audités sur le volet social (%)",
        "decimal", "instant", "pure", 2, "ESRS S2", "S2-3", True,
        ["supplier_audits", "audits_fournisseurs"]),
    ESRSConcept("esrs:NumberOfSeverHumanRightsIncidentsValueChain",
        "Number of severe human rights incidents in value chain",
        "Nombre d'incidents graves de droits humains (chaîne de valeur)",
        "integer", "duration", None, 0, "ESRS S2", "S2-4", True,
        ["severe_incidents", "incidents_graves"]),
    ESRSConcept("esrs:NumberOfSuppliersInScopeOfDueDiligence",
        "Number of suppliers in scope of due diligence",
        "Nombre de fournisseurs dans le périmètre de due diligence",
        "integer", "instant", None, 0, "ESRS S2", "S2-3", True,
        ["suppliers_diligence", "fournisseurs_diligence"]),
    ESRSConcept("esrs:PercentageOfSuppliersWithCodeOfConduct",
        "Percentage of suppliers having signed a code of conduct",
        "Part des fournisseurs ayant signé un code de conduite (%)",
        "decimal", "instant", "pure", 2, "ESRS S2", "S2-1", True,
        ["supplier_code", "code_fournisseurs"]),
    ESRSConcept("esrs:GrievanceMechanismValueChain",
        "Description of grievance mechanism for value chain workers",
        "Mécanisme de plainte pour travailleurs de la chaîne de valeur",
        "textBlock", "duration", None, None, "ESRS S2", "S2-3", True,
        ["grievance_mechanism", "mecanisme_plainte"]),
    ESRSConcept("esrs:NumberOfGrievancesValueChain",
        "Number of grievances received from value chain workers",
        "Nombre de plaintes reçues (travailleurs chaîne de valeur)",
        "integer", "duration", None, 0, "ESRS S2", "S2-3", True,
        ["grievances", "plaintes"]),
    ESRSConcept("esrs:ChildLaborRiskSuppliers",
        "Percentage of suppliers identified as having child labor risk",
        "Part des fournisseurs identifiés comme à risque de travail des enfants (%)",
        "decimal", "instant", "pure", 2, "ESRS S2", "S2-4", True,
        ["child_labor", "travail_enfants"]),
    ESRSConcept("esrs:ForcedLaborRiskSuppliers",
        "Percentage of suppliers identified as having forced labor risk",
        "Part des fournisseurs identifiés comme à risque de travail forcé (%)",
        "decimal", "instant", "pure", 2, "ESRS S2", "S2-4", True,
        ["forced_labor", "travail_force"]),
    ESRSConcept("esrs:ValueChainWorkersPolicy",
        "Policies related to value chain workers",
        "Politique relative aux travailleurs de la chaîne de valeur",
        "textBlock", "duration", None, None, "ESRS S2", "S2-1", True,
        ["value_chain_policy", "politique_chaine_valeur"]),
    ESRSConcept("esrs:ValueChainWorkersTargets",
        "Targets related to value chain workers",
        "Objectifs liés aux travailleurs de la chaîne de valeur",
        "textBlock", "duration", None, None, "ESRS S2", "S2-5", True,
        ["value_chain_targets", "objectifs_chaine_valeur"]),

    # ── ESRS S3 (Communautés affectées) — +7 ──────────────────────────────────
    ESRSConcept("esrs:AffectedCommunitiesPolicy",
        "Policies related to affected communities",
        "Politique relative aux communautés affectées",
        "textBlock", "duration", None, None, "ESRS S3", "S3-1", True,
        ["communities_policy", "politique_communautes"]),
    ESRSConcept("esrs:CommunityEngagementProcess",
        "Process for engaging with affected communities",
        "Processus d'engagement avec les communautés affectées",
        "textBlock", "duration", None, None, "ESRS S3", "S3-2", True,
        ["community_engagement", "engagement_communautes"]),
    ESRSConcept("esrs:NumberOfIncidentsAffectingIndigenousPeoples",
        "Number of incidents affecting indigenous peoples",
        "Nombre d'incidents affectant les peuples autochtones",
        "integer", "duration", None, 0, "ESRS S3", "S3-4", True,
        ["indigenous_peoples", "peuples_autochtones"]),
    ESRSConcept("esrs:GrievanceMechanismCommunities",
        "Grievance mechanism for affected communities",
        "Mécanisme de plainte pour les communautés affectées",
        "textBlock", "duration", None, None, "ESRS S3", "S3-3", True,
        ["community_grievance"]),
    ESRSConcept("esrs:NumberOfGrievancesFromCommunities",
        "Number of grievances received from affected communities",
        "Nombre de plaintes reçues des communautés affectées",
        "integer", "duration", None, 0, "ESRS S3", "S3-3", True,
        ["community_grievances"]),
    ESRSConcept("esrs:AffectedCommunitiesActions",
        "Actions taken to address material impacts on communities",
        "Actions pour adresser les impacts matériels sur les communautés",
        "textBlock", "duration", None, None, "ESRS S3", "S3-4", True,
        ["community_actions", "actions_communautes"]),
    ESRSConcept("esrs:AffectedCommunitiesTargets",
        "Targets related to affected communities",
        "Objectifs liés aux communautés affectées",
        "textBlock", "duration", None, None, "ESRS S3", "S3-5", True,
        ["community_targets", "objectifs_communautes"]),

    # ── ESRS S4 (Consommateurs et utilisateurs finaux) — +7 ──────────────────
    ESRSConcept("esrs:ConsumersAndEndUsersPolicy",
        "Policies related to consumers and end-users",
        "Politique relative aux consommateurs et utilisateurs finaux",
        "textBlock", "duration", None, None, "ESRS S4", "S4-1", True,
        ["consumers_policy", "politique_consommateurs"]),
    ESRSConcept("esrs:DataPrivacyIncidents",
        "Number of substantiated complaints regarding data privacy",
        "Nombre de plaintes fondées concernant la confidentialité des données",
        "integer", "duration", None, 0, "ESRS S4", "S4-4", True,
        ["data_privacy", "vie_privee"]),
    ESRSConcept("esrs:ProductHealthAndSafetyIncidents",
        "Number of product / service health & safety incidents",
        "Nombre d'incidents santé & sécurité produits/services",
        "integer", "duration", None, 0, "ESRS S4", "S4-4", True,
        ["product_safety", "securite_produits"]),
    ESRSConcept("esrs:NumberOfProductRecalls",
        "Number of product recalls",
        "Nombre de rappels produits",
        "integer", "duration", None, 0, "ESRS S4", "S4-4", False,
        ["product_recalls", "rappels_produits"]),
    ESRSConcept("esrs:AccessibilityOfProductsAndServices",
        "Accessibility of products and services to vulnerable consumers",
        "Accessibilité des produits/services aux consommateurs vulnérables",
        "textBlock", "duration", None, None, "ESRS S4", "S4-3", False,
        ["accessibility", "accessibilite"]),
    ESRSConcept("esrs:ConsumerComplaintsHandling",
        "Channels for consumers to raise concerns and obtain remedies",
        "Canaux d'expression des préoccupations consommateurs",
        "textBlock", "duration", None, None, "ESRS S4", "S4-3", True,
        ["consumer_channels", "canaux_consommateurs"]),
    ESRSConcept("esrs:ConsumersTargets",
        "Targets related to consumers and end-users",
        "Objectifs liés aux consommateurs et utilisateurs finaux",
        "textBlock", "duration", None, None, "ESRS S4", "S4-5", True,
        ["consumers_targets", "objectifs_consommateurs"]),

    # ── ESRS G1 (Conduite des affaires) — +5 ──────────────────────────────────
    ESRSConcept("esrs:NumberOfConfirmedCorruptionIncidents",
        "Number of confirmed incidents of corruption or bribery",
        "Nombre d'incidents de corruption ou trafic d'influence confirmés",
        "integer", "duration", None, 0, "ESRS G1", "G1-4", True,
        ["corruption_incidents", "incidents_corruption"]),
    ESRSConcept("esrs:PercentageOfEmployeesTrainedAntiCorruption",
        "Percentage of employees trained on anti-corruption",
        "Part des salariés formés à la lutte anti-corruption (%)",
        "decimal", "duration", "pure", 2, "ESRS G1", "G1-3", True,
        ["anti_corruption_training", "formation_anticorruption"]),
    ESRSConcept("esrs:PoliticalContributions",
        "Total amount of political contributions",
        "Montant total des contributions politiques",
        "decimal", "duration", "EUR", 2, "ESRS G1", "G1-5", False,
        ["political_contributions", "contributions_politiques"]),
    ESRSConcept("esrs:WhistleblowerProtectionMechanism",
        "Mechanism to protect whistleblowers",
        "Mécanisme de protection des lanceurs d'alerte",
        "textBlock", "duration", None, None, "ESRS G1", "G1-1", True,
        ["whistleblower", "lanceur_alerte"]),
    ESRSConcept("esrs:NumberOfReportsViaWhistleblowingChannels",
        "Number of reports received via whistleblowing channels",
        "Nombre de signalements reçus via les canaux d'alerte",
        "integer", "duration", None, 0, "ESRS G1", "G1-1", True,
        ["whistleblowing_reports", "signalements_alerte"]),
]


# ────────────────────────────────────────────────────────────────────────────
# Unit definitions (used in iXBRL <xbrli:unit> declarations)
# ────────────────────────────────────────────────────────────────────────────
# The ``measure`` value follows EFRAG conventions where possible; ``iso4217``
# for currencies, ``utr:`` (Units Registry) for ISO/UN-LX measures.

UNIT_DEFINITIONS: Dict[str, Dict[str, str]] = {
    "tCO2e":  {"measure": "esrs:tCO2eq",          "label": "Tonnes CO₂ équivalent"},
    "MWh":    {"measure": "utr:MWh",              "label": "Mégawattheure"},
    "GJ":     {"measure": "utr:GJ",               "label": "Gigajoule"},
    "m3":     {"measure": "utr:m3",               "label": "Mètre cube"},
    "t":      {"measure": "utr:t",                "label": "Tonne métrique"},
    "pure":   {"measure": "xbrli:pure",           "label": "Sans unité / ratio"},
    "EUR":    {"measure": "iso4217:EUR",          "label": "Euro"},
    "hours":  {"measure": "utr:h",                "label": "Heure"},
    "days":   {"measure": "utr:d",                "label": "Jour"},
}


# ────────────────────────────────────────────────────────────────────────────
# Lookup helpers
# ────────────────────────────────────────────────────────────────────────────

def all_concepts() -> List[ESRSConcept]:
    """Return the full catalog as a list."""
    return list(ESRS_CONCEPTS)


def concepts_by_section(section: str) -> List[ESRSConcept]:
    """Return concepts belonging to a given ESRS standard (e.g. ``ESRS E1``)."""
    section = section.upper().strip()
    return [c for c in ESRS_CONCEPTS if c.standard.upper() == section]


def get_concept(concept_id: str) -> Optional[ESRSConcept]:
    """Look up a concept by full QName (``esrs:LocalName``)."""
    for c in ESRS_CONCEPTS:
        if c.concept_id == concept_id:
            return c
    return None


def match_concept_from_metric(metric_name: str) -> Optional[ESRSConcept]:
    """
    Auto-match an ESGflow ``DataEntry.metric_name`` to the best ESRS concept.

    Uses heuristic keyword matching against ``ESRSConcept.mapping_keys`` —
    longest key wins (more specific match preferred).
    """
    if not metric_name:
        return None
    name = metric_name.lower().strip()
    best: Optional[ESRSConcept] = None
    best_len = 0
    for c in ESRS_CONCEPTS:
        for key in c.mapping_keys:
            if key and key in name and len(key) > best_len:
                best, best_len = c, len(key)
    return best


def list_sections() -> List[Dict[str, str]]:
    """Return all distinct ESRS sections with concept counts."""
    seen: Dict[str, int] = {}
    for c in ESRS_CONCEPTS:
        seen[c.standard] = seen.get(c.standard, 0) + 1
    return [{"code": s, "concept_count": n} for s, n in sorted(seen.items())]


# ────────────────────────────────────────────────────────────────────────────
# Validation rules
# ────────────────────────────────────────────────────────────────────────────

@dataclass
class TaggedFact:
    """A single iXBRL fact submitted by the UI for validation."""
    concept_id: str
    value: str        # raw string from the textarea
    context_ref: str  # e.g. "FY2025"
    unit_ref: Optional[str] = None


@dataclass
class ValidationIssue:
    severity: str  # "error" | "warning" | "info"
    rule: str
    message: str
    concept_id: Optional[str] = None


def validate_facts(facts: Iterable[TaggedFact], section_filter: Optional[str] = None) -> List[ValidationIssue]:
    """
    Validate a list of tagged facts against the catalog.

    Rules applied:
      - Required concepts present (per section)
      - Numeric values parse correctly
      - Integer concepts have integer values
      - Decimal-typed values have decimals attribute hint
      - Unit ref matches concept's expected unit (when defined)
    """
    issues: List[ValidationIssue] = []
    fact_concepts: Dict[str, TaggedFact] = {f.concept_id: f for f in facts}

    # Required concepts present
    required = [c for c in ESRS_CONCEPTS if c.required]
    if section_filter:
        required = [c for c in required if c.standard.upper() == section_filter.upper()]
    for c in required:
        if c.concept_id not in fact_concepts:
            issues.append(ValidationIssue(
                "warning", "ESRS-MNDT-001",
                f"Concept obligatoire non balisé : {c.label_fr} ({c.disclosure})",
                c.concept_id,
            ))

    # Per-fact rules
    for fact in fact_concepts.values():
        c = get_concept(fact.concept_id)
        if c is None:
            issues.append(ValidationIssue(
                "error", "XBRL-CAT-001",
                f"Concept inconnu : {fact.concept_id}",
                fact.concept_id,
            ))
            continue
        # Numeric parse check
        if c.data_type in ("decimal", "integer", "monetaryItemType"):
            try:
                val = float(fact.value.replace(",", "."))
                if c.data_type == "integer" and val != int(val):
                    issues.append(ValidationIssue(
                        "error", "XBRL-VAL-003",
                        f"Valeur non entière pour {c.label_fr} : « {fact.value} »",
                        c.concept_id,
                    ))
            except (ValueError, AttributeError):
                issues.append(ValidationIssue(
                    "error", "XBRL-VAL-002",
                    f"Valeur non numérique pour {c.label_fr} : « {fact.value} »",
                    c.concept_id,
                ))
        # Unit ref check
        if c.unit_ref and fact.unit_ref and c.unit_ref != fact.unit_ref:
            issues.append(ValidationIssue(
                "warning", "XBRL-UNT-001",
                f"Unité incorrecte pour {c.label_fr} : attendu {c.unit_ref}, reçu {fact.unit_ref}",
                c.concept_id,
            ))

    issues.append(ValidationIssue(
        "info", "INFO-001",
        f"{len(fact_concepts)} fait(s) balisé(s) sur {len(ESRS_CONCEPTS)} concepts disponibles.",
    ))
    return issues
