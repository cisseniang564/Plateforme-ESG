import { describe, expect, it } from 'vitest';
import { assessEligibility, type EligibilityAnswers } from '@/pages/Resources/data/eligibility';
import { DICTIONARY } from '@/pages/Resources/data/dictionary';

const base: EligibilityAnswers = {
  region: 'eu', alreadyReporting: false, employees: 'le250', turnover: 'le50',
  euTurnoverOver450: false, euEntityOver200: false, sellsToLargeClients: false,
};
const a = (o: Partial<EligibilityAnswers>) => assessEligibility({ ...base, ...o });

describe('Suis-je concerné par la CSRD ? (règles Omnibus I)', () => {
  it('entreprise UE de plus de 1 000 salariés ET plus de 450 M€ : vague 2, premier rapport 2028 (exercice 2027)', () => {
    const r = a({ employees: 'le5000', turnover: 'le1500' });
    expect(r.csrd).toEqual({ status: 'in_scope_wave2', firstReportYear: 2028, fiscalYear: 2027 });
  });
  it("les deux seuils sont cumulatifs : 3 000 salariés mais 300 M€ de CA n'est pas concerné", () => {
    expect(a({ employees: 'le5000', turnover: 'le450' }).csrd.status).toBe('out_of_scope');
  });
  it('exactement 1 000 salariés ou exactement 450 M€ : pas concerné (seuils stricts)', () => {
    expect(a({ employees: 'le1000', turnover: 'gt1500' }).csrd.status).toBe('out_of_scope');
    expect(a({ employees: 'gt5000', turnover: 'le450' }).csrd.status).toBe('out_of_scope');
  });
  it('un déclarant existant continue (sous réserve de la transposition nationale)', () => {
    expect(a({ alreadyReporting: true, employees: 'le1000' }).csrd.status).toBe('already_reporting');
  });
  it('hors UE : 450 M€ dans l\'UE ET entité de plus de 200 M€ → exercice 2028, rapport 2029', () => {
    const r = a({ region: 'non_eu', euTurnoverOver450: true, euEntityOver200: true });
    expect(r.csrd).toEqual({ status: 'in_scope_non_eu', firstReportYear: 2029, fiscalYear: 2028 });
    expect(a({ region: 'non_eu', euTurnoverOver450: true }).csrd.status).toBe('out_of_scope');
  });
  it('CSDDD : plus de 5 000 salariés ET plus de 1,5 Md€ seulement', () => {
    expect(a({ employees: 'gt5000', turnover: 'gt1500' }).csddd).toBe(true);
    expect(a({ employees: 'gt5000', turnover: 'le1500' }).csddd).toBe(false);
  });
  it('PME qui vend aux grands groupes : plafond de chaîne de valeur et socle VSME', () => {
    const r = a({ employees: 'le250', sellsToLargeClients: true });
    expect(r.valueChainCap).toBe(true);
    expect(r.vsmeUseful).toBe(true);
  });
});

describe('Dictionnaire ESG', () => {
  it('chaque entrée a un identifiant unique, une définition et au moins un code de référentiel', () => {
    const ids = DICTIONARY.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of DICTIONARY) {
      expect(e.definition.length).toBeGreaterThan(20);
      expect(e.esrs || e.gri || e.vsme, e.id).toBeTruthy();
    }
  });
  it('couvre les trois piliers', () => {
    expect(new Set(DICTIONARY.map(e => e.pillar))).toEqual(new Set(['E', 'S', 'G']));
  });
});
