import { describe, expect, it } from 'vitest';
import page from '../pages/SupplyChain/SupplyChainESG.tsx?raw';
import drawer from '../pages/SupplyChain/SupplierDrawer.tsx?raw';
import portal from '../pages/SupplyChain/SupplierPortal.tsx?raw';
import {
  csvCell, mapSupplier, riskFromScore, toCsv, hasScore, RISK_THRESHOLDS,
} from '../pages/SupplyChain/supplyChainModel';

describe('Supply Chain — seuils de risque', () => {
  it.each([[100, 'Faible'], [70, 'Faible'], [69, 'Moyen'], [50, 'Moyen'], [49, 'Élevé'], [30, 'Élevé'], [29, 'Critique'], [0, 'Critique']])(
    'score %i → %s (mêmes seuils que le backend)', (score, level) => {
      expect(riskFromScore(score as number)).toBe(level);
    });
  it('documente les 4 niveaux', () => expect(RISK_THRESHOLDS).toHaveLength(4));
});

describe('Supply Chain — mapping API', () => {
  const base = { id: 'a', name: 'Acme', global_score: 0, status: 'Non évalué', risk: 'Moyen' };
  it('un fournisseur sans score n’a pas de risque affiché', () => {
    expect(hasScore(mapSupplier(base))).toBe(false);
  });
  it('lit spend_k_eur et les drapeaux du questionnaire', () => {
    const s = mapSupplier({ ...base, spend_k_eur: 120, questionnaire_link_active: true, portal_token: 't', questionnaire_completed: false });
    expect(s.spend).toBe(120);
    expect(s.linkActive).toBe(true);
    expect(s.portalToken).toBe('t');
  });
  it('un fournisseur évalué a un risque', () => {
    expect(hasScore(mapSupplier({ ...base, global_score: 72, status: 'Évalué', risk: 'Faible' }))).toBe(true);
  });
  it('ignore un libellé de risque inconnu sans planter', () => {
    expect(mapSupplier({ ...base, risk: 'low', global_score: 80 }).risk).toBe('Faible');
  });
});

describe('Supply Chain — export CSV', () => {
  it('échappe les guillemets', () => expect(csvCell('a"b')).toBe('"a""b"'));
  it('neutralise les formules', () => expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`));
  it('commence par un BOM', () => expect(toCsv([['a']]).charCodeAt(0)).toBe(0xfeff));
});

describe('Supply Chain — pas de données inventées', () => {
  it('plus de couverture codée en dur (95 %, 12 %)', () => {
    expect(page).not.toMatch(/pct:\s*(95|12)\b/);
  });
  it('plus de repli sur les organisations ni de données de démonstration', () => {
    expect(page).not.toMatch(/\/organizations|getBatchOrgScores|dataSource/);
  });
  it('les erreurs d’API ne sont plus avalées', () => {
    expect(page).not.toMatch(/\.catch\(\(\) => \{\}\)/);
    expect(drawer).not.toMatch(/\.catch\(\(\) => \{\}\)/);
  });
  it('le portail utilise le libellé de risque du serveur', () => {
    expect(portal).toMatch(/scores\?\.risk/);
  });
});
