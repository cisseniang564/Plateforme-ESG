import { describe, it, expect } from 'vitest'
import landing from '../pages/Landing/LandingPage.tsx?raw'
import billing from '../pages/Billing/BillingPage.tsx?raw'
import ai from '../pages/Features/AIAutomationPage.tsx?raw'
import terms from '../pages/Legal/termsContent.ts?raw'

// Prix annuels = mensuel − 15 % arrondi (aligné sur scripts/create_stripe_products.py).
describe('Prix : cohérence landing / facturation / CGV', () => {
  const plans: [string, number, number][] = [['pme', 249, 212], ['eti', 599, 509], ['groupe', 1199, 1019]]
  it.each(plans)('%s : annuel = mensuel −15 %%', (_n, m, a) => {
    expect(Math.round(m * 0.85)).toBe(a)
    expect(landing).toContain(`monthly: ${m}, annual: ${a}`)
    expect(billing).toContain(`priceMonthly: ${m}, priceYearly: ${a}`)
  })
  it('les CGV affichent les mêmes montants annuels', () => {
    expect(terms).toContain('2 544 €')
    expect(terms).toContain('6 108 €')
    expect(terms).toContain('12 228 €')
  })
})

// Le backend n'a ni OCR, ni Isolation Forest/Prophet : on ne les promet pas.
describe('IA : pas de fonction inexistante annoncée', () => {
  it("n'annonce plus d'OCR ni de bibliothèques non utilisées", () => {
    for (const src of [landing, ai]) {
      expect(src).not.toMatch(/OCR|Tesseract|Isolation Forest|Prophet/)
    }
  })
})
