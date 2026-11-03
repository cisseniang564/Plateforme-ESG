import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  UploadCloud, Loader2, Trash2, Download, CheckCircle2, AlertCircle, Sparkles, ArrowLeft, Check, ShieldCheck,
  ChevronRight, ExternalLink, ListChecks, Lock,
} from 'lucide-react';
import { Button, ConfirmDialog } from '@/components/common';
import {
  createQuestionnaire, deleteQuestionnaire, exportQuestionnaire, getQuestionnaire, listQuestionnaires, questionnaireErrorMessage,
  saveAnswers, type QDetail, type QQuestion, type QStatus, type QSummary,
} from '@/services/questionnaireService';
import {
  confidenceLabel, countStatuses, currentStep, effectiveOf, isDirty, nextUnresolvedId, preparedPercent, sourceLink,
  type Drafts, type Step,
} from './questionnaireHelpers';
import { Q_EXAMPLE, Q_EXAMPLE_ID } from './questionnaireExample';

const card = 'rounded-xl border border-gray-200 bg-white';
const STATUS: Record<QStatus, { label: string; cls: string; dot: string }> = {
  validated: { label: 'Validé', cls: 'bg-emerald-50 text-emerald-800', dot: '#047857' },
  prefilled: { label: 'À relire', cls: 'bg-blue-50 text-blue-800', dot: '#2563eb' },
  to_complete: { label: 'À compléter', cls: 'bg-amber-50 text-amber-900', dot: '#d97706' },
};
const TONE = { ok: 'bg-emerald-50 text-emerald-800', warn: 'bg-amber-50 text-amber-900', bad: 'bg-red-50 text-red-800' } as const;
type Filter = 'all' | QStatus;
const STEPS = ['Déposé', 'Pré-remplissage', 'Relecture', 'Export'];

