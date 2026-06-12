import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Shield, AlertTriangle, CheckCircle, XCircle, Flag,
  TrendingUp, Clock, FileText, Eye, ThumbsUp, ThumbsDown,
  AlertCircle, Database, RefreshCw, CheckCheck, ArrowRight,
  Download, Paperclip, Zap, ChevronRight, Info, Lock, Users, UploadCloud,
} from 'lucide-react';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

/* ── Types ────────────────────────────────────────────────────────────── */
interface QualityStats {
  total_entries: number;
  pending: number;
  verified: number;
  rejected: number;
  flagged: number;
  completeness_score: number;
  avg_quality_score: number;
  entries_with_source: number;
  entries_with_attachments: number;
  stale_entries: number;
}

interface QualityIssue {
  id: string;
  metric_name: string;
  issue_type: string;
  severity: string;
  details: string;
  created_at: string;
}

/* ── Quality ring ─────────────────────────────────────────────────────── */
function QualityRing({
  score, size = 148, dark = false,
}: { score: number; size?: number; dark?: boolean }) {
  const { t } = useTranslation();
  const R = (size - 16) / 2;
  const circ = 2 * Math.PI * R;
  const dash = (Math.min(Math.max(score, 0), 100) / 100) * circ;
  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#3b82f6' : score >= 25 ? '#f59e0b' : '#ef4444';
  const label = score >= 75 ? t('dataQuality.labelExcellent', 'Excellent') : score >= 50 ? t('dataQuality.labelGood', 'Bien') : score >= 25 ? t('dataQuality.labelToImprove', 'À améliorer') : t('dataQuality.labelCritical', 'Critique');

  const cx = size / 2, cy = size / 2;
  const trackColor = dark ? 'rgba(255,255,255,0.1)' : '#f3f4f6';
  const textFill = dark ? 'white' : '#111827';
  const subFill = dark ? 'rgba(255,255,255,0.5)' : '#9ca3af';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="qRingGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.8" />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={trackColor} strokeWidth="13" />
        <circle
          cx={cx} cy={cy} r={R}
          fill="none" stroke="url(#qRingGrad)" strokeWidth="13" strokeLinecap="round"
          strokeDasharray={`${dash} ${circ - dash}`}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)' }}
        />
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize={size > 100 ? 32 : 20} fontWeight="700" fill={textFill} fontFamily="system-ui">
          {Math.round(score)}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize={12} fill={subFill} fontFamily="system-ui">
          / 100
        </text>
      </svg>
      {dark && <p className="text-xs font-medium tracking-widest text-white/50 uppercase">{label}</p>}
    </div>
  );
}

/* ── Small quality ring (for metrics) ────────────────────────────────── */
function SmallRing({ value, color }: { value: number; color: string }) {
  const R = 22, circ = 2 * Math.PI * R;
  const dash = (Math.min(Math.max(value, 0), 100) / 100) * circ;
  return (
    <svg width="56" height="56" viewBox="0 0 56 56">
      <circle cx="28" cy="28" r={R} fill="none" stroke="#f3f4f6" strokeWidth="5" />
      <circle
        cx="28" cy="28" r={R}
        fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
        strokeDasharray={`${dash} ${circ - dash}`}
        transform="rotate(-90 28 28)"
        style={{ transition: 'stroke-dasharray 1s ease' }}
      />
      <text x="28" y="32" textAnchor="middle" fontSize="11" fontWeight="700" fill="#374151" fontFamily="system-ui">
        {Math.round(value)}
      </text>
    </svg>
  );
}

