/**
 * Couleurs de référence ESGFlow.
 * À utiliser à la place des codes hexadécimaux écrits en dur dans les pages
 * (graphiques, pastilles, bordures…). Tailwind reste la source pour les classes.
 */

/** Les trois piliers ESG : toujours les mêmes couleurs partout. */
export const PILLAR_COLORS = {
  environmental: { main: '#16a34a', soft: '#f0fdf4', icon: '#dcfce7' },
  social:        { main: '#2563eb', soft: '#eff6ff', icon: '#dbeafe' },
  governance:    { main: '#7c3aed', soft: '#f5f3ff', icon: '#ede9fe' },
} as const;

/** États (succès, alerte, erreur, info). */
export const STATUS_COLORS = {
  success: '#16a34a',
  warning: '#d97706',
  danger:  '#dc2626',
  info:    '#2563eb',
  neutral: '#6b7280',
} as const;

/** Palette des graphiques : 8 couleurs distinctes, dans l'ordre d'utilisation. */
export const CHART_COLORS = [
  '#16a34a', // vert (marque)
  '#2563eb', // bleu
  '#7c3aed', // violet
  '#d97706', // ambre
  '#0891b2', // cyan
  '#dc2626', // rouge
  '#db2777', // rose
  '#6b7280', // gris
] as const;
