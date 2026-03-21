import { useState } from 'react';
import {
  Bell,
  Settings,
  CheckCheck,
  AlertTriangle,
  CheckCircle,
  Info,
  ChevronDown,
  Mail,
  Webhook,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';

type NotificationType = 'error' | 'warning' | 'success' | 'info';
type FilterType = 'all' | 'unread' | 'byType';
type TypeFilter = 'all' | 'error' | 'warning' | 'success' | 'info';

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
  { id: 1, type: 'error', title: 'SAP SuccessFactors \u2014 Erreur auth', body: 'Token OAuth expir\u00e9. Reconfigurez le connecteur.', time: 'il y a 5 min', read: false, link: '/app/data/connectors' },
  { id: 2, type: 'warning', title: 'Score ESG en baisse', body: 'Le score Environnement a baiss\u00e9 de 3.2 pts ce mois.', time: 'il y a 1h', read: false, link: '/app/dashboard' },
  { id: 3, type: 'success', title: 'Rapport CSRD g\u00e9n\u00e9r\u00e9', body: 'Votre rapport CSRD 2024 est pr\u00eat au t\u00e9l\u00e9chargement.', time: 'il y a 2h', read: false, link: '/app/reports' },
  { id: 4, type: 'info', title: 'Synchronisation termin\u00e9e', body: 'SAP S/4HANA \u2014 1 250 entr\u00e9es synchronis\u00e9es avec succ\u00e8s.', time: 'il y a 3h', read: true, link: '/app/data/connectors' },
  { id: 5, type: 'warning', title: 'Donn\u00e9es manquantes \u2014 Q3 2024', body: '8 indicateurs n\'ont pas de donn\u00e9es pour Q3 2024.', time: 'il y a 5h', read: true, link: '/app/data-entry' },
  { id: 6, type: 'success', title: 'Workday synchronis\u00e9', body: '890 collaborateurs import\u00e9s depuis Workday.', time: 'hier', read: true, link: '/app/data/connectors' },
  { id: 7, type: 'info', title: 'Mise \u00e0 jour plateforme', body: 'Nouveaux connecteurs disponibles : Enedis et EDF Data.', time: 'hier', read: true, link: '/app/data/connectors' },
  { id: 8, type: 'warning', title: 'D\u00e9lai CSRD approche', body: 'Votre rapport CSRD est d\u00fb dans 23 jours.', time: 'il y a 2 jours', read: true, link: '/app/compliance' },
];

interface AlertSetting {
  key: string;
  labelKey: string;
  defaultLabel: string;
  enabled: boolean;
}

const INITIAL_ALERT_SETTINGS: AlertSetting[] = [
  { key: 'connectorErrors', labelKey: 'notifications.connectorErrors', defaultLabel: 'Erreurs de connexion (connecteurs)', enabled: true },
  { key: 'scoreChanges', labelKey: 'notifications.scoreChanges', defaultLabel: 'Variations de score ESG (> \u00b15%)', enabled: true },
  { key: 'reportsGenerated', labelKey: 'notifications.reportsGenerated', defaultLabel: 'Rapports g\u00e9n\u00e9r\u00e9s', enabled: true },
  { key: 'syncUpdates', labelKey: 'notifications.syncUpdates', defaultLabel: 'Nouvelles synchronisations', enabled: true },
  { key: 'regulatoryDeadlines', labelKey: 'notifications.regulatoryDeadlines', defaultLabel: 'D\u00e9lais r\u00e9glementaires (CSRD, SFDR)', enabled: true },
  { key: 'platformUpdates', labelKey: 'notifications.platformUpdates', defaultLabel: 'Mises \u00e0 jour plateforme', enabled: false },
];

function NotificationIcon({ type }: { type: NotificationType }) {
  if (type === 'error') {
    return (
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
        <AlertTriangle className="h-5 w-5 text-red-600" />
      </div>
    );
  }
  if (type === 'warning') {
    return (
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
        <AlertTriangle className="h-5 w-5 text-amber-600" />
      </div>
    );
  }
  if (type === 'success') {
    return (
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
        <CheckCircle className="h-5 w-5 text-green-600" />
      </div>
    );
  }
  return (
    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
      <Info className="h-5 w-5 text-blue-600" />
    </div>
  );
}

