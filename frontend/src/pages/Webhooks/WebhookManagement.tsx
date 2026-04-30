import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Webhook as WebhookIcon,
  Plus,
  Trash2,
  Activity,
  CheckCircle,
  XCircle,
  ExternalLink,
  ArrowLeft,
  Zap,
  BarChart3,
  Clock,
  AlertTriangle,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import CreateWebhookModal from '@/components/modals/CreateWebhookModal';
import api from '@/services/api';

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

const EVENT_COLORS: Record<string, string> = {
  'data':       'bg-blue-100 text-blue-700 border-blue-200',
  'score':      'bg-purple-100 text-purple-700 border-purple-200',
  'indicator':  'bg-teal-100 text-teal-700 border-teal-200',
  'user':       'bg-orange-100 text-orange-700 border-orange-200',
  'threshold':  'bg-red-100 text-red-700 border-red-200',
};

function eventColor(type: string) {
  const prefix = type.split('.')[0];
  return EVENT_COLORS[prefix] || 'bg-gray-100 text-gray-700 border-gray-200';
}

function formatRelativeTime(iso: string | null) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  return `il y a ${Math.floor(hours / 24)}j`;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors flex-shrink-0" title="Copier">
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function SuccessBar({ rate, total }: { rate: number; total: number }) {
  if (total === 0) return <span className="text-xs text-gray-400 italic">Aucun appel</span>;
  const color = rate >= 95 ? 'bg-green-500' : rate >= 80 ? 'bg-yellow-400' : 'bg-red-500';
  const textColor = rate >= 95 ? 'text-green-700' : rate >= 80 ? 'text-yellow-700' : 'text-red-700';
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${rate}%` }} />
      </div>
      <span className={`text-xs font-semibold ${textColor} w-10 text-right`}>{rate.toFixed(0)}%</span>
    </div>
  );
}

function WebhookCard({ webhook, onDelete, onToggle }: {
  webhook: Webhook;
  onDelete: (id: string) => void;
  onToggle: (id: string, active: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Supprimer le webhook "${webhook.name}" ?`)) return;
    setDeleting(true);
    onDelete(webhook.id);
  };

  return (
    <div className={`bg-white border rounded-2xl transition-all ${webhook.is_active ? 'border-gray-100 hover:border-gray-200 hover:shadow-sm' : 'border-gray-100 opacity-70'}`}>
      {/* Header */}
      <div className="flex items-center gap-4 p-5">
        {/* Status dot */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${webhook.is_active ? 'bg-green-50' : 'bg-gray-100'}`}>
          <WebhookIcon className={`h-5 w-5 ${webhook.is_active ? 'text-green-600' : 'text-gray-400'}`} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-bold text-gray-900 text-sm">{webhook.name}</p>
            {webhook.is_active ? (
              <span className="flex items-center gap-1 px-2 py-0.5 text-xs bg-green-50 text-green-700 border border-green-200 rounded-full font-semibold">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Actif
              </span>
            ) : (
              <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded-full font-semibold">Inactif</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <code className="text-xs text-gray-500 font-mono truncate max-w-xs">{webhook.url}</code>
            <CopyButton value={webhook.url} />
          </div>
        </div>

        {/* Events badges */}
        <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">
          {webhook.events.includes('*') ? (
            <span className="px-2.5 py-1 text-xs bg-purple-100 text-purple-700 border border-purple-200 rounded-full font-semibold">Tous les événements</span>
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

        {/* Stats */}
        <div className="hidden lg:block flex-shrink-0 w-32">
          <SuccessBar rate={webhook.success_rate} total={webhook.total_calls} />
          <p className="text-xs text-gray-400 mt-1 text-right">{webhook.total_calls} appels</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onToggle(webhook.id, !webhook.is_active)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              webhook.is_active
                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                : 'bg-green-50 text-green-700 hover:bg-green-100'
            }`}
          >
            {webhook.is_active ? 'Désactiver' : 'Activer'}
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
            title="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-100 px-5 pb-5 pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Événements abonnés</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {webhook.events.includes('*') ? (
                <span className="px-2.5 py-1 text-xs bg-purple-100 text-purple-700 border border-purple-200 rounded-full">Tous</span>
              ) : webhook.events.map(e => (
                <span key={e} className={`px-2.5 py-1 text-xs border rounded-full ${eventColor(e)}`}>{e}</span>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Dernier appel</p>
              <p className="text-sm text-gray-700 mt-1">
                {webhook.last_called_at ? formatRelativeTime(webhook.last_called_at) : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Créé le</p>
              <p className="text-sm text-gray-700 mt-1">
                {new Date(webhook.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Statistiques</p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {[
                { label: 'Total', value: webhook.total_calls, color: 'gray' },
                { label: 'Succès', value: webhook.success_calls, color: 'green' },
                { label: 'Échecs', value: webhook.total_calls - webhook.success_calls, color: 'red' },
                { label: 'Taux', value: `${webhook.success_rate.toFixed(1)}%`, color: webhook.success_rate >= 95 ? 'green' : webhook.success_rate >= 80 ? 'yellow' : 'red' },
              ].map(({ label, value, color }) => (
                <div key={label} className={`bg-${color}-50 border border-${color}-100 rounded-lg p-2 text-center`}>
                  <p className={`text-base font-bold text-${color}-700`}>{value}</p>
                  <p className={`text-xs text-${color}-600`}>{label}</p>
                </div>
              ))}
            </div>
            {webhook.last_error && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-600 font-semibold mb-0.5">Dernière erreur</p>
                <p className="text-xs text-red-500 font-mono truncate">{webhook.last_error}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function WebhookManagement() {
  const navigate = useNavigate();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
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

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/webhooks/${id}`);
      setWebhooks(prev => prev.filter(w => w.id !== id));
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Échec de la suppression');
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    try {
      await api.patch(`/webhooks/${id}`, { is_active: active });
      setWebhooks(prev => prev.map(w => w.id === id ? { ...w, is_active: active } : w));
    } catch {
      // silently ignore — UI will not change
    }
  };

  const totalCalls = webhooks.reduce((s, w) => s + w.total_calls, 0);
  const activeCount = webhooks.filter(w => w.is_active).length;
  const avgRate = webhooks.length > 0 && totalCalls > 0
    ? webhooks.reduce((s, w) => s + w.success_calls, 0) / totalCalls * 100
    : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-40 bg-gradient-to-br from-gray-800 to-slate-800 rounded-2xl animate-pulse" />
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-20 bg-white border border-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-gray-800 via-gray-700 to-slate-800 rounded-2xl p-8 text-white shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZyIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNnKSIvPjwvc3ZnPg==')] opacity-30" />
        <div className="relative flex items-start justify-between gap-6 flex-wrap">
          <div>
            <button onClick={() => navigate('/app/settings')} className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors mb-4">
              <ArrowLeft className="h-4 w-4" />
              Paramètres
            </button>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold tracking-wide uppercase">Intégrations & Automatisation</span>
            </div>
            <h1 className="text-3xl font-bold mb-1 flex items-center gap-3">
              <WebhookIcon className="h-8 w-8" />
              Webhooks
            </h1>
            <p className="text-gray-300">Notifications d'événements en temps réel vers vos services externes</p>
          </div>
          {/* Stats */}
          <div className="flex gap-3 flex-wrap">
            {[
              { icon: WebhookIcon, label: 'Webhooks', value: webhooks.length },
              { icon: CheckCircle, label: 'Actifs', value: activeCount },
              { icon: BarChart3, label: 'Appels total', value: totalCalls.toLocaleString('fr-FR') },
              { icon: Zap, label: 'Taux succès', value: totalCalls > 0 ? `${avgRate.toFixed(0)}%` : '—' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex flex-col items-center bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20 min-w-[80px]">
                <Icon className="h-4 w-4 text-gray-300 mb-1" />
                <span className="text-lg font-bold">{value}</span>
                <span className="text-xs text-gray-400">{label}</span>
              </div>
            ))}
          </div>
          {/* Actions */}
          <div className="flex gap-2 flex-wrap items-start">
            <button
              onClick={() => loadData(true)}
              className={`flex items-center gap-2 px-3 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-sm font-medium transition-all ${refreshing ? 'opacity-70' : ''}`}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => window.open(`${(import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').replace('/api/v1', '')}/docs#/Webhooks`, '_blank', 'noopener,noreferrer')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-xl text-sm font-medium transition-all"
            >
              <ExternalLink className="h-4 w-4" />
              API Docs
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-gray-800 rounded-xl text-sm font-bold hover:bg-gray-100 transition-all shadow-md"
            >
              <Plus className="h-4 w-4" />
              Nouveau webhook
            </button>
          </div>
        </div>
      </div>

      {/* ── Webhooks list ── */}
      {webhooks.length === 0 ? (
        <Card>
          <div className="text-center py-14">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <WebhookIcon className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-800 font-bold text-lg mb-1">Aucun webhook configuré</p>
            <p className="text-sm text-gray-400 mb-6 max-w-sm mx-auto">
              Créez votre premier webhook pour recevoir des notifications en temps réel lors d'événements ESGFlow
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Créer un webhook
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {webhooks.map(webhook => (
            <WebhookCard
              key={webhook.id}
              webhook={webhook}
              onDelete={handleDelete}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}

      {/* ── Available Events ── */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Événements disponibles
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {events.map(event => {
            const prefix = event.type.split('.')[0];
            const color = eventColor(event.type);
            return (
              <div key={event.type} className="bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 hover:shadow-sm transition-all group">
                <div className="flex items-start justify-between mb-2">
                  <span className={`px-2.5 py-1 text-xs border rounded-full font-semibold font-mono ${color}`}>
                    {event.type}
                  </span>
                  <Activity className="h-4 w-4 text-gray-300 group-hover:text-gray-400 transition-colors mt-0.5" />
                </div>
                <p className="text-sm text-gray-600">{event.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Guide rapide ── */}
      <div className="bg-gradient-to-br from-slate-50 to-gray-50 border border-gray-200 rounded-2xl p-6">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-gray-500" />
          Guide d'intégration rapide
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { step: '1', icon: Plus, title: 'Créer un endpoint', desc: 'Exposez une URL HTTPS sur votre serveur qui accepte les requêtes POST' },
            { step: '2', icon: WebhookIcon, title: 'Configurer le webhook', desc: "Enregistrez votre URL dans ESGFlow et sélectionnez les événements à écouter" },
            { step: '3', icon: CheckCircle, title: 'Recevoir les événements', desc: 'ESGFlow enverra un payload JSON signé à chaque événement déclenché' },
          ].map(({ step, icon: Icon, title, desc }) => (
            <div key={step} className="flex gap-3">
              <div className="w-8 h-8 bg-gray-800 text-white rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0">
                {step}
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-sm mb-1">{title}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <CreateWebhookModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => loadData()}
        availableEvents={events}
      />
    </div>
  );
}
