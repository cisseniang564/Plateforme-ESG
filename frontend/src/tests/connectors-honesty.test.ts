import { describe, expect, it } from 'vitest';
import connectorsPage from '@/pages/Data/Connectors.tsx?raw';
import landing from '@/pages/Landing/LandingPage.tsx?raw';
import pennylane from '@/pages/Data/PennylaneConnector.tsx?raw';
import qonto from '@/pages/Data/QontoConnector.tsx?raw';
import en from '@/i18n/locales/en.json';
import tenant from '@/pages/Settings/TenantSettings.tsx?raw';
import support from '@/pages/Support/Support.tsx?raw';
import palette from '@/components/common/CommandPalette.tsx?raw';
import docsGestion from '@/pages/Docs/content/gestion.ts?raw';

// Garde-fou : la page des connecteurs et la landing ne doivent pas afficher de chiffres inventés.
describe('connecteurs : aucune donnée inventée à l\'écran', () => {
  it('la page Connecteurs ne contient plus de journal, d\'activité ni de volume fictifs', () => {
    for (const forbidden of ['MOCK_LOGS', 'RECENT_ACTIVITY', 'SYNC_VOLUME', 'Token OAuth expire', "1m 23s", '* 0.0012', 'il y a 15min', 'il y a 30min']) {
      expect(connectorsPage, forbidden).not.toContain(forbidden);
    }
  });

  it('les écrans Pennylane et Qonto n\'inventent ni mode démo ni répartition en pourcentages', () => {
    for (const src of [pennylane, qonto]) {
      expect(src).not.toMatch(/source\s*===\s*"mock"/);
      expect(src).not.toMatch(/total_spend\s*\*\s*0\./);
    }
  });

  it('les connecteurs de démonstration ne sont pas présentés comme connectés', () => {
    const block = connectorsPage.slice(connectorsPage.indexOf('const CONNECTORS'), connectorsPage.indexOf('// Journal réel'));
    expect(block).not.toMatch(/status: 'connected'/);
    for (const m of block.matchAll(/backendStatus: 'demo'[^}]*?(lastSync|records):/g)) throw new Error(`chiffre inventé sur un connecteur démo : ${m[0]}`);
  });

  it('la landing n\'annonce plus « 25 connecteurs natifs » (français et anglais)', () => {
    expect(landing).not.toMatch(/25 connecteurs/);
    expect(JSON.stringify(en)).not.toMatch(/25 native connectors|25 ERP/);
  });

  it('l\'aperçu des connecteurs de la landing ne montre ni SAP « connecté » ni volumes inventés', () => {
    const preview = landing.slice(landing.indexOf('function PreviewConnectors'), landing.indexOf('function PreviewINSEE'));
    expect(preview).not.toMatch(/47 syncs|8\.4 GB|status: 'connected'|1 250/);
  });
});

describe('connecteurs : aucune promesse hors Pennylane, Qonto, Enedis', () => {
  it('ni badge « N connectés » inventé, ni SAP/Oracle/Workday/Power BI cités comme disponibles', () => {
    for (const src of [tenant, support, palette, docsGestion]) expect(src).not.toMatch(/5 connectés|SAP · Oracle|Google Sheets, Power BI|SAP, Salesforce/);
    expect(JSON.stringify(en)).not.toMatch(/5 connectés|SAP · Oracle · Workday|Google Sheets, Power BI, SAP/);
  });
});
