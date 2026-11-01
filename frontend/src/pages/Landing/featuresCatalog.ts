import {
  AlertTriangle, BadgeCheck, BarChart3, Building2, ClipboardCheck, ClipboardList, DatabaseZap, FileText, Flame,
  Gauge, History, Landmark, PlugZap, Route, Search, Sparkles, Target, Truck, type LucideIcon,
} from 'lucide-react';

// Catalogue unique des fonctionnalités : alimente le méga-menu de la barre de navigation
// et la section « Fonctionnalités » de la landing page. Chaque description tient en une phrase
// et ne promet que ce que la plateforme fait aujourd'hui.
export interface FeatureItem {
  id: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  /** Page publique de la fonctionnalité (sinon : on ouvre le module correspondant dans l'explorateur). */
  to?: string;
  /** Identifiant du module de l'explorateur de modules (voir MODULES dans LandingPage). */
  module?: string;
  isNew?: boolean;
}
export interface FeatureGroup { id: string; title: string; items: FeatureItem[] }

export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    id: 'collect',
    title: 'Collecter et fiabiliser',
    items: [
      { id: 'connectors', icon: PlugZap, title: 'Collecte et connecteurs', module: 'connectors',
        desc: 'Saisie guidée, imports FEC et CSV, exports RH, avec un journal de chaque synchronisation.' },
      { id: 'dataquality', icon: DatabaseZap, title: 'Qualité des données', module: 'dataquality',
        desc: 'Complétude par pilier, anomalies et données manquantes repérées avant le reporting.' },
      { id: 'audit', icon: History, title: 'Piste d’audit et preuves', to: '/features/audit-trail',
        desc: 'Qui a changé quoi, quand et pourquoi, avec justificatifs et export pour vos auditeurs.' },
      { id: 'validation', icon: ClipboardCheck, title: 'Workflow de validation', module: 'validation',
        desc: 'Brouillon, relecture, approbation : chaque donnée validée est tracée.' },
      { id: 'insee', icon: Search, title: 'Enrichissement INSEE', module: 'insee',
        desc: 'Retrouvez les données légales d’une entreprise à partir de son SIREN.' },
    ],
  },
  {
    id: 'analyze',
    title: 'Analyser et piloter',
    items: [
      { id: 'scores', icon: Gauge, title: 'Scores ESG traçables', module: 'scores', isNew: true,
        desc: 'Un score par pilier dont chaque point s’explique : méthode, données et version consultables.' },
      { id: 'materiality', icon: Target, title: 'Double matérialité', to: '/features/double-materialite', isNew: true,
        desc: 'Matrice interactive, notes justifiées et validation datée par la direction.' },
      { id: 'carbon', icon: Flame, title: 'Bilan carbone Scope 3', to: '/features/bilan-carbone',
        desc: 'Émissions indirectes par catégorie du GHG Protocol, avec les facteurs d’émission ADEME.' },
      { id: 'decarb', icon: Route, title: 'Plan de décarbonation', to: '/features/decarbonation',
        desc: 'Trajectoire alignée sur la SBTi, actions chiffrées et scénarios.' },
      { id: 'benchmark', icon: BarChart3, title: 'Benchmark sectoriel', module: 'benchmarking',
        desc: 'Positionnez-vous face aux autres entreprises de votre secteur.' },
      { id: 'risks', icon: AlertTriangle, title: 'Registre des risques', module: 'risks',
        desc: 'Risques ESG notés par probabilité et impact, avec leurs plans d’action.' },
    ],
  },
  {
    id: 'report',
    title: 'Rapporter et répondre',
    items: [
      { id: 'reports', icon: FileText, title: 'Rapports CSRD, VSME et DPEF', to: '/features/csrd-reporting',
        desc: 'Rapport section par section, export PDF, envoi programmé par e-mail et lien de partage.' },
      { id: 'questionnaires', icon: ClipboardList, title: 'Questionnaires clients', to: '/documentation/questionnaires-clients', isNew: true,
        desc: 'Déposez le questionnaire RSE d’un client : réponses pré-remplies depuis vos données, sources citées.' },
      { id: 'taxonomy', icon: BadgeCheck, title: 'Taxonomie européenne', to: '/features/taxonomie-ue',
        desc: 'Éligibilité et alignement sur les 6 objectifs, critères DNSH et garanties minimales.' },
      { id: 'supply', icon: Truck, title: 'Chaîne d’approvisionnement', to: '/features/supply-chain',
        desc: 'Évaluez vos fournisseurs, envoyez-leur des questionnaires et préparez la CSDDD.' },
      { id: 'gaia', icon: Sparkles, title: 'Gaïa, assistant IA', to: '/features/ia-automatisation',
        desc: 'Analyse d’un rapport existant et réponses à vos questions, toujours avec relecture humaine.' },
      { id: 'cabinet', icon: Building2, title: 'Espace cabinets', to: '/features/cabinet',
        desc: 'Un espace multi-clients pour experts-comptables et cabinets de conseil, en marque blanche.' },
    ],
  },
];

// Panneau de mise en avant du méga-menu : l'outil gratuit qui amène les premiers visiteurs.
export const FEATURES_PROMO = {
  icon: Landmark,
  badge: 'Gratuit',
  title: 'Êtes-vous concerné par la CSRD ?',
  desc: 'Répondez à quelques questions et sachez si votre entreprise entre dans le champ, avec les seuils en vigueur après l’omnibus.',
  cta: 'Tester mon éligibilité',
  to: '/ressources/suis-je-concerne',
  more: [
    { label: 'Dictionnaire ESG', to: '/ressources/dictionnaire' },
    { label: 'Toutes les ressources', to: '/resources' },
  ],
};

