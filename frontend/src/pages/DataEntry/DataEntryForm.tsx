import { Button, ConfirmDialog, Modal } from '@/components/common';
import CollectHeader, { btnPrimary } from './CollectHeader';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  buildListParams, displayName, errorDetail, formatValue, sourceLabel, looksLikeYear, pillarCompleteness, totalPages, verifiedRate,
  type PillarCompleteness,
  type PillarFilter, type SortKey, type SortOrder, type VerifFilter,
} from './dataEntryHelpers';
import { useTranslation } from 'react-i18next';
import {
  Database, Plus, Save, Leaf, Users, Scale, AlertCircle, Trash2, Download,
  ChevronRight, ChevronLeft, RefreshCw, Search, Lock, ArrowUp, ArrowDown, ArrowUpDown,
  AlertTriangle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Organization { id: string; name: string; }
interface DataEntry {
  id: string;
  organization_id?: string;
  period_start: string;
  period_end: string;
  period_type: string;
  pillar: string;
  category: string;
  metric_name: string;
  value_numeric?: number | null;
  value_text?: string | null;
  unit?: string | null;
  data_source?: string | null;
  collection_method?: string | null;
  verification_status: string;
  notes?: string | null;
}
interface MetricTemplate { name: string; unit: string; description?: string; }
interface Stats { total: number; by_pillar: Record<string, number>; by_verification_status: Record<string, number>; by_period: Record<string, number>; }

// ─── Pillar config (NO dynamic Tailwind classes) ───────────────────────────
interface PillarCfg {
  label: string; icon: LucideIcon; color: string; softBg: string; strip: string; topColor: string; iconBg: string;
}
const PILLAR_CFG: Record<string, PillarCfg> = {
  environmental: { label: 'Environnemental', icon: Leaf,  color: '#16a34a', softBg: '#f0fdf4', strip: '#22c55e', topColor: '#22c55e', iconBg: '#dcfce7' },
  social:        { label: 'Social',          icon: Users, color: '#2563eb', softBg: '#eff6ff', strip: '#3b82f6', topColor: '#3b82f6', iconBg: '#dbeafe' },
  governance:    { label: 'Gouvernance',     icon: Scale, color: '#7c3aed', softBg: '#f5f3ff', strip: '#8b5cf6', topColor: '#8b5cf6', iconBg: '#ede9fe' },
};
function getPillarCfg(pillar: string): PillarCfg {
  return PILLAR_CFG[pillar] ?? {
    label: pillar, icon: Database as LucideIcon,
    color: '#6b7280', softBg: '#f9fafb', strip: '#9ca3af', topColor: '#9ca3af', iconBg: '#f3f4f6',
  };
}

const PAGE_SIZES = [25, 50, 100];

// ─── Sub-components ────────────────────────────────────────────────────────
function PillarBadge({ pillar }: { pillar: string }) {
  const cfg = getPillarCfg(pillar);
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium" style={{ backgroundColor: cfg.softBg, color: cfg.color }}>
      <Icon className="h-3 w-3" aria-hidden="true" />{cfg.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const verified = status === 'verified';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${verified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
      {verified ? <Lock className="h-3 w-3" aria-hidden="true" /> : <AlertCircle className="h-3 w-3" aria-hidden="true" />}
      {verified ? 'Vérifiée' : 'À vérifier'}
    </span>
  );
}

function SortHeader({ label, k, sortBy, order, onSort, align = 'left' }: {
  label: string; k: SortKey; sortBy: SortKey; order: SortOrder; onSort: (k: SortKey) => void; align?: 'left' | 'right';
}) {
  const active = sortBy === k;
  const Icon = !active ? ArrowUpDown : order === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th scope="col" aria-sort={active ? (order === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={`px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <button type="button" onClick={() => onSort(k)} className={`inline-flex items-center gap-1 hover:text-gray-900 ${active ? 'text-gray-900' : ''}`}>
        {label}<Icon className={`h-3 w-3 ${active ? '' : 'opacity-40'}`} aria-hidden="true" />
      </button>
    </th>
  );
}

function PillarCard({ label, count, color, comp, loading }: { label: string; count: number; color: string; comp?: PillarCompleteness; loading: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
      <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />{label}
      </div>
      <p className="mt-1 text-2xl font-semibold text-gray-900 tabular-nums">{count}</p>
      {loading ? (
        <div className="mt-2 h-3 animate-pulse rounded bg-gray-200" role="status" aria-label="Chargement de la complétude" />
      ) : comp && comp.total > 0 ? (
        <>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200" role="img" aria-label={`${comp.covered} exigences ESRS couvertes sur ${comp.total}`}>
            <span className="block h-full rounded-full" style={{ width: `${comp.pct}%`, backgroundColor: color }} />
          </div>
          <p className="mt-1 text-xs text-gray-600">{comp.covered}/{comp.total} exigences ESRS couvertes · {comp.pct} %</p>
          {comp.covered < comp.total && (
            <Link to="/app/esrs-gap" className="mt-0.5 inline-block text-xs font-semibold text-emerald-800 hover:underline">Voir ce qui manque</Link>
          )}
        </>
      ) : null}
    </div>
  );
}

function Kpi({ label, value, hint, color }: { label: string; value: string | number; hint?: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
      <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />{label}
      </div>
      <p className="mt-1 text-2xl font-semibold text-gray-900 tabular-nums">{value}</p>
      {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function DataEntryForm() {
  const { t } = useTranslation();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [entries, setEntries] = useState<DataEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [completeness, setCompleteness] = useState<Record<string, PillarCompleteness> | null>(null);
  const [completenessLoading, setCompletenessLoading] = useState(true);
  const [templates, setTemplates] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deleteTargets, setDeleteTargets] = useState<DataEntry[]>([]);
  const [detail, setDetail] = useState<DataEntry | null>(null);
  const [edit, setEdit] = useState({ value_numeric: '', unit: '', data_source: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [step, setStep] = useState(1);

  // Un lien extérieur (ex. la source d'une réponse de questionnaire) peut arriver avec ?search=…
  const [params] = useSearchParams();
  const initialSearch = params.get('search') ?? '';
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [pillarFilter, setPillarFilter] = useState<PillarFilter>('all');
  const [verifFilter, setVerifFilter] = useState<VerifFilter>('all');
  const [year, setYear] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('created_at');
  const [order, setOrder] = useState<SortOrder>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [selectedPillar, setSelectedPillar] = useState<string>('environmental');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedMetric, setSelectedMetric] = useState<MetricTemplate | null>(null);

  const [formData, setFormData] = useState({
    organization_id: '',
    period_start: new Date().getFullYear() + '-01-01',
    period_end: new Date().getFullYear() + '-12-31',
    period_type: 'annual',
    pillar: 'environmental',
    category: '',
    metric_name: '',
    value_numeric: '',
    unit: '',
    data_source: '',
    notes: '',
  });

  const closeWizard = () => { setShowModal(false); resetForm(); };

  // Recherche : on attend la fin de la frappe avant d'interroger l'API.
  useEffect(() => {
    const id = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const reqId = useRef(0);
  const loadEntries = useCallback(async () => {
    const my = ++reqId.current;
    setListLoading(true);
    try {
      const res = await api.get('/data-entry/', {
        params: buildListParams({ search, pillar: pillarFilter, verif: verifFilter, year, sortBy, order, page, pageSize }),
      });
      if (my !== reqId.current) return;
      const rows: DataEntry[] = res.data || [];
      const header = Number(res.headers?.['x-total-count']);
      setEntries(rows);
      setTotal(Number.isFinite(header) && header >= 0 && res.headers?.['x-total-count'] !== undefined ? header : rows.length);
    } catch {
      if (my === reqId.current) toast.error(t('dataEntry.loadingError'));
    } finally {
      if (my === reqId.current) setListLoading(false);
    }
  }, [search, pillarFilter, verifFilter, year, sortBy, order, page, pageSize, t]);

  const loadStats = useCallback(async () => {
    try { setStats((await api.get('/data-entry/stats')).data); } catch { /* KPI facultatifs */ }
    try { setCompleteness(pillarCompleteness((await api.get('/esrs/gap-analysis')).data?.sections)); }
    catch { setCompleteness(null); }      // sans la couverture, on n'affiche que les comptes
    finally { setCompletenessLoading(false); }
  }, []);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  useEffect(() => {
    (async () => {
      try {
        const [orgsRes, templatesRes] = await Promise.all([
          api.get('/organizations'),
          api.get('/data-entry/templates/metrics'),
        ]);
        setOrganizations(orgsRes.data.items || []);
        setTemplates(templatesRes.data);
      } catch {
        toast.error(t('dataEntry.loadingError'));
      } finally {
        setLoading(false);
      }
      loadStats();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshAll = async () => { await Promise.all([loadEntries(), loadStats()]); };

  const handleSort = (k: SortKey) => {
    if (k === sortBy) setOrder(o => (o === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(k); setOrder(k === 'metric_name' || k === 'pillar' ? 'asc' : 'desc'); }
    setPage(1);
  };

  const handlePillarChange = (pillar: string) => {
    setSelectedPillar(pillar);
    setSelectedCategory('');
    setSelectedMetric(null);
    setFormData({ ...formData, pillar, category: '', metric_name: '', unit: '' });
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setSelectedMetric(null);
    setFormData({ ...formData, category, metric_name: '', unit: '' });
  };

  const handleMetricSelect = (metric: MetricTemplate) => {
    setSelectedMetric(metric);
    setFormData({ ...formData, metric_name: metric.name, unit: metric.unit || '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/data-entry/', {
        ...formData,
        value_numeric: formData.value_numeric !== '' ? parseFloat(formData.value_numeric as any) : null,
        organization_id: formData.organization_id || null,
      });
      toast.success(t('dataEntry.savedSuccess'));
      setShowModal(false);
      resetForm();
      setSortBy('created_at'); setOrder('desc'); setPage(1);
      await refreshAll();
    } catch (error: any) {
      toast.error(errorDetail(error, t('dataEntry.saveError')));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (deleteTargets.length === 0) return;
    const results = await Promise.allSettled(deleteTargets.map(d => api.delete(`/data-entry/${d.id}`)));
    const failed = results.filter(r => r.status === 'rejected').length;
    if (failed === 0) toast.success(deleteTargets.length > 1 ? `${deleteTargets.length} saisies supprimées` : t('dataEntry.entryDeleted'));
    else toast.error(`${failed} suppression(s) refusée(s) — les saisies vérifiées sont verrouillées.`);
    setDeleteTargets([]);
    setSelected(new Set());
    setDetail(null);
    if (entries.length === deleteTargets.length && page > 1) setPage(p => p - 1);
    await refreshAll();
  };

  const openDetail = (e: DataEntry) => {
    setDetail(e);
    setEdit({ value_numeric: e.value_numeric != null ? String(e.value_numeric) : '', unit: e.unit ?? '', data_source: e.data_source ?? '', notes: e.notes ?? '' });
  };

  const handleSaveDetail = async () => {
    if (!detail) return;
    setSaving(true);
    try {
      await api.put(`/data-entry/${detail.id}`, {
        value_numeric: edit.value_numeric === '' ? null : parseFloat(edit.value_numeric),
        unit: edit.unit || null,
        data_source: edit.data_source || null,
        notes: edit.notes || null,
      });
      toast.success('Saisie mise à jour');
      setDetail(null);
      await refreshAll();
    } catch (error: any) {
      toast.error(errorDetail(error, t('dataEntry.saveError')));
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const params: Record<string, string> = { format: 'csv' };
      if (pillarFilter !== 'all') params.pillar = pillarFilter;
      if (verifFilter !== 'all') params.verification_status = verifFilter;
      if (year) params.year = year;
      if (search.trim()) params.search = search.trim();
      const res = await api.get('/data-entry/export', { params, responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url; a.download = 'saisies-esg.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Export impossible pour le moment.');
    }
  };

  const resetForm = () => {
    setFormData({
      organization_id: '', period_start: new Date().getFullYear() + '-01-01',
      period_end: new Date().getFullYear() + '-12-31', period_type: 'annual',
      pillar: 'environmental', category: '', metric_name: '',
      value_numeric: '', unit: '', data_source: '', notes: '',
    });
    setSelectedPillar('environmental');
    setSelectedCategory('');
    setSelectedMetric(null);
    setStep(1);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96"><Spinner size="lg" /></div>;
  }

  const grandTotal = stats?.total ?? 0;
  const pending = Math.max(grandTotal - (stats?.by_verification_status?.verified ?? 0), 0);
  const years = Object.keys(stats?.by_period ?? {}).sort().reverse();
  const pages = totalPages(total, pageSize);
  const filtersActive = search.trim() !== '' || pillarFilter !== 'all' || verifFilter !== 'all' || year !== '';
  const resetFilters = () => { setSearchInput(''); setSearch(''); setPillarFilter('all'); setVerifFilter('all'); setYear(''); setPage(1); };
  const selectable = entries.filter(e => e.verification_status !== 'verified');
  const allSelected = selectable.length > 0 && selectable.every(e => selected.has(e.id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(selectable.map(e => e.id)));
  const toggleOne = (id: string) => setSelected(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const suspicious = entries.filter(looksLikeYear).length;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="space-y-5">

      {/* ─── En-tête ───────────────────────────────────────────────────── */}
      <CollectHeader
        title={t('dataEntry.title')}
        subtitle={t('dataEntry.subtitle')}
        actions={
          <>
            <button type="button" onClick={refreshAll} aria-label={t('dataEntry.refresh')} title={t('dataEntry.refresh')}
              className="p-2.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-50">
              <RefreshCw className={`h-4 w-4 ${listLoading ? 'animate-spin' : ''}`} />
            </button>
            <button type="button" onClick={() => { setShowModal(true); setStep(1); }} className={btnPrimary}>
              <Plus className="h-4 w-4" aria-hidden="true" />{t('dataEntry.newEntry')}
            </button>
          </>
        }
      />

      {/* ─── KPI (calculés sur toutes les saisies, pas sur la page affichée) ─── */}
      <section aria-label="Indicateurs clés" className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi label={t('dataEntry.totalEntries')} value={grandTotal} color="#64748b" />
        <PillarCard label={t('dashboard.environmental')} count={stats?.by_pillar?.environmental ?? 0} color={PILLAR_CFG.environmental.strip} comp={completeness?.environmental} loading={completenessLoading} />
        <PillarCard label={t('dashboard.social')} count={stats?.by_pillar?.social ?? 0} color={PILLAR_CFG.social.strip} comp={completeness?.social} loading={completenessLoading} />
        <PillarCard label={t('dashboard.governance')} count={stats?.by_pillar?.governance ?? 0} color={PILLAR_CFG.governance.strip} comp={completeness?.governance} loading={completenessLoading} />
        <Kpi label="Vérifiées" value={`${verifiedRate(stats?.by_verification_status, grandTotal)} %`} hint={`${pending} à vérifier`} color="#10b981" />
      </section>

      {/* ─── Table ─────────────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
            <input type="search" value={searchInput} onChange={e => setSearchInput(e.target.value)}
              placeholder={t('dataEntry.filterSearch', 'Rechercher un indicateur…')} aria-label={t('dataEntry.filterSearch', 'Rechercher un indicateur…')}
              className="w-64 pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
          </div>
          <div className="flex gap-1.5" role="group" aria-label={t('dataEntry.filterPillar', 'Filtrer par pilier')}>
            {([['all', t('dataEntry.filterAll', 'Tous'), grandTotal], ['environmental', 'Environnemental', stats?.by_pillar?.environmental], ['social', 'Social', stats?.by_pillar?.social], ['governance', 'Gouvernance', stats?.by_pillar?.governance]] as [PillarFilter, string, number | undefined][]).map(([key, label, count]) => (
              <button key={key} type="button" onClick={() => { setPillarFilter(key); setPage(1); }} aria-pressed={pillarFilter === key}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${pillarFilter === key ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {label} {count !== undefined && <span className={pillarFilter === key ? 'text-white/70' : 'text-gray-400'}>{count}</span>}
              </button>
            ))}
          </div>
          <select value={verifFilter} onChange={e => { setVerifFilter(e.target.value as VerifFilter); setPage(1); }} aria-label={t('dataEntry.filterStatus', 'Filtrer par statut')}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500">
            <option value="all">{t('dataEntry.statusAll', 'Tous les statuts')}</option>
            <option value="verified">{t('dataEntry.verified')}</option>
            <option value="pending">{t('dataEntry.pending')}</option>
          </select>
          {years.length > 0 && (
            <select value={year} onChange={e => { setYear(e.target.value); setPage(1); }} aria-label="Filtrer par année"
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500">
              <option value="">Toutes les années</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          )}
          <div className="ml-auto flex items-center gap-3">
            {filtersActive && (
              <button type="button" onClick={resetFilters} className="text-xs font-semibold text-emerald-700 hover:underline">
                {t('dataEntry.filterReset', 'Réinitialiser')}
              </button>
            )}
            <button type="button" onClick={handleExport} disabled={total === 0}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50">
              <Download className="h-4 w-4" aria-hidden="true" />{t('dataEntry.exportCsv')}
            </button>
          </div>
        </div>

        {selected.size > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 bg-slate-900 text-white text-sm" role="status">
            <span>{selected.size} sélectionnée{selected.size > 1 ? 's' : ''}</span>
            <button type="button" onClick={() => setDeleteTargets(entries.filter(e => selected.has(e.id)))}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20">
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />Supprimer
            </button>
            <button type="button" onClick={() => setSelected(new Set())} className="ml-auto text-white/70 hover:text-white">Annuler</button>
          </div>
        )}

        {suspicious > 0 && (
          <div className="flex items-start gap-2 px-4 py-2.5 bg-amber-50 border-b border-amber-100 text-xs text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-px" aria-hidden="true" />
            <p>{suspicious} valeur{suspicious > 1 ? 's' : ''} de cette page ressemble{suspicious > 1 ? 'nt' : ''} à une année (ex. 2022) : vérifiez l'association des colonnes de votre import CSV. Les données ne sont jamais modifiées automatiquement.</p>
          </div>
        )}

        {grandTotal === 0 && total === 0 && !listLoading ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-50 flex items-center justify-center">
              <Database className="h-8 w-8 text-gray-300" />
            </div>
            <p className="text-lg font-semibold text-gray-900 mb-1">{t('dataEntry.emptyTitle')}</p>
            <p className="text-gray-500 mb-6 max-w-xs mx-auto text-sm">{t('dataEntry.emptySubtitle')}</p>
            <button type="button" onClick={() => { setShowModal(true); setStep(1); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 shadow-sm">
              <Plus className="h-4 w-4" aria-hidden="true" />{t('dataEntry.newEntry')}
            </button>
          </div>
        ) : (
          <div className={`overflow-x-auto transition-opacity ${listLoading ? 'opacity-60' : ''}`} aria-busy={listLoading}>
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th scope="col" className="w-10 pl-4 py-2.5">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} disabled={selectable.length === 0} aria-label="Tout sélectionner (hors saisies vérifiées)"
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                  </th>
                  <SortHeader label="Indicateur" k="metric_name" sortBy={sortBy} order={order} onSort={handleSort} />
                  <SortHeader label="Pilier" k="pillar" sortBy={sortBy} order={order} onSort={handleSort} />
                  <SortHeader label="Période" k="period_start" sortBy={sortBy} order={order} onSort={handleSort} />
                  <SortHeader label="Valeur" k="value_numeric" sortBy={sortBy} order={order} onSort={handleSort} align="right" />
                  <th scope="col" className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Source</th>
                  <SortHeader label="Statut" k="verification_status" sortBy={sortBy} order={order} onSort={handleSort} />
                  <th scope="col" className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.length === 0 && (
                  <tr><td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500">{t('dataEntry.filterNoResult', 'Aucune saisie ne correspond aux filtres.')}</td></tr>
                )}
                {entries.map(entry => {
                  const { title, code } = displayName(entry);
                  const verified = entry.verification_status === 'verified';
                  const yearLike = looksLikeYear(entry);
                  return (
                    <tr key={entry.id} className="group hover:bg-gray-50/70 cursor-pointer" onClick={() => openDetail(entry)}>
                      <td className="pl-4 py-2.5" onClick={ev => ev.stopPropagation()}>
                        <input type="checkbox" checked={selected.has(entry.id)} onChange={() => toggleOne(entry.id)} disabled={verified}
                          aria-label={`Sélectionner ${title}`} title={verified ? 'Saisie vérifiée : verrouillée' : undefined}
                          className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-30" />
                      </td>
                      <td className="px-3 py-2.5 max-w-xs">
                        <button type="button" onClick={ev => { ev.stopPropagation(); openDetail(entry); }} className="text-left w-full">
                          <span className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 truncate">{title}</span>
                            {code && <code className="px-1.5 py-0.5 rounded bg-gray-100 text-[11px] text-gray-500">{code}</code>}
                          </span>
                          {entry.category && title !== entry.category.charAt(0).toUpperCase() + entry.category.slice(1) && (
                            <span className="block text-xs text-gray-400 truncate">{entry.category}</span>
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-2.5"><PillarBadge pillar={entry.pillar} /></td>
                      <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">
                        {entry.period_start ? format(new Date(entry.period_start), entry.period_type === 'annual' ? 'yyyy' : 'MMM yyyy', { locale: fr }) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 justify-end">
                          {yearLike && <span title="Valeur proche d'une année : à vérifier" aria-label="Valeur proche d'une année : à vérifier"><AlertTriangle className="h-3.5 w-3.5 text-amber-500" /></span>}
                          <span className="font-semibold text-gray-900 tabular-nums">{formatValue(entry)}</span>
                          {entry.unit && <span className="text-xs text-gray-400">{entry.unit}</span>}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                        {sourceLabel(entry.collection_method)}
                        {entry.data_source && <span className="block text-gray-400 max-w-[10rem] truncate">{entry.data_source}</span>}
                      </td>
                      <td className="px-3 py-2.5"><StatusBadge status={entry.verification_status} /></td>
                      <td className="pr-3" onClick={ev => ev.stopPropagation()}>
                        {!verified && (
                          <button type="button" onClick={() => setDeleteTargets([entry])} aria-label={`${t('dataEntry.delete', 'Supprimer')} ${title}`}
                            className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-1.5 rounded-md text-gray-300 hover:bg-red-50 hover:text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > 0 && (
          <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 text-sm text-gray-600">
            <span>{from}–{to} sur {total.toLocaleString('fr-FR')}{filtersActive && grandTotal > total ? ` (filtré sur ${grandTotal.toLocaleString('fr-FR')})` : ''}</span>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs">Lignes
                <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} className="px-2 py-1 border border-gray-200 rounded-md bg-white text-sm">
                  {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <button type="button" onClick={() => setPage(p => p - 1)} disabled={page <= 1} aria-label="Page précédente"
                className="p-1.5 rounded-md border border-gray-200 disabled:opacity-40 hover:bg-gray-50"><ChevronLeft className="h-4 w-4" /></button>
              <span className="tabular-nums">Page {page} / {pages}</span>
              <button type="button" onClick={() => setPage(p => p + 1)} disabled={page >= pages} aria-label="Page suivante"
                className="p-1.5 rounded-md border border-gray-200 disabled:opacity-40 hover:bg-gray-50"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </nav>
        )}
      </section>

      {/* ─── Confirmation de suppression ───────────────────────────────── */}
      {deleteTargets.length > 0 && (
        <ConfirmDialog
          isOpen
          title={deleteTargets.length > 1 ? `Supprimer ${deleteTargets.length} saisies ?` : 'Supprimer cette entrée ?'}
          message={deleteTargets.length > 1
            ? <>Ces {deleteTargets.length} saisies seront définitivement supprimées.</>
            : <><span className="font-semibold text-gray-800">"{displayName(deleteTargets[0]).title}"</span> sera définitivement supprimée.</>}
          confirmLabel="Supprimer"
          onConfirm={handleDelete}
          onClose={() => setDeleteTargets([])}
        />
      )}

      {/* ─── Détail / édition d'une saisie ─────────────────────────────── */}
      {detail && (() => {
        const locked = detail.verification_status === 'verified';
        const { title, code } = displayName(detail);
        const fieldCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 disabled:bg-gray-50 disabled:text-gray-500';
        return (
          <Modal isOpen onClose={() => setDetail(null)} title={title} subtitle={code ? `Code ${code}` : detail.category}
            size="md"
            footer={
              <div className="flex w-full items-center gap-3">
                {!locked && (
                  <Button variant="secondary" icon={<Trash2 className="h-4 w-4" />} onClick={() => setDeleteTargets([detail])}>Supprimer</Button>
                )}
                <div className="flex-1" />
                <Button variant="secondary" onClick={() => setDetail(null)}>{locked ? 'Fermer' : t('dataEntry.cancel')}</Button>
                {!locked && <Button loading={saving} icon={<Save className="h-4 w-4" />} onClick={handleSaveDetail}>Enregistrer</Button>}
              </div>
            }>
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <PillarBadge pillar={detail.pillar} /><StatusBadge status={detail.verification_status} />
                <span className="text-xs text-gray-500">
                  {format(new Date(detail.period_start), 'dd MMM yyyy', { locale: fr })} → {format(new Date(detail.period_end), 'dd MMM yyyy', { locale: fr })}
                </span>
              </div>
              {locked && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 text-sm text-emerald-800">
                  <Lock className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                  Cette saisie a été vérifiée : elle est verrouillée pour préserver la piste d'audit.
                </div>
              )}
              {looksLikeYear(detail) && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 text-sm text-amber-800">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                  Cette valeur ressemble à une année : elle provient peut-être d'une colonne mal associée à l'import.
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label htmlFor="de-value" className="block text-sm font-medium text-gray-700 mb-1">{t('dataEntry.valueLabel')}</label>
                  <input id="de-value" type="number" step="any" value={edit.value_numeric} disabled={locked}
                    onChange={e => setEdit({ ...edit, value_numeric: e.target.value })} className={fieldCls} />
                </div>
                <div>
                  <label htmlFor="de-unit" className="block text-sm font-medium text-gray-700 mb-1">Unité</label>
                  <input id="de-unit" type="text" value={edit.unit} disabled={locked} onChange={e => setEdit({ ...edit, unit: e.target.value })} className={fieldCls} />
                </div>
              </div>
              <div>
                <label htmlFor="de-source" className="block text-sm font-medium text-gray-700 mb-1">{t('dataEntry.dataSource')}</label>
                <input id="de-source" type="text" value={edit.data_source} disabled={locked} onChange={e => setEdit({ ...edit, data_source: e.target.value })} className={fieldCls} />
              </div>
              <div>
                <label htmlFor="de-notes" className="block text-sm font-medium text-gray-700 mb-1">{t('dataEntry.notes')}</label>
                <textarea id="de-notes" rows={3} value={edit.notes} disabled={locked} onChange={e => setEdit({ ...edit, notes: e.target.value })} className={`${fieldCls} resize-none`} />
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* ─── Add Entry Modal ─────────────────────────────────────────── */}
      {/* ─── Assistant d'ajout (3 étapes) ──────────────────────────── */}
      <Modal
        isOpen={showModal}
        onClose={closeWizard}
        title={t('dataEntry.modalTitle')}
        subtitle={`Étape ${step} sur 3`}
        size="lg"
        closeOnBackdrop={false}
        noPadding
        headerExtra={
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {[1, 2, 3].map(s => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all duration-300 ${s <= step ? 'bg-primary-600' : 'bg-gray-200'}`}
                style={{ width: s === step ? 24 : 8 }}
              />
            ))}
          </div>
        }
        footer={
          <div className="flex w-full items-center gap-3">
            {step > 1 && (
              <Button variant="secondary" icon={<ChevronLeft className="h-4 w-4" />} onClick={() => setStep(s => s - 1)}>
                Précédent
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="secondary" onClick={closeWizard}>{t('dataEntry.cancel')}</Button>
            {step < 3 ? (
              <Button
                disabled={
                  (step === 1 && !selectedPillar) ||
                  (step === 2 && (!selectedCategory || !selectedMetric))
                }
                onClick={() => setStep(s => s + 1)}
              >
                Suivant
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" form="data-entry-form" loading={submitting} icon={<Save className="h-4 w-4" />}>
                {submitting ? t('dataEntry.saving') : t('dataEntry.save')}
              </Button>
            )}
          </div>
        }
      >
        <form id="data-entry-form" onSubmit={handleSubmit}>
              <div className="px-8 py-6 space-y-6">

                {/* ── Step 1: Pillar ── */}
                {step === 1 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-600 mb-4">Choisissez un pilier ESG</p>
                    <div className="grid grid-cols-3 gap-4">
                      {Object.entries(PILLAR_CFG).map(([id, cfg]) => {
                        const Icon = cfg.icon;
                        const active = selectedPillar === id;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => handlePillarChange(id)}
                            className="relative p-6 rounded-2xl border-2 text-center transition-all overflow-hidden"
                            style={{
                              borderColor: active ? cfg.color : '#e5e7eb',
                              backgroundColor: active ? cfg.softBg : 'white',
                            }}
                          >
                            {active && (
                              <div className="absolute top-0 inset-x-0 h-1" style={{ backgroundColor: cfg.strip }} />
                            )}
                            <div className="p-3 rounded-xl mx-auto w-fit mb-3" style={{ backgroundColor: active ? cfg.iconBg : '#f9fafb' }}>
                              <Icon className="h-7 w-7" style={{ color: active ? cfg.color : '#9ca3af' }} />
                            </div>
                            <p className="text-sm font-semibold" style={{ color: active ? cfg.color : '#9ca3af' }}>
                              {cfg.label}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Step 2: Category & Metric ── */}
                {step === 2 && selectedPillar && templates[selectedPillar] && (
                  <div className="space-y-5">
                    {/* Selected pillar indicator */}
                    {(() => {
                      const cfg = getPillarCfg(selectedPillar);
                      const Icon = cfg.icon;
                      return (
                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium" style={{ backgroundColor: cfg.softBg, color: cfg.color }}>
                          <Icon className="h-4 w-4" />
                          Pilier sélectionné : {cfg.label}
                        </div>
                      );
                    })()}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('dataEntry.stepCategory')}</label>
                      <select
                        value={selectedCategory}
                        onChange={e => handleCategoryChange(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all bg-white"
                        required
                      >
                        <option value="">{t('dataEntry.chooseCategory')}</option>
                        {Object.keys(templates[selectedPillar]).map(cat => (
                          <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                    {selectedCategory && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('dataEntry.stepIndicator')}</label>
                        <select
                          value={selectedMetric?.name || ''}
                          onChange={e => {
                            const metric = templates[selectedPillar][selectedCategory]?.find(
                              (m: MetricTemplate) => m.name === e.target.value
                            );
                            if (metric) handleMetricSelect(metric);
                          }}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all bg-white"
                          required
                        >
                          <option value="">{t('dataEntry.chooseIndicator')}</option>
                          {templates[selectedPillar][selectedCategory]?.map((metric: MetricTemplate) => (
                            <option key={metric.name} value={metric.name}>{metric.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {selectedMetric?.description && (
                      <div className="flex items-start gap-2 p-3.5 bg-emerald-50 rounded-xl text-sm text-emerald-700">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        {selectedMetric.description}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Step 3: Values & Details ── */}
                {step === 3 && selectedMetric && (
                  <div className="space-y-5">
                    {/* Recap banner */}
                    {(() => {
                      const cfg = getPillarCfg(selectedPillar);
                      const Icon = cfg.icon;
                      return (
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border" style={{ borderColor: cfg.strip, backgroundColor: cfg.softBg }}>
                          <Icon className="h-4 w-4 shrink-0" style={{ color: cfg.color }} />
                          <span className="text-sm font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
                          <span className="text-gray-400 text-sm">·</span>
                          <span className="text-sm text-gray-600 font-medium truncate">{selectedMetric.name}</span>
                        </div>
                      );
                    })()}

                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('dataEntry.valueLabel')}</label>
                        <div className="flex gap-2">
                          <input
                            type="number" step="any"
                            value={formData.value_numeric}
                            onChange={e => setFormData({ ...formData, value_numeric: e.target.value })}
                            className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all placeholder:text-gray-400"
                            placeholder="0.00" required disabled={submitting}
                          />
                          <input
                            type="text"
                            value={formData.unit}
                            onChange={e => setFormData({ ...formData, unit: e.target.value })}
                            className="w-20 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all placeholder:text-gray-400 text-center"
                            placeholder={t('dataEntry.unitPlaceholder')}
                            disabled={submitting}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('dataEntry.organisation')}</label>
                        <select
                          value={formData.organization_id}
                          onChange={e => setFormData({ ...formData, organization_id: e.target.value })}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all bg-white"
                          disabled={submitting}
                        >
                          <option value="">{t('dataEntry.allOrgs')}</option>
                          {organizations.map(org => (
                            <option key={org.id} value={org.id}>{org.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { label: t('dataEntry.periodStart'), key: 'period_start', type: 'date' },
                        { label: t('dataEntry.periodEnd'),   key: 'period_end',   type: 'date' },
                      ].map(f => (
                        <div key={f.key}>
                          <label className="block text-sm font-medium text-gray-700 mb-2">{f.label}</label>
                          <input
                            type={f.type}
                            value={(formData as any)[f.key]}
                            onChange={e => setFormData({ ...formData, [f.key]: e.target.value })}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all placeholder:text-gray-400"
                            required disabled={submitting}
                          />
                        </div>
                      ))}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('dataEntry.periodType')}</label>
                        <select
                          value={formData.period_type}
                          onChange={e => setFormData({ ...formData, period_type: e.target.value })}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all bg-white"
                          disabled={submitting}
                        >
                          <option value="annual">{t('dataEntry.annual')}</option>
                          <option value="quarterly">{t('dataEntry.quarterly')}</option>
                          <option value="monthly">{t('dataEntry.monthly')}</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('dataEntry.dataSource')}</label>
                      <input
                        type="text"
                        value={formData.data_source}
                        onChange={e => setFormData({ ...formData, data_source: e.target.value })}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all placeholder:text-gray-400"
                        placeholder="Ex: Rapport annuel 2024, Système RH…"
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('dataEntry.notes')}</label>
                      <textarea
                        value={formData.notes}
                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        rows={3}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all placeholder:text-gray-400 resize-none"
                        placeholder={t('dataEntry.notesPlaceholder')}
                        disabled={submitting}
                      />
                    </div>
                  </div>
                )}
              </div>

        </form>
      </Modal>
    </div>
  );
}
