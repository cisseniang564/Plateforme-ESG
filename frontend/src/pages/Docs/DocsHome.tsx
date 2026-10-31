import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Compass } from 'lucide-react';
import { usePageSeo } from '@/hooks/usePageSeo';
import { ARTICLES, SECTIONS, bySlug, inSection } from './content';
import { SearchBox } from './DocsLayout';

const START = ['premiers-pas', 'tableau-de-bord', 'saisie-manuelle', 'import-csv-excel', 'calculer-score', 'gaia'];

export default function DocsHome() {
  usePageSeo({
    id: 'docs-home',
    title: 'Documentation ESGFlow : toutes les pages de la plateforme expliquées',
    description: 'Guide complet de la plateforme ESGFlow : collecte des données, scores ESG, bilan carbone, CSRD, rapports, IA Gaïa, paramètres. Une page de documentation pour chaque page de la plateforme.',
    url: 'https://greenconnect.cloud/documentation',
  });

  return (
    <div className="mx-auto max-w-5xl">
      <section className="rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-teal-50 px-6 py-12 text-center sm:px-12">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3.5 py-1.5 text-xs font-medium text-emerald-800">
          <BookOpen className="h-3.5 w-3.5" aria-hidden="true" /> Documentation
        </span>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-900 sm:text-5xl">Tout comprendre, page par page.</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
          {ARTICLES.length} pages de documentation, une pour chaque page de la plateforme : à quoi elle sert, ce qu&apos;on y trouve et comment s&apos;en servir.
        </p>
        <div className="mx-auto mt-8 max-w-xl text-left"><SearchBox /></div>
      </section>

      <section className="mt-12" aria-labelledby="start-title">
        <h2 id="start-title" className="flex items-center gap-2 text-xl font-semibold text-slate-900"><Compass className="h-5 w-5 text-emerald-600" aria-hidden="true" />Pour commencer</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {START.map(slug => {
            const a = bySlug(slug);
            if (!a) return null;
            return (
              <li key={slug}>
                <Link to={`/documentation/${slug}`} className="group flex h-full flex-col rounded-2xl border border-slate-200 p-5 transition hover:border-emerald-300 hover:shadow-md">
                  <span className="font-semibold text-slate-900">{a.title}</span>
                  <span className="mt-1 flex-1 text-sm text-slate-600">{a.summary}</span>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-emerald-700">Lire <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden="true" /></span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-14" aria-labelledby="themes-title">
        <h2 id="themes-title" className="text-xl font-semibold text-slate-900">Parcourir par thème</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {SECTIONS.map(s => {
            const list = inSection(s.id);
            return (
              <div key={s.id} className="rounded-2xl border border-slate-200 p-6">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-lg font-semibold text-slate-900">{s.title}</h3>
                  <span className="text-xs text-slate-400">{list.length} page{list.length > 1 ? 's' : ''}</span>
                </div>
                <p className="mt-1 text-sm text-slate-500">{s.description}</p>
                <ul className="mt-4 space-y-1.5">
                  {list.slice(0, 5).map(a => (
                    <li key={a.slug}><Link to={`/documentation/${a.slug}`} className="text-sm text-slate-700 hover:text-emerald-700 hover:underline">{a.title}</Link></li>
                  ))}
                  {list.length > 5 && (
                    <li><Link to={`/documentation/${list[0].slug}`} className="text-sm font-medium text-emerald-700 hover:underline">Voir les {list.length} pages →</Link></li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
