/**
 * Sidebar — Rail 76px (tuiles colorées) + Contextual Panel 248px
 * Pattern: Linear / Figma / Vercel
 * Colors: Rail #0f1117 · Panel #141720 · Accent emerald
 */
import { NavLink, useLocation, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Database, BarChart3, ShieldCheck, FileText,
  Globe, Settings, Bell, HelpCircle, Building2,
  Upload, FolderOpen, Calculator, Download, Plug, Shield,
  TrendingUp, Grid, AlertTriangle, Target, Award, Brain, Sparkles,
  Flame, Droplets, Leaf, BookOpen, ShieldAlert, Scale,
  Globe2, MessageSquare, Waves, Webhook, Link2, Building,
  CreditCard, Briefcase, FileCode2, ClipboardList, CheckSquare,
  PackageSearch, History, RefreshCw, List, Calendar, GitMerge,
  TrendingDown, Users, Code2, X, PanelRightClose, LogOut,
  Package, Sliders, UserCog, FlaskConical, Zap, User, ChevronUp, Lock,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { usePlan, type FeatureKey } from '@/hooks/usePlan';
import { LogoMark } from '@/components/common/Logo';
import api from '@/services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PanelItem {
  name: string;
  href: string;
  icon?: LucideIcon;
  badge?: string;
  badgeVariant?: 'green' | 'violet' | 'amber' | 'blue';
  feature?: FeatureKey;
}

interface PanelGroup {
  title?: string;
  items: PanelItem[];
}

interface RailSection {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;          // direct link — no panel
  groups?: PanelGroup[];
}

// ─── Navigation Data ──────────────────────────────────────────────────────────
//
// Information Architecture: rail + panel pattern (Notion/Linear style).
//   - 6 rail sections + 3 bottom rail = 9 top-level entries (was 7+3)
//   - Each panel: max 15 items, no more than 3 groups
//   - Settings / admin moved to the user dropdown in the Header
//     (Stripe/Linear pattern — rarely accessed daily)
//   - "New" badges removed (Linear rule: max 30 days; we ship daily, all stale)
//   - Doublons merged: IA Prédictive + Insights IA → single "Insights & IA"
//   - ESRS detail pages folded behind a single "ESRS Builder" entry
//   - Standards rarely used (B Corp, ODD, GRI) folded behind "Plus de standards"

// buildRail — returns the full navigation tree with translated labels.
// Called inside the component via useMemo so `t()` picks up language changes.
type TFn = (key: string) => string;

