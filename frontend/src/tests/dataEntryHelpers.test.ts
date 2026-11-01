import { describe, expect, it } from 'vitest';
import { countByPillar, entriesToCsv, filterEntries, type EntryLike } from '@/pages/DataEntry/dataEntryHelpers';

const E = (over: Partial<EntryLike>): EntryLike => ({ pillar: 'environmental', metric_name: 'x', verification_status: 'verified', ...over });
const ENTRIES: EntryLike[] = [
  E({ metric_name: 'Émissions Scope 1', category: 'GES', data_source: 'manual' }),
  E({ metric_name: 'Consommation d’eau', category: 'Eau', verification_status: 'pending' }),
  E({ pillar: 'social', metric_name: 'Effectif total', category: 'Effectifs' }),
  E({ pillar: 'governance', metric_name: 'Part d’administrateurs indépendants', category: 'Gouvernance', verification_status: 'pending' }),
];

describe('filtre des saisies', () => {
  const none = { search: '', pillar: 'all' as const, verif: 'all' as const };
  it('sans filtre, tout est affiché', () => expect(filterEntries(ENTRIES, none)).toHaveLength(4));
  it('filtre par pilier', () => expect(filterEntries(ENTRIES, { ...none, pillar: 'social' }).map(e => e.metric_name)).toEqual(['Effectif total']));
  it('filtre par statut', () => {
    expect(filterEntries(ENTRIES, { ...none, verif: 'pending' })).toHaveLength(2);
    expect(filterEntries(ENTRIES, { ...none, verif: 'verified' })).toHaveLength(2);
  });
  it('la recherche ignore la casse et les accents, et porte sur nom, catégorie et source', () => {
    expect(filterEntries(ENTRIES, { ...none, search: 'EMISSIONS' }).map(e => e.metric_name)).toEqual(['Émissions Scope 1']);
    expect(filterEntries(ENTRIES, { ...none, search: 'eau' })).toHaveLength(1);
    expect(filterEntries(ENTRIES, { ...none, search: 'manual' })).toHaveLength(1);
  });
  it('les filtres se combinent', () => expect(filterEntries(ENTRIES, { search: 'e', pillar: 'environmental', verif: 'pending' })).toHaveLength(1));
  it('compte les saisies par pilier', () => expect(countByPillar(ENTRIES)).toEqual({ all: 4, environmental: 2, social: 1, governance: 1 }));
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
