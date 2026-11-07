import { describe, it, expect } from 'vitest'
import partners from '../pages/Resources/PartnersPage.tsx?raw'
import landing from '../pages/Landing/LandingPage.tsx?raw'
import enJson from '../i18n/locales/en.json'

describe('Programme partenaires : pas de fonction ni de chiffre inventés', () => {
  it("ne promet plus un tableau de bord, un lien partenaire ni un annuaire public (inexistants)", () => {
    expect(partners).not.toMatch(/Tableau de bord partenaire|lien partenaire|annuaire/i)
    const enPartners = JSON.stringify((enJson as any).resources.partners)
    expect(enPartners).not.toMatch(/Partner dashboard|partner link|directory/i)
  })
  it('ne contient plus la commission moyenne de ~480 €', () => {
    expect(partners).not.toContain('480')
  })
  it('affiche des conditions indicatives', () => {
    expect(partners).toContain('Conditions indicatives')
  })
})

describe('Engagement de durée : aligné sur l\'article 8 des CGV', () => {
  it("n'affirme plus « sans engagement » pour l'abonnement annuel", () => {
    expect(landing).not.toContain('sont sans engagement, résiliables à tout moment')
    expect(landing).toContain('sans remboursement au prorata')
  })
})
