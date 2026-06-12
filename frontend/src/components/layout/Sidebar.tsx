/**
 * Sidebar — Rail 68px + Contextual Panel 216px
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
  Package, Sliders, UserCog, FlaskConical, Zap, User, ChevronUp,
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

// ─── Rail Item ────────────────────────────────────────────────────────────────

function RailItem({ section, isActive, isOpen, onClick }: {
  section: RailSection;
  isActive: boolean;
  isOpen: boolean;
  onClick: () => void;
}) {
  const Icon = section.icon;
  const active = isActive || isOpen;

  if (section.href) {
    return (
      <NavLink
        to={section.href}
        end={section.href === '/app'}
        className="group relative flex flex-col items-center justify-center w-full py-2.5 rounded-xl mx-auto transition-all duration-100 select-none outline-none"
        style={({ isActive: na }) => ({
          background: na ? 'rgba(16,185,129,0.08)' : undefined,
        })}
      >
        {({ isActive: na }) => (
          <>
            {na && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[2px] rounded-r-full bg-emerald-400" />}
            <Icon size={17} className={na ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'} />
            <span className={`mt-1.5 text-[10px] font-semibold leading-none ${na ? 'text-emerald-400' : 'text-slate-600 group-hover:text-slate-400'}`}>
              {section.label}
            </span>
          </>
        )}
      </NavLink>
    );
  }

  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col items-center justify-center w-full py-2.5 rounded-xl transition-all duration-100 select-none outline-none"
      style={{ background: active ? 'rgba(16,185,129,0.08)' : undefined }}
    >
      {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[2px] rounded-r-full bg-emerald-400" />}
      <Icon size={17} className={active ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'} />
      <span className={`mt-1.5 text-[10px] font-semibold leading-none ${active ? 'text-emerald-400' : 'text-slate-600 group-hover:text-slate-400'}`}>
        {section.label}
      </span>
    </button>
  );
}

// ─── Panel Item ───────────────────────────────────────────────────────────────

function PanelNavItem({ item, locked, lockLabel }: { item: PanelItem; locked: boolean; lockLabel?: string }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.href}
      className={({ isActive }) => `
        group relative flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[12.5px] font-medium
        transition-all duration-100 select-none outline-none
        ${isActive
          ? 'bg-white/[0.05] text-white'
          : locked
            ? 'text-slate-600 hover:text-slate-400'
            : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
        }
      `}
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-3.5 w-[2px] rounded-r-full bg-emerald-400" />}
          {Icon && (
            <Icon size={13} className={`flex-shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-600 group-hover:text-slate-400'}`} />
          )}
          <span className="flex-1 truncate">{item.name}</span>
          {item.badge && !locked && (
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md leading-none ${BADGE[item.badgeVariant ?? 'green']}`}>
              {item.badge}
            </span>
          )}
          {locked && <span className="text-[9px] text-amber-500/70">{lockLabel ?? 'Pro'}</span>}
        </>
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
          className="flex flex-col h-full w-[68px] flex-shrink-0 bg-[#0f1117] border-r border-white/[0.05]"
        >
          {/* Logo */}
          <div className="flex items-center justify-center h-[52px] flex-shrink-0 border-b border-white/[0.05]">
            <Link to="/app" aria-label={t('sidebar.a11y.logoHome')}>
              <LogoMark size={26} />
            </Link>
          </div>

          {/* Main rail items */}
          <nav
            aria-label={t('sidebar.a11y.mainNav')}
            className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2 space-y-0.5
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

          {/* Bottom rail */}
          <div className="flex-shrink-0 border-t border-white/[0.05] py-2 px-2 space-y-0.5">
            {BOTTOM_RAIL.map(item => {
              const Icon = item.icon;
              const active = location.pathname.startsWith(item.href);
              return (
                <NavLink
                  key={item.id}
                  to={item.href}
                  className="group flex flex-col items-center justify-center w-full py-2.5 rounded-xl transition-all duration-100"
                  style={{ background: active ? 'rgba(16,185,129,0.08)' : undefined }}
                >
                  <Icon size={16} className={active ? 'text-emerald-400' : 'text-slate-600 group-hover:text-slate-400'} />
                  <span className={`mt-1.5 text-[9.5px] font-semibold ${active ? 'text-emerald-400' : 'text-slate-700 group-hover:text-slate-500'}`}>
                    {item.label}
                  </span>
                </NavLink>
              );
            })}
          </div>

          {/* User menu */}
          <div ref={userMenuRef} className="flex-shrink-0 border-t border-white/[0.05] py-3 flex flex-col items-center relative">
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
            flex flex-col h-full bg-[#141720] border-r border-white/[0.05]
            transition-[width,opacity] duration-200 ease-in-out overflow-hidden
            ${panelSection ? 'w-[216px] opacity-100' : 'w-0 opacity-0'}
          `}
        >
          {panelSection && (
            <>
              {/* Panel header */}
              <div className="flex items-center justify-between px-4 h-[52px] flex-shrink-0 border-b border-white/[0.05]">
                <span className="text-[11px] font-bold text-slate-300 tracking-wide">
                  {panelSection.label}
                </span>
                <button
                  type="button"
                  onClick={() => setOpenSection(null)}
                  className="p-1 rounded-md hover:bg-white/[0.06] text-slate-600 hover:text-slate-400 transition-colors"
                  aria-label={t('sidebar.a11y.closePanel')}
                >
                  <PanelRightClose size={13} aria-hidden="true" />
                </button>
              </div>

              {/* Panel nav */}
              <nav className="flex-1 overflow-y-auto px-2 py-2
                [&::-webkit-scrollbar]:w-[2px]
                [&::-webkit-scrollbar-thumb]:bg-white/10
                [&::-webkit-scrollbar-thumb]:rounded-full">
                <div className="space-y-4">
                  {panelSection.groups?.map((group, gi) => (
                    <div key={gi}>
                      {group.title && (
                        <p className="px-2.5 mb-1 text-[9.5px] font-bold uppercase tracking-[0.12em] text-slate-600">
                          {group.title}
                        </p>
                      )}
                      <div className="space-y-0.5">
                        {group.items.map(item => (
                          <PanelNavItem
                            key={item.href}
                            item={item}
                            locked={isLocked(item)}
                            lockLabel={item.feature ? minPlanFor(item.feature) : undefined}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </nav>

              {/* Plan CTA */}
              {planTier === 'free' && (
                <div className="flex-shrink-0 p-3 border-t border-white/[0.05]">
                  <Link
                    to="/app/billing"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl
                      bg-gradient-to-r from-violet-600/10 to-indigo-600/10
                      border border-violet-500/15 hover:border-violet-500/25
                      transition-all duration-150 group"
                  >
                    <div className="w-5 h-5 rounded-md bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px]">⚡</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold text-violet-300 leading-tight">{t('sidebar.cta.upgradePro')}</p>
                      <p className="text-[9px] text-violet-500/70 leading-tight">{t('sidebar.cta.unlockAll')}</p>
                    </div>
                  </Link>
                </div>
              )}

              {/* User info strip */}
              <div className="flex-shrink-0 px-3 py-2.5 border-t border-white/[0.05] flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-[9px] font-bold text-white">{initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-slate-300 truncate leading-tight">
                    {user?.first_name} {user?.last_name}
                  </p>
                  <p className="text-[9px] truncate leading-tight" style={{ color: plan.color }}>
                    {plan.label}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
