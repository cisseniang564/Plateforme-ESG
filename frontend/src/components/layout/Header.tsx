import { useState, useRef, useEffect } from 'react';
import { Bell, Settings, LogOut, CheckCheck, X, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '@/components/LanguageSelector';
import { useNavigate } from 'react-router-dom';

type NotificationType = 'error' | 'warning' | 'success' | 'info';
type FilterType = 'all' | 'unread' | 'alerts';

interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  body: string;
  time: string;
  read: boolean;
  link: string;
}

const INITIAL_NOTIFICATIONS: Notification[] = [
  { id: 1, type: 'error', title: 'SAP SuccessFactors — Erreur auth', body: 'Token OAuth expir\u00e9. Reconfigurez le connecteur.', time: 'il y a 5 min', read: false, link: '/app/data/connectors' },
  { id: 2, type: 'warning', title: 'Score ESG en baisse', body: 'Le score Environnement a baiss\u00e9 de 3.2 pts ce mois.', time: 'il y a 1h', read: false, link: '/app/dashboard' },
  { id: 3, type: 'success', title: 'Rapport CSRD g\u00e9n\u00e9r\u00e9', body: 'Votre rapport CSRD 2024 est pr\u00eat au t\u00e9l\u00e9chargement.', time: 'il y a 2h', read: false, link: '/app/reports' },
  { id: 4, type: 'info', title: 'Synchronisation termin\u00e9e', body: 'SAP S/4HANA \u2014 1 250 entr\u00e9es synchronis\u00e9es avec succ\u00e8s.', time: 'il y a 3h', read: true, link: '/app/data/connectors' },
  { id: 5, type: 'warning', title: 'Donn\u00e9es manquantes \u2014 Q3 2024', body: '8 indicateurs n\'ont pas de donn\u00e9es pour Q3 2024.', time: 'il y a 5h', read: true, link: '/app/data-entry' },
  { id: 6, type: 'success', title: 'Workday synchronis\u00e9', body: '890 collaborateurs import\u00e9s depuis Workday.', time: 'hier', read: true, link: '/app/data/connectors' },
  { id: 7, type: 'info', title: 'Mise \u00e0 jour plateforme', body: 'Nouveaux connecteurs disponibles : Enedis et EDF Data.', time: 'hier', read: true, link: '/app/data/connectors' },
  { id: 8, type: 'warning', title: 'D\u00e9lai CSRD approche', body: 'Votre rapport CSRD est d\u00fb dans 23 jours.', time: 'il y a 2 jours', read: true, link: '/app/compliance' },
];

function NotificationIcon({ type }: { type: NotificationType }) {
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

export default function Header() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);
  const [panelOpen, setPanelOpen] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    if (filter === 'alerts') return n.type === 'error' || n.type === 'warning';
    return true;
  });

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function markRead(id: number) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  function handleNotificationClick(notif: Notification) {
    markRead(notif.id);
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
    if (panelOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [panelOpen]);

  const filterLabels: Record<FilterType, string> = {
    all: t('notifications.filterAll', 'Toutes'),
    unread: t('notifications.filterUnread', 'Non lues'),
    alerts: t('notifications.filterAlerts', 'Alertes'),
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">ESGFlow</h2>
        </div>

        <div className="flex items-center gap-4">
          <LanguageSelector />

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
                        key={notif.id}
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

          <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
              title="D\u00e9connexion"
            >
              <LogOut className="h-5 w-5 text-gray-600 group-hover:text-red-600" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
