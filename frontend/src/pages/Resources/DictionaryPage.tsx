import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import ResourcesShell from './ResourcesShell';
import { DICTIONARY, PILLARS, type Pillar } from './data/dictionary';

const PILLAR_STYLE: Record<Pillar, string> = {
  E: 'bg-emerald-100 text-emerald-800',
  S: 'bg-indigo-100 text-indigo-800',
  G: 'bg-amber-100 text-amber-800',
};

const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export default function DictionaryPage() {
  const [q, setQ] = useState('');
  const [pillar, setPillar] = useState<Pillar | 'all'>('all');

  const entries = useMemo(() => {
    const needle = norm(q.trim());
    return DICTIONARY.filter(e =>
      (pillar === 'all' || e.pillar === pillar) &&
      (!needle || norm([e.name, e.definition, e.esrs, e.gri, e.vsme].filter(Boolean).join(' ')).includes(needle)));
  }, [q, pillar]);

  const count = (p: Pillar) => DICTIONARY.filter(e => e.pillar === p).length;

  return (
    <ResourcesShell title="Dictionnaire des indicateurs ESG">
      <header className="border-b border-slate-200 bg-slate-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-emerald-300">Référence · sans compte</p>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Le dictionnaire des indicateurs ESG</h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-300">
            Chaque indicateur : ce qu'il mesure, comment on le calcule, et son code dans les référentiels. Quand un référentiel n'a pas
            de code correspondant, nous l'indiquons au lieu d'en inventer un.
          </p>
          <p className="mt-6 font-mono text-xs text-slate-400">
            {DICTIONARY.length} indicateurs · ESRS, GRI, VSME
          </p>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <label className="relative block">
            <span className="sr-only">Rechercher un indicateur</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Scope 1, E1-6, eau…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
          </label>
          <nav className="mt-5 flex gap-2 overflow-x-auto lg:flex-col" aria-label="Filtrer par pilier">
            {([['all', 'Tous', DICTIONARY.length], ['E', PILLARS.E, count('E')], ['S', PILLARS.S, count('S')], ['G', PILLARS.G, count('G')]] as const).map(([k, label, n]) => (
              <button key={k} type="button" onClick={() => setPillar(k)} aria-pressed={pillar === k}
                className={`flex items-center justify-between gap-3 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                  pillar === k ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>
                {label}<span className="text-xs opacity-70">{n}</span>
              </button>
            ))}
          </nav>
        </aside>

        <section aria-live="polite">
          {entries.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
              Aucun indicateur ne correspond à « {q} ».
            </p>
          ) : (
            <ul className="space-y-4">
              {entries.map(e => (
                <li key={e.id} id={e.id}>
                  <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h2 className="text-lg font-bold leading-snug">{e.name}</h2>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-slate-200 px-2.5 py-1 font-mono text-[11px] text-slate-500">{e.unit}</span>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${PILLAR_STYLE[e.pillar]}`}>{PILLARS[e.pillar]}</span>
                      </div>
                    </div>
                    <p className="mt-3 leading-relaxed text-slate-700">{e.definition}</p>
                    <p className="mt-2 text-sm text-slate-500"><span className="font-semibold text-slate-600">Comment le mesurer :</span> {e.how}</p>
                    <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4 text-sm">
                      {([['ESRS', e.esrs], ['GRI', e.gri], ['VSME', e.vsme]] as const).map(([k, v]) => (
                        <div key={k}>
                          <dt className="font-mono text-[11px] uppercase tracking-wider text-slate-400">{k}</dt>
                          <dd className={v ? 'font-medium text-slate-800' : 'text-slate-300'}>{v ?? '—'}</dd>
                        </div>
                      ))}
                    </dl>
                  </article>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-8 rounded-2xl bg-slate-100 p-5 text-sm leading-relaxed text-slate-600">
            Repères : les codes ESRS suivent les actes délégués de 2023 (les ESRS simplifiés, en cours de révision, pourront changer la numérotation) ;
            le VSME est le standard volontaire pour les PME (module de base B1–B11, module complet C).
            Définitions rédigées par nos soins : elles éclairent les textes sans s'y substituer.{' '}
            <Link to="/ressources/suis-je-concerne" className="font-medium text-emerald-700 hover:underline">Savoir si la CSRD vous concerne</Link>.
          </p>
        </section>
      </main>
    </ResourcesShell>
  );
}
