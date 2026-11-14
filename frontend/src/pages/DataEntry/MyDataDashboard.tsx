// « Mes données » : vue d'ensemble de toutes les saisies, quelle que soit leur origine, et leur vérification.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle, ArrowDown, ArrowUp, ArrowUpDown, BarChart3, Check, ChevronDown, ChevronLeft, ChevronRight,
  Download, Flag, Lock, RefreshCw, Search, Trash2, X, XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { ConfirmDialog, Modal, Button } from '@/components/common';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import i18n from '@/i18n/config';
import CollectHeader, { btnPrimary, btnSecondary, card, field } from './CollectHeader';
import MyDataStatsDashboard, { type MyDataStats } from './MyDataStatsDashboard';
import { displayName, errorDetail, formatValue, sourceLabel, totalPages, verifiedRate, type SortKey, type SortOrder } from './dataEntryHelpers';

interface DataEntry {
  id: string; metric_name: string; value_numeric: number | null; value_text: string | null; unit: string | null;
  pillar: string; category: string | null; period_start: string; period_end: string;
  collection_method: string | null; verification_status: string; data_source: string | null;
}

const PILLARS: Record<string, { label: string; cls: string }> = {
  environmental: { label: 'Environnemental', cls: 'bg-green-50 text-green-700' },
  social: { label: 'Social', cls: 'bg-blue-50 text-blue-700' },
  governance: { label: 'Gouvernance', cls: 'bg-violet-50 text-violet-700' },
};
const STATUS: Record<string, { label: string; cls: string; icon: typeof Lock }> = {
  verified: { label: 'Vérifiée', cls: 'bg-emerald-50 text-emerald-700', icon: Lock },
  pending: { label: 'À vérifier', cls: 'bg-amber-50 text-amber-700', icon: AlertCircle },
  flagged: { label: 'Signalée', cls: 'bg-orange-50 text-orange-700', icon: Flag },
  rejected: { label: 'Rejetée', cls: 'bg-red-50 text-red-700', icon: XCircle },
};
const PAGE_SIZES = [25, 50, 100];

function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className={`${card} px-4 py-3`}>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

