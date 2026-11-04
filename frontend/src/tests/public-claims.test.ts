import { describe, it, expect } from 'vitest';
import login from '../pages/Auth/Login.tsx?raw';
import status from '../pages/Status/StatusPage.tsx?raw';
import contact from '../pages/Contact/ContactPage.tsx?raw';
import privacy from '../pages/Legal/PrivacyPolicy.tsx?raw';
import roadmap from '../pages/Resources/RoadmapPage.tsx?raw';

// Aucune certification ni disponibilité inventée sur les pages publiques.
describe('pages publiques : pas d\'affirmation invérifiable', () => {
  it('Login : aucun label de certification', () => {
    expect(login).not.toMatch(/ISO ?27001|SOC ?2|ISAE ?3000|99[.,]9 ?% ?SLA/);
  });
  it('Statut : aucun historique de disponibilité simulé', () => {
    expect(status).not.toMatch(/Math\.random|generateUptimeHistory|99,9 %/);
  });
  it('Contact : pas de SLA 99,9 %', () => {
    expect(contact).not.toMatch(/99,9/);
  });
  it('Roadmap : pas d\'audit SOC 2 annoncé', () => {
    expect(roadmap).not.toMatch(/SOC 2/);
  });
  it('Confidentialité : pas de Google Analytics, pentest ni surveillance 24/7 inventés', () => {
    expect(privacy).not.toMatch(/Google Analytics|Tests d'intrusion|Surveillance 24\/7/);
  });
});
