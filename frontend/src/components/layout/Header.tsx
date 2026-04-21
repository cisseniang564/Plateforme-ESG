import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bell, Settings, LogOut, CheckCheck, X,
  AlertTriangle, CheckCircle, Info, Menu,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '@/components/LanguageSelector';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import TourLauncher from '@/components/tour/TourLauncher';
import { notificationsService, type AppNotification } from '@/services/notificationsService';

type FilterType = 'all' | 'unread' | 'alerts';
const POLL_INTERVAL_MS = 30_000;

// ─── Notification icon ────────────────────────────────────────────────────────

function NotifIcon({ type }: { type: AppNotification['type'] }) {
  const map = {
    error:   { bg: 'bg-red-100',   icon: <AlertTriangle className="h-3.5 w-3.5 text-red-600" /> },
    warning: { bg: 'bg-amber-100', icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> },
    success: { bg: 'bg-emerald-100', icon: <CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> },
    info:    { bg: 'bg-blue-100',  icon: <Info className="h-3.5 w-3.5 text-blue-600" /> },
  };
  const { bg, icon } = map[type] ?? map.info;
  return (
    <div className={`flex-shrink-0 w-7 h-7 rounded-full ${bg} flex items-center justify-center`}>
      {icon}
    </div>
  );
}

// ─── Breadcrumb helper ────────────────────────────────────────────────────────

const ROUTE_LABELS: Record<string, string> = {
  '/app': 'Tableau de bord',
  '/app/data-entry': 'Saisie manuelle',
  '/app/import-csv': 'Import CSV',
  '/app/my-data': 'Mes données',
  '/app/calculated-metrics': 'Calculs auto',
  '/app/data-export': 'Export données',
  '/app/data/connectors': 'Connecteurs',
  '/app/data-quality': 'Qualité des données',
  '/app/indicators': 'Indicateurs',
  '/app/materiality': 'Matrice de matérialité',
  '/app/risks': 'Registre des risques',
  '/app/supply-chain': 'Supply Chain ESG',
  '/app/validation': 'Workflow de validation',
  '/app/audit-trail': "Piste d'audit",
  '/app/scores': 'Scores ESG',
  '/app/analytics': 'Analyses & IA',
  '/app/benchmarking': 'Benchmarking',
  '/app/carbon': 'Bilan carbone',
  '/app/carbon-plan': 'Plan décarbonation',
  '/app/compliance': 'Conformité',
  '/app/esrs': 'Analyse ESRS / DMA',
  '/app/taxonomy': 'Taxonomie UE',
  '/app/reports': 'Rapports',
  '/app/reports/generate': 'Générer un rapport',
  '/app/settings': 'Paramètres',
  '/app/settings/users': 'Gestion utilisateurs',
  '/app/billing': 'Facturation',
  '/app/notifications': 'Notifications',
  '/app/profile': 'Mon profil',
};

