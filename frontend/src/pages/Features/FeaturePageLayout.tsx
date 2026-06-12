/**
 * FeaturePageLayout — Reusable layout for individual feature/module pages.
 *
 * Structure:
 *   1. Hero section with gradient background, icon, title, subtitle, CTA
 *   2. Key benefits (3-4 cards)
 *   3. Detailed capabilities list
 *   4. How it works (3-step process)
 *   5. FAQ (3-5 questions)
 *   6. CTA section
 */
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, CheckCircle, ChevronDown, Leaf, Play } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { usePageSeo } from '@/hooks/usePageSeo';
import { useTranslation } from 'react-i18next';

export interface FeatureBenefit {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface FeatureCapability {
  title: string;
  description: string;
}

export interface FeatureStep {
  step: number;
  title: string;
  description: string;
}

export interface FeatureFAQ {
  question: string;
  answer: string;
}

export interface FeaturePageProps {
  // Hero
  icon: LucideIcon;
  color: string;        // hex color
  colorLight: string;   // hex light bg
  title: string;
  subtitle: string;
  description: string;
  heroImage?: React.ReactNode;

  // Content
  benefits: FeatureBenefit[];
  capabilities: FeatureCapability[];
  steps: FeatureStep[];
  faqs: FeatureFAQ[];

  // Related modules
  relatedModules?: { name: string; path: string; icon: LucideIcon; color: string }[];

