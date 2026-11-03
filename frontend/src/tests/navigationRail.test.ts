import { describe, expect, it } from 'vitest';
import sidebar from '@/components/layout/Sidebar.tsx?raw';
import routes from '@/routes.tsx?raw';
import fr from '@/i18n/locales/fr.json';
import en from '@/i18n/locales/en.json';

// Les routes du menu avant la réorganisation : aucune ne doit disparaître.
// Seule exception voulue : /app/ai-insights (« IA prédictive »), fusionnée dans Insights IA et conservée comme redirection.
const ROUTES_BEFORE = [
  '/app',
  '/app/api-docs',
  '/app/audit-trail',
  '/app/audit/preparation',
  '/app/benchmarking',
  '/app/billing',
  '/app/cabinet',
  '/app/calculated-metrics',
  '/app/carbon',
  '/app/climate-scenarios',
  '/app/compliance',
  '/app/compliance/cdp',
  '/app/compliance/csddd',
  '/app/compliance/gri',
  '/app/compliance/ixbrl',
  '/app/compliance/sbti',
  '/app/compliance/sfdr',
  '/app/connectors',
  '/app/csrd-progress',
  '/app/data-entry',
  '/app/data-export',
  '/app/data-quality',
  '/app/data/connectors',
  '/app/decarbonation',
  '/app/esrs-gap',
  '/app/gaia',
  '/app/import-csv',
  '/app/indicators',
  '/app/intelligence',
  '/app/investor-relations',
  '/app/lca',
  '/app/materiality',
  '/app/my-data',
  '/app/notifications',
  '/app/organizations',
  '/app/profile',
  '/app/questionnaires',
  '/app/reports',
  '/app/reports/csrd-builder',
  '/app/reports/dpef',
  '/app/reports/generate',
  '/app/reports/list',
  '/app/reports/multi-standards',
  '/app/reports/scheduled',
  '/app/risks',
  '/app/scope3',
  '/app/scores',
  '/app/scores/calculate',
  '/app/scores/history',
  '/app/settings',
  '/app/settings/esg-enrichment',
  '/app/settings/insee',
  '/app/settings/integrations',
  '/app/settings/methodology',
  '/app/settings/users',
  '/app/settings/webhooks',
  '/app/stakeholders',
  '/app/supply-chain',
  '/app/taxonomy',
  '/app/tcfd',
  '/app/validation',
  '/app/vigilance',
  '/documentation',
  '/help',
];

const railIds = [...sidebar.matchAll(/^ {6}id: '([a-z]+)',$/gm)].map(m => m[1]);

describe('menu : 7 entrées de contenu + Paramètres', () => {
  it('le rail ne contient plus que 8 entrées', () => {
    expect(railIds).toEqual(['home', 'gaia', 'donnees', 'questionnaires', 'analyses', 'conformite', 'rapports', 'settings']);
  });
  it('Carbone et Engagement ne sont plus des entrées de premier niveau', () => {
    expect(railIds).not.toContain('carbone');
    expect(railIds).not.toContain('engagement');
  });
  it('aucune page n’a disparu du menu : les routes d’avant sont toutes encore présentes', () => {
    const missing = ROUTES_BEFORE.filter(r => !sidebar.includes(`href: '${r}'`));
    expect(missing).toEqual([]);
  });
  it('chaque route n’apparaît qu’une fois (pas de doublon introduit par la fusion)', () => {
    const rail = sidebar.slice(sidebar.indexOf('function buildRail'), sidebar.indexOf('function buildBottomRail'));
    const all = [...rail.matchAll(/href: '(\/[^']*)'/g)].map(m => m[1]);
    const dup = all.filter((h, i) => all.indexOf(h) !== i);
    expect(dup).toEqual([]);
  });
  it('les pages carbone vivent sous Analyses, l’audit sous Conformité, les parties prenantes sous Rapports', () => {
    const section = (id: string) => {
      const a = sidebar.indexOf(`      id: '${id}',`);
      const next = railIds[railIds.indexOf(id) + 1];
      return sidebar.slice(a, sidebar.indexOf(`      id: '${next}',`));
    };
    expect(section('analyses')).toContain("href: '/app/carbon'");
    expect(section('analyses')).toContain("href: '/app/supply-chain'");
    expect(section('conformite')).toContain("href: '/app/audit-trail'");
    expect(section('rapports')).toContain("href: '/app/investor-relations'");
  });
  it('les nouveaux libellés existent en français et en anglais', () => {
    expect((fr as any).sidebar.groups.carbonClimate).toBe('Carbone et climat');
    expect((en as any).sidebar.groups.carbonClimate).toBeTruthy();
    expect((fr as any).sidebar.rail.data).toBe('Collecte');
  });
});

describe('fusion Insights IA / IA prédictive', () => {
  it('une seule entrée de menu : /app/intelligence', () => {
    expect(sidebar).toContain("href: '/app/intelligence'");
    expect(sidebar).not.toContain("href: '/app/ai-insights'");
  });
  it('l’ancienne adresse redirige vers l’onglet Recommandations (aucun lien cassé)', () => {
    expect(routes).toMatch(/path="ai-insights"[^\n]*Navigate to="\/app\/intelligence\?tab=recommandations" replace/);
  });
  it('plus aucun lien interne vers l’ancienne adresse', () => {
    const files = import.meta.glob('/src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
    const offenders = Object.entries(files)
      .filter(([path]) => !path.includes('/tests/') && !path.endsWith('routes.tsx') && !path.endsWith('insightsTabs.ts') && !path.endsWith('InsightsIA.tsx'))
      .filter(([, src]) => /['"`]\/app\/ai-insights/.test(src))
      .map(([path]) => path);
    expect(offenders).toEqual([]);
  });
});