/* ── Severity badge ───────────────────────────────────────────────────── */
function SeverityBadge({ severity }: { severity: string }) {
  const { t } = useTranslation();
  const meta: Record<string, { cls: string; label: string }> = {
    high:   { cls: 'bg-red-50 text-red-700 border-red-200',    label: `● ${t('dataQuality.severityHigh',   'Élevée')}`  },
    medium: { cls: 'bg-orange-50 text-orange-700 border-orange-200', label: `● ${t('dataQuality.severityMedium', 'Moyenne')}` },
    low:    { cls: 'bg-yellow-50 text-yellow-700 border-yellow-200', label: `● ${t('dataQuality.severityLow',    'Faible')}` },
  };
  const m = meta[severity] ?? { cls: 'bg-gray-50 text-gray-600 border-gray-200', label: severity };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${m.cls}`}>
      {m.label}
    </span>
  );
}

/* ── Issue type icon ──────────────────────────────────────────────────── */
function getIssueIcon(type: string) {
  switch (type) {
    case 'missing_source': return FileText;
    case 'stale': return Clock;
    case 'flagged': return Flag;
    default: return AlertCircle;
  }
}

/* ── Stat card ───────────────────────────────────────────────────────── */
function StatCard({
  label, value, sub, icon: Icon, topColor, iconBg, iconColor, onClick,
}: {
  label: string; value: number | string; sub?: string;
  icon: React.ElementType; topColor: string; iconBg: string; iconColor: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md${onClick ? ' cursor-pointer' : ''}`}
    >
      <div className="h-1.5 w-full" style={{ backgroundColor: topColor }} />
      <div className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="rounded-xl p-2" style={{ backgroundColor: iconBg }}>
            <Icon className="h-4 w-4" style={{ color: iconColor }} />
          </div>
          {onClick && <ChevronRight className="h-4 w-4 text-gray-300 transition-transform group-hover:translate-x-0.5" />}
        </div>
        <p className="text-2xl font-bold leading-none text-gray-900">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
        <p className="mt-2 text-xs leading-snug text-gray-500">{label}</p>
      </div>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────────────── */
