import { ShieldCheck, AlertTriangle, HelpCircle, type LucideIcon } from 'lucide-react';

export interface ConfidenceInfo {
  label: string;
  description: string;
  badgeClass: string;
  Icon: LucideIcon;
  /** True if the UI should surface a contextual warning/help message for this level */
  isLowData: boolean;
}

type Translate = (key: string, fallback: string) => string;

/**
 * Maps the backend `confidence_level` enum ('high' | 'medium' | 'low' | 'very_low' | 'none')
 * to display-ready labels, colors and contextual messaging.
 * Centralized so every score view explains low-confidence levels consistently
 * (especially 'very_low', the typical value for newly onboarded/demo organizations).
 * Pass i18next's `t` to localize; defaults are French.
 */
export function getConfidenceInfo(level?: string | null, t?: Translate): ConfidenceInfo {
  const tr: Translate = t ?? ((_key, fallback) => fallback);
  const c = (level || '').toLowerCase();

  switch (c) {
    case 'high':
      return {
        label: tr('confidence.high.label', 'Confiance élevée'),
        description: tr('confidence.high.desc', 'Les données disponibles couvrent une large part des indicateurs requis.'),
        badgeClass: 'bg-green-50 text-green-700 ring-green-200',
        Icon: ShieldCheck,
        isLowData: false,
      };
    case 'medium':
      return {
        label: tr('confidence.medium.label', 'Confiance moyenne'),
        description: tr('confidence.medium.desc', 'Une partie des indicateurs reste à compléter pour fiabiliser pleinement le score.'),
        badgeClass: 'bg-blue-50 text-blue-700 ring-blue-200',
        Icon: ShieldCheck,
        isLowData: false,
      };
    case 'low':
      return {
        label: tr('confidence.low.label', 'Confiance faible'),
        description: tr('confidence.low.desc', 'Peu d\'indicateurs sont encore renseignés : complétez vos données pour fiabiliser le score.'),
        badgeClass: 'bg-yellow-50 text-yellow-800 ring-yellow-200',
        Icon: AlertTriangle,
        isLowData: true,
      };
    case 'very_low':
      return {
        label: tr('confidence.veryLow.label', 'Confiance très faible'),
        description: tr('confidence.veryLow.desc', 'Très peu de données ont été saisies à ce stade : ce score est indicatif et se précisera au fur et à mesure de la complétion de vos indicateurs.'),
        badgeClass: 'bg-orange-50 text-orange-800 ring-orange-200',
        Icon: AlertTriangle,
        isLowData: true,
      };
    case 'none':
    case '':
      return {
        label: tr('confidence.none.label', 'Pas encore de données'),
        description: tr('confidence.none.desc', 'Aucune donnée n\'a encore été saisie pour cette organisation.'),
        badgeClass: 'bg-gray-50 text-gray-700 ring-gray-200',
        Icon: HelpCircle,
        isLowData: true,
      };
    default:
      return {
        label: level || tr('confidence.unknown.label', 'Non renseigné'),
        description: '',
        badgeClass: 'bg-gray-50 text-gray-700 ring-gray-200',
        Icon: HelpCircle,
        isLowData: false,
      };
  }
}
