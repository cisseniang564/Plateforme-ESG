import { describe, it, expect } from 'vitest';
import cdp from '../pages/Compliance/CDPReporting.tsx?raw';
import sfdr from '../pages/Compliance/SFDRDisclosure.tsx?raw';
import csddd from '../pages/Compliance/CSDDD.tsx?raw';

describe('Conformité — les échecs de sauvegarde et de chargement sont visibles', () => {
  it("CDP : l'enregistrement automatique et le chargement signalent l'échec", () => {
    expect(cdp).not.toMatch(/api\.post\('\/cdp\/climate', \{ responses: updated \}\)\.catch\(\(\) => \{\}\)/);
    expect(cdp).toContain('compliance.cdp.autosaveError');
    expect(cdp).toContain('compliance.cdp.loadError');
  });
  it("SFDR : plus de PATCH dont l'échec est ignoré", () => {
    expect(sfdr).not.toMatch(/api\.patch\([^)]*\)\.catch\(\(\) => \{\}\)/);
    expect(sfdr).toContain('compliance.sfdr.autosaveError');
  });
  it("CSDDD : l'échec de chargement de l'évaluation est signalé", () => {
    expect(csddd).toContain('compliance.csddd.toast.loadError');
    expect(csddd).toContain('compliance.csddd.toast.catalogError');
  });
});
