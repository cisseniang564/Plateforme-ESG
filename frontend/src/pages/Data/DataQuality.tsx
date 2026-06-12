import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Shield, CheckCircle, AlertCircle, XCircle, RefreshCw,
  Database, TrendingUp, ArrowRight, Upload, Leaf, Users,
  BarChart2, FileText, Clock, Zap, Brain, Sparkles, AlertTriangle,
} from 'lucide-react';
import Spinner from '@/components/common/Spinner';
import BackButton from '@/components/common/BackButton';
import api from '@/services/api';

// ─── Interfaces ────────────────────────────────────────────────────────────────

interface UploadItem {
  id: string;
  filename: string;
  status: string;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  success_rate: number;
  validation_errors?: Record<string, string[]>;
  created_at: string;
}

interface EntryStats {
  total: number;
  by_pillar: Record<string, number>;
  by_verification_status: Record<string, number>;
}

interface AnomalyItem {
  entry_id: string;
  metric_name: string;
  value: number;
  period_start: string | null;
  anomaly_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  reason_fr: string;
  expected_range?: number[] | null;
  suggested_value?: number | null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getStatus(score: number): 'good' | 'warning' | 'poor' {
  if (score >= 85) return 'good';
  if (score >= 65) return 'warning';
  return 'poor';
}

// ─── Circular Ring ─────────────────────────────────────────────────────────────

function CircleRing({
  pct, color, size = 80, strokeWidth = 7,
}: { pct: number; color: string; size?: number; strokeWidth?: number }) {
  const r = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const cx = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={cx} cy={cx} r={r} fill="none" strokeWidth={strokeWidth} stroke="rgba(255,255,255,0.12)" />
      <circle cx={cx} cy={cx} r={r} fill="none" strokeWidth={strokeWidth}
        stroke={color} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ}
        transform={`rotate(-90 ${cx} ${cx})`}
        style={{ transition: 'stroke-dashoffset 0.7s ease' }} />
      <text x={cx} y={cx + 1} textAnchor="middle" dominantBaseline="middle"
        fontSize={size * 0.22} fontWeight="800" fill="white">{pct}</text>
      <text x={cx} y={cx + size * 0.2} textAnchor="middle" dominantBaseline="middle"
        fontSize={size * 0.13} fill="rgba(255,255,255,0.6)">%</text>
    </svg>
  );
}

// ─── Dimension card ─────────────────────────────────────────────────────────────

interface DimCard {
  label: string;
  score: number;
  desc: string;
  icon: React.ElementType;
  gradient: string;
  ringColor: string;
}

function DimensionCard({ dim }: { dim: DimCard }) {
  const Icon = dim.icon;
  const status = getStatus(dim.score);
  const statusText = status === 'good' ? 'Excellent' : status === 'warning' ? 'À améliorer' : 'Critique';
  const statusColor = status === 'good' ? 'text-emerald-600 bg-emerald-50' : status === 'warning' ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50';
  const barColor = status === 'good' ? 'bg-emerald-500' : status === 'warning' ? 'bg-amber-400' : 'bg-red-500';

  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-lg ${dim.gradient}`}>
      {/* Decorative ring */}
      <div className="absolute -right-4 -top-4 h-28 w-28 rounded-full bg-white/5" />
      <div className="absolute -right-8 -bottom-6 h-36 w-36 rounded-full bg-white/5" />

      <div className="relative flex items-start justify-between mb-4">
        <div className="flex flex-col gap-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm ring-1 ring-white/20">
            <Icon size={18} className="text-white" />
          </div>
          <p className="mt-2 text-xs font-semibold text-white/70 uppercase tracking-wider">{dim.label}</p>
        </div>
        <CircleRing pct={dim.score} color="white" size={72} strokeWidth={6} />
      </div>

      <div className="mt-1">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${statusColor}`}>
          {status === 'good' ? <CheckCircle size={9} /> : status === 'warning' ? <AlertCircle size={9} /> : <XCircle size={9} />}
          {statusText}
        </span>
        <p className="mt-2 text-[11px] text-white/60 leading-relaxed">{dim.desc}</p>
      </div>

      <div className="mt-3 h-1 w-full rounded-full bg-white/20">
        <div className={`h-1 rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${dim.score}%` }} />
      </div>
    </div>
  );
}

