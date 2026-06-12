import type { Step } from 'react-joyride';
import type { TFunction } from 'i18next';

/**
 * Tour "prospect" — focalisé valeur métier (ROI, conformité, IA) plutôt que listing fonctionnel.
 * Conçu pour un visiteur qui découvre la plateforme via /demo. ~2 minutes, 7 étapes,
 * se termine par un CTA "Réserver une démo personnalisée".
 */
export interface ProspectChapter {
  id: string;
  title: string;
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

// Static step→chapter mapping (indices match getProspectSteps() order)
const STEP_CHAPTER_IDS = ['welcome', 'value', 'value', 'value', 'ai', 'ai', 'cta'];

export function getProspectChapters(t: TFunction): ProspectChapter[] {
  return [
    {
      id: 'welcome',
      title: t('ptour.chWelcome', 'Bienvenue'),
      emoji: '👋',
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
    },
    {
      id: 'value',
      title: t('ptour.chValue', 'Votre valeur'),
      emoji: '💡',
      color: 'text-blue-700',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    {
      id: 'ai',
      title: t('ptour.chAI', 'IA & automatisation'),
      emoji: '🤖',
      color: 'text-violet-700',
      bgColor: 'bg-violet-50',
      borderColor: 'border-violet-200',
    },
    {
      id: 'cta',
      title: t('ptour.chCTA', 'Aller plus loin'),
      emoji: '🚀',
      color: 'text-amber-700',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
    },
  ];
}

export function getProspectChapterForStep(stepIndex: number, chapters: ProspectChapter[]): ProspectChapter {
  const chapterId = STEP_CHAPTER_IDS[stepIndex] || 'welcome';
  return chapters.find((c) => c.id === chapterId) ?? chapters[0];
}

/**
 * Email de contact pour la conversion prospect → démo personnalisée.
 * Surcharge possible via VITE_PROSPECT_CONTACT_EMAIL.
 */
export const PROSPECT_CONTACT_EMAIL =
  (import.meta.env.VITE_PROSPECT_CONTACT_EMAIL as string | undefined) ||
  'contact@greenconnect.cloud';

export const PROSPECT_CONTACT_SUBJECT = encodeURIComponent('Demande de démo ESGFlow');
export const PROSPECT_CONTACT_BODY = encodeURIComponent(
  "Bonjour,\n\nJ'ai testé la démo ESGFlow et j'aimerais réserver un créneau pour une démo personnalisée.\n\nMerci.",
);

export const PROSPECT_CONTACT_MAILTO =
  `mailto:${PROSPECT_CONTACT_EMAIL}?subject=${PROSPECT_CONTACT_SUBJECT}&body=${PROSPECT_CONTACT_BODY}`;

export function getProspectSteps(t: TFunction): Step[] {
  return [
    {
      target: 'body',
      title: t('ptour.s0Title', '👋 Bienvenue dans la démo ESGFlow'),
      content: t('ptour.s0Content',
        "En 2 minutes, nous vous montrons comment notre plateforme divise par 5 le temps de production d'un rapport CSRD, " +
        "et comment notre IA transforme vos risques ESG en plan d'action concret. Prêt ?"),
      placement: 'center',
      disableBeacon: true,
      data: { chapter: 'welcome', stepInChapter: 1, totalInChapter: 1 },
    },
    {
      target: '[data-tour="sidebar-dashboard"]',
      title: t('ptour.s1Title', '📊 Une vue unique pour piloter'),
      content: t('ptour.s1Content',
        'Vos scores E, S, G en temps réel, vos alertes prioritaires, votre conformité CSRD. ' +
        'Vos équipes Finance, RSE et Direction partagent le même tableau de bord — fini les versions Excel divergentes.'),
      placement: 'right',
      disableBeacon: true,
      data: { chapter: 'value', stepInChapter: 1, totalInChapter: 3 },
    },
    {
      target: '[data-tour="sidebar-import-csv"]',
      title: t('ptour.s2Title', '📤 Import en masse + connecteurs'),
      content: t('ptour.s2Content',
        'Import Excel/CSV intelligent (détection automatique des colonnes), ou branchement direct sur SAP, Workday, Salesforce. ' +
        "Vos données ESG remontent sans ressaisie — gain estimé : 30 jours-homme par campagne."),
      placement: 'right',
      disableBeacon: true,
      data: { chapter: 'value', stepInChapter: 2, totalInChapter: 3 },
    },
    {
      target: '[data-tour="sidebar-reports"]',
      title: t('ptour.s3Title', '📄 CSRD en un clic'),
      content: t('ptour.s3Content',
        "Générez un rapport CSRD complet, pré-rempli avec vos données et aligné sur les 10 standards ESRS, " +
        'au format PDF, Word ou XBRL — prêt pour votre commissaire aux comptes.'),
      placement: 'right',
      disableBeacon: true,
      data: { chapter: 'value', stepInChapter: 3, totalInChapter: 3 },
    },
    {
      target: '[data-tour="sidebar-intelligence"]',
      title: t('ptour.s4Title', "🤖 Une IA qui passe à l'action"),
      content: t('ptour.s4Content',
        "Notre IA analyse vos scores, identifie vos points faibles et vous propose des plans d'action chiffrés " +
        '(gain de score estimé, effort, échéance). 40 % de gain de score moyen en 12 mois chez nos clients.'),
      placement: 'right',
      disableBeacon: true,
      data: { chapter: 'ai', stepInChapter: 1, totalInChapter: 2 },
    },
    {
      target: '[data-tour="sidebar-risks"]',
      title: t('ptour.s5Title', '⚠️ Vos risques → plans de mitigation auto'),
      content: t('ptour.s5Content',
        "Saisissez vos risques ESG, l'IA génère pour chacun un plan de mitigation contextualisé : actions concrètes, " +
        "KPIs à suivre, échéance. Un risque devient un projet exécutable, pas un Post-it."),
      placement: 'right',
      disableBeacon: true,
      data: { chapter: 'ai', stepInChapter: 2, totalInChapter: 2 },
    },
    {
      target: 'body',
      title: t('ptour.s6Title', "🚀 Envie d'aller plus loin ?"),
      content: t('ptour.s6Content',
        "Réservez 30 minutes avec notre équipe : nous configurons une démo sur **vos données**, " +
        "votre périmètre et vos enjeux sectoriels. Cliquez sur « Terminer » ci-dessous pour nous écrire."),
      placement: 'center',
      disableBeacon: true,
      data: { chapter: 'cta', stepInChapter: 1, totalInChapter: 1, finalCta: true },
    },
  ];
}
