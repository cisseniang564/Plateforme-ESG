import { describe, it, expect } from 'vitest';
import src from '../pages/Dashboard/ExecutiveDashboard.tsx?raw';

describe('Tableau de bord : refonte sans données inventées', () => {
  it('garde toutes les sources de données réelles', () => {
    for (const call of ['/organizations', 'getBatchOrgScores', 'getScoringDashboard', 'getOrgScores', '/esrs/gap-analysis', '/notifications']) {
      expect(src).toContain(call);
    }
  });
  it('garde les liens de navigation', () => {
    for (const to of ['/app/esrs-gap', '/app/gaia', '/app/organizations', '/app/reports', '/app/scores/calculate', '/app/dashboard/pillar/']) {
      expect(src).toContain(to);
    }
  });
  it('moyenne des piliers sur les organisations notées seulement', () => {
    expect(src).toMatch(/filter\(\(v\): v is number => typeof v === 'number'\)/);
  });
  it('affiche l’objectif sur la courbe et les barres', () => {
    expect(src).toContain('<ReferenceLine y={TARGET}');
    expect(src).toContain('target={TARGET}');
  });
  it('n’utilise plus d’emoji pour l’activité et respecte la réduction des animations', () => {
    expect(src).not.toMatch(/'✅'|'📋'|'⚠️'|'🚨'/);
    expect(src).toContain('motion-safe:transition-[width]');
  });
  it('aucune valeur codée en dur dans le rendu', () => {
    expect(src).not.toMatch(/Math\.random|mockData|fakeData|DEMO_/);
  });
});
