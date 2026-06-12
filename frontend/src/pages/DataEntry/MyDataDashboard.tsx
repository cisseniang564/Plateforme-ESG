import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import BackButton from '@/components/common/BackButton';
import {
  Database,
  Search,
  Filter,
  Download,
  RefreshCw,
  Edit,
  Trash2,
  Calendar,
  Leaf,
  Users,
  Scale,
  Upload as UploadIcon,
  CheckCircle,
  Clock,
  XCircle,
  Zap,
  Bot,
  BarChart3,
  ChevronDown,
  ChevronUp,
  FileText,
  Lock,
  ThumbsUp,
  ThumbsDown,
  ArrowRight,
  Info,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import PageHero, { PageHeroButton, PageHeroPrimaryButton } from '@/components/layout/PageHero';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import i18n from '@/i18n/config';
import MyDataStatsDashboard, { type MyDataStats } from './MyDataStatsDashboard';

const dateFnsLocale = () => (i18n.language?.startsWith('en') ? enUS : fr);
const numLocale = () => (i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR');

// ─── Types ─────────────────────────────────────────────────────────────────
interface DataEntry {
  id: string;
  metric_name: string;
  value_numeric: number | null;
  value_text: string | null;
  unit: string;
  pillar: string;
  category: string;
  period_start: string;
  period_end: string;
  collection_method: string;
  verification_status: string;
  data_source: string;
  notes: string;
  created_at: string;
}
// ─── Pillar config (NO dynamic Tailwind classes) ──────────────────────────
interface PillarCfg { label: string; icon: LucideIcon; color: string; softBg: string; strip: string; badgeBg: string; badgeText: string; }
const getPillarCfgMap = (t: TFunction): Record<string, PillarCfg> => ({
  environmental: { label: t('mydata.pillarEnv', 'Environnemental'), icon: Leaf,  color: '#16a34a', softBg: '#f0fdf4', strip: '#22c55e', badgeBg: '#dcfce7', badgeText: '#15803d' },
  social:        { label: t('mydata.pillarSocial', 'Social'),       icon: Users, color: '#2563eb', softBg: '#eff6ff', strip: '#3b82f6', badgeBg: '#dbeafe', badgeText: '#1d4ed8' },
  governance:    { label: t('mydata.pillarGov', 'Gouvernance'),     icon: Scale, color: '#7c3aed', softBg: '#f5f3ff', strip: '#8b5cf6', badgeBg: '#ede9fe', badgeText: '#6d28d9' },
});
function getPillarCfg(pillar: string, t: TFunction): PillarCfg {
  return getPillarCfgMap(t)[pillar] ?? { label: pillar, icon: Database as LucideIcon, color: '#6b7280', softBg: '#f9fafb', strip: '#9ca3af', badgeBg: '#f3f4f6', badgeText: '#374151' };
}

// ─── Status config ─────────────────────────────────────────────────────────
const getStatusCfgMap = (t: TFunction): Record<string, { label: string; icon: LucideIcon; bg: string; text: string; }> => ({
  verified: { label: t('mydata.stVerified', 'Vérifié'),    icon: CheckCircle, bg: '#dcfce7', text: '#15803d' },
  pending:  { label: t('mydata.stPending', 'En attente'),  icon: Clock,       bg: '#fef9c3', text: '#854d0e' },
  rejected: { label: t('mydata.stRejected', 'Rejeté'),     icon: XCircle,     bg: '#fee2e2', text: '#b91c1c' },
  flagged:  { label: t('mydata.stFlagged', 'Marqué'),      icon: Clock,       bg: '#ffedd5', text: '#c2410c' },
});
function getStatusCfg(s: string, t: TFunction) { return getStatusCfgMap(t)[s] ?? getStatusCfgMap(t).pending; }

// ─── Collection method chip ────────────────────────────────────────────────
function CollectionChip({ method }: { method: string }) {
  const { t } = useTranslation();
  if (method === 'fec_import')   return <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700"><Zap className="h-3 w-3"/>FEC</span>;
  if (method === 'csv_import')   return <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-700"><UploadIcon className="h-3 w-3"/>CSV</span>;
  if (method === 'automatic')    return <span className="inline-flex items-center gap-1 text-xs font-medium text-cyan-700"><Bot className="h-3 w-3"/>{t('mydata.methodAuto', 'Auto IA')}</span>;
  if (method === 'manual_scope3') return <span className="inline-flex items-center gap-1 text-xs font-medium text-teal-700"><Edit className="h-3 w-3"/>Scope 3</span>;
  return <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700"><Edit className="h-3 w-3"/>{t('mydata.methodManual', 'Manuel')}</span>;
}

// ─── Confirm Modal ─────────────────────────────────────────────────────────
function ConfirmModal({ label, onConfirm, onCancel }: { label: string; onConfirm: () => void; onCancel: () => void; }) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 bg-red-100 rounded-xl"><Trash2 className="h-5 w-5 text-red-600"/></div>
          <h3 className="text-lg font-bold text-gray-900">{t('mydata.deleteTitle', 'Supprimer cette donnée ?')}</h3>
        </div>
        <p className="text-gray-500 text-sm mb-6"><span className="font-semibold text-gray-800">"{label}"</span>{t('mydata.deleteBody', ' sera définitivement supprimée.')}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors">{t('mydata.cancel', 'Annuler')}</button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors">{t('mydata.delete', 'Supprimer')}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function MyDataDashboard() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<DataEntry[]>([]);
  const [stats, setStats] = useState<MyDataStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<DataEntry | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<'metric_name' | 'period_start' | 'pillar'>('period_start');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  const [filters, setFilters] = useState({
    pillar: '',
    search: '',
    verification_status: '',
    collection_method: searchParams.get('source') ?? '',
  });

  useEffect(() => {
    loadData();
    loadStats();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.pillar) params.append('pillar', filters.pillar);
      if (filters.search) params.append('search', filters.search);
      if (filters.verification_status) params.append('verification_status', filters.verification_status);
      if (filters.collection_method) params.append('collection_method', filters.collection_method);
      const res = await api.get(`/data-entry/?${params.toString()}`);
      setData(res.data || []);
    } catch {
      toast.error(t('mydata.errLoad', 'Erreur lors du chargement'));
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await api.get('/data-entry/stats');
      setStats(res.data);
    } catch {}
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(deleteTarget.id);
    try {
      await api.delete(`/data-entry/${deleteTarget.id}`);
      toast.success(t('mydata.toastDeleted', 'Donnée supprimée'));
      setDeleteTarget(null);
      await Promise.all([loadData(), loadStats()]);
    } catch {
      toast.error(t('mydata.errDelete', 'Erreur lors de la suppression'));
    } finally {
      setDeleting(null);
    }
  };

  /**
   * Vérifie ou rejette une entrée directement depuis le tableau (sans
   * passer par la page « Qualité des données »). Respecte la séparation
   * des pouvoirs CSRD côté backend : si un autre collaborateur actif
   * existe et que l'entrée a été créée par l'utilisateur courant, le
   * backend renvoie une erreur 403 explicite que l'on affiche telle quelle.
   */
  const handleValidateEntry = async (entryId: string, action: 'verify' | 'reject') => {
    setValidatingId(entryId);
    try {
      const res = await api.post(`/data-validation/entries/${entryId}/validate`, {
        action,
        reason: action === 'reject' ? 'Rejeté depuis Mes données' : undefined,
      });
      if (action === 'verify') {
        toast.success(
          res.data?.solo_mode
            ? t('mydata.verifiedSolo', 'Vérifié ✓ (validation mono-utilisateur — mode TPE)')
            : t('mydata.verified', 'Vérifié ✓')
        );
      } else {
        toast.success(t('mydata.rejected', 'Rejeté'));
      }
      await Promise.all([loadData(), loadStats()]);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || t('mydata.validationError', 'Erreur de validation'));
    } finally {
      setValidatingId(null);
    }
  };

  const exportToCSV = () => {
    if (data.length === 0) { toast.error(t('mydata.errNoExport', 'Aucune donnée à exporter')); return; }
    const headers = ['Métrique', 'Valeur', 'Unité', 'Pilier', 'Catégorie', 'Début', 'Fin', 'Source', 'Méthode'];
    const rows = data.map(d => [
      d.metric_name, d.value_numeric ?? d.value_text, d.unit || '',
      d.pillar, d.category, d.period_start, d.period_end, d.data_source || '', d.collection_method || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `donnees_esg_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(t('mydata.exportOk', 'Export réussi'));
  };

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      let va = (a as any)[sortKey] ?? '';
      let vb = (b as any)[sortKey] ?? '';
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'desc' ? vb - va : va - vb;
      return sortDir === 'desc' ? String(vb).localeCompare(String(va)) : String(va).localeCompare(String(vb));
    });
  }, [data, sortKey, sortDir]);

  const SortIcon = ({ col }: { col: typeof sortKey }) =>
    sortKey === col
      ? sortDir === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />
      : null;

  if (loading && !stats) {
    return <div className="flex items-center justify-center h-96"><Spinner size="lg" /></div>;
  }

  const verifiedCount  = stats?.by_verification_status?.verified  || 0;
  const pendingCount   = stats?.by_verification_status?.pending   || 0;
  const total          = stats?.total || 0;

  return (
    <div className="space-y-6">
      <BackButton to="/app/data" label={t('mydata.backData', 'Données')} />

      {/* ─── Hero (signature) ──────────────────────────────────────── */}
      <PageHero
        icon={Database}
        title={t('mydata.heroTitle', 'Mes Données ESG')}
        description={t('mydata.heroDesc', 'Toutes vos données ESG centralisées et analysées')}
        actions={
          <>
            <PageHeroButton onClick={() => { loadData(); loadStats(); }} icon={RefreshCw}>
              {t('mydata.refresh', 'Actualiser')}
            </PageHeroButton>
            <PageHeroPrimaryButton onClick={exportToCSV} icon={Download}>
              Export CSV
            </PageHeroPrimaryButton>
          </>
        }
        kpis={[
          { label: t('mydata.kpiTotal', 'Total entrées'),  value: total },
          { label: t('mydata.kpiVerified', 'Vérifiées'),   value: verifiedCount },
          { label: t('mydata.kpiPending', 'En attente'),   value: pendingCount },
        ]}
      />

      {/* ─── Bandeau pipeline de validation ─────────────────────────────── */}
      {pendingCount > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-yellow-200 bg-yellow-50 px-5 py-4 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-start gap-3 min-w-0">
            <div className="p-2 bg-yellow-100 rounded-xl shrink-0">
              <Clock className="h-4 w-4 text-yellow-700" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-yellow-900">
                {t('mydata.pendingBannerTitle', '{{n}} entrée{{s}} en attente de vérification', { n: pendingCount, s: pendingCount > 1 ? 's' : '' })}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-yellow-700">
                {t('mydata.pendingBannerDesc', 'Chaque donnée importée doit être vérifiée avant d’être verrouillée et intégrée à vos rapports CSRD (signature SHA-256, ISAE 3000 · CSRD Art. 29a). Validez ✓ ou rejetez ✕ directement depuis le tableau ci-dessous, ou ouvrez la page Qualité des données pour une vue d’ensemble et la validation en lot.')}
              </p>
            </div>
          </div>
          <a
            href="/app/data-quality"
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-yellow-300 bg-white px-3 py-2 text-xs font-semibold text-yellow-800 transition hover:bg-yellow-100"
          >
            {t('mydata.pendingBannerCta', 'Page Qualité des données')}
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      )}

      {/* ─── Stat Cards ────────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: t('mydata.totalData', 'Total Données'), value: total,  topColor: '#6366f1', iconBg: '#eef2ff', iconColor: '#4f46e5', icon: Database },
            { label: t('mydata.pillarEnv', 'Environnemental'), value: stats.by_pillar.environmental || 0, topColor: '#22c55e', iconBg: '#dcfce7', iconColor: '#16a34a', icon: Leaf },
            { label: t('mydata.pillarSocial', 'Social'),  value: stats.by_pillar.social || 0,  topColor: '#3b82f6', iconBg: '#dbeafe', iconColor: '#2563eb', icon: Users },
            { label: t('mydata.pillarGov', 'Gouvernance'), value: stats.by_pillar.governance || 0, topColor: '#8b5cf6', iconBg: '#ede9fe', iconColor: '#7c3aed', icon: Scale },
          ].map(card => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="h-1" style={{ backgroundColor: card.topColor }} />
                <div className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{card.label}</p>
                    <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                  </div>
                  <div className="p-3 rounded-xl" style={{ backgroundColor: card.iconBg }}>
                    <Icon className="h-6 w-6" style={{ color: card.iconColor }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── FEC Import Notice ─────────────────────────────────────────── */}
      {stats && (stats.by_collection_method['fec_import'] ?? 0) > 0 && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <div className="p-2 bg-amber-100 rounded-xl shrink-0">
            <Zap className="h-4 w-4 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-amber-900">
              {t('mydata.fecImported', '{{n}} entrée{{s}} importée{{s}} via FEC', { n: stats.by_collection_method['fec_import'], s: stats.by_collection_method['fec_import'] > 1 ? 's' : '', es: stats.by_collection_method['fec_import'] > 1 ? 'ies' : 'y' })}
            </span>
            <span className="text-sm text-amber-700 ml-2">
              {t('mydata.fecCategorized', '— catégorisées automatiquement depuis votre Fichier des Écritures Comptables.')}
            </span>
          </div>
          <button
            onClick={() => setFilters({ ...filters, collection_method: 'fec_import' })}
            className="text-xs font-semibold text-amber-700 hover:text-amber-900 underline whitespace-nowrap shrink-0"
          >
            {t('mydata.viewOnly', 'Voir uniquement')}
          </button>
        </div>
      )}

      {/* ─── Statistiques (par pilier, catégorie, métrique) ─────────────── */}
      {stats && stats.total > 0 && <MyDataStatsDashboard stats={stats} />}

      {/* Taux de vérification (rappel rapide) */}
      {stats && total > 0 && (
        <div className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
          <div className="p-2 bg-green-50 rounded-xl shrink-0">
            <CheckCircle className="h-4 w-4 text-green-600" />
          </div>
          <span className="text-sm text-gray-600 flex-1">
            {t('mydata.verifRate', 'Taux de vérification')} :{' '}
            <span className="font-bold text-green-600">{Math.round((verifiedCount / total) * 100)}%</span>
            <span className="text-gray-400"> ({verifiedCount}/{total})</span>
          </span>
          <span
            className="inline-flex"
            title={t('mydata.verifStatusTooltip', 'En attente → un collaborateur (ou vous-même en mode mono-utilisateur) vérifie ✓ ou rejette ✕ l’entrée. Une fois vérifiée, elle est signée et verrouillée (CSRD Art. 29a).')}
          >
            <Info className="h-3.5 w-3.5 text-gray-300" />
          </span>
        </div>
      )}

      {/* ─── Filters ────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-700">{t('mydata.filters', 'Filtres')}</span>
          {(filters.pillar || filters.search || filters.verification_status || filters.collection_method) && (
            <button
              onClick={() => setFilters({ pillar: '', search: '', verification_status: '', collection_method: '' })}
              className="ml-auto text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              {t('mydata.reset', 'Réinitialiser')}
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={filters.search}
              onChange={e => setFilters({ ...filters, search: e.target.value })}
              placeholder={t('mydata.searchPlaceholder', 'Nom de métrique…')}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          {/* Pillar */}
          <select
            value={filters.pillar}
            onChange={e => setFilters({ ...filters, pillar: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-700"
          >
            <option value="">{t('mydata.allPillars', 'Tous les piliers')}</option>
            <option value="environmental">{t('mydata.pillarEnv', 'Environnemental')}</option>
            <option value="social">{t('mydata.pillarSocial', 'Social')}</option>
            <option value="governance">{t('mydata.pillarGov', 'Gouvernance')}</option>
          </select>
          {/* Collection method */}
          <select
            value={filters.collection_method}
            onChange={e => setFilters({ ...filters, collection_method: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-700"
          >
            <option value="">{t('mydata.allSources', 'Toutes les sources')}</option>
            <option value="manual">{t('mydata.srcManual', 'Saisie manuelle')}</option>
            <option value="manual_scope3">{t('mydata.srcScope3', 'Saisie Scope 3')}</option>
            <option value="csv_import">Import CSV</option>
            <option value="fec_import">Import FEC</option>
            <option value="automatic">{t('mydata.srcAuto', 'Automatique (IA)')}</option>
          </select>
          {/* Status */}
          <select
            value={filters.verification_status}
            onChange={e => setFilters({ ...filters, verification_status: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-700"
          >
            <option value="">{t('mydata.allStatuses', 'Tous les statuts')}</option>
            <option value="verified">{t('mydata.stVerified', 'Vérifié')}</option>
            <option value="pending">{t('mydata.stPending', 'En attente')}</option>
            <option value="rejected">{t('mydata.stRejected', 'Rejeté')}</option>
          </select>
        </div>
      </div>

      {/* ─── Data Table ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">
              {t('mydata.dataCount', '{{n}} donnée{{s}}', { n: sortedData.length, s: sortedData.length !== 1 ? 's' : '' })}
            </h2>
            {loading && <Spinner size="sm" />}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>{t('mydata.sortBy', 'Trier par :')}</span>
            {(['metric_name','period_start','pillar'] as const).map(k => (
              <button
                key={k}
                onClick={() => toggleSort(k)}
                className={`px-3 py-1.5 rounded-lg transition-colors font-medium flex items-center gap-1 ${
                  sortKey === k ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50 text-gray-500'
                }`}
              >
                {k === 'metric_name' ? t('mydata.sortName', 'Nom') : k === 'period_start' ? 'Date' : t('mydata.sortPillar', 'Pilier')}
                <SortIcon col={k} />
              </button>
            ))}
          </div>
        </div>

        {loading && sortedData.length === 0 ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : sortedData.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gray-50 flex items-center justify-center">
              <Database className="h-10 w-10 text-gray-300" />
            </div>
            <p className="text-xl font-semibold text-gray-900 mb-2">{t('mydata.noData', 'Aucune donnée trouvée')}</p>
            <p className="text-gray-400 mb-6 text-sm">{t('mydata.noDataDesc', 'Commencez par saisir ou importer des données')}</p>
            <div className="flex gap-3 justify-center">
              <a href="/app/data-entry" className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
                <Edit className="h-4 w-4" />
                {t('mydata.srcManual', 'Saisie manuelle')}
              </a>
              <a href="/app/import-csv" className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                <UploadIcon className="h-4 w-4" />
                Import CSV
              </a>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/80">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('mydata.thMetric', 'Métrique')}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('mydata.thValue', 'Valeur')}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('mydata.thPillar', 'Pilier')}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('mydata.thPeriod', 'Période')}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Source</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('mydata.thStatus', 'Statut')}</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sortedData.map(entry => {
                  const pillarCfg = getPillarCfg(entry.pillar, t);
                  const PillarIcon = pillarCfg.icon;
                  const statusCfg = getStatusCfg(entry.verification_status, t);
                  const StatusIcon = statusCfg.icon;
                  return (
                    <tr key={entry.id} className="group hover:bg-gray-50/60 transition-colors">
                      {/* Metric name */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg shrink-0" style={{ backgroundColor: pillarCfg.softBg }}>
                            <PillarIcon className="h-4 w-4" style={{ color: pillarCfg.color }} />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{entry.metric_name}</p>
                            <p className="text-xs text-gray-400">{entry.category || '—'}</p>
                          </div>
                        </div>
                      </td>
                      {/* Value */}
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-gray-900 text-sm">
                          {entry.value_numeric !== null ? entry.value_numeric.toLocaleString(numLocale()) : entry.value_text || '—'}
                        </p>
                        {entry.unit && <p className="text-xs text-gray-400">{entry.unit}</p>}
                      </td>
                      {/* Pillar badge */}
                      <td className="px-5 py-3.5">
                        <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: pillarCfg.badgeBg, color: pillarCfg.badgeText }}>
                          {pillarCfg.label}
                        </span>
                      </td>
                      {/* Period */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          {format(new Date(entry.period_start), i18n.language?.startsWith('en') ? 'MM/dd/yy' : 'dd/MM/yy', { locale: dateFnsLocale() })}
                        </div>
                      </td>
                      {/* Source */}
                      <td className="px-5 py-3.5">
                        <CollectionChip method={entry.collection_method} />
                        {entry.data_source && (
                          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            <span className="truncate max-w-[120px]">{entry.data_source}</span>
                          </p>
                        )}
                      </td>
                      {/* Status */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                            style={{ backgroundColor: statusCfg.bg, color: statusCfg.text }}
                            title={
                              (entry.verification_status || '').toLowerCase() === 'pending'
                                ? t('mydata.pendingTooltip', 'En attente de vérification par un autre collaborateur (ou par vous-même si vous êtes seul·e sur le compte). Utilisez les icônes ✓ / ✕ pour valider ou rejeter.')
                                : (entry.verification_status || '').toLowerCase() === 'flagged'
                                ? t('mydata.flaggedTooltip', 'Signalée pour vérification complémentaire. Utilisez les icônes ✓ / ✕ pour valider ou rejeter.')
                                : undefined
                            }
                          >
                            <StatusIcon className="h-3 w-3" />
                            {statusCfg.label}
                          </span>
                          {(entry.verification_status || '').toLowerCase() === 'verified' && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200"
                              title={t('mydata.lockedTooltip', "Entrée verrouillée — empreinte SHA-256 appliquée à l'approbation (CSRD Art. 29a). Pour modifier, un administrateur doit révoquer la vérification.")}
                            >
                              <Lock className="h-2.5 w-2.5" />
                              {t('mydata.locked', 'Verrouillée')}
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {(entry.verification_status || '').toLowerCase() === 'pending' || (entry.verification_status || '').toLowerCase() === 'flagged' ? (
                            <>
                              <button
                                onClick={() => handleValidateEntry(entry.id, 'verify')}
                                disabled={validatingId === entry.id}
                                title={t('mydata.verifyAction', 'Vérifier')}
                                className="p-2 rounded-xl text-gray-300 hover:bg-green-50 hover:text-green-600 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                              >
                                {validatingId === entry.id ? <Spinner size="sm" /> : <ThumbsUp className="h-4 w-4" />}
                              </button>
                              <button
                                onClick={() => handleValidateEntry(entry.id, 'reject')}
                                disabled={validatingId === entry.id}
                                title={t('mydata.rejectAction', 'Rejeter')}
                                className="p-2 rounded-xl text-gray-300 hover:bg-red-50 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                              >
                                <ThumbsDown className="h-4 w-4" />
                              </button>
                            </>
                          ) : null}
                          {(entry.verification_status || '').toLowerCase() === 'verified' ? (
                            <span
                              className="inline-flex items-center gap-1 p-2 text-indigo-400"
                              title={t('mydata.lockedNoDelete', 'Entrée verrouillée — suppression impossible')}
                            >
                              <Lock className="h-4 w-4" />
                            </span>
                          ) : (
                            <button
                              onClick={() => setDeleteTarget(entry)}
                              disabled={deleting === entry.id}
                              className="p-2 rounded-xl text-gray-300 hover:bg-red-50 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                            >
                              {deleting === entry.id ? <Spinner size="sm" /> : <Trash2 className="h-4 w-4" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Delete Confirm ────────────────────────────────────────────── */}
      {deleteTarget && (
        <ConfirmModal
          label={deleteTarget.metric_name}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
