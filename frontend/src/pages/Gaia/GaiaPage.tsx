import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  Sparkles, UploadCloud, FileText, Trash2, Send, AlertTriangle, CheckCircle2, Loader2, ShieldAlert,
} from 'lucide-react';
import { Badge, Button, ConfirmDialog } from '@/components/common';
import {
  askGaia, deleteAnalysis, gaiaErrorMessage, getAnalysis, listAnalyses, uploadReport,
  type GaiaAnalysisDetail, type GaiaAnalysisSummary, type GaiaEsrs,
} from '@/services/gaiaService';
import {
  COVERAGE_LABEL, coverageCounts, coverageSentence, indicatorValue, isUnpublished, pageLabel, shortStandard, tabsFor, unpublishedCount,
  type TabKey,
} from './gaiaHelpers';
import { GAIA_EXAMPLE, GAIA_EXAMPLE_ID } from './gaiaExample';

const card = 'rounded-xl border border-gray-200 bg-white';
const CELL: Record<GaiaEsrs['coverage'], { bg: string; fg: string }> = {
  complete: { bg: '#047857', fg: '#ffffff' },
  partial: { bg: '#fbbf24', fg: '#1f2937' },
  absent: { bg: '#e2e8f0', fg: '#1f2937' },
};
const COVERAGE_TONE: Record<GaiaEsrs['coverage'], 'success' | 'warning' | 'neutral'> = { complete: 'success', partial: 'warning', absent: 'neutral' };
const PRIORITY: Record<string, 'danger' | 'warning' | 'neutral'> = { haute: 'danger', moyenne: 'warning', basse: 'neutral' };
const SUGGESTIONS = [
  'Quelles sont les émissions de gaz à effet de serre publiées ?',
  'Quels objectifs chiffrés l\'entreprise annonce-t-elle ?',
  'Quelles informations CSRD manquent le plus ?',
];

