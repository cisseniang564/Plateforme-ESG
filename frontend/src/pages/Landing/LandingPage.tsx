import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight, Check, ChevronDown, Leaf, Menu, X, ShieldCheck, Brain, Factory,
  FileCheck, Network, Scale, Upload, Calculator, FileText, Lock, Server, History,
} from 'lucide-react';
import { usePageSeo } from '@/hooks/usePageSeo';
import LanguageSelector from '@/components/LanguageSelector';
import { PILLAR_COLORS } from '@/styles/tokens';

// ─── Petits utilitaires ──────────────────────────────────────────────────────

/** Fait apparaître le bloc en douceur quand il entre à l'écran (respecte « réduire les animations »). */
function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setSeen(true); return; }
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); obs.disconnect(); } }, { threshold: 0.12 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`motion-safe:transition-all motion-safe:duration-700 ${seen ? 'opacity-100 translate-y-0' : 'opacity-0 motion-safe:translate-y-4'} ${className}`}
    >
      {children}
    </div>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-sm font-semibold tracking-wide text-emerald-700 mb-3">{children}</p>;
}

const BTN_PRIMARY =
  'inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600';
const BTN_SECONDARY =
  'inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400';

// ─── Aperçu du produit (dessiné en CSS : léger, net sur tous les écrans) ──────

