import { describe, it, expect } from 'vitest'
import landing from '../pages/Landing/LandingPage.tsx?raw'
import sec from '../pages/Security/SecurityPage.tsx?raw'
import tenant from '../pages/Settings/TenantSettings.tsx?raw'
import standards from '../pages/Features/StandardsPage.tsx?raw'
import fr from '../i18n/locales/fr.json?raw'
import en from '../i18n/locales/en.json?raw'

// Aucune connexion SSO n'est implémentée (le backend ne stocke que la configuration) :
// le SSO ne doit être présenté que comme « bientôt disponible ».
describe('SSO : aucune promesse sur une fonction inexistante', () => {
  it('pas de « SSO OpenID Connect / OIDC / SAML » vendu', () => {
    for (const src of [landing, sec, standards, fr, en]) {
      expect(src).not.toMatch(/SSO OpenID Connect|SSO OIDC|SSO SAML|OIDC SSO/)
    }
  })
  it('les offres annoncent le SSO comme à venir', () => {
    expect(landing).toContain('SSO (bientôt disponible)')
  })
  it('les paramètres n\'exposent plus un formulaire SSO inopérant', () => {
    expect(tenant).not.toContain("api.post('/sso/config'")
    expect(tenant).toContain("t('settings.tenant.sso.comingSoon'")
  })
})