export default function DataQualityDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<'30j' | '90j' | '12m'>('30j');
  const [stats, setStats] = useState<QualityStats | null>(null);
  const [issues, setIssues] = useState<QualityIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [validating, setValidating] = useState<string | null>(null);
  const [batchValidating, setBatchValidating] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [statsRes, issuesRes] = await Promise.all([
        api.get('/data-validation/quality/stats'),
        api.get('/data-validation/quality/issues'),
      ]);
      setStats(statsRes.data);
      setIssues(issuesRes.data);
    } catch (error: any) {
      console.error('Error loading quality data:', error);
      toast.error(t('dataQuality.loadError', 'Erreur de chargement'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleValidate = async (issueId: string, action: 'verify' | 'reject' | 'flag') => {
    setValidating(issueId);
    try {
      const res = await api.post(`/data-validation/entries/${issueId}/validate`, {
        action,
        reason: action === 'reject' ? 'Quality check failed' : undefined,
      });
      if (action === 'verify') {
        toast.success(
          res.data?.solo_mode
            ? t('dataQuality.verifiedSolo', 'Vérifié ✓ (validation mono-utilisateur — mode TPE)')
            : t('dataQuality.verified', 'Vérifié ✓')
        );
      } else if (action === 'reject') {
        toast.success(t('dataQuality.rejected', 'Rejeté'));
      } else {
        toast.success(t('dataQuality.flagged', 'Marqué'));
      }
      await loadData(true);
    } catch (err: any) {
      // Surface the backend's explanation (ex: règle de séparation des
      // pouvoirs / 4-yeux CSRD) plutôt qu'un message générique.
      toast.error(err?.response?.data?.detail || t('dataQuality.validationError', 'Erreur de validation'));
    } finally {
      setValidating(null);
    }
  };

  /**
   * Export the quality data as a CSV file built client-side.
   * Contents:
   *   - Section "Synthèse" with the KPI cards (completeness, avg quality,
   *     verified / pending / rejected / flagged counts, stale entries…)
   *   - Section "Problèmes détectés" listing every issue with severity,
   *     metric name, issue type, description and creation date.
   * No backend round-trip — instant download.
   */
  const handleExportReport = () => {
    if (!stats) {
      toast.error(t('dataQuality.noDataAvailable', 'Données qualité non disponibles'));
      return;
    }
    const _esc = (v: any) => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const today = new Date().toISOString().slice(0, 10);
    const periodLabel = period === '30j' ? '30 derniers jours'
                      : period === '90j' ? '90 derniers jours'
                      : period === '12m' ? '12 derniers mois' : period;

    const rows: string[] = [];
    rows.push(`Rapport Qualité des Données ESG`);
    rows.push(`Généré le;${today}`);
    rows.push(`Période;${periodLabel}`);
    rows.push('');
    rows.push('=== Synthèse ===');
    rows.push('Indicateur;Valeur');
    rows.push(`Total entrées;${stats.total_entries}`);
    rows.push(`Vérifiées;${stats.verified}`);
    rows.push(`En attente;${stats.pending}`);
    rows.push(`Rejetées;${stats.rejected}`);
    rows.push(`Marquées;${stats.flagged}`);
    rows.push(`Score de complétude (%);${stats.completeness_score.toFixed(1)}`);
    rows.push(`Score qualité moyen (sur 100);${stats.avg_quality_score.toFixed(1)}`);
    rows.push(`Avec source documentée;${stats.entries_with_source}`);
    rows.push(`Avec pièces jointes;${stats.entries_with_attachments}`);
    rows.push(`Données obsolètes (>90j);${stats.stale_entries}`);
    rows.push('');
    rows.push(`=== Problèmes détectés (${issues.length}) ===`);
    rows.push('Sévérité;Indicateur;Type de problème;Détails;Date');
    issues.forEach(i => {
      rows.push([
        _esc((i.severity || '').toUpperCase()),
        _esc(i.metric_name),
        _esc(i.issue_type),
        _esc(i.details),
        _esc(i.created_at ? new Date(i.created_at).toISOString().slice(0, 10) : ''),
      ].join(';'));
    });

    // Add UTF-8 BOM so Excel (FR) opens accents correctly
    const blob = new Blob(['﻿' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-qualite-donnees-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    toast.success(t('dataQuality.csvDownloaded', 'Rapport qualité téléchargé (CSV)'));
  };

  /**
   * Generate a full PDF quality report via the backend reports service.
   * Wraps the existing /reports/generate endpoint (detailed report type)
   * and streams the resulting PDF as a download.
   */
  const handleGeneratePdfReport = async () => {
    const toastId = toast.loading(t('dataQuality.pdfGenerating', 'Génération du rapport qualité (PDF)…'));
    try {
      const res = await api.post(
        '/reports/generate',
        { report_type: 'detailed', format: 'pdf', year: new Date().getFullYear() },
        { responseType: 'blob' },
      );
      const today = new Date().toISOString().slice(0, 10);
      const cd = res.headers['content-disposition'] as string | undefined;
      const m = cd?.match(/filename="?([^";]+)"?/);
      const filename = m?.[1] || `rapport-qualite-${today}.pdf`;
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(t('dataQuality.pdfDownloaded', 'Rapport PDF téléchargé'), { id: toastId });
    } catch (err: any) {
      console.error('PDF quality report failed:', err);
      toast.error(
        err?.response?.data?.detail || t('dataQuality.pdfError', 'Échec de la génération du rapport PDF'),
        { id: toastId },
      );
    }
  };

  const handleBatchValidate = async () => {
    setBatchValidating(true);
    const toastId = toast.loading(t('dataQuality.batchLoading', 'Validation en lot en cours…'));
    try {
      const res = await api.post('/data-validation/batch-validate');
      const { validated = 0, skipped_self = 0, solo_mode = false } = res.data || {};

      if (validated > 0 && skipped_self === 0) {
        toast.success(
          solo_mode
            ? t('dataQuality.batchSuccessSolo', '{{n}} entrée(s) validée(s) ✓ (mode mono-utilisateur — TPE)', { n: validated })
            : t('dataQuality.batchSuccessCount', '{{n}} entrée(s) validée(s) ✓', { n: validated }),
          { id: toastId },
        );
      } else if (validated > 0 && skipped_self > 0) {
        toast.success(
          t('dataQuality.batchSuccessPartial', '{{n}} entrée(s) validée(s) ✓ — {{m}} en attente d’un autre collaborateur (séparation des pouvoirs)', { n: validated, m: skipped_self }),
          { id: toastId, duration: 6000 },
        );
      } else if (validated === 0 && skipped_self > 0) {
        toast(
          t('dataQuality.batchAllSkipped', 'Ces {{m}} entrée(s) ont été créées par vous : un autre collaborateur de votre organisation doit les valider (séparation des pouvoirs CSRD).', { m: skipped_self }),
          { id: toastId, icon: 'ℹ️', duration: 7000 },
        );
      } else {
        toast.success(t('dataQuality.batchNothingToValidate', 'Aucune entrée en attente à valider'), { id: toastId });
      }
      await loadData(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || t('dataQuality.batchError', 'Erreur lors de la validation en lot'), { id: toastId });
    } finally {
      setBatchValidating(false);
    }
  };

  /* ── Loading ──────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-56 animate-pulse rounded-3xl bg-gradient-to-br from-blue-700 to-indigo-800" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {[0,1,2,3,4].map(i => <div key={i} className="h-32 animate-pulse rounded-2xl bg-gray-100" />)}
        </div>
        <div className="h-72 animate-pulse rounded-2xl bg-gray-100" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-red-100 bg-red-50 py-16 text-center">
        <AlertCircle className="h-12 w-12 text-red-400 mb-3" />
        <p className="font-semibold text-red-800">{t('dataQuality.loadError', 'Impossible de charger les données')}</p>
        <button onClick={() => loadData()} className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700">
          {t('dataQuality.retry', 'Réessayer')}
        </button>
      </div>
    );
  }

  const gaugeScore = Math.min(Math.round((stats.avg_quality_score ?? 0) * 10), 100);
  const qualityPct = stats.total_entries > 0 ? (stats.verified / stats.total_entries) * 100 : 0;

  /* ── Severity groups ─────────────────────────────────────────────── */
  const highIssues   = issues.filter(i => i.severity === 'high');
  const mediumIssues = issues.filter(i => i.severity === 'medium');
  const lowIssues    = issues.filter(i => i.severity === 'low');

  return (
    <div className="space-y-6">

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-indigo-700 to-blue-800 p-8 text-white shadow-2xl">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-10 left-1/3 h-52 w-52 rounded-full bg-white/5" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Left */}
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold ring-1 ring-white/20">
              <Shield className="h-3.5 w-3.5" />
              {t('dataQuality.heroBadge', 'Audit & Validation CSRD')}
            </div>
            <h1 className="mt-3 text-4xl font-bold tracking-tight">
              {t('dataQuality.title', 'Qualité des Données')}
            </h1>
            <p className="mt-1 text-sm text-white/70">
              {t('dataQuality.subtitle', 'Audit trail & validation conforme CSRD')}
            </p>

            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <span className={`rounded-full px-3 py-1 text-xs ring-1 ring-white/10 font-semibold ${issues.length === 0 ? 'bg-green-500/25 text-green-200' : 'bg-red-500/25 text-red-200'}`}>
                {issues.length === 0 ? t('dataQuality.noIssuesPill', '✓ Aucun problème détecté') : t('dataQuality.issuesPill', '{{n}} problème{{s}} à traiter', { n: issues.length, s: issues.length > 1 ? 's' : '' })}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs ring-1 ring-white/10">
                {t('dataQuality.heroPill', '{{n}} entrées · {{pct}}% vérifiées', { n: stats.total_entries, pct: qualityPct.toFixed(0) })}
              </span>
            </div>

            {/* Period selector */}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="text-xs font-medium text-white/60">{t('dataQuality.periodLabel', 'Période :')}</span>
              <div className="flex gap-1 rounded-xl bg-white/10 p-1 ring-1 ring-white/20">
                {(['30j', '90j', '12m'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                      period === p
                        ? 'bg-white text-blue-800 shadow'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {p === '30j' ? t('dataQuality.period30j', '30 derniers j') :
                     p === '90j' ? t('dataQuality.period90j', '90 derniers j') :
                     t('dataQuality.period12m', '12 derniers mois')}
                  </button>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2 ml-auto lg:ml-0">
                <button
                  onClick={() => loadData(true)}
                  disabled={refreshing}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/20 disabled:opacity-60"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                  {t('dataQuality.refresh', 'Actualiser')}
                </button>
                <button
                  onClick={handleExportReport}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/20"
                  title="Exporter les KPI + tous les problèmes en CSV"
                >
                  <Download className="h-3.5 w-3.5" />
                  CSV
                </button>
                <button
                  onClick={handleGeneratePdfReport}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/20"
                  title="Générer un rapport qualité complet en PDF"
                >
                  <Download className="h-3.5 w-3.5" />
                  PDF
                </button>
                {stats.pending > 0 && (
                  <button
                    onClick={handleBatchValidate}
                    disabled={batchValidating}
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-blue-800 shadow-lg transition hover:bg-white/90 active:scale-95 disabled:opacity-60"
                  >
                    {batchValidating ? <Spinner size="sm" /> : <CheckCheck className="h-3.5 w-3.5" />}
                    {t('dataQuality.batchValidate', 'Valider en lot')}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right: quality ring */}
          <div className="shrink-0">
            <QualityRing score={gaugeScore} size={148} dark />
          </div>
        </div>
      </div>

      {/* ── KPI cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label={t('dataQuality.totalData', 'Total données')}
          value={stats.total_entries}
          icon={Database}
          topColor="#3b82f6" iconBg="#eff6ff" iconColor="#2563eb"
        />
        <StatCard
          label={t('dataQuality.verifiedStat', 'Vérifiées')}
          value={stats.verified}
          sub={`${qualityPct.toFixed(1)}% du total`}
          icon={CheckCircle}
          topColor="#22c55e" iconBg="#f0fdf4" iconColor="#16a34a"
        />
        <StatCard
          label={t('dataQuality.pending', 'En attente')}
          value={stats.pending}
          icon={Clock}
          topColor="#eab308" iconBg="#fefce8" iconColor="#ca8a04"
        />
        <StatCard
          label={t('dataQuality.rejectedStat', 'Rejetées')}
          value={stats.rejected}
          icon={XCircle}
          topColor="#ef4444" iconBg="#fef2f2" iconColor="#dc2626"
        />
        <StatCard
          label={t('dataQuality.flaggedStat', 'Marquées')}
          value={stats.flagged}
          icon={Flag}
          topColor="#f97316" iconBg="#fff7ed" iconColor="#ea580c"
        />
      </div>

      {/* ── Pipeline explainer ────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <Info className="h-4 w-4 text-blue-500" />
            {t('dataQuality.howItWorksTitle', 'Comment fonctionne la validation des données')}
          </h2>
          {stats.pending > 0 && (
            <span className="rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-semibold text-yellow-700">
              {t('dataQuality.howItWorksPendingPill', '{{n}} entrée{{s}} en attente de vérification', { n: stats.pending, s: stats.pending > 1 ? 's' : '' })}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: UploadCloud, color: '#3b82f6', bg: '#eff6ff',
              title: t('dataQuality.step1Title', '① Import des données'),
              desc: t('dataQuality.step1Desc', 'Saisie manuelle, import FEC/CSV ou connecteur automatique. Chaque entrée démarre avec le statut « En attente ».'),
            },
            {
              icon: Shield, color: '#8b5cf6', bg: '#f5f3ff',
              title: t('dataQuality.step2Title', '② Contrôle qualité automatique'),
              desc: t('dataQuality.step2Desc', 'Un score de qualité et des anomalies (valeurs aberrantes, sources manquantes, données obsolètes) sont calculés automatiquement.'),
            },
            {
              icon: Users, color: '#f59e0b', bg: '#fffbeb',
              title: t('dataQuality.step3Title', '③ Vérification (4 yeux)'),
              desc: t('dataQuality.step3Desc', 'Une autre personne de votre organisation vérifie, marque ou rejette l’entrée. Mode solo (TPE) : si vous êtes seul·e, vous pouvez valider vos propres entrées.'),
            },
            {
              icon: Lock, color: '#22c55e', bg: '#f0fdf4',
              title: t('dataQuality.step4Title', '④ Verrouillage & traçabilité'),
              desc: t('dataQuality.step4Desc', 'Une fois vérifiée, l’entrée reçoit une signature électronique SHA-256 (ISAE 3000 · CSRD Art. 29a) et devient en lecture seule.'),
            },
          ].map((step, i, arr) => {
            const Icon = step.icon;
            return (
              <div key={i} className="relative rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: step.bg }}>
                  <Icon className="h-4 w-4" style={{ color: step.color }} />
                </div>
                <p className="text-sm font-semibold text-gray-900">{step.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">{step.desc}</p>
                {i < arr.length - 1 && (
                  <ChevronRight className="absolute -right-2 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-gray-300 lg:block" />
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-xl bg-blue-50 px-4 py-3 text-xs leading-relaxed text-blue-800">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>
            {t('dataQuality.howItWorksFooter', 'Pourquoi un statut reste « En attente » ? La séparation des pouvoirs (CSRD Art. 29a / ISAE 3000) impose qu’une entrée ne soit pas vérifiée par son propre créateur. Si votre compte ne compte qu’un·e seul·e utilisateur·rice actif·ve, le mode solo s’applique automatiquement et vous pouvez valider vos propres entrées via « Valider en lot » ou directement ci-dessous.')}
          </p>
        </div>
      </div>

      {/* ── Validation pipeline bar ───────────────────────────────────── */}
      {stats.total_entries > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">{t('dataQuality.pipelineTitle', 'Pipeline de validation')}</h3>
            <span className="text-xs text-gray-400">{t('dataQuality.pipelineTotal', '{{n}} entrées au total', { n: stats.total_entries })}</span>
          </div>
          <div className="flex h-4 overflow-hidden rounded-full bg-gray-100">
            {[
              { value: stats.verified, color: '#22c55e', label: t('dataQuality.verifiedStat', 'Vérifiées') },
              { value: stats.pending,  color: '#eab308', label: t('dataQuality.pending',      'En attente') },
              { value: stats.flagged,  color: '#f97316', label: t('dataQuality.flaggedStat',  'Marquées') },
              { value: stats.rejected, color: '#ef4444', label: t('dataQuality.rejectedStat', 'Rejetées') },
            ].map((seg, i) => {
              const pct = (seg.value / stats.total_entries) * 100;
              if (pct === 0) return null;
              return (
                <div
                  key={i}
                  className="h-full transition-all duration-700 first:rounded-l-full last:rounded-r-full"
                  style={{ width: `${pct}%`, backgroundColor: seg.color }}
                  title={`${seg.label} : ${seg.value} (${pct.toFixed(1)}%)`}
                />
              );
            })}
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500">
            {[
              { v: stats.verified,  c: '#22c55e', l: t('dataQuality.verifiedStat', 'Vérifiées')  },
              { v: stats.pending,   c: '#eab308', l: t('dataQuality.pending',      'En attente') },
              { v: stats.flagged,   c: '#f97316', l: t('dataQuality.flaggedStat',  'Marquées')   },
              { v: stats.rejected,  c: '#ef4444', l: t('dataQuality.rejectedStat', 'Rejetées')   },
            ].map((s, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.c }} />
                {s.l} ({s.v})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Quality metrics ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Complétude */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            {t('dataQuality.completenessScore', 'Complétude')}
          </h3>
          <div className="mb-4 flex items-center gap-4">
            <SmallRing value={stats.completeness_score} color="#3b82f6" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.completeness_score.toFixed(1)}%</p>
              <p className="text-xs text-gray-400">{t('dataQuality.completenessScore', 'Complétude')}</p>
            </div>
          </div>
          <div className="mb-3 h-2.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-700"
              style={{ width: `${stats.completeness_score}%` }}
            />
          </div>
          <div className="mt-4 space-y-2.5 border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-gray-600">
                <FileText className="h-3.5 w-3.5 text-gray-400" />
                {t('dataQuality.withDocumentedSource', 'Avec source documentée')}
              </span>
              <span className="font-bold text-gray-900">{stats.entries_with_source}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-gray-600">
                <Paperclip className="h-3.5 w-3.5 text-gray-400" />
                {t('dataQuality.withAttachments', 'Avec pièces jointes')}
              </span>
              <span className="font-bold text-gray-900">{stats.entries_with_attachments}</span>
            </div>
          </div>
        </div>

        {/* Score qualité moyen */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Shield className="h-4 w-4 text-green-500" />
            {t('dataQuality.avgQualityScore', 'Score qualité moyen')}
          </h3>
          <div className="flex flex-col items-center py-3">
            <QualityRing score={gaugeScore} size={120} />
            <p className="mt-3 text-sm text-gray-500">{t('dataQuality.outOf100', 'sur 100')}</p>
          </div>
          <div className="mt-3 rounded-xl border px-3 py-2 text-center text-xs"
            style={{
              backgroundColor: gaugeScore >= 75 ? '#f0fdf4' : gaugeScore >= 50 ? '#eff6ff' : '#fef3c7',
              borderColor:     gaugeScore >= 75 ? '#bbf7d0' : gaugeScore >= 50 ? '#bfdbfe' : '#fde68a',
              color:           gaugeScore >= 75 ? '#15803d' : gaugeScore >= 50 ? '#1d4ed8' : '#92400e',
            }}
          >
            <span className="font-semibold">
              {gaugeScore >= 75 ? t('dataQuality.qualityExcellent',    '✓ Qualité excellente') :
               gaugeScore >= 50 ? t('dataQuality.qualitySatisfactory', '→ Qualité satisfaisante') :
               gaugeScore >= 25 ? t('dataQuality.qualityToImprove',    '⚠ Qualité à améliorer') :
               t('dataQuality.qualityInsufficient', '✕ Qualité insuffisante')}
            </span>
          </div>
        </div>

        {/* Données obsolètes */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            {t('dataQuality.staleData', 'Données obsolètes')}
          </h3>
          <div className="flex flex-col items-center py-4">
            <div className={`flex h-20 w-20 items-center justify-center rounded-3xl ${stats.stale_entries > 0 ? 'bg-orange-50' : 'bg-green-50'}`}>
              {stats.stale_entries > 0
                ? <Clock className="h-10 w-10 text-orange-400" />
                : <CheckCircle className="h-10 w-10 text-green-400" />
              }
            </div>
            <p className={`mt-3 text-4xl font-bold ${stats.stale_entries > 0 ? 'text-orange-600' : 'text-green-600'}`}>
              {stats.stale_entries}
            </p>
            <p className="mt-1 text-sm text-gray-500">{t('dataQuality.staleDays', 'entrées > 90 jours sans mise à jour')}</p>
          </div>
          {stats.stale_entries > 0 && (
            <button
              onClick={() => navigate('/app/data-entry')}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-semibold text-orange-700 transition hover:bg-orange-100"
            >
              {t('dataQuality.updateData', 'Mettre à jour')} <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Issues list ───────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <AlertCircle className={`h-5 w-5 ${issues.length > 0 ? 'text-red-500' : 'text-green-500'}`} />
            {t('dataQuality.issuesTitle', `Problèmes détectés`)}
            {issues.length > 0 && (
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">
                {issues.length}
              </span>
            )}
          </h2>
          {issues.length > 0 && (
            <div className="flex gap-2 text-xs">
              {highIssues.length > 0   && <span className="rounded-full bg-red-50 px-2.5 py-1 font-semibold text-red-700">{t('dataQuality.issueCountHigh',   '{{n}} élevé{{s}}',   { n: highIssues.length,   s: highIssues.length   > 1 ? 's' : '' })}</span>}
              {mediumIssues.length > 0 && <span className="rounded-full bg-orange-50 px-2.5 py-1 font-semibold text-orange-700">{t('dataQuality.issueCountMedium', '{{n}} moyen{{s}}',   { n: mediumIssues.length, s: mediumIssues.length > 1 ? 's' : '' })}</span>}
              {lowIssues.length > 0    && <span className="rounded-full bg-yellow-50 px-2.5 py-1 font-semibold text-yellow-700">{t('dataQuality.issueCountLow',    '{{n}} faible{{s}}',  { n: lowIssues.length,    s: lowIssues.length    > 1 ? 's' : '' })}</span>}
            </div>
          )}
        </div>

        {issues.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-green-50">
              <CheckCircle className="h-10 w-10 text-green-400" />
            </div>
            <p className="mt-4 text-xl font-bold text-gray-900">
              {t('dataQuality.noIssuesTitle', 'Aucun problème détecté')}
            </p>
            <p className="mt-2 max-w-md text-sm text-gray-500">
              {t('dataQuality.noIssuesCsrd', 'Vos données sont conformes aux exigences CSRD. Continuez à maintenir cette qualité.')}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={handleGeneratePdfReport}
                className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-green-700"
              >
                <Download className="h-4 w-4" />
                {t('dataQuality.generateQualityReport', 'Générer le rapport qualité')}
                <span className="rounded-full bg-white/25 px-1.5 text-[10px] font-semibold tracking-wide">PDF</span>
              </button>
              <button
                onClick={handleExportReport}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
              >
                <Download className="h-4 w-4" />
                {t('dataQuality.exportCsv', 'Exporter en CSV')}
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {issues.map((issue) => {
              const Icon = getIssueIcon(issue.issue_type);
              const severityLeft: Record<string, string> = {
                high: 'border-l-4 border-red-400',
                medium: 'border-l-4 border-orange-400',
                low: 'border-l-4 border-yellow-400',
              };
              return (
                <div
                  key={issue.id}
                  className={`flex items-start justify-between gap-4 px-6 py-4 transition-colors hover:bg-gray-50 ${severityLeft[issue.severity] ?? ''}`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                      issue.severity === 'high' ? 'bg-red-50' : issue.severity === 'medium' ? 'bg-orange-50' : 'bg-yellow-50'
                    }`}>
                      <Icon className={`h-4 w-4 ${
                        issue.severity === 'high' ? 'text-red-500' : issue.severity === 'medium' ? 'text-orange-500' : 'text-yellow-500'
                      }`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <p className="font-semibold text-gray-900">{issue.metric_name}</p>
                        <SeverityBadge severity={issue.severity} />
                      </div>
                      <p className="text-sm text-gray-600">{issue.details}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        {format(new Date(issue.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-1.5">
                    <button
                      onClick={() => handleValidate(issue.id, 'verify')}
                      disabled={validating === issue.id}
                      title={t('dataQuality.verifyAction', 'Vérifier')}
                      className="inline-flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-2.5 py-1.5 text-xs font-semibold text-green-700 transition hover:bg-green-100 disabled:opacity-50"
                    >
                      {validating === issue.id ? <Spinner size="sm" /> : <ThumbsUp className="h-3.5 w-3.5" />}
                      OK
                    </button>
                    <button
                      onClick={() => handleValidate(issue.id, 'flag')}
                      disabled={validating === issue.id}
                      title={t('dataQuality.flagAction', 'Marquer')}
                      className="inline-flex items-center gap-1 rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-xs font-semibold text-orange-700 transition hover:bg-orange-100 disabled:opacity-50"
                    >
                      <Flag className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleValidate(issue.id, 'reject')}
                      disabled={validating === issue.id}
                      title={t('dataQuality.rejectAction', 'Rejeter')}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                    >
                      <ThumbsDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Recommended actions ───────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <Zap className="h-4 w-4 text-amber-500" />
            {t('dataQuality.recommendedActions', 'Actions recommandées')}
          </h2>
        </div>
        <div className="divide-y divide-gray-50">
          {[
            {
              priority: 1, color: '#ef4444', bg: '#fef2f2', label: t('dataQuality.priorityHigh', 'Priorité haute'),
              text: t('dataQuality.actionMissingData', 'Compléter les données ESG manquantes pour améliorer la couverture'),
              btnLabel: t('dataQuality.actionEnterBtn', 'Saisir des données'),
              route: '/app/data-entry',
              icon: Database,
            },
            {
              priority: 2, color: '#f97316', bg: '#fff7ed', label: t('dataQuality.priorityMedium', 'Priorité moyenne'),
              text: t('dataQuality.actionPendingValidation', 'Valider les entrées en attente de révision'),
              btnLabel: t('dataQuality.actionValidateBtn', 'Valider'),
              route: '/app/data-quality',
              icon: CheckCheck,
            },
            {
              priority: 3, color: '#3b82f6', bg: '#eff6ff', label: t('dataQuality.priorityRecommended', 'Recommandé'),
              text: t('dataQuality.actionMissingSource', 'Documenter la source des données sans référence'),
              btnLabel: t('dataQuality.actionVerifyBtn', 'Vérifier'),
              route: '/app/data-quality',
              icon: FileText,
            },
            {
              priority: 4, color: '#22c55e', bg: '#f0fdf4', label: t('dataQuality.priorityOptional', 'Optionnel'),
              text: t('dataQuality.actionConnectEnedis', 'Connecter une source de données externe pour automatiser la collecte'),
              btnLabel: t('dataQuality.actionConnectBtn', 'Connecter'),
              route: '/app/data/connectors',
              icon: Zap,
            },
          ].map((action, idx) => {
            const Icon = action.icon;
            return (
              <div key={idx} className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-gray-50/60">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: action.bg }}>
                  <Icon className="h-4 w-4" style={{ color: action.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 leading-snug">{action.text}</p>
                  <span className="mt-0.5 text-xs font-medium" style={{ color: action.color }}>{action.label}</span>
                </div>
                <button
                  onClick={() => navigate(action.route)}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 hover:border-gray-300"
                >
                  {action.btnLabel}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
