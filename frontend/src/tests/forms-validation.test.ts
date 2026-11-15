import { describe, it, expect } from 'vitest';
import contact from '@/pages/Contact/ContactPage.tsx?raw';
import validation from '@/pages/Validation/ValidationWorkflow.tsx?raw';
import tenant from '@/pages/Settings/TenantSettings.tsx?raw';

describe('Page Contact', () => {
  it('coordonnées réelles, pas de délai de réponse promis', () => {
    expect(contact).not.toContain('+33 1 76 34 00 00');
    expect(contact).toContain('tel:+33753573974');
    expect(contact).toContain('Livry-Gargan');
    expect(contact).not.toContain('2 h ouvrees');
  });
  it('libellés accentués', () => {
    for (const bad of ["'Selectionnez'", "'Telephone'", "'Prenom *'", 'salaries\'', 'Demo personnalisee']) {
      expect(contact).not.toContain(bad);
    }
  });
});

describe('Validation par un seul utilisateur', () => {
  it('réglage réservé aux administrateurs et affiché clairement', () => {
    expect(validation).toContain("api.put('/validation/settings'");
    expect(validation).toContain('vSettings?.can_edit');
    expect(validation).toContain('auto-validation');
  });
});

describe('SSO Google / Microsoft', () => {
  it('le préréglage Microsoft lit preferred_username', () => {
    expect(tenant).toContain("email: 'preferred_username'");
    expect(tenant).toContain("issuer: 'https://accounts.google.com'");
  });
});
