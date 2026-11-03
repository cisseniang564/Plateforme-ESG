import { describe, expect, it } from 'vitest';
import landing from '@/pages/Landing/LandingPage.tsx?raw';
import standards from '@/pages/Features/StandardsPage.tsx?raw';
import auditPage from '@/pages/Features/AuditTrailPage.tsx?raw';
import cabinetPage from '@/pages/Features/CabinetPage.tsx?raw';
import indexHtml from '../../index.html?raw';
import en from '@/i18n/locales/en.json';
import privacy from '@/pages/Legal/PrivacyPolicy.tsx?raw';
import legalNotice from '@/pages/Legal/LegalNotice.tsx?raw';
import tourSteps from '@/components/tour/tourSteps.ts?raw';
import security from '@/pages/Security/SecurityPage.tsx?raw';
import ixbrlPage from '@/pages/Compliance/IXBRLTagging.tsx?raw';

// Garde-fou : tant qu'il n'y a ni clients, ni avis, ni certification documentée, la page publique ne les affiche pas.
const PUBLIC = { landing, standards, auditPage, cabinetPage, indexHtml };
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
  });
  it('le lieu d’hébergement n’est plus affirmé « en France » (contradictoire entre pages, et l’IA passe par OpenAI)', () => {
    for (const src of [landing, standards]) expect(src).not.toMatch(/h[ée]berg[ée][^.\n]{0,30}en France|Hébergement (100 ?% )?France|hébergé exclusivement/i);
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

describe('chiffres et hébergeur vérifiés dans le code', () => {
  it('l’hébergeur est IONOS dans les pages légales (plus d’OVH, de HDS ni de datacenter à Roubaix)', () => {
    for (const src of [privacy, legalNotice]) {
      expect(src).toMatch(/IONOS/);
      expect(src).not.toMatch(/OVH|Roubaix|HDS|ISO 27001/i);
    }
    expect(privacy).not.toMatch(/Aucun transfert hors Union Europ/i);
  });
  it('le catalogue ESRS annonce 150 concepts (valeur réelle du backend), pas 35 / 100+ / 174', () => {
    for (const src of [landing, tourSteps, ixbrlPage]) expect(src).not.toMatch(/35\+? concepts|100\+ indicateurs ESRS|174 indicateurs/i);
    expect(JSON.stringify(en)).not.toMatch(/35\+? (tagged )?ESRS concepts|35\+ mandatory|174 preloaded|100\+ (pre-configured )?ESRS indicators|SEC EDGAR compatible/i);
  });
  it('le mockup multi-référentiels n’affirme pas un mapping automatique chiffré', () => {
    expect(landing).not.toMatch(/47 indicateurs mappés automatiquement/);
  });
});

describe('page Sécurité', () => {
  it('ne cite plus OVH/Scaleway/HDS/Cloudflare ni de pentest, DPO ou SSL Labs non établis', () => {
    expect(security).not.toMatch(/OVH|Scaleway|SecNumCloud|Cloudflare|SSL Labs|DPO désigné|Hébergé en France|100 % en France|partenaire d'audit sélectionné/i);
    expect(security).toMatch(/IONOS/);
    expect(JSON.stringify((en as any).security)).not.toMatch(/OVH|Scaleway|Cloudflare|SSL Labs/i);
  });
});

describe('promesses de service et comparatif concurrents', () => {
  it('plus de délai de mise en service promis (3 jours, 48h, 1 jour)', () => {
    for (const src of [landing, standards]) expect(src).not.toMatch(/en 3 jours|2 à 3 jours ouvrés|opérationnel en 48h|Opérationnel en 1 jour|onboarding inclus/i);
    expect(JSON.stringify((en as any).landing)).not.toMatch(/3 days|onboarding included/i);
  });
  it('plus de SLA ni de procédure d’incident inventés sur la page Sécurité', () => {
    expect(security).not.toMatch(/PagerDuty|24\/7|testée trimestriellement|99,9|RTO cible|Rapport de pentest|Incidents majeurs|Tests de restauration trimestriels|status\.greenconnect/i);
  });
  it('plus de chronologie datée ni de « 8 réglementations »', () => {
    expect(landing).not.toMatch(/year: '20(22|23|24|25\+)'|réglementations couvertes/);
  });
});

describe('mentions légales : hébergeur', () => {
  it('l’entité IONOS SARL est renseignée, sans placeholder', () => {
    expect(legalNotice).toMatch(/IONOS SARL/);
    expect(legalNotice).toMatch(/Sarreguemines/);
    expect(legalNotice).not.toMatch(/à compléter/);
  });
});

describe('page publique : aucune comparaison nominative avec des concurrents', () => {
  it('la landing et les pages publiques ne nomment ni Greenly, Sweep, Workiva, Persefoni, Enablon ni Envizi', () => {
    for (const src of [landing, standards, auditPage, cabinetPage, indexHtml]) expect(src).not.toMatch(/Greenly|Sweep|Workiva|Persefoni|Enablon|Envizi/);
    expect(JSON.stringify((en as any).landing)).not.toMatch(/Greenly|Sweep|Workiva|Persefoni|Enablon|Envizi|competitor/i);
  });
  it('plus de tableau « comparaison rapide » ni de section « Comparatif concurrents » sur la landing', () => {
    expect(landing).not.toMatch(/Comparaison rapide|quickCompare|Comparatif concurrents|compareRows/);
  });
});

describe('pages /compare retirées', () => {
  it('la route redirige vers l’accueil et la page n’existe plus', async () => {
    const routes = (await import('@/routes.tsx?raw')).default;
    expect(routes).not.toMatch(/ComparisonPage/);
    expect(routes).toMatch(/path="\/compare\/:slug"[^>]*Navigate to="\/"/);
  });
});
