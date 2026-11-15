import { describe, it, expect } from 'vitest';
import indicators from '@/pages/Indicators/IndicatorsList.tsx?raw';
import connectors from '@/pages/Data/Connectors.tsx?raw';
import settings from '@/pages/Settings/TenantSettings.tsx?raw';

describe('Boutons sans action', () => {
  it("l'export CSV des indicateurs est branché", () => {
    expect(indicators).toContain('onClick={exportCsv}');
  });
  it('« Ajouter un connecteur » ouvre le catalogue', () => {
    expect(connectors).toContain("onClick={() => setActiveTab('connectors')}");
  });
  it('Paramètres ne montre plus un formulaire de mot de passe inactif', () => {
    expect(settings).not.toContain("'settings.tenant.security.currentPassword'");
    expect(settings).toContain('to="/app/profile"');
  });
});
