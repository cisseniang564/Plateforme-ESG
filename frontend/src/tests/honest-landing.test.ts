import { describe, expect, it } from 'vitest';
import landing from '@/pages/Landing/LandingPage.tsx?raw';
import standards from '@/pages/Features/StandardsPage.tsx?raw';
import compare from '@/pages/Compare/ComparisonPage.tsx?raw';
import auditPage from '@/pages/Features/AuditTrailPage.tsx?raw';
import cabinetPage from '@/pages/Features/CabinetPage.tsx?raw';
import indexHtml from '../../index.html?raw';
import en from '@/i18n/locales/en.json';

// Garde-fou : tant qu'il n'y a ni clients, ni avis, ni certification documentée, la page publique ne les affiche pas.
const PUBLIC = { landing, standards, compare, auditPage, cabinetPage, indexHtml };
const enLanding = JSON.stringify((en as any).landing);

describe('page publique : aucune fausse preuve sociale', () => {
  it.each(Object.entries(PUBLIC))('%s : aucun nom de grande entreprise présenté comme client ou témoin', (_n, src) => {
    expect(src).not.toMatch(/TotalEnergies|LVMH|Carrefour|Renault|Danone|Michelin|Veolia|BNP Paribas|L'Oréal|Engie|Vinci|Airbus|Sanofi|EDF\b|Bouygues|Nexans|Biocoop|Deloitte/);
  });
  it('plus de section « Ils nous font confiance », de témoignages ni d’avis chiffrés', () => {
    expect(landing).not.toMatch(/Ils nous font confiance|Ce que disent nos clients|Témoignages/);
    expect(landing).not.toMatch(/avis vérifiés|200\+ avis|4,9 ?\/ ?5|4,9\/5|500\+ (équipes|Entreprises clientes)/i);
  });
  it('plus de récompenses, classements d’analystes ni de mentions presse inventés', () => {
    expect(landing).not.toMatch(/High Performer|Capterra|Verdantix|IDC MarketScape|France 2030|Lauréat|Dans la presse|Les Echos|BFM Business|Forbes France|Maddyness|FrenchWeb|Usine Digitale/);
  });
  it('plus de note moyenne dans les données structurées lues par les moteurs de recherche', () => {
    expect(indexHtml).not.toContain('aggregateRating');
    expect(indexHtml).not.toContain('reviewCount');
  });
});

describe('page publique : aucune certification ni garantie non documentée', () => {
  it.each(Object.entries(PUBLIC))('%s : pas d’ISO 27001, de SLA garanti ni de supervision 24/7', (_n, src) => {
    expect(src).not.toMatch(/ISO 27001/);
    expect(src).not.toMatch(/SLA (99|garanti)|Disponibilité 99|99,9 ?%|Monitoring 24\/7|PRA & PCA/);
  });
  it('plus de « tier III », de sauvegarde géo-répliquée, ni de « aucun cloud américain / GAFAM »', () => {
    expect(landing).not.toMatch(/tier III|géo-répliqué|Aucun cloud US|Aucun GAFAM|aucun cloud américain/i);
    expect(compare).not.toMatch(/Aucun cloud américain/i);
  });
  it('le lieu d’hébergement n’est plus affirmé « en France » (contradictoire entre pages, et l’IA passe par OpenAI)', () => {
    for (const src of [landing, standards, compare]) expect(src).not.toMatch(/h[ée]berg[ée][^.\n]{0,30}en France|Hébergement (100 ?% )?France|hébergé exclusivement/i);
  });
  it('la FAQ d’hébergement signale que l’IA envoie le texte à OpenAI', () => {
    expect(landing).toMatch(/OpenAI, un prestataire américain/);
    expect(standards).toMatch(/envoient le texte analysé à OpenAI/);
  });
  it('plus de « certifiable » promis sur la page d’accueil', () => {
    expect(landing).not.toMatch(/certifiable/i);
  });
});

describe('page publique : traductions anglaises alignées', () => {
  it('aucune des affirmations retirées ne subsiste en anglais', () => {
    expect(enLanding).not.toMatch(/Deloitte|Nexans|Biocoop|ISO 27001|GAFAM|99\.9|what our clients say|observed on average by our clients|Our clients see|among our|200\+|500\+|4\.9|Tier III|geo-replicated|24\/7|hosted in France|France hosting|France 2030|Capterra|Verdantix|IDC/i);
  });
  it('plus de section témoignages ni d’analystes dans les traductions', () => {
    expect((en as any).landing.lp.testimonials).toBeUndefined();
    expect((en as any).landing.lp.proof.analysts).toBeUndefined();
  });
});
