import { useState, useEffect, useCallback } from 'react';
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
  Loader2,
  Zap,
  ChevronRight,
  XCircle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import BackButton from '@/components/common/BackButton';
import api from '@/services/api';
import { notificationsService, type AppNotification } from '@/services/notificationsService';
import toast from 'react-hot-toast';

type FilterType = 'all' | 'unread' | 'byType';
type TypeFilter = 'all' | 'error' | 'warning' | 'success' | 'info';

interface AlertSetting {
  key: string;
  labelKey: string;
  defaultLabel: string;
  enabled: boolean;
}

const INITIAL_ALERT_SETTINGS: AlertSetting[] = [
  { key: 'connectorErrors', labelKey: 'notifications.connectorErrors', defaultLabel: 'Erreurs de connexion (connecteurs)', enabled: true },
  { key: 'scoreChanges', labelKey: 'notifications.scoreChanges', defaultLabel: 'Variations de score ESG (> ±5%)', enabled: true },
  { key: 'reportsGenerated', labelKey: 'notifications.reportsGenerated', defaultLabel: 'Rapports générés', enabled: true },
  { key: 'syncUpdates', labelKey: 'notifications.syncUpdates', defaultLabel: 'Nouvelles synchronisations', enabled: true },
  { key: 'regulatoryDeadlines', labelKey: 'notifications.regulatoryDeadlines', defaultLabel: 'Délais réglementaires (CSRD, SFDR)', enabled: true },
  { key: 'platformUpdates', labelKey: 'notifications.platformUpdates', defaultLabel: 'Mises à jour plateforme', enabled: false },
];

