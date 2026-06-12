/**
 * CSRDProgress — Dashboard "Où en suis-je sur la CSRD ?"
 *
 * Affiche pour chaque ESRS (E1-E5, S1-S4, G1, ESRS 2) :
 *  - % de complétion des datapoints
 *  - Liste détaillée des datapoints couverts / manquants
 *  - Decompte avant la prochaine échéance de publication (vague CSRD)
 *  - Top 5 des prochains datapoints obligatoires à remplir
 *
 * Source : GET /esrs/progress  (CSRDProgressService côté backend)
 */
import { useEffect, useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Link } from 'react-router-dom';
import {
  Calendar, AlertTriangle, CheckCircle2, Circle, ArrowRight, Target,
  Leaf, Users, Building2, Loader2, Sparkles, ChevronDown, ChevronUp,
  TrendingUp, ListChecks,
} from 'lucide-react';
import api from '@/services/api';

// ─── Types ─────────────────────────────────────────────────────────────────
interface Datapoint {
  concept_id: string;
  label: string;
  disclosure: string;
  data_type: string;
  unit: string | null;
  required: boolean;
  covered: boolean;
}

interface DisclosureSummary {
  id: string;
  total: number;
  covered: number;
  pct: number;
}

interface StandardProgress {
  code: string;
  label: string;
  pillar: 'environmental' | 'social' | 'governance' | 'general';
  total_datapoints: number;
  covered_datapoints: number;
  required_total: number;
  required_covered: number;
  completion_pct: number;
  status: 'ready' | 'partial' | 'missing';
  datapoints: Datapoint[];
  disclosures: DisclosureSummary[];
}

interface PriorityNext {
  standard: string;
  standard_label: string;
  concept_id: string;
  label: string;
  disclosure: string;
  required: boolean;
}

interface ProgressDashboard {
  overall_completion_pct: number;
  required_completion_pct: number;
  total_datapoints: number;
  covered_datapoints: number;
  required_total: number;
  required_covered: number;
  csrd_wave: string | null;
  publication_deadline: string | null;
  days_to_deadline: number | null;
  standards: StandardProgress[];
  priority_next: PriorityNext[];
}

// ─── Constants ─────────────────────────────────────────────────────────────
const PILLAR_META: Record<string, { color: string; icon: typeof Leaf }> = {
  environmental: { color: 'emerald', icon: Leaf },
  social: { color: 'blue', icon: Users },
  governance: { color: 'violet', icon: Building2 },
  general: { color: 'slate', icon: Sparkles },
};

function getStatusBadge(t: TFunction): Record<string, { label: string; bg: string; text: string }> {
  return {
    ready:   { label: t('compliance.csrdProgress.status.ready', "Prêt"),    bg: 'bg-emerald-100', text: 'text-emerald-800' },
    partial: { label: t('compliance.csrdProgress.status.partial', 'Partiel'), bg: 'bg-amber-100',  text: 'text-amber-800' },
    missing: { label: t('compliance.csrdProgress.status.missing', "À faire"), bg: 'bg-red-100',    text: 'text-red-700' },
  };
}