export default function GaiaPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<GaiaAnalysisSummary[]>([]);
  const [selected, setSelected] = useState<GaiaAnalysisDetail | null>(null);
  const [tab, setTab] = useState<TabKey>('summary');
  const [loadingList, setLoadingList] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [chat, setChat] = useState<{ q: string; a: string }[]>([]);
  const [toDelete, setToDelete] = useState<GaiaAnalysisSummary | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLElement>(null);

  const refreshList = useCallback(async () => {
    try { setItems(await listAnalyses()); } catch { /* la liste reste telle quelle */ } finally { setLoadingList(false); }
  }, []);

  const open = useCallback(async (id: string) => {
    try {
      setSelected(await getAnalysis(id)); setChat([]); setTab('summary');
      // Sur mobile, le résultat est sous le dépôt et l'historique : on l'amène à l'écran.
      if (window.matchMedia?.('(max-width: 1023px)').matches) requestAnimationFrame(() => resultRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }));
    } catch { toast.error(t('gaia.loadError', 'Impossible de charger cette analyse.')); }
  }, [t]);

  useEffect(() => { refreshList(); }, [refreshList]);

  // Tant qu'une analyse est en cours, on interroge le serveur toutes les 3 secondes.
  useEffect(() => {
    if (!selected || selected.status !== 'processing') return;
    const timer = setInterval(async () => {
      try {
        const fresh = await getAnalysis(selected.id);
        if (fresh.status !== 'processing') { setSelected(fresh); refreshList(); }
      } catch { /* on réessaie au prochain tour */ }
    }, 3000);
    return () => clearInterval(timer);
  }, [selected, refreshList]);

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const created = await uploadReport(file);
      await refreshList();
      await open(created.id);
    } catch (e) {
      toast.error(gaiaErrorMessage(e, t('gaia.uploadError', 'L\'envoi a échoué. Réessayez.')));
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const onDrop = (e: DragEvent) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files?.[0]); };

  const ask = async (q: string) => {
    if (!selected || q.trim().length < 3) return;
    setAsking(true);
    try {
      const a = await askGaia(selected.id, q.trim());
      setChat(c => [...c, { q: q.trim(), a }]);
      setQuestion('');
    } catch (e) {
      toast.error(gaiaErrorMessage(e, t('gaia.askError', 'Gaïa n\'a pas pu répondre.')));
    } finally { setAsking(false); }
  };

  const openExample = () => { setSelected(GAIA_EXAMPLE); setChat([]); setTab('summary'); };
  const isExample = selected?.id === GAIA_EXAMPLE_ID;

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteAnalysis(toDelete.id);
      if (selected?.id === toDelete.id) setSelected(null);
      refreshList();
    } catch { toast.error(t('gaia.deleteError', 'Suppression impossible.')); }
    setToDelete(null);
  };

  const r = selected?.result;
  const tabs = r ? tabsFor(r) : [];
  const activeTab: TabKey = tabs.some(x => x.key === tab) ? tab : 'summary';

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex items-start gap-3">
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-violet-50 text-violet-700" aria-hidden="true"><Sparkles className="h-5 w-5" /></span>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">Gaïa</h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-600">
            {t('gaia.subtitleNew', 'Déposez le rapport d\'une entreprise (RSE, DPEF, CSRD) : synthèse, chiffres avec leur page d\'origine, normes ESRS couvertes et ce qui manque.')}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
        {/* ── Colonne gauche : dépôt + historique ── */}
        <aside className="space-y-4">
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`rounded-xl border-2 border-dashed p-5 text-center transition ${dragging ? 'border-emerald-700 bg-emerald-50' : 'border-gray-300 bg-white'}`}
          >
            <UploadCloud className="mx-auto h-7 w-7 text-emerald-700" aria-hidden="true" />
            <p className="mt-2 text-[15px] font-semibold text-gray-900">{t('gaia.dropNew', 'Déposer un rapport')}</p>
            <p className="mt-1 text-[13px] text-gray-600">{t('gaia.formats', 'PDF, Word ou texte · 20 Mo maximum')}</p>
            <input ref={fileInput} type="file" accept=".pdf,.docx,.txt,.md" className="sr-only" id="gaia-file" aria-label="Fichier du rapport" onChange={e => handleFile(e.target.files?.[0])} />
            <div className="mt-3">
              <Button loading={uploading} onClick={() => fileInput.current?.click()}>{t('gaia.choose', 'Choisir un fichier')}</Button>
            </div>
            <button type="button" onClick={openExample} className="mt-3 text-sm font-semibold text-emerald-800 hover:underline">{t('gaia.seeExample', 'Voir un exemple d\'analyse')}</button>
          </div>

          <p className="text-xs leading-relaxed text-gray-600">
            {t('gaia.privacyShort', 'Le texte est envoyé à OpenAI pour analyse ; le fichier n\'est pas conservé. Ne déposez pas de document que vous ne pouvez pas partager avec un prestataire d\'IA.')}
          </p>

          {(loadingList || items.length > 0) && (
            <div className={`${card} p-4`}>
              <h3 className="text-[15px] font-semibold text-gray-900">{t('gaia.historyNew', 'Analyses récentes')}</h3>
              {loadingList ? (
                <div className="mt-3 space-y-2" role="status" aria-label="Chargement">
                  {[0, 1].map(i => <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-200" />)}
                </div>
              ) : (
                <ul className="mt-2 divide-y divide-gray-100">
                  {items.map(a => (
                    <li key={a.id} className="group flex items-center">
                      <button type="button" onClick={() => open(a.id)} aria-current={selected?.id === a.id ? 'true' : undefined}
                        className={`-mx-2 flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2.5 text-left transition hover:bg-gray-50 ${selected?.id === a.id ? 'bg-emerald-50' : ''}`}>
                        <FileText className="h-4 w-4 flex-none text-gray-500" aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-gray-900">{a.company || a.filename}</span>
                          <span className="block truncate text-xs text-gray-600">{a.company ? a.filename : ''}{a.reporting_year ? `${a.company ? ' · ' : ''}${a.reporting_year}` : ''}</span>
                        </span>
                        {a.status === 'processing' && <Loader2 className="h-4 w-4 animate-spin text-emerald-700" aria-label="en cours" />}
                        {a.status === 'failed' && <Badge tone="danger">Échec</Badge>}
                        {a.status === 'done' && a.maturity_score != null && <Badge tone="success">{a.maturity_score}</Badge>}
                      </button>
                      <button type="button" aria-label={`${t('gaia.delete', 'Supprimer')} ${a.company || a.filename}`} onClick={() => setToDelete(a)}
                        className="ml-1 rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </aside>

        {/* ── Colonne droite : résultat ── */}
        <section ref={resultRef} className="min-w-0 scroll-mt-4 space-y-4" aria-live="polite">
          {!selected && (
            <div className={`${card} flex flex-col items-center px-6 py-14 text-center`}>
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-50 text-violet-700" aria-hidden="true"><Sparkles className="h-6 w-6" /></span>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">{t('gaia.emptyTitleNew', 'Analysez un rapport en 30 secondes')}</h3>
              <p className="mt-1 max-w-md text-sm text-gray-600">
                {t('gaia.emptyDescNew', 'Déposez celui d\'un client, d\'un fournisseur ou d\'un concurrent. Gaïa relève les chiffres publiés, avec leur page, et repère ce que le rapport ne dit pas.')}
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <Button onClick={() => fileInput.current?.click()}>{t('gaia.choose', 'Choisir un fichier')}</Button>
                <Button variant="secondary" onClick={openExample}>{t('gaia.seeExample', 'Voir un exemple d\'analyse')}</Button>
              </div>
            </div>
          )}

          {selected?.status === 'processing' && (
            <div className={`${card} flex items-center gap-4 p-6`} role="status">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-700" aria-hidden="true" />
              <div>
                <p className="font-semibold text-gray-900">{t('gaia.reading', 'Gaïa lit votre rapport…')}</p>
                <p className="text-sm text-gray-600">{t('gaia.readingHint', 'Comptez 20 à 60 secondes. Vous pouvez rester sur cette page.')} ({selected.filename})</p>
              </div>
            </div>
          )}

          {selected?.status === 'failed' && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5" role="alert">
              <p className="flex items-start gap-3 font-semibold text-red-900"><AlertTriangle className="mt-0.5 h-5 w-5 flex-none" aria-hidden="true" />{t('gaia.failed', 'L\'analyse n\'a pas abouti')}</p>
              {selected.error && <p className="mt-1 text-sm text-red-800">{selected.error}</p>}
              <p className="mt-2 text-sm text-red-800">Si le PDF est un scan (une image sans texte), déposez un PDF contenant du texte, ou un document Word.</p>
              <Button className="mt-3" size="sm" onClick={() => fileInput.current?.click()}>Choisir un autre fichier</Button>
            </div>
          )}

          {selected?.status === 'done' && r && (
            <>
              {isExample && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900" role="note">
                  <p><b>{t('gaia.exampleTitle', 'Exemple fictif.')}</b> {t('gaia.exampleBody', 'Cette entreprise et ces chiffres sont inventés pour montrer le rendu. Gaïa produit le même type de résultat sur votre propre rapport.')}</p>
                  <Button size="sm" onClick={() => fileInput.current?.click()}>{t('gaia.tryMine', 'Analyser mon rapport')}</Button>
                </div>
              )}
              <div className={`${card} p-5`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">{r.reporting_year ? `${t('gaia.report', 'Rapport')} ${r.reporting_year}` : t('gaia.report', 'Rapport')}</p>
                    <h3 className="mt-1 text-xl font-semibold text-gray-900">{r.company || selected.filename}</h3>
                    <p className="text-sm text-gray-600">{[r.report_title, selected.page_count ? `${selected.page_count} pages` : null].filter(Boolean).join(' · ')}</p>
                  </div>
                  <div className="text-right">
                    <Badge tone="info">Généré par IA · à vérifier</Badge>
                    <p className="mt-2 text-xs text-gray-600">{t('gaia.maturity', 'Maturité ESG documentée')}</p>
                    <p className="text-3xl font-bold leading-none tabular-nums text-gray-900">{r.maturity_score}<span className="text-base font-normal text-gray-600"> / 100</span></p>
                  </div>
                </div>

                <div className="mt-4 flex gap-1 overflow-x-auto border-b border-gray-200" role="tablist" aria-label="Sections de l'analyse">
                  {tabs.map(x => (
                    <button key={x.key} type="button" role="tab" id={`gaia-tab-${x.key}`} aria-selected={activeTab === x.key} aria-controls={`gaia-panel-${x.key}`} onClick={() => setTab(x.key)}
                      className={`-mb-px min-h-[44px] whitespace-nowrap border-b-2 px-3 text-sm font-semibold ${activeTab === x.key ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>
                      {x.label}{x.count != null && <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700">{x.count}</span>}
                    </button>
                  ))}
                </div>

                <div role="tabpanel" id={`gaia-panel-${activeTab}`} aria-labelledby={`gaia-tab-${activeTab}`} className="pt-5">
                  {activeTab === 'summary' && (
                    <div className="space-y-5">
                      <div>
                        <p className="text-[15px] leading-relaxed text-gray-800">{r.summary}</p>
                        {r.maturity_comment && <p className="mt-2 text-sm text-gray-600">{r.maturity_comment}</p>}
                      </div>
                      {(r.strengths.length > 0 || r.gaps.length > 0) && (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          {r.strengths.length > 0 && (
                            <div className="rounded-lg bg-gray-50 p-4">
                              <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900"><CheckCircle2 className="h-4 w-4 text-emerald-700" aria-hidden="true" />{t('gaia.strengths', 'Points forts')}</h4>
                              <ul className="mt-2 space-y-2 text-sm text-gray-800">{r.strengths.map((s, k) => <li key={k} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-emerald-700" aria-hidden="true" />{s}</li>)}</ul>
                            </div>
                          )}
                          {r.gaps.length > 0 && (
                            <div className="rounded-lg bg-gray-50 p-4">
                              <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900"><AlertTriangle className="h-4 w-4 text-amber-700" aria-hidden="true" />{t('gaia.gaps', 'Informations manquantes')}</h4>
                              <ul className="mt-2 space-y-2 text-sm text-gray-800">{r.gaps.map((s, k) => <li key={k} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-amber-600" aria-hidden="true" />{s}</li>)}</ul>
                            </div>
                          )}
                        </div>
                      )}
                      {r.recommendations.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900">{t('gaia.reco', 'Recommandations')}</h4>
                          <ul className="mt-1 divide-y divide-gray-100">
                            {r.recommendations.map((x, k) => (
                              <li key={k} className="flex items-start gap-3 py-3 text-sm text-gray-800"><Badge tone={PRIORITY[x.priority] ?? 'neutral'}>{x.priority}</Badge><span className="flex-1">{x.action}</span></li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'figures' && (
                    <div>
                      <p className="mb-3 text-[13px] text-gray-600">
                        Chaque chiffre renvoie à la page du document.
                        {unpublishedCount(r.indicators) > 0 && ` ${unpublishedCount(r.indicators)} indicateur(s) ne sont pas chiffrés dans ce rapport.`}
                      </p>
                      <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="w-full text-sm">
                          <thead><tr className="bg-gray-50 text-left text-xs font-semibold text-gray-600">
                            <th scope="col" className="px-4 py-2.5">Indicateur</th><th scope="col" className="px-3 py-2.5">Valeur</th><th scope="col" className="px-3 py-2.5">Année</th><th scope="col" className="px-4 py-2.5 text-right">Source</th>
                          </tr></thead>
                          <tbody className="divide-y divide-gray-100">
                            {r.indicators.map((i, k) => (
                              <tr key={k}>
                                <td className="px-4 py-3 font-medium text-gray-900">{i.name}</td>
                                <td className="px-3 py-3 tabular-nums">
                                  {isUnpublished(i) ? <Badge tone="warning">Non publié</Badge> : <span className="font-semibold text-gray-900">{indicatorValue(i)}</span>}
                                </td>
                                <td className="px-3 py-3 text-gray-700">{i.year ?? '—'}</td>
                                <td className="px-4 py-3 text-right text-gray-700">{pageLabel(i.page)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {activeTab === 'esrs' && (() => {
                    const c = coverageCounts(r.esrs_coverage);
                    return (
                      <div>
                        <p className="mb-3 text-[13px] text-gray-600">{coverageSentence(c, r.esrs_coverage.length)}</p>
                        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5" aria-label="Couverture par norme">
                          {r.esrs_coverage.map(e => (
                            <li key={e.standard} title={`${e.label} : ${COVERAGE_LABEL[e.coverage] ?? e.coverage}`}
                              className="flex h-14 flex-col items-center justify-center rounded-lg text-xs font-bold" style={{ background: (CELL[e.coverage] ?? CELL.absent).bg, color: (CELL[e.coverage] ?? CELL.absent).fg }}>
                              <span>{shortStandard(e.standard)}</span><span className="font-medium">{e.score} %</span>
                            </li>
                          ))}
                        </ul>
                        <div className="mt-2 flex flex-wrap gap-x-4 text-xs text-gray-600">
                          <span><b style={{ color: '#047857' }} aria-hidden="true">■</b> complet</span><span><b style={{ color: '#d97706' }} aria-hidden="true">■</b> partiel</span><span><b style={{ color: '#94a3b8' }} aria-hidden="true">■</b> absent</span>
                        </div>
                        <ul className="mt-4 divide-y divide-gray-100">
                          {r.esrs_coverage.map(e => (
                            <li key={e.standard} className="py-3">
                              <div className="flex items-center justify-between gap-2 text-sm">
                                <span className="min-w-0 truncate text-gray-800"><b className="text-gray-900">{shortStandard(e.standard)}</b>{e.label ? ` · ${e.label}` : ''}</span>
                                <Badge tone={COVERAGE_TONE[e.coverage] ?? 'neutral'}>{COVERAGE_LABEL[e.coverage] ?? e.coverage}</Badge>
                              </div>
                              {e.evidence && <p className="mt-1 text-[13px] text-gray-600">{e.evidence}</p>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })()}

                  {activeTab === 'gaps' && (
                    <div className="space-y-5">
                      {r.gaps.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900">{t('gaia.gaps', 'Informations manquantes')}</h4>
                          <ul className="mt-2 space-y-2 text-sm text-gray-800">{r.gaps.map((s, k) => <li key={k} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-amber-600" aria-hidden="true" />{s}</li>)}</ul>
                          <Link to="/app/data-entry" className="mt-3 inline-block text-sm font-semibold text-emerald-800 hover:underline">Renseigner ces données dans ma collecte</Link>
                        </div>
                      )}
                      {r.flags.length > 0 && (
                        <div>
                          <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900"><ShieldAlert className="h-4 w-4 text-rose-700" aria-hidden="true" />{t('gaia.flags', 'Points de vigilance')}</h4>
                          <p className="mt-1 text-xs text-gray-600">{t('gaia.flagsHint', 'Affirmations difficiles à vérifier d\'après le texte. À confirmer, ce ne sont pas des accusations.')}</p>
                          <ul className="mt-3 space-y-3 text-sm">
                            {r.flags.map((f, k) => (
                              <li key={k} className="rounded-lg bg-gray-50 p-3">
                                <p className="font-semibold text-gray-900">« {f.claim} »{f.page ? <span className="ml-2 text-xs font-normal text-gray-600">p. {f.page}</span> : null}</p>
                                {f.why && <p className="mt-1 text-gray-700">{f.why}</p>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'ask' && isExample && (
                    <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-700">{t('gaia.askExample', 'Les questions sont disponibles sur vos propres rapports : Gaïa répond à partir du texte que vous avez déposé.')}</p>
                  )}
                  {activeTab === 'ask' && !isExample && (
                    <div>
                      {chat.length === 0 && (
                        <div className="flex flex-wrap gap-2">
                          {SUGGESTIONS.map(s => (
                            <button key={s} type="button" disabled={asking} onClick={() => ask(s)} className="min-h-[36px] rounded-full border border-gray-300 px-3 py-1.5 text-[13px] text-gray-700 transition hover:border-emerald-700 hover:text-emerald-800">{s}</button>
                          ))}
                        </div>
                      )}
                      <ul className="mt-4 space-y-4">
                        {chat.map((m, k) => (
                          <li key={k} className="space-y-2 text-sm">
                            <p className="ml-auto w-fit max-w-[90%] rounded-2xl rounded-tr-sm bg-gray-900 px-4 py-2 text-white">{m.q}</p>
                            <p className="max-w-[95%] whitespace-pre-wrap rounded-2xl rounded-tl-sm bg-gray-100 px-4 py-3 text-gray-900">{m.a}</p>
                          </li>
                        ))}
                        {asking && <li className="flex items-center gap-2 text-sm text-gray-600"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{t('gaia.thinking', 'Gaïa réfléchit…')}</li>}
                      </ul>
                      <form className="mt-4 flex gap-2" onSubmit={e => { e.preventDefault(); ask(question); }}>
                        <input value={question} onChange={e => setQuestion(e.target.value)} maxLength={1000} placeholder={t('gaia.placeholder', 'Ex. Quel est le plan de réduction des émissions ?')} aria-label={t('gaia.askTitle', 'Posez une question à Gaïa')}
                          className="h-11 min-w-0 flex-1 rounded-lg border border-gray-300 px-4 text-sm focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
                        <Button type="submit" icon={<Send className="h-4 w-4" />} loading={asking} disabled={question.trim().length < 3}>{t('gaia.send', 'Envoyer')}</Button>
                      </form>
                      <p className="mt-3 text-xs text-gray-600">{t('gaia.disclaimer', 'Gaïa peut se tromper : vérifiez les chiffres importants dans le rapport d\'origine.')}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {toDelete && (
        <ConfirmDialog isOpen title={t('gaia.confirmDeleteTitle', 'Supprimer cette analyse ?')}
          message={<><span className="font-semibold text-gray-800">« {toDelete.company || toDelete.filename} »</span> sera définitivement supprimée.</>}
          confirmLabel="Supprimer" onConfirm={confirmDelete} onClose={() => setToDelete(null)} />
      )}
    </div>
  );
}
