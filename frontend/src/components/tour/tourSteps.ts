import type { Step } from 'react-joyride';
import type { TFunction } from 'i18next';

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

export function getTourChapters(t: TFunction): TourChapter[] {
  return [
    { id: 'welcome',    title: t('tsteps.chWelcome', 'Bienvenue'),               emoji: '🌿',  color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200', stepStart: 0,  stepCount: 1, description: t('tsteps.chWelcomeDesc', 'Introduction à ESG Flow') },
    { id: 'dashboard',  title: t('tsteps.chDashboard', 'Tableau de bord'),        emoji: '📊',  color: 'text-blue-700',    bgColor: 'bg-blue-50',    borderColor: 'border-blue-200',    stepStart: 1,  stepCount: 1, description: t('tsteps.chDashboardDesc', "Vue d'ensemble de vos scores ESG") },
    { id: 'collecte',   title: t('tsteps.chCollect', 'Collecte de données'),      emoji: '📥',  color: 'text-violet-700',  bgColor: 'bg-violet-50',  borderColor: 'border-violet-200',  stepStart: 2,  stepCount: 5, description: t('tsteps.chCollectDesc', 'Saisie, import et connecteurs') },
    { id: 'pilotage',   title: t('tsteps.chPilot', 'Pilotage ESG'),               emoji: '⚙️',  color: 'text-orange-700',  bgColor: 'bg-orange-50',  borderColor: 'border-orange-200',  stepStart: 7,  stepCount: 7, description: t('tsteps.chPilotDesc', 'Indicateurs, risques, audit') },
    { id: 'scoring',    title: t('tsteps.chScoring', 'Scoring & Analyses'),        emoji: '🏆',  color: 'text-amber-700',   bgColor: 'bg-amber-50',   borderColor: 'border-amber-200',   stepStart: 14, stepCount: 4, description: t('tsteps.chScoringDesc', 'Scores ESG, benchmarks, IA') },
    { id: 'conformite', title: t('tsteps.chCompliance', 'Conformité & Reporting'), emoji: '📄', color: 'text-teal-700',    bgColor: 'bg-teal-50',    borderColor: 'border-teal-200',    stepStart: 18, stepCount: 6, description: t('tsteps.chComplianceDesc', 'CSRD, décarbonation, taxonomie') },
    { id: 'settings',   title: t('tsteps.chSettings', 'Paramètres'),              emoji: '⚙️',  color: 'text-gray-700',    bgColor: 'bg-gray-50',    borderColor: 'border-gray-200',    stepStart: 24, stepCount: 2, description: t('tsteps.chSettingsDesc', 'API, configuration') },
  ];
}

export function getChapterForStep(stepIndex: number, chapters: TourChapter[]): TourChapter {
  let chapter = chapters[0];
  for (const ch of chapters) {
    if (stepIndex >= ch.stepStart) chapter = ch;
  }
  return chapter;
}

export function getTourSteps(t: TFunction): Step[] {
  return [
    {
      target: 'body',
      title: t('tsteps.s0Title', '🌿 Bienvenue sur ESG Flow'),
      content: t('tsteps.s0Content', 'Ce tour interactif (≈ 3 min) vous présente toutes les fonctionnalités de la plateforme. Naviguez avec Suivant / Précédent, sautez une étape ou relancez le tour à tout moment.'),
      placement: 'center', disableBeacon: true,
      data: { chapter: 'welcome', stepInChapter: 1, totalInChapter: 1 },
    },
    {
      target: '[data-tour="sidebar-dashboard"]',
      title: t('tsteps.s1Title', '📊 Tableau de bord'),
      content: t('tsteps.s1Content', "Votre cockpit ESG en temps réel. Visualisez vos scores E, S, G, les tendances, les alertes prioritaires et l'avancement de votre conformité CSRD d'un seul coup d'œil."),
      placement: 'right', disableBeacon: true,
      data: { chapter: 'dashboard', stepInChapter: 1, totalInChapter: 1 },
    },
    {
      target: '[data-tour="sidebar-data-entry"]',
      title: t('tsteps.s2Title', '✍️ Saisie manuelle'),
      content: t('tsteps.s2Content', 'Enregistrez vos indicateurs ESG manuellement — émissions Scope 1/2/3, données sociales RH, indicateurs de gouvernance — via des formulaires structurés par pilier.'),
      placement: 'right', disableBeacon: true,
      data: { chapter: 'collecte', stepInChapter: 1, totalInChapter: 5 },
    },
    {
      target: '[data-tour="sidebar-import-csv"]',
      title: t('tsteps.s3Title', '📤 Import en masse'),
      content: t('tsteps.s3Content', "Importez vos données en une fois depuis un fichier Excel ou CSV. Le moteur détecte automatiquement les colonnes, vous prévisualise les données et importe jusqu'à des milliers de lignes."),
      placement: 'right', disableBeacon: true,
      data: { chapter: 'collecte', stepInChapter: 2, totalInChapter: 5 },
    },
    {
      target: '[data-tour="sidebar-my-data"]',
      title: t('tsteps.s4Title', '📂 Mes données'),
      content: t('tsteps.s4Content', 'Consultez, filtrez et exportez toutes vos données ESG enregistrées. Chaque entrée est horodatée, traçable et liée à son indicateur ESRS correspondant.'),
      placement: 'right', disableBeacon: true,
      data: { chapter: 'collecte', stepInChapter: 3, totalInChapter: 5 },
    },
    {
      target: '[data-tour="sidebar-calc-auto"]',
      title: t('tsteps.s5Title', '🤖 Calculs automatiques'),
      content: t('tsteps.s5Content', 'Définissez des formules de calcul pour dériver automatiquement des KPIs complexes (ex : intensité carbone / CA, ratio parité ajusté) à partir de vos données brutes.'),
      placement: 'right', disableBeacon: true,
      data: { chapter: 'collecte', stepInChapter: 4, totalInChapter: 5 },
    },
    {
      target: '[data-tour="sidebar-connectors"]',
      title: t('tsteps.s6Title', '🔌 Connecteurs data'),
      content: t('tsteps.s6Content', 'Branchez directement vos systèmes métiers : SAP, Workday, Salesforce, fichiers SFTP. Les données remontent automatiquement selon le planning que vous configurez.'),
      placement: 'right', disableBeacon: true,
      data: { chapter: 'collecte', stepInChapter: 5, totalInChapter: 5 },
    },
    {
      target: '[data-tour="sidebar-indicators"]',
      title: t('tsteps.s7Title', '📈 Indicateurs de performance'),
      content: t('tsteps.s7Content', '174 indicateurs ESRS préchargés (E1–E5, S1–S4, G1). Filtrez par pilier, voyez instantanément lesquels ont des données et lesquels sont en attente.'),
      placement: 'right', disableBeacon: true,
      data: { chapter: 'pilotage', stepInChapter: 1, totalInChapter: 7 },
    },
    {
      target: '[data-tour="sidebar-materiality"]',
      title: t('tsteps.s8Title', '⚖️ Double matérialité'),
      content: t('tsteps.s8Content', 'Analysez la double matérialité CSRD : impact financier ET impact sociétal de vos enjeux ESG. La matrice générée alimente directement votre rapport ESRS.'),
      placement: 'right', disableBeacon: true,
      data: { chapter: 'pilotage', stepInChapter: 2, totalInChapter: 7 },
    },
    {
      target: '[data-tour="sidebar-risks"]',
      title: t('tsteps.s9Title', '⚠️ Registre des risques'),
      content: t('tsteps.s9Content', "Identifiez, évaluez et priorisez vos risques ESG (physiques, de transition, réglementaires). Chaque risque est lié à des plans d'action et à un responsable."),
      placement: 'right', disableBeacon: true,
      data: { chapter: 'pilotage', stepInChapter: 3, totalInChapter: 7 },
    },
    {
      target: '[data-tour="sidebar-supply-chain"]',
      title: t('tsteps.s10Title', '🔗 Supply Chain ESG'),
      content: t('tsteps.s10Content', "Évaluez la performance ESG de chaque fournisseur, envoyez des questionnaires de due diligence et identifiez les risques dans votre chaîne d'approvisionnement."),
      placement: 'right', disableBeacon: true,
      data: { chapter: 'pilotage', stepInChapter: 4, totalInChapter: 7 },
    },
    {
      target: '[data-tour="sidebar-data-quality"]',
      title: t('tsteps.s11Title', '🛡️ Qualité des données'),
      content: t('tsteps.s11Content', 'Détectez les anomalies, valeurs aberrantes et données manquantes. Un score de qualité global vous indique la fiabilité de vos reportings avant soumission.'),
      placement: 'right', disableBeacon: true,
      data: { chapter: 'pilotage', stepInChapter: 5, totalInChapter: 7 },
    },
    {
      target: '[data-tour="sidebar-validation"]',
      title: t('tsteps.s12Title', '✅ Workflow de validation'),
      content: t('tsteps.s12Content', "Circuit de validation multi-niveaux : le contributeur saisit, le manager valide, l'auditeur certifie. Chaque étape est tracée et notifiée automatiquement."),
      placement: 'right', disableBeacon: true,
      data: { chapter: 'pilotage', stepInChapter: 6, totalInChapter: 7 },
    },
    {
      target: '[data-tour="sidebar-audit"]',
      title: t('tsteps.s13Title', "🔒 Piste d'Audit"),
      content: t('tsteps.s13Content', 'Journal détaillé de toutes les actions sur la plateforme avec empreintes SHA-256. Téléversez les pièces justificatives, exportez pour vos auditeurs externes et assurez la traçabilité.'),
      placement: 'right', disableBeacon: true,
      data: { chapter: 'pilotage', stepInChapter: 7, totalInChapter: 7 },
    },
    {
      target: '[data-tour="sidebar-scores"]',
      title: t('tsteps.s14Title', '🏆 Scores ESG'),
      content: t('tsteps.s14Content', "Calculez automatiquement vos scores ESG globaux et par pilier sur toutes vos organisations. Identifiez les forces, faiblesses et suivez l'évolution dans le temps."),
      placement: 'right', disableBeacon: true,
      data: { chapter: 'scoring', stepInChapter: 1, totalInChapter: 4 },
    },
    {
      target: '[data-tour="sidebar-benchmarking"]',
      title: t('tsteps.s15Title', '🎯 Benchmarking sectoriel'),
      content: t('tsteps.s15Content', 'Comparez vos performances ESG avec celles de votre secteur et de vos pairs. Positionnez-vous dans les quartiles et identifiez les meilleures pratiques à adopter.'),
      placement: 'right', disableBeacon: true,
      data: { chapter: 'scoring', stepInChapter: 2, totalInChapter: 4 },
    },
    {
      target: '[data-tour="sidebar-organizations"]',
      title: t('tsteps.s16Title', '🏢 Organisations'),
      content: t('tsteps.s16Content', "Gérez toutes vos entités (filiales, sites, BU) avec leur score ESG individuel. Multi-tenant natif : chaque organisation dispose de ses propres données et droits d'accès."),
      placement: 'right', disableBeacon: true,
      data: { chapter: 'scoring', stepInChapter: 3, totalInChapter: 4 },
    },
    {
      target: '[data-tour="sidebar-intelligence"]',
      title: t('tsteps.s17Title', '🤖 IA Prédictive'),
      content: t('tsteps.s17Content', "L'intelligence artificielle analyse vos tendances, prédit vos scores futurs et vous propose des recommandations personnalisées pour améliorer votre performance ESG."),
      placement: 'right', disableBeacon: true,
      data: { chapter: 'scoring', stepInChapter: 4, totalInChapter: 4 },
    },
    {
      target: '[data-tour="sidebar-decarbonation"]',
      title: t('tsteps.s18Title', '🌍 Plan de décarbonisation'),
      content: t('tsteps.s18Content', 'Définissez vos trajectoires de réduction, créez des actions concrètes par site ou BU et suivez votre avancement vers vos objectifs Net Zéro en temps réel.'),
      placement: 'right', disableBeacon: true,
      data: { chapter: 'conformite', stepInChapter: 1, totalInChapter: 6 },
    },
    {
      target: '[data-tour="sidebar-carbon"]',
      title: t('tsteps.s19Title', '🔥 Bilan Carbone'),
      content: t('tsteps.s19Content', "Calculez votre empreinte carbone Scope 1, 2 et 3 avec les facteurs d'émission GHG Protocol. Visualisez la répartition par poste et exportez pour votre déclaration réglementaire."),
      placement: 'right', disableBeacon: true,
      data: { chapter: 'conformite', stepInChapter: 2, totalInChapter: 6 },
    },
    {
      target: '[data-tour="sidebar-taxonomy"]',
      title: t('tsteps.s20Title', '🌱 Taxonomie UE'),
      content: t('tsteps.s20Content', "Évaluez l'alignement de vos activités avec la taxonomie européenne (6 objectifs environnementaux). Calculez automatiquement le pourcentage de chiffre d'affaires « vert »."),
      placement: 'right', disableBeacon: true,
      data: { chapter: 'conformite', stepInChapter: 3, totalInChapter: 6 },
    },
    {
      target: '[data-tour="sidebar-compliance"]',
      title: t('tsteps.s21Title', '⚖️ Multi-réglementaire'),
      content: t('tsteps.s21Content', 'Suivez votre conformité simultanément sur plusieurs cadres : CSRD, GRI, SASB, TCFD, CDP. Un tableau de bord unifié pour tous vos obligations réglementaires.'),
      placement: 'right', disableBeacon: true,
      data: { chapter: 'conformite', stepInChapter: 4, totalInChapter: 6 },
    },
    {
      target: '[data-tour="sidebar-reports"]',
      title: t('tsteps.s22Title', '📄 Rapports CSRD'),
      content: t('tsteps.s22Content', 'Générez vos rapports CSRD complets en PDF ou Word, pré-remplis avec vos données. Planifiez des exports automatiques et partagez avec vos auditeurs en un clic.'),
      placement: 'right', disableBeacon: true,
      data: { chapter: 'conformite', stepInChapter: 5, totalInChapter: 6 },
    },
    {
      target: '[data-tour="sidebar-csrd-builder"]',
      title: t('tsteps.s23Title', '🛠️ CSRD Builder'),
      content: t('tsteps.s23Content', 'Éditeur visuel de rapports CSRD section par section. Répondez aux exigences ESRS 1 & 2, ajoutez vos politiques et indicateurs de performance, puis exportez le rapport finalisé.'),
      placement: 'right', disableBeacon: true,
      data: { chapter: 'conformite', stepInChapter: 6, totalInChapter: 6 },
    },
    {
      target: '[data-tour="sidebar-api"]',
      title: t('tsteps.s24Title', '🔗 API Publique'),
      content: t('tsteps.s24Content', "Accédez à la documentation Swagger de l'API REST ESG Flow. Intégrez vos outils BI (Power BI, Tableau) ou vos systèmes internes via des webhooks sécurisés."),
      placement: 'right', disableBeacon: true,
      data: { chapter: 'settings', stepInChapter: 1, totalInChapter: 2 },
    },
    {
      target: '[data-tour="sidebar-settings"]',
      title: t('tsteps.s25Title', '⚙️ Paramètres'),
      content: t('tsteps.s25Content', "Configurez votre profil, les préférences de notification, les droits d'accès des utilisateurs et les paramètres de votre tenant. Vous êtes prêt — bonne navigation sur ESG Flow ! 🎉"),
      placement: 'right', disableBeacon: true,
      data: { chapter: 'settings', stepInChapter: 2, totalInChapter: 2 },
    },
  ];
}
