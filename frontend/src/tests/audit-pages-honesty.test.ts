import { describe, it, expect } from 'vitest'
import trail from '../pages/Audit/AuditTrail.tsx?raw'
import prep from '../pages/Audit/AuditPreparation.tsx?raw'
import review from '../pages/Audit/AuditorReview.tsx?raw'
import marketing from '../pages/Features/AuditTrailPage.tsx?raw'
import en from '../i18n/locales/en.json?raw'

describe('Pages d\'audit : pas de fausses promesses', () => {
  it("la piste d'audit ne revendique ni ISAE 3000 ni CSRD Art. 29a ni « Signée »", () => {
    for (const src of [trail, review]) {
      expect(src).not.toMatch(/ISAE|Art\. 29a|preuve légale|Signature électronique/)
    }
    expect(trail).not.toContain('>Signée')
  })
  it("n'invente ni hash aléatoire, ni document, ni pourcentage d'intégrité, ni date en dur", () => {
    expect(trail).not.toContain('Math.random')
    expect(trail).not.toContain('uploadedDocs')
    expect(trail).not.toContain("'100%'")
    expect(trail).not.toContain('20 mars 2026')
    expect(trail).not.toContain('2026-03-20')
  })
  it("l'export et la vérification appellent réellement l'API", () => {
    expect(trail).toContain("api.get('/audit-trail/export'")
    expect(trail).toContain("api.get('/audit-trail/verify')")
  })
  it("la préparation d'audit n'affiche plus de pièce « hors-ligne » simulée", () => {
    expect(prep).not.toMatch(/hors-ligne|simulated|local: true/)
  })
  it("la page marketing ne promet ni PDF, ni pièces justificatives, ni lecture de la piste par l'auditeur", () => {
    expect(marketing).not.toMatch(/PDF|Pièces justificatives|pièce justificative|RGPD Art\. 30/)
    expect(marketing).not.toContain("Ils consultent la piste d'audit")
    expect(en).not.toContain("PDF with built-in SHA-256 verification")
  })
})
