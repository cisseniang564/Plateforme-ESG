import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import api from '@/services/api';
import {
  AlertTriangle, CheckCircle, ChevronRight, Download, Info, Loader2, Plus, Scale, Search, Send, Truck, X,
} from 'lucide-react';
import SupplierDrawer from './SupplierDrawer';
import SupplierFormModal from './SupplierFormModal';
import {
  EvalStatus, RISK_CFG, RISK_ORDER, RISK_THRESHOLDS, RiskLevel, STATUS_CFG, STATUS_ORDER, Supplier,
  apiErrorMessage, downloadCsv, hasScore, mapSupplier,
} from './supplyChainModel';

type TabId = 'overview' | 'suppliers' | 'vigilance';

interface Toast { kind: 'ok' | 'error'; text: string }

function RiskBadge({ supplier }: { supplier: Supplier }) {
  const { t } = useTranslation();
  if (!hasScore(supplier)) return <span className="text-xs text-gray-400">{t('supplychain.riskUnknown', 'Non évalué')}</span>;
  const c = RISK_CFG[supplier.risk];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${c.bg} ${c.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />{supplier.risk}
    </span>
  );
}

function StatusBadge({ status }: { status: EvalStatus }) {
  const c = STATUS_CFG[status];
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${c.bg} ${c.color}`}>
      <Icon className="h-3 w-3" />{status}
    </span>
  );
}

export default function SupplyChainESG() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabId>('overview');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'Tous'>('Tous');
  const [statusFilter, setStatusFilter] = useState<EvalStatus | 'Tous'>('Tous');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<{ supplier?: Supplier } | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const notify = useCallback((kind: Toast['kind'], text: string) => {
    setToast({ kind, text });
    window.setTimeout(() => setToast(null), 5000);
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/supply-chain/suppliers', { params: { page_size: 200 } });
      setSuppliers((res.data as any[]).map(mapSupplier));
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const selected = suppliers.find(s => s.id === selectedId) ?? null;
  const upsert = (raw: any) => {
    const s = mapSupplier(raw);
    setSuppliers(prev => (prev.some(p => p.id === s.id) ? prev.map(p => (p.id === s.id ? s : p)) : [...prev, s]));
    return s;
  };

  // ── Actions ────────────────────────────────────────────────────────────────
  const sendQuestionnaires = async (ids: string[]) => {
    if (ids.length === 0) return;
    setBusy(true);
    const results = await Promise.allSettled(ids.map(id => api.post(`/supply-chain/suppliers/${id}/questionnaire`, {})));
    setBusy(false);
    const ok = results.filter(r => r.status === 'fulfilled') as PromiseFulfilledResult<any>[];
    const emailed = ok.filter(r => r.value.data?.email_sent).length;
    const failed = results.length - ok.length;
    const noEmail = ok.length - emailed;
    const parts: string[] = [];
    if (emailed) parts.push(t('supplychain.toastEmailed', '{{n}} questionnaire(s) envoyé(s) par email', { n: emailed }));
    if (noEmail) parts.push(t('supplychain.toastNoEmail', '{{n}} lien(s) généré(s) sans email (adresse manquante) : copiez-le depuis la fiche', { n: noEmail }));
    if (failed) parts.push(t('supplychain.toastFailed', '{{n}} échec(s)', { n: failed }));
    notify(failed && !ok.length ? 'error' : 'ok', parts.join(' · '));
    setChecked(new Set());
    await load();
  };

  const deleteSupplier = async (s: Supplier) => {
    setBusy(true);
    try {
      await api.delete(`/supply-chain/suppliers/${s.id}`);
      setSuppliers(prev => prev.filter(p => p.id !== s.id));
      setSelectedId(null);
      notify('ok', t('supplychain.toastDeleted', 'Fournisseur supprimé'));
    } catch (err) {
      notify('error', apiErrorMessage(err, t('supplychain.deleteError', 'Suppression impossible.')));
    } finally {
      setBusy(false);
    }
  };

  const exportAll = () =>
    downloadCsv('fournisseurs-esg.csv', [
      ['Nom', 'Pays', 'Catégorie', 'Achats (k€)', 'Effectif', 'Statut', 'Risque', 'Score ESG', 'Email contact'],
      ...suppliers.map(s => [s.name, s.country, s.category, s.spend, s.employees, s.status, hasScore(s) ? s.risk : '', hasScore(s) ? s.globalScore : '', s.contactEmail]),
    ]);

  // ── Dérivés ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const scored = suppliers.filter(hasScore);
    const totalSpend = suppliers.reduce((a, s) => a + s.spend, 0);
    const evaluatedSpend = scored.reduce((a, s) => a + s.spend, 0);
    return {
      total: suppliers.length,
      evaluated: scored.length,
      avg: scored.length ? Math.round(scored.reduce((a, s) => a + s.globalScore, 0) / scored.length) : null,
      atRisk: scored.filter(s => s.risk === 'Critique' || s.risk === 'Élevé'),
      critical: scored.filter(s => s.risk === 'Critique').length,
      totalSpend,
      evaluatedSpend,
      pending: suppliers.filter(s => s.status === 'En cours').length,
      notEvaluated: suppliers.filter(s => s.status === 'Non évalué').length,
    };
  }, [suppliers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return suppliers
      .filter(s => (riskFilter === 'Tous' || (hasScore(s) && s.risk === riskFilter)))
      .filter(s => statusFilter === 'Tous' || s.status === statusFilter)
      .filter(s => !q || s.name.toLowerCase().includes(q) || s.country.toLowerCase().includes(q) || s.category.toLowerCase().includes(q))
      .sort((a, b) => {
        // Les plus risqués d'abord ; les non évalués après les évalués.
        const rank = (s: Supplier) => (hasScore(s) ? RISK_ORDER.indexOf(s.risk) : RISK_ORDER.length);
        return rank(a) - rank(b) || a.name.localeCompare(b.name);
      });
  }, [suppliers, search, riskFilter, statusFilter]);

  const toggle = (id: string) => setChecked(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allChecked = filtered.length > 0 && filtered.every(s => checked.has(s.id));

  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: t('supplychain.tabs.dashboard', "Vue d'ensemble") },
    { id: 'suppliers', label: `${t('supplychain.tabs.suppliers', 'Fournisseurs')} (${suppliers.length})` },
    { id: 'vigilance', label: t('supplychain.tabs.vigilance', 'Vigilance') },
  ];

  const kpis = [
    { label: t('supplychain.kpiEvaluated', 'Fournisseurs évalués'), val: `${stats.evaluated} / ${stats.total}` },
    { label: t('supplychain.kpiAvgScore', 'Score ESG moyen'), val: stats.avg === null ? '—' : `${stats.avg}/100` },
    { label: t('supplychain.kpiAtRisk', 'À risque élevé ou critique'), val: String(stats.atRisk.length) },
    { label: t('supplychain.kpiPurchases', 'Achats suivis'), val: stats.totalSpend > 0 ? `${stats.totalSpend.toLocaleString('fr-FR')} k€` : '—' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── En-tête compact ─────────────────────────────────────────────── */}
      <header className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center"><Truck className="h-5 w-5" /></div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t('supplychain.title', 'Supply Chain ESG')}</h1>
            <p className="text-sm text-gray-500">{t('supplychain.subtitleHonest', "Évaluez vos fournisseurs avec un questionnaire ESG et suivez leur niveau de risque.")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportAll} disabled={suppliers.length === 0} className="flex items-center gap-2 px-4 py-2 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 text-gray-700 rounded-xl text-sm font-medium">
            <Download className="h-4 w-4" />{t('common.export', 'Exporter')}
          </button>
          <button onClick={() => setForm({})} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold">
            <Plus className="h-4 w-4" />{t('supplychain.addSupplier', 'Ajouter un fournisseur')}
          </button>
        </div>
      </header>

      <div role="tablist" aria-label={t('supplychain.title', 'Supply Chain ESG')} className="flex gap-6 border-b border-gray-200">
        {tabs.map(tb => (
          <button key={tb.id} role="tab" aria-selected={tab === tb.id} onClick={() => setTab(tb.id)}
            className={`pb-3 -mb-px text-sm font-semibold border-b-2 transition-colors ${tab === tb.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
            {tb.label}
          </button>
        ))}
      </div>

      {loading && <div className="flex items-center gap-2 text-sm text-gray-500 py-10 justify-center"><Loader2 className="h-4 w-4 animate-spin" />{t('supplychain.loadingSuppliers', 'Chargement des fournisseurs…')}</div>}

      {!loading && loadError && (
        <div role="alert" className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span className="flex-1">{t('supplychain.loadError', 'Impossible de charger vos fournisseurs.')}</span>
          <button onClick={() => { setLoading(true); load(); }} className="font-semibold underline">{t('common.retry', 'Réessayer')}</button>
        </div>
      )}

      {!loading && !loadError && suppliers.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <Truck className="h-12 w-12 mx-auto text-gray-200 mb-4" />
          <p className="text-lg font-semibold text-gray-900">{t('supplychain.emptyStateTitle', 'Aucun fournisseur enregistré')}</p>
          <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">{t('supplychain.emptyStateDesc', 'Ajoutez vos fournisseurs pour leur envoyer un questionnaire ESG et suivre leur niveau de risque.')}</p>
          <button onClick={() => setForm({})} className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700">
            <Plus className="h-4 w-4" />{t('supplychain.addSupplier', 'Ajouter un fournisseur')}
          </button>
        </div>
      )}

      {!loading && !loadError && suppliers.length > 0 && (
        <>
          {/* ── Vue d'ensemble ── */}
          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map(k => (
                  <div key={k.label} className="bg-white rounded-2xl border border-gray-200 p-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{k.label}</p>
                    <p className="text-2xl font-extrabold text-gray-900 mt-2">{k.val}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <section className="bg-white rounded-2xl border border-gray-200 p-6">
                  <h2 className="text-base font-bold text-gray-900 mb-1">{t('supplychain.sectionRiskDistribution', 'Répartition par risque')}</h2>
                  <p className="text-xs text-gray-400 mb-4">{t('supplychain.riskScaleHint', 'Fournisseurs évalués · score global : ')}{RISK_THRESHOLDS.map(r => `${r.level} ${r.label}`).join(' · ')}</p>
                  <div className="space-y-3">
                    {RISK_ORDER.map(r => {
                      const count = suppliers.filter(s => hasScore(s) && s.risk === r).length;
                      const pct = stats.evaluated ? Math.round((count / stats.evaluated) * 100) : 0;
                      return (
                        <div key={r}>
                          <div className="flex justify-between mb-1.5 text-sm">
                            <span className={`font-semibold ${RISK_CFG[r].color}`}>{r}</span>
                            <span className="text-gray-600">{count}</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className={`h-2 rounded-full ${RISK_CFG[r].bar}`} style={{ width: `${pct}%` }} /></div>
                        </div>
                      );
                    })}
                    {stats.evaluated === 0 && <p className="text-sm text-gray-400">{t('supplychain.noScoredYet', "Aucun fournisseur évalué pour l'instant.")}</p>}
                  </div>
                </section>

                <section className="bg-white rounded-2xl border border-gray-200 p-6">
                  <h2 className="text-base font-bold text-gray-900 mb-4">{t('supplychain.sectionEvalStatus', "Avancement des évaluations")}</h2>
                  <div className="space-y-3">
                    {STATUS_ORDER.map(st => {
                      const count = suppliers.filter(s => s.status === st).length;
                      const pct = Math.round((count / suppliers.length) * 100);
                      return (
                        <div key={st} className="flex items-center gap-3">
                          <div className="w-28 flex-shrink-0"><StatusBadge status={st} /></div>
                          <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-2.5 bg-blue-500 rounded-full" style={{ width: `${pct}%` }} /></div>
                          <span className="text-sm text-gray-600 w-6 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>

              <section className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-base font-bold text-gray-900 mb-3">{t('supplychain.sectionPriority', 'À traiter en priorité')}</h2>
                <div className="divide-y divide-gray-100">
                  {[...stats.atRisk].sort((a, b) => RISK_ORDER.indexOf(a.risk) - RISK_ORDER.indexOf(b.risk)).map(s => (
                    <button key={s.id} onClick={() => setSelectedId(s.id)} className="w-full flex items-center gap-4 py-3 px-2 text-left hover:bg-gray-50 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-gray-900 truncate">{s.name}</div>
                        <div className="text-xs text-gray-500">{[s.country, s.category].filter(Boolean).join(' · ')}</div>
                      </div>
                      <RiskBadge supplier={s} />
                      <ChevronRight className="h-4 w-4 text-gray-300" />
                    </button>
                  ))}
                  {stats.atRisk.length === 0 && (
                    <p className="py-4 text-sm text-gray-500">
                      {stats.notEvaluated > 0
                        ? t('supplychain.priorityNone', "Aucun fournisseur évalué à risque élevé ou critique. {{n}} fournisseur(s) restent à évaluer.", { n: stats.notEvaluated })
                        : t('supplychain.priorityNoneAll', 'Aucun fournisseur à risque élevé ou critique.')}
                    </p>
                  )}
                </div>
              </section>
            </div>
          )}

          {/* ── Fournisseurs ── */}
          {tab === 'suppliers' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3 items-center bg-white p-4 rounded-2xl border border-gray-200">
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)} aria-label={t('supplychain.searchSupplier', 'Rechercher un fournisseur')} placeholder={t('supplychain.searchSupplier', 'Rechercher un fournisseur…')}
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <select value={riskFilter} onChange={e => setRiskFilter(e.target.value as any)} aria-label={t('supplychain.colRisk', 'Risque')} className="px-3 py-2 border border-gray-200 rounded-xl text-sm">
                  <option value="Tous">{t('supplychain.allRisks', 'Tous les risques')}</option>
                  {RISK_ORDER.map(r => <option key={r}>{r}</option>)}
                </select>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} aria-label={t('supplychain.colStatus', 'Statut')} className="px-3 py-2 border border-gray-200 rounded-xl text-sm">
                  <option value="Tous">{t('supplychain.allStatuses', 'Tous les statuts')}</option>
                  {STATUS_ORDER.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>

              {checked.size > 0 && (
                <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm">
                  <span className="font-semibold text-blue-900">{t('supplychain.selectedCount', '{{n}} sélectionné(s)', { n: checked.size })}</span>
                  <button onClick={() => sendQuestionnaires([...checked])} disabled={busy} className="ml-auto flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-semibold">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{t('supplychain.questionnaireSendButton', 'Envoyer le questionnaire')}
                  </button>
                  <button onClick={() => setChecked(new Set())} aria-label={t('common.cancel', 'Annuler')} className="p-1 text-blue-700"><X className="h-4 w-4" /></button>
                </div>
              )}

              <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
                <table className="w-full min-w-[720px]">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      <th className="pl-5 py-3 w-8"><input type="checkbox" aria-label={t('supplychain.selectAll', 'Tout sélectionner')} checked={allChecked} onChange={() => setChecked(allChecked ? new Set() : new Set(filtered.map(s => s.id)))} /></th>
                      <th className="px-4 py-3 text-left">{t('supplychain.colSupplier', 'Fournisseur')}</th>
                      <th className="px-4 py-3 text-left">{t('supplychain.colCategory', 'Catégorie')}</th>
                      <th className="px-4 py-3 text-right">{t('supplychain.colPurchases', 'Achats')}</th>
                      <th className="px-4 py-3 text-center">{t('supplychain.colRisk', 'Risque')}</th>
                      <th className="px-4 py-3 text-center">{t('supplychain.colStatus', 'Statut')}</th>
                      <th className="px-4 py-3 text-center">{t('supplychain.colEsgScore', 'Score')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map(s => (
                      <tr key={s.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedId(s.id)}>
                        <td className="pl-5 py-3" onClick={e => e.stopPropagation()}>
                          <input type="checkbox" aria-label={s.name} checked={checked.has(s.id)} onChange={() => toggle(s.id)} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-sm text-gray-900">{s.name}</div>
                          <div className="text-xs text-gray-400">{s.country}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{s.category}</td>
                        <td className="px-4 py-3 text-right text-sm text-gray-700">{s.spend > 0 ? `${s.spend.toLocaleString('fr-FR')} k€` : '—'}</td>
                        <td className="px-4 py-3 text-center"><RiskBadge supplier={s} /></td>
                        <td className="px-4 py-3 text-center"><StatusBadge status={s.status} /></td>
                        <td className="px-4 py-3 text-center text-sm font-bold text-gray-800">{hasScore(s) ? s.globalScore : '—'}</td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-400">{t('supplychain.noResults', 'Aucun fournisseur ne correspond à ces filtres.')}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Vigilance ── */}
          {tab === 'vigilance' && (
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-5 bg-blue-50 border border-blue-200 rounded-2xl">
                <Scale className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-bold text-blue-900 mb-1">{t('supplychain.vigilanceLawTitle')}</h2>
                  <p className="text-sm text-blue-700">{t('supplychain.vigilanceLawDesc')}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: t('supplychain.vigilanceKpiCovered', 'Fournisseurs évalués'), val: `${stats.evaluated} / ${stats.total}` },
                  { label: t('supplychain.vigilanceKpiRisks', 'Risque élevé ou critique'), val: String(stats.atRisk.length) },
                  { label: t('supplychain.vigilanceKpiPending', 'Questionnaires en attente'), val: String(stats.pending) },
                  { label: t('supplychain.vigilanceKpiSpendCovered', 'Achats couverts par une évaluation'), val: stats.totalSpend > 0 ? `${Math.round((stats.evaluatedSpend / stats.totalSpend) * 100)} %` : '—' },
                ].map(k => (
                  <div key={k.label} className="bg-white rounded-2xl border border-gray-200 p-5">
                    <div className="text-2xl font-extrabold text-gray-900">{k.val}</div>
                    <div className="text-sm text-gray-600 mt-2">{k.label}</div>
                  </div>
                ))}
              </div>

              <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-base font-bold text-gray-900">{t('supplychain.actionPlanTitle', 'Fournisseurs à suivre')}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{t('supplychain.actionPlanHint', 'Mesures recommandées à documenter dans votre plan de vigilance. Elles ne sont pas suivies automatiquement.')}</p>
                </div>
                <div className="divide-y divide-gray-100">
                  {stats.atRisk.map(s => {
                    const c = RISK_CFG[s.risk];
                    const measures = [
                      s.risk === 'Critique' ? t('supplychain.actionCritiqueAudit') : t('supplychain.actionHighQuestionnaire'),
                      t('supplychain.actionContractClauses'),
                      s.risk === 'Critique' ? t('supplychain.actionCritiqueImprovement') : t('supplychain.actionHighMonitoring'),
                      t('supplychain.actionDocument'),
                    ];
                    return (
                      <div key={s.id} className="p-6 flex gap-4 flex-wrap md:flex-nowrap">
                        <div className="flex-1 min-w-0 space-y-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="font-bold text-gray-900">{s.name}</h3>
                            <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${c.bg} ${c.color} ${c.border}`}>{s.risk}</span>
                            <span className="text-xs text-gray-400">{[s.country, s.category].filter(Boolean).join(' · ')}</span>
                          </div>
                          <ol className="space-y-1.5 list-decimal list-inside text-sm text-gray-700">
                            {measures.map((m, i) => <li key={i}>{m}</li>)}
                          </ol>
                        </div>
                        <button onClick={() => setSelectedId(s.id)} className="self-start px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold">{t('supplychain.btnSheet', 'Ouvrir la fiche')}</button>
                      </div>
                    );
                  })}
                  {stats.atRisk.length === 0 && <p className="py-8 px-6 text-sm text-gray-500">{t('supplychain.noCriticalSuppliers', 'Aucun fournisseur évalué à risque élevé ou critique.')}</p>}
                </div>
              </section>

              <div className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600">
                <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />{t('supplychain.vigilanceDisclaimer')}
              </div>
            </div>
          )}
        </>
      )}

      {form && (
        <SupplierFormModal
          supplier={form.supplier}
          onClose={() => setForm(null)}
          onSaved={raw => { const s = upsert(raw); setForm(null); notify('ok', form.supplier ? t('supplychain.toastUpdated', 'Fournisseur mis à jour') : t('supplychain.toastAdded', 'Fournisseur ajouté')); if (!form.supplier) setSelectedId(s.id); }}
        />
      )}

      {selected && (
        <SupplierDrawer
          supplier={selected}
          busy={busy}
          onClose={() => setSelectedId(null)}
          onSend={s => sendQuestionnaires([s.id])}
          onEdit={s => setForm({ supplier: s })}
          onDelete={deleteSupplier}
          onAssessed={raw => { upsert(raw); notify('ok', t('supplychain.toastAssessed', 'Évaluation enregistrée')); }}
        />
      )}

      {toast && createPortal(
        <div role="status" className={`fixed bottom-6 right-6 z-[110] max-w-sm flex items-start gap-3 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold text-white ${toast.kind === 'ok' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.kind === 'ok' ? <CheckCircle className="h-5 w-5 flex-shrink-0" /> : <AlertTriangle className="h-5 w-5 flex-shrink-0" />}
          <span>{toast.text}</span>
        </div>,
        document.body,
      )}
    </div>
  );
}
