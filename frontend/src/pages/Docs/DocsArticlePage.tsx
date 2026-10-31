import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ArrowUpRight, Info, Lock } from 'lucide-react';
import { usePageSeo } from '@/hooks/usePageSeo';
import { ARTICLES, FEATURE_MIN_PLAN, SECTIONS, bySlug, inSection } from './content';

export default function DocsArticlePage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const article = bySlug(slug);

  usePageSeo({
    id: `docs-${slug}`,
    title: article ? `${article.title} | Documentation ESGFlow` : 'Documentation ESGFlow',
    description: article?.summary ?? 'Documentation ESGFlow',
    url: `https://greenconnect.cloud/documentation/${slug}`,
    ogType: 'article',
  });

  if (!article) return <Navigate to="/documentation" replace />;

  const section = SECTIONS.find(s => s.id === article.section)!;
  const siblings = inSection(article.section);
  const i = siblings.findIndex(a => a.slug === article.slug);
  const prev = siblings[i - 1] ?? null;
  const next = siblings[i + 1] ?? null;
  const related = (article.related ?? []).map(bySlug).filter(Boolean) as typeof ARTICLES;

  return (
    <article className="mx-auto max-w-3xl">
      <nav aria-label="Fil d'Ariane" className="text-sm text-slate-500">
        <Link to="/documentation" className="hover:text-slate-900">Documentation</Link>
        <span className="mx-2">/</span>
        <span>{section.title}</span>
      </nav>

      <header className="mt-4">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{article.title}</h1>
        <p className="mt-3 text-lg leading-relaxed text-slate-600">{article.summary}</p>
        {article.feature && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-800 ring-1 ring-amber-200">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" /> Disponible à partir du plan {FEATURE_MIN_PLAN[article.feature]}
          </p>
        )}
      </header>

      <section className="mt-8" aria-label="Pages concernées">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{article.routes.length > 1 ? 'Pages concernées' : 'Page concernée'}</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {article.routes.map(r => r.to.endsWith('/exemple') ? (
            <li key={r.to} className="rounded-full border border-dashed border-slate-300 px-4 py-1.5 text-sm text-slate-500">{r.label} (lien généré à la demande)</li>
          ) : (
            <li key={r.to}>
              <Link to={r.to} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-800 transition hover:bg-emerald-100">
                {r.label} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-slate-900">À quoi sert cette page ?</h2>
        <p className="mt-3 leading-relaxed text-slate-700">{article.about}</p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-slate-900">Ce que vous y trouvez</h2>
        <ul className="mt-3 space-y-2.5">
          {article.shows.map((s, k) => (
            <li key={k} className="flex gap-3 leading-relaxed text-slate-700">
              <span className="mt-2.5 h-1.5 w-1.5 flex-none rounded-full bg-emerald-500" aria-hidden="true" />{s}
            </li>
          ))}
        </ul>
      </section>

      {article.steps && article.steps.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold text-slate-900">Pas à pas</h2>
          <ol className="mt-4 space-y-4">
            {article.steps.map((s, k) => (
              <li key={k} className="flex gap-4">
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white" aria-hidden="true">{k + 1}</span>
                <div>
                  <p className="font-medium text-slate-900">{s.title}</p>
                  <p className="mt-0.5 leading-relaxed text-slate-600">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {article.tips && article.tips.length > 0 && (
        <aside className="mt-10 rounded-2xl border border-sky-200 bg-sky-50 p-5" aria-label="Bon à savoir">
          <p className="flex items-center gap-2 font-semibold text-sky-900"><Info className="h-4 w-4" aria-hidden="true" /> Bon à savoir</p>
          <ul className="mt-2 space-y-2 text-sm leading-relaxed text-sky-900">
            {article.tips.map((t, k) => <li key={k}>{t}</li>)}
          </ul>
        </aside>
      )}

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-semibold text-slate-900">Voir aussi</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {related.map(r => (
              <li key={r.slug}>
                <Link to={`/documentation/${r.slug}`} className="block h-full rounded-xl border border-slate-200 p-4 transition hover:border-emerald-300 hover:shadow-sm">
                  <span className="font-medium text-slate-900">{r.title}</span>
                  <span className="mt-1 block text-sm text-slate-500">{r.summary}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav aria-label="Pages voisines" className="mt-12 grid gap-3 border-t border-slate-100 pt-6 sm:grid-cols-2">
        {prev ? (
          <Link to={`/documentation/${prev.slug}`} className="group rounded-xl border border-slate-200 p-4 hover:border-emerald-300">
            <span className="flex items-center gap-1 text-xs text-slate-400"><ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Précédent</span>
            <span className="mt-1 block font-medium text-slate-900">{prev.title}</span>
          </Link>
        ) : <span />}
        {next && (
          <Link to={`/documentation/${next.slug}`} className="group rounded-xl border border-slate-200 p-4 text-right hover:border-emerald-300">
            <span className="flex items-center justify-end gap-1 text-xs text-slate-400">Suivant <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></span>
            <span className="mt-1 block font-medium text-slate-900">{next.title}</span>
          </Link>
        )}
      </nav>
    </article>
  );
}
