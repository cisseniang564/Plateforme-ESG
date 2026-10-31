/**
 * La documentation doit rester complète : chaque page de l'application a un article,
 * les liens internes sont valides et chaque lien « page concernée » existe dans les routes.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ARTICLES, SECTIONS, searchArticles } from '@/pages/Docs/content';

const routesSource = readFileSync(resolve(__dirname, '../routes.tsx'), 'utf-8');
const declaredPaths = new Set([...routesSource.matchAll(/path="([^"]+)"/g)].map(m => m[1]));

/** Routes de l'application (sous /app), hors routes à paramètre, redirections et page 404. */
function appRoutes(): string[] {
  const out: string[] = [];
  for (const chunk of routesSource.split('<Route').slice(1)) {
    const head = chunk.slice(0, 400);
    const path = head.match(/path="([^"]+)"/)?.[1];
    const isIndex = /^\s+index\b/.test(head);
    const el = head.match(/element=\{([\s\S]*?)\}\s*\/?>/)?.[1] ?? '';
    if (!el || el.includes('<Navigate')) continue;
    if (isIndex && !path) { out.push('/app'); continue; }
    if (!path || path.startsWith('/') || path.includes(':') || path.includes('*')) continue;
    out.push('/app/' + path);
  }
  return [...new Set(out)];
}

describe('documentation', () => {
  it('a des slugs uniques et des sections valides', () => {
    const slugs = ARTICLES.map(a => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const sections = new Set(SECTIONS.map(s => s.id));
    for (const a of ARTICLES) expect(sections.has(a.section), a.slug).toBe(true);
  });

  it('a des liens « voir aussi » valides', () => {
    const slugs = new Set(ARTICLES.map(a => a.slug));
    for (const a of ARTICLES) for (const r of a.related ?? []) expect(slugs.has(r), `${a.slug} -> ${r}`).toBe(true);
  });

  it('a un contenu complet pour chaque article', () => {
    for (const a of ARTICLES) {
      expect(a.title.length, a.slug).toBeGreaterThan(3);
      expect(a.about.length, a.slug).toBeGreaterThan(40);
      expect(a.shows.length, a.slug).toBeGreaterThan(0);
      expect(a.routes.length, a.slug).toBeGreaterThan(0);
    }
  });

  it('ne pointe que vers des pages qui existent', () => {
    const known = (to: string) => {
      if (to === '/' || to === '/app') return true;
      const p = to.replace(/^\/app\//, '');
      if (declaredPaths.has(to) || declaredPaths.has(p)) return true;
      // route à paramètre : /supplier-portal/exemple -> /supplier-portal/:token ; /app/dashboard/pillar/social -> .../:pillar
      return [...declaredPaths].some(d => d.includes(':') && new RegExp('^' + d.replace(/:[^/]+/g, '[^/]+') + '$').test(to.startsWith('/app/') ? p : to));
    };
    for (const a of ARTICLES) for (const r of a.routes) expect(known(r.to), `${a.slug} -> ${r.to}`).toBe(true);
  });

  it('couvre toutes les pages de l\'application', () => {
    const documented = new Set(ARTICLES.flatMap(a => a.routes.map(r => r.to)));
    expect(appRoutes().length).toBeGreaterThan(70);   // garde-fou : l'extraction des routes ne doit pas être vide
    const missing = appRoutes().filter(r => !documented.has(r));
    expect(missing).toEqual([]);
  });

  it('trouve un article par une recherche sans accent', () => {
    expect(searchArticles('bilan carbone').map(a => a.slug)).toContain('bilan-carbone');
    expect(searchArticles('materialite')[0]?.slug).toBe('matrice-materialite');
    expect(searchArticles('zzzzzz')).toEqual([]);
  });
});