function typeBadge(type: NotificationType) {
  const map: Record<NotificationType, { label: string; classes: string }> = {
    error: { label: 'Erreur', classes: 'bg-red-100 text-red-700' },
    warning: { label: 'Avertissement', classes: 'bg-amber-100 text-amber-700' },
    success: { label: 'Succ\u00e8s', classes: 'bg-green-100 text-green-700' },
    info: { label: 'Info', classes: 'bg-blue-100 text-blue-700' },
  };
  const item = map[type];
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${item.classes}`}>
      {item.label}
    </span>
  );
}

export default function NotificationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);
  const [filter, setFilter] = useState<FilterType>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [alertSettings, setAlertSettings] = useState<AlertSetting[]>(INITIAL_ALERT_SETTINGS);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState('');

  const unreadCount = notifications.filter((n) => !n.read).length;

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function markRead(id: number) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  function toggleAlertSetting(key: string) {
    setAlertSettings((prev) =>
      prev.map((s) => (s.key === key ? { ...s, enabled: !s.enabled } : s))
    );
  }

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread' && n.read) return false;
    if (filter === 'byType' && typeFilter !== 'all' && n.type !== typeFilter) return false;
    return true;
  });

  const typeOptions: { value: TypeFilter; label: string }[] = [
    { value: 'all', label: 'Tous les types' },
    { value: 'error', label: 'Erreurs' },
    { value: 'warning', label: 'Avertissements' },
    { value: 'success', label: 'Succ\u00e8s' },
    { value: 'info', label: 'Infos' },
  ];

  const countByType = (type: NotificationType) => notifications.filter(n => n.type === type).length;
  const unreadByType = (type: NotificationType) => notifications.filter(n => n.type === type && !n.read).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Hero */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-700 p-8 text-white shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/15">
              <Bell size={13} />
              {t('notifications.center', 'Centre de notifications')}
            </div>
            <h1 className="mt-4 flex items-center gap-3 text-3xl font-bold tracking-tight">
              <Bell className="h-8 w-8" />
              {t('notifications.center', 'Notifications')}
            </h1>
            <p className="mt-2 text-sm text-white/80">
              {unreadCount > 0
                ? `${unreadCount} ${t('notifications.unread', 'notification(s) non lue(s)')}`
                : t('notifications.allRead', 'Tout est à jour')}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {([
                { type: 'error' as NotificationType, label: t('notifications.typeError', 'Erreurs'), color: 'bg-red-500/20 text-red-200 ring-red-400/30' },
                { type: 'warning' as NotificationType, label: t('notifications.typeWarning', 'Avertissements'), color: 'bg-amber-500/20 text-amber-200 ring-amber-400/30' },
                { type: 'success' as NotificationType, label: t('notifications.typeSuccess', 'Succès'), color: 'bg-emerald-500/20 text-emerald-200 ring-emerald-400/30' },
                { type: 'info' as NotificationType, label: t('notifications.typeInfo', 'Infos'), color: 'bg-blue-500/20 text-blue-200 ring-blue-400/30' },
              ]).map(({ type, label, color }) => {
                const unread = unreadByType(type);
                return (
                  <span key={type} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ${color}`}>
                    {label} · {countByType(type)}
                    {unread > 0 && <span className="font-bold text-white">({unread})</span>}
                  </span>
                );
              })}
            </div>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium px-4 py-2 rounded-xl transition-all"
              >
                <CheckCheck size={14} />
                {t('notifications.markAllRead', 'Tout marquer lu')}
              </button>
            )}
            <button
              onClick={() => navigate('/app/settings')}
              className="flex items-center gap-2 bg-white text-emerald-900 hover:bg-white/90 text-sm font-semibold px-4 py-2 rounded-xl transition-all"
            >
              <Settings size={14} />
              {t('notifications.alertSettings', 'Paramètres')}
            </button>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        {(['all', 'unread', 'byType'] as FilterType[]).map((f) => {
          const labels: Record<FilterType, string> = {
            all: t('notifications.filterAll', 'Toutes'),
            unread: t('notifications.filterUnread', 'Non lues'),
            byType: t('notifications.byType', 'Par type'),
          };
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {labels[f]}
            </button>
          );
        })}

        {/* Type dropdown — only active when byType tab selected */}
        {filter === 'byType' && (
          <div className="relative ml-2">
            <button
              onClick={() => setTypeDropdownOpen((o) => !o)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {typeOptions.find((o) => o.value === typeFilter)?.label ?? 'Tous les types'}
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </button>
            {typeDropdownOpen && (
              <div className="absolute left-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                {typeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setTypeFilter(opt.value);
                      setTypeDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                      typeFilter === opt.value ? 'text-green-600 font-medium' : 'text-gray-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notifications list */}
      <Card>
        <div className="divide-y divide-gray-100">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              {t('notifications.noNotifications', 'Aucune notification')}
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <button
                key={notif.id}
                onClick={() => {
                  markRead(notif.id);
                  navigate(notif.link);
                }}
                className={`w-full text-left flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors ${
                  !notif.read ? 'bg-green-50/40' : ''
                }`}
              >
                <NotificationIcon type={notif.type} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span
                      className={`text-sm font-semibold ${
                        !notif.read ? 'text-gray-900' : 'text-gray-500'
                      }`}
                    >
                      {notif.title}
                    </span>
                    {typeBadge(notif.type)}
                  </div>
                  <p className="text-sm text-gray-600">{notif.body}</p>
                  <p className="text-xs text-gray-400 mt-1">{notif.time}</p>
                </div>
                {!notif.read && (
                  <span className="flex-shrink-0 mt-2 w-2.5 h-2.5 rounded-full bg-green-500" />
                )}
              </button>
            ))
          )}
        </div>
      </Card>

      {/* Notification settings section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {t('notifications.alertSettings', 'Param\u00e8tres de notification')}
        </h2>

        <Card>
          <div className="px-5 py-4 space-y-4">
            {/* Alert category toggles */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Cat\u00e9gories d&apos;alertes</h3>
              <div className="space-y-3">
                {alertSettings.map((setting) => (
                  <div key={setting.key} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">
                      {t(setting.labelKey, setting.defaultLabel)}
                    </span>
                    <button
                      role="switch"
                      aria-checked={setting.enabled}
                      onClick={() => toggleAlertSetting(setting.key)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                        setting.enabled ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          setting.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-4">
              {/* Email notification toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-700">
                    {t('notifications.emailNotifs', 'Notifications par email')}
                  </span>
                </div>
                <button
                  role="switch"
                  aria-checked={emailEnabled}
                  onClick={() => setEmailEnabled((v) => !v)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                    emailEnabled ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      emailEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Webhook URL input */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Webhook className="h-4 w-4 text-gray-500" />
                  <label className="text-sm text-gray-700">
                    {t('notifications.webhookUrl', 'URL Webhook (optionnel)')}
                  </label>
                </div>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://hooks.example.com/notify"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Save button */}
            <div className="flex justify-end pt-2">
              <Button variant="primary" size="sm">
                Enregistrer les pr\u00e9f\u00e9rences
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
