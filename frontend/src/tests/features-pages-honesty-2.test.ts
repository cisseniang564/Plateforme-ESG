import { describe, it, expect } from 'vitest'
import csrd from '../pages/Features/CSRDReportingPage.tsx?raw'
import ixbrl from '../pages/Features/IXBRLPage.tsx?raw'
import cabinet from '../pages/Features/CabinetPage.tsx?raw'
import landing from '../pages/Landing/LandingPage.tsx?raw'
import login from '../pages/Auth/Login.tsx?raw'

// Le suivi ESRS compte 80 points de données (ESRSGapAnalysis) ; l'export iXBRL
// produit un document XHTML (pas de package ESEF complet) ; le mode cabinet n'a
// pas de rôles par client, de favoris, d'échéances ni de méthodologies partagées.
describe('Pages Fonctionnalités (2) : chiffres et fonctions vérifiés', () => {
  it('annonce 80 points de données, pas 82 exigences', () => {
    for (const src of [csrd, landing, login]) expect(src).not.toMatch(/82 exigences/)
  })
  it("ne promet pas de package ESEF prêt au dépôt", () => {
    for (const src of [csrd, ixbrl, landing]) {
      expect(src).not.toMatch(/prêt au dépôt|ESEF audit-ready|audit-ready/)
    }
    expect(ixbrl).not.toContain('Versioning des packages')
  })
  it('mode cabinet : pas de fonctions inexistantes', () => {
    for (const bad of ['clients favoris', 'rappels automatiques', 'consultation, contribution, validation', 'assistant de mise en route', 'Méthodologies et référentiels partagés']) {
      expect(cabinet).not.toContain(bad)
    }
  })
})
