import { describe, expect, it } from 'vitest';
import { RECOMMENDATIONS_PATH, tabFromParam } from '@/pages/Analytics/insightsTabs';

describe('onglets Insights IA', () => {
  it('?tab=recommandations ouvre les recommandations', () => expect(tabFromParam('recommandations')).toBe('recommandations'));
  it('absent, vide ou inconnu : l’analyse', () => {
    expect(tabFromParam(null)).toBe('analyse');
    expect(tabFromParam('')).toBe('analyse');
    expect(tabFromParam('predictif')).toBe('analyse');
  });
  it('le lien direct pointe vers l’onglet Recommandations', () => {
    expect(RECOMMENDATIONS_PATH).toBe('/app/intelligence?tab=recommandations');
    expect(tabFromParam(new URL(RECOMMENDATIONS_PATH, 'http://x').searchParams.get('tab'))).toBe('recommandations');
  });
});
