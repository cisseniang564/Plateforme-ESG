import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/** Cadre commun des pages publiques de la section Ressources (barre, titre de l'onglet, pied de page). */
export default function ResourcesShell({ title, children }: { title: string; children: ReactNode }) {
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} · ESGFlow`;
    return () => { document.title = previous; };
  }, [title]);

  return (
    <div className="min-h-screen bg-[#f6f7f4] font-sans text-slate-900 antialiased">
      <nav className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/resources" className="flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Ressources
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/documentation" className="hidden rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 sm:block">Documentation</Link>
            <Link to="/register" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700">
              Essai gratuit
            </Link>
          </div>
        </div>
      </nav>
      {children}
      <footer className="border-t border-slate-200 py-8 text-center text-xs text-slate-400">
        © 2026 GreenConnect SAS ·{' '}
        <Link to="/" className="hover:text-slate-600">Accueil</Link> ·{' '}
        <Link to="/privacy-policy" className="hover:text-slate-600">Confidentialité</Link> ·{' '}
        <Link to="/legal-notice" className="hover:text-slate-600">Mentions légales</Link>
      </footer>
    </div>
  );
}