// ─── Component ─────────────────────────────────────────────────────────────
export default function CSRDProgress() {
  const { t } = useTranslation();
  const [data, setData] = useState<ProgressDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get<ProgressDashboard>('/esrs/progress');
        if (mounted) setData(res.data);
      } catch {
        if (mounted) setError(t('compliance.csrdProgress.loadError', "Impossible de charger la progression CSRD."));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-700">
        <AlertTriangle className="w-5 h-5 inline mr-2" />
        {error || t('compliance.csrdProgress.noData', 'Aucune donnée disponible.')}
      </div>
    );
  }

  const STATUS_BADGE = getStatusBadge(t);

  const toggleExpanded = (code: string) => {
    const next = new Set(expanded);
    if (next.has(code)) next.delete(code); else next.add(code);
    setExpanded(next);
  };

  const deadlineFormat = data.publication_deadline
    ? new Date(data.publication_deadline).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'long', year: 'numeric',
      })
    : null;

  const deadlineUrgency =
    data.days_to_deadline === null
      ? null
      : data.days_to_deadline < 90 ? 'red' : data.days_to_deadline < 180 ? 'amber' : 'emerald';

  return (
    <div className="space-y-6">
      {/* ── Template booster banner (only when completion < 20%) ───────── */}
      {data.overall_completion_pct < 20 && (
        <Link
          to="/app/templates"
          className="block rounded-2xl bg-gradient-to-r from-violet-50 to-emerald-50 border-2 border-dashed border-violet-200 hover:border-violet-400 p-5 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-emerald-600 flex items-center justify-center text-white shadow-lg">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-extrabold text-gray-900 mb-0.5">
                {t('compliance.csrdProgress.boosterTitle', 'Pré-remplir en 1 clic avec un template sectoriel')}
              </h3>
              <p className="text-sm text-gray-600">
                <Trans i18nKey="compliance.csrdProgress.boosterDesc" values={{ pct: data.overall_completion_pct.toFixed(0) }}>
                  Passez de <strong>{'{{pct}}'}%</strong> à <strong>~50%</strong> de couverture CSRD instantanément.
                  Choisissez votre secteur · 20+ entrées créées · valeurs à éditer.
                </Trans>
              </p>
            </div>
            <div className="flex items-center gap-1 text-sm font-bold text-violet-700 group-hover:translate-x-1 transition-transform">
              {t('compliance.csrdProgress.discover', 'Découvrir')} <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </Link>
      )}

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-blue-50 border border-emerald-100 p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                {t('compliance.csrdProgress.heroEyebrow', 'Progression CSRD')}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
              {t('compliance.csrdProgress.heroTitle', 'Où en êtes-vous sur votre rapport CSRD ?')}
            </h1>
            <p className="text-gray-600">
              <Trans i18nKey="compliance.csrdProgress.heroSubtitle" values={{ covered: data.covered_datapoints, total: data.total_datapoints, reqCovered: data.required_covered, reqTotal: data.required_total }}>
                {'{{covered}}'} datapoints renseignés sur {'{{total}}'}.
                Datapoints <strong>obligatoires</strong> : {'{{reqCovered}}'} / {'{{reqTotal}}'}.
              </Trans>
            </p>
          </div>

          {/* Overall completion ring */}
          <div className="flex items-center gap-6">
            <CompletionRing pct={data.overall_completion_pct} />
            {deadlineFormat && (
              <div className={`flex flex-col items-center px-5 py-4 rounded-2xl border-2 ${
                deadlineUrgency === 'red' ? 'border-red-300 bg-red-50' :
                deadlineUrgency === 'amber' ? 'border-amber-300 bg-amber-50' :
                'border-emerald-200 bg-emerald-50'
              }`}>
                <Calendar className={`w-5 h-5 mb-1 ${
                  deadlineUrgency === 'red' ? 'text-red-500' :
                  deadlineUrgency === 'amber' ? 'text-amber-500' :
                  'text-emerald-500'
                }`} />
                <div className="text-xs text-gray-500">{t('compliance.csrdProgress.publication', 'Publication')}</div>
                <div className="text-sm font-bold text-gray-900">{deadlineFormat}</div>
                <div className={`text-xs font-semibold mt-0.5 ${
                  deadlineUrgency === 'red' ? 'text-red-600' :
                  deadlineUrgency === 'amber' ? 'text-amber-600' :
                  'text-emerald-600'
                }`}>
                  {data.days_to_deadline !== null && data.days_to_deadline >= 0
                    ? t('compliance.csrdProgress.daysLeft', 'J−{{days}}', { days: data.days_to_deadline })
                    : t('compliance.csrdProgress.overdue', 'Échue')}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Secondary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-emerald-100">
          {[
            { label: t('compliance.csrdProgress.statCovered', 'Datapoints couverts'), value: `${data.covered_datapoints}/${data.total_datapoints}` },
            { label: t('compliance.csrdProgress.statRequiredCovered', 'Obligatoires couverts'), value: `${data.required_covered}/${data.required_total}` },
            { label: t('compliance.csrdProgress.statReady', 'Normes "prêtes"'), value: data.standards.filter(s => s.status === 'ready').length },
            { label: t('compliance.csrdProgress.statTodo', 'Normes "à faire"'), value: data.standards.filter(s => s.status === 'missing').length },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-extrabold text-gray-900">{stat.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Priority next ────────────────────────────────────────────────── */}
      {data.priority_next.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-bold text-amber-900 uppercase tracking-wider">
              {t('compliance.csrdProgress.priorityTitle', 'À remplir en priorité')}
            </h2>
          </div>
          <div className="space-y-1.5">
            {data.priority_next.map(dp => (
              <div key={dp.concept_id} className="flex items-center gap-3 p-2.5 bg-white rounded-lg border border-amber-100">
                <Circle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{dp.label}</div>
                  <div className="text-xs text-gray-500">
                    {dp.standard} · {dp.disclosure}
                    {dp.required && <span className="ml-2 text-red-600 font-semibold">{t('compliance.csrdProgress.required', 'Obligatoire')}</span>}
                  </div>
                </div>
                <Link
                  to="/app/data-entry"
                  className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-md transition"
                >
                  {t('compliance.csrdProgress.enter', 'Saisir')} <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Standards grid ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {data.standards.map(std => {
          const meta = PILLAR_META[std.pillar];
          const Icon = meta.icon;
          const open = expanded.has(std.code);
          const statusMeta = STATUS_BADGE[std.status];

          return (
            <div
              key={std.code}
              className={`rounded-2xl border-2 bg-white shadow-sm overflow-hidden transition-all ${
                open ? 'col-span-1 md:col-span-2 xl:col-span-3' : ''
              }`}
              style={{ borderColor: `var(--tw-color-${meta.color}-200, #e5e7eb)` }}
            >
              <button
                type="button"
                onClick={() => toggleExpanded(std.code)}
                className="w-full text-left p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${meta.color}-100`}>
                      <Icon className={`w-5 h-5 text-${meta.color}-600`} />
                    </div>
                    <div>
                      <div className="text-xs font-mono text-gray-500">{std.code}</div>
                      <div className="text-sm font-bold text-gray-900">{std.label}</div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${statusMeta.bg} ${statusMeta.text}`}>
                    {statusMeta.label}
                  </span>
                </div>

                <div className="flex items-baseline gap-2 mb-2">
                  <div className="text-2xl font-extrabold text-gray-900">{std.completion_pct}%</div>
                  <div className="text-xs text-gray-500">
                    {std.covered_datapoints}/{std.total_datapoints} datapoints
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      std.status === 'ready' ? 'bg-emerald-500' :
                      std.status === 'partial' ? 'bg-amber-500' :
                      'bg-red-400'
                    }`}
                    style={{ width: `${std.completion_pct}%` }}
                  />
                </div>

                {std.required_total > 0 && (
                  <div className="mt-2 text-xs text-gray-500">
                    <Trans i18nKey="compliance.csrdProgress.mandatory" values={{ covered: std.required_covered, total: std.required_total }}>
                      Obligatoires : <strong>{'{{covered}}'}/{'{{total}}'}</strong>
                    </Trans>
                  </div>
                )}

                <div className="flex items-center justify-end mt-3 text-xs font-semibold text-gray-500">
                  {open ? (
                    <>{t('compliance.csrdProgress.showLess', 'Voir moins')} <ChevronUp className="w-3.5 h-3.5 ml-1" /></>
                  ) : (
                    <>{t('compliance.csrdProgress.datapointDetail', 'Détail des datapoints')} <ChevronDown className="w-3.5 h-3.5 ml-1" /></>
                  )}
                </div>
              </button>

              {/* Expanded section */}
              {open && (
                <div className="border-t border-gray-100 p-5 bg-gray-50/50">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Disclosures summary */}
                    <div>
                      <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <ListChecks className="w-3.5 h-3.5" /> Disclosures
                      </h3>
                      <div className="space-y-1.5">
                        {std.disclosures.map(d => (
                          <div key={d.id} className="flex items-center gap-2 text-sm">
                            <span className="font-mono text-xs text-gray-500 w-16 flex-shrink-0">{d.id}</span>
                            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  d.pct >= 80 ? 'bg-emerald-500' :
                                  d.pct >= 30 ? 'bg-amber-500' :
                                  'bg-red-400'
                                }`}
                                style={{ width: `${d.pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-600 w-12 text-right">
                              {d.covered}/{d.total}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Datapoints list */}
                    <div>
                      <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5" /> Datapoints ({std.total_datapoints})
                      </h3>
                      <div className="max-h-72 overflow-y-auto space-y-1 pr-2">
                        {std.datapoints.map(dp => (
                          <div
                            key={dp.concept_id}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-xs ${
                              dp.covered ? 'bg-emerald-50' : 'bg-white border border-gray-100'
                            }`}
                          >
                            {dp.covered ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                            ) : (
                              <Circle className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                            )}
                            <span className="flex-1 truncate text-gray-800">{dp.label}</span>
                            <span className="font-mono text-[10px] text-gray-400 flex-shrink-0">
                              {dp.disclosure}
                            </span>
                            {dp.required && (
                              <span className="text-[9px] font-bold text-red-600 uppercase">{t('compliance.csrdProgress.reqAbbr', 'Req.')}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function CompletionRing({ pct }: { pct: number }) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative w-24 h-24">
      <svg className="transform -rotate-90 w-24 h-24">
        <circle
          cx="48" cy="48" r={radius}
          stroke="#e5e7eb" strokeWidth="8" fill="none"
        />
        <circle
          cx="48" cy="48" r={radius}
          stroke={color} strokeWidth="8" fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-extrabold text-gray-900">{pct.toFixed(0)}%</div>
        <div className="text-[9px] text-gray-500 uppercase tracking-wider">CSRD</div>
      </div>
    </div>
  );
}
