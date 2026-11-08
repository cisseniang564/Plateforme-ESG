import { describe, it, expect } from 'vitest'
import supply from '../pages/Features/SupplyChainPage.tsx?raw'
import audit from '../pages/Features/AuditTrailPage.tsx?raw'
import enJson from '../i18n/locales/en.json'

// Fonctions annoncées mais absentes du backend : retention configurable, alertes
// d'intégrité automatiques, relances, enrichissement EcoVadis/INSEE, import ERP, LkSG.
describe('Pages Fonctionnalités : pas de fonction inexistante annoncée', () => {
  it('Supply chain', () => {
    for (const bad of ['LkSG', 'Relances automatiques', 'EcoVadis', 'ERP', 'Alertes automatiques', 'télécharger leurs certifications']) {
      expect(supply).not.toContain(bad)
      expect(JSON.stringify((enJson as any).features.supplyChain)).not.toContain(bad)
    }
  })
  it("Piste d'audit", () => {
    for (const bad of ['Rétention configurable', 'Notification immédiate aux administrateurs', '3 ans conformément', 'pièces justificatives attachées']) {
      expect(audit).not.toContain(bad)
    }
    expect(JSON.stringify((enJson as any).features.auditTrail)).not.toContain('Configurable retention')
  })
})