function buildRail(t: TFn): RailSection[] {
  return [
    {
      id: 'home',
      label: t('sidebar.rail.home'),
      icon: LayoutDashboard,
      href: '/app',
    },
    {
      id: 'gaia',
      label: 'Gaïa',
      icon: Sparkles,
      href: '/app/gaia',
    },
    {
      id: 'donnees',
      label: t('sidebar.rail.data'),
      icon: Database,
      groups: [
        {
          title: t('sidebar.groups.collect'),
          items: [
            { name: t('sidebar.nav.manualEntry'),   href: '/app/data-entry',         icon: Database },
            { name: t('sidebar.nav.importCsv'),      href: '/app/import-csv',         icon: Upload },
            { name: t('sidebar.nav.myData'),          href: '/app/my-data',            icon: FolderOpen },
            { name: t('sidebar.nav.exportData'),      href: '/app/data-export',        icon: Download, feature: 'data_export' },
          ],
        },
        {
          title: t('sidebar.groups.integrations'),
          items: [
            { name: t('sidebar.nav.connectors'),      href: '/app/connectors',         icon: Plug },
            { name: t('sidebar.nav.connectorsHub'),    href: '/app/data/connectors',    icon: Link2 },
            { name: t('sidebar.nav.dataQuality'),      href: '/app/data-quality',       icon: Shield },
            { name: t('sidebar.nav.calcAuto'),         href: '/app/calculated-metrics', icon: Calculator },
          ],
        },
      ],
    },
    {
      id: 'analyses',
      label: t('sidebar.rail.analyses'),
      icon: BarChart3,
      groups: [
        {
          title: t('sidebar.groups.performance'),
          items: [
            { name: t('sidebar.nav.indicators'),       href: '/app/indicators',         icon: BarChart3 },
            { name: t('sidebar.nav.esgScores'),         href: '/app/scores',             icon: Award },
            { name: t('sidebar.nav.scoresCalculate'),   href: '/app/scores/calculate',   icon: Calculator },
            { name: t('sidebar.nav.scoresHistory'),     href: '/app/scores/history',     icon: History },
            { name: t('sidebar.nav.benchmarking'),      href: '/app/benchmarking',       icon: Target, feature: 'benchmark' },
          ],
        },
        {
          title: t('sidebar.groups.steering'),
          items: [
            { name: t('sidebar.nav.materiality'),       href: '/app/materiality',        icon: Grid },
            { name: t('sidebar.nav.risks'),              href: '/app/risks',              icon: AlertTriangle },
            { name: t('sidebar.nav.organisations'),      href: '/app/organizations',      icon: Building2 },
            { name: t('sidebar.nav.gaia'),               href: '/app/gaia',               icon: Sparkles, feature: 'ai_narrative' },
            { name: t('sidebar.nav.aiInsights'),         href: '/app/intelligence',       icon: Sparkles, feature: 'ai_narrative' },
            { name: t('sidebar.nav.iaPredictive'),       href: '/app/ai-insights',        icon: Brain, feature: 'ai_narrative' },
          ],
        },
      ],
    },
    {
      id: 'carbone',
      label: t('sidebar.rail.carbon'),
      icon: Flame,
      groups: [
        {
          title: t('sidebar.groups.emissions'),
          items: [
            { name: t('sidebar.nav.bilanCarbone'),      href: '/app/carbon',             icon: Flame,        feature: 'carbon_report' },
            { name: t('sidebar.nav.scope3'),             href: '/app/scope3',             icon: Calculator,   feature: 'carbon_report' },
            { name: t('sidebar.nav.lca'),                href: '/app/lca',                icon: Package,      feature: 'carbon_report' },
          ],
        },
        {
          title: t('sidebar.groups.trajectory'),
          items: [
            { name: t('sidebar.nav.decarbonation'),     href: '/app/decarbonation',      icon: TrendingDown, feature: 'carbon_report' },
            { name: t('sidebar.nav.sbti'),               href: '/app/compliance/sbti',    icon: Target },
            { name: t('sidebar.nav.climateScenarios'),   href: '/app/climate-scenarios',  icon: TrendingUp },
          ],
        },
      ],
    },
    {
      id: 'conformite',
      label: t('sidebar.rail.compliance'),
      icon: ShieldCheck,
      groups: [
        {
          title: t('sidebar.groups.euMandatory'),
          items: [
            { name: 'Progression CSRD',           href: '/app/csrd-progress',                 icon: TrendingUp,  feature: 'csrd_report' },
            { name: t('sidebar.nav.esrsGap'),     href: '/app/esrs-gap',                      icon: Target,      feature: 'esrs_gap_analysis' },
            { name: t('sidebar.nav.taxonomieUE'), href: '/app/taxonomy',                      icon: Leaf },
            { name: t('sidebar.nav.csddd'),       href: '/app/compliance/csddd',              icon: ShieldAlert },
            { name: t('sidebar.nav.sfdr'),        href: '/app/compliance/sfdr',               icon: Globe,       feature: 'sfdr_report' },
            { name: t('sidebar.nav.ixbrl'),       href: '/app/compliance/ixbrl',              icon: FileCode2 },
            { name: 'Plan de vigilance',          href: '/app/vigilance',                     icon: Shield,      feature: 'risk_register' },
          ],
        },
        {
          title: t('sidebar.groups.intlVoluntary'),
          items: [
            { name: t('sidebar.nav.tcfdBuilder'), href: '/app/tcfd',               icon: ShieldCheck },
            { name: t('sidebar.nav.cdp'),         href: '/app/compliance/cdp',     icon: BarChart3 },
            { name: t('sidebar.nav.gri'),         href: '/app/compliance/gri',     icon: BookOpen },
            { name: t('sidebar.nav.moreStandards'), href: '/app/compliance',       icon: GitMerge },
          ],
        },
      ],
    },
    {
      id: 'rapports',
      label: t('sidebar.rail.reports'),
      icon: FileText,
      groups: [
        {
          title: t('sidebar.groups.production'),
          items: [
            { name: t('sidebar.nav.mesRapports'),         href: '/app/reports',              icon: FileText },
            { name: t('sidebar.nav.reportList'),          href: '/app/reports/list',         icon: List },
            { name: t('sidebar.nav.csrdBuilder'),         href: '/app/reports/csrd-builder', icon: BookOpen,     feature: 'csrd_report' },
            { name: t('sidebar.nav.dpef'),                href: '/app/reports/dpef',         icon: ClipboardList, feature: 'dpef_report' },
            { name: t('sidebar.nav.generateReport'),      href: '/app/reports/generate',     icon: RefreshCw },
          ],
        },
        {
          title: t('sidebar.groups.automation'),
          items: [
            { name: t('sidebar.nav.scheduledReports'),    href: '/app/reports/scheduled',    icon: Calendar },
            { name: t('sidebar.nav.multiStandards'),      href: '/app/reports/multi-standards', icon: GitMerge, feature: 'multi_standard' },
          ],
        },
      ],
    },
    {
      id: 'engagement',
      label: t('sidebar.rail.engagement'),
      icon: Users,
      groups: [
        {
          title: t('sidebar.groups.stakeholders'),
          items: [
            { name: t('sidebar.nav.stakeholders'),        href: '/app/stakeholders',           icon: MessageSquare },
            { name: t('sidebar.nav.supplyChain'),          href: '/app/supply-chain',           icon: PackageSearch, feature: 'supply_chain_esg' },
            { name: t('sidebar.nav.investorRelations'),    href: '/app/investor-relations',     icon: Briefcase },
          ],
        },
        {
          title: t('sidebar.groups.audit'),
          items: [
            { name: t('sidebar.nav.workflowValidation'),  href: '/app/validation',             icon: CheckSquare },
            { name: t('sidebar.nav.auditTrail'),           href: '/app/audit-trail',            icon: List },
            { name: t('sidebar.nav.auditPrep'),            href: '/app/audit/preparation',      icon: ClipboardList },
          ],
        },
      ],
    },
    {
      id: 'settings',
      label: t('sidebar.rail.settings'),
      icon: Settings,
      groups: [
        {
          title: t('sidebar.groups.administration'),
          items: [
            { name: t('sidebar.nav.parametres'),           href: '/app/settings',               icon: Settings },
            { name: t('sidebar.nav.users'),                href: '/app/settings/users',         icon: UserCog },
            { name: t('sidebar.nav.billing'),              href: '/app/billing',                icon: CreditCard },
          ],
        },
        {
          title: t('sidebar.groups.configuration'),
          items: [
            { name: t('sidebar.nav.methodology'),          href: '/app/settings/methodology',   icon: FlaskConical },
            { name: t('sidebar.nav.esgEnrichment'),        href: '/app/settings/esg-enrichment', icon: Zap },
            { name: t('sidebar.nav.integrations'),         href: '/app/settings/integrations',  icon: Link2 },
            { name: t('sidebar.nav.webhooks'),             href: '/app/settings/webhooks',      icon: Webhook },
            { name: t('sidebar.nav.apiPublique'),          href: '/app/api-docs',               icon: Code2 },
            { name: t('sidebar.nav.inseeCompanies'),       href: '/app/settings/insee',         icon: Building },
          ],
        },
      ],
    },
  ];
}

