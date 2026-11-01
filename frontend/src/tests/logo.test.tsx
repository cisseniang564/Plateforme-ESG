import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BRAND_COLORS, LogoBrand, LogoMark, Wordmark } from '@/components/common/Logo';

const PUBLIC = join(__dirname, '..', '..', 'public');
const INDEX = readFileSync(join(__dirname, '..', '..', 'index.html'), 'utf8');
const MANIFEST = JSON.parse(readFileSync(join(PUBLIC, 'manifest.json'), 'utf8'));

describe('composants du logo', () => {
  it('l\'icône seule est annoncée « ESGFlow » aux lecteurs d\'écran', () => {
    render(<LogoMark />);
    expect(screen.getByRole('img', { name: 'ESGFlow' })).toBeInTheDocument();
  });

  it('une icône décorative est masquée (le nom est déjà lu à côté)', () => {
    const { container } = render(<LogoMark decorative />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('dessine trois flux aux couleurs des piliers E, S et G', () => {
    const { container } = render(<LogoMark />);
    const strokes = [...container.querySelectorAll('path')].map(p => p.getAttribute('stroke'));
    expect(strokes).toEqual([BRAND_COLORS.environment, BRAND_COLORS.social, BRAND_COLORS.governance]);
  });

  it('la version sur tuile ajoute un fond arrondi sombre', () => {
    const { container } = render(<LogoMark tile />);
    expect(container.querySelector('rect')).toHaveAttribute('fill', BRAND_COLORS.tile);
  });

  it('le nom s\'écrit « ESGFlow », sans espace ni majuscules intégrales', () => {
    render(<Wordmark />);
    expect(screen.getByText(/^ESG/).textContent).toBe('ESGFlow');
  });

  it('le logo complet associe l\'icône et le nom', () => {
    render(<LogoBrand variant="dark" />);
    expect(screen.getByText(/^ESG/).textContent).toBe('ESGFlow');
  });
});

describe('fichiers d\'icône', () => {
  const referenced = [
    ...[...INDEX.matchAll(/href="(\/[^"]+\.(?:svg|png|ico))"/g)].map(m => m[1]),
    ...MANIFEST.icons.map((i: { src: string }) => i.src),
  ];

  it('index.html et le manifest ne citent que des fichiers qui existent', () => {
    expect(referenced.length).toBeGreaterThan(5);
    for (const f of referenced) expect(existsSync(join(PUBLIC, f)), f).toBe(true);
  });

  it('ils pointent tous vers la dernière version du logo (v5)', () => {
    for (const f of referenced.filter(f => /icon-esgflow|favicon-v/.test(f))) expect(f, f).toMatch(/v5/);
  });

  it('une icône « maskable » existe pour les téléphones', () => {
    expect(MANIFEST.icons.some((i: { purpose: string; src: string }) => i.purpose === 'maskable' && /maskable/.test(i.src))).toBe(true);
  });
});
