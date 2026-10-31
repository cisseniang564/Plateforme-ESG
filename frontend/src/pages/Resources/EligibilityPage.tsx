import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, CheckCircle2, ExternalLink, RotateCcw, ShieldCheck } from 'lucide-react';
import ResourcesShell from './ResourcesShell';
import {
  assessEligibility, LAST_CHECKED, SOURCES,
  type EligibilityAnswers, type EmployeeBand, type Region, type TurnoverBand,
} from './data/eligibility';

type Draft = Partial<EligibilityAnswers>;

interface Question {
  key: keyof EligibilityAnswers;
  title: string;
  hint?: string;
  options: { value: string | boolean; label: string }[];
  /** La question n'a de sens que dans certains cas. */
  when?: (d: Draft) => boolean;
}

const QUESTIONS: Question[] = [
  { key: 'region', title: "Où se trouve votre entreprise (ou la tête de votre groupe) ?",
    options: [{ value: 'eu', label: "Dans l'Union européenne" }, { value: 'non_eu', label: "Hors de l'Union européenne" }] },
  { key: 'alreadyReporting', title: "Publiez-vous déjà un rapport de durabilité obligatoire (exercice 2024 ou avant) ?",
    hint: "Entreprises qui relevaient déjà de la directive sur la déclaration non financière (NFRD).",
    when: d => d.region === 'eu',
    options: [{ value: false, label: 'Non' }, { value: true, label: 'Oui' }] },
  { key: 'employees', title: "Quel est votre effectif moyen sur l'exercice ?",
    when: d => d.region === 'eu',
    options: [
      { value: 'le250', label: "Jusqu'à 250" }, { value: 'le1000', label: 'De 251 à 1 000' },
      { value: 'le5000', label: 'De 1 001 à 5 000' }, { value: 'gt5000', label: 'Plus de 5 000' }] },
  { key: 'turnover', title: "Quel est votre chiffre d'affaires net ?",
    hint: "Consolidé si vous êtes une tête de groupe.",
    when: d => d.region === 'eu',
    options: [
      { value: 'le50', label: "Jusqu'à 50 M€" }, { value: 'le450', label: 'De 50 à 450 M€ inclus' },
      { value: 'le1500', label: 'De plus de 450 M€ à 1,5 Md€' }, { value: 'gt1500', label: 'Plus de 1,5 Md€' }] },
  { key: 'euTurnoverOver450', title: "Votre chiffre d'affaires net dans l'UE dépasse-t-il 450 M€ sur chacun des deux derniers exercices ?",
    when: d => d.region === 'non_eu',
    options: [{ value: true, label: 'Oui' }, { value: false, label: 'Non' }] },
  { key: 'euEntityOver200', title: "Avez-vous une filiale ou une succursale dans l'UE dépassant 200 M€ de chiffre d'affaires net ?",
    when: d => d.region === 'non_eu',
    options: [{ value: true, label: 'Oui' }, { value: false, label: 'Non' }] },
  { key: 'sellsToLargeClients', title: "Vendez-vous à de grandes entreprises ou à des groupes ?",
    hint: "Ce sont elles qui envoient les questionnaires fournisseurs.",
    options: [{ value: true, label: 'Oui' }, { value: false, label: 'Plutôt non' }] },
];

const DEFAULTS: Pick<EligibilityAnswers, 'alreadyReporting' | 'employees' | 'turnover' | 'euTurnoverOver450' | 'euEntityOver200'> = {
  alreadyReporting: false, employees: 'le250', turnover: 'le50', euTurnoverOver450: false, euEntityOver200: false,
};

