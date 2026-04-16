import type { Step } from 'react-joyride';

export interface TourChapter {
  id: string;
  title: string;
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
  stepStart: number;
  stepCount: number;
  description: string;
}

export const TOUR_CHAPTERS: TourChapter[] = [
  {
    id: 'welcome',
    title: 'Bienvenue',
    emoji: '🌿',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    stepStart: 0,
    stepCount: 1,
    description: 'Introduction à ESGFlow',
  },
  {
    id: 'dashboard',
    title: 'Tableau de bord',
    emoji: '📊',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    stepStart: 1,
    stepCount: 1,
    description: 'Vue d\'ensemble de vos scores ESG',
  },
  {
    id: 'collecte',
    title: 'Collecte de données',
    emoji: '📥',
    color: 'text-violet-700',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200',
    stepStart: 2,
    stepCount: 5,
    description: 'Saisie, import et connecteurs',
  },
  {
    id: 'pilotage',
    title: 'Pilotage ESG',
    emoji: '⚙️',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    stepStart: 7,
    stepCount: 7,
    description: 'Indicateurs, risques, audit',
  },
  {
    id: 'scoring',
    title: 'Scoring & Analyses',
    emoji: '🏆',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    stepStart: 14,
    stepCount: 4,
    description: 'Scores ESG, benchmarks, IA',
  },
  {
    id: 'conformite',
    title: 'Conformité & Reporting',
    emoji: '📄',
    color: 'text-teal-700',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    stepStart: 18,
    stepCount: 6,
    description: 'CSRD, décarbonation, taxonomie',
  },
  {
    id: 'settings',
    title: 'Paramètres',
    emoji: '⚙️',
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    stepStart: 24,
    stepCount: 2,
    description: 'API, configuration',
  },
];

export function getChapterForStep(stepIndex: number): TourChapter {
  let chapter = TOUR_CHAPTERS[0];
  for (const ch of TOUR_CHAPTERS) {
    if (stepIndex >= ch.stepStart) chapter = ch;
  }
  return chapter;
}

