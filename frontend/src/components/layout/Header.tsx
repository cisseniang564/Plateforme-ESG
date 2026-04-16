import { useState, useRef, useEffect, useCallback } from 'react';
import { Bell, Settings, LogOut, CheckCheck, X, AlertTriangle, CheckCircle, Info, User, Menu } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '@/components/LanguageSelector';
import { useNavigate, Link } from 'react-router-dom';
import TourLauncher from '@/components/tour/TourLauncher';
import { notificationsService, type AppNotification } from '@/services/notificationsService';

type FilterType = 'all' | 'unread' | 'alerts';

const POLL_INTERVAL_MS = 30_000; // 30 s

function NotificationIcon({ type }: { type: AppNotification['type'] }) {
  if (type === 'error') {
    return (
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
        <AlertTriangle className="h-4 w-4 text-red-600" />
      </div>
    );
  }
  if (type === 'warning') {
    return (
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
      </div>
    );
  }
  if (type === 'success') {
    return (
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
        <CheckCircle className="h-4 w-4 text-green-600" />
      </div>
    );
  }
  return (
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
      <Info className="h-4 w-4 text-blue-600" />
    </div>
  );
}

interface HeaderProps {
  onMenuToggle?: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  // ── Polling réel toutes les 30 s ──────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    try {
      const data = await notificationsService.list();
      setNotifications(data.items);
      setUnreadCount(data.unread_count);
    } catch {
      // silent — network errors shouldn't disrupt the UI
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchNotifications]);

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    if (filter === 'alerts') return n.type === 'error' || n.type === 'warning';
    return true;
  });

  async function markAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    try { await notificationsService.markAllRead(); } catch { /* silent */ }
  }

  async function markRead(id: string) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    try { await notificationsService.markOneRead(id); } catch { /* silent */ }
  }

  function handleNotificationClick(notif: AppNotification) {
    if (!notif.read) markRead(notif.id);
    setPanelOpen(false);
    navigate(notif.link);
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        bellRef.current &&
        !bellRef.current.contains(e.target as Node)
      ) {
        setPanelOpen(false);
      }
    }
    if (panelOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [panelOpen]);

  const filterLabels: Record<FilterType, string> = {
    all: t('notifications.filterAll', 'Toutes'),
    unread: t('notifications.filterUnread', 'Non lues'),
    alerts: t('notifications.filterAlerts', 'Alertes'),
  };

  return (
    <header className="bg-white sticky top-0 z-30 border-b border-gray-100 px-6 h-[60px] flex items-center shadow-sm shadow-gray-100/50">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center">
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors mr-2"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <LanguageSelector />

          {/* ── Tour guidé ─────────────────────────────────────────────────── */}
          <TourLauncher />

          {/* Bell button with notification panel */}
          <div className="relative">
            <button
              ref={bellRef}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
              onClick={() => setPanelOpen((prev) => !prev)}
              aria-label={t('notifications.title', 'Notifications')}
            >
              <Bell className="h-5 w-5 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-[10px] font-bold leading-none">{unreadCount}</span>
                </span>
              )}
            </button>

            {/* Notification panel */}
            {panelOpen && (
              <div
                ref={panelRef}
                className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50"
              >
                {/* Panel header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 text-sm">
                      {t('notifications.title', 'Notifications')}
                    </span>
                    {unreadCount > 0 && (
                      <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 transition-colors"
                      >
                        <CheckCheck className="h-3 w-3" />
                        {t('notifications.markAllRead', 'Tout marquer lu')}
                      </button>
                    )}
                    <button
                      onClick={() => setPanelOpen(false)}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                    >
                      <X className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>
                </div>

                {/* Filter tabs */}
                <div className="flex gap-1 px-4 py-2 border-b border-gray-100">
                  {(['all', 'unread', 'alerts'] as FilterType[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        filter === f
                          ? 'bg-green-100 text-green-700'
                          : 'text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      {filterLabels[f]}
                    </button>
                  ))}
                </div>

                {/* Notification list */}
                <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
                  {filteredNotifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-gray-400">
                      {t('notifications.noNotifications', 'Aucune notification')}
                    </div>
                  ) : (
                    filteredNotifications.map((notif) => (
                      <button
                        key={String(notif.id)}
                        onClick={() => handleNotificationClick(notif)}
                        className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                          !notif.read ? 'bg-green-50/30' : ''
                        }`}
                      >
                        <NotificationIcon type={notif.type} />
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-medium truncate ${
                              !notif.read ? 'text-gray-900' : 'text-gray-500'
                            }`}
                          >
                            {notif.title}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{notif.body}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{notif.time}</p>
                        </div>
                        {!notif.read && (
                          <span className="flex-shrink-0 mt-1 w-2 h-2 rounded-full bg-green-500" />
                        )}
                      </button>
                    ))
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-gray-100 text-center">
                  <button
                    onClick={() => {
                      setPanelOpen(false);
                      navigate('/app/notifications');
                    }}
                    className="text-xs text-green-600 hover:text-green-700 font-medium transition-colors"
                  >
                    {t('notifications.seeAll', 'Voir toutes les notifications')}
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={() => navigate('/app/settings')}
          >
            <Settings className="h-5 w-5 text-gray-600" />
          </button>

          <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
            <Link to="/app/profile" className="flex items-center gap-2.5 hover:bg-gray-50 rounded-xl px-2 py-1.5 transition-colors group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-white text-xs font-bold">
                  {[user?.first_name?.[0], user?.last_name?.[0]].filter(Boolean).join('') || <User className="h-3.5 w-3.5" />}
                </span>
              </div>
              <div className="text-right hidden md:block">
                <p className="text-sm font-semibold text-gray-900 group-hover:text-green-700 transition-colors leading-tight">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
            </Link>
            <button
              onClick={logout}
              className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
              title="Déconnexion"
            >
              <LogOut className="h-5 w-5 text-gray-500 group-hover:text-red-600" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
