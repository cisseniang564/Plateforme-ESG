import { NavLink, useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard, Database, Upload, TrendingUp, Activity, Plug, Grid,
  Shield, ShieldCheck, AlertTriangle, BarChart3, Building2, FileText,
  Settings, HelpCircle, Award, Leaf, CheckSquare, Target, Code2, Flame,
  TrendingDown, PackageSearch, ClipboardList, PanelLeftClose, PanelLeftOpen,
  Sparkles, Brain, CreditCard, ChevronRight, Zap, LogOut, GitMerge, Users, Download, X,
  Bell, Calendar, RefreshCw, History, Calculator, List, FolderOpen, Webhook,
  Link2, Building, Globe, FlaskConical, BookOpen, UserCog,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  badgeVariant?: 'green' | 'violet' | 'amber' | 'blue';
  tourId?: string;
}

interface NavSection {
  title: string;
  key: string;
  items: NavItem[];
}

type NavEntry = NavItem | NavSection;

// ─── Score Card ───────────────────────────────────────────────────────────────

function ScoreCard({ score }: { score: number }) {
  const pct = Math.min(Math.max(score, 0), 100);
  const rating =
    pct >= 80 ? 'AAA' : pct >= 70 ? 'AA' : pct >= 60 ? 'A' :
    pct >= 50 ? 'BBB' : pct >= 40 ? 'BB' : pct >= 30 ? 'B' : 'C';
  const [hue, gradient, glow] =
    pct >= 60
      ? ['#10b981', 'from-emerald-500 to-teal-400', 'shadow-emerald-900/40']
      : pct >= 35
      ? ['#f59e0b', 'from-amber-500 to-yellow-400', 'shadow-amber-900/40']
      : ['#f87171', 'from-red-500 to-rose-400', 'shadow-red-900/40'];

  const r = 22;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="mx-2 mb-2 overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3.5">
      <div className="flex items-center gap-3">
        {/* Ring */}
        <div className="relative flex-shrink-0">
          <svg width="52" height="52" viewBox="0 0 52 52">
            <circle cx="26" cy="26" r={r} fill="none" strokeWidth="3" stroke="rgba(255,255,255,0.06)" />
            <circle
              cx="26" cy="26" r={r} fill="none" strokeWidth="3"
              stroke={hue} strokeLinecap="round"
              strokeDasharray={circ} strokeDashoffset={offset}
              transform="rotate(-90 26 26)"
              style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(.4,0,.2,1)' }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[13px] font-black text-white">
            {Math.round(pct)}
          </span>
        </div>
        {/* Text */}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-1">Score ESG</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black tabular-nums leading-none" style={{ color: hue }}>
              {Math.round(pct)}
            </span>
            <span className="text-xs text-slate-600 leading-none">/100</span>
          </div>
        </div>
        {/* Rating badge */}
        <div
          className={`flex-shrink-0 text-[11px] font-black px-2 py-1 rounded-lg shadow-lg ${glow}`}
          style={{ background: `${hue}18`, color: hue, border: `1px solid ${hue}30` }}
        >
          {rating}
        </div>
      </div>
      {/* Progress bar */}
      <div className="mt-3 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[9px] font-medium text-slate-600">
        <span>0</span>
        <span>50</span>
        <span>100</span>
      </div>
    </div>
  );
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function Tooltip({ label }: { label: string }) {
  return (
    <div className="pointer-events-none absolute left-full top-1/2 z-[999] ml-4 -translate-y-1/2 whitespace-nowrap rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-slate-100 shadow-2xl ring-1 ring-white/10 opacity-0 translate-x-1 group-hover/tip:opacity-100 group-hover/tip:translate-x-0 transition-all duration-150">
      {label}
      <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900" />
    </div>
  );
}

// ─── Nav Item ─────────────────────────────────────────────────────────────────

