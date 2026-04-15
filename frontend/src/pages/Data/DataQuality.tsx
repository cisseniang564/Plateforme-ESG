import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Shield, CheckCircle, AlertCircle, XCircle, RefreshCw,
  Database, TrendingUp, ArrowRight, Upload,
} from 'lucide-react';
import Card from '@/components/common/Card';
import Spinner from '@/components/common/Spinner';
import BackButton from '@/components/common/BackButton';
import api from '@/services/api';

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

interface QualityMetric {
  name: string;
  score: number;
  status: 'good' | 'warning' | 'poor';
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  desc: string;
}

function getStatus(score: number): 'good' | 'warning' | 'poor' {
  if (score >= 85) return 'good';
  if (score >= 65) return 'warning';
  return 'poor';
}

function MetricCard({ metric }: { metric: QualityMetric }) {
  const Icon = metric.icon;
  const statusIcon = metric.status === 'good' ? CheckCircle : metric.status === 'warning' ? AlertCircle : XCircle;
  const StatusIcon = statusIcon;
  const statusColor = metric.status === 'good' ? 'text-emerald-600' : metric.status === 'warning' ? 'text-amber-600' : 'text-red-600';
  const barColor = metric.status === 'good' ? 'bg-emerald-500' : metric.status === 'warning' ? 'bg-amber-500' : 'bg-red-500';

  return (
    <Card className={`border-l-4 ${metric.border}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${metric.bg}`}>
          <Icon size={18} className={metric.color} />
        </div>
        <StatusIcon size={16} className={statusColor} />
      </div>
      <p className="text-sm font-semibold text-gray-700 mb-1">{metric.name}</p>
      <p className={`text-3xl font-bold ${statusColor}`}>{metric.score}%</p>
      <p className="text-xs text-gray-400 mt-1 mb-3">{metric.desc}</p>
      <div className="w-full bg-gray-100 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${metric.score}%` }}
        />
      </div>
    </Card>
  );
}

interface EntryStats {
  total: number;
  by_pillar: Record<string, number>;
  by_verification_status: Record<string, number>;
}

