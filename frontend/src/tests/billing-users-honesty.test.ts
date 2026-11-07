import { describe, it, expect } from 'vitest'
import billing from '../pages/Billing/BillingPage.tsx?raw'
import users from '../pages/Settings/UserManagement.tsx?raw'

describe('Facturation : pas de formule « Free » inventée', () => {
  it('bloque la page si l\'abonnement n\'a pas pu être chargé', () => {
    expect(billing).toContain("setSubFailed(subRes.status === 'rejected')")
    expect(billing).toContain('if (subFailed && !sub) return')
  })
  it('distingue « aucune facture » de « factures non chargées »', () => {
    expect(billing).toContain('invFailed')
    expect(billing).toContain('!invFailed && invoices.length === 0')
  })
})

describe('Utilisateurs : échec de chargement signalé', () => {
  it('affiche une erreur au lieu d\'une liste vide silencieuse', () => {
    expect(users).toContain("id: 'users-load-error'")
  })
})