function Stepper({ step }: { step: Step }) {
  return (
    <ol className={`${card} relative flex items-center gap-2 overflow-x-auto px-5 py-4`} aria-label="Avancement">
      {STEPS.map((label, i) => {
        const n = (i + 1) as Step;
        const done = n < step;
        const cur = n === step;
        return (
          <li key={label} className="flex items-center gap-2" aria-current={cur ? 'step' : undefined}>
            <span className={`flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs font-bold ${
              done ? 'bg-emerald-700 text-white' : cur ? 'border-2 border-emerald-700 text-emerald-800' : 'border-2 border-gray-300 text-gray-600'}`}>
              {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : n}
            </span>
            <span className={`whitespace-nowrap text-sm font-semibold ${cur || done ? 'text-gray-900' : 'text-gray-600'}`}>{label}</span>
            <span className="sr-only">{done ? ' (terminé)' : cur ? ' (en cours)' : ' (à venir)'}</span>
            {i < STEPS.length - 1 && <span className={`mx-1 h-0.5 w-8 flex-none sm:w-16 ${done ? 'bg-emerald-700' : 'bg-gray-200'}`} aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}

export default function QuestionnairesPage() {
  const [items, setItems] = useState<QSummary[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [detail, setDetail] = useState<QDetail | null>(null);
  const [drafts, setDrafts] = useState<Drafts>({});
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showList, setShowList] = useState(false);          // mobile : liste des questions ou question en cours
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'file' | 'text'>('file');
  const [pasted, setPasted] = useState('');
  const [clientName, setClientName] = useState('');
  const [drag, setDrag] = useState(false);
  const [toDelete, setToDelete] = useState<QSummary | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setItems(await listQuestionnaires().catch(() => []));
    setLoadingList(false);
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  const load = useCallback((d: QDetail) => {
    setDetail(d);
    setDrafts(Object.fromEntries((d.questions ?? []).map(q => [q.id, { answer: q.answer ?? '', status: q.status }])));
    // on ouvre directement la première question qui demande une action
    const first = (d.questions ?? []).find(q => q.status !== 'validated') ?? (d.questions ?? [])[0];
    setSelectedId(first?.id ?? null);
    setShowList(false);
  }, []);

  const open = useCallback(async (id: string) => {
    try { load(await getQuestionnaire(id)); }
    catch (e) { toast.error(questionnaireErrorMessage(e, 'Impossible d\'ouvrir ce questionnaire.')); }
  }, [load]);

  // pendant le traitement, on interroge le serveur jusqu'à ce que le questionnaire soit prêt
  useEffect(() => {
    if (!detail || detail.status !== 'processing') return;
    const t = setInterval(async () => {
      const d = await getQuestionnaire(detail.id).catch(() => null);
      if (d && d.status !== 'processing') { clearInterval(t); load(d); void refresh(); }
    }, 3000);
    return () => clearInterval(t);
  }, [detail, load, refresh]);

  const submit = async (file?: File | null) => {
    setBusy(true);
    try {
      const created = await createQuestionnaire({ file, pastedText: file ? undefined : pasted, clientName });
      toast.success('Questionnaire reçu : lecture en cours.');
      setPasted(''); setClientName('');
      await refresh();
      await open(created.id);
    } catch (e) { toast.error(questionnaireErrorMessage(e, 'Envoi impossible. Réessayez.')); }
    finally { setBusy(false); }
  };

  const onDrop = (e: DragEvent) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) void submit(f); };

  const questions = detail?.questions ?? [];
  const counts = useMemo(() => countStatuses(questions, drafts), [questions, drafts]);
  const total = counts.total;
  const dirty = isDirty(questions, drafts);
  const visible = questions.filter(q => filter === 'all' || effectiveOf(q, drafts).status === filter);
  const selected = questions.find(q => q.id === selectedId) ?? null;

  const set = (id: string, patch: Partial<{ answer: string; status: QStatus }>) =>
    setDrafts(d => ({ ...d, [id]: { ...(d[id] ?? { answer: '', status: 'to_complete' as QStatus }), ...patch } }));

  const isExample = detail?.id === Q_EXAMPLE_ID;

  const persist = async (): Promise<boolean> => {
    if (!detail) return false;
    if (isExample) { toast('Exemple : rien n\'est enregistré.'); return false; }
    setBusy(true);
    try {
      const payload = Object.fromEntries(Object.entries(drafts).map(([id, d]) => [id, { answer: d.answer || null, status: d.status }]));
      const d = await saveAnswers(detail.id, payload);
      setDetail(d);
      setDrafts(Object.fromEntries(d.questions.map(q => [q.id, { answer: q.answer ?? '', status: q.status }])));
      toast.success('Réponses enregistrées.');
      void refresh();
      return true;
    } catch (e) { toast.error(questionnaireErrorMessage(e, 'Enregistrement impossible.')); return false; }
    finally { setBusy(false); }
  };

  // Exporter enregistre d'abord : le fichier Excel doit refléter ce que l'on voit à l'écran.
  const doExport = async () => {
    if (!detail) return;
    if (isExample) { toast('L\'export Excel est disponible avec vos propres questionnaires.'); return; }
    if (dirty && !(await persist())) return;
    await exportQuestionnaire(detail.id, detail.title).catch(() => toast.error('Export impossible.'));
  };

  const validateAndNext = (q: QQuestion) => {
    set(q.id, { status: 'validated' });
    const next = nextUnresolvedId(questions, { ...drafts, [q.id]: { ...effectiveOf(q, drafts), status: 'validated' } }, q.id);
    if (next) setSelectedId(next);
  };

  // « Tout valider » ne touche pas aux réponses à confiance faible ni à celles qui portent une alerte.
  const validateAllPrefilled = () => {
    const safe = new Set(questions.filter(q => q.confidence !== 'low' && !q.note).map(q => q.id));
    setDrafts(d => Object.fromEntries(Object.entries(d).map(([id, v]) => [id, safe.has(id) && v.status === 'prefilled' && v.answer ? { ...v, status: 'validated' as QStatus } : v])));
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    await deleteQuestionnaire(toDelete.id).catch(() => toast.error('Suppression impossible.'));
    if (detail?.id === toDelete.id) setDetail(null);
    setToDelete(null);
    void refresh();
  };

  const deleteDialog = toDelete && (
    <ConfirmDialog isOpen title="Supprimer ce questionnaire ?"
      message={<><span className="font-semibold text-gray-800">« {toDelete.title} »</span> et ses réponses seront définitivement supprimés.</>}
      confirmLabel="Supprimer" onConfirm={confirmDelete} onClose={() => setToDelete(null)} />
  );

  // ── Vue détail ──
  if (detail) {
    const step = currentStep(detail.status, counts);
    const pct = preparedPercent(counts);
    const seg = (n: number) => `${(n / (total || 1)) * 100}%`;
    const idx = selected ? questions.findIndex(q => q.id === selected.id) : -1;
    const sd = selected ? effectiveOf(selected, drafts) : null;
    const conf = selected ? confidenceLabel(selected.confidence) : null;

    return (
      <div className="space-y-5">
        <button type="button" onClick={() => { setDetail(null); void refresh(); }} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Tous les questionnaires
        </button>

        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight text-gray-900">{detail.title}</h1>
            <p className="mt-1 text-sm text-gray-600">{detail.client_name ? `Client : ${detail.client_name}` : 'Questionnaire client'}</p>
          </div>
          {detail.status === 'ready' && (
            <div className="flex flex-wrap items-center gap-2">
              {dirty && <span className="text-sm font-medium text-amber-800" role="status">Modifications non enregistrées</span>}
              <Button variant="secondary" onClick={() => void persist()} disabled={busy || !dirty}>Enregistrer</Button>
              <Button icon={<Download className="h-4 w-4" />} onClick={() => void doExport()} disabled={busy}>Exporter en Excel</Button>
            </div>
          )}
        </header>

        {isExample && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900" role="note">
            <p><b>Exemple fictif.</b> Ce client, ces questions et ces réponses sont inventés pour montrer le rendu. Vous pouvez relire et valider, mais rien n'est enregistré.</p>
            <Button size="sm" onClick={() => { setDetail(null); }}>Déposer mon questionnaire</Button>
          </div>
        )}

        <Stepper step={step} />

        {detail.status === 'processing' && (
          <div className={`${card} flex items-center gap-3 p-6 text-gray-700`} role="status">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-700" aria-hidden="true" />
            <div>
              <p className="font-semibold text-gray-900">Lecture du questionnaire et pré-remplissage à partir de vos données…</p>
              <p className="text-sm text-gray-600">Cela prend de 20 à 60 secondes. Vous pouvez quitter la page : le questionnaire restera dans votre liste.</p>
            </div>
          </div>
        )}
        {detail.status === 'failed' && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900" role="alert">
            <p className="flex items-start gap-3 font-semibold"><AlertCircle className="mt-0.5 h-5 w-5 flex-none" aria-hidden="true" /> {detail.error ?? 'Le traitement a échoué.'}</p>
            <p className="mt-2 text-sm text-red-800">Si le fichier est un scan ou une image, essayez un export Word ou Excel, ou collez les questions.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => { setDetail(null); setMode('text'); }}>Coller les questions</Button>
              <Button size="sm" variant="secondary" onClick={() => { setDetail(null); setMode('file'); }}>Choisir un autre fichier</Button>
            </div>
          </div>
        )}

        {detail.status === 'ready' && (
          <>
            <section className={`${card} p-5`} aria-label="Progression">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-[15px] font-semibold text-gray-900">{pct} % des réponses sont déjà préparées</h2>
                  <p className="mt-1 text-[13px] text-gray-600">{counts.validated} {counts.validated > 1 ? 'validées' : 'validée'} · {counts.prefilled} à relire · {counts.to_complete} à compléter · {total} {total > 1 ? 'questions' : 'question'}</p>
                </div>
                <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-700">
                  {(['validated', 'prefilled', 'to_complete'] as QStatus[]).map(k => (
                    <li key={k}><b style={{ color: STATUS[k].dot }} aria-hidden="true">■</b> {STATUS[k].label} {counts[k]}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-3 flex h-3 gap-0.5 overflow-hidden rounded-full bg-gray-200" role="img"
                aria-label={`${counts.validated} validées, ${counts.prefilled} à relire, ${counts.to_complete} à compléter sur ${total}`}>
                <span style={{ width: seg(counts.validated), background: STATUS.validated.dot }} />
                <span style={{ width: seg(counts.prefilled), background: STATUS.prefilled.dot }} />
                <span style={{ width: seg(counts.to_complete), background: STATUS.to_complete.dot }} />
              </div>
              <p className="mt-3 flex items-start gap-2 text-[13px] text-gray-600">
                <ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-emerald-700" aria-hidden="true" />
                Les réponses viennent uniquement des données que vous avez saisies, et chacune cite sa source. Rien n’est transmis à votre client sans vous.
              </p>
            </section>

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-[400px_minmax(0,1fr)] lg:items-start" aria-label="Questions">
              {/* Liste des questions */}
              <div className={`${showList ? 'block' : 'hidden'} space-y-3 lg:block`}>
                <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrer les questions">
                  {([['all', `Toutes ${total}`], ['to_complete', `À compléter ${counts.to_complete}`], ['prefilled', `À relire ${counts.prefilled}`], ['validated', `Validées ${counts.validated}`]] as [Filter, string][]).map(([k, label]) => (
                    <button key={k} type="button" onClick={() => setFilter(k)} aria-pressed={filter === k}
                      className={`min-h-[36px] rounded-full border px-3 text-[13px] font-semibold ${filter === k ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}>{label}</button>
                  ))}
                </div>
                {counts.prefilled > 0 && (
                  <button type="button" onClick={validateAllPrefilled} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-emerald-800 hover:underline">
                    <ListChecks className="h-4 w-4" aria-hidden="true" /> Valider les réponses fiables (hors alertes)
                  </button>
                )}
                <ul className="space-y-2">
                  {visible.map(q => {
                    const d = effectiveOf(q, drafts);
                    const s = STATUS[d.status];
                    const sel = q.id === selectedId;
                    const n = questions.indexOf(q) + 1;
                    return (
                      <li key={q.id}>
                        <button type="button" onClick={() => { setSelectedId(q.id); setShowList(false); }} aria-current={sel ? 'true' : undefined}
                          className={`flex w-full flex-col gap-1.5 rounded-xl border p-3 text-left transition ${sel ? 'border-emerald-700 bg-emerald-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                          <span className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-gray-600">Question {n}{q.section ? ` · ${q.section}` : ''}</span>
                            <span className={`inline-flex h-6 items-center gap-1 rounded-md px-2 text-xs font-semibold ${s.cls}`}>
                              {d.status === 'validated' ? <Lock className="h-3 w-3" aria-hidden="true" /> : d.status === 'to_complete' ? <AlertCircle className="h-3 w-3" aria-hidden="true" /> : <Sparkles className="h-3 w-3" aria-hidden="true" />}
                              {s.label}
                            </span>
                          </span>
                          <span className="text-sm font-semibold leading-snug text-gray-900">{q.text}</span>
                          <span className="truncate text-[13px] text-gray-600">{d.answer.trim() ? d.answer : 'Aucune réponse'}</span>
                        </button>
                      </li>
                    );
                  })}
                  {visible.length === 0 && <li className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-600">Aucune question dans cette catégorie.</li>}
                </ul>
              </div>

              {/* Question en cours */}
              <div className={`${showList ? 'hidden' : 'block'} lg:block`}>
                <button type="button" onClick={() => setShowList(true)} className="mb-3 inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-800 lg:hidden">
                  <ListChecks className="h-4 w-4" aria-hidden="true" /> Toutes les questions ({total})
                </button>
                {selected && sd ? (
                  <article className={`${card} space-y-4 p-5 sm:p-6`} aria-label={`Question ${idx + 1}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[13px] font-semibold text-gray-600">Question {idx + 1} sur {total}{selected.section ? ` · ${selected.section}` : ''}</span>
                      <span className="flex flex-wrap gap-2">
                        {conf && <span className={`inline-flex h-6 items-center rounded-md px-2 text-xs font-semibold ${TONE[conf.tone]}`}>{conf.text}</span>}
                        <span className={`inline-flex h-6 items-center rounded-md px-2 text-xs font-semibold ${STATUS[sd.status].cls}`}>{STATUS[sd.status].label}</span>
                      </span>
                    </div>
                    <h2 className="text-lg font-semibold leading-snug text-gray-900 sm:text-xl">{selected.text}</h2>

                    <div>
                      <label htmlFor="q-answer" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">
                        {sd.status === 'to_complete' && !sd.answer ? 'Votre réponse' : 'Réponse proposée'}
                      </label>
                      <textarea id="q-answer" value={sd.answer} rows={sd.answer.length > 140 ? 5 : 3}
                        onChange={e => set(selected.id, { answer: e.target.value, status: e.target.value.trim() ? (sd.status === 'to_complete' ? 'validated' : sd.status) : 'to_complete' })}
                        placeholder="Aucune donnée disponible : saisissez votre réponse"
                        className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-3 text-[15px] leading-relaxed text-gray-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
                    </div>

                    {(selected.note || selected.confidence === 'low') && sd.status !== 'to_complete' && (
                      <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900" role="note">
                        <AlertCircle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
                        <span>{selected.note ?? 'Relisez cette réponse avec attention.'}</span>
                      </p>
                    )}

                    <div className="rounded-lg bg-gray-50 p-4">
                      <h3 className="text-[13px] font-semibold text-gray-900">{selected.sources.length ? 'Source de la réponse' : 'Aucune source'}</h3>
                      {selected.sources.length === 0 ? (
                        <p className="mt-1 text-[13px] text-gray-600">Aucune donnée saisie ne correspond à cette question. <Link to="/app/data-entry" className="font-semibold text-emerald-800 hover:underline">Saisir la donnée</Link></p>
                      ) : (
                        <ul className="mt-2 space-y-2">
                          {selected.sources.map((src, i) => (
                            <li key={i} className="flex flex-wrap items-center gap-2 text-[13px] text-gray-800">
                              <span><b>{src.label}</b> · {src.value}{src.unit ? ` ${src.unit}` : ''}{src.period ? ` · ${src.period}` : ''}</span>
                              <span className={`inline-flex h-5 items-center gap-1 rounded px-1.5 text-xs font-semibold ${src.verified ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>
                                {src.verified ? <Lock className="h-3 w-3" aria-hidden="true" /> : <AlertCircle className="h-3 w-3" aria-hidden="true" />}
                                {src.verified ? 'Vérifiée' : 'Non vérifiée : à confirmer'}
                              </span>
                              <Link to={sourceLink(src)} className="inline-flex items-center gap-1 font-semibold text-emerald-800 hover:underline">
                                Ouvrir la donnée <ExternalLink className="h-3 w-3" aria-hidden="true" />
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => validateAndNext(selected)} disabled={!sd.answer.trim()}>
                        {sd.status === 'validated' ? 'Réponse validée' : 'Valider et passer à la suivante'}
                      </Button>
                      {sd.status !== 'to_complete' && (
                        <Button variant="secondary" onClick={() => set(selected.id, { status: 'to_complete' })}>Marquer à compléter</Button>
                      )}
                      {nextUnresolvedId(questions, drafts, selected.id) && (
                        <button type="button" onClick={() => setSelectedId(nextUnresolvedId(questions, drafts, selected.id))}
                          className="ml-auto inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-gray-700 hover:text-gray-900">
                          Suivante à traiter <ChevronRight className="h-4 w-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </article>
                ) : (
                  <p className={`${card} p-8 text-center text-sm text-gray-600`}>Ce questionnaire ne contient aucune question.</p>
                )}
              </div>
            </section>
          </>
        )}
        {deleteDialog}
      </div>
    );
  }

  // ── Vue liste + dépôt ──
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Questionnaires clients</h1>
        <p className="mt-1 max-w-2xl text-sm text-gray-600">
          Déposez le questionnaire RSE d’un client. ESGFlow en extrait les questions et les pré-remplit avec vos données, en citant la source de chaque réponse.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
        <section className={`${card} p-5`} aria-labelledby="new-q">
          <h2 id="new-q" className="text-[15px] font-semibold text-gray-900">Nouveau questionnaire</h2>
          <div className="mt-3 flex gap-2" role="tablist" aria-label="Mode de dépôt">
            {([['file', 'Envoyer un fichier'], ['text', 'Coller les questions']] as const).map(([k, label]) => (
              <button key={k} type="button" role="tab" aria-selected={mode === k} onClick={() => setMode(k)}
                className={`min-h-[40px] rounded-lg px-3.5 text-sm font-semibold ${mode === k ? 'bg-emerald-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{label}</button>
            ))}
          </div>
          <div className="mt-4">
            <label htmlFor="q-client" className="mb-1 block text-sm font-medium text-gray-700">Nom du client <span className="font-normal text-gray-600">(facultatif)</span></label>
            <input id="q-client" value={clientName} onChange={e => setClientName(e.target.value)} maxLength={200} placeholder="Ex. Groupe Exemple"
              className="h-10 w-full rounded-lg border border-gray-300 px-3 text-gray-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 sm:max-w-sm" />
          </div>

          {mode === 'file' ? (
            <div onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop}
              className={`mt-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors ${drag ? 'border-emerald-700 bg-emerald-50' : 'border-gray-300 bg-gray-50'}`}>
              <UploadCloud className="h-8 w-8 text-emerald-700" aria-hidden="true" />
              <p className="mt-2 font-semibold text-gray-900">Glissez le questionnaire ici</p>
              <p className="mt-1 text-[13px] text-gray-600">Excel, Word, PDF, CSV ou texte · 10 Mo maximum</p>
              <input ref={input} type="file" accept=".xlsx,.xlsm,.docx,.pdf,.csv,.txt,.md" className="sr-only" aria-label="Fichier du questionnaire"
                onChange={e => { const f = e.target.files?.[0]; if (f) void submit(f); e.target.value = ''; }} />
              <Button className="mt-4" onClick={() => input.current?.click()} disabled={busy}>{busy ? 'Envoi…' : 'Choisir un fichier'}</Button>
            </div>
          ) : (
            <div className="mt-4">
              <textarea value={pasted} onChange={e => setPasted(e.target.value)} rows={8} aria-label="Questions à coller"
                placeholder="Collez ici les questions du questionnaire, une par ligne…"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
              <Button className="mt-3" onClick={() => void submit(null)} disabled={busy || pasted.trim().length < 20}>{busy ? 'Envoi…' : 'Analyser ces questions'}</Button>
            </div>
          )}
          <p className="mt-3 flex items-start gap-2 text-xs text-gray-600">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 flex-none" aria-hidden="true" />
            Le texte et vos données saisies sont envoyés à OpenAI pour le traitement ; le fichier n’est pas conservé. Ne déposez pas de document que vous ne pouvez pas partager avec un prestataire d’IA.
          </p>
        </section>

        <section aria-labelledby="my-q">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 id="my-q" className="text-[15px] font-semibold text-gray-900">Vos questionnaires</h2>
            {items.length > 0 && (
              <button type="button" onClick={() => load(Q_EXAMPLE)} className="text-sm font-semibold text-emerald-800 hover:underline">Voir un exemple pré-rempli</button>
            )}
          </div>
          {loadingList ? (
            <div className="space-y-2" role="status" aria-label="Chargement">
              {[0, 1, 2].map(i => <div key={i} className="h-[72px] animate-pulse rounded-xl bg-gray-200" />)}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6">
              <p className="text-sm font-semibold text-gray-900">Aucun questionnaire pour l'instant.</p>
              <ol className="mt-3 space-y-2 text-sm text-gray-700">
                <li className="flex gap-2"><b className="text-emerald-800">1.</b> Vous déposez le questionnaire reçu de votre client.</li>
                <li className="flex gap-2"><b className="text-emerald-800">2.</b> Les réponses sont pré-remplies à partir de vos données, avec leur source.</li>
                <li className="flex gap-2"><b className="text-emerald-800">3.</b> Vous relisez, complétez, puis exportez en Excel.</li>
              </ol>
              <Button className="mt-4" variant="secondary" onClick={() => load(Q_EXAMPLE)}>Voir un exemple de questionnaire pré-rempli</Button>
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map(it => {
                const c = it.counts;
                const seg = (n: number) => `${(n / (c.total || 1)) * 100}%`;
                return (
                  <li key={it.id} className={`${card} flex items-center gap-3 p-4`}>
                    <button type="button" onClick={() => void open(it.id)} className="min-w-0 flex-1 text-left">
                      <p className="truncate font-semibold text-gray-900">{it.title}{it.client_name ? ` · ${it.client_name}` : ''}</p>
                      <p className="mt-0.5 text-[13px] text-gray-600">
                        {it.status === 'processing' && 'Traitement en cours…'}
                        {it.status === 'failed' && 'Échec du traitement'}
                        {it.status === 'ready' && `${c.validated}/${c.total} validées · ${c.prefilled} à relire · ${c.to_complete} à compléter`}
                        {it.created_at ? ` · ${new Date(it.created_at).toLocaleDateString('fr-FR')}` : ''}
                      </p>
                      {it.status === 'ready' && c.total > 0 && (
                        <span className="mt-2 flex h-2 gap-0.5 overflow-hidden rounded-full bg-gray-200" aria-hidden="true">
                          <span style={{ width: seg(c.validated), background: STATUS.validated.dot }} />
                          <span style={{ width: seg(c.prefilled), background: STATUS.prefilled.dot }} />
                          <span style={{ width: seg(c.to_complete), background: STATUS.to_complete.dot }} />
                        </span>
                      )}
                    </button>
                    <button type="button" onClick={() => setToDelete(it)} aria-label={`Supprimer ${it.title}`} className="rounded-lg p-2.5 text-gray-500 hover:bg-red-50 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-5 text-sm text-gray-600">Pas de questionnaire à portée de main ? <Link to="/ressources/dictionnaire" className="font-semibold text-emerald-800 hover:underline">Consultez le dictionnaire des indicateurs ESG</Link>.</p>
        </section>
      </div>
      {deleteDialog}
    </div>
  );
}