function NavItemLink({ item, collapsed, isActive }: {
  item: NavItem; collapsed: boolean; isActive: boolean;
}) {
  const Icon = item.icon;
  const badgeStyles: Record<string, string> = {
    green:  'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20',
    violet: 'bg-violet-500/15 text-violet-400 ring-1 ring-violet-500/20',
    amber:  'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/20',
    blue:   'bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/20',
  };

  return (
    <div className="group/tip relative">
      <NavLink
        to={item.href}
        data-tour={item.tourId}
        className={`
          relative flex items-center rounded-lg text-[13px] font-medium
          transition-all duration-100 select-none outline-none
          ${collapsed ? 'justify-center h-9 w-9 mx-auto' : 'gap-2.5 px-2.5 py-2 mx-1'}
          ${isActive
            ? 'bg-white/[0.07] text-white'
            : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
          }
        `}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[2.5px] rounded-r-full bg-emerald-400" />
        )}
        <Icon
          size={15}
          className={`flex-shrink-0 transition-colors duration-100 ${
            isActive ? 'text-emerald-400' : 'text-slate-500 group-hover/tip:text-slate-400'
          }`}
        />
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{item.name}</span>
            {item.badge && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md leading-none tracking-wide ${badgeStyles[item.badgeVariant ?? 'green']}`}>
                {item.badge}
              </span>
            )}
          </>
        )}
      </NavLink>
      {collapsed && <Tooltip label={item.name} />}
    </div>
  );
}

// ─── Section Block ────────────────────────────────────────────────────────────

function SectionBlock({ section, collapsed, isActiveInSection, open, onToggle }: {
  section: NavSection;
  collapsed: boolean;
  isActiveInSection: (href: string) => boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const effectiveOpen = collapsed ? true : open;
  const hasActive = section.items.some(i => isActiveInSection(i.href));

  return (
    <div>
      {!collapsed ? (
        <button
          onClick={onToggle}
          className={`flex w-full items-center gap-1.5 px-3 py-1 mb-0.5 rounded-md transition-colors duration-100 group/sec ${
            hasActive ? 'text-slate-400' : 'text-slate-600 hover:text-slate-500'
          }`}
        >
          <ChevronRight
            size={10}
            className={`transition-transform duration-200 flex-shrink-0 ${effectiveOpen ? 'rotate-90' : ''}`}
          />
          <span className="flex-1 text-left text-[10px] font-semibold uppercase tracking-[0.1em]">
            {section.title}
          </span>
        </button>
      ) : (
        <div className="my-2 flex justify-center">
          <div className="h-px w-4 rounded-full bg-white/10" />
        </div>
      )}

      <div
        className="grid transition-all duration-200 ease-in-out"
        style={{ gridTemplateRows: effectiveOpen ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="space-y-0.5 pb-1.5">
            {section.items.map((item) => (
              <NavItemLink
                key={item.href}
                item={item}
                collapsed={collapsed}
                isActive={isActiveInSection(item.href)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const location = useLocation();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [avgScore, setAvgScore] = useState<number | null>(null);
  const [planTier, setPlanTier] = useState<string>('free');

  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar_collapsed') === 'true'; } catch { return false; }
  });

  const [sectionState, setSectionState] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('sidebar_sections');
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    localStorage.setItem('sidebar_sections', JSON.stringify(sectionState));
  }, [sectionState]);

  useEffect(() => {
    api.get('/esg-scoring/dashboard')
      .then((r) => {
        const s = r.data?.statistics?.average_score;
        if (s != null) setAvgScore(Number(s));
      })
      .catch(() => {});
    api.get('/billing/subscription')
      .then((r) => { if (r.data?.plan_tier) setPlanTier(r.data.plan_tier); })
      .catch(() => {});
  }, []);

  const isSectionOpen = (key: string) => sectionState[key] !== false;
  const toggleSection = (key: string) =>
    setSectionState(prev => ({ ...prev, [key]: !isSectionOpen(key) }));

  const isActive = (path: string) =>
    path === '/app' ? location.pathname === '/app' : location.pathname.startsWith(path);

  // ── Navigation ──────────────────────────────────────────────────────────────

  const navigation: NavEntry[] = [
    // ── Tableau de bord ──
    {
      name: t('sidebar.nav.dashboard', 'Tableau de bord'),
      href: '/app',
      icon: LayoutDashboard,
      tourId: 'sidebar-dashboard',
    },

    // ── Collecte de données ──
    {
      title: t('sidebar.sections.collecteData', 'Collecte données'),
      key: 'collecte',
      items: [
        { name: t('sidebar.nav.manualEntry', 'Saisie manuelle'),   href: '/app/data-entry',         icon: Database,    tourId: 'sidebar-data-entry' },
        { name: t('sidebar.nav.importCsv', 'Import CSV'),          href: '/app/import-csv',         icon: Upload,      tourId: 'sidebar-import-csv' },
        { name: t('sidebar.nav.myData', 'Mes données'),            href: '/app/my-data',            icon: FolderOpen,  tourId: 'sidebar-my-data' },
        { name: t('sidebar.nav.calcAuto', 'Calculs auto'),         href: '/app/calculated-metrics', icon: Calculator,  tourId: 'sidebar-calc-auto' },
        { name: 'Export données',                                   href: '/app/data-export',        icon: Download,    tourId: 'sidebar-data-export' },
        { name: t('sidebar.nav.connectors', 'Connecteurs'),        href: '/app/data/connectors',    icon: Plug,        tourId: 'sidebar-connectors' },
        { name: 'Qualité des données',                              href: '/app/data-quality',       icon: Shield,      tourId: 'sidebar-data-quality' },
      ],
    },

    // ── Pilotage ESG ──
    {
      title: t('sidebar.sections.pilotageEsg', 'Pilotage ESG'),
      key: 'pilotage',
      items: [
        { name: t('sidebar.nav.indicators', 'Indicateurs'),              href: '/app/indicators',   icon: BarChart3,      tourId: 'sidebar-indicators' },
        { name: t('sidebar.nav.materiality', 'Matérialité'),             href: '/app/materiality',  icon: Grid,           tourId: 'sidebar-materiality' },
        { name: t('sidebar.nav.risks', 'Registre des risques'),          href: '/app/risks',        icon: AlertTriangle,  tourId: 'sidebar-risks' },
        { name: t('sidebar.nav.supplyChain', 'Supply Chain ESG'),        href: '/app/supply-chain', icon: PackageSearch,  tourId: 'sidebar-supply-chain' },
        { name: t('sidebar.nav.workflowValidation', 'Validation'),       href: '/app/validation',   icon: CheckSquare,    tourId: 'sidebar-validation' },
        { name: t('sidebar.nav.auditTrail', "Piste d'audit"),            href: '/app/audit-trail',  icon: ClipboardList,  tourId: 'sidebar-audit' },
      ],
    },

    // ── Scoring & Analyses ──
    {
      title: t('sidebar.sections.scoringAnalyses', 'Scoring & Analyses'),
      key: 'scoring',
      items: [
        { name: t('sidebar.nav.esgScores', 'Scores ESG'),           href: '/app/scores',            icon: Award,     tourId: 'sidebar-scores' },
        { name: 'Historique scores',                                  href: '/app/scores/history',    icon: History,   tourId: 'sidebar-scores-history' },
        { name: 'Calculer un score',                                  href: '/app/scores/calculate',  icon: RefreshCw, tourId: 'sidebar-scores-calculate' },
        { name: t('sidebar.nav.benchmarking', 'Benchmarking'),       href: '/app/benchmarking',      icon: Target,    tourId: 'sidebar-benchmarking' },
        { name: t('sidebar.nav.organisations', 'Organisations'),     href: '/app/organizations',     icon: Building2, tourId: 'sidebar-organizations' },
        { name: t('sidebar.nav.iaPredictive', 'IA Prédictive'),      href: '/app/intelligence',      icon: Sparkles,  badge: 'AI', badgeVariant: 'violet', tourId: 'sidebar-intelligence' },
        { name: 'Insights IA',                                        href: '/app/ai-insights',       icon: Brain,     badge: 'New', badgeVariant: 'violet' },
      ],
    },

    // ── Conformité & Rapports ──
    {
      title: t('sidebar.sections.conformite', 'Conformité & Rapports'),
      key: 'conformite',
      items: [
        { name: t('sidebar.nav.bilanCarbone', 'Bilan Carbone'),            href: '/app/carbon',               icon: Flame,        tourId: 'sidebar-carbon' },
        { name: t('sidebar.nav.decarbonation', 'Plan Décarbonation'),      href: '/app/decarbonation',        icon: TrendingDown, tourId: 'sidebar-decarbonation' },
        { name: t('sidebar.nav.taxonomieUE', 'Taxonomie UE'),              href: '/app/taxonomy',             icon: Leaf,         tourId: 'sidebar-taxonomy' },
        { name: t('sidebar.nav.multiReglementaire', 'Multi-réglementaire'), href: '/app/compliance',          icon: ShieldCheck,  tourId: 'sidebar-compliance' },
        { name: 'Analyse ESRS / DMA',                                       href: '/app/esrs-gap',            icon: Target,       badge: 'Pro', badgeVariant: 'violet', tourId: 'sidebar-esrs-gap' },
      ],
    },

    // ── Rapports ──
    {
      title: 'Rapports',
      key: 'rapports',
      items: [
        { name: 'Mes rapports',                href: '/app/reports',                   icon: FileText,   tourId: 'sidebar-reports' },
        { name: 'CSRD Builder',                href: '/app/reports/csrd-builder',      icon: BookOpen,   badge: 'New', badgeVariant: 'green', tourId: 'sidebar-csrd-builder' },
        { name: 'Générer un rapport',          href: '/app/reports/generate',          icon: RefreshCw,  tourId: 'sidebar-reports-generate' },
        { name: 'Liste des rapports',          href: '/app/reports/list',              icon: List,       tourId: 'sidebar-reports-list' },
        { name: 'Rapports planifiés',          href: '/app/reports/scheduled',         icon: Calendar,   tourId: 'sidebar-reports-scheduled' },
        { name: 'Multi-standards',             href: '/app/reports/multi-standards',   icon: GitMerge,   tourId: 'sidebar-multi-standards' },
      ],
    },

    // ── Paramètres ──
    {
      title: t('sidebar.sections.settings', 'Paramètres'),
      key: 'settings',
      items: [
        { name: t('sidebar.nav.parametres', 'Paramètres généraux'),  href: '/app/settings',                 icon: Settings,    tourId: 'sidebar-settings' },
        { name: 'Utilisateurs',                                        href: '/app/settings/users',           icon: Users,       tourId: 'sidebar-settings-users' },
        { name: 'Méthodologie',                                        href: '/app/settings/methodology',     icon: FlaskConical, tourId: 'sidebar-settings-methodology' },
        { name: 'Webhooks',                                            href: '/app/settings/webhooks',        icon: Webhook,     tourId: 'sidebar-settings-webhooks' },
        { name: 'Intégrations',                                        href: '/app/settings/integrations',    icon: Link2,       tourId: 'sidebar-settings-integrations' },
        { name: 'Entreprises INSEE',                                   href: '/app/settings/insee',           icon: Building,    tourId: 'sidebar-settings-insee' },
        { name: 'Enrichissement ESG',                                  href: '/app/settings/esg-enrichment',  icon: Globe,       tourId: 'sidebar-settings-esg' },
      ],
    },
  ];

  const bottomNav: NavItem[] = [
    { name: 'Notifications',                                href: '/app/notifications', icon: Bell,       tourId: 'sidebar-notifications' },
    { name: t('sidebar.nav.apiPublique', 'API & Docs'),    href: '/app/api-docs',      icon: Code2,      tourId: 'sidebar-api' },
    { name: 'Facturation',                                  href: '/app/billing',       icon: CreditCard, tourId: 'sidebar-billing' },
    { name: "Centre d'aide",                               href: '/help',              icon: HelpCircle, tourId: 'sidebar-help' },
  ];

  const initials = [user?.first_name?.[0], user?.last_name?.[0]].filter(Boolean).join('').toUpperCase() || 'U';
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Mon compte';

  const planConfig: Record<string, { label: string; style: string }> = {
    free:       { label: 'Free',       style: 'text-slate-400 bg-white/[0.06] ring-1 ring-white/10' },
    starter:    { label: 'Starter',    style: 'text-blue-400 bg-blue-500/10 ring-1 ring-blue-500/20' },
    pro:        { label: 'Pro',        style: 'text-emerald-400 bg-emerald-500/10 ring-1 ring-emerald-500/20' },
    enterprise: { label: 'Enterprise', style: 'text-violet-400 bg-violet-500/10 ring-1 ring-violet-500/20' },
  };
  const plan = planConfig[planTier] ?? planConfig.free;

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          flex h-screen flex-col
          border-r border-white/[0.06]
          bg-[#0c0e14]
          transition-[width,transform] duration-200 ease-in-out
          lg:translate-x-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${collapsed ? 'w-[56px]' : 'w-[228px]'}
        `}
      >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className={`
        relative flex h-[56px] flex-shrink-0 items-center
        border-b border-white/[0.06]
        ${collapsed ? 'justify-center' : 'px-3.5 gap-2.5'}
      `}>
        {/* X close button — mobile only */}
        <button
          onClick={onMobileClose}
          className="lg:hidden absolute top-1/2 -translate-y-1/2 right-3 p-1 rounded-lg hover:bg-white/[0.08] transition-colors"
          aria-label="Fermer le menu"
        >
          <X className="h-4 w-4 text-slate-400" />
        </button>
        <Link to="/app" className="flex-shrink-0">
          <div className="h-7 w-7 rounded-[8px] bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-900/30 ring-1 ring-white/10">
            <svg className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </Link>

        {!collapsed && (
          <>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-white leading-tight tracking-tight">ESGFlow</p>
              <p className="text-[10px] text-slate-600 leading-tight">Plateforme ESG</p>
            </div>
            <button
              onClick={() => setCollapsed(true)}
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-slate-600 hover:text-slate-400 hover:bg-white/[0.05] transition-all duration-100"
              title="Réduire"
            >
              <PanelLeftClose size={13} />
            </button>
          </>
        )}

        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="absolute -right-3 top-[18px] z-20 flex h-6 w-6 items-center justify-center rounded-full border border-white/[0.08] bg-[#0c0e14] text-slate-500 hover:text-slate-300 shadow-lg transition-all duration-100"
            title="Développer"
          >
            <PanelLeftOpen size={11} />
          </button>
        )}
      </div>

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav
        className={`
          flex-1 overflow-y-auto overflow-x-hidden py-2
          ${collapsed ? 'px-0' : 'px-1'}
          [&::-webkit-scrollbar]:w-[2px]
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:bg-white/10
          [&::-webkit-scrollbar-thumb]:rounded-full
        `}
      >
        {navigation.map((entry) => {
          if ('title' in entry) {
            return (
              <SectionBlock
                key={entry.key}
                section={entry}
                collapsed={collapsed}
                isActiveInSection={isActive}
                open={isSectionOpen(entry.key)}
                onToggle={() => toggleSection(entry.key)}
              />
            );
          }
          return (
            <NavItemLink
              key={entry.href}
              item={entry}
              collapsed={collapsed}
              isActive={isActive(entry.href)}
            />
          );
        })}
      </nav>

      {/* ── Score Card ──────────────────────────────────────────────────────── */}
      {avgScore !== null && !collapsed && (
        <ScoreCard score={avgScore} />
      )}

      {/* ── Upgrade CTA ─────────────────────────────────────────────────────── */}
      {planTier === 'free' && !collapsed && (
        <div className="mx-2 mb-2">
          <Link
            to="/app/billing"
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 bg-gradient-to-r from-violet-600/10 to-indigo-600/10 border border-violet-500/15 hover:border-violet-500/30 hover:from-violet-600/15 hover:to-indigo-600/15 transition-all duration-150 group"
          >
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-violet-500/20">
              <Zap size={11} className="text-violet-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-violet-300 leading-tight">Passer à Pro</p>
              <p className="text-[10px] text-violet-500/70 leading-tight">Toutes les fonctionnalités</p>
            </div>
            <ChevronRight size={12} className="text-violet-500 flex-shrink-0 group-hover:translate-x-0.5 transition-transform duration-100" />
          </Link>
        </div>
      )}

      {/* ── Bottom Nav ──────────────────────────────────────────────────────── */}
      <div className={`border-t border-white/[0.06] pt-1 pb-1 space-y-0.5 ${collapsed ? '' : 'px-1'}`}>
        {bottomNav.map((item) => (
          <NavItemLink
            key={item.href}
            item={item}
            collapsed={collapsed}
            isActive={isActive(item.href)}
          />
        ))}
      </div>

      {/* ── User Profile ────────────────────────────────────────────────────── */}
      <div className={`border-t border-white/[0.06] ${collapsed ? 'px-0 py-2' : 'px-2 py-2'}`}>
        {collapsed ? (
          <div className="group/tip relative flex justify-center">
            <Link to="/app/profile">
              <div className="h-7 w-7 rounded-[8px] bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center ring-1 ring-white/10 hover:ring-emerald-500/40 transition-all duration-100 cursor-pointer">
                <span className="text-[11px] font-bold text-white leading-none">{initials}</span>
              </div>
            </Link>
            <Tooltip label={fullName} />
          </div>
        ) : (
          <Link
            to="/app/profile"
            className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 hover:bg-white/[0.04] transition-colors duration-100 group"
          >
            <div className="relative flex-shrink-0">
              <div className="h-7 w-7 rounded-[8px] bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center ring-1 ring-white/10 group-hover:ring-emerald-500/30 transition-all duration-100">
                <span className="text-[11px] font-bold text-white leading-none">{initials}</span>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-[1.5px] ring-[#0c0e14]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold text-slate-200 leading-tight group-hover:text-white transition-colors duration-100">
                {fullName}
              </p>
              <p className="truncate text-[10px] text-slate-600 leading-tight mt-0.5">{user?.email}</p>
            </div>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md leading-none flex-shrink-0 ${plan.style}`}>
              {plan.label}
            </span>
          </Link>
        )}
      </div>
    </aside>
    </>
  );
}