function buildBottomRail(t: TFn) {
  return [
    { id: 'cabinet',       label: t('sidebar.bottom.cabinet'),       icon: Building2,  href: '/app/cabinet' },
    { id: 'notifications', label: t('sidebar.bottom.notifications'), icon: Bell,       href: '/app/notifications' },
    { id: 'help',          label: t('sidebar.bottom.help'),          icon: HelpCircle, href: '/help' },
    { id: 'docs',          label: 'Docs',                            icon: BookOpen,   href: '/documentation' },
  ];
}

// ─── Badge styles ──────────────────────────────────────────────────────────────

const BADGE: Record<string, string> = {
  green:  'bg-emerald-500/15 text-emerald-400',
  violet: 'bg-violet-500/15 text-violet-400',
  amber:  'bg-amber-500/15  text-amber-400',
  blue:   'bg-blue-500/15   text-blue-400',
};

// ─── Score Card (compact) ──────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const pct = Math.min(Math.max(score, 0), 100);
  const r = 14, circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct >= 60 ? '#10b981' : pct >= 35 ? '#f59e0b' : '#f87171';
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" className="flex-shrink-0">
      <circle cx="17" cy="17" r={r} fill="none" strokeWidth="2.5" stroke="rgba(255,255,255,0.06)" />
      <circle cx="17" cy="17" r={r} fill="none" strokeWidth="2.5" stroke={color}
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        transform="rotate(-90 17 17)" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      <text x="17" y="21" textAnchor="middle" fontSize="9" fontWeight="800" fill={color}>{Math.round(pct)}</text>
    </svg>
  );
}

