// Onglets de la page Insights IA (testés dans src/tests/insightsTabs.test.ts).
export type InsightsTab = 'analyse' | 'recommandations';

/** Valeur du paramètre d'URL ?tab= pour chaque onglet. */
export const TAB_PARAM: Record<InsightsTab, string> = { analyse: 'analyse', recommandations: 'recommandations' };

/** Onglet demandé par l'URL ; tout paramètre inconnu ou absent ouvre l'analyse. */
export function tabFromParam(value: string | null): InsightsTab {
  return value === 'recommandations' ? 'recommandations' : 'analyse';
}

/** Lien direct vers les recommandations (remplace l'ancienne route /app/ai-insights). */
export const RECOMMENDATIONS_PATH = '/app/intelligence?tab=recommandations';