function NotificationIcon({ type }: { type: AppNotification['type'] }) {
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

function typeBadge(type: AppNotification['type']) {
  const map: Record<AppNotification['type'], { label: string; classes: string }> = {
    error: { label: 'Erreur', classes: 'bg-red-100 text-red-700' },
    warning: { label: 'Avertissement', classes: 'bg-amber-100 text-amber-700' },
    success: { label: 'Succès', classes: 'bg-green-100 text-green-700' },
    info: { label: 'Info', classes: 'bg-blue-100 text-blue-700' },
  };
  const item = map[type];
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${item.classes}`}>
      {item.label}
    </span>
  );
}

// ─── Smart alert types ─────────────────────────────────────────────────────────
interface SmartAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  pillar?: string | null;
  action_label: string;
  action_href: string;
}

interface SmartAlertsData {
  alerts: SmartAlert[];
  total: number;
  critical_count: number;
  warning_count: number;
}

const SMART_ALERT_STYLES = {
  critical: { bg: 'bg-red-50', border: 'border-red-200', icon: XCircle, iconColor: 'text-red-500', titleColor: 'text-red-800', msgColor: 'text-red-600', btnColor: 'bg-red-600 hover:bg-red-700 text-white' },
  warning:  { bg: 'bg-amber-50', border: 'border-amber-200', icon: AlertTriangle, iconColor: 'text-amber-500', titleColor: 'text-amber-800', msgColor: 'text-amber-600', btnColor: 'bg-amber-500 hover:bg-amber-600 text-white' },
  info:     { bg: 'bg-blue-50', border: 'border-blue-200', icon: Info, iconColor: 'text-blue-500', titleColor: 'text-blue-800', msgColor: 'text-blue-600', btnColor: 'bg-blue-600 hover:bg-blue-700 text-white' },
};

export default function NotificationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [alertSettings, setAlertSettings] = useState<AlertSetting[]>(INITIAL_ALERT_SETTINGS);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [smartAlerts, setSmartAlerts] = useState<SmartAlertsData | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await notificationsService.list();
      setNotifications(data.items);
    } catch {
      // silent — network errors shouldn't block the UI
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSmartAlerts = useCallback(async () => {
    try {
      const res = await api.get('/smart-alerts');
      setSmartAlerts(res.data);
    } catch {
      // silent — smart alerts are optional enrichment
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    fetchSmartAlerts();
    // Charger les préférences sauvegardées
    api.get('/notifications/preferences').then(res => {
      const prefs = res.data;
      if (prefs?.alerts?.length) {
        // Mapper les préférences backend → format frontend
        setAlertSettings(prev => prev.map(s => {
          const match = prefs.alerts.find((a: any) =>
            a.id === s.key ||
            a.id?.replace(/_/g, '') === s.key?.replace(/_/g, '')
          );
          return match ? { ...s, enabled: match.enabled } : s;
        }));
      }
      if (typeof prefs?.email_enabled === 'boolean') setEmailEnabled(prefs.email_enabled);
      if (prefs?.webhook_url) setWebhookUrl(prefs.webhook_url);
    }).catch(() => {/* garder les valeurs par défaut */});
  }, [fetchNotifications]);

  const handleSavePreferences = async () => {
    setSavingPrefs(true);
    try {
      await api.put('/notifications/preferences', {
        alerts: alertSettings.map(s => ({
          id: s.key,
          label: s.defaultLabel,
          description: s.defaultLabel,
          enabled: s.enabled,
          channel: 'both',
        })),
        email_enabled: emailEnabled,
        webhook_url: webhookUrl,
      });
      toast.success('Préférences de notification enregistrées');
    } catch {
      toast.error('Impossible de sauvegarder les préférences');
    } finally {
      setSavingPrefs(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try { await notificationsService.markAllRead(); } catch { /* silent */ }
  }

  async function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try { await notificationsService.markOneRead(id); } catch { /* silent */ }
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
    { value: 'success', label: 'Succès' },
    { value: 'info', label: 'Infos' },
  ];

  const countByType = (type: AppNotification['type']) => notifications.filter(n => n.type === type).length;
  const unreadByType = (type: AppNotification['type']) => notifications.filter(n => n.type === type && !n.read).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <BackButton label="Retour" />
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
              {loading
                ? t('notifications.loading', 'Chargement…')
                : unreadCount > 0
                  ? `${unreadCount} ${t('notifications.unread', 'notification(s) non lue(s)')}`
                  : t('notifications.allRead', 'Tout est à jour')}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {([
                { type: 'error' as AppNotification['type'], label: t('notifications.typeError', 'Erreurs'), color: 'bg-red-500/20 text-red-200 ring-red-400/30' },
                { type: 'warning' as AppNotification['type'], label: t('notifications.typeWarning', 'Avertissements'), color: 'bg-amber-500/20 text-amber-200 ring-amber-400/30' },
                { type: 'success' as AppNotification['type'], label: t('notifications.typeSuccess', 'Succès'), color: 'bg-emerald-500/20 text-emerald-200 ring-emerald-400/30' },
                { type: 'info' as AppNotification['type'], label: t('notifications.typeInfo', 'Infos'), color: 'bg-blue-500/20 text-blue-200 ring-blue-400/30' },
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

      {/* ── Alertes intelligentes ── */}
      {smartAlerts && smartAlerts.total > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-violet-600" />
            <h2 className="text-sm font-semibold text-gray-900">
              Alertes intelligentes
            </h2>
            {smartAlerts.critical_count > 0 && (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                {smartAlerts.critical_count} critique{smartAlerts.critical_count > 1 ? 's' : ''}
              </span>
            )}
            {smartAlerts.warning_count > 0 && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
                {smartAlerts.warning_count} avertissement{smartAlerts.warning_count > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="space-y-2">
            {smartAlerts.alerts.map(alert => {
              const style = SMART_ALERT_STYLES[alert.type] || SMART_ALERT_STYLES.info;
              const Icon = style.icon;
              return (
                <div key={alert.id} className={`flex items-start gap-3 p-4 rounded-xl border ${style.bg} ${style.border}`}>
                  <Icon size={18} className={`flex-shrink-0 mt-0.5 ${style.iconColor}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${style.titleColor}`}>{alert.title}</p>
                    <p className={`text-xs mt-0.5 ${style.msgColor}`}>{alert.message}</p>
                  </div>
                  <button
                    onClick={() => navigate(alert.action_href)}
                    className={`flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${style.btnColor}`}
                  >
                    {alert.action_label}
                    <ChevronRight size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
          {loading ? (
            <div className="py-12 flex items-center justify-center gap-2 text-gray-400 text-sm">
              <Loader2 className="h-5 w-5 animate-spin" />
              {t('notifications.loading', 'Chargement des notifications…')}
            </div>
          ) : filteredNotifications.length === 0 ? (
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
          {t('notifications.alertSettings', 'Paramètres de notification')}
        </h2>

        <Card>
          <div className="px-5 py-4 space-y-4">
            {/* Alert category toggles */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Catégories d&apos;alertes</h3>
              <div className="space-y-3">
                {alertSettings.map((setting) => (
                  <div key={setting.key} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">
                      {t(setting.labelKey, setting.defaultLabel)}
                    </span>
                    <button
                      role="switch"
                      aria-checked={setting.enabled}
                      onClick={() =>
                        setAlertSettings((prev) =>
                          prev.map((s) => (s.key === setting.key ? { ...s, enabled: !s.enabled } : s))
                        )
                      }
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
              <Button
                variant="primary"
                size="sm"
                onClick={handleSavePreferences}
                disabled={savingPrefs}
              >
                {savingPrefs
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2 inline" />Enregistrement…</>
                  : 'Enregistrer les préférences'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
