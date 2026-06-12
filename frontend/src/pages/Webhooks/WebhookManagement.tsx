import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Webhook as WebhookIcon,
  Plus,
  Trash2,
  Activity,
  CheckCircle,
  ExternalLink,
  ArrowLeft,
  Zap,
  BarChart3,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Power,
  PowerOff,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Spinner from '@/components/common/Spinner';
import CreateWebhookModal from '@/components/modals/CreateWebhookModal';
import api from '@/services/api';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import i18n from '@/i18n/config';

const dateLocale = () => (i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR');
const numLocale  = () => (i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR');

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  total_calls: number;
  success_calls: number;
  success_rate: number;
  last_called_at: string | null;
  last_error: string | null;
  created_at: string;
}

interface WebhookEvent {
  type: string;
  description: string;
}

// Static maps so Tailwind JIT actually generates these classes
const EVENT_BADGE: Record<string, string> = {
  data:      'bg-blue-50 text-blue-700 border-blue-200',
  score:     'bg-purple-50 text-purple-700 border-purple-200',
  indicator: 'bg-teal-50 text-teal-700 border-teal-200',
  user:      'bg-orange-50 text-orange-700 border-orange-200',
  threshold: 'bg-red-50 text-red-700 border-red-200',
};

const STAT_TILE: Record<string, { bg: string; text: string }> = {
  gray:   { bg: 'bg-gray-50 border-gray-100',     text: 'text-gray-700' },
  green:  { bg: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-700' },
  red:    { bg: 'bg-red-50 border-red-100',       text: 'text-red-700' },
  yellow: { bg: 'bg-amber-50 border-amber-100',   text: 'text-amber-700' },
};

function eventColor(type: string) {
  return EVENT_BADGE[type.split('.')[0]] ?? 'bg-gray-50 text-gray-700 border-gray-200';
}

function formatRelativeTime(iso: string | null, t: TFunction) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('webhook.relNow', "à l'instant");
  if (mins < 60) return t('webhook.relMins', 'il y a {{n}} min', { n: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('webhook.relHours', 'il y a {{n}}h', { n: hours });
  return t('webhook.relDays', 'il y a {{n}}j', { n: Math.floor(hours / 24) });
}

function CopyButton({ value }: { value: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors flex-shrink-0"
      title={t('webhook.copyUrl',"Copier l'URL")}
      aria-label={t('webhook.copy','Copier')}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function SuccessBar({ rate, total }: { rate: number; total: number }) {
  const { t } = useTranslation();
  if (total === 0) return <span className="text-xs text-gray-400 italic">{t('webhook.noCalls','Aucun appel')}</span>;
  const color = rate >= 95 ? 'bg-emerald-500' : rate >= 80 ? 'bg-amber-400' : 'bg-red-500';
  const textColor = rate >= 95 ? 'text-emerald-700' : rate >= 80 ? 'text-amber-700' : 'text-red-700';
  return (
    <div className="flex items-center gap-2 min-w-[110px]">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${rate}%` }} />
      </div>
      <span className={`text-xs font-semibold ${textColor} w-10 text-right`}>{rate.toFixed(0)}%</span>
    </div>
  );
}

function WebhookCard({ webhook, onAskDelete, onToggle }: {
  webhook: Webhook;
  onAskDelete: (w: Webhook) => void;
  onToggle: (id: string, active: boolean) => void;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`bg-white border rounded-2xl transition-all ${webhook.is_active ? 'border-gray-200 hover:border-emerald-200 hover:shadow-md' : 'border-gray-200 opacity-75'}`}>
      {/* Header */}
      <div className="flex items-center gap-4 p-5">
        {/* Status icon */}
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${webhook.is_active ? 'bg-emerald-50' : 'bg-gray-100'}`}>
          <WebhookIcon className={`h-5 w-5 ${webhook.is_active ? 'text-emerald-600' : 'text-gray-400'}`} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-bold text-gray-900 text-sm truncate">{webhook.name}</p>
            {webhook.is_active ? (
              <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold uppercase tracking-wide flex-shrink-0">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                {t('webhook.active','Actif')}
              </span>
            ) : (
              <span className="px-2 py-0.5 text-[10px] bg-gray-100 text-gray-500 rounded-full font-bold uppercase tracking-wide flex-shrink-0">
                {t('webhook.inactive','Inactif')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <code className="text-xs text-gray-500 font-mono truncate min-w-0">{webhook.url}</code>
            <CopyButton value={webhook.url} />
          </div>
        </div>

        {/* Events */}
        <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">
          {webhook.events.includes('*') ? (
            <span className="px-2.5 py-1 text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded-full font-semibold">
              {t('webhook.allEvents','Tous événements')}
            </span>
          ) : (
            <>
              {webhook.events.slice(0, 2).map(e => (
                <span key={e} className={`px-2.5 py-1 text-xs border rounded-full font-semibold ${eventColor(e)}`}>
                  {e}
                </span>
              ))}
              {webhook.events.length > 2 && (
                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 border border-gray-200 rounded-full font-semibold">
                  +{webhook.events.length - 2}
                </span>
              )}
            </>
          )}
        </div>

        {/* Success rate */}
        <div className="hidden lg:block flex-shrink-0 w-32">
          <SuccessBar rate={webhook.success_rate} total={webhook.total_calls} />
          <p className="text-[11px] text-gray-400 mt-1 text-right">{t('webhook.callsN','{{n}} appels',{n:webhook.total_calls})}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => onToggle(webhook.id, !webhook.is_active)}
            title={webhook.is_active ? t('webhook.disable','Désactiver') : t('webhook.enable','Activer')}
            aria-label={webhook.is_active ? t('webhook.disable','Désactiver') : t('webhook.enable','Activer')}
            className={`inline-flex items-center justify-center h-9 w-9 rounded-lg transition-colors ${
              webhook.is_active
                ? 'text-gray-500 hover:text-amber-600 hover:bg-amber-50'
                : 'text-gray-500 hover:text-emerald-600 hover:bg-emerald-50'
            }`}
          >
            {webhook.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            title={expanded ? t('webhook.hideDetails','Masquer les détails') : t('webhook.showDetails','Voir les détails')}
            aria-label="Détails"
            className="inline-flex items-center justify-center h-9 w-9 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => onAskDelete(webhook)}
            title="Supprimer"
            aria-label="Supprimer"
            className="inline-flex items-center justify-center h-9 w-9 text-gray-500 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-100 px-5 pb-5 pt-4 grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Events column */}
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.08em] mb-2">{t('webhook.subscribedEvents','Événements abonnés')}</p>
            <div className="flex flex-wrap gap-1.5">
              {webhook.events.includes('*') ? (
                <span className="px-2.5 py-1 text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded-full font-semibold">{t('webhook.all','Tous')}</span>
              ) : webhook.events.map(e => (
                <span key={e} className={`px-2.5 py-1 text-xs border rounded-full font-semibold ${eventColor(e)}`}>{e}</span>
              ))}
            </div>
          </div>

          {/* Timing column */}
          <div className="space-y-3">
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.08em] mb-1">{t('webhook.lastCall','Dernier appel')}</p>
              <p className="text-sm text-gray-700">
                {webhook.last_called_at ? formatRelativeTime(webhook.last_called_at, t) : '—'}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.08em] mb-1">{t('webhook.createdAt','Créé le')}</p>
              <p className="text-sm text-gray-700">
                {new Date(webhook.created_at).toLocaleDateString(dateLocale(), { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Stats column */}
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.08em] mb-2">{t('webhook.statsTitle','Statistiques')}</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: t('webhook.stTotal','Total'),   value: webhook.total_calls,                          tile: STAT_TILE.gray },
                { label: t('webhook.stSuccess','Succès'),value: webhook.success_calls,                        tile: STAT_TILE.green },
                { label: t('webhook.stErrors','Échecs'), value: webhook.total_calls - webhook.success_calls,  tile: STAT_TILE.red },
                {
                  label: t('webhook.stRate','Taux'),
                  value: webhook.total_calls > 0 ? `${webhook.success_rate.toFixed(1)}%` : '—',
                  tile:  webhook.total_calls === 0
                          ? STAT_TILE.gray
                          : webhook.success_rate >= 95 ? STAT_TILE.green
                          : webhook.success_rate >= 80 ? STAT_TILE.yellow
                          : STAT_TILE.red,
                },
              ].map(({ label, value, tile }) => (
                <div key={label} className={`border rounded-lg p-2 text-center ${tile.bg}`}>
                  <p className={`text-base font-bold ${tile.text}`}>{value}</p>
                  <p className={`text-[11px] ${tile.text} opacity-70`}>{label}</p>
                </div>
              ))}
            </div>

            {webhook.last_error && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-[11px] text-red-700 font-bold mb-0.5">{t('webhook.lastError','Dernière erreur')}</p>
                <p className="text-xs text-red-600 font-mono break-all line-clamp-2">{webhook.last_error}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: {
  icon: React.ElementType; label: string; value: string | number; accent: 'emerald' | 'blue' | 'purple' | 'amber';
}) {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue:    'bg-blue-50 text-blue-600',
    purple:  'bg-purple-50 text-purple-600',
    amber:   'bg-amber-50 text-amber-600',
  };
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-gray-300 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colors[accent]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-2xl font-black text-gray-900 tabular-nums">{value}</p>
    </div>
  );
}

export default function WebhookManagement() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Webhook | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const [webhooksRes, eventsRes] = await Promise.all([
        api.get('/webhooks'),
        api.get('/webhooks/events'),
      ]);
      setWebhooks(webhooksRes.data.items || []);
      setEvents(eventsRes.data.events || []);
    } catch (error) {
      console.error('Error loading webhooks:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeletingId(id);
    try {
      await api.delete(`/webhooks/${id}`);
      setWebhooks(prev => prev.filter(w => w.id !== id));
      setDeleteTarget(null);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || t('webhook.deleteError','Échec de la suppression'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    // Optimistic update
    setWebhooks(prev => prev.map(w => w.id === id ? { ...w, is_active: active } : w));
    try {
      await api.patch(`/webhooks/${id}`, { is_active: active });
    } catch {
      // Revert on failure
      setWebhooks(prev => prev.map(w => w.id === id ? { ...w, is_active: !active } : w));
    }
  };

  const totalCalls = webhooks.reduce((s, w) => s + w.total_calls, 0);
  const activeCount = webhooks.filter(w => w.is_active).length;
  const totalSuccess = webhooks.reduce((s, w) => s + w.success_calls, 0);
  const avgRate = totalCalls > 0 ? (totalSuccess / totalCalls) * 100 : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-white border border-gray-200 rounded-2xl animate-pulse" />)}
        </div>
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-20 bg-white border border-gray-200 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Hero (light, on-brand) ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-teal-50 border border-emerald-100 rounded-2xl p-6 md:p-8">
        <div className="relative flex items-start justify-between gap-6 flex-wrap">
          <div className="flex-1 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/app/settings')}
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-emerald-700 transition-colors mb-3"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('webhook.backToSettings','Retour aux paramètres')}
            </button>
            <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[11px] font-bold tracking-wide uppercase mb-3">
              {t('webhook.badge','Intégrations · Automatisation')}
            </span>
            <h1 className="text-3xl font-black text-gray-900 mb-1 flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-10 h-10 bg-emerald-600 text-white rounded-xl">
                <WebhookIcon className="h-5 w-5" />
              </span>
              Webhooks
            </h1>
            <p className="text-sm text-gray-600 max-w-xl">
              {t('webhook.heroDesc',"Notifications HTTP en temps réel vers vos services externes. Chaque payload est signé HMAC pour vérification d'intégrité.")}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 items-start">
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={refreshing}
              title="Actualiser"
              aria-label="Actualiser"
              className="inline-flex items-center justify-center h-10 w-10 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <a
              href="/docs#/Webhooks"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 h-10 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              API Docs
            </a>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm hover:shadow-md"
            >
              <Plus className="h-4 w-4" />
              {t('webhook.newWebhook','Nouveau webhook')}
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={WebhookIcon} label="Webhooks"                                value={webhooks.length}                                     accent="emerald" />
        <StatCard icon={CheckCircle} label={t('webhook.activeLabel','Actifs')}      value={activeCount}                                         accent="blue" />
        <StatCard icon={BarChart3}   label={t('webhook.callsTotal','Appels (total)')} value={totalCalls.toLocaleString(numLocale())}            accent="purple" />
        <StatCard icon={Zap}         label={t('webhook.successRate','Taux de succès')} value={totalCalls > 0 ? `${avgRate.toFixed(0)}%` : '—'} accent="amber" />
      </div>

      {/* ── Webhooks list ─────────────────────────────────────────────────── */}
      {webhooks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 shadow-sm">
          <div className="text-center py-16 px-6">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <WebhookIcon className="h-8 w-8 text-emerald-600" />
            </div>
            <p className="text-gray-900 font-bold text-lg mb-1">{t('webhook.noWebhooks','Aucun webhook configuré')}</p>
            <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
              {t('webhook.noWebhooksDesc',"Créez votre premier webhook pour recevoir des notifications en temps réel lors d'événements ESGflow.")}
            </p>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-5 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors shadow-sm hover:shadow-md"
            >
              <Plus className="h-4 w-4" />
              {t('webhook.createFirst','Créer mon premier webhook')}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map(webhook => (
            <WebhookCard
              key={webhook.id}
              webhook={webhook}
              onAskDelete={setDeleteTarget}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}

      {/* ── Available Events ──────────────────────────────────────────────── */}
      {events.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide flex items-center gap-2">
              <Activity className="h-4 w-4" />
              {t('webhook.availableEvents','Événements disponibles')}
            </h2>
            <span className="text-xs text-gray-400">{t('webhook.eventsCount','{{n}} types',{n:events.length})}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {events.map(event => (
              <div
                key={event.type}
                className="bg-white border border-gray-200 rounded-xl p-4 hover:border-emerald-200 hover:shadow-sm transition-all"
              >
                <span className={`inline-block px-2.5 py-1 text-xs border rounded-full font-bold font-mono mb-2 ${eventColor(event.type)}`}>
                  {event.type}
                </span>
                <p className="text-sm text-gray-600 leading-snug">{event.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Quick guide (kept compact) ────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-gray-50 to-emerald-50/30 border border-gray-200 rounded-2xl p-6">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-emerald-600" />
          {t('webhook.howTitle','Comment ça marche')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { step: '1', title: t('webhook.step1title','Exposez un endpoint'),   desc: t('webhook.step1desc','Une URL HTTPS sur votre serveur qui accepte un POST JSON.') },
            { step: '2', title: t('webhook.step2title','Configurez le webhook'), desc: t('webhook.step2desc',"Renseignez l'URL ci-dessus et cochez les événements à écouter.") },
            { step: '3', title: t('webhook.step3title','Recevez & vérifiez'),    desc: t('webhook.step3desc','À chaque événement, ESGflow envoie un payload signé HMAC SHA-256.') },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex gap-3">
              <div className="w-8 h-8 bg-emerald-600 text-white rounded-lg flex items-center justify-center text-sm font-black flex-shrink-0">
                {step}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-gray-900 text-sm mb-1">{title}</p>
                <p className="text-xs text-gray-600 leading-snug">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Create modal ──────────────────────────────────────────────────── */}
      <CreateWebhookModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => loadData()}
        availableEvents={events}
      />

      {/* ── Delete confirmation modal ─────────────────────────────────────── */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => deletingId === null && setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-red-100 rounded-xl flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-gray-900">{t('webhook.deleteTitle','Supprimer ce webhook ?')}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  <span className="font-semibold text-gray-800 break-all">"{deleteTarget.name}"</span>
                  {t('webhook.deleteBodyB',' ne recevra plus aucune notification. Cette action est irréversible.')}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deletingId !== null}
                className="px-4 h-10 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                {t('webhook.cancel','Annuler')}
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deletingId !== null}
                className="inline-flex items-center gap-2 px-4 h-10 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {deletingId !== null ? <Spinner size="sm" /> : <Trash2 className="h-4 w-4" />}
                {t('webhook.delete','Supprimer')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
