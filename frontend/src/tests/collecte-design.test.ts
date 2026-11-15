import { describe, it, expect } from 'vitest';
import myd from '../pages/DataEntry/MyDataDashboard.tsx?raw';
import entry from '../pages/DataEntry/DataEntryForm.tsx?raw';
import header from '../pages/DataEntry/CollectHeader.tsx?raw';

describe('Collecte : refonte sans perte de fonction', () => {
  it('« Mes données » garde ses appels, filtres, tri, pagination et actions', () => {
    for (const call of ["'/data-entry/'", "'/data-entry/stats'", "'/data-entry/export'", '/data-validation/entries/', 'api.delete(`/data-entry/']) {
      expect(myd).toContain(call);
    }
    for (const x of ['setPillar', 'setSource', 'setStatus', 'handleSort', 'setPageSize', 'setDeleteTarget', 'setRejectTarget', 'MyDataStatsDashboard']) {
      expect(myd).toContain(x);
    }
  });
  it('répartition par statut sous les chiffres clés', () => {
    expect(myd).toContain('STATUS_BAR');
  });
  it('tableau lisible sur mobile et en mode sombre', () => {
    expect(myd).toContain('hidden md:table-cell');
    expect(myd).toContain('dark:divide-gray-800');
    expect(myd).not.toMatch(/uppercase tracking-wide/);
  });
  it('la saisie affiche le vrai statut (rejetée, signalée) et ne compte pas les rejets comme « à vérifier »', () => {
    expect(entry).toContain("rejected: { label: 'Rejetée'");
    expect(entry).toContain("flagged: { label: 'Signalée'");
    expect(entry).not.toContain('grandTotal - (stats?.by_verification_status?.verified');
  });
  it('styles partagés alignés sur le reste de l’application', () => {
    expect(header).toContain("export const card = 'rounded-2xl");
  });
});
