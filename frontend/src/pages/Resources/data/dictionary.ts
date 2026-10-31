/**
 * Dictionnaire des indicateurs ESG : définitions rédigées par nos soins, codes de rattachement
 * aux référentiels. Règle : un code absent est affiché « — », jamais inventé.
 *  - ESRS : actes délégués 2023 (les ESRS simplifiés, en révision, pourront renuméroter).
 *  - GRI : Standards GRI (GRI 2 / 302 / 303 / 304 / 305 / 306 / 401 / 403 / 404 / 405 / 406 / 205 / 415).
 *  - VSME : module de base (B1–B11) du standard volontaire pour les PME ; C = module complet.
 */
export type Pillar = 'E' | 'S' | 'G';

export interface DictionaryEntry {
  id: string;
  pillar: Pillar;
  name: string;
  definition: string;
  how: string;
  unit: string;
  esrs?: string;
  gri?: string;
  vsme?: string;
}

export const PILLARS: Record<Pillar, string> = { E: 'Environnement', S: 'Social', G: 'Gouvernance' };

export const DICTIONARY: DictionaryEntry[] = [
  // ── Environnement ───────────────────────────────────────────────────────────
  { id: 'ges-scope1', pillar: 'E', name: 'Émissions brutes de GES — scope 1',
    definition: "Émissions directes issues de sources que l'entreprise possède ou contrôle : chaudières, véhicules de la flotte, procédés industriels, fuites de fluides frigorigènes.",
    how: "Quantités de combustibles et de fluides consommées, multipliées par leur facteur d'émission.", unit: 'tCO₂e',
    esrs: 'E1-6', gri: '305-1', vsme: 'B3' },
  { id: 'ges-scope2', pillar: 'E', name: 'Émissions de GES — scope 2',
    definition: "Émissions indirectes liées à l'électricité, la chaleur, la vapeur ou le froid achetés. Elles se publient selon deux approches : « location-based » (mix du réseau) et « market-based » (contrats réels).",
    how: "Consommations d'énergie achetée (factures) × facteur d'émission du réseau ou du fournisseur.", unit: 'tCO₂e',
    esrs: 'E1-6', gri: '305-2', vsme: 'B3' },
  { id: 'ges-scope3', pillar: 'E', name: 'Émissions de GES — scope 3',
    definition: "Toutes les autres émissions indirectes de la chaîne de valeur : achats, transport, déplacements, usage et fin de vie des produits. Le GHG Protocol les répartit en 15 catégories.",
    how: "Données d'activité (achats en euros, tonnes-km, déplacements) × facteurs d'émission ; souvent estimées à partir de la comptabilité.", unit: 'tCO₂e',
    esrs: 'E1-6', gri: '305-3', vsme: 'B3 (scope 3 facultatif)' },
  { id: 'ges-total', pillar: 'E', name: 'Émissions totales de GES',
    definition: "Somme des scopes 1, 2 et 3 sur la période de reporting.",
    how: "Addition des trois scopes, avec la méthode et le périmètre indiqués.", unit: 'tCO₂e',
    esrs: 'E1-6', gri: '305-1 à 305-3' },
  { id: 'ges-intensite', pillar: 'E', name: 'Intensité carbone',
    definition: "Émissions de GES rapportées au chiffre d'affaires net, pour comparer des entreprises de tailles différentes ou suivre une trajectoire.",
    how: "Émissions totales ÷ chiffre d'affaires net (en millions d'euros).", unit: 'tCO₂e / M€',
    esrs: 'E1-6', gri: '305-4' },
  { id: 'energie-totale', pillar: 'E', name: "Consommation d'énergie",
    definition: "Énergie totale consommée (électricité, gaz, carburants, chaleur), ventilée entre sources fossiles, nucléaires et renouvelables.",
    how: "Relevés de compteurs et factures, convertis dans une unité commune.", unit: 'MWh',
    esrs: 'E1-5', gri: '302-1', vsme: 'B3' },
  { id: 'part-renouvelable', pillar: 'E', name: "Part d'énergies renouvelables",
    definition: "Part des énergies renouvelables dans la consommation totale d'énergie de l'entreprise.",
    how: "Énergie renouvelable consommée ÷ énergie totale consommée.", unit: '%',
    esrs: 'E1-5', gri: '302-1', vsme: 'B3' },
  { id: 'plan-transition', pillar: 'E', name: 'Plan de transition et objectifs de réduction',
    definition: "Trajectoire chiffrée de réduction des émissions : objectifs, échéances, leviers et investissements prévus.",
    how: "Année de référence, objectif en % de réduction, actions et budget associés.", unit: '% de réduction',
    esrs: 'E1-1, E1-4', gri: '305-5', vsme: 'C3 (module complet)' },
  { id: 'eau-prelevement', pillar: 'E', name: "Prélèvements d'eau",
    definition: "Volume d'eau prélevé dans le milieu naturel ou auprès des réseaux, avec mention des sites situés en zone de stress hydrique.",
    how: "Relevés de compteurs et factures d'eau, par site et par source.", unit: 'm³',
    esrs: 'E3-4', gri: '303-3', vsme: 'B6' },
  { id: 'eau-consommation', pillar: 'E', name: "Consommation d'eau",
    definition: "Part de l'eau prélevée qui n'est pas restituée au milieu : évaporée, incorporée aux produits ou rejetée hors du bassin.",
    how: "Eau prélevée − eau rejetée.", unit: 'm³',
    esrs: 'E3-4', gri: '303-5', vsme: 'B6' },
  { id: 'dechets-total', pillar: 'E', name: 'Déchets générés',
    definition: "Total des déchets produits sur la période, en distinguant dangereux et non dangereux.",
    how: "Bordereaux de suivi et pesées des prestataires de collecte.", unit: 'tonnes',
    esrs: 'E5-5', gri: '306-3', vsme: 'B7' },
  { id: 'dechets-valorises', pillar: 'E', name: 'Déchets valorisés ou recyclés',
    definition: "Part des déchets détournée de l'élimination : réemploi, recyclage ou autre valorisation.",
    how: "Tonnes détournées de l'élimination ÷ tonnes totales produites.", unit: '%',
    esrs: 'E5-5', gri: '306-4', vsme: 'B7' },
  { id: 'polluants', pillar: 'E', name: 'Rejets de polluants',
    definition: "Émissions dans l'air, l'eau et le sol de polluants réglementés : oxydes d'azote et de soufre, substances préoccupantes.",
    how: "Mesures et déclarations réglementaires du site (registres, autorisations d'exploiter).", unit: 'kg ou tonnes',
    esrs: 'E2-4', gri: '305-7', vsme: 'B4' },
  { id: 'biodiversite', pillar: 'E', name: 'Sites proches de zones sensibles pour la biodiversité',
    definition: "Sites exploités dans ou à proximité d'aires protégées ou de zones à forte valeur de biodiversité, et surface occupée.",
    how: "Localisation de chaque site comparée aux cartes officielles de zones protégées.", unit: 'nombre, hectares',
    esrs: 'E4', gri: '304-1', vsme: 'B5' },

  // ── Social ──────────────────────────────────────────────────────────────────
  { id: 'effectif', pillar: 'S', name: 'Effectif',
    definition: "Nombre de salariés, en personnes ou en équivalents temps plein, ventilé par genre, pays et type de contrat.",
    how: "Registre du personnel ou paie, à une date de clôture ou en moyenne sur la période.", unit: 'nombre',
    esrs: 'S1-6', gri: '2-7', vsme: 'B8' },
  { id: 'rotation', pillar: 'S', name: 'Taux de rotation du personnel',
    definition: "Part des salariés ayant quitté l'entreprise sur la période, rapportée à l'effectif.",
    how: "Nombre de départs ÷ effectif moyen.", unit: '%',
    esrs: 'S1-6', gri: '401-1' },
  { id: 'ecart-remuneration', pillar: 'S', name: 'Écart de rémunération femmes-hommes',
    definition: "Différence de rémunération horaire moyenne entre femmes et hommes, exprimée en pourcentage de la rémunération des hommes.",
    how: "(Rémunération moyenne des hommes − des femmes) ÷ rémunération moyenne des hommes.", unit: '%',
    esrs: 'S1-16', gri: '405-2', vsme: 'B10' },
  { id: 'accidents', pillar: 'S', name: 'Accidents du travail',
    definition: "Nombre et taux d'accidents du travail déclarés, ainsi que les décès liés au travail.",
    how: "Registre des accidents ; taux de fréquence = accidents avec arrêt × 1 000 000 ÷ heures travaillées.", unit: 'nombre, taux',
    esrs: 'S1-14', gri: '403-9', vsme: 'B9' },
  { id: 'formation', pillar: 'S', name: 'Heures de formation',
    definition: "Nombre moyen d'heures de formation par salarié sur la période.",
    how: "Heures de formation totales ÷ effectif moyen.", unit: 'heures / salarié',
    esrs: 'S1-13', gri: '404-1', vsme: 'B10' },
  { id: 'convention-collective', pillar: 'S', name: 'Couverture par convention collective',
    definition: "Part des salariés couverts par une convention collective, et organisation du dialogue social.",
    how: "Salariés couverts ÷ effectif total.", unit: '%',
    esrs: 'S1-8', gri: '2-30', vsme: 'B10' },
  { id: 'parite-encadrement', pillar: 'S', name: "Parité dans l'encadrement",
    definition: "Répartition femmes-hommes dans l'encadrement supérieur, avec la répartition par tranche d'âge des salariés.",
    how: "Femmes (hommes) dans l'encadrement supérieur ÷ effectif de l'encadrement supérieur.", unit: '%',
    esrs: 'S1-9', gri: '405-1' },
  { id: 'handicap', pillar: 'S', name: 'Salariés en situation de handicap',
    definition: "Part des salariés en situation de handicap dans l'effectif.",
    how: "Salariés reconnus en situation de handicap ÷ effectif total (selon la réglementation locale).", unit: '%',
    esrs: 'S1-12', gri: '405-1' },
  { id: 'incidents-droits', pillar: 'S', name: 'Incidents de discrimination et atteintes aux droits humains',
    definition: "Nombre d'incidents confirmés, de plaintes déposées et de sanctions associées sur la période.",
    how: "Registre des signalements et suites données.", unit: 'nombre',
    esrs: 'S1-17', gri: '406-1' },

  // ── Gouvernance ─────────────────────────────────────────────────────────────
  { id: 'corruption-sanctions', pillar: 'G', name: 'Condamnations et amendes pour corruption',
    definition: "Nombre de condamnations et montant des amendes pour violation des lois contre la corruption.",
    how: "Décisions de justice et sanctions administratives de la période.", unit: 'nombre, €',
    esrs: 'G1-4', gri: '205-3', vsme: 'B11' },
  { id: 'formation-anticorruption', pillar: 'G', name: "Formation à la lutte anticorruption",
    definition: "Part des salariés formés aux politiques et procédures anticorruption.",
    how: "Salariés formés ÷ effectif concerné.", unit: '%',
    esrs: 'G1-3', gri: '205-2' },
  { id: 'alerte', pillar: 'G', name: "Dispositif d'alerte",
    definition: "Canal de signalement protégé pour les lanceurs d'alerte et traitement des signalements reçus.",
    how: "Description du dispositif, nombre de signalements reçus et clôturés.", unit: 'qualitatif, nombre',
    esrs: 'G1-1', gri: '2-26' },
  { id: 'delais-paiement', pillar: 'G', name: 'Délais de paiement fournisseurs',
    definition: "Délai moyen de paiement des fournisseurs et part des paiements effectués dans les délais prévus.",
    how: "Dates de facture et de paiement issues de la comptabilité fournisseurs.", unit: 'jours, %',
    esrs: 'G1-6' },
  { id: 'lobbying', pillar: 'G', name: "Activités d'influence et contributions politiques",
    definition: "Activités de représentation d'intérêts et montants des contributions politiques versées.",
    how: "Registre des représentants d'intérêts et des contributions.", unit: '€',
    esrs: 'G1-5', gri: '415-1' },
  { id: 'conseil', pillar: 'G', name: "Composition du conseil",
    definition: "Répartition femmes-hommes, part de membres indépendants et expérience des membres de l'organe de gouvernance.",
    how: "Liste des administrateurs avec genre et statut d'indépendance.", unit: '%',
    esrs: 'GOV-1', gri: '2-9, 405-1' },
];
