import { describe, it, expect } from 'vitest'
import landing from '../pages/Landing/LandingPage.tsx?raw'
import sec from '../pages/Security/SecurityPage.tsx?raw'
import tenant from '../pages/Settings/TenantSettings.tsx?raw'
import login from '../pages/Auth/Login.tsx?raw'
import standards from '../pages/Features/StandardsPage.tsx?raw'
import roadmap from '../pages/Resources/RoadmapPage.tsx?raw'
import fr from '../i18n/locales/fr.json?raw'
import en from '../i18n/locales/en.json?raw'

// Le SSO OpenID Connect est implémenté (backend/app/services/oidc_service.py). SAML 2.0 ne l'est pas :
// il ne doit jamais être présenté comme disponible.
describe('SSO : OpenID Connect disponible, SAML non promis', () => {
  it('SAML n\'est vendu nulle part', () => {
    for (const src of [landing, sec, standards]) {
      expect(src).not.toMatch(/SSO SAML|SAML 2\.0\)? ?(disponible|inclus)/)
    }
    expect(roadmap).toContain("'SSO SAML 2.0'")
    expect(sec).toContain("SAML 2.0 n'est pas pris en charge")
  })
  it('plus aucune mention « SSO bientôt disponible »', () => {
    for (const src of [landing, sec, tenant, en]) {
      expect(src).not.toMatch(/SSO \(bientôt disponible\)|SSO \(coming soon\)|sso\.comingSoon/)
    }
  })
  it('la page de connexion et les réglages exposent le SSO', () => {
    expect(login).toContain("api.post('/sso/start'")
    expect(tenant).toContain("api.post('/sso/config'")
    expect(tenant).toContain("api.get('/sso/redirect-uri')")
  })
  it('les réglages précisent les limites (comptes existants, SAML absent)', () => {
    expect(tenant).toContain("aucun compte n'est créé automatiquement")
    expect(tenant).toContain("SAML n'est pas pris en charge")
  })
})
