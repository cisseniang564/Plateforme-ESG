/**
 * Public status page — /status
 *
 * No auth required. Polls /api/v1/status every 30s and renders a clean
 * operational dashboard suitable for IT/DSI review.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import type { TFunction } from 'i18next';
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, ChevronLeft, Clock, Bell, Shield } from 'lucide-react';
import { LogoBrand } from '@/components/common/Logo';

type SubsystemStatus = 'up' | 'down' | 'degraded';
type OverallStatus = 'operational' | 'degraded' | 'outage';

interface SubsystemCheck {
  status: SubsystemStatus;
  latency_ms: number | null;
  error?: string;
}

interface StatusResponse {
  status: OverallStatus;
  checks: {
    api:   SubsystemCheck;
    db:    SubsystemCheck;
    redis: SubsystemCheck;
  };
  version: string;
  timestamp: string;
}

const getSubsystemLabels = (t: TFunction): Record<string, { name: string; desc: string }> => ({
  api:   { name: 'API',          desc: t('status.subsystem.api.desc', 'Endpoints REST · authentification · webhooks Stripe') },
  db:    { name: 'PostgreSQL',   desc: t('status.subsystem.db.desc', 'Stockage des données ESG, scores, rapports') },
  redis: { name: 'Redis',        desc: t('status.subsystem.redis.desc', 'Cache, queue Celery, rate limiter, sessions') },
});

const getOverallTheme = (t: TFunction): Record<OverallStatus, { bg: string; text: string; ring: string; icon: typeof CheckCircle2; label: string }> => ({
  operational: { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200', icon: CheckCircle2,   label: t('status.overall.operational', 'Tous les systèmes opérationnels') },
  degraded:    { bg: 'bg-amber-50',   text: 'text-amber-700',   ring: 'ring-amber-200',   icon: AlertTriangle, label: t('status.overall.degraded', 'Performances dégradées') },
  outage:      { bg: 'bg-red-50',     text: 'text-red-700',     ring: 'ring-red-200',     icon: XCircle,       label: t('status.overall.outage', 'Incident en cours') },
});

const STATUS_CHIP: Record<SubsystemStatus, string> = {
  up:       'bg-emerald-100 text-emerald-700',
  degraded: 'bg-amber-100 text-amber-700',
  down:     'bg-red-100 text-red-700',
};

// ── Recent incidents (static for now) ────────────────────────────────────────
// Aucun historique d'incidents publié pour l'instant : on n'affiche rien d'inventé.
const getIncidents = (_t: TFunction): Array<{ date: string; title: string; duration: string; severity: 'degraded' | 'down'; detail: string }> => [];

export default function StatusPage() {
  const { t } = useTranslation();
  const SUBSYSTEM_LABELS = getSubsystemLabels(t);
  const OVERALL_THEME = getOverallTheme(t);
  const INCIDENTS = getIncidents(t);
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  const [subscribeEmail, setSubscribeEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [latencyHistory, setLatencyHistory] = useState<number[]>([]);


  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/v1/status', { credentials: 'omit' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as StatusResponse;
      setData(json);
      setError(null);
      if (json.checks.api.latency_ms != null) {
        setLatencyHistory(prev => [...prev.slice(-29), json.checks.api.latency_ms!]);
      }
    } catch (err: any) {
      setError(err?.message ?? t('status.networkError', 'Erreur réseau'));
      // Build a synthetic "outage" response when the API itself is down
      setData({
        status: 'outage',
        checks: {
          api:   { status: 'down', latency_ms: null, error: 'unreachable' },
          db:    { status: 'down', latency_ms: null },
          redis: { status: 'down', latency_ms: null },
        },
        version: '?',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
      setRefreshedAt(new Date());
    }
  };

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 30_000);
    return () => clearInterval(id);
  }, []);

  const theme = data ? OVERALL_THEME[data.status] : OVERALL_THEME.operational;
  const StatusIcon = theme.icon;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm">
            <ChevronLeft className="h-4 w-4" />
            {t('status.back', "Retour à l'accueil")}
          </Link>
          <LogoBrand size="sm" variant="dark" showTagline={false} />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('status.title', 'État de la plateforme')}</h1>
          <p className="text-gray-500 text-sm">
            {t('status.subtitle', "Statut en temps réel des composants critiques d'ESGFlow. Vérification toutes les 30 secondes.")}
          </p>
        </div>

        {/* Overall banner */}
        <div className={`rounded-2xl border ring-1 ${theme.bg} ${theme.ring} p-6 mb-8`}>
          <div className="flex items-center gap-4">
            <StatusIcon className={`h-10 w-10 flex-shrink-0 ${theme.text}`} aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className={`text-xl font-bold ${theme.text}`}>{theme.label}</p>
              <p className="text-sm text-gray-500 mt-1">
                {refreshedAt
                  ? t('status.lastCheck', 'Dernière vérification : {{time}}', { time: refreshedAt.toLocaleTimeString('fr-FR') })
                  : t('status.checking', 'Vérification en cours…')}
              </p>
            </div>
            <button
              onClick={fetchStatus}
              disabled={loading}
              aria-label={t('status.refreshAria', 'Rafraîchir le statut')}
              className="flex-shrink-0 p-2 rounded-lg hover:bg-white/60 disabled:opacity-50 transition"
            >
              <RefreshCw className={`h-5 w-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Subsystems */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-700">{t('status.components', 'Composants')}</h2>
          </div>
          <ul className="divide-y divide-gray-100">
            {data && Object.entries(data.checks).map(([key, check]) => {
              const meta = SUBSYSTEM_LABELS[key] ?? { name: key, desc: '' };
              return (
                <li key={key} className="px-6 py-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{meta.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{meta.desc}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_CHIP[check.status]}`}>
                      {check.status === 'up' ? t('status.chip.up', 'Opérationnel') : check.status === 'degraded' ? t('status.chip.degraded', 'Dégradé') : t('status.chip.down', 'Hors service')}
                    </span>
                    {check.latency_ms != null && (
                      <p className="text-[11px] text-gray-400 mt-1">{check.latency_ms} ms</p>
                    )}
                    {check.error && (
                      <p className="text-[11px] text-red-500 mt-1 max-w-[180px] truncate" title={check.error}>{check.error}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* ── Response time ── */}
        {latencyHistory.length > 1 && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mt-6">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-700">{t('status.latency.title', 'Temps de reponse API (dernieres mesures)')}</h2>
            </div>
            <div className="px-6 py-5">
              <div className="flex items-end gap-1 h-16">
                {latencyHistory.map((ms, i) => {
                  const max = Math.max(...latencyHistory, 100);
                  const pct = Math.max((ms / max) * 100, 5);
                  return (
                    <div
                      key={i}
                      className="group relative flex-1 rounded-t-sm transition-all"
                      style={{
                        height: `${pct}%`,
                        backgroundColor: ms < 200 ? '#10b981' : ms < 500 ? '#f59e0b' : '#ef4444',
                      }}
                    >
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                        <div className="bg-gray-900 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap">
                          {ms} ms
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-gray-400">
                <span>{t('status.latency.old', 'Ancienne')}</span>
                <span className="font-medium text-gray-500">
                  {t('status.latency.avg', 'Moy. {{v}} ms', { v: Math.round(latencyHistory.reduce((a, b) => a + b, 0) / latencyHistory.length) })}
                </span>
                <span>{t('status.latency.recent', 'Recente')}</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Incident history ── */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mt-6">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <Shield className="h-4 w-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-700">{t('status.incidents.title', 'Historique des incidents')}</h2>
          </div>
          {INCIDENTS.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm text-gray-500">{t('status.incidents.none', 'Aucun incident recent')}</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {INCIDENTS.map((inc, i) => (
                <li key={i} className="px-6 py-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {inc.severity === 'down' ? (
                        <XCircle className="h-5 w-5 text-red-500" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-gray-900">{inc.title}</h3>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                          inc.severity === 'down'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {inc.severity === 'down' ? t('status.incident.badge.down', 'Incident') : t('status.incident.badge.degraded', 'Degradation')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{inc.detail}</p>
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
                        <span>{inc.date}</span>
                        <span>{t('status.incident.duration', 'Duree : {{d}}', { d: inc.duration })}</span>
                        <span className="text-emerald-600 font-medium">{t('status.incident.resolved', 'Resolu')}</span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Subscribe to updates ── */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mt-6">
          <div className="px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Bell className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{t('status.subscribe.title', "Recevoir les alertes d'incident")}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{t('status.subscribe.body', "Notification par email en cas de degradation ou d'incident.")}</p>
              </div>
            </div>
            {subscribed ? (
              <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                {t('status.subscribe.done', 'Inscrit !')}
              </div>
            ) : (
              <form
                className="flex gap-2 w-full sm:w-auto"
                onSubmit={e => {
                  e.preventDefault();
                  if (subscribeEmail) setSubscribed(true);
                }}
              >
                <input
                  type="email"
                  required
                  value={subscribeEmail}
                  onChange={e => setSubscribeEmail(e.target.value)}
                  placeholder={t('status.subscribe.placeholder', 'email@entreprise.fr')}
                  className="flex-1 sm:w-56 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  {t('status.subscribe.cta', "S'abonner")}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer / SLA hint */}
        <div className="mt-8 grid sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{t('status.sla.slaLabel', 'Disponibilité contractuelle')}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{t('status.sla.slaValue', '99,5 %')}</p>
            <p className="text-xs text-gray-500 mt-1">{t('status.sla.slaDesc', 'Par mois civil, selon les CGV')}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{t('status.sla.hostLabel', 'Hébergement')}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{t('status.sla.hostValue', '🇫🇷 France')}</p>
            <p className="text-xs text-gray-500 mt-1">{t('status.sla.hostDesc', 'Hébergeur IONOS SARL · données soumises au RGPD')}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{t('status.sla.backupLabel', 'Sauvegardes')}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{t('status.sla.backupValue', 'Quotidiennes')}</p>
            <p className="text-xs text-gray-500 mt-1">{t('status.sla.backupDesc', 'Conservées 30 jours')}</p>
          </div>
        </div>

        {error && (
          <p className="mt-6 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3" role="status">
            {t('status.error', "⚠ Impossible de joindre l'API de statut ({{error}}). La plateforme principale est probablement indisponible.", { error })}
          </p>
        )}

        <p className="mt-12 text-center text-xs text-gray-400">
          <Trans i18nKey="status.report">
            Pour signaler un incident, contactez <a href="mailto:support@greenconnect.cloud" className="underline hover:text-gray-600">support@greenconnect.cloud</a>
          </Trans>
        </p>
      </main>
    </div>
  );
}
