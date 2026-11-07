import { describe, it, expect } from 'vitest'
import sec from '../pages/Security/SecurityPage.tsx?raw'
import landing from '../pages/Landing/LandingPage.tsx?raw'

// Les affirmations techniques doivent refléter le code : JWT HS256, SSO OIDC,
// blocage IP après 10 échecs / 15 min, TLS 1.2 + 1.3 (nginx.conf).
describe('Page Sécurité : affirmations alignées sur le code', () => {
  it('ne cite plus RS256, 8h d\'inactivité, 5 tentatives, 19 tables', () => {
    for (const bad of ['RS256', "8h d'inactivité", '5 tentatives', '19 tables', 'TLS 1.3 uniquement', 'Un DPO est désigné']) {
      expect(sec).not.toContain(bad)
    }
  })
  it('décrit le comportement réel', () => {
    expect(sec).toContain('HS256')
    expect(sec).toContain('10 échecs de connexion en 15 minutes')
    expect(sec).toContain('TLS 1.2')
  })
  it('la landing ne promet pas de SSO SAML (seul OIDC est implémenté)', () => {
    expect(landing).not.toMatch(/SAML/)
  })
})