// ─── Pillar Bar ─────────────────────────────────────────────────────────────────

function PillarBar({ label, count, total, color, bg }: { label: string; count: number; total: number; color: string; bg: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-28 flex-shrink-0">
        <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold`} style={{ background: bg, color }}>
          {label}
        </span>
      </div>
      <div className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="w-20 text-right text-[12px] font-semibold text-gray-700">{count.toLocaleString('fr-FR')} entrées</span>
      <span className="w-10 text-right text-[11px] text-gray-400">{pct}%</span>
    </div>
  );
}

// ─── File row ───────────────────────────────────────────────────────────────────

function FileRow({ upload }: { upload: UploadItem }) {
  const rate = upload.success_rate ?? (upload.total_rows > 0 ? Math.round((upload.valid_rows / upload.total_rows) * 100) : 0);
  const statusMap: Record<string, { label: string; cls: string }> = {
    completed: { label: 'Traité', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
    failed: { label: 'Échoué', cls: 'bg-red-50 text-red-700 ring-red-200' },
    processing: { label: 'En cours', cls: 'bg-blue-50 text-blue-700 ring-blue-200' },
  };
  const st = statusMap[upload.status] ?? { label: upload.status, cls: 'bg-gray-50 text-gray-600 ring-gray-200' };
  const barColor = rate >= 85 ? '#10b981' : rate >= 65 ? '#f59e0b' : '#ef4444';

  return (
    <tr className="border-t border-gray-100 hover:bg-gray-50/60 transition-colors duration-100">
      <td className="py-3 pl-4 pr-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50">
            <FileText size={13} className="text-blue-500" />
          </div>
          <span className="text-[13px] font-medium text-gray-800 truncate max-w-[180px]" title={upload.filename}>
            {upload.filename}
          </span>
        </div>
      </td>
      <td className="py-3 px-2">
        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ${st.cls}`}>
          {upload.status === 'completed' && <CheckCircle size={9} />}
          {upload.status === 'failed' && <XCircle size={9} />}
          {upload.status === 'processing' && <Clock size={9} />}
          {st.label}
        </span>
      </td>
      <td className="py-3 px-2 text-[13px] text-gray-700 text-right tabular-nums">
        {upload.total_rows.toLocaleString('fr-FR')}
      </td>
      <td className="py-3 px-2 text-[13px] text-emerald-700 text-right tabular-nums font-medium">
        {(upload.valid_rows || 0).toLocaleString('fr-FR')}
      </td>
      <td className="py-3 px-2 text-[13px] text-red-600 text-right tabular-nums">
        {(upload.invalid_rows || 0).toLocaleString('fr-FR')}
      </td>
      <td className="py-3 pl-2 pr-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden min-w-[60px]">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${rate}%`, backgroundColor: barColor }} />
          </div>
          <span className="text-[12px] font-bold w-9 text-right" style={{ color: barColor }}>{rate}%</span>
        </div>
      </td>
      <td className="py-3 pr-4 text-[11px] text-gray-400 text-right">
        {new Date(upload.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
      </td>
    </tr>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function DataQuality() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [entryStats, setEntryStats] = useState<EntryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);
  const [anomalySev, setAnomalySev] = useState<Record<string, number>>({});
  const [anomaliesLoading, setAnomaliesLoading] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [uploadsRes, statsRes] = await Promise.all([
        api.get('/data/uploads', { params: { page_size: 100 } }),
        api.get('/data-entry/stats').catch(() => ({ data: null })),
      ]);
      setUploads(uploadsRes.data.items || []);
      if (statsRes.data) setEntryStats(statsRes.data);
      // ── Anomaly detection ML (best-effort, non-blocking) ──────────────────
      loadAnomalies();
    } catch (error) {
      console.error('Error loading quality data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAnomalies = async (refresh: boolean = false) => {
    setAnomaliesLoading(true);
    try {
      const res = await api.get('/data-validation/quality/anomalies', {
        params: { min_confidence: 0.4, refresh },
      });
      setAnomalies(res.data?.anomalies || []);
      setAnomalySev(res.data?.by_severity || {});
    } catch (err) {
      console.warn('Anomaly detection unavailable:', err);
    } finally {
      setAnomaliesLoading(false);
    }
  };

  // ── Computed scores ──────────────────────────────────────────────────────────
  const completedUploads = uploads.filter(u => u.total_rows > 0);
  const totalRows = completedUploads.reduce((s, u) => s + u.total_rows, 0);
  const validRows = completedUploads.reduce((s, u) => s + (u.valid_rows || 0), 0);
  const invalidRows = completedUploads.reduce((s, u) => s + (u.invalid_rows || 0), 0);
  const completedCount = uploads.filter(u => u.status === 'completed').length;
  const failedCount = uploads.filter(u => u.status === 'failed').length;

  const completenessScore = totalRows > 0 ? Math.round((validRows / totalRows) * 100) : 0;
  const accuracyScore = completedUploads.length > 0
    ? Math.round(completedUploads.reduce((s, u) => s + (u.success_rate || 0), 0) / completedUploads.length)
    : 0;
  const consistencyScore = uploads.length > 0
    ? Math.round((completedCount / uploads.length) * 100)
    : 0;

  const pillarsWithData = entryStats
    ? Object.values(entryStats.by_pillar).filter(v => v > 0).length
    : (uploads.length > 0 ? 3 : 0);
  const coverageScore = Math.round((pillarsWithData / 3) * 100);
  const verifiedCount = entryStats?.by_verification_status?.['verified'] ?? 0;
  const totalEntries = entryStats?.total ?? 0;
  const verificationScore = totalEntries > 0 ? Math.round((verifiedCount / totalEntries) * 100) : 0;

  const globalScore = uploads.length > 0
    ? Math.round((completenessScore + accuracyScore + consistencyScore + coverageScore) / 4)
    : 0;
  const globalStatus = getStatus(globalScore);

  // ── Dimension cards ──────────────────────────────────────────────────────────
  const dimensions: DimCard[] = [
    {
      label: 'Complétude', score: completenessScore,
      desc: `${validRows.toLocaleString('fr-FR')} lignes valides sur ${totalRows.toLocaleString('fr-FR')}`,
      icon: Database,
      gradient: 'bg-gradient-to-br from-blue-600 to-blue-800',
      ringColor: '#60a5fa',
    },
    {
      label: 'Exactitude', score: accuracyScore,
      desc: `Taux de succès moyen sur ${completedUploads.length} imports`,
      icon: CheckCircle,
      gradient: 'bg-gradient-to-br from-emerald-500 to-emerald-700',
      ringColor: '#6ee7b7',
    },
    {
      label: 'Cohérence', score: consistencyScore,
      desc: `${completedCount} traités · ${failedCount} échoués`,
      icon: Shield,
      gradient: 'bg-gradient-to-br from-violet-600 to-violet-800',
      ringColor: '#c4b5fd',
    },
    {
      label: 'Couverture ESRS', score: coverageScore,
      desc: `${pillarsWithData}/3 piliers · ${totalEntries.toLocaleString('fr-FR')} entrées saisies`,
      icon: TrendingUp,
      gradient: 'bg-gradient-to-br from-amber-500 to-orange-600',
      ringColor: '#fcd34d',
    },
  ];

  // ── Global gauge SVG ─────────────────────────────────────────────────────────
  const gaugeR = 52, gaugeCirc = 2 * Math.PI * gaugeR;
  const gaugeOffset = gaugeCirc * (1 - globalScore / 100);
  const gaugeColor = globalStatus === 'good' ? '#34d399' : globalStatus === 'warning' ? '#fbbf24' : '#f87171';

  // ── Issues ───────────────────────────────────────────────────────────────────
  const issues: Array<{ type: 'error' | 'warning' | 'info'; message: string; action?: string; actionPath?: string }> = [];
  if (failedCount > 0)
    issues.push({ type: 'error', message: `${failedCount} import${failedCount > 1 ? 's' : ''} échoué${failedCount > 1 ? 's' : ''} — vérifiez le format des fichiers`, action: 'Réessayer', actionPath: '/app/data/upload' });
  if (invalidRows > 0)
    issues.push({ type: 'warning', message: `${invalidRows.toLocaleString('fr-FR')} lignes invalides détectées dans vos imports`, action: 'Valider', actionPath: '/app/validation' });
  if (pillarsWithData < 3 && uploads.length > 0)
    issues.push({ type: 'warning', message: `Seuls ${pillarsWithData}/3 piliers ESG ont des données — couverture incomplète`, action: 'Ajouter des données', actionPath: '/app/data-entry' });
  if (verificationScore < 50 && totalEntries > 0)
    issues.push({ type: 'warning', message: `Seulement ${verificationScore}% de vos données sont vérifiées — améliorez la traçabilité`, action: 'Vérifier', actionPath: '/app/validation' });
  if (issues.length === 0 && uploads.length > 0)
    issues.push({ type: 'info', message: 'Tous les contrôles qualité sont passés avec succès. Vos données sont en bonne santé !' });

  // ── Pillar breakdown ─────────────────────────────────────────────────────────
  const envCount = entryStats?.by_pillar?.['environmental'] ?? 0;
  const socCount = entryStats?.by_pillar?.['social'] ?? 0;
  const govCount = entryStats?.by_pillar?.['governance'] ?? 0;
  const maxPillar = Math.max(envCount, socCount, govCount, 1);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackButton to="/app/data" label="Données" />

      {/* ── Hero (signature gradient) ───────────────────────────────────────── */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-900 p-8 text-white shadow-2xl relative">
        {/* Single emerald accent — matches PageHero signature */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 80% 20%, rgba(16,185,129,0.18), transparent 55%)' }}
        />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: title + stats row */}
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold ring-1 ring-white/20 backdrop-blur-sm mb-4">
              <Shield size={12} />
              Contrôle Qualité des Données
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Qualité des données ESG
            </h1>
            <p className="text-sm text-white/60 max-w-lg mb-6">
              Surveillez la complétude, l'exactitude et la cohérence de vos données. Identifiez les lacunes et améliorez votre conformité ESRS.
            </p>

            {/* Quick stats */}
            <div className="flex flex-wrap gap-3">
              {[
                { icon: Database, label: 'Imports', value: uploads.length },
                { icon: CheckCircle, label: 'Traités', value: completedCount },
                { icon: Zap, label: 'Lignes totales', value: totalRows.toLocaleString('fr-FR') },
                { icon: Users, label: 'Entrées saisies', value: totalEntries.toLocaleString('fr-FR') },
              ].map(s => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="flex items-center gap-2 rounded-xl bg-white/8 px-3 py-2 ring-1 ring-white/12 backdrop-blur-sm">
                    <Icon size={13} className="text-white/50" />
                    <span className="text-xs text-white/50">{s.label}</span>
                    <span className="text-sm font-bold text-white">{s.value}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Center: big gauge */}
          {uploads.length > 0 && (
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <svg width="140" height="140" viewBox="0 0 140 140">
                  {/* Background glow */}
                  <defs>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                      <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>
                  <circle cx="70" cy="70" r={gaugeR} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
                  <circle cx="70" cy="70" r={gaugeR} fill="none" stroke={gaugeColor} strokeWidth="12"
                    strokeDasharray={gaugeCirc} strokeDashoffset={gaugeOffset} strokeLinecap="round"
                    transform="rotate(-90 70 70)" filter="url(#glow)"
                    style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                  <text x="70" y="62" textAnchor="middle" fontSize="28" fontWeight="900" fill="white">{globalScore}</text>
                  <text x="70" y="80" textAnchor="middle" fontSize="12" fill="rgba(255,255,255,0.5)">/100</text>
                  <text x="70" y="96" textAnchor="middle" fontSize="10" fill={gaugeColor} fontWeight="700">
                    {globalStatus === 'good' ? 'EXCELLENT' : globalStatus === 'warning' ? 'ACCEPTABLE' : 'À AMÉLIORER'}
                  </text>
                </svg>
              </div>
              <p className="text-xs text-white/40 font-medium uppercase tracking-wider">Score global qualité</p>
            </div>
          )}

          {/* Right: refresh */}
          <div className="self-start">
            <button
              onClick={loadData}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium px-4 py-2 rounded-xl transition-all"
            >
              <RefreshCw size={14} />
              Actualiser
            </button>
          </div>
        </div>
      </div>

      {/* ── Empty state ───────────────────────────────────────────────────────── */}
      {uploads.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="text-center py-20">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100">
              <Database className="h-10 w-10 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Aucune donnée disponible</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
              Importez vos premières données ESG pour voir les métriques de qualité, les scores et les alertes.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => navigate('/app/data/upload')}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Upload size={14} />
                Importer des données
              </button>
              <button
                onClick={() => navigate('/app/data-entry')}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Saisie manuelle
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* ── Dimension cards ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {dimensions.map(dim => <DimensionCard key={dim.label} dim={dim} />)}
          </div>

          {/* ── Verification + Pillar coverage ──────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Verification card */}
            <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Taux de vérification</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Données validées par un opérateur</p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50">
                  <Shield size={16} className="text-rose-500" />
                </div>
              </div>

              <div className="flex items-center gap-5">
                {/* Mini SVG ring */}
                {(() => {
                  const r2 = 32, circ2 = 2 * Math.PI * r2;
                  const col = getStatus(verificationScore) === 'good' ? '#10b981' : getStatus(verificationScore) === 'warning' ? '#f59e0b' : '#ef4444';
                  return (
                    <svg width="80" height="80" viewBox="0 0 80 80" className="flex-shrink-0">
                      <circle cx="40" cy="40" r={r2} fill="none" strokeWidth="8" stroke="#f1f5f9" />
                      <circle cx="40" cy="40" r={r2} fill="none" strokeWidth="8"
                        stroke={col} strokeLinecap="round"
                        strokeDasharray={circ2} strokeDashoffset={circ2 - (verificationScore / 100) * circ2}
                        transform="rotate(-90 40 40)" style={{ transition: 'stroke-dashoffset 0.7s ease' }} />
                      <text x="40" y="40" textAnchor="middle" dominantBaseline="middle"
                        fontSize="16" fontWeight="900" fill={col}>{verificationScore}%</text>
                    </svg>
                  );
                })()}
                <div className="flex-1">
                  <p className="text-2xl font-black text-gray-900">{verifiedCount.toLocaleString('fr-FR')}</p>
                  <p className="text-xs text-gray-400 mt-0.5">vérifiées sur {totalEntries.toLocaleString('fr-FR')} entrées</p>
                  <div className="mt-3">
                    <button
                      onClick={() => navigate('/app/validation')}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700"
                    >
                      Vérifier les données <ArrowRight size={11} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Pillar coverage */}
            <div className="lg:col-span-3 rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Couverture par pilier ESG</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Répartition des entrées par dimension</p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50">
                  <Leaf size={16} className="text-green-500" />
                </div>
              </div>

              <div className="space-y-3.5">
                <PillarBar label="🌿 Environnement" count={envCount} total={maxPillar} color="#16a34a" bg="#f0fdf4" />
                <PillarBar label="👥 Social" count={socCount} total={maxPillar} color="#2563eb" bg="#eff6ff" />
                <PillarBar label="🏛️ Gouvernance" count={govCount} total={maxPillar} color="#7c3aed" bg="#faf5ff" />
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                <p className="text-xs text-gray-400">Total: <span className="font-semibold text-gray-700">{totalEntries.toLocaleString('fr-FR')} entrées saisies</span></p>
                <button
                  onClick={() => navigate('/app/data-entry')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  Ajouter des données <ArrowRight size={11} />
                </button>
              </div>
            </div>
          </div>

          {/* ── Issues panel ──────────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50">
                  <AlertCircle size={16} className="text-amber-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Alertes & Recommandations</h3>
                  <p className="text-xs text-gray-400">{issues.length} {issues.length === 1 ? 'alerte' : 'alertes'} détectée{issues.length > 1 ? 's' : ''}</p>
                </div>
              </div>
              {issues.every(i => i.type === 'info') && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full ring-1 ring-emerald-200">
                  <CheckCircle size={10} /> Tout va bien
                </span>
              )}
            </div>
            <div className="divide-y divide-gray-50">
              {issues.map((issue, i) => {
                const isError = issue.type === 'error';
                const isInfo = issue.type === 'info';
                const Icon = isError ? XCircle : isInfo ? CheckCircle : AlertCircle;
                const colors = isError
                  ? { icon: 'text-red-500', bg: 'bg-red-50', ring: 'ring-red-100', text: 'text-red-800', btn: 'text-red-600 bg-red-50 hover:bg-red-100' }
                  : isInfo
                  ? { icon: 'text-emerald-500', bg: 'bg-emerald-50', ring: 'ring-emerald-100', text: 'text-emerald-800', btn: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' }
                  : { icon: 'text-amber-500', bg: 'bg-amber-50', ring: 'ring-amber-100', text: 'text-amber-800', btn: 'text-amber-600 bg-amber-50 hover:bg-amber-100' };

                return (
                  <div key={i} className="flex items-center gap-4 px-5 py-4">
                    <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl ${colors.bg} ring-1 ${colors.ring}`}>
                      <Icon size={15} className={colors.icon} />
                    </div>
                    <p className={`flex-1 text-sm ${colors.text}`}>{issue.message}</p>
                    {issue.action && issue.actionPath && (
                      <button
                        onClick={() => navigate(issue.actionPath!)}
                        className={`flex-shrink-0 inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${colors.btn}`}
                      >
                        {issue.action} <ArrowRight size={10} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── ML Anomaly Detection panel ──────────────────────────────────── */}
          <AnomaliesPanel
            anomalies={anomalies}
            severities={anomalySev}
            loading={anomaliesLoading}
            onRefresh={() => loadAnomalies(true)}
          />

          {/* ── File breakdown table ─────────────────────────────────────────── */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50">
                  <BarChart2 size={16} className="text-blue-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Détail des imports</h3>
                  <p className="text-xs text-gray-400">{uploads.length} fichiers analysés</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/app/data/upload')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Upload size={11} />
                Importer
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/70">
                    <th className="py-2.5 pl-4 pr-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Fichier</th>
                    <th className="py-2.5 px-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
                    <th className="py-2.5 px-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wide text-right">Lignes</th>
                    <th className="py-2.5 px-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wide text-right">Valides</th>
                    <th className="py-2.5 px-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wide text-right">Invalides</th>
                    <th className="py-2.5 pl-2 pr-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Taux succès</th>
                    <th className="py-2.5 pr-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wide text-right">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {uploads.slice(0, 10).map(u => <FileRow key={u.id} upload={u} />)}
                </tbody>
              </table>
              {uploads.length > 10 && (
                <div className="px-5 py-3 border-t border-gray-100 text-center">
                  <p className="text-xs text-gray-400">+ {uploads.length - 10} autres fichiers</p>
                </div>
              )}
            </div>
          </div>

          {/* ── CTA footer ──────────────────────────────────────────────────── */}
          <div className="rounded-2xl overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 p-6 shadow-lg shadow-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Améliorez votre score qualité</h3>
                <p className="text-sm text-blue-100 mt-1">Validez les données en attente ou connectez de nouvelles sources de données</p>
              </div>
              <div className="flex gap-3 flex-shrink-0">
                <button
                  onClick={() => navigate('/app/validation')}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white text-blue-700 text-sm font-semibold rounded-xl hover:bg-blue-50 transition-colors shadow-sm"
                >
                  <CheckCircle size={14} />
                  Valider les données
                </button>
                <button
                  onClick={() => navigate('/app/data/connectors')}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/30 border border-white/30 text-white text-sm font-medium rounded-xl hover:bg-blue-500/40 transition-colors"
                >
                  Connecteurs <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Anomalies Panel (ML-detected outliers) ────────────────────────────────

const ANOMALY_TYPE_LABELS: Record<string, string> = {
  z_score:           'Écart statistique (z-score)',
  iqr:               'Hors plage interquartile',
  magnitude:         'Erreur d\'unité probable',
  sign_flip:         'Valeur négative inattendue',
  yoy_delta:         'Variation période/période',
  isolation_forest:  'Motif inhabituel (Isolation Forest)',
};

const SEV_STYLE: Record<string, { chip: string; ring: string; dot: string; label: string }> = {
  critical: { chip: 'bg-red-100 text-red-800 ring-red-200',         ring: 'ring-red-200',     dot: 'bg-red-500',     label: 'Critique' },
  high:     { chip: 'bg-orange-100 text-orange-800 ring-orange-200', ring: 'ring-orange-200',  dot: 'bg-orange-500',  label: 'Élevée'   },
  medium:   { chip: 'bg-amber-100 text-amber-800 ring-amber-200',    ring: 'ring-amber-200',   dot: 'bg-amber-500',   label: 'Moyenne'  },
  low:      { chip: 'bg-blue-100 text-blue-800 ring-blue-200',       ring: 'ring-blue-200',    dot: 'bg-blue-500',    label: 'Faible'   },
};

function AnomaliesPanel({
  anomalies, severities, loading, onRefresh,
}: {
  anomalies: AnomalyItem[];
  severities: Record<string, number>;
  loading: boolean;
  onRefresh: () => void;
}) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? anomalies : anomalies.slice(0, 5);

  return (
    <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/30 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-indigo-100">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 ring-1 ring-indigo-200">
            <Brain size={16} className="text-indigo-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              Détection d'anomalies ML
              <Sparkles size={12} className="text-indigo-500" />
            </h3>
            <p className="text-xs text-gray-500">
              {loading ? 'Analyse en cours…' :
                anomalies.length === 0
                  ? 'Aucune anomalie détectée — vos données sont cohérentes.'
                  : `${anomalies.length} anomalie${anomalies.length > 1 ? 's' : ''} détectée${anomalies.length > 1 ? 's' : ''}.`
              }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Severity chips */}
          {(['critical', 'high', 'medium', 'low'] as const).map((sev) => {
            const n = severities[sev] || 0;
            if (n === 0) return null;
            const s = SEV_STYLE[sev];
            return (
              <span key={sev} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ring-1 ${s.chip}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`}></span>
                {n} {s.label.toLowerCase()}
              </span>
            );
          })}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            title="Relancer l'analyse"
          >
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading && anomalies.length === 0 && (
        <div className="px-5 py-8 text-center text-sm text-gray-400">
          <Spinner /> <span className="ml-2">Analyse statistique en cours…</span>
        </div>
      )}

      {!loading && anomalies.length === 0 && (
        <div className="px-5 py-8 text-center">
          <CheckCircle size={28} className="mx-auto text-emerald-400 mb-2" />
          <p className="text-sm font-medium text-gray-700">Aucune anomalie détectée</p>
          <p className="text-xs text-gray-400 mt-1">
            Le modèle (z-score + Isolation Forest) n'a rien signalé sur vos saisies récentes.
          </p>
        </div>
      )}

      {visible.length > 0 && (
        <div className="divide-y divide-indigo-50">
          {visible.map((a) => {
            const sev = SEV_STYLE[a.severity] || SEV_STYLE.low;
            const typeLabel = ANOMALY_TYPE_LABELS[a.anomaly_type] || a.anomaly_type;
            return (
              <div key={a.entry_id + a.anomaly_type} className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${sev.chip}`}>
                    <AlertTriangle size={13} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${sev.chip}`}>
                        {sev.label}
                      </span>
                      <span className="text-[11px] font-medium text-indigo-600 bg-indigo-100/70 px-1.5 py-0.5 rounded">
                        {typeLabel}
                      </span>
                      <span className="text-[11px] font-semibold text-gray-700 truncate">
                        {a.metric_name}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {a.confidence ? `confiance ${Math.round(a.confidence * 100)}%` : ''}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{a.reason_fr}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-500">
                      <span><strong className="text-gray-700">Valeur :</strong> {a.value.toLocaleString('fr-FR')}</span>
                      {a.expected_range && (
                        <span><strong className="text-gray-700">Attendu :</strong> {a.expected_range[0]} – {a.expected_range[1]}</span>
                      )}
                      {a.suggested_value !== null && a.suggested_value !== undefined && (
                        <span><strong className="text-gray-700">Suggéré :</strong> {a.suggested_value.toLocaleString('fr-FR')}</span>
                      )}
                      {a.period_start && (
                        <span><Clock size={10} className="inline" /> {a.period_start}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/app/data')}
                    className="flex-shrink-0 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 px-2.5 py-1 rounded-md transition-colors"
                  >
                    Examiner <ArrowRight size={9} className="inline" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {anomalies.length > 5 && (
        <div className="px-5 py-3 border-t border-indigo-100 bg-indigo-50/40">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs font-semibold text-indigo-700 hover:text-indigo-800 transition-colors"
          >
            {expanded ? 'Réduire' : `Afficher les ${anomalies.length - 5} autres anomalies`}
          </button>
        </div>
      )}
    </div>
  );
}
