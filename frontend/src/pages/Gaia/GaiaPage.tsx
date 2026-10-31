import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  Sparkles, UploadCloud, FileText, Trash2, Send, AlertTriangle, CheckCircle2, Loader2, ShieldAlert, Info,
} from 'lucide-react';
import { Badge, Button, EmptyState } from '@/components/common';
import {
  askGaia, deleteAnalysis, gaiaErrorMessage, getAnalysis, listAnalyses, uploadReport,
  type GaiaAnalysisDetail, type GaiaAnalysisSummary, type GaiaEsrs,
} from '@/services/gaiaService';

const card = 'rounded-2xl border border-gray-200 bg-white shadow-kpi';
const COVERAGE: Record<GaiaEsrs['coverage'], { label: string; bar: string; tone: 'success' | 'warning' | 'danger' }> = {
  complete: { label: 'Complet', bar: '#16a34a', tone: 'success' },
  partial: { label: 'Partiel', bar: '#d97706', tone: 'warning' },
  absent: { label: 'Absent', bar: '#dc2626', tone: 'danger' },
};
const PRIORITY: Record<string, 'danger' | 'warning' | 'neutral'> = { haute: 'danger', moyenne: 'warning', basse: 'neutral' };
const SUGGESTIONS = [
  'Quelles sont les émissions de gaz à effet de serre publiées ?',
  'Quels objectifs chiffrés l\'entreprise annonce-t-elle ?',
  'Quelles informations CSRD manquent le plus ?',
];

