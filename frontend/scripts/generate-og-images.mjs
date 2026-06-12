/**
 * generate-og-images.mjs
 *
 * Generates branded OG images (1200x630 PNG) for every public page.
 * Run with: node scripts/generate-og-images.mjs
 *
 * Requires: sharp (devDependency)
 */
import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'og');
mkdirSync(OUT_DIR, { recursive: true });

const W = 1200;
const H = 630;

// ── Page definitions ─────────────────────────────────────────────────────────
const PAGES = [
  // Landing & core
  { slug: 'default',              title: 'ESG Flow',                          subtitle: 'La plateforme ESG tout-en-un pour les entreprises engagees', accent: '#10b981' },
  { slug: 'landing',              title: 'ESG Flow',                          subtitle: 'Pilotez votre strategie ESG avec 22 modules integres',       accent: '#10b981' },
  { slug: 'pricing',              title: 'Tarifs ESG Flow',                   subtitle: 'Plans adaptes a votre taille — a partir de 0 EUR',            accent: '#059669' },
  { slug: 'contact',              title: 'Contact',                           subtitle: 'Parlons de votre projet ESG',                                accent: '#6366f1' },

  // Feature pages
  { slug: 'feature-csrd',         title: 'Module CSRD / ESRS',               subtitle: 'Conformite CSRD automatisee, ESRS 2024 a jour',             accent: '#2563eb' },
  { slug: 'feature-carbon',       title: 'Bilan Carbone',                     subtitle: 'Scope 1, 2 et 3 complets avec Sankey et benchmarks',        accent: '#f59e0b' },
  { slug: 'feature-supply-chain', title: 'Supply Chain ESG',                  subtitle: 'Due diligence et scoring fournisseurs CSDDD',               accent: '#8b5cf6' },
  { slug: 'feature-taxonomy',     title: 'Taxonomie Europeenne',              subtitle: 'Eligibilite et alignement Taxonomie UE',                    accent: '#0ea5e9' },
  { slug: 'feature-sfdr',         title: 'SFDR & PAI',                        subtitle: 'Reporting investisseurs et disclosure SFDR',                 accent: '#ec4899' },
  { slug: 'feature-materiality',  title: 'Double Materialite',                subtitle: 'Matrice de materialite IRO conforme ESRS',                  accent: '#14b8a6' },
  { slug: 'feature-decarb',       title: 'Plan de Decarbonation',             subtitle: 'Trajectoire SBTi 1.5 C avec 24 actions ROI',                accent: '#f97316' },
  { slug: 'feature-intelligence', title: 'IA & Intelligence ESG',             subtitle: 'Veille reglementaire et recommandations IA',                accent: '#a855f7' },

  // Legal
  { slug: 'privacy-policy',       title: 'Politique de Confidentialite',      subtitle: 'RGPD — Donnees hebergees en France',                        accent: '#3b82f6' },
  { slug: 'terms',                title: 'Conditions Generales d\'Utilisation', subtitle: 'CGU de la plateforme ESG Flow',                           accent: '#64748b' },
  { slug: 'cgv',                  title: 'Conditions Generales de Vente',     subtitle: 'Tarifs, abonnements et facturation',                        accent: '#64748b' },
  { slug: 'legal-notice',         title: 'Mentions Legales',                  subtitle: 'Editeur, hebergement et responsabilite',                    accent: '#64748b' },

  // Comparison
  { slug: 'compare',              title: 'ESG Flow vs Alternatives',          subtitle: 'Comparez ESG Flow aux autres plateformes ESG',              accent: '#10b981' },
];

// ── SVG template ─────────────────────────────────────────────────────────────
function buildSvg({ title, subtitle, accent }) {
  // Truncate title/subtitle for safety
  const t = title.length > 45 ? title.slice(0, 42) + '...' : title;
  const s = subtitle.length > 80 ? subtitle.slice(0, 77) + '...' : subtitle;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="50%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="accent-grad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${accent}"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0.4"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="url(#bg)"/>

  <!-- Decorative circles -->
  <circle cx="950" cy="120" r="280" fill="${accent}" opacity="0.06"/>
  <circle cx="200" cy="550" r="200" fill="${accent}" opacity="0.04"/>

  <!-- Top accent bar -->
  <rect x="0" y="0" width="${W}" height="6" fill="url(#accent-grad)"/>

  <!-- Logo mark -->
  <rect x="72" y="60" width="48" height="48" rx="12" fill="${accent}" opacity="0.9"/>
  <text x="96" y="92" text-anchor="middle" fill="white" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="800">EF</text>

  <!-- Brand name -->
  <text x="132" y="92" fill="white" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="700" opacity="0.9">ESG Flow</text>

  <!-- Title -->
  <text x="72" y="300" fill="white" font-family="system-ui, -apple-system, sans-serif" font-size="56" font-weight="800" letter-spacing="-1">${escapeXml(t)}</text>

  <!-- Subtitle -->
  <text x="72" y="370" fill="white" font-family="system-ui, -apple-system, sans-serif" font-size="26" font-weight="400" opacity="0.7">${escapeXml(s)}</text>

  <!-- Bottom bar -->
  <rect x="72" y="480" width="120" height="4" rx="2" fill="${accent}"/>

  <!-- URL -->
  <text x="72" y="560" fill="white" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="500" opacity="0.4">greenconnect.cloud</text>

  <!-- Badge -->
  <rect x="920" y="530" width="210" height="40" rx="20" fill="${accent}" opacity="0.15"/>
  <text x="1025" y="556" text-anchor="middle" fill="${accent}" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="700">22 modules integres</text>
</svg>`;
}

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

// ── Generate all images ──────────────────────────────────────────────────────
async function main() {
  console.log(`Generating ${PAGES.length} OG images...`);

  for (const page of PAGES) {
    const svg = buildSvg(page);
    const outPath = join(OUT_DIR, `${page.slug}.png`);
    await sharp(Buffer.from(svg))
      .resize(W, H)
      .png({ quality: 90, compressionLevel: 9 })
      .toFile(outPath);
    console.log(`  ✓ ${page.slug}.png`);
  }

  console.log(`\nDone! ${PAGES.length} images in public/og/`);
}

main().catch(err => { console.error(err); process.exit(1); });