export default function DataQuality() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [entryStats, setEntryStats] = useState<EntryStats | null>(null);
  const [loading, setLoading] = useState(true);

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
    } catch (error) {
      console.error('Error loading quality data:', error);
    } finally {
      setLoading(false);
    }
  };

  const completedUploads = uploads.filter(u => u.total_rows > 0);
  const totalRows = completedUploads.reduce((s, u) => s + u.total_rows, 0);
  const validRows = completedUploads.reduce((s, u) => s + (u.valid_rows || 0), 0);
  const invalidRows = completedUploads.reduce((s, u) => s + (u.invalid_rows || 0), 0);
  const completedCount = uploads.filter(u => u.status === 'completed').length;

  const completenessScore = totalRows > 0 ? Math.round((validRows / totalRows) * 100) : 0;
  const accuracyScore = completedUploads.length > 0
    ? Math.round(completedUploads.reduce((s, u) => s + (u.success_rate || 0), 0) / completedUploads.length)
    : 0;
  const consistencyScore = uploads.length > 0
    ? Math.round((completedCount / uploads.length) * 100)
    : 0;
  // Coverage: how many ESRS pillars have data-entry records (0/3, 1/3, 2/3, 3/3 → 0/33/67/100%)
  const pillarsWithData = entryStats
    ? Object.values(entryStats.by_pillar).filter(v => v > 0).length
    : (uploads.length > 0 ? 3 : 0);
  const coverageScore = Math.round((pillarsWithData / 3) * 100);
  // Verification: % of entries that are verified (all pending → 0%)
  const verifiedCount = entryStats?.by_verification_status?.['verified'] ?? 0;
  const totalEntries = entryStats?.total ?? 0;
  const verificationScore = totalEntries > 0 ? Math.round((verifiedCount / totalEntries) * 100) : 0;

  const globalScore = Math.round((completenessScore + accuracyScore + consistencyScore + coverageScore) / 4);
  const globalStatus = getStatus(globalScore);
  const globalColor = globalStatus === 'good' ? '#16a34a' : globalStatus === 'warning' ? '#d97706' : '#dc2626';

  const qualityMetrics: QualityMetric[] = [
    {
      name: t('data.quality.completeness', 'Complétude'), score: completenessScore,
      status: getStatus(completenessScore), icon: Database,
      color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-400',
      desc: t('data.quality.completenessDesc', 'Lignes valides / total'),
    },
    {
      name: t('data.quality.accuracy', 'Exactitude'), score: accuracyScore,
      status: getStatus(accuracyScore), icon: CheckCircle,
      color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-400',
      desc: t('data.quality.accuracyDesc', 'Taux moyen de succès'),
    },
    {
      name: t('data.quality.consistency', 'Cohérence'), score: consistencyScore,
      status: getStatus(consistencyScore), icon: Shield,
      color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-400',
      desc: t('data.quality.consistencyDesc', 'Fichiers traités / total'),
    },
    {
      name: t('data.quality.coverage', 'Couverture ESRS'), score: coverageScore,
      status: getStatus(coverageScore), icon: TrendingUp,
      color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-400',
      desc: totalEntries > 0
        ? `${pillarsWithData}/3 piliers · ${totalEntries.toLocaleString('fr-FR')} entrées`
        : t('data.quality.coverageDesc', 'Piliers couverts'),
    },
    {
      name: t('data.quality.verification', 'Vérification'), score: verificationScore,
      status: getStatus(verificationScore), icon: Shield,
      color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-400',
      desc: totalEntries > 0
        ? `${verifiedCount.toLocaleString('fr-FR')} / ${totalEntries.toLocaleString('fr-FR')} entrées vérifiées`
        : 'Aucune donnée saisie',
    },
  ];

  const issues: Array<{ type: 'error' | 'warning' | 'info'; message: string }> = [];
  if (invalidRows > 0) {
    issues.push({ type: 'warning', message: `${invalidRows.toLocaleString()} ${t('data.quality.invalidRowsMsg', 'lignes invalides détectées')}` });
  }
  uploads.filter(u => u.status === 'failed').forEach(u => {
    issues.push({ type: 'error', message: `${t('data.quality.uploadFailed', 'Import échoué')} : ${u.filename}` });
  });
  if (issues.length === 0 && uploads.length > 0) {
    issues.push({ type: 'info', message: t('data.quality.allGood', 'Tous les contrôles qualité sont passés avec succès') });
  }

  // SVG gauge for global score
  const r = 48, circ = 2 * Math.PI * r;
  const dashOffset = circ * (1 - globalScore / 100);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackButton to="/app/data" label="Données" />
      {/* Hero */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-900 to-blue-700 p-8 text-white shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/15">
              <Shield size={13} />
              {t('dataQuality.title', 'Qualité des données')}
            </div>
            <h1 className="mt-4 flex items-center gap-3 text-3xl font-bold tracking-tight">
              <Shield className="h-8 w-8" />
              {t('data.quality.pageTitle', 'Contrôle Qualité des Données')}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-white/80">
              {t('data.quality.pageSubtitle', 'Surveillez et améliorez la qualité de vos données ESG')}
            </p>
          </div>
          {/* Global score gauge */}
          {uploads.length > 0 && (
            <div className="flex items-center gap-4 bg-white/10 rounded-2xl px-6 py-4 ring-1 ring-white/15">
              <div className="relative flex-shrink-0">
                <svg width="110" height="110" viewBox="0 0 110 110">
                  <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="10" />
                  <circle cx="55" cy="55" r={r} fill="none" stroke={globalColor} strokeWidth="10"
                    strokeDasharray={circ} strokeDashoffset={dashOffset} strokeLinecap="round"
                    transform="rotate(-90 55 55)" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
                  <text x="55" y="50" textAnchor="middle" fontSize="22" fontWeight="bold" fill="white">{globalScore}</text>
                  <text x="55" y="67" textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.7)">/100</text>
                </svg>
              </div>
              <div>
                <p className="text-sm text-white/70">{t('dataQuality.globalQualityScore', 'Score global qualité')}</p>
                <p className="text-lg font-bold text-white mt-0.5">
                  {globalStatus === 'good' ? t('dataQuality.excellent', 'Excellent') :
                   globalStatus === 'warning' ? t('dataQuality.acceptable', 'Acceptable') :
                   t('dataQuality.toImprove', 'À améliorer')}
                </p>
                <p className="text-xs text-white/60 mt-1">{uploads.length} {t('data.uploadFiles', 'fichiers')} · {totalRows.toLocaleString()} {t('data.rows', 'lignes')}</p>
              </div>
            </div>
          )}
          <button
            onClick={loadData}
            className="self-start flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium px-4 py-2 rounded-xl transition-all"
          >
            <RefreshCw size={14} />
            {t('common.refresh', 'Actualiser')}
          </button>
        </div>
      </div>

      {uploads.length === 0 ? (
        <Card>
          <div className="text-center py-16">
            <Database className="h-14 w-14 mx-auto text-gray-200 mb-4" />
            <p className="text-lg font-semibold text-gray-900">{t('data.quality.noData', 'Aucune donnée disponible')}</p>
            <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
              {t('data.uploadFirst', 'Importez des données ESG pour voir les métriques de qualité')}
            </p>
            <button
              onClick={() => navigate('/app/data/upload')}
              className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
            >
              <Upload size={14} />
              {t('data.uploadData', 'Importer des données')}
            </button>
          </div>
        </Card>
      ) : (
        <>
          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {qualityMetrics.map(m => <MetricCard key={m.name} metric={m} />)}
          </div>

          {/* Summary row */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: t('data.totalUploads', 'Imports'), value: uploads.length, sub: `${completedCount} ${t('data.quality.completedSub', 'traités')}`, icon: Database, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: t('data.validRows', 'Lignes valides'), value: validRows.toLocaleString(), sub: `${totalRows.toLocaleString()} ${t('data.quality.totalRowsSub', 'au total')}`, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: t('data.invalidRows', 'Lignes invalides'), value: invalidRows.toLocaleString(), sub: `${totalRows > 0 ? ((invalidRows / totalRows) * 100).toFixed(1) : 0}% ${t('data.quality.errorRate', 'taux d\'erreur')}`, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
            ].map(s => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                  <div className={`p-2.5 rounded-xl ${s.bg} flex-shrink-0`}>
                    <Icon size={18} className={s.color} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className="text-xl font-bold text-gray-900">{s.value}</p>
                    <p className="text-xs text-gray-400">{s.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Issues */}
          {issues.length > 0 && (
            <Card>
              <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertCircle size={16} className="text-amber-500" />
                {t('data.quality.issues', 'Problèmes détectés')}
              </h3>
              <div className="space-y-2">
                {issues.map((issue, i) => {
                  const isError = issue.type === 'error';
                  const isInfo = issue.type === 'info';
                  const Icon = isError ? XCircle : isInfo ? CheckCircle : AlertCircle;
                  const cls = isError ? 'bg-red-50 border-red-200 text-red-800' :
                               isInfo ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                               'bg-amber-50 border-amber-200 text-amber-800';
                  const iconCls = isError ? 'text-red-500' : isInfo ? 'text-emerald-500' : 'text-amber-500';
                  return (
                    <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${cls}`}>
                      <Icon size={15} className={`${iconCls} flex-shrink-0 mt-0.5`} />
                      <p className="text-sm">{issue.message}</p>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* CTA */}
          <Card className="border-dashed border-2 border-blue-200 bg-blue-50/50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900">{t('data.quality.improveTitle', 'Améliorer la qualité')}</h3>
                <p className="text-sm text-gray-600 mt-1">{t('data.quality.improveDesc', 'Validez les données en attente ou connectez de nouvelles sources')}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => navigate('/app/validation')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {t('data.quality.validateBtn', 'Valider')} <ArrowRight size={13} />
                </button>
                <button
                  onClick={() => navigate('/app/data/connectors')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {t('data.quality.connectBtn', 'Connecteurs')} <ArrowRight size={13} />
                </button>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