function ProductPreview() {
  const bars = [38, 52, 44, 61, 57, 72, 66, 81];
  return (
    <div aria-hidden="true" className="relative mx-auto max-w-5xl">
      <div className="absolute -inset-x-8 -top-10 h-72 rounded-full bg-emerald-300/30 blur-3xl" />
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
        <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" /><span className="h-2.5 w-2.5 rounded-full bg-slate-300" /><span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="ml-3 rounded-md bg-white px-3 py-0.5 text-[11px] text-slate-400 ring-1 ring-slate-200">greenconnect.cloud/app</span>
        </div>
        <div className="grid grid-cols-12 gap-5 p-5 sm:p-7 text-left">
          <div className="col-span-12 grid grid-cols-3 gap-3 sm:gap-4">
            {[
              { label: 'Score ESG', value: '78', note: '+6 sur 12 mois', color: PILLAR_COLORS.environmental.main },
              { label: 'Émissions totales', value: '−12 %', note: 'vs. année de référence', color: PILLAR_COLORS.social.main },
              { label: 'Conformité CSRD', value: '64 %', note: '82 exigences ESRS', color: PILLAR_COLORS.governance.main },
            ].map(k => (
              <div key={k.label} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 sm:p-4">
                <p className="text-[11px] sm:text-xs text-slate-500">{k.label}</p>
                <p className="mt-1 text-xl sm:text-3xl font-semibold tracking-tight" style={{ color: k.color }}>{k.value}</p>
                <p className="mt-0.5 text-[10px] sm:text-xs text-slate-400">{k.note}</p>
              </div>
            ))}
          </div>
          <div className="col-span-12 md:col-span-7 rounded-xl border border-slate-100 p-4">
            <p className="text-xs font-medium text-slate-600">Trajectoire d'émissions (tCO₂e)</p>
            <div className="mt-4 flex h-32 items-end gap-2">
              {bars.map((h, i) => (
                <div key={i} className="flex-1 rounded-t-md" style={{ height: `${h}%`, background: i === bars.length - 1 ? PILLAR_COLORS.environmental.main : '#d1fae5' }} />
              ))}
            </div>
          </div>
          <div className="col-span-12 md:col-span-5 rounded-xl border border-slate-100 p-4 space-y-3.5">
            <p className="text-xs font-medium text-slate-600">Piliers ESG</p>
            {[
              { n: 'Environnement', v: 82, c: PILLAR_COLORS.environmental.main },
              { n: 'Social', v: 71, c: PILLAR_COLORS.social.main },
              { n: 'Gouvernance', v: 76, c: PILLAR_COLORS.governance.main },
            ].map(p => (
              <div key={p.n}>
                <div className="flex justify-between text-[11px] text-slate-500"><span>{p.n}</span><span>{p.v}</span></div>
                <div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full" style={{ width: `${p.v}%`, background: p.c }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-slate-400">Aperçu illustratif · données d'exemple</p>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

const STANDARDS = ['CSRD / ESRS', 'GRI', 'SFDR', 'Taxonomie UE', 'GHG Protocol', 'TCFD', 'ISSB', 'CDP'];

const FEATURES = [
  { icon: Factory, title: 'Bilan carbone Scope 1, 2 et 3', desc: 'Import de votre FEC (Sage, Cegid, Pennylane), facteurs d\'émission ADEME, trajectoire et plan de décarbonation.', wide: true },
  { icon: FileCheck, title: 'Reporting CSRD / ESRS', desc: 'Analyse des écarts sur les exigences ESRS et export au format attendu par les auditeurs.' },
  { icon: Scale, title: 'Double matérialité', desc: 'Évaluez vos impacts, risques et opportunités avec vos parties prenantes.' },
  { icon: Network, title: 'Supply chain & vigilance', desc: 'Questionnaires fournisseurs, due diligence et suivi de votre plan de vigilance.', wide: true },
  { icon: Brain, title: 'IA pour vos rapports', desc: 'Brouillons de narratifs et recommandations, toujours relus et validés par vous.' },
  { icon: ShieldCheck, title: 'Piste d\'audit', desc: 'Chaque saisie est validée, horodatée et tracée avec une empreinte SHA-256.' },
];

const STEPS = [
  { icon: Upload, title: 'Connectez vos données', desc: 'Excel, CSV, FEC ou connecteurs ERP. Vos indicateurs sont rapprochés automatiquement.' },
  { icon: Calculator, title: 'Calculez et pilotez', desc: 'Émissions, scores ESG et écarts de conformité se mettent à jour au fil des saisies.' },
  { icon: FileText, title: 'Publiez en confiance', desc: 'Générez vos rapports, faites valider chaque donnée et partagez-les avec vos auditeurs.' },
];

const PLANS = [
  { name: 'PME', desc: 'PME soumises à la CSRD ou à des demandes clients', monthly: 249, annual: 212, cta: 'Essai gratuit 14 jours', featured: false,
    features: ['25 utilisateurs · 50 organisations', 'CSRD / ESRS complet', 'Bilan carbone Scope 1/2/3', 'Import FEC', 'Taxonomie UE & DPEF', 'Support email 5j/7'] },
  { name: 'ETI', desc: 'ETI en transformation ESG', monthly: 599, annual: 509, cta: 'Essai gratuit 14 jours', featured: true,
    features: ['100 utilisateurs · 250 organisations', 'Tout PME inclus', 'IA narrative & recommandations', 'Connecteurs ERP avancés', 'SFDR & multi-réglementaire', 'Support prioritaire 7j/7'] },
  { name: 'Groupe', desc: 'Grands groupes et reporting consolidé', monthly: 1199, annual: 1019, cta: 'Démarrer maintenant', featured: false,
    features: ['500 utilisateurs · organisations illimitées', 'Tout ETI inclus', 'SSO / SAML', 'Marque blanche', 'Consolidation multi-entités', 'Account manager dédié'] },
];

const FAQS = [
  { q: 'Combien de temps pour déployer la plateforme ?', a: 'La mise en service prend 2 à 3 jours ouvrés. Nos équipes assurent l\'onboarding, la configuration des indicateurs et la formation de vos équipes.' },
  { q: 'La plateforme est-elle vraiment conforme CSRD ?', a: 'ESGFlow couvre les standards ESRS principaux (E1-E5, S1-S4, G1) et génère le format iXBRL/ESEF exigé par l\'ESMA. Notre journal d\'audit détaillé avec empreintes SHA-256 et export pour auditeurs facilite vos revues internes et externes.' },
  { q: 'Peut-on importer nos données depuis Excel ou un ERP ?', a: 'Oui. La plateforme accepte les imports CSV/Excel et propose des connecteurs vers les principaux ERP (SAP, Oracle, Sage). Notre API RESTful permet des intégrations sur mesure.' },
  { q: 'Où sont hébergées les données ?', a: 'Toutes les données sont hébergées en France, dans des datacenters certifiés ISO 27001. Nous n\'utilisons aucun cloud américain. La conformité RGPD est garantie contractuellement.' },
  { q: 'Que couvre le module Supply Chain ESG ?', a: 'Le module couvre l\'évaluation des fournisseurs sur 6 dimensions ESG, l\'envoi de questionnaires automatisés, la gestion de la due diligence et le suivi du plan de vigilance conformément à la Loi 2017-399.' },
  { q: 'Y a-t-il un engagement de durée ?', a: 'Non. Les plans PME, ETI et Groupe sont sans engagement, résiliables à tout moment. Les contrats annuels bénéficient de 15 % de réduction.' },
];

export default function LandingPage() {
  const { t } = useTranslation();
  const T = (key: string, fallback: string) => t(`landing.v2.${key}`, fallback) as string;
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [annual, setAnnual] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 8);
    h();
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  usePageSeo({
    id: 'landing',
    title: 'ESG Flow — Plateforme ESG tout-en-un pour la conformité CSRD, Taxonomie UE & Bilan Carbone',
    description: 'ESG Flow centralise votre conformité ESG en une seule plateforme : CSRD, Taxonomie UE, SFDR, SBTi, Bilan Carbone, Vigilance. Essai gratuit 14 jours.',
    keywords: 'ESG, CSRD, Taxonomie UE, SFDR, SBTi, bilan carbone, RSE, conformité ESG, plateforme ESG, reporting durabilité, ESRS, GHG Protocol, ADEME, devoir de vigilance, CSDDD',
    url: 'https://greenconnect.cloud/',
    ogImage: 'https://greenconnect.cloud/og/landing.png',
    ogTitle: 'ESG Flow — Conformité ESG simplifiée',
    ogDescription: 'CSRD, Taxonomie UE, SFDR, Bilan Carbone, SBTi : toute votre conformité ESG dans une seule plateforme. Essai gratuit.',
    faqJsonLd: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQS.slice(0, 5).map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
  });

  const go = (id: string) => { setMenuOpen(false); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  const navLinks = [
    { id: 'fonctionnalites', label: T('nav.features', 'Fonctionnalités') },
    { id: 'methode', label: T('nav.how', 'Comment ça marche') },
    { id: 'tarifs', label: T('nav.pricing', 'Tarifs') },
    { id: 'faq', label: T('nav.faq', 'FAQ') },
  ];

  return (
    <div
      className="min-h-screen bg-white font-sans text-slate-600 antialiased selection:bg-emerald-100"
      style={{ colorScheme: 'light', ['--heading-color' as string]: '#0b1f17' }}
    >
      {/* ── Navigation ── */}
      <header className={`fixed inset-x-0 top-0 z-50 transition-all ${scrolled || menuOpen ? 'border-b border-slate-200/70 bg-white/85 backdrop-blur-xl' : 'bg-transparent'}`}>
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5" aria-label="Navigation principale">
          <Link to="/" className="flex items-center gap-2 font-semibold text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white"><Leaf className="h-4 w-4" /></span>
            ESGFlow
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map(l => (
              <button key={l.id} type="button" onClick={() => go(l.id)} className="text-sm text-slate-600 transition hover:text-slate-900">{l.label}</button>
            ))}
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <LanguageSelector />
            <Link to="/login" className="px-2 text-sm font-medium text-slate-700 hover:text-slate-900">{T('nav.login', 'Connexion')}</Link>
            <Link to="/register" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">{T('nav.cta', 'Essai gratuit')}</Link>
          </div>
          <button type="button" className="rounded-lg p-2 text-slate-700 md:hidden" aria-label="Menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(o => !o)}>
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>
        {menuOpen && (
          <div className="border-t border-slate-100 px-5 pb-5 pt-2 md:hidden">
            {navLinks.map(l => (
              <button key={l.id} type="button" onClick={() => go(l.id)} className="block w-full py-3 text-left text-base text-slate-700">{l.label}</button>
            ))}
            <div className="mt-3 flex gap-3">
              <Link to="/login" className={`${BTN_SECONDARY} flex-1`}>{T('nav.login', 'Connexion')}</Link>
              <Link to="/register" className={`${BTN_PRIMARY} flex-1`}>{T('nav.cta', 'Essai gratuit')}</Link>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* ── Hero ── */}
        <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50/70 via-white to-white px-5 pb-20 pt-32 text-center sm:pt-40">
          <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.05)_1px,transparent_0)] [background-size:28px_28px] [mask-image:linear-gradient(to_bottom,black,transparent_75%)]" />
          <div className="relative mx-auto max-w-3xl">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3.5 py-1.5 text-xs font-medium text-emerald-800">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {T('hero.badge', 'CSRD · Bilan carbone · Supply chain')}
              </span>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-slate-900 sm:text-6xl sm:leading-[1.05]">
                {T('hero.title', 'Pilotez votre performance ESG, sans la complexité.')}
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-slate-600">
                {T('hero.subtitle', 'De la collecte des données à la publication de votre rapport CSRD, ESGFlow réunit carbone, conformité et reporting dans une seule plateforme.')}
              </p>
            </Reveal>
            <Reveal delay={240}>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link to="/register" className={BTN_PRIMARY}>{T('hero.cta1', 'Essai gratuit 14 jours')} <ArrowRight className="h-4 w-4" /></Link>
                <Link to="/demo" className={BTN_SECONDARY}>{T('hero.cta2', 'Voir la démo')}</Link>
              </div>
              <p className="mt-4 text-xs text-slate-500">{T('hero.note', 'Sans carte bancaire · Sans engagement · Conforme RGPD')}</p>
            </Reveal>
          </div>
          <Reveal delay={320} className="relative mt-16">
            <ProductPreview />
          </Reveal>
        </section>

        {/* ── Référentiels ── */}
        <section className="border-y border-slate-100 bg-white px-5 py-10" aria-label="Référentiels couverts">
          <p className="text-center text-xs font-medium uppercase tracking-widest text-slate-400">{T('standards.title', 'Référentiels et normes couverts')}</p>
          <ul className="mx-auto mt-5 flex max-w-4xl flex-wrap items-center justify-center gap-x-3 gap-y-3">
            {STANDARDS.map(s => (
              <li key={s} className="rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-sm font-medium text-slate-700">{s}</li>
            ))}
          </ul>
        </section>

        {/* ── Fonctionnalités ── */}
        <section id="fonctionnalites" className="scroll-mt-20 px-5 py-24">
          <div className="mx-auto max-w-6xl">
            <Reveal className="mx-auto max-w-2xl text-center">
              <Eyebrow>{T('features.eyebrow', 'Fonctionnalités')}</Eyebrow>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{T('features.title', 'Tout ce qu\'il faut pour une démarche ESG crédible')}</h2>
              <p className="mt-4 text-lg text-slate-600">{T('features.subtitle', 'Des outils pensés pour les équipes RSE, finance et conformité.')}</p>
            </Reveal>
            <div className="mt-14 grid gap-4 md:grid-cols-3">
              {FEATURES.map((f, i) => (
                <Reveal key={f.title} delay={i * 60} className={f.wide ? 'md:col-span-2' : ''}>
                  <article className="group h-full rounded-2xl border border-slate-200 bg-white p-7 transition hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-900/5">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 transition group-hover:bg-emerald-600 group-hover:text-white">
                      <f.icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-5 text-lg font-semibold text-slate-900">{T(`features.items.${i}.title`, f.title)}</h3>
                    <p className="mt-2 leading-relaxed text-slate-600">{T(`features.items.${i}.desc`, f.desc)}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Méthode ── */}
        <section id="methode" className="scroll-mt-20 bg-slate-50 px-5 py-24">
          <div className="mx-auto max-w-6xl">
            <Reveal className="mx-auto max-w-2xl text-center">
              <Eyebrow>{T('how.eyebrow', 'Comment ça marche')}</Eyebrow>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{T('how.title', 'Opérationnel en quelques jours')}</h2>
            </Reveal>
            <ol className="mt-14 grid gap-6 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <Reveal key={s.title} delay={i * 80}>
                  <li className="relative h-full list-none rounded-2xl bg-white p-7 ring-1 ring-slate-200">
                    <span className="text-sm font-semibold text-emerald-700">0{i + 1}</span>
                    <s.icon className="mt-4 h-6 w-6 text-slate-900" />
                    <h3 className="mt-4 text-lg font-semibold text-slate-900">{T(`how.steps.${i}.title`, s.title)}</h3>
                    <p className="mt-2 leading-relaxed text-slate-600">{T(`how.steps.${i}.desc`, s.desc)}</p>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Confiance ── */}
        <section className="px-5 py-24">
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
            <Reveal>
              <Eyebrow>{T('trust.eyebrow', 'Sécurité et conformité')}</Eyebrow>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{T('trust.title', 'Des données ESG que vos auditeurs peuvent vérifier')}</h2>
              <p className="mt-4 text-lg leading-relaxed text-slate-600">{T('trust.subtitle', 'Chaque chiffre publié reste traçable jusqu\'à sa source, et vos données restent isolées de celles des autres clients.')}</p>
            </Reveal>
            <Reveal delay={100}>
              <ul className="grid gap-4 sm:grid-cols-2">
                {[
                  { icon: History, t: 'Traçabilité complète', d: 'Journal d\'audit horodaté avec empreinte SHA-256.' },
                  { icon: Lock, t: 'Accès contrôlés', d: 'Rôles, double authentification et SSO / SAML (plan Groupe).' },
                  { icon: Server, t: 'Données protégées', d: 'Chiffrement et conformité RGPD, hébergement en Europe.' },
                  { icon: ShieldCheck, t: 'Workflow de validation', d: 'Brouillon, révision, approbation : chaque saisie est relue.' },
                ].map((x, i) => (
                  <li key={x.t} className="rounded-2xl border border-slate-200 p-5">
                    <x.icon className="h-5 w-5 text-emerald-700" />
                    <p className="mt-3 font-semibold text-slate-900">{T(`trust.items.${i}.title`, x.t)}</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">{T(`trust.items.${i}.desc`, x.d)}</p>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        {/* ── Tarifs ── */}
        <section id="tarifs" className="scroll-mt-20 bg-slate-50 px-5 py-24">
          <div className="mx-auto max-w-6xl">
            <Reveal className="mx-auto max-w-2xl text-center">
              <Eyebrow>{T('pricing.eyebrow', 'Tarifs')}</Eyebrow>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{T('pricing.title', 'Des tarifs simples, sans engagement')}</h2>
              <div className="mt-8 inline-flex rounded-full bg-white p-1 ring-1 ring-slate-200" role="group" aria-label="Période de facturation">
                {[false, true].map(a => (
                  <button key={String(a)} type="button" aria-pressed={annual === a} onClick={() => setAnnual(a)}
                    className={`rounded-full px-5 py-2 text-sm font-medium transition ${annual === a ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}>
                    {a ? T('pricing.annual', 'Annuel (−15 %)') : T('pricing.monthly', 'Mensuel')}
                  </button>
                ))}
              </div>
            </Reveal>
            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              {PLANS.map((p, i) => (
                <Reveal key={p.name} delay={i * 80}>
                  <article className={`relative flex h-full flex-col rounded-2xl bg-white p-8 ${p.featured ? 'ring-2 ring-emerald-600 shadow-xl shadow-emerald-900/10' : 'ring-1 ring-slate-200'}`}>
                    {p.featured && <span className="absolute -top-3 left-8 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">{T('pricing.popular', 'Le plus choisi')}</span>}
                    <h3 className="text-lg font-semibold text-slate-900">{p.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{p.desc}</p>
                    <p className="mt-6 flex items-baseline gap-1">
                      <span className="text-4xl font-semibold tracking-tight text-slate-900">{annual ? p.annual : p.monthly} €</span>
                      <span className="text-sm text-slate-500">{T('pricing.perMonth', '/ mois HT')}</span>
                    </p>
                    <ul className="mt-6 flex-1 space-y-3">
                      {p.features.map(f => (
                        <li key={f} className="flex gap-3 text-sm text-slate-700"><Check className="mt-0.5 h-4 w-4 flex-none text-emerald-600" />{f}</li>
                      ))}
                    </ul>
                    <Link to="/register" className={`${p.featured ? BTN_PRIMARY : BTN_SECONDARY} mt-8`}>{p.cta}</Link>
                  </article>
                </Reveal>
              ))}
            </div>
            <p className="mt-8 text-center text-sm text-slate-500">
              {T('pricing.custom', 'Besoin d\'un cadrage sur mesure ?')}{' '}
              <Link to="/contact" className="font-medium text-emerald-700 underline-offset-4 hover:underline">{T('pricing.contact', 'Parlons-en')}</Link>
            </p>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="scroll-mt-20 px-5 py-24">
          <div className="mx-auto max-w-3xl">
            <Reveal className="text-center">
              <Eyebrow>FAQ</Eyebrow>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{T('faq.title', 'Questions fréquentes')}</h2>
            </Reveal>
            <div className="mt-10 divide-y divide-slate-200 border-y border-slate-200">
              {FAQS.map((f, i) => {
                const open = openFaq === i;
                return (
                  <div key={f.q}>
                    <h3>
                      <button type="button" aria-expanded={open} aria-controls={`faq-${i}`} onClick={() => setOpenFaq(open ? null : i)}
                        className="flex w-full items-center justify-between gap-4 py-5 text-left text-base font-medium text-slate-900">
                        {T(`faq.items.${i}.q`, f.q)}
                        <ChevronDown className={`h-5 w-5 flex-none text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                      </button>
                    </h3>
                    <div id={`faq-${i}`} hidden={!open} className="pb-5 leading-relaxed text-slate-600">{T(`faq.items.${i}.a`, f.a)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── CTA final ── */}
        <section className="px-5 pb-24">
          <Reveal>
            <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-slate-900 px-8 py-16 text-center sm:px-16">
              <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-emerald-500/30 blur-3xl" />
              <h2 className="relative text-3xl font-semibold tracking-tight !text-white sm:text-4xl">{T('cta.title', 'Prêt à structurer votre démarche ESG ?')}</h2>
              <p className="relative mx-auto mt-4 max-w-xl text-lg text-slate-300">{T('cta.subtitle', 'Démarrez votre essai de 14 jours ou découvrez la plateforme avec la démo interactive.')}</p>
              <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link to="/register" className={BTN_PRIMARY}>{T('hero.cta1', 'Essai gratuit 14 jours')} <ArrowRight className="h-4 w-4" /></Link>
                <Link to="/demo" className="inline-flex items-center justify-center rounded-full border border-white/25 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">{T('hero.cta2', 'Voir la démo')}</Link>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      {/* ── Pied de page ── */}
      <footer className="border-t border-slate-200 bg-slate-50 px-5 py-14">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 font-semibold text-slate-900">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white"><Leaf className="h-4 w-4" /></span>ESGFlow
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-500">{T('footer.tagline', 'La plateforme ESG pour piloter votre conformité CSRD et votre empreinte carbone.')}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{T('footer.product', 'Produit')}</p>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-500">
              <li><button type="button" onClick={() => go('fonctionnalites')} className="hover:text-slate-900">{T('nav.features', 'Fonctionnalités')}</button></li>
              <li><button type="button" onClick={() => go('tarifs')} className="hover:text-slate-900">{T('nav.pricing', 'Tarifs')}</button></li>
              <li><Link to="/demo" className="hover:text-slate-900">{T('hero.cta2', 'Voir la démo')}</Link></li>
              <li><Link to="/normes" className="hover:text-slate-900">{T('footer.standards', 'Normes')}</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{T('footer.help', 'Aide')}</p>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-500">
              <li><Link to="/resources" className="hover:text-slate-900">{T('footer.resources', 'Ressources')}</Link></li>
              <li><Link to="/help" className="hover:text-slate-900">{T('footer.helpCenter', 'Centre d\'aide')}</Link></li>
              <li><Link to="/contact" className="hover:text-slate-900">Contact</Link></li>
              <li><Link to="/login" className="hover:text-slate-900">{T('nav.login', 'Connexion')}</Link></li>
            </ul>
          </div>
        </div>
        <div className="mx-auto mt-12 flex max-w-6xl flex-col items-center justify-between gap-3 border-t border-slate-200 pt-6 text-xs text-slate-500 sm:flex-row">
          <p>© {new Date().getFullYear()} ESGFlow. {T('footer.rights', 'Tous droits réservés.')}</p>
          <div className="flex gap-5">
            <Link to="/legal-notice" className="hover:text-slate-900">{T('footer.legal', 'Mentions légales')}</Link>
            <Link to="/privacy-policy" className="hover:text-slate-900">{T('footer.privacy', 'Confidentialité')}</Link>
            <Link to="/terms-of-service" className="hover:text-slate-900">{T('footer.terms', 'CGU')}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
