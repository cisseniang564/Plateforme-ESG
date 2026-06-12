/**
 * Header — Clean, minimal, white
 * Height: 52px · Background: #ffffff · Border: #e8ecf0
 */
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Bell, CheckCheck, X,
  AlertTriangle, CheckCircle, Info, Menu, Search,
  User as UserIcon, Settings as SettingsIcon, CreditCard, Webhook, Code2,
  LogOut, ChevronDown, Briefcase, Building2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { notificationsService, type AppNotification } from '@/services/notificationsService';
import ThemeToggle from '@/components/common/ThemeToggle';
import LanguageSelector from '@/components/LanguageSelector';
import CommandPalette from '@/components/common/CommandPalette';

type FilterType = 'all' | 'unread' | 'alerts';
const POLL_INTERVAL_MS = 30_000;

// ─── Notification icon ────────────────────────────────────────────────────────

function NotifIcon({ type }: { type: AppNotification['type'] }) {
  const map = {
    error:   { bg: 'bg-red-50',     icon: <AlertTriangle className="h-3.5 w-3.5 text-red-500" /> },
    warning: { bg: 'bg-amber-50',   icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> },
    success: { bg: 'bg-emerald-50', icon: <CheckCircle   className="h-3.5 w-3.5 text-emerald-500" /> },
    info:    { bg: 'bg-blue-50',    icon: <Info          className="h-3.5 w-3.5 text-blue-500" /> },
  };
  const { bg, icon } = map[type] ?? map.info;
  return (
    <div className={`flex-shrink-0 w-7 h-7 rounded-full ${bg} flex items-center justify-center`}>
      {icon}
    </div>
  );
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

type TFn = (key: string) => string;

function buildRouteLabels(t: TFn): Record<string, string> {
  return {
    '/app':                               t('header.routes.dashboard'),
    '/app/data-entry':                    t('header.routes.dataEntry'),
    '/app/import-csv':                    t('header.routes.importCsv'),
    '/app/my-data':                       t('header.routes.myData'),
    '/app/calculated-metrics':            t('header.routes.calculatedMetrics'),
    '/app/data-export':                   t('header.routes.dataExport'),
    '/app/connectors':                    t('header.routes.connectors'),
    '/app/data-quality':                  t('header.routes.dataQuality'),
    '/app/data/connectors':               t('header.routes.connectorsHub'),
    '/app/indicators':                    t('header.routes.indicators'),
    '/app/materiality':                   t('header.routes.materiality'),
    '/app/risks':                         t('header.routes.risks'),
    '/app/supply-chain':                  t('header.routes.supplyChain'),
    '/app/validation':                    t('header.routes.validation'),
    '/app/audit-trail':                   t('header.routes.auditTrail'),
    '/app/audit/preparation':             t('header.routes.auditPrep'),
    '/app/scores':                        t('header.routes.scores'),
    '/app/scores/history':                t('header.routes.scoresHistory'),
    '/app/scores/calculate':              t('header.routes.scoresCalculate'),
    '/app/benchmarking':                  t('header.routes.benchmarking'),
    '/app/organizations':                 t('header.routes.organizations'),
    '/app/intelligence':                  t('header.routes.intelligence'),
    '/app/ai-insights':                   t('header.routes.aiInsights'),
    '/app/carbon':                        t('header.routes.carbon'),
    '/app/scope3':                        t('header.routes.scope3'),
    '/app/lca':                           t('header.routes.lca'),
    '/app/decarbonation':                 t('header.routes.decarbonation'),
    '/app/climate-scenarios':             t('header.routes.climateScenarios'),
    '/app/esrs-gap':                      t('header.routes.esrsGap'),
    '/app/compliance/esrs-environmental': t('header.routes.esrsEnvironmental'),
    '/app/compliance/esrs-e3-e5':         t('header.routes.esrsE3E5'),
    '/app/compliance/esrs-social':        t('header.routes.esrsSocial'),
    '/app/compliance/esrs-governance':    t('header.routes.esrsGovernance'),
    '/app/taxonomy':                      t('header.routes.taxonomy'),
    '/app/compliance/cdp':                t('header.routes.cdp'),
    '/app/compliance/csddd':              t('header.routes.csddd'),
    '/app/tcfd':                          t('header.routes.tcfd'),
    '/app/compliance/sfdr':               t('header.routes.sfdr'),
    '/app/compliance/sbti':               t('header.routes.sbti'),
    '/app/compliance/ixbrl':              t('header.routes.ixbrl'),
    '/app/compliance/gri':                t('header.routes.gri'),
    '/app/compliance/bcorp':              t('header.routes.bcorp'),
    '/app/compliance':                    t('header.routes.compliance'),
    '/app/sdgs':                          t('header.routes.sdgs'),
    '/app/stakeholders':                  t('header.routes.stakeholders'),
    '/app/investor-relations':            t('header.routes.investorRelations'),
    '/app/reports':                       t('header.routes.reports'),
    '/app/reports/list':                  t('header.routes.reportList'),
    '/app/reports/csrd-builder':          t('header.routes.csrdBuilder'),
    '/app/reports/dpef':                  t('header.routes.dpef'),
    '/app/reports/generate':              t('header.routes.generateReport'),
    '/app/reports/scheduled':             t('header.routes.scheduledReports'),
    '/app/reports/multi-standards':       t('header.routes.multiStandards'),
    '/app/settings':                      t('header.routes.settings'),
    '/app/settings/users':                t('header.routes.settingsUsers'),
    '/app/settings/methodology':          t('header.routes.settingsMethodology'),
    '/app/settings/webhooks':             t('header.routes.settingsWebhooks'),
    '/app/settings/integrations':         t('header.routes.settingsIntegrations'),
    '/app/settings/insee':                t('header.routes.settingsInsee'),
    '/app/settings/esg-enrichment':       t('header.routes.settingsEsgEnrichment'),
    '/app/billing':                       t('header.routes.billing'),
    '/app/api-docs':                      t('header.routes.apiDocs'),
    '/app/cabinet':                       t('header.routes.cabinet'),
    '/app/notifications':                 t('header.routes.notifications'),
    '/app/profile':                       t('header.routes.profile'),
  };
}

function usePageTitle() {
  const { t } = useTranslation();
  const location = useLocation();
  const labels = useMemo(() => buildRouteLabels(t), [t]);
  if (labels[location.pathname]) return labels[location.pathname];
  let best = '';
  for (const key of Object.keys(labels)) {
    if (location.pathname.startsWith(key) && key.length > best.length) best = key;
  }
  return labels[best] ?? 'ESG Flow';
}

// ─── Header ───────────────────────────────────────────────────────────────────

interface HeaderProps {
  onMenuToggle?: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const pageTitle = usePageTitle();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef  = useRef<HTMLButtonElement>(null);
  const userMenuRef    = useRef<HTMLDivElement>(null);
  const userButtonRef  = useRef<HTMLButtonElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await notificationsService.list();
      setNotifications(data.items);
      setUnreadCount(data.unread_count);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchNotifications]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        bellRef.current  && !bellRef.current.contains(e.target as Node)
      ) setPanelOpen(false);
    }
    if (panelOpen) document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [panelOpen]);

  // Click-outside for the user dropdown (Settings + Profile + Billing + Logout)
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (
        userMenuRef.current   && !userMenuRef.current.contains(e.target as Node) &&
        userButtonRef.current && !userButtonRef.current.contains(e.target as Node)
      ) setUserMenuOpen(false);
    }
    if (userMenuOpen) document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [userMenuOpen]);

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(o => !o);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'alerts') return n.type === 'error' || n.type === 'warning';
    return true;
  });

  async function markAllRead() {
    setNotifications(p => p.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    try { await notificationsService.markAllRead(); } catch { /* silent */ }
  }

  async function markRead(id: string) {
    setNotifications(p => p.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(p => Math.max(0, p - 1));
    try { await notificationsService.markOneRead(id); } catch { /* silent */ }
  }

  function handleNotifClick(n: AppNotification) {
    if (!n.read) markRead(n.id);
    setPanelOpen(false);
    navigate(n.link);
  }

  const initials = [user?.first_name?.[0], user?.last_name?.[0]].filter(Boolean).join('') || '?';

  return (
    <header className="flex-shrink-0 bg-white dark:bg-gray-900 sticky top-0 z-30 border-b border-[#e8ecf0] dark:border-gray-800 h-[52px] flex items-center px-5">
      <div className="flex items-center w-full gap-4">

        {/* ── Left: mobile toggle + page title ────────────────────────────── */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            aria-label={t('header.a11y.openMenu')}
            aria-controls="app-sidebar"
          >
            <Menu className="h-4 w-4 text-gray-600" aria-hidden="true" />
          </button>
          <h1 className="text-[14px] font-semibold text-gray-800 tracking-tight truncate">
            {pageTitle}
          </h1>
        </div>

        {/* ── Center: search ───────────────────────────────────────────────── */}
        <button
          onClick={() => setSearchOpen(true)}
          aria-label={t('header.a11y.openSearch')}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors text-[12px] text-gray-400 w-[220px]"
        >
          <Search className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" aria-hidden="true" />
          <span className="flex-1 text-left">{t('header.search.placeholder')}</span>
          <kbd className="hidden lg:inline-flex items-center gap-0.5 text-[10px] font-medium text-gray-400 bg-white border border-gray-200 rounded px-1.5 py-0.5">
            ⌘K
          </kbd>
        </button>

        {/* ── Right: actions ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-1">

          {/* Language selector (FR / EN) — disabled for now */}
          {/* <LanguageSelector /> */}

          {/* Theme toggle (light / dark) */}
          <div className="mr-1">
            <ThemeToggle />
          </div>

          {/* Bell */}
          <div className="relative">
            <button
              ref={bellRef}
              onClick={() => setPanelOpen(p => !p)}
              className="relative p-2 hover:bg-gray-50 rounded-lg transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4 text-gray-500" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
              )}
            </button>

            {/* Notification panel */}
            {panelOpen && (
              <div
                ref={panelRef}
                className="absolute right-0 top-full mt-2 w-[360px] bg-white rounded-xl shadow-lg border border-gray-100 z-50"
                style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-gray-900">{t('header.notifications.title')}</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-700 font-medium px-2 py-1 rounded-lg hover:bg-emerald-50 transition-colors"
                      >
                        <CheckCheck className="h-3 w-3" />
                        {t('header.notifications.markAllRead')}
                      </button>
                    )}
                    <button onClick={() => setPanelOpen(false)} className="p-1 hover:bg-gray-100 rounded-md transition-colors">
                      <X className="h-3.5 w-3.5 text-gray-400" />
                    </button>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex gap-1 px-4 py-2 border-b border-gray-100">
                  {(['all', 'unread', 'alerts'] as FilterType[]).map(f => {
                    const labels: Record<FilterType, string> = { all: t('header.notifications.filterAll'), unread: t('header.notifications.filterUnread'), alerts: t('header.notifications.filterAlerts') };
                    return (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                          filter === f ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {labels[f]}
                      </button>
                    );
                  })}
                </div>

                {/* List */}
                <div className="max-h-[320px] overflow-y-auto divide-y divide-gray-50">
                  {filtered.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <Bell className="h-7 w-7 text-gray-200 mx-auto mb-2" />
                      <p className="text-[12px] text-gray-400">{t('header.notifications.empty')}</p>
                    </div>
                  ) : (
                    filtered.map(notif => (
                      <button
                        key={String(notif.id)}
                        onClick={() => handleNotifClick(notif)}
                        className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${!notif.read ? 'bg-emerald-50/30' : ''}`}
                      >
                        <NotifIcon type={notif.type} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-[12px] font-semibold truncate ${!notif.read ? 'text-gray-900' : 'text-gray-600'}`}>
                            {notif.title}
                          </p>
                          <p className="text-[11px] text-gray-400 truncate mt-0.5">{notif.body}</p>
                          <p className="text-[10px] text-gray-300 mt-0.5">{notif.time}</p>
                        </div>
                        {!notif.read && <span className="flex-shrink-0 mt-2 w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                      </button>
                    ))
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2.5 border-t border-gray-100">
                  <button
                    onClick={() => { setPanelOpen(false); navigate('/app/notifications'); }}
                    className="w-full text-[11px] text-gray-500 hover:text-gray-800 font-medium text-center py-1 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {t('header.notifications.viewAll')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Separator */}
          <div className="w-px h-5 bg-gray-200 mx-1" />

          {/* User dropdown — contains Profile, Settings, Billing, Logout */}
          <div className="relative">
            <button
              ref={userButtonRef}
              onClick={() => setUserMenuOpen(o => !o)}
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
              className="flex items-center gap-2 hover:bg-gray-50 rounded-lg px-2 py-1.5 transition-colors group"
            >
              <div className="w-7 h-7 rounded-[8px] bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-[11px] font-bold leading-none">{initials}</span>
              </div>
              <div className="hidden md:block leading-tight text-left">
                <p className="text-[12px] font-semibold text-gray-800 group-hover:text-gray-900 transition-colors">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-[10px] text-gray-400 truncate max-w-[110px]">{user?.email}</p>
              </div>
              <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {userMenuOpen && (
              <div
                ref={userMenuRef}
                role="menu"
                className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-dropdown z-50 overflow-hidden"
              >
                {/* User identity header */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">{user?.first_name} {user?.last_name}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>

                {/* Compte */}
                <UserMenuSection title={t('header.userMenu.myAccount')}>
                  <UserMenuItem icon={UserIcon}      label={t('header.userMenu.profile')}         to="/app/profile"  onClose={() => setUserMenuOpen(false)} />
                  <UserMenuItem icon={CreditCard}    label={t('header.userMenu.billing')}          to="/app/billing"  onClose={() => setUserMenuOpen(false)} />
                  <UserMenuItem icon={Building2}     label={t('header.userMenu.cabinet')}           to="/app/cabinet"  onClose={() => setUserMenuOpen(false)} />
                </UserMenuSection>

                {/* Espace de travail */}
                <UserMenuSection title={t('header.userMenu.workspace')}>
                  <UserMenuItem icon={SettingsIcon}  label={t('header.userMenu.generalSettings')}  to="/app/settings"             onClose={() => setUserMenuOpen(false)} />
                  <UserMenuItem icon={UserIcon}      label={t('header.userMenu.users')}             to="/app/settings/users"       onClose={() => setUserMenuOpen(false)} />
                  <UserMenuItem icon={Briefcase}     label={t('header.userMenu.methodology')}       to="/app/settings/methodology" onClose={() => setUserMenuOpen(false)} />
                </UserMenuSection>

                {/* Développeurs */}
                <UserMenuSection title={t('header.userMenu.developers')}>
                  <UserMenuItem icon={Code2}         label={t('header.userMenu.apiDocs')}           to="/app/api-docs"            onClose={() => setUserMenuOpen(false)} />
                  <UserMenuItem icon={Webhook}       label={t('header.userMenu.webhooks')}          to="/app/settings/webhooks"   onClose={() => setUserMenuOpen(false)} />
                </UserMenuSection>

                {/* Logout */}
                <div className="border-t border-gray-100 py-1">
                  <button
                    onClick={() => { setUserMenuOpen(false); logout(); }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors"
                    role="menuitem"
                  >
                    <LogOut className="h-4 w-4" />
                    {t('header.userMenu.logout')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Command palette (⌘K) */}
      <CommandPalette isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}

// ─── User dropdown helpers ────────────────────────────────────────────────────

function UserMenuSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-1 border-b border-gray-100 last:border-b-0">
      <p className="px-4 pt-2 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
        {title}
      </p>
      {children}
    </div>
  );
}

function UserMenuItem({
  icon: Icon, label, to, onClose,
}: { icon: any; label: string; to: string; onClose: () => void }) {
  return (
    <Link
      to={to}
      onClick={onClose}
      role="menuitem"
      className="flex items-center gap-2.5 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
    >
      <Icon className="h-4 w-4 text-gray-400 flex-shrink-0" />
      <span>{label}</span>
    </Link>
  );
}