export default function MyDataDashboard() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const locale = i18n.language?.startsWith('en') ? enUS : fr;

  const [rows, setRows] = useState<DataEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<MyDataStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [pillar, setPillar] = useState('');
  const [source, setSource] = useState(params.get('source') ?? '');
  const [status, setStatus] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('created_at');
  const [order, setOrder] = useState<SortOrder>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [actingId, setActingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DataEntry | null>(null);
  const [rejectTarget, setRejectTarget] = useState<DataEntry | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showCharts, setShowCharts] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const filterParams = useCallback(() => {
    const p: Record<string, string | number> = {};
    if (search.trim()) p.search = search.trim();
    if (pillar) p.pillar = pillar;
    if (source) p.collection_method = source;
    if (status) p.verification_status = status;
    return p;
  }, [search, pillar, source, status]);

  const reqId = useRef(0);
  const loadRows = useCallback(async () => {
    const my = ++reqId.current;
    setLoading(true);
    try {
      const res = await api.get('/data-entry/', {
        params: { ...filterParams(), sort_by: sortBy, order, limit: pageSize, offset: (page - 1) * pageSize },
      });
      if (my !== reqId.current) return;
      const list: DataEntry[] = res.data || [];
      const header = res.headers?.['x-total-count'];
      setRows(list);
      setTotal(header !== undefined && Number.isFinite(Number(header)) ? Number(header) : list.length);
      setLoadError(false);
    } catch {
      if (my === reqId.current) setLoadError(true);
    } finally {
      if (my === reqId.current) setLoading(false);
    }
  }, [filterParams, sortBy, order, page, pageSize]);

  const loadStats = useCallback(async () => {
    try { setStats((await api.get('/data-entry/stats')).data); } catch { /* indicateurs facultatifs */ }
  }, []);

  useEffect(() => { loadRows(); }, [loadRows]);
  useEffect(() => { loadStats(); }, [loadStats]);
  const refresh = () => Promise.all([loadRows(), loadStats()]);

  const handleSort = (k: SortKey) => {
    if (k === sortBy) setOrder(o => (o === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(k); setOrder(k === 'metric_name' || k === 'pillar' ? 'asc' : 'desc'); }
    setPage(1);
  };

  const validate = async (entry: DataEntry, action: 'verify' | 'reject', reason?: string) => {
    setActingId(entry.id);
    try {
      const res = await api.post(`/data-validation/entries/${entry.id}/validate`, { action, reason });
      if (action === 'verify') {
        toast.success(res.data?.solo_mode
          ? t('myd.verifiedSolo', 'Saisie vérifiée (vous êtes le seul utilisateur du compte).')
          : t('myd.verified', 'Saisie vérifiée et verrouillée.'));
      } else {
        toast.success(t('myd.rejected', 'Saisie rejetée.'));
      }
      setRejectTarget(null); setRejectReason('');
      await refresh();
    } catch (e) {
      toast.error(errorDetail(e, t('myd.validateError', "L'opération a échoué.")));
    } finally { setActingId(null); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/data-entry/${deleteTarget.id}`);
      toast.success(t('myd.deleted', 'Saisie supprimée.'));
      if (rows.length === 1 && page > 1) setPage(p => p - 1);
      await refresh();
    } catch (e) {
      toast.error(errorDetail(e, t('myd.deleteError', 'La suppression a échoué.')));
    } finally { setDeleteTarget(null); }
  };

  // Export complet côté serveur, avec les filtres affichés (et non les seules lignes de la page).
  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get('/data-entry/export', { params: { ...filterParams(), format: 'xlsx' }, responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url; a.download = 'donnees-esg.xlsx'; a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t('myd.exportError', "L'export a échoué."));
    } finally { setExporting(false); }
  };

  const grandTotal = stats?.total ?? 0;
  const byStatus = stats?.by_verification_status ?? {};
  const toReview = (byStatus.pending ?? 0) + (byStatus.flagged ?? 0);
  const sources = Object.keys(stats?.by_collection_method ?? {}).filter(k => k !== 'unknown').sort();
  const filtersActive = Boolean(search.trim() || pillar || source || status);
  const resetFilters = () => { setSearchInput(''); setSearch(''); setPillar(''); setSource(''); setStatus(''); setPage(1); };
  const pages = totalPages(total, pageSize);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const th = (label: string, k: SortKey, right = false) => {
    const active = sortBy === k;
    const Icon = !active ? ArrowUpDown : order === 'asc' ? ArrowUp : ArrowDown;
    return (
      <th scope="col" aria-sort={active ? (order === 'asc' ? 'ascending' : 'descending') : 'none'}
        className={`px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 ${right ? 'text-right' : 'text-left'}`}>
        <button type="button" onClick={() => handleSort(k)} className={`inline-flex items-center gap-1 hover:text-gray-900 ${active ? 'text-gray-900' : ''}`}>
          {label}<Icon className={`h-3 w-3 ${active ? '' : 'opacity-40'}`} aria-hidden="true" />
        </button>
      </th>
    );
  };

  return (
    <div className="space-y-5">
      <CollectHeader
        title={t('myd.title', 'Mes données')}
        subtitle={t('myd.subtitle', 'Toutes vos saisies, quelle que soit leur origine, et leur état de vérification.')}
        actions={
          <>
            <button type="button" onClick={refresh} aria-label={t('myd.refresh', 'Actualiser')} title={t('myd.refresh', 'Actualiser')}
              className="rounded-lg border border-gray-200 bg-white p-2.5 text-gray-500 hover:bg-gray-50 hover:text-gray-900">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button type="button" onClick={handleExport} disabled={exporting || total === 0} className={btnSecondary}>
              <Download className="h-4 w-4" aria-hidden="true" />{exporting ? t('myd.exporting', 'Export…') : t('myd.export', 'Exporter (Excel)')}
            </button>
          </>
        }
      />

      <section aria-label={t('myd.kpis', 'Indicateurs clés')} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={t('myd.kpiTotal', 'Saisies')} value={grandTotal.toLocaleString('fr-FR')} />
        <Kpi label={t('myd.kpiVerified', 'Vérifiées')} value={`${verifiedRate(byStatus, grandTotal)} %`} hint={t('myd.kpiVerifiedHint', '{{n}} sur {{total}}', { n: byStatus.verified ?? 0, total: grandTotal })} />
        <Kpi label={t('myd.kpiToReview', 'À vérifier')} value={toReview} />
        <Kpi label={t('myd.kpiRejected', 'Rejetées')} value={byStatus.rejected ?? 0} />
      </section>

      {toReview > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <p className="min-w-0 flex-1">
            {t('myd.reviewBanner', '{{n}} saisie(s) attendent une vérification. Une saisie vérifiée est verrouillée : elle ne peut plus être modifiée ni supprimée.', { n: toReview })}
          </p>
          <Link to="/app/data-quality" className="font-semibold underline-offset-2 hover:underline">{t('myd.reviewLink', 'Qualité des données')}</Link>
        </div>
      )}

      <section className={`${card} overflow-hidden`}>
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input type="search" value={searchInput} onChange={e => setSearchInput(e.target.value)}
              placeholder={t('myd.search', 'Rechercher un indicateur…')} aria-label={t('myd.search', 'Rechercher un indicateur…')}
              className={`${field} w-64 pl-9`} />
          </div>
          <select value={pillar} onChange={e => { setPillar(e.target.value); setPage(1); }} aria-label={t('myd.fPillar', 'Filtrer par pilier')} className={`${field} w-auto`}>
            <option value="">{t('myd.allPillars', 'Tous les piliers')}</option>
            {Object.entries(PILLARS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={source} onChange={e => { setSource(e.target.value); setPage(1); }} aria-label={t('myd.fSource', 'Filtrer par origine')} className={`${field} w-auto`}>
            <option value="">{t('myd.allSources', 'Toutes les origines')}</option>
            {[...new Set([...sources, ...(source ? [source] : [])])].map(k => <option key={k} value={k}>{sourceLabel(k)}</option>)}
          </select>
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} aria-label={t('myd.fStatus', 'Filtrer par statut')} className={`${field} w-auto`}>
            <option value="">{t('myd.allStatuses', 'Tous les statuts')}</option>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          {filtersActive && (
            <button type="button" onClick={resetFilters} className="ml-auto text-xs font-semibold text-emerald-700 hover:underline">{t('myd.reset', 'Réinitialiser')}</button>
          )}
        </div>

        {loadError ? (
          <div className="px-6 py-14 text-center">
            <p className="text-sm text-red-700">{t('myd.loadError', 'Impossible de charger vos données.')}</p>
            <button type="button" onClick={refresh} className={`${btnSecondary} mt-4`}><RefreshCw className="h-4 w-4" aria-hidden="true" />{t('myd.retry', 'Réessayer')}</button>
          </div>
        ) : loading && rows.length === 0 ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : total === 0 && !filtersActive ? (
          <div className="px-6 py-16 text-center">
            <p className="text-lg font-semibold text-gray-900">{t('myd.emptyTitle', 'Aucune donnée pour le moment')}</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">{t('myd.emptyHint', 'Saisissez vos premiers indicateurs ou importez un fichier que vous avez déjà.')}</p>
            <div className="mt-5 flex justify-center gap-3">
              <Link to="/app/data-entry" className={btnPrimary}>{t('myd.emptyEntry', 'Saisir une donnée')}</Link>
              <Link to="/app/import-csv" className={btnSecondary}>{t('myd.emptyImport', 'Importer un fichier')}</Link>
            </div>
          </div>
        ) : (
          <div className={`overflow-x-auto transition-opacity ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
            <table className="min-w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  {th(t('myd.thMetric', 'Indicateur'), 'metric_name')}
                  {th(t('myd.thPillar', 'Pilier'), 'pillar')}
                  {th(t('myd.thPeriod', 'Période'), 'period_start')}
                  {th(t('myd.thValue', 'Valeur'), 'value_numeric', true)}
                  <th scope="col" className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{t('myd.thSource', 'Origine')}</th>
                  {th(t('myd.thStatus', 'Statut'), 'verification_status')}
                  <th scope="col" className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">{t('myd.thActions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.length === 0 && (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">{t('myd.noResult', 'Aucune saisie ne correspond aux filtres.')}</td></tr>
                )}
                {rows.map(entry => {
                  const { title, code } = displayName(entry);
                  const st = STATUS[(entry.verification_status || 'pending').toLowerCase()] ?? STATUS.pending;
                  const StIcon = st.icon;
                  const pl = PILLARS[entry.pillar];
                  const key = (entry.verification_status || '').toLowerCase();
                  const reviewable = key === 'pending' || key === 'flagged';
                  const busy = actingId === entry.id;
                  return (
                    <tr key={entry.id} className="hover:bg-gray-50/70">
                      <td className="max-w-xs px-3 py-2.5">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-medium text-gray-900">{title}</span>
                          {code && <code className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-500">{code}</code>}
                        </span>
                        {entry.category && <span className="block truncate text-xs text-gray-400">{entry.category}</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${pl?.cls ?? 'bg-gray-100 text-gray-600'}`}>{pl?.label ?? entry.pillar}</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-gray-600">
                        {entry.period_start ? format(new Date(entry.period_start), 'MMM yyyy', { locale }) : '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right">
                        <span className="font-semibold tabular-nums text-gray-900">{formatValue(entry)}</span>
                        {entry.unit && <span className="ml-1 text-xs text-gray-400">{entry.unit}</span>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-xs text-gray-600">
                        {sourceLabel(entry.collection_method)}
                        {entry.data_source && <span className="block max-w-[11rem] truncate text-gray-400">{entry.data_source}</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${st.cls}`}>
                          <StIcon className="h-3 w-3" aria-hidden="true" />{st.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right">
                        {busy ? <Spinner size="sm" /> : (
                          <span className="inline-flex items-center gap-1">
                            {reviewable && (
                              <>
                                <button type="button" onClick={() => validate(entry, 'verify')} aria-label={`${t('myd.verify', 'Vérifier')} ${title}`} title={t('myd.verify', 'Vérifier')}
                                  className="rounded-md p-1.5 text-gray-400 hover:bg-emerald-50 hover:text-emerald-700"><Check className="h-4 w-4" /></button>
                                <button type="button" onClick={() => { setRejectTarget(entry); setRejectReason(''); }} aria-label={`${t('myd.reject', 'Rejeter')} ${title}`} title={t('myd.reject', 'Rejeter')}
                                  className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"><X className="h-4 w-4" /></button>
                              </>
                            )}
                            {key !== 'verified' && (
                              <button type="button" onClick={() => setDeleteTarget(entry)} aria-label={`${t('myd.delete', 'Supprimer')} ${title}`} title={t('myd.delete', 'Supprimer')}
                                className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                            )}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {total > 0 && (
          <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-4 py-3 text-sm text-gray-600">
            <span>{from}–{to} {t('myd.of', 'sur')} {total.toLocaleString('fr-FR')}</span>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs">{t('myd.rows', 'Lignes')}
                <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} className="rounded-md border border-gray-200 bg-white px-2 py-1 text-sm">
                  {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <button type="button" onClick={() => setPage(p => p - 1)} disabled={page <= 1} aria-label={t('myd.prev', 'Page précédente')}
                className="rounded-md border border-gray-200 p-1.5 hover:bg-gray-50 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
              <span className="tabular-nums">{page} / {pages}</span>
              <button type="button" onClick={() => setPage(p => p + 1)} disabled={page >= pages} aria-label={t('myd.next', 'Page suivante')}
                className="rounded-md border border-gray-200 p-1.5 hover:bg-gray-50 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </nav>
        )}
      </section>

      {stats && grandTotal > 0 && (
        <section>
          <button type="button" onClick={() => setShowCharts(v => !v)} aria-expanded={showCharts}
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900">
            <BarChart3 className="h-4 w-4" aria-hidden="true" />{t('myd.charts', 'Répartition des données')}
            <ChevronDown className={`h-4 w-4 transition-transform ${showCharts ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
          {showCharts && <div className="mt-4"><MyDataStatsDashboard stats={stats} /></div>}
        </section>
      )}

      {deleteTarget && (
        <ConfirmDialog isOpen
          title={t('myd.deleteTitle', 'Supprimer cette saisie ?')}
          message={<><span className="font-semibold text-gray-800">« {displayName(deleteTarget).title} »</span> {t('myd.deleteBody', 'sera définitivement supprimée.')}</>}
          confirmLabel={t('myd.delete', 'Supprimer')}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}

      {rejectTarget && (
        <Modal isOpen onClose={() => setRejectTarget(null)} title={t('myd.rejectTitle', 'Rejeter cette saisie')} subtitle={displayName(rejectTarget).title} size="md"
          footer={
            <div className="flex w-full justify-end gap-3">
              <Button variant="secondary" onClick={() => setRejectTarget(null)}>{t('myd.cancel', 'Annuler')}</Button>
              <Button loading={actingId === rejectTarget.id} disabled={rejectReason.trim().length < 3}
                onClick={() => validate(rejectTarget, 'reject', rejectReason.trim())}>{t('myd.reject', 'Rejeter')}</Button>
            </div>
          }>
          <label htmlFor="myd-reason" className="mb-1 block text-sm font-medium text-gray-700">{t('myd.reasonLabel', 'Motif du rejet')}</label>
          <textarea id="myd-reason" rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} className={`${field} resize-none`}
            placeholder={t('myd.reasonPlaceholder', 'Ex. : valeur incohérente avec la facture, unité erronée…')} />
          <p className="mt-1 text-xs text-gray-500">{t('myd.reasonHint', 'Le motif est conservé dans la piste d’audit.')}</p>
        </Modal>
      )}
    </div>
  );
}