// ─── Accents par section ───────────────────────────────────────────────────────
// Une couleur par univers : on repère où l'on est d'un coup d'œil.

const ACCENT: Record<string, string> = {
  home:       '16,185,129',   // émeraude
  gaia:       '167,139,250',  // violet (IA)
  donnees:    '56,189,248',   // ciel
  analyses:   '129,140,248',  // indigo
  carbone:    '251,146,60',   // orange
  conformite: '45,212,191',   // turquoise
  rapports:   '251,191,36',   // ambre
  engagement: '244,114,182',  // rose
  settings:   '148,163,184',  // ardoise
};
const accentOf = (id: string) => ACCENT[id] ?? ACCENT.home;

// ─── Rail Item ────────────────────────────────────────────────────────────────

function RailTile({ icon: Icon, label, active, rgb, small }: {
  icon: LucideIcon; label: string; active: boolean; rgb: string; small?: boolean;
}) {
  const box = small ? 'h-8 w-8 rounded-xl' : 'h-10 w-10 rounded-2xl';
  return (
    <>
      <span
        className={`relative flex items-center justify-center ${box} transition-all duration-200
          group-hover:-translate-y-px group-active:scale-95`}
        style={{
          background: active
            ? `linear-gradient(135deg, rgba(${rgb},0.30), rgba(${rgb},0.10))`
            : 'rgba(255,255,255,0.03)',
          boxShadow: active ? `0 0 0 1px rgba(${rgb},0.35), 0 6px 18px -6px rgba(${rgb},0.55)` : undefined,
        }}
      >
        <Icon
          size={small ? 15 : 18}
          strokeWidth={active ? 2.2 : 1.8}
          style={{ color: active ? `rgb(${rgb})` : undefined }}
          className={active ? '' : 'text-slate-400 group-hover:text-white transition-colors'}
        />
      </span>
      <span
        className={`mt-1 text-[10px] font-semibold leading-none tracking-wide transition-colors ${
          active ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'
        }`}
      >
        {label}
      </span>
    </>
  );
}

function RailItem({ section, isActive, isOpen, onClick }: {
  section: RailSection;
  isActive: boolean;
  isOpen: boolean;
  onClick: () => void;
}) {
  const rgb = accentOf(section.id);
  const cls = 'group flex flex-col items-center justify-center w-full py-1.5 select-none outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 rounded-2xl';

  if (section.href) {
    return (
      <NavLink to={section.href} end={section.href === '/app'} className={cls} title={section.label}>
        {({ isActive: na }) => <RailTile icon={section.icon} label={section.label} active={na} rgb={rgb} />}
      </NavLink>
    );
  }

  return (
    <button onClick={onClick} className={cls} title={section.label} aria-expanded={isOpen}>
      <RailTile icon={section.icon} label={section.label} active={isActive || isOpen} rgb={rgb} />
    </button>
  );
}

// ─── Panel Item ───────────────────────────────────────────────────────────────

