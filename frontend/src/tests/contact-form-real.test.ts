import { describe, it, expect } from 'vitest'
import contact from '../pages/Contact/ContactPage.tsx?raw'
import checklist from '../pages/Resources/ChecklistCsrdPage.tsx?raw'

// Le formulaire de contact doit réellement appeler le backend (il simulait l'envoi avant).
describe('Formulaire de contact', () => {
  it('appelle /contact et ne simule plus rien', () => {
    expect(contact).toContain("api.post('/contact'")
    expect(contact).not.toMatch(/Simulate API call|setTimeout\(r, 1200\)/)
  })
  it("affiche une erreur si l'envoi échoue et n'annonce pas de délai non tenu", () => {
    expect(contact).toContain('role="alert"')
    expect(contact).not.toMatch(/24 ?h(eures)? ouvr/i)
  })
  it('a un champ piège anti-robots vide par défaut', () => {
    expect(contact).toContain("website: ''")
  })
})

describe('Check-list : le nombre annoncé correspond au PDF (46 indicateurs)', () => {
  it('ne dit plus 47', () => {
    expect(checklist).not.toMatch(/\b47\b/)
    expect(checklist).toContain('46 indicateurs')
  })
})