function usePageTitle() {
  const location = useLocation();
  // exact match first, then longest prefix
  if (ROUTE_LABELS[location.pathname]) return ROUTE_LABELS[location.pathname];
  let best = '';
  for (const key of Object.keys(ROUTE_LABELS)) {
    if (location.pathname.startsWith(key) && key.length > best.length) best = key;
  }
  return ROUTE_LABELS[best] ?? 'ESGFlow';
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

  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef  = useRef<HTMLButtonElement>(null);

  // ── Polling ──────────────────────────────────────────────────────────────
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

  // ── Click outside to close panel ─────────────────────────────────────────
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

  const filterLabels: Record<FilterType, string> = {
    all:    t('notifications.filterAll',    'Toutes'),
    unread: t('notifications.filterUnread', 'Non lues'),
    alerts: t('notifications.filterAlerts', 'Alertes'),
  };

  const initials = [user?.first_name?.[0], user?.last_name?.[0]].filter(Boolean).join('') || '?';

  return (
    <header className="flex-shrink-0 bg-white/90 backdrop-blur-md sticky top-0 z-30 border-b border-[#e8ecf0] shadow-header px-5 h-[60px] flex items-center">
      <div className="flex items-center justify-between w-full gap-4">

        {/* ── Left: mobile toggle + page title ── */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="hidden lg:block text-[15px] font-semibold text-gray-800 tracking-tight truncate">
            {pageTitle}
          </h1>
        </div>

        {/* ── Right: actions ── */}
        <div className="flex items-center gap-1">
          <LanguageSelector />
          <TourLauncher />

          {/* ── Bell ── */}
          <div className="relative">
            <button
              ref={bellRef}
              onClick={() => setPanelOpen(p => !p)}
              className="relative p-2 hover:bg-gray-100 rounded-xl transition-colors"
              aria-label={t('notifications.title', 'Notifications')}
            >
              <Bell className="h-[18px] w-[18px] text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-[9px] font-bold leading-none tabular-nums">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                </span>
              )}
            </button>

            {/* ── Notification panel ── */}
            {panelOpen && (
              <div
                ref={panelRef}
                className="absolute right-0 top-full mt-2 w-[380px] bg-white rounded-2xl shadow-dropdown border border-[#e8ecf0] z-50 animate-scale-in"
              >
                {/* Panel header */}
                <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#f0f4f8]">
                  <div className="flex items-center gap-2.5">
                    <span className="font-semibold text-gray-900 text-sm">
                      {t('notifications.title', 'Notifications')}
                    </span>
                    {unreadCount > 0 && (
                      <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium px-2 py-1 rounded-lg hover:bg-primary-50 transition-colors"
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                        {t('notifications.markAllRead', 'Tout lu')}
                      </button>
                    )}
                    <button
                      onClick={() => setPanelOpen(false)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="h-3.5 w-3.5 text-gray-500" />
                    </button>
                  </div>
                </div>

                {/* Filter tabs */}
                <div className="flex gap-1 px-4 py-2.5 border-b border-[#f0f4f8]">
                  {(['all', 'unread', 'alerts'] as FilterType[]).map(f => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                        filter === f
                          ? 'bg-primary-600 text-white shadow-sm'
                          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                      }`}
                    >
                      {filterLabels[f]}
                    </button>
                  ))}
                </div>

                {/* List */}
                <div className="max-h-[340px] overflow-y-auto divide-y divide-[#f8fafc]">
                  {filtered.length === 0 ? (
                    <div className="px-4 py-10 text-center">
                      <Bell className="h-8 w-8 text-gray-200 mx-auto mb-3" />
                      <p className="text-sm text-gray-400 font-medium">
                        {t('notifications.noNotifications', 'Aucune notification')}
                      </p>
                    </div>
                  ) : (
                    filtered.map(notif => (
                      <button
                        key={String(notif.id)}
                        onClick={() => handleNotifClick(notif)}
                        className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-gray-50/80 transition-colors ${
                          !notif.read ? 'bg-primary-50/30' : ''
                        }`}
                      >
                        <NotifIcon type={notif.type} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold truncate ${!notif.read ? 'text-gray-900' : 'text-gray-600'}`}>
                            {notif.title}
                          </p>
                          <p className="text-xs text-gray-500 truncate mt-0.5">{notif.body}</p>
                          <p className="text-[10px] text-gray-400 mt-1">{notif.time}</p>
                        </div>
                        {!notif.read && (
                          <span className="flex-shrink-0 mt-1.5 w-2 h-2 rounded-full bg-primary-500 ring-2 ring-primary-100" />
                        )}
                      </button>
                    ))
                  )}
                </div>

                {/* Panel footer */}
                <div className="px-4 py-3 border-t border-[#f0f4f8]">
                  <button
                    onClick={() => { setPanelOpen(false); navigate('/app/notifications'); }}
                    className="w-full text-xs text-primary-600 hover:text-primary-700 font-semibold text-center py-1.5 rounded-lg hover:bg-primary-50 transition-colors"
                  >
                    {t('notifications.seeAll', 'Voir toutes les notifications')} →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Settings ── */}
          <button
            onClick={() => navigate('/app/settings')}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            title="Paramètres"
          >
            <Settings className="h-[18px] w-[18px] text-gray-600" />
          </button>

          {/* ── User ── */}
          <div className="flex items-center gap-1 pl-3 border-l border-[#e8ecf0] ml-1">
            <Link
              to="/app/profile"
              className="flex items-center gap-2.5 hover:bg-gray-50 rounded-xl px-2.5 py-1.5 transition-colors group"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-sm ring-2 ring-white">
                <span className="text-white text-xs font-bold leading-none">{initials}</span>
              </div>
              <div className="hidden md:block text-right">
                <p className="text-[13px] font-semibold text-gray-900 group-hover:text-primary-700 transition-colors leading-tight">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-[11px] text-gray-400 leading-none mt-0.5 truncate max-w-[140px]">{user?.email}</p>
              </div>
            </Link>
            <button
              onClick={logout}
              className="p-2 hover:bg-red-50 rounded-xl transition-colors group"
              title="Déconnexion"
            >
              <LogOut className="h-[17px] w-[17px] text-gray-400 group-hover:text-red-500 transition-colors" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
