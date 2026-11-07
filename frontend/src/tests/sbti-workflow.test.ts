import { describe, it, expect } from 'vitest';
import src from '../pages/Compliance/SBTiWorkflow.tsx?raw';

describe('SBTiWorkflow — pas de promesses ni de chiffres inventés', () => {
  it("n'invente plus la répartition Scope 1 / Scope 2", () => {
    expect(src).not.toMatch(/scope12 \* 0\.55|scope12 \* 0\.45/);
  });
  it("ne génère plus le dossier automatiquement à l'ouverture de l'étape", () => {
    expect(src).not.toMatch(/Auto-run validation on mount/);
    expect(src).not.toMatch(/useEffect\(\(\) => \{\s*generateBackendDossier/);
  });
  it('ne présente plus un dossier « officiel » ni une économie de 9 500 $', () => {
    expect(src).not.toMatch(/9 500/);
    expect(src).not.toMatch(/Dossier prêt pour soumission SBTi/);
    expect(src).not.toMatch(/Dossier officiel/);
  });
  it("n'indique plus que le well-below 2°C est accepté par la SBTi", () => {
    expect(src).not.toMatch(/Minimum accepté par SBTi/);
    expect(src).toMatch(/15 juillet 2022/);
  });
  it('avertit que les critères évoluent et que le suivi est saisi par l’utilisateur', () => {
    expect(src).toContain('criteriaNotice');
    expect(src).toContain('trackingNote');
  });
});