  // SEO
  frameworks?: string[];        // e.g. ["CSRD/ESRS", "GHG Protocol", "ADEME"]
  appPath: string;              // e.g. "/app/carbon"
}

function FAQItem({ question, answer }: FeatureFAQ) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left group"
      >
        <span className="text-base font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors pr-4">{question}</span>
        <ChevronDown className={`h-5 w-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <p className="pb-5 text-sm text-gray-600 leading-relaxed -mt-1">{answer}</p>
      )}
    </div>
  );
}

export default function FeaturePageLayout({
  icon: Icon, color, colorLight, title, subtitle, description,
  benefits, capabilities, steps, faqs, relatedModules, frameworks, appPath,
}: FeaturePageProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const slug = location.pathname.replace(/^\//, '').replace(/\//g, '-') || 'feature';

  // Map feature paths to OG image slugs
  const ogSlugMap: Record<string, string> = {
    'features/csrd-esrs': 'feature-csrd',
    'features/bilan-carbone': 'feature-carbon',
    'features/supply-chain': 'feature-supply-chain',
    'features/taxonomie-ue': 'feature-taxonomy',
    'features/sfdr-pai': 'feature-sfdr',
    'features/double-materialite': 'feature-materiality',
    'features/plan-decarbonation': 'feature-decarb',
    'features/intelligence-esg': 'feature-intelligence',
  };
  const ogSlug = ogSlugMap[slug] ?? 'default';

  usePageSeo({
    id: `feature-${slug}`,
    title: `${title} — ESG Flow`,
    description: subtitle,
    keywords: `${title}, ESG, ${(frameworks ?? []).join(', ')}, RSE, conformité, plateforme ESG`,
    url: `https://greenconnect.cloud${location.pathname}`,
    ogImage: `https://greenconnect.cloud/og/${ogSlug}.png`,
    ogTitle: title,
    ogDescription: subtitle,
    breadcrumb: [
      { name: 'Accueil', url: 'https://greenconnect.cloud/' },
      { name: 'Fonctionnalités', url: 'https://greenconnect.cloud/features' },
      { name: title, url: `https://greenconnect.cloud${location.pathname}` },
    ],
  });

  return (
    <div className="min-h-screen bg-white">
      {/* ── Navigation ──────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <Leaf className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">ESG Flow</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/demo" className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-emerald-700 transition-colors">
              <Play className="h-4 w-4" />
              {t('features.layout.nav.demo', 'Voir la demo')}
            </Link>
            <Link to="/register" className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
              {t('features.layout.nav.freeTrial', 'Essai gratuit')}
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${color}08 0%, ${color}15 50%, ${colorLight}20 100%)` }} />
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ background: color }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
          <div className="max-w-3xl">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-8">
              <Link to="/" className="hover:text-emerald-600 transition-colors">{t('features.layout.breadcrumb.home', 'Accueil')}</Link>
              <span>/</span>
              <span>{t('features.layout.breadcrumb.features', 'Fonctionnalites')}</span>
              <span>/</span>
              <span className="font-medium" style={{ color }}>{title}</span>
            </div>

            {/* Icon + badge */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: `linear-gradient(135deg, ${color}, ${color}dd)` }}>
                <Icon className="h-7 w-7 text-white" />
              </div>
              {frameworks && frameworks.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {frameworks.map(f => (
                    <span key={f} className="text-xs font-semibold px-3 py-1 rounded-full border" style={{ color, borderColor: `${color}30`, background: `${color}08` }}>
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-4">{title}</h1>
            <p className="text-xl font-medium mb-4" style={{ color }}>{subtitle}</p>
            <p className="text-lg text-gray-600 leading-relaxed mb-10 max-w-2xl">{description}</p>

            <div className="flex flex-wrap gap-4">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-7 py-3.5 text-white font-semibold rounded-xl text-sm shadow-lg hover:-translate-y-0.5 transition-all"
                style={{ background: color }}
              >
                {t('features.layout.hero.ctaStart', 'Commencer gratuitement')}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/demo"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-gray-700 font-semibold rounded-xl text-sm border border-gray-200 hover:border-gray-300 shadow-sm hover:-translate-y-0.5 transition-all"
              >
                <Play className="h-4 w-4" />
                {t('features.layout.hero.ctaDemo', 'Demo interactive')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Benefits ────────────────────────────────────────────────── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">{t('features.layout.benefits.heading', 'Pourquoi choisir ESG Flow ?')}</h2>
            <p className="text-gray-500 max-w-xl mx-auto">{t('features.layout.benefits.subheading', 'Les avantages concrets pour votre organisation')}</p>
          </div>
          <div className={`grid grid-cols-1 md:grid-cols-${benefits.length > 3 ? '4' : '3'} gap-6`}>
            {benefits.map((b, i) => (
              <div key={i} className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ background: `${color}12` }}>
                  <b.icon className="h-6 w-6" style={{ color }} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{b.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{b.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Capabilities ────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div>
              <span className="text-sm font-semibold uppercase tracking-widest" style={{ color }}>{t('features.layout.capabilities.eyebrow', 'Fonctionnalites detaillees')}</span>
              <h2 className="text-3xl font-bold text-gray-900 mt-3 mb-4">{t('features.layout.capabilities.heading', 'Tout ce que vous pouvez faire')}</h2>
              <p className="text-gray-500 mb-8">
                {t('features.layout.capabilities.subheading', 'Chaque fonctionnalite a ete concue pour repondre aux besoins reels des responsables RSE et DAF.')}
              </p>

              <div className="space-y-5">
                {capabilities.map((c, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex-shrink-0 mt-0.5">
                      <CheckCircle className="h-5 w-5" style={{ color }} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 mb-1">{c.title}</h4>
                      <p className="text-sm text-gray-500 leading-relaxed">{c.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing card */}
            <div className="lg:sticky lg:top-24">
              <div className="rounded-2xl border-2 p-8 shadow-lg" style={{ borderColor: `${color}20`, background: `linear-gradient(135deg, white, ${color}05)` }}>
                <div className="text-center mb-6">
                  <p className="text-sm text-gray-500 mb-1">{t('features.layout.pricing.included', 'À partir de')}</p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-extrabold text-gray-900">249</span>
                    <span className="text-lg text-gray-500">&euro;{t('features.layout.pricing.perMonth', '/mois')}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{t('features.layout.pricing.planNote', 'Plan PME — sans engagement, plan gratuit disponible')}</p>
                </div>

                <ul className="space-y-3 mb-8">
                  {[t('features.layout.pricing.feat.0', "Jusqu'à 25 utilisateurs"), t('features.layout.pricing.feat.1', 'Reporting CSRD, DPEF & bilan carbone'), t('features.layout.pricing.feat.2', 'Supply chain, taxonomie UE & SBTi'), t('features.layout.pricing.feat.3', 'Accès API & exports'), t('features.layout.pricing.feat.4', "Piste d'audit SHA-256"), t('features.layout.pricing.feat.5', 'Tous les modules dès le plan ETI (599 €/mois)')].map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm text-gray-700">
                      <CheckCircle className="h-4 w-4 flex-shrink-0" style={{ color }} />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  to="/register"
                  className="block w-full text-center py-3.5 text-white font-semibold rounded-xl text-sm transition-colors"
                  style={{ background: color }}
                >
                  {t('features.layout.pricing.cta', 'Essai gratuit 14 jours')}
                </Link>
                <p className="text-center text-xs text-gray-400 mt-3">{t('features.layout.pricing.noCard', 'Sans carte bancaire')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">{t('features.layout.steps.heading', 'Comment ca marche ?')}</h2>
            <p className="text-gray-500">{t('features.layout.steps.subheading', 'En 3 etapes simples')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5 text-white text-xl font-bold shadow-lg" style={{ background: color }}>
                  {s.step}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────── */}
      {faqs.length > 0 && (
        <section className="py-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">{t('features.layout.faq.heading', 'Questions frequentes')}</h2>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-8">
              {faqs.map((f, i) => (
                <FAQItem key={i} {...f} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Related modules ─────────────────────────────────────────── */}
      {relatedModules && relatedModules.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">{t('features.layout.related.heading', 'Modules complementaires')}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {relatedModules.map((m) => (
                <Link key={m.path} to={m.path} className="flex items-center gap-3 bg-white rounded-xl p-4 border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${m.color}12` }}>
                    <m.icon className="h-5 w-5" style={{ color: m.color }} />
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{m.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Final CTA ───────────────────────────────────────────────── */}
      <section className="py-24 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            {t('features.layout.cta.heading', 'Pret a simplifier votre conformite ESG ?')}
          </h2>
          <p className="text-lg text-white/80 mb-10">
            {t('features.layout.cta.subheading', 'Rejoignez plus de 500 entreprises qui utilisent ESG Flow pour piloter leur strategie ESG.')}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white font-bold rounded-xl text-sm shadow-xl hover:-translate-y-0.5 transition-all"
              style={{ color }}
            >
              {t('features.layout.cta.start', "Demarrer l'essai gratuit")}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/demo"
              className="inline-flex items-center gap-2 px-8 py-4 border-2 border-white/30 text-white font-bold rounded-xl text-sm hover:bg-white/10 transition-all"
            >
              <Play className="h-4 w-4" />
              Demo interactive
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="py-10 bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Leaf className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-white">ESG Flow</span>
          </div>
          <div className="flex flex-wrap gap-6 text-xs">
            <Link to="/" className="hover:text-white transition-colors">{t('features.layout.footer.home', 'Accueil')}</Link>
            <Link to="/demo" className="hover:text-white transition-colors">{t('features.layout.footer.demo', 'Demo')}</Link>
            <Link to="/register" className="hover:text-white transition-colors">{t('features.layout.footer.freeTrial', 'Essai gratuit')}</Link>
            <Link to="/security" className="hover:text-white transition-colors">{t('features.layout.footer.security', 'Securite')}</Link>
            <Link to="/privacy-policy" className="hover:text-white transition-colors">{t('features.layout.footer.privacy', 'Confidentialite')}</Link>
            <Link to="/legal-notice" className="hover:text-white transition-colors">{t('features.layout.footer.legal', 'Mentions legales')}</Link>
          </div>
          <p className="text-xs">&copy; {new Date().getFullYear()} GreenConnect SAS</p>
        </div>
      </footer>
    </div>
  );
}