function PanelNavItem({ item, locked, lockLabel, rgb }: {
  item: PanelItem; locked: boolean; lockLabel?: string; rgb: string;
}) {
  const Icon = item.icon;
  const isAI = item.badgeVariant === 'violet' || /gaia|gaïa/i.test(item.name);
  const tint = isAI ? ACCENT.gaia : rgb;
  return (
    <NavLink
      to={item.href}
      className="group relative block rounded-xl select-none outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
    >
      {({ isActive }) => (
        <span
          className={`flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-[13px] font-medium transition-all duration-150
            ${isActive ? 'text-white' : locked ? 'text-slate-500 hover:text-slate-300' : 'text-slate-300 hover:text-white hover:translate-x-0.5'}`}
          style={{
            background: isActive ? `linear-gradient(90deg, rgba(${tint},0.20), rgba(${tint},0.04))` : undefined,
            boxShadow: isActive ? `inset 0 0 0 1px rgba(${tint},0.22)` : undefined,
          }}
        >
          {Icon && (
            <span
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg transition-colors"
              style={{ background: isActive ? `rgba(${tint},0.22)` : isAI ? `rgba(${ACCENT.gaia},0.12)` : 'rgba(255,255,255,0.04)' }}
            >
              <Icon
                size={14}
                style={{ color: isActive || isAI ? `rgb(${tint})` : undefined }}
                className={isActive || isAI ? '' : locked ? 'text-slate-600' : 'text-slate-400 group-hover:text-slate-200'}
              />
            </span>
          )}
          <span className="flex-1 truncate">{item.name}</span>
          {item.badge && !locked && (
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md leading-none ${BADGE[item.badgeVariant ?? 'green']}`}>
              {item.badge}
            </span>
          )}
          {locked && (
            <span className="flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-400/90">
              <Lock size={8} aria-hidden="true" />{lockLabel ?? 'Pro'}
            </span>
          )}
        </span>
      )}
    </NavLink>
  );
}

// ─── Main Sidebar ──────────────────────────────────────────────────────────────

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { can: canFeature, minPlan: minPlanFor, loading: planLoading } = usePlan();
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [avgScore, setAvgScore] = useState<number | null>(null);
  const [planTier, setPlanTier] = useState<string>('free');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const RAIL = useMemo(() => buildRail(t), [t]);
  const BOTTOM_RAIL = useMemo(() => buildBottomRail(t), [t]);

  const isLocked = (item: PanelItem) => {
    if (!item.feature) return false;
    if (planLoading) return false;
    return !canFeature(item.feature);
  };

  // Auto-open relevant section on route change
  useEffect(() => {
    const detected = RAIL.find(s =>
      s.groups?.some(g => g.items.some(i => location.pathname.startsWith(i.href) && i.href !== '/app'))
    );
    if (detected) setOpenSection(detected.id);
    else if (location.pathname === '/app') setOpenSection(null);
  }, [location.pathname]);

  // Close panel on outside click (desktop)
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        // only close if click is in the main content area (not the rail itself)
        const target = e.target as Element;
        if (!target.closest('[data-rail]')) setOpenSection(null);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  // Close user menu on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  useEffect(() => {
    api.get('/esg-scoring/dashboard')
      .then(r => { const s = r.data?.statistics?.average_score; if (s != null) setAvgScore(Number(s)); })
      .catch(() => {});
    api.get('/billing/subscription')
      .then(r => { if (r.data?.plan_tier) setPlanTier(r.data.plan_tier); })
      .catch(() => {});
  }, []);

  const isSectionActive = (s: RailSection) =>
    s.groups?.some(g => g.items.some(i => location.pathname.startsWith(i.href) && i.href !== '/app')) ?? false;

  const toggleSection = useCallback((id: string) =>
    setOpenSection(prev => prev === id ? null : id), []);

  const panelSection = RAIL.find(s => s.id === openSection && s.groups);
  const initials = [user?.first_name?.[0], user?.last_name?.[0]].filter(Boolean).join('').toUpperCase() || 'U';
  const scoreColor = avgScore !== null ? (avgScore >= 60 ? '#10b981' : avgScore >= 35 ? '#f59e0b' : '#f87171') : '#6b7280';

  const planBadge: Record<string, { label: string; color: string }> = {
    free:       { label: 'Free',       color: '#6b7280' },
    pme:        { label: 'PME',        color: '#3b82f6' },
    eti:        { label: 'ETI',        color: '#10b981' },
    groupe:     { label: 'Groupe',     color: '#8b5cf6' },
    enterprise: { label: 'Enterprise', color: '#f59e0b' },
    starter:    { label: 'Starter',    color: '#3b82f6' },
    pro:        { label: 'Pro',        color: '#10b981' },
  };
  const plan = planBadge[planTier] ?? planBadge.free;

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar shell */}
      <aside
        aria-label={t('sidebar.a11y.platformNav')}
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          flex h-screen flex-row
          transition-transform duration-200 ease-in-out
          lg:translate-x-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* ── Rail ──────────────────────────────────────────────────────────── */}
        <div
          data-rail
          className="flex flex-col h-full w-[76px] flex-shrink-0 bg-[#0c0e14] border-r border-white/[0.05]"
        >
          {/* Logo */}
          <div className="flex items-center justify-center h-[56px] flex-shrink-0">
            <Link to="/app" aria-label={t('sidebar.a11y.logoHome')}>
              <LogoMark size={28} />
            </Link>
          </div>

          {/* Main rail items */}
          <nav
            aria-label={t('sidebar.a11y.mainNav')}
            className="flex-1 overflow-y-auto overflow-x-hidden py-1 px-2 space-y-1
            [&::-webkit-scrollbar]:w-0"
          >
            {RAIL.map(section => (
              <RailItem
                key={section.id}
                section={section}
                isActive={isSectionActive(section)}
                isOpen={openSection === section.id}
                onClick={() => toggleSection(section.id)}
              />
            ))}
          </nav>

          {/* Bottom rail — icônes compactes en grille 2×2 (libellé au survol) */}
          <div className="flex-shrink-0 mx-3 border-t border-white/[0.06] pt-2 pb-1 grid grid-cols-2 gap-1 justify-items-center">
            {BOTTOM_RAIL.map(item => {
              const Icon = item.icon;
              const active = location.pathname.startsWith(item.href);
              return (
                <NavLink key={item.id} to={item.href} title={item.label} aria-label={item.label}
                  className="group flex h-8 w-8 items-center justify-center rounded-xl outline-none transition-all focus-visible:ring-2 focus-visible:ring-emerald-400/60"
                  style={{
                    background: active ? `rgba(${ACCENT.settings},0.22)` : 'rgba(255,255,255,0.03)',
                    boxShadow: active ? `0 0 0 1px rgba(${ACCENT.settings},0.35)` : undefined,
                  }}>
                  <Icon size={15} className={active ? 'text-white' : 'text-slate-400 group-hover:text-white transition-colors'} />
                </NavLink>
              );
            })}
          </div>

          {/* User menu */}
          <div ref={userMenuRef} className="flex-shrink-0 py-3 flex flex-col items-center relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen(o => !o)}
              className="relative group"
              aria-label="Menu utilisateur"
            >
              {/* Score badge */}
              {avgScore !== null && (
                <span
                  className="absolute -top-1 -right-1 z-10 w-[18px] h-[18px] rounded-full flex items-center justify-center text-[8px] font-black border border-[#0f1117]"
                  style={{ background: scoreColor + '22', color: scoreColor, borderColor: '#0f1117' }}
                >
                  {Math.round(avgScore)}
                </span>
              )}
              <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center ring-1 ring-white/10 group-hover:ring-emerald-500/50 group-hover:scale-105 transition-all">
                <span className="text-[11px] font-bold text-white">{initials}</span>
              </div>
            </button>

            {/* Dropdown — s'ouvre à droite du rail */}
            {userMenuOpen && (
              <div className="absolute bottom-0 left-[calc(100%+10px)] w-[210px] bg-[#1c2133] rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden z-[60]">
                {/* User info header */}
                <div className="px-3 pt-3 pb-2.5 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-white">{initials}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-white leading-tight truncate">
                        {user?.first_name} {user?.last_name}
                      </p>
                      <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-md mt-0.5" style={{ background: plan.color + '22', color: plan.color }}>
                        {plan.label}
                      </span>
                    </div>
                  </div>
                  {/* Score bar */}
                  {avgScore !== null && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] text-slate-500 font-medium">Score ESG</span>
                        <span className="text-[10px] font-bold" style={{ color: scoreColor }}>{Math.round(avgScore)}/100</span>
                      </div>
                      <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${avgScore}%`, background: scoreColor }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Links */}
                <div className="py-1">
                  {[
                    { icon: User,       label: 'Mon profil',    href: '/app/profile' },
                    { icon: CreditCard, label: 'Facturation',   href: '/app/billing' },
                    { icon: Settings,   label: 'Paramètres',    href: '/app/settings' },
                  ].map(item => (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.05] transition-colors group"
                    >
                      <item.icon size={13} className="text-slate-600 group-hover:text-slate-300 flex-shrink-0" />
                      <span className="text-[12px] text-slate-400 group-hover:text-slate-200 font-medium">{item.label}</span>
                    </Link>
                  ))}
                </div>

                <div className="border-t border-white/[0.06] py-1">
                  <button
                    type="button"
                    onClick={() => { setUserMenuOpen(false); logout(); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-red-500/[0.07] transition-colors group"
                  >
                    <LogOut size={13} className="text-slate-600 group-hover:text-red-400 flex-shrink-0" />
                    <span className="text-[12px] text-slate-400 group-hover:text-red-400 font-medium">Se déconnecter</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Context Panel ─────────────────────────────────────────────────── */}
        <div
          ref={panelRef}
          className={`
            flex flex-col h-full bg-gradient-to-b from-[#12151d] to-[#0e1017] border-r border-white/[0.05]
            transition-[width,opacity] duration-200 ease-in-out overflow-hidden
            ${panelSection ? 'w-[248px] opacity-100' : 'w-0 opacity-0'}
          `}
        >
          {panelSection && (
            <>
              {/* Panel header */}
              <div className="flex items-center gap-3 px-4 h-[56px] flex-shrink-0">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-xl"
                  style={{ background: `linear-gradient(135deg, rgba(${accentOf(panelSection.id)},0.32), rgba(${accentOf(panelSection.id)},0.08))` }}
                >
                  <panelSection.icon size={16} style={{ color: `rgb(${accentOf(panelSection.id)})` }} />
                </span>
                <span className="flex-1 truncate text-[14px] font-bold tracking-tight text-white">
                  {panelSection.label}
                </span>
                <button
                  type="button"
                  onClick={() => setOpenSection(null)}
                  className="p-1.5 rounded-lg hover:bg-white/[0.07] text-slate-500 hover:text-slate-200 transition-colors"
                  aria-label={t('sidebar.a11y.closePanel')}
                >
                  <PanelRightClose size={14} aria-hidden="true" />
                </button>
              </div>

              {/* Panel nav */}
              <nav className="flex-1 overflow-y-auto px-3 py-2
                [&::-webkit-scrollbar]:w-[2px]
                [&::-webkit-scrollbar-thumb]:bg-white/10
                [&::-webkit-scrollbar-thumb]:rounded-full">
                <div className="space-y-5">
                  {panelSection.groups?.map((group, gi) => (
                    <div key={gi}>
                      {group.title && (
                        <p className="flex items-center gap-2 px-2 mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                          <span className="h-1 w-1 rounded-full" style={{ background: `rgb(${accentOf(panelSection.id)})` }} />
                          {group.title}
                          <span className="h-px flex-1 bg-white/[0.06]" />
                        </p>
                      )}
                      <div className="space-y-0.5">
                        {group.items.map(item => (
                          <PanelNavItem
                            key={item.href}
                            item={item}
                            locked={isLocked(item)}
                            lockLabel={item.feature ? minPlanFor(item.feature) : undefined}
                            rgb={accentOf(panelSection.id)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </nav>

              {/* Plan CTA */}
              {planTier === 'free' && (
                <div className="flex-shrink-0 px-3 pb-2">
                  <Link
                    to="/app/billing"
                    className="flex items-center gap-2.5 rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/20 via-indigo-500/10 to-transparent p-3 transition-all hover:border-violet-400/40 hover:shadow-[0_8px_24px_-10px_rgba(139,92,246,0.6)]"
                  >
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-violet-500/25">
                      <Zap size={14} className="text-violet-300" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12px] font-bold leading-tight text-violet-100">{t('sidebar.cta.upgradePro')}</span>
                      <span className="block text-[10px] leading-tight text-violet-300/70">{t('sidebar.cta.unlockAll')}</span>
                    </span>
                  </Link>
                </div>
              )}

              {/* Carte utilisateur */}
              <div className="flex-shrink-0 px-3 pb-3">
                <div className="flex items-center gap-2.5 rounded-2xl bg-white/[0.04] p-2.5 ring-1 ring-white/[0.06]">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-[11px] font-bold text-white">
                    {initials}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-semibold leading-tight text-slate-100">
                      {user?.first_name} {user?.last_name}
                    </span>
                    <span
                      className="mt-0.5 inline-block rounded-md px-1.5 py-px text-[9px] font-bold leading-tight"
                      style={{ background: plan.color + '22', color: plan.color }}
                    >
                      {plan.label}
                    </span>
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
