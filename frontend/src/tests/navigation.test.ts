import { describe, expect, it } from 'vitest';
import sidebar from '@/components/layout/Sidebar.tsx?raw';
import layout from '@/components/layout/Layout.tsx?raw';
import header from '@/components/layout/Header.tsx?raw';
import button from '@/components/common/Button.tsx?raw';
import fr from '@/i18n/locales/fr.json';
import en from '@/i18n/locales/en.json';

describe('navigation : audit du 2 novembre', () => {
  it('Questionnaires clients est une entrée de premier niveau, plus cachée dans Conformité', () => {
    expect(sidebar).toMatch(/id: 'questionnaires'[\s\S]{0,200}href: '\/app\/questionnaires'/);
    // une seule occurrence du lien (plus de doublon dans le panneau Conformité)
    expect(sidebar.match(/href: '\/app\/questionnaires'/g)).toHaveLength(1);
  });
  it('Gaïa a une seule entrée (rail), plus de doublon qui allumait « Analyses » en même temps', () => {
    expect(sidebar.match(/href: '\/app\/gaia'/g)).toHaveLength(1);
  });
  it('le titre de la barre haute connaît Gaïa et ne retombe plus sur « Tableau de bord »', () => {
    expect(header).toContain("'/app/gaia'");
    expect(header).toMatch(/if \(key === '\/app'\) continue;/);
    expect((fr as any).header.routes.gaia).toBeTruthy();
    expect((en as any).header.routes.gaia).toBeTruthy();
  });
  it('plus de bouton « + » flottant ; la checklist ne flotte que sur l’accueil, hors mobile', () => {
    expect(layout).not.toContain('QuickActions');
    expect(layout).toMatch(/pathname === '\/app'/);
    expect(layout).toContain('hidden md:block');
  });
  it('le bouton principal n’utilise plus le vert à 3,3:1 (primary-600)', () => {
    expect(button).not.toMatch(/primary:\s+'bg-primary-600/);
    expect(button).toMatch(/primary:\s+'bg-primary-700/);
  });
});
