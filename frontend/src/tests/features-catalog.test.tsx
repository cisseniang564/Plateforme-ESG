import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import routesSource from '@/routes.tsx?raw';
import landingSource from '@/pages/Landing/LandingPage.tsx?raw';
import { FEATURE_GROUPS, FEATURES_PROMO } from '@/pages/Landing/featuresCatalog';
import FeaturesMegaMenu from '@/pages/Landing/FeaturesMegaMenu';
import FeaturesOverview from '@/pages/Landing/FeaturesOverview';

// Sans fichier de traduction : le texte affiché est le texte par défaut (français).
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_k: string, d?: string) => d ?? _k, i18n: { language: 'fr' } }),
}));

const items = FEATURE_GROUPS.flatMap(g => g.items);

describe('catalogue des fonctionnalités', () => {
  it('chaque fonctionnalité a un identifiant unique, une description courte et une destination', () => {
    expect(new Set(items.map(i => i.id)).size).toBe(items.length);
    for (const i of items) {
      expect(i.title.length, i.id).toBeGreaterThan(3);
      expect(i.desc.length, i.id).toBeLessThanOrEqual(110);
      expect(Boolean(i.to) !== Boolean(i.module), `${i.id} : une page OU un module`).toBe(true);
    }
  });

  it('les pages publiques visées existent dans les routes', () => {
    const paths = [...routesSource.matchAll(/path="([^"]+)"/g)].map(m => m[1]);
    const targets = [...items.map(i => i.to), FEATURES_PROMO.to, ...FEATURES_PROMO.more.map(m => m.to)].filter(Boolean) as string[];
    for (const to of targets) {
      const isDoc = to.startsWith('/documentation/');
      expect(isDoc || paths.includes(to), `${to} n'existe pas dans routes.tsx`).toBe(true);
    }
  });

  it('les modules visés existent dans l\'explorateur de modules', () => {
    const moduleIds = [...landingSource.matchAll(/^\s{4}id: '([a-z0-9]+)',/gm)].map(m => m[1]);
    for (const i of items.filter(x => x.module)) expect(moduleIds, i.id).toContain(i.module);
  });

  it('les articles de documentation visés existent', async () => {
    const docs = (await import('@/pages/Docs/content/conformite.ts?raw')).default as string;
    for (const i of items.filter(x => x.to?.startsWith('/documentation/'))) {
      const slug = i.to!.split('/').pop()!;
      expect(docs, slug).toContain(`'${slug}'`);
    }
  });
});

describe('méga-menu Fonctionnalités', () => {
  const setup = (open = true) => {
    const handlers = { onOpen: vi.fn(), onClose: vi.fn(), onModule: vi.fn(), onSeeAll: vi.fn() };
    render(<MemoryRouter><FeaturesMegaMenu open={open} scrolled {...handlers} /></MemoryRouter>);
    return handlers;
  };

  it('est fermé par défaut et annonce son état aux lecteurs d\'écran', () => {
    setup(false);
    const button = screen.getByRole('button', { name: /Fonctionnalités/ });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Collecter et fiabiliser')).not.toBeInTheDocument();
  });

  it('affiche les trois colonnes, chaque fonctionnalité avec sa description, et le panneau de mise en avant', () => {
    setup();
    for (const g of FEATURE_GROUPS) expect(screen.getByText(g.title)).toBeInTheDocument();
    for (const i of items) {
      expect(screen.getByText(i.title)).toBeInTheDocument();
      expect(screen.getByText(i.desc)).toBeInTheDocument();
    }
    expect(screen.getByRole('link', { name: FEATURES_PROMO.cta })).toHaveAttribute('href', FEATURES_PROMO.to);
  });

  it('un module ouvre l\'explorateur au lieu de naviguer, une page publique est un vrai lien', () => {
    const h = setup();
    fireEvent.click(screen.getByText('Qualité des données'));
    expect(h.onModule).toHaveBeenCalledWith('dataquality');
    expect(h.onClose).toHaveBeenCalled();
    expect(screen.getByText('Piste d’audit et preuves').closest('a')).toHaveAttribute('href', '/features/audit-trail');
  });

  it('Échap ferme le menu', () => {
    const h = setup();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(h.onClose).toHaveBeenCalled();
  });
});

describe('section Fonctionnalités de la landing page', () => {
  it('liste toutes les fonctionnalités, avec le badge Nouveau', () => {
    render(<MemoryRouter><FeaturesOverview onModule={vi.fn()} /></MemoryRouter>);
    const section = screen.getByRole('region', { name: /De la donnée au rapport/ });
    for (const i of items) expect(within(section).getByText(i.title)).toBeInTheDocument();
    expect(within(section).getAllByText('Nouveau')).toHaveLength(items.filter(i => i.isNew).length);
  });
});