export default function EligibilityPage() {
  const [draft, setDraft] = useState<Draft>({});
  const steps = useMemo(() => QUESTIONS.filter(q => !q.when || q.when(draft)), [draft]);
  const answered = steps.filter(q => draft[q.key] !== undefined).length;
  const current = steps.find(q => draft[q.key] === undefined);
  const done = !current && steps.length > 0 && answered === steps.length;

  const result = useMemo(
    () => (done ? assessEligibility({ ...DEFAULTS, ...draft } as EligibilityAnswers) : null),
    [done, draft],
  );

  const set = (q: Question, v: string | boolean) => setDraft(d => ({ ...d, [q.key]: v as never }));

  return (
    <ResourcesShell title="Suis-je concerné par la CSRD ?">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-emerald-700">Outil gratuit · sans compte</p>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">Suis-je concerné par la CSRD&nbsp;?</h1>
          <p className="mt-4 text-lg text-slate-600">
            Sept questions au plus, une réponse claire : êtes-vous obligé, à quelle date, et ce que cela change pour vous
            si vous ne l'êtes pas. Rien n'est enregistré.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {!done && current && (
          <section aria-live="polite" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex items-center gap-3" aria-label={`Question ${answered + 1} sur ${steps.length}`}>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(answered / steps.length) * 100}%` }} />
              </div>
              <span className="text-xs tabular-nums text-slate-400">{answered + 1} / {steps.length}</span>
            </div>
            <h2 className="text-xl font-bold leading-snug sm:text-2xl">{current.title}</h2>
            {current.hint && <p className="mt-2 text-sm text-slate-500">{current.hint}</p>}
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {current.options.map(o => (
                <button key={String(o.value)} type="button" onClick={() => set(current, o.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left font-medium transition-all hover:-translate-y-0.5 hover:border-emerald-400 hover:bg-emerald-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                  {o.label}
                </button>
              ))}
            </div>
            {answered > 0 && (
              <button type="button" onClick={() => setDraft({})} className="mt-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
                <RotateCcw className="h-3.5 w-3.5" /> Recommencer
              </button>
            )}
          </section>
        )}

        {result && <Result result={result} onReset={() => setDraft({})} region={draft.region as Region} />}

        <aside className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>
              Résultat indicatif, pas un avis juridique. Les cas limites (effectif exactement au seuil, groupes, sociétés déjà déclarantes)
              dépendent du texte final et de sa transposition nationale. Dernière vérification : {LAST_CHECKED}.
            </span>
          </p>
        </aside>

        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Sources</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {SOURCES.map(s => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-slate-600 underline-offset-2 hover:text-emerald-700 hover:underline">
                  {s.label} <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-slate-500">
            Pour aller plus loin : <Link to="/omnibus-csrd" className="font-medium text-emerald-700 hover:underline">le guide Omnibus</Link> et{' '}
            <Link to="/ressources/dictionnaire" className="font-medium text-emerald-700 hover:underline">le dictionnaire des indicateurs ESG</Link>.
          </p>
        </section>
      </main>
    </ResourcesShell>
  );
}

function Result({ result, onReset, region }: { result: ReturnType<typeof assessEligibility>; onReset: () => void; region: Region }) {
  const { csrd } = result;
  const head =
    csrd.status === 'in_scope_wave2' ? { tone: 'bg-emerald-600', title: 'Vous êtes concerné par la CSRD',
      text: `Votre premier rapport porte sur l'exercice ${csrd.fiscalYear} et sera publié en ${csrd.firstReportYear}.` } :
    csrd.status === 'in_scope_non_eu' ? { tone: 'bg-emerald-600', title: 'Vous êtes concerné par la CSRD',
      text: `Via votre filiale ou succursale dans l'UE : premier rapport en ${csrd.firstReportYear}, sur l'exercice ${csrd.fiscalYear}.` } :
    csrd.status === 'already_reporting' ? { tone: 'bg-sky-600', title: 'Vous déclarez déjà : vous continuez, sous réserve',
      text: "Les entreprises de moins de 1 000 salariés ou de 450 M€ de chiffre d'affaires ou moins peuvent être dispensées, selon l'option retenue par chaque État membre. Vérifiez la transposition nationale." } :
    { tone: 'bg-slate-700', title: "Vous n'êtes pas directement soumis à la CSRD",
      text: region === 'non_eu'
        ? "Vos seuils dans l'UE ne sont pas atteints. Une demande de données peut tout de même venir d'un client européen."
        : "Même cotée, une société sous les seuils (plus de 1 000 salariés ET plus de 450 M€ de chiffre d'affaires net) n'est plus obligée." };

  return (
    <section className="space-y-5" aria-live="polite">
      <div className={`${head.tone} rounded-3xl p-7 text-white shadow-lg`}>
        <ShieldCheck className="mb-3 h-7 w-7 opacity-90" />
        <h2 className="text-2xl font-extrabold sm:text-3xl">{head.title}</h2>
        <p className="mt-2 text-white/90">{head.text}</p>
      </div>

      {result.valueChainCap && (
        <Card title="Vos clients ne peuvent pas tout exiger de vous">
          Les entreprises de moins de 1 000 salariés peuvent refuser les demandes d'information qui dépassent le standard volontaire VSME.
          Cas limite (exactement 1 000 salariés) : à confirmer dans le texte.
        </Card>
      )}
      {result.vsmeUseful && (
        <Card title="Le VSME est votre socle de réponse">
          Vous vendez à de grandes entreprises : leurs questionnaires s'alignent progressivement sur le VSME. Préparer ces données une fois
          vous évite de répondre client par client.
        </Card>
      )}
      {result.csddd && (
        <Card title="Vous entrez aussi dans le champ de la CSDDD">
          Plus de 5 000 salariés et plus de 1,5 Md€ de chiffre d'affaires net : le devoir de vigilance sur la chaîne d'approvisionnement
          vous concerne. <Link to="/guide/csddd-supply-chain" className="font-medium text-emerald-700 hover:underline">Lire le guide</Link>.
        </Card>
      )}

      <div className="flex flex-wrap gap-3 pt-2">
        <Link to="/register" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700">
          Préparer mes données <ArrowRight className="h-4 w-4" />
        </Link>
        <button type="button" onClick={onReset} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 font-medium text-slate-700 hover:bg-slate-50">
          <RotateCcw className="h-4 w-4" /> Refaire le test
        </button>
      </div>
    </section>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="flex items-center gap-2 font-bold"><CheckCircle2 className="h-4 w-4 text-emerald-600" />{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{children}</p>
    </div>
  );
}
