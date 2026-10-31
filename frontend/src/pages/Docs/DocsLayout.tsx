import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Leaf, Menu, Search, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ARTICLES, SECTIONS, inSection, searchArticles } from './content';

/** Champ de recherche avec résultats en liste déroulante (clavier : ↑ ↓ Entrée Échap). */
function SearchBox({ autoFocus = false, onPick }: { autoFocus?: boolean; onPick?: () => void }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const results = useMemo(() => searchArticles(q).slice(0, 8), [q]);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const go = (slug: string) => { setOpen(false); setQ(''); onPick?.(); navigate(`/documentation/${slug}`); };

  return (
    <div ref={box} className="relative w-full">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
      <input
        value={q}
        autoFocus={autoFocus}
        onChange={e => { setQ(e.target.value); setOpen(true); setActive(0); }}
        onFocus={() => setOpen(true)}
        onKeyDown={e => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
          else if (e.key === 'Enter' && results[active]) go(results[active].slug);
          else if (e.key === 'Escape') setOpen(false);
        }}
        placeholder="Rechercher une page, une fonction…"
        aria-label="Rechercher dans la documentation"
        role="combobox"
        aria-expanded={open && q.length > 1}
        aria-controls="docs-search-results"
        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
      />
      {open && q.trim().length > 1 && (
        <ul id="docs-search-results" role="listbox" className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
          {results.length === 0 ? (
            <li className="px-3 py-3 text-sm text-slate-500">Aucun résultat pour « {q} ».</li>
          ) : results.map((a, i) => (
            <li key={a.slug} role="option" aria-selected={i === active}>
              <button type="button" onMouseEnter={() => setActive(i)} onClick={() => go(a.slug)}
                className={`block w-full rounded-lg px-3 py-2 text-left ${i === active ? 'bg-emerald-50' : ''}`}>
                <span className="block text-sm font-medium text-slate-900">{a.title}</span>
                <span className="block truncate text-xs text-slate-500">{SECTIONS.find(s => s.id === a.section)?.title} · {a.summary}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export { SearchBox };

export default function DocsLayout() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { setMenuOpen(false); window.scrollTo({ top: 0 }); }, [location.pathname]);

  const nav = (
    <nav aria-label="Sommaire de la documentation" className="space-y-6 pb-10">
      <NavLink to="/documentation" end className={({ isActive }) => `block rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-emerald-50 text-emerald-800' : 'text-slate-700 hover:bg-slate-50'}`}>
        Accueil de la documentation
      </NavLink>
      {SECTIONS.map(s => (
        <div key={s.id}>
          <p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{s.title}</p>
          <ul className="mt-2 space-y-0.5">
            {inSection(s.id).map(a => (
              <li key={a.slug}>
                <NavLink to={`/documentation/${a.slug}`} className={({ isActive }) =>
                  `block rounded-lg px-3 py-1.5 text-sm leading-snug ${isActive ? 'bg-emerald-50 font-medium text-emerald-800' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                  {a.title}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-white font-sans text-slate-700 antialiased" style={{ colorScheme: 'light', ['--heading-color' as string]: '#0b1f17' }}>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[90rem] items-center gap-4 px-4 sm:px-6">
          <button type="button" className="rounded-lg p-2 text-slate-700 lg:hidden" aria-label="Sommaire" aria-expanded={menuOpen} onClick={() => setMenuOpen(o => !o)}>
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Link to="/" className="flex flex-none items-center gap-2 font-semibold text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white"><Leaf className="h-4 w-4" /></span>
            <span className="hidden sm:inline">ESGFlow</span>
          </Link>
          <Link to="/documentation" className="hidden items-center gap-1.5 border-l border-slate-200 pl-4 text-sm font-medium text-slate-600 hover:text-slate-900 sm:flex">
            <BookOpen className="h-4 w-4" aria-hidden="true" /> Documentation
          </Link>
          <div className="mx-auto hidden w-full max-w-md md:block"><SearchBox /></div>
          <div className="ml-auto flex items-center gap-2">
            {isAuthenticated ? (
              <Link to="/app" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">Ouvrir la plateforme</Link>
            ) : (
              <>
                <Link to="/login" className="hidden px-2 text-sm font-medium text-slate-700 hover:text-slate-900 sm:block">Connexion</Link>
                <Link to="/register" className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Essai gratuit</Link>
              </>
            )}
          </div>
        </div>
        <div className="border-t border-slate-100 px-4 py-2 md:hidden"><SearchBox /></div>
      </header>

      <div className="mx-auto flex max-w-[90rem]">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-72 flex-none overflow-y-auto border-r border-slate-100 px-4 py-6 lg:block">{nav}</aside>
        {menuOpen && (
          <div className="fixed inset-x-0 bottom-0 top-16 z-30 overflow-y-auto bg-white px-4 py-4 lg:hidden">{nav}</div>
        )}
        <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:px-12" id="docs-main">
          <Outlet />
          <footer className="mt-16 border-t border-slate-100 pt-6 text-sm text-slate-500">
            {ARTICLES.length} pages documentées · Une page manque ou une explication n&apos;est pas claire ?{' '}
            <Link to="/contact" className="font-medium text-emerald-700 hover:underline">Écrivez-nous</Link>
          </footer>
        </main>
      </div>
    </div>
  );
}