function GaiaMark({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'h-12 w-12 rounded-2xl' : 'h-9 w-9 rounded-xl';
  return (
    <span className={`flex ${cls} flex-none items-center justify-center bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-md shadow-emerald-600/25`} aria-hidden="true">
      <Sparkles className={size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'} />
    </span>
  );
}

export default function GaiaPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<GaiaAnalysisSummary[]>([]);
  const [selected, setSelected] = useState<GaiaAnalysisDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [chat, setChat] = useState<{ q: string; a: string }[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  const refreshList = useCallback(async () => {
    try { setItems(await listAnalyses()); } catch { /* la liste reste telle quelle */ } finally { setLoadingList(false); }
  }, []);

  const open = useCallback(async (id: string) => {
    try { setSelected(await getAnalysis(id)); setChat([]); } catch { toast.error(t('gaia.loadError', 'Impossible de charger cette analyse.')); }
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

  const remove = async (id: string) => {
    if (!window.confirm(t('gaia.confirmDelete', 'Supprimer cette analyse ?'))) return;
    try {
      await deleteAnalysis(id);
      if (selected?.id === id) setSelected(null);
      refreshList();
    } catch { toast.error(t('gaia.deleteError', 'Suppression impossible.')); }
  };

  const r = selected?.result;

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex items-start gap-4">
        <GaiaMark size="lg" />
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">Gaïa</h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            {t('gaia.subtitle', 'Votre analyste ESG. Déposez le rapport d\'une entreprise (RSE, DPEF, CSRD) : Gaïa en résume les points clés, repère les chiffres publiés, mesure la couverture des normes ESRS et vous dit ce qui manque.')}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* ── Colonne gauche : dépôt + historique ── */}
        <aside className="space-y-5 lg:col-span-4">
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`${card} border-dashed p-6 text-center transition ${dragging ? 'border-emerald-500 bg-emerald-50/60' : ''}`}
          >
            <UploadCloud className="mx-auto h-8 w-8 text-emerald-600" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-gray-900">{t('gaia.drop', 'Glissez un rapport ici')}</p>
            <p className="mt-1 text-xs text-gray-500">{t('gaia.formats', 'PDF, Word ou texte · 20 Mo maximum')}</p>
            <input ref={fileInput} type="file" accept=".pdf,.docx,.txt,.md" className="sr-only" id="gaia-file" onChange={e => handleFile(e.target.files?.[0])} />
            <div className="mt-4">
              <Button loading={uploading} onClick={() => fileInput.current?.click()}>{t('gaia.choose', 'Choisir un fichier')}</Button>
            </div>
          </div>

          <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 ring-1 ring-amber-200">
            <Info className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
            {t('gaia.privacy', 'Le texte du document est envoyé à OpenAI pour être analysé. Ne déposez pas de document confidentiel que vous ne pouvez pas partager avec un prestataire d\'IA. Le fichier lui-même n\'est pas conservé.')}
          </p>

          <div className={card}>
            <h3 className="px-5 pt-5 text-sm font-semibold text-gray-900">{t('gaia.history', 'Analyses précédentes')}</h3>
            {loadingList ? (
              <p className="p-5 text-sm text-gray-400">…</p>
            ) : items.length === 0 ? (
              <p className="p-5 text-sm text-gray-500">{t('gaia.none', 'Aucune analyse pour le moment.')}</p>
            ) : (
              <ul className="mt-2 divide-y divide-gray-100 dark:divide-gray-800">
                {items.map(a => (
                  <li key={a.id} className="group flex items-center">
                    <button type="button" onClick={() => open(a.id)} className={`flex min-w-0 flex-1 items-center gap-3 px-5 py-3 text-left transition hover:bg-gray-50 ${selected?.id === a.id ? 'bg-emerald-50/50' : ''}`}>
                      <FileText className="h-4 w-4 flex-none text-gray-400" aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-gray-900">{a.company || a.filename}</span>
                        <span className="block truncate text-xs text-gray-400">{a.company ? a.filename : ''}{a.reporting_year ? ` · ${a.reporting_year}` : ''}</span>
                      </span>
                      {a.status === 'processing' && <Loader2 className="h-4 w-4 animate-spin text-emerald-600" aria-label="en cours" />}
                      {a.status === 'failed' && <Badge tone="danger">Échec</Badge>}
                      {a.status === 'done' && a.maturity_score != null && <Badge tone="success">{a.maturity_score}</Badge>}
                    </button>
                    <button type="button" aria-label={t('gaia.delete', 'Supprimer')} onClick={() => remove(a.id)} className="px-3 py-3 text-gray-300 opacity-0 transition hover:text-red-600 focus:opacity-100 group-hover:opacity-100">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* ── Colonne droite : résultat ── */}
        <section className="space-y-5 lg:col-span-8" aria-live="polite">
          {!selected && (
            <div className={card}>
              <EmptyState icon={Sparkles} title={t('gaia.emptyTitle', 'Aucune analyse sélectionnée')} description={t('gaia.emptyDesc', 'Déposez un rapport à gauche pour que Gaïa l\'analyse, ou rouvrez une analyse précédente.')} />
            </div>
          )}

          {selected?.status === 'processing' && (
            <div className={`${card} flex items-center gap-4 p-8`}>
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" aria-hidden="true" />
              <div>
                <p className="font-medium text-gray-900">{t('gaia.reading', 'Gaïa lit votre rapport…')}</p>
                <p className="text-sm text-gray-500">{t('gaia.readingHint', 'Comptez 20 à 60 secondes. Vous pouvez rester sur cette page.')} ({selected.filename})</p>
              </div>
            </div>
          )}

          {selected?.status === 'failed' && (
            <div className={`${card} flex items-start gap-3 border-red-200 p-6`}>
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-none text-red-500" aria-hidden="true" />
              <div>
                <p className="font-medium text-gray-900">{t('gaia.failed', 'L\'analyse n\'a pas abouti')}</p>
                <p className="mt-1 text-sm text-gray-600">{selected.error}</p>
              </div>
            </div>
          )}

          {selected?.status === 'done' && r && (
            <>
              {/* Synthèse */}
              <div className={`${card} p-6`}>
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">{r.reporting_year ? `${t('gaia.report', 'Rapport')} ${r.reporting_year}` : t('gaia.report', 'Rapport')}</p>
                    <h3 className="mt-1 text-xl font-semibold text-gray-900">{r.company || selected.filename}</h3>
                    {r.report_title && <p className="text-sm text-gray-500">{r.report_title}</p>}
                  </div>
                  <div className="flex items-center gap-4 sm:text-right">
                    <div>
                      <p className="text-xs text-gray-500">{t('gaia.maturity', 'Maturité ESG documentée')}</p>
                      <p className="text-3xl font-semibold tabular-nums text-gray-900">{r.maturity_score}<span className="text-base font-normal text-gray-400"> / 100</span></p>
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-gray-700">{r.summary}</p>
                {r.maturity_comment && <p className="mt-2 text-sm text-gray-500">{r.maturity_comment}</p>}
              </div>

              {/* Couverture ESRS */}
              {r.esrs_coverage.length > 0 && (
                <div className={`${card} p-6`}>
                  <h3 className="text-base font-semibold text-gray-900">{t('gaia.esrs', 'Couverture des normes ESRS')}</h3>
                  <ul className="mt-4 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                    {r.esrs_coverage.map(e => {
                      const c = COVERAGE[e.coverage] ?? COVERAGE.absent;
                      return (
                        <li key={e.standard}>
                          <div className="flex items-center justify-between gap-2 text-sm">
                            <span className="truncate text-gray-700"><span className="font-semibold text-gray-900">{e.standard}</span>{e.label ? ` · ${e.label}` : ''}</span>
                            <Badge tone={c.tone}>{c.label}</Badge>
                          </div>
                          <div className="mt-1.5 h-1.5 rounded-full bg-gray-100"><div className="h-1.5 rounded-full" style={{ width: `${e.score}%`, background: c.bar }} /></div>
                          {e.evidence && <p className="mt-1 text-xs text-gray-500">{e.evidence}</p>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Chiffres publiés */}
              {r.indicators.length > 0 && (
                <div className={`${card} overflow-hidden`}>
                  <h3 className="p-6 pb-3 text-base font-semibold text-gray-900">{t('gaia.indicators', 'Chiffres relevés dans le rapport')}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-y border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                        <th className="px-6 py-2 font-medium">Indicateur</th><th className="px-3 py-2 font-medium">Valeur</th><th className="px-3 py-2 font-medium">Année</th><th className="px-6 py-2 text-right font-medium">Page</th>
                      </tr></thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {r.indicators.map((i, k) => (
                          <tr key={k}>
                            <td className="px-6 py-2.5 text-gray-800">{i.name}</td>
                            <td className="px-3 py-2.5 font-medium tabular-nums text-gray-900">{i.value ?? '—'} {i.unit ?? ''}</td>
                            <td className="px-3 py-2.5 text-gray-500">{i.year ?? '—'}</td>
                            <td className="px-6 py-2.5 text-right text-gray-400">{i.page ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Forces / manques */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className={`${card} p-6`}>
                  <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900"><CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />{t('gaia.strengths', 'Points forts')}</h3>
                  <ul className="mt-3 space-y-2 text-sm text-gray-700">{r.strengths.map((s, k) => <li key={k} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-emerald-500" />{s}</li>)}</ul>
                </div>
                <div className={`${card} p-6`}>
                  <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900"><AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />{t('gaia.gaps', 'Informations manquantes')}</h3>
                  <ul className="mt-3 space-y-2 text-sm text-gray-700">{r.gaps.map((s, k) => <li key={k} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-amber-500" />{s}</li>)}</ul>
                </div>
              </div>

              {/* Recommandations */}
              {r.recommendations.length > 0 && (
                <div className={`${card} p-6`}>
                  <h3 className="text-base font-semibold text-gray-900">{t('gaia.reco', 'Recommandations')}</h3>
                  <ul className="mt-3 divide-y divide-gray-100 dark:divide-gray-800">
                    {r.recommendations.map((x, k) => (
                      <li key={k} className="flex items-start gap-3 py-3 text-sm text-gray-700">
                        <Badge tone={PRIORITY[x.priority] ?? 'neutral'}>{x.priority}</Badge><span className="flex-1">{x.action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Vigilance */}
              {r.flags.length > 0 && (
                <div className={`${card} p-6`}>
                  <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900"><ShieldAlert className="h-4 w-4 text-rose-500" aria-hidden="true" />{t('gaia.flags', 'Points de vigilance')}</h3>
                  <p className="mt-1 text-xs text-gray-500">{t('gaia.flagsHint', 'Affirmations difficiles à vérifier d\'après le texte. À confirmer, ce ne sont pas des accusations.')}</p>
                  <ul className="mt-3 space-y-3 text-sm">
                    {r.flags.map((f, k) => (
                      <li key={k} className="rounded-xl bg-gray-50 p-3">
                        <p className="font-medium text-gray-800">« {f.claim} »{f.page ? <span className="ml-2 text-xs font-normal text-gray-400">p. {f.page}</span> : null}</p>
                        {f.why && <p className="mt-1 text-gray-600">{f.why}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Questions */}
              <div className={`${card} p-6`}>
                <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900"><GaiaMark />{t('gaia.askTitle', 'Posez une question à Gaïa')}</h3>
                {chat.length === 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {SUGGESTIONS.map(s => (
                      <button key={s} type="button" disabled={asking} onClick={() => ask(s)} className="rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-600 transition hover:border-emerald-300 hover:text-emerald-700">{s}</button>
                    ))}
                  </div>
                )}
                <ul className="mt-4 space-y-4">
                  {chat.map((m, k) => (
                    <li key={k} className="space-y-2 text-sm">
                      <p className="ml-auto w-fit max-w-[90%] rounded-2xl rounded-tr-sm bg-gray-900 px-4 py-2 text-white">{m.q}</p>
                      <p className="max-w-[95%] whitespace-pre-wrap rounded-2xl rounded-tl-sm bg-emerald-50 px-4 py-3 text-gray-800">{m.a}</p>
                    </li>
                  ))}
                  {asking && <li className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{t('gaia.thinking', 'Gaïa réfléchit…')}</li>}
                </ul>
                <form className="mt-4 flex gap-2" onSubmit={e => { e.preventDefault(); ask(question); }}>
                  <input value={question} onChange={e => setQuestion(e.target.value)} maxLength={1000} placeholder={t('gaia.placeholder', 'Ex. Quel est le plan de réduction des émissions ?')} aria-label={t('gaia.askTitle', 'Posez une question à Gaïa')}
                    className="min-w-0 flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                  <Button type="submit" icon={<Send className="h-4 w-4" />} loading={asking} disabled={question.trim().length < 3}>{t('gaia.send', 'Envoyer')}</Button>
                </form>
                <p className="mt-3 text-xs text-gray-400">{t('gaia.disclaimer', 'Gaïa peut se tromper : vérifiez les chiffres importants dans le rapport d\'origine.')}</p>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
