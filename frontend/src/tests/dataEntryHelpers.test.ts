import { describe, expect, it } from 'vitest';
import { buildListParams, displayName, entriesToCsv, formatValue, looksLikeYear, totalPages, verifiedRate, type EntryLike } from '@/pages/DataEntry/dataEntryHelpers';

const E = (over: Partial<EntryLike>): EntryLike => ({ pillar: 'environmental', metric_name: 'x', verification_status: 'verified', ...over });
describe('paramètres de liste (filtres côté serveur)', () => {
  const base = { search: '', pillar: 'all' as const, verif: 'all' as const, year: '', sortBy: 'created_at' as const, order: 'desc' as const, page: 1, pageSize: 25 };
  it('omet les filtres vides', () => expect(buildListParams(base)).toEqual({ sort_by: 'created_at', order: 'desc', limit: 25, offset: 0 }));
  it('transmet filtres, tri et offset de la page', () => {
    expect(buildListParams({ ...base, search: ' eau ', pillar: 'social', verif: 'pending', year: '2024', sortBy: 'value_numeric', order: 'asc', page: 3, pageSize: 50 }))
      .toEqual({ sort_by: 'value_numeric', order: 'asc', limit: 50, offset: 100, search: 'eau', pillar: 'social', verification_status: 'pending', year: '2024' });
  });
  it('calcule le nombre de pages', () => {
    expect(totalPages(0, 25)).toBe(1);
    expect(totalPages(100, 25)).toBe(4);
    expect(totalPages(101, 25)).toBe(5);
  });
});

describe('libellé lisible des saisies importées', () => {
  it('un nom normal est conservé', () => expect(displayName({ metric_name: 'Effectif total', category: 'Effectifs' })).toEqual({ title: 'Effectif total', code: null }));
  it('un code seul devient pastille, la catégorie sert de titre', () => {
    expect(displayName({ metric_name: '3.186', category: 'emissions' })).toEqual({ title: 'Emissions', code: '3.186' });
    expect(displayName({ metric_name: '1.1', category: '' })).toEqual({ title: 'Indicateur sans libellé', code: '1.1' });
  });
});

describe('détection des valeurs ressemblant à une année', () => {
  it('signale un entier entre 1990 et 2100', () => {
    expect(looksLikeYear({ value_numeric: 2022, unit: 'tCO2e' })).toBe(true);
    expect(looksLikeYear({ value_numeric: 2018 })).toBe(true);
  });
  it('ignore les décimaux, les valeurs hors plage et les unités d’année', () => {
    expect(looksLikeYear({ value_numeric: 2022.5 })).toBe(false);
    expect(looksLikeYear({ value_numeric: 1500 })).toBe(false);
    expect(looksLikeYear({ value_numeric: 2022, unit: 'année' })).toBe(false);
    expect(looksLikeYear({ value_numeric: null })).toBe(false);
  });
  it('formate la valeur et le taux de vérification', () => {
    expect(formatValue({ value_numeric: 1234.5 })).toBe((1234.5).toLocaleString('fr-FR'));
    expect(formatValue({ value_text: 'oui' })).toBe('oui');
    expect(formatValue({})).toBe('—');
    expect(verifiedRate({ verified: 1 }, 4)).toBe(25);
    expect(verifiedRate(undefined, 0)).toBe(0);
  });
});

describe('export CSV des saisies', () => {
  it('commence par un BOM, protège les guillemets et reprend les lignes affichées', () => {
    const csv = entriesToCsv([E({ metric_name: 'Taux "net"', value_numeric: 12.5, unit: '%', period_start: '2025-01-01', category: 'GES' })]);
    expect(csv.startsWith('﻿"Indicateur"')).toBe(true);
    expect(csv).toContain('"Taux ""net"""');
    expect(csv.split('\n')[1]).toBe('"Taux ""net""","environmental","GES","12.5","%","2025-01-01","","vérifiée"');
  });
  it('une valeur texte est exportée, et le statut en attente est lisible', () => {
    const csv = entriesToCsv([E({ value_text: 'oui', verification_status: 'pending' })]);
    expect(csv).toContain('"oui"');
    expect(csv).toContain('"à vérifier"');
  });
});
