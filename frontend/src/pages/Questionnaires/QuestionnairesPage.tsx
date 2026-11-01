import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ClipboardList, UploadCloud, Loader2, Trash2, Download, CheckCircle2, AlertCircle, Sparkles, ArrowLeft, Check, ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/common';
import {
  createQuestionnaire, deleteQuestionnaire, exportQuestionnaire, getQuestionnaire, listQuestionnaires, questionnaireErrorMessage,
  saveAnswers, type QDetail, type QQuestion, type QStatus, type QSummary,
} from '@/services/questionnaireService';

const card = 'rounded-2xl border border-gray-200 bg-white shadow-kpi';
const STATUS: Record<QStatus, { label: string; cls: string }> = {
  validated: { label: 'Validé', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  prefilled: { label: 'Pré-rempli · à relire', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  to_complete: { label: 'À compléter', cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
};
type Filter = 'all' | QStatus;

export default function QuestionnairesPage() {
  const [items, setItems] = useState<QSummary[]>([]);
  const [detail, setDetail] = useState<QDetail | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { answer: string; status: QStatus }>>({});
  const [filter, setFilter] = useState<Filter>('all');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'file' | 'text'>('file');
  const [pasted, setPasted] = useState('');
  const [clientName, setClientName] = useState('');
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => setItems(await listQuestionnaires().catch(() => [])), []);
  useEffect(() => { void refresh(); }, [refresh]);

  const open = useCallback(async (id: string) => {
    try {
      const d = await getQuestionnaire(id);
      setDetail(d);
      setDrafts(Object.fromEntries((d.questions ?? []).map(q => [q.id, { answer: q.answer ?? '', status: q.status }])));
    } catch (e) { toast.error(questionnaireErrorMessage(e, 'Impossible d\'ouvrir ce questionnaire.')); }
  }, []);

  // pendant le traitement, on interroge le serveur jusqu'à ce que le questionnaire soit prêt
  useEffect(() => {
    if (!detail || detail.status !== 'processing') return;
    const t = setInterval(async () => {
      const d = await getQuestionnaire(detail.id).catch(() => null);
      if (d && d.status !== 'processing') { clearInterval(t); await open(detail.id); void refresh(); }
    }, 3000);
    return () => clearInterval(t);
  }, [detail, open, refresh]);

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

  const set = (id: string, patch: Partial<{ answer: string; status: QStatus }>) =>
    setDrafts(d => ({ ...d, [id]: { ...d[id], ...patch } }));

  const effective = (q: QQuestion) => drafts[q.id] ?? { answer: q.answer ?? '', status: q.status };
  const counts = useMemo(() => {
    const c = { validated: 0, prefilled: 0, to_complete: 0 };
    for (const q of detail?.questions ?? []) c[effective(q).status] += 1;
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail, drafts]);
  const total = detail?.questions.length ?? 0;
  const visible = (detail?.questions ?? []).filter(q => filter === 'all' || effective(q).status === filter);

  const persist = async () => {
    if (!detail) return;
    setBusy(true);
    try {
      const payload = Object.fromEntries(Object.entries(drafts).map(([id, d]) => [id, { answer: d.answer || null, status: d.status }]));
      const d = await saveAnswers(detail.id, payload);
      setDetail(d);
      setDrafts(Object.fromEntries(d.questions.map(q => [q.id, { answer: q.answer ?? '', status: q.status }])));
      toast.success('Réponses enregistrées.');
      void refresh();
    } catch (e) { toast.error(questionnaireErrorMessage(e, 'Enregistrement impossible.')); }
    finally { setBusy(false); }
  };

  const validateAllPrefilled = () => {
    if (!detail) return;
    setDrafts(d => Object.fromEntries(Object.entries(d).map(([id, v]) => [id, v.status === 'prefilled' && v.answer ? { ...v, status: 'validated' as QStatus } : v])));
  };

  const remove = async (id: string) => {
    if (!window.confirm('Supprimer ce questionnaire et ses réponses ?')) return;
    await deleteQuestionnaire(id).catch(() => toast.error('Suppression impossible.'));
    if (detail?.id === id) setDetail(null);
    void refresh();
  };

  // ── Vue détail ──
  if (detail) {
    return (
      <div className="space-y-6">
        <button type="button" onClick={() => { setDetail(null); void refresh(); }} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft className="h-4 w-4" /> Tous les questionnaires
        </button>

        <header className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white shadow-xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold">{detail.title}</h1>
              <p className="mt-1 text-sm text-emerald-100">{detail.client_name ? `Client : ${detail.client_name}` : 'Questionnaire client'}</p>
            </div>
            {detail.status === 'ready' && (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={persist} disabled={busy} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60">Enregistrer</button>
                <button type="button" onClick={() => exportQuestionnaire(detail.id, detail.title)} className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20">
                  <Download className="h-4 w-4" /> Exporter en Excel
                </button>
              </div>
            )}
          </div>
          {detail.status === 'ready' && (
            <div className="mt-5">
              <div className="flex h-2.5 overflow-hidden rounded-full bg-white/20" role="img" aria-label={`${counts.validated} validées sur ${total}`}>
                <div className="bg-white" style={{ width: `${(counts.validated / (total || 1)) * 100}%` }} />
                <div className="bg-amber-300" style={{ width: `${(counts.prefilled / (total || 1)) * 100}%` }} />
              </div>
              <p className="mt-2 text-sm text-emerald-50">
                <strong>{counts.validated}</strong> validées · <strong>{counts.prefilled}</strong> à relire · <strong>{counts.to_complete}</strong> à compléter · {total} questions
              </p>
            </div>
          )}
        </header>

        {detail.status === 'processing' && (
          <div className={`${card} flex items-center gap-3 p-6 text-gray-600`} role="status">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-600" /> Lecture du questionnaire et pré-remplissage à partir de vos données… (de 20 à 60 secondes)
          </div>
        )}
        {detail.status === 'failed' && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-800" role="alert">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-none" /> {detail.error ?? 'Le traitement a échoué.'}
          </div>
        )}

        {detail.status === 'ready' && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer les questions">
                {([['all', `Toutes (${total})`], ['to_complete', `À compléter (${counts.to_complete})`], ['prefilled', `À relire (${counts.prefilled})`], ['validated', `Validées (${counts.validated})`]] as [Filter, string][]).map(([k, label]) => (
                  <button key={k} type="button" onClick={() => setFilter(k)} aria-pressed={filter === k}
                    className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${filter === k ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'}`}>{label}</button>
                ))}
              </div>
              {counts.prefilled > 0 && (
                <button type="button" onClick={validateAllPrefilled} className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:underline">
                  <Check className="h-4 w-4" /> Valider les réponses pré-remplies
                </button>
              )}
            </div>

            <p className="flex items-start gap-2 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
              <ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-emerald-600" />
              Les réponses pré-remplies viennent uniquement des données que vous avez saisies dans ESGFlow, et chacune cite sa source. Relisez-les avant d'envoyer : rien n'est transmis à votre client sans vous.
            </p>

            <ul className="space-y-3">
              {visible.map(q => {
                const d = effective(q);
                const s = STATUS[d.status];
                return (
                  <li key={q.id} className={`${card} p-5`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        {q.section && <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">{q.section}</p>}
                        <p className="font-medium text-gray-900">{q.text}</p>
                      </div>
                      <span className={`flex-none rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${s.cls}`}>{s.label}</span>
                    </div>
                    <textarea
                      aria-label={`Réponse à : ${q.text}`}
                      value={d.answer}
                      onChange={e => set(q.id, { answer: e.target.value, status: e.target.value.trim() ? (d.status === 'to_complete' ? 'validated' : d.status) : 'to_complete' })}
                      rows={d.answer.length > 90 ? 3 : 2}
                      placeholder="Aucune donnée disponible : saisissez votre réponse"
                      className="mt-3 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                    />
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <ul className="flex flex-wrap gap-1.5">
                        {q.sources.map((src, i) => (
                          <li key={i} className={`rounded-lg px-2 py-1 text-xs ${src.verified ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}
                              title={src.verified ? 'Donnée vérifiée' : 'Donnée non vérifiée : à confirmer'}>
                            {src.label} = {src.value}{src.unit ? ` ${src.unit}` : ''}{src.period ? ` (${src.period})` : ''}{src.verified ? '' : ' · non vérifié'}
                          </li>
                        ))}
                      </ul>
                      {d.answer.trim() && d.status !== 'validated' && (
                        <button type="button" onClick={() => set(q.id, { status: 'validated' })} className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:underline">
                          <CheckCircle2 className="h-4 w-4" /> Valider
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
              {visible.length === 0 && <li className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-500">Aucune question dans cette catégorie.</li>}
            </ul>
          </>
        )}
      </div>
    );
  }

  // ── Vue liste + dépôt ──
  return (
    <div className="space-y-6">
      <header className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white shadow-xl sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20"><ClipboardList className="h-6 w-6" /></span>
          <h1 className="text-2xl font-bold sm:text-3xl">Questionnaires clients</h1>
        </div>
        <p className="mt-3 max-w-2xl text-emerald-50">
          Déposez le questionnaire RSE d'un client : ESGFlow en extrait les questions et les pré-remplit avec vos données déjà saisies,
          en citant la source de chaque réponse. Vous relisez, complétez et exportez.
        </p>
      </header>

      <section className={`${card} p-6`} aria-labelledby="new-q">
        <h2 id="new-q" className="font-semibold text-gray-900">Nouveau questionnaire</h2>
        <div className="mt-3 flex gap-2" role="tablist">
          {([['file', 'Envoyer un fichier'], ['text', 'Coller les questions']] as const).map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={mode === k} onClick={() => setMode(k)}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-medium ${mode === k ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{label}</button>
          ))}
        </div>
        <label className="mt-4 block text-sm text-gray-600">Nom du client (facultatif)
          <input value={clientName} onChange={e => setClientName(e.target.value)} maxLength={200} placeholder="Ex. Groupe Exemple"
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 sm:max-w-sm" />
        </label>

        {mode === 'file' ? (
          <div
            onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop}
            className={`mt-4 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${drag ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 bg-gray-50'}`}
          >
            <UploadCloud className="h-9 w-9 text-emerald-600" />
            <p className="mt-3 font-medium text-gray-800">Glissez le questionnaire ici</p>
            <p className="mt-1 text-sm text-gray-500">Excel, Word, PDF, CSV ou texte · 10 Mo maximum</p>
            <input ref={input} type="file" accept=".xlsx,.xlsm,.docx,.pdf,.csv,.txt,.md" className="sr-only" aria-label="Fichier du questionnaire"
              onChange={e => { const f = e.target.files?.[0]; if (f) void submit(f); e.target.value = ''; }} />
            <Button className="mt-4" onClick={() => input.current?.click()} disabled={busy}>{busy ? 'Envoi…' : 'Choisir un fichier'}</Button>
          </div>
        ) : (
          <div className="mt-4">
            <textarea value={pasted} onChange={e => setPasted(e.target.value)} rows={8} aria-label="Questions à coller"
              placeholder="Collez ici les questions du questionnaire, une par ligne…"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
            <Button className="mt-3" onClick={() => void submit(null)} disabled={busy || pasted.trim().length < 20}>{busy ? 'Envoi…' : 'Analyser ces questions'}</Button>
          </div>
        )}
        <p className="mt-4 flex items-start gap-2 text-xs text-gray-500">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 flex-none" />
          Le texte du questionnaire et vos données saisies sont envoyés à OpenAI pour le traitement. Le fichier lui-même n'est pas conservé. Ne déposez pas de document confidentiel que vous ne pouvez pas partager avec un prestataire d'IA.
        </p>
      </section>

      <section aria-labelledby="my-q">
        <h2 id="my-q" className="mb-3 font-semibold text-gray-900">Vos questionnaires</h2>
        {items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-500">Aucun questionnaire pour l'instant.</p>
        ) : (
          <ul className="space-y-2">
            {items.map(it => (
              <li key={it.id} className={`${card} flex flex-wrap items-center justify-between gap-3 p-4`}>
                <button type="button" onClick={() => void open(it.id)} className="min-w-0 flex-1 text-left">
                  <p className="truncate font-medium text-gray-900">{it.title}{it.client_name ? ` · ${it.client_name}` : ''}</p>
                  <p className="mt-0.5 text-sm text-gray-500">
                    {it.status === 'processing' && 'Traitement en cours…'}
                    {it.status === 'failed' && 'Échec du traitement'}
                    {it.status === 'ready' && `${it.counts.validated}/${it.counts.total} validées · ${it.counts.to_complete} à compléter`}
                    {it.created_at ? ` · ${new Date(it.created_at).toLocaleDateString('fr-FR')}` : ''}
                  </p>
                </button>
                <button type="button" onClick={() => void remove(it.id)} aria-label={`Supprimer ${it.title}`} className="rounded-lg p-2 text-gray-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-6 text-sm text-gray-500">Pas de questionnaire à portée de main ? <Link to="/ressources/dictionnaire" className="font-medium text-emerald-700 hover:underline">Consultez le dictionnaire des indicateurs ESG</Link>.</p>
      </section>
    </div>
  );
}
