import { describe, it, expect } from 'vitest';
import routes from '../routes.tsx?raw';
import robotsMeta from '../components/seo/RobotsMeta.tsx?raw';
import robotsTxt from '../../public/robots.txt?raw';
import pages from '../../public/sitemap-pages.xml?raw';
import guides from '../../public/sitemap-guides.xml?raw';
import trust from '../../public/sitemap-trust.xml?raw';
import legal from '../../public/sitemap-legal.xml?raw';
import features from '../../public/sitemap-features.xml?raw';

const paths = [pages, guides, trust, legal, features]
  .flatMap(x => [...x.matchAll(/<loc>https:\/\/greenconnect\.cloud([^<]*)<\/loc>/g)].map(m => m[1] || '/'));
const noindex = [...robotsMeta.matchAll(/^\s*'(\/[^']*)',/gm)].map(m => m[1]);
const disallowed = [...robotsTxt.matchAll(/^Disallow:\s*(\S+)/gm)].map(m => m[1]);

describe('Sitemaps cohérents avec le routeur, robots.txt et noindex', () => {
  it('au moins quelques URLs', () => expect(paths.length).toBeGreaterThan(15));
  it.each(paths)('%s : route existante', (p) => {
    if (p !== '/') expect(routes).toContain(`path="${p}"`);
  });
  it.each(paths)('%s : ni noindex ni bloquée par robots.txt', (p) => {
    expect(noindex.some(n => p.startsWith(n))).toBe(false);
    expect(disallowed.some(d => p.startsWith(d))).toBe(false);
  });
  it('pas de doublon', () => expect(new Set(paths).size).toBe(paths.length));
});
