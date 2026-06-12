/**
 * Page Roadmap publique — /roadmap
 * Donne aux prospects (et DSI) une vision claire de ce qui arrive,
 * en cours et déjà livré. Signal de transparence fort.
 */
import { Link } from 'react-router-dom';
import {
  CheckCircle2, Clock, Sparkles, ArrowRight, Flag, MessageCircle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { LogoBrand } from '@/components/common/Logo';
import { usePageSeo } from '@/hooks/usePageSeo';

type ItemStatus = 'shipped' | 'in_progress' | 'planned' | 'considering';

interface RoadmapItem {
  title: string;
  desc: string;
  quarter: string;
  category: 'core' | 'integrations' | 'reports' | 'ux' | 'security' | 'ai';
  status: ItemStatus;
}

const getItems = (t: TFunction): RoadmapItem[] => [
  // ✅ Shipped
  { title: t('resources.roadmap.items.0.title', '12 modules ESRS complets'),                desc: t('resources.roadmap.items.0.desc', 'E1-E5 / S1-S4 / G1 / ESRS 2 — tous les indicateurs préremplis.'), quarter: 'Q1 2026', category: 'core',         status: 'shipped' },
  { title: t('resources.roadmap.items.1.title', 'Bilan carbone GHG Protocol'),              desc: t('resources.roadmap.items.1.desc', 'Scopes 1, 2, 3 avec facteurs ADEME Base Carbone® 2024.'),          quarter: 'Q1 2026', category: 'reports',      status: 'shipped' },
  { title: t('resources.roadmap.items.2.title', 'Génération rapport CSRD PDF'),             desc: t('resources.roadmap.items.2.desc', 'Export PDF brandé + audit trail SHA-256.'),                        quarter: 'Q1 2026', category: 'reports',      status: 'shipped' },
  { title: t('resources.roadmap.items.3.title', 'Matrice de double matérialité'),           desc: t('resources.roadmap.items.3.desc', 'Cartographie enjeux + parties prenantes selon EFRAG.'),            quarter: 'Q1 2026', category: 'core',         status: 'shipped' },
  { title: t('resources.roadmap.items.4.title', 'Connecteur Enedis'),                       desc: t('resources.roadmap.items.4.desc', 'Import automatique consommation électrique par site.'),            quarter: 'Q2 2026', category: 'integrations', status: 'shipped' },
  { title: t('resources.roadmap.items.5.title', 'Import FEC pour Scope 3 spend-based'),     desc: t('resources.roadmap.items.5.desc', 'Calcul automatique scope 3 à partir de votre comptabilité.'),      quarter: 'Q2 2026', category: 'integrations', status: 'shipped' },
  { title: t('resources.roadmap.items.6.title', 'IA narrative (rédaction sections)'),       desc: t('resources.roadmap.items.6.desc', 'Génération assistée des sections qualitatives ESRS.'),             quarter: 'Q2 2026', category: 'ai',           status: 'shipped' },
  { title: t('resources.roadmap.items.7.title', 'Page Statut publique'),                    desc: t('resources.roadmap.items.7.desc', 'Monitoring temps réel API/DB/Redis avec SLA visible.'),            quarter: 'Q2 2026', category: 'security',     status: 'shipped' },
  { title: t('resources.roadmap.items.8.title', 'RLS PostgreSQL multi-tenant'),             desc: t('resources.roadmap.items.8.desc', 'Isolation cross-tenant verrouillée au niveau base.'),              quarter: 'Q2 2026', category: 'security',     status: 'shipped' },

  // 🟠 In progress
  { title: t('resources.roadmap.items.9.title', 'Connecteur Pennylane'),                    desc: t('resources.roadmap.items.9.desc', 'Import direct des FEC depuis Pennylane (alpha).'),                 quarter: 'Q3 2026', category: 'integrations', status: 'in_progress' },
  { title: t('resources.roadmap.items.10.title', 'iXBRL / ESEF certifié EFRAG'),            desc: t('resources.roadmap.items.10.desc', 'Tagging XBRL des 12 ESRS pour dépôt AMF.'),                        quarter: 'Q3 2026', category: 'reports',      status: 'in_progress' },
  { title: t('resources.roadmap.items.11.title', 'Anglais natif'),                          desc: t('resources.roadmap.items.11.desc', 'Interface + rapports en anglais pour filiales/clients UE.'),       quarter: 'Q3 2026', category: 'ux',           status: 'in_progress' },
  { title: t('resources.roadmap.items.12.title', 'SOC 2 Type I'),                           desc: t('resources.roadmap.items.12.desc', 'Audit en cours, livraison prévue T3.'),                            quarter: 'Q3 2026', category: 'security',     status: 'in_progress' },

  // 🔵 Planned
  { title: t('resources.roadmap.items.13.title', 'Connecteur Qonto'),                       desc: t('resources.roadmap.items.13.desc', 'Banque pro Qonto → catégorisation Scope 3.'),                      quarter: 'Q4 2026', category: 'integrations', status: 'planned' },
  { title: t('resources.roadmap.items.14.title', 'Connecteur Cegid Loop'),                  desc: t('resources.roadmap.items.14.desc', 'Comptabilité Cegid Loop / Cegid Quadra.'),                         quarter: 'Q4 2026', category: 'integrations', status: 'planned' },
  { title: t('resources.roadmap.items.15.title', 'Scénarios climat (TCFD avancé)'),         desc: t('resources.roadmap.items.15.desc', 'Modélisation IPCC RCP 2.6 / 4.5 / 8.5 sur 30 ans.'),               quarter: 'Q4 2026', category: 'reports',      status: 'planned' },
  { title: t('resources.roadmap.items.16.title', 'CSDDD — module supply chain due diligence'), desc: t('resources.roadmap.items.16.desc', "Audits fournisseurs, suivi plans d'action."),                   quarter: 'Q4 2026', category: 'core',         status: 'planned' },
  { title: t('resources.roadmap.items.17.title', 'Marque blanche (white-label)'),           desc: t('resources.roadmap.items.17.desc', 'Personnalisation logo, domaine, couleurs (plan Groupe).'),         quarter: 'Q4 2026', category: 'ux',           status: 'planned' },
  { title: t('resources.roadmap.items.18.title', 'SSO SAML 2.0'),                           desc: t('resources.roadmap.items.18.desc', 'Azure AD, Okta, Google Workspace (plan Groupe).'),                 quarter: 'Q4 2026', category: 'security',     status: 'planned' },

  // 💭 Considering
  { title: t('resources.roadmap.items.19.title', 'Mobile app iOS / Android'),               desc: t('resources.roadmap.items.19.desc', 'Consultation rapports + saisie indicateurs terrain.'),             quarter: '2027',    category: 'ux',           status: 'considering' },
  { title: t('resources.roadmap.items.20.title', 'SOC 2 Type II'),                          desc: t('resources.roadmap.items.20.desc', 'Maintien continu sur 12 mois après Type I.'),                      quarter: '2027',    category: 'security',     status: 'considering' },
  { title: t('resources.roadmap.items.21.title', 'Marketplace de modules sectoriels'),      desc: t('resources.roadmap.items.21.desc', 'Modules verticaux : agro, BTP, finance, transport.'),              quarter: '2027',    category: 'core',         status: 'considering' },
  { title: t('resources.roadmap.items.22.title', 'Intégration Climatiq (DB facteurs)'),     desc: t('resources.roadmap.items.22.desc', "Base de 200 000+ facteurs d'émission internationaux."),           quarter: '2027',    category: 'integrations', status: 'considering' },
];

const getStatusMeta = (t: TFunction): Record<ItemStatus, { label: string; chip: string; icon: typeof CheckCircle2; order: number }> => ({
  shipped:      { label: t('resources.roadmap.status.shipped', 'Livré'),          chip: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2, order: 0 },
  in_progress:  { label: t('resources.roadmap.status.in_progress', 'En cours'),   chip: 'bg-blue-100 text-blue-700',       icon: Clock,        order: 1 },
  planned:      { label: t('resources.roadmap.status.planned', 'Planifié'),       chip: 'bg-amber-100 text-amber-700',     icon: Flag,         order: 2 },
  considering:  { label: t('resources.roadmap.status.considering', "À l'étude"),  chip: 'bg-gray-100 text-gray-600',       icon: Sparkles,     order: 3 },
});

const getCategoryMeta = (t: TFunction): Record<RoadmapItem['category'], { label: string; color: string }> => ({
  core:         { label: t('resources.roadmap.category.core', 'Conformité ESRS'),  color: 'text-emerald-600' },
  integrations: { label: t('resources.roadmap.category.integrations', 'Connecteurs'), color: 'text-blue-600' },
  reports:      { label: t('resources.roadmap.category.reports', 'Rapports'),       color: 'text-violet-600' },
  ux:           { label: t('resources.roadmap.category.ux', 'Expérience'),          color: 'text-amber-600' },
  security:     { label: t('resources.roadmap.category.security', 'Sécurité'),      color: 'text-red-600' },
  ai:           { label: t('resources.roadmap.category.ai', 'IA'),                  color: 'text-pink-600' },
});

export default function RoadmapPage() {
  const { t } = useTranslation();
  const ITEMS = getItems(t);
  const STATUS_META = getStatusMeta(t);
  const CATEGORY_META = getCategoryMeta(t);

  const url = 'https://greenconnect.cloud/roadmap';
  const img = 'https://greenconnect.cloud/api/v1/og/roadmap.png';

  usePageSeo({
    id: 'roadmap',
    title: t('resources.roadmap.seo.title', 'Roadmap publique — ESG Flow'),
    description: t('resources.roadmap.seo.description', "Découvrez la roadmap produit ESG Flow : ce qui est livré, en cours et prévu. Transparence totale sur notre direction CSRD/ESG."),
    keywords: t('resources.roadmap.seo.keywords', 'roadmap ESG Flow, produit, fonctionnalités, planning, CSRD, transparence'),
    url,
    ogTitle: t('resources.roadmap.seo.ogTitle', 'Roadmap publique ESG Flow'),
    ogImage: img,
    ogImageAlt: t('resources.roadmap.seo.ogImageAlt', 'Roadmap publique ESG Flow — livré, en cours, planifié'),
    breadcrumb: [
      { name: t('resources.roadmap.breadcrumb.home', 'Accueil'),    url: 'https://greenconnect.cloud/' },
      { name: t('resources.roadmap.breadcrumb.company', 'Entreprise'), url: 'https://greenconnect.cloud/' },
      { name: t('resources.roadmap.breadcrumb.roadmap', 'Roadmap'),    url },
    ],
  });

  // Group by status
  const grouped: Record<ItemStatus, RoadmapItem[]> = {
    shipped: [], in_progress: [], planned: [], considering: [],
  };
  ITEMS.forEach(i => { grouped[i.status].push(i); });

  const orderedStatuses: ItemStatus[] = ['in_progress', 'planned', 'considering', 'shipped'];

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white/95 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" aria-label={t('resources.roadmap.nav.homeAria', 'ESG Flow — Accueil')}>
            <LogoBrand size="sm" variant="dark" showTagline={false} />
          </Link>
          <Link to="/register" className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">
            {t('resources.roadmap.nav.freeTrial', 'Essai gratuit')} →
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 bg-gradient-to-br from-emerald-50 via-white to-blue-50 border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold mb-6">
            <Flag className="h-3.5 w-3.5" /> {t('resources.roadmap.hero.badge', 'ROADMAP PUBLIQUE · MISE À JOUR MENSUELLE')}
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-6">
            {t('resources.roadmap.hero.titleLine1', 'Ce que nous construisons')}<br />
            <span className="text-emerald-600">{t('resources.roadmap.hero.titleLine2', 'en toute transparence')}</span>
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
            {t('resources.roadmap.hero.subtitle', 'Une vision claire de notre direction produit : ce qui est livré, ce qui arrive, et ce que nous explorons. Toute suggestion bienvenue sur ')}
            <a href="mailto:roadmap@greenconnect.cloud" className="text-emerald-600 hover:underline">roadmap@greenconnect.cloud</a>.
          </p>
        </div>
      </section>

      {/* Counts */}
      <section className="py-10 border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-4 gap-4 text-center">
          {orderedStatuses.map(s => {
            const meta = STATUS_META[s];
            const Icon = meta.icon;
            return (
              <div key={s} className="p-4">
                <Icon className={`h-7 w-7 mx-auto mb-2 ${s === 'shipped' ? 'text-emerald-500' : s === 'in_progress' ? 'text-blue-500' : s === 'planned' ? 'text-amber-500' : 'text-gray-400'}`} />
                <p className="text-3xl font-extrabold text-gray-900">{grouped[s].length}</p>
                <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">{meta.label}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Lists by status */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
        {orderedStatuses.map(status => {
          const items = grouped[status];
          if (items.length === 0) return null;
          const meta = STATUS_META[status];
          const Icon = meta.icon;
          return (
            <section key={status}>
              <div className="flex items-center gap-3 mb-6">
                <Icon className={`h-6 w-6 ${
                  status === 'shipped' ? 'text-emerald-600' :
                  status === 'in_progress' ? 'text-blue-600' :
                  status === 'planned' ? 'text-amber-600' :
                  'text-gray-500'
                }`} />
                <h2 className="text-2xl font-bold text-gray-900">{meta.label}</h2>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${meta.chip}`}>{items.length}</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {items.map((item, i) => {
                  const cat = CATEGORY_META[item.category];
                  return (
                    <div
                      key={i}
                      className={`rounded-xl border p-5 transition-colors ${
                        status === 'shipped'
                          ? 'border-emerald-100 bg-emerald-50/40'
                          : status === 'in_progress'
                            ? 'border-blue-100 bg-blue-50/40'
                            : status === 'planned'
                              ? 'border-amber-100 bg-amber-50/40'
                              : 'border-gray-100 bg-gray-50/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${cat.color}`}>{cat.label}</p>
                        <span className="text-[10px] font-mono text-gray-500">{item.quarter}</span>
                      </div>
                      <p className="font-bold text-gray-900 mb-1.5">{item.title}</p>
                      <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* Suggest */}
      <section className="bg-gray-50 border-t border-gray-100 py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-5">
            <MessageCircle className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">{t('resources.roadmap.suggest.title', 'Une suggestion ? Une priorité différente ?')}</h2>
          <p className="text-gray-600 mb-7">
            {t('resources.roadmap.suggest.desc', 'Nos clients orientent notre roadmap. Envoyez-nous ce dont vous avez besoin — les demandes récurrentes remontent vers « En cours » dans le trimestre suivant.')}
          </p>
          <a
            href="mailto:roadmap@greenconnect.cloud?subject=Suggestion%20roadmap%20ESG%20Flow"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            <MessageCircle className="h-4 w-4" />
            {t('resources.roadmap.suggest.button', 'Proposer une fonctionnalité')}
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      <footer className="bg-white border-t border-gray-200 py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
          <LogoBrand size="sm" variant="dark" showTagline={false} />
          <div className="flex gap-5 text-sm text-gray-500">
            <Link to="/pricing" className="hover:text-emerald-600">{t('resources.roadmap.footer.pricing', 'Tarifs')}</Link>
            <Link to="/security" className="hover:text-emerald-600">{t('resources.roadmap.footer.security', 'Sécurité')}</Link>
            <Link to="/status" className="hover:text-emerald-600">{t('resources.roadmap.footer.status', 'Statut')}</Link>
            <Link to="/partenaires" className="hover:text-emerald-600">{t('resources.roadmap.footer.partners', 'Partenaires')}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