export const TOUR_STEPS: Step[] = [

  // ── 0 : Bienvenue ──────────────────────────────────────────────────────────
  {
    target: 'body',
    title: '🌿 Bienvenue sur ESGFlow',
    content:
      'Ce tour interactif (≈ 3 min) vous présente toutes les fonctionnalités de la plateforme. ' +
      'Naviguez avec Suivant / Précédent, sautez une étape ou relancez le tour à tout moment.',
    placement: 'center',
    disableBeacon: true,
    data: { chapter: 'welcome', stepInChapter: 1, totalInChapter: 1 },
  },

  // ── 1 : Dashboard ──────────────────────────────────────────────────────────
  {
    target: '[data-tour="sidebar-dashboard"]',
    title: '📊 Tableau de bord',
    content:
      'Votre cockpit ESG en temps réel. Visualisez vos scores E, S, G, les tendances, ' +
      'les alertes prioritaires et l\'avancement de votre conformité CSRD d\'un seul coup d\'œil.',
    placement: 'right',
    disableBeacon: true,
    data: { chapter: 'dashboard', stepInChapter: 1, totalInChapter: 1 },
  },

  // ── 2–6 : Collecte données ─────────────────────────────────────────────────
  {
    target: '[data-tour="sidebar-data-entry"]',
    title: '✍️ Saisie manuelle',
    content:
      'Enregistrez vos indicateurs ESG manuellement — émissions Scope 1/2/3, ' +
      'données sociales RH, indicateurs de gouvernance — via des formulaires structurés par pilier.',
    placement: 'right',
    disableBeacon: true,
    data: { chapter: 'collecte', stepInChapter: 1, totalInChapter: 5 },
  },
  {
    target: '[data-tour="sidebar-import-csv"]',
    title: '📤 Import en masse',
    content:
      'Importez vos données en une fois depuis un fichier Excel ou CSV. ' +
      'Le moteur détecte automatiquement les colonnes, vous prévisualise les données et importe jusqu\'à des milliers de lignes.',
    placement: 'right',
    disableBeacon: true,
    data: { chapter: 'collecte', stepInChapter: 2, totalInChapter: 5 },
  },
  {
    target: '[data-tour="sidebar-my-data"]',
    title: '📂 Mes données',
    content:
      'Consultez, filtrez et exportez toutes vos données ESG enregistrées. ' +
      'Chaque entrée est horodatée, traçable et liée à son indicateur ESRS correspondant.',
    placement: 'right',
    disableBeacon: true,
    data: { chapter: 'collecte', stepInChapter: 3, totalInChapter: 5 },
  },
  {
    target: '[data-tour="sidebar-calc-auto"]',
    title: '🤖 Calculs automatiques',
    content:
      'Définissez des formules de calcul pour dériver automatiquement des KPIs complexes ' +
      '(ex : intensité carbone / CA, ratio parité ajusté) à partir de vos données brutes.',
    placement: 'right',
    disableBeacon: true,
    data: { chapter: 'collecte', stepInChapter: 4, totalInChapter: 5 },
  },
  {
    target: '[data-tour="sidebar-connectors"]',
    title: '🔌 Connecteurs data',
    content:
      'Branchez directement vos systèmes métiers : SAP, Workday, Salesforce, fichiers SFTP. ' +
      'Les données remontent automatiquement selon le planning que vous configurez.',
    placement: 'right',
    disableBeacon: true,
    data: { chapter: 'collecte', stepInChapter: 5, totalInChapter: 5 },
  },

  // ── 7–13 : Pilotage ESG ────────────────────────────────────────────────────
  {
    target: '[data-tour="sidebar-indicators"]',
    title: '📈 Indicateurs de performance',
    content:
      '174 indicateurs ESRS préchargés (E1–E5, S1–S4, G1). ' +
      'Filtrez par pilier, voyez instantanément lesquels ont des données et lesquels sont en attente.',
    placement: 'right',
    disableBeacon: true,
    data: { chapter: 'pilotage', stepInChapter: 1, totalInChapter: 7 },
  },
  {
    target: '[data-tour="sidebar-materiality"]',
    title: '⚖️ Double matérialité',
    content:
      'Analysez la double matérialité CSRD : impact financier ET impact sociétal de vos enjeux ESG. ' +
      'La matrice générée alimente directement votre rapport ESRS.',
    placement: 'right',
    disableBeacon: true,
    data: { chapter: 'pilotage', stepInChapter: 2, totalInChapter: 7 },
  },
  {
    target: '[data-tour="sidebar-risks"]',
    title: '⚠️ Registre des risques',
    content:
      'Identifiez, évaluez et priorisez vos risques ESG (physiques, de transition, réglementaires). ' +
      'Chaque risque est lié à des plans d\'action et à un responsable.',
    placement: 'right',
    disableBeacon: true,
    data: { chapter: 'pilotage', stepInChapter: 3, totalInChapter: 7 },
  },
  {
    target: '[data-tour="sidebar-supply-chain"]',
    title: '🔗 Supply Chain ESG',
    content:
      'Évaluez la performance ESG de chaque fournisseur, envoyez des questionnaires de due diligence ' +
      'et identifiez les risques dans votre chaîne d\'approvisionnement.',
    placement: 'right',
    disableBeacon: true,
    data: { chapter: 'pilotage', stepInChapter: 4, totalInChapter: 7 },
  },
  {
    target: '[data-tour="sidebar-data-quality"]',
    title: '🛡️ Qualité des données',
    content:
      'Détectez les anomalies, valeurs aberrantes et données manquantes. ' +
      'Un score de qualité global vous indique la fiabilité de vos reportings avant soumission.',
    placement: 'right',
    disableBeacon: true,
    data: { chapter: 'pilotage', stepInChapter: 5, totalInChapter: 7 },
  },
  {
    target: '[data-tour="sidebar-validation"]',
    title: '✅ Workflow de validation',
    content:
      'Circuit de validation multi-niveaux : le contributeur saisit, le manager valide, ' +
      'l\'auditeur certifie. Chaque étape est tracée et notifiée automatiquement.',
    placement: 'right',
    disableBeacon: true,
    data: { chapter: 'pilotage', stepInChapter: 6, totalInChapter: 7 },
  },
  {
    target: '[data-tour="sidebar-audit"]',
    title: '🔒 Piste d\'Audit',
    content:
      'Journal immuable de toutes les actions sur la plateforme. ' +
      'Téléversez les pièces justificatives, exportez pour certification ISAE 3000 et assurez la traçabilité totale.',
    placement: 'right',
    disableBeacon: true,
    data: { chapter: 'pilotage', stepInChapter: 7, totalInChapter: 7 },
  },

  // ── 14–17 : Scoring & Analyses ─────────────────────────────────────────────
  {
    target: '[data-tour="sidebar-scores"]',
    title: '🏆 Scores ESG',
    content:
      'Calculez automatiquement vos scores ESG globaux et par pilier sur toutes vos organisations. ' +
      'Identifiez les forces, faiblesses et suivez l\'évolution dans le temps.',
    placement: 'right',
    disableBeacon: true,
    data: { chapter: 'scoring', stepInChapter: 1, totalInChapter: 4 },
  },
  {
    target: '[data-tour="sidebar-benchmarking"]',
    title: '🎯 Benchmarking sectoriel',
    content:
      'Comparez vos performances ESG avec celles de votre secteur et de vos pairs. ' +
      'Positionnez-vous dans les quartiles et identifiez les meilleures pratiques à adopter.',
    placement: 'right',
    disableBeacon: true,
    data: { chapter: 'scoring', stepInChapter: 2, totalInChapter: 4 },
  },
  {
    target: '[data-tour="sidebar-organizations"]',
    title: '🏢 Organisations',
    content:
      'Gérez toutes vos entités (filiales, sites, BU) avec leur score ESG individuel. ' +
      'Multi-tenant natif : chaque organisation dispose de ses propres données et droits d\'accès.',
    placement: 'right',
    disableBeacon: true,
    data: { chapter: 'scoring', stepInChapter: 3, totalInChapter: 4 },
  },
  {
    target: '[data-tour="sidebar-intelligence"]',
    title: '🤖 IA Prédictive',
    content:
      'L\'intelligence artificielle analyse vos tendances, prédit vos scores futurs ' +
      'et vous propose des recommandations personnalisées pour améliorer votre performance ESG.',
    placement: 'right',
    disableBeacon: true,
    data: { chapter: 'scoring', stepInChapter: 4, totalInChapter: 4 },
  },

  // ── 18–23 : Conformité & Reporting ─────────────────────────────────────────
  {
    target: '[data-tour="sidebar-decarbonation"]',
    title: '🌍 Plan de décarbonisation',
    content:
      'Définissez vos trajectoires de réduction, créez des actions concrètes par site ou BU ' +
      'et suivez votre avancement vers vos objectifs Net Zéro en temps réel.',
    placement: 'right',
    disableBeacon: true,
    data: { chapter: 'conformite', stepInChapter: 1, totalInChapter: 6 },
  },
  {
    target: '[data-tour="sidebar-carbon"]',
    title: '🔥 Bilan Carbone',
    content:
      'Calculez votre empreinte carbone Scope 1, 2 et 3 avec les facteurs d\'émission GHG Protocol. ' +
      'Visualisez la répartition par poste et exportez pour votre déclaration réglementaire.',
    placement: 'right',
    disableBeacon: true,
    data: { chapter: 'conformite', stepInChapter: 2, totalInChapter: 6 },
  },
  {
    target: '[data-tour="sidebar-taxonomy"]',
    title: '🌱 Taxonomie UE',
    content:
      'Évaluez l\'alignement de vos activités avec la taxonomie européenne (6 objectifs environnementaux). ' +
      'Calculez automatiquement le pourcentage de chiffre d\'affaires « vert ».',
    placement: 'right',
    disableBeacon: true,
    data: { chapter: 'conformite', stepInChapter: 3, totalInChapter: 6 },
  },
  {
    target: '[data-tour="sidebar-compliance"]',
    title: '⚖️ Multi-réglementaire',
    content:
      'Suivez votre conformité simultanément sur plusieurs cadres : CSRD, GRI, SASB, TCFD, CDP. ' +
      'Un tableau de bord unifié pour tous vos obligations réglementaires.',
    placement: 'right',
    disableBeacon: true,
    data: { chapter: 'conformite', stepInChapter: 4, totalInChapter: 6 },
  },
  {
    target: '[data-tour="sidebar-reports"]',
    title: '📄 Rapports CSRD',
    content:
      'Générez vos rapports CSRD complets en PDF ou Word, pré-remplis avec vos données. ' +
      'Planifiez des exports automatiques et partagez avec vos auditeurs en un clic.',
    placement: 'right',
    disableBeacon: true,
    data: { chapter: 'conformite', stepInChapter: 5, totalInChapter: 6 },
  },
  {
    target: '[data-tour="sidebar-csrd-builder"]',
    title: '🛠️ CSRD Builder',
    content:
      'Éditeur visuel de rapports CSRD section par section. Répondez aux exigences ESRS 1 & 2, ' +
      'ajoutez vos politiques et indicateurs de performance, puis exportez le rapport finalisé.',
    placement: 'right',
    disableBeacon: true,
    data: { chapter: 'conformite', stepInChapter: 6, totalInChapter: 6 },
  },

  // ── 24–25 : Paramètres & API ───────────────────────────────────────────────
  {
    target: '[data-tour="sidebar-api"]',
    title: '🔗 API Publique',
    content:
      'Accédez à la documentation Swagger de l\'API REST ESGFlow. ' +
      'Intégrez vos outils BI (Power BI, Tableau) ou vos systèmes internes via des webhooks sécurisés.',
    placement: 'right',
    disableBeacon: true,
    data: { chapter: 'settings', stepInChapter: 1, totalInChapter: 2 },
  },
  {
    target: '[data-tour="sidebar-settings"]',
    title: '⚙️ Paramètres',
    content:
      'Configurez votre profil, les préférences de notification, les droits d\'accès des utilisateurs ' +
      'et les paramètres de votre tenant. Vous êtes prêt — bonne navigation sur ESGFlow ! 🎉',
    placement: 'right',
    disableBeacon: true,
    data: { chapter: 'settings', stepInChapter: 2, totalInChapter: 2 },
  },
];
