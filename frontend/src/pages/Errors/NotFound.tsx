import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function NotFound() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        {/* Big 404 */}
        <div className="relative mb-8">
          <p className="text-[10rem] font-black text-slate-100 leading-none select-none">
            404
          </p>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-xl px-8 py-5 border border-slate-100">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🌿</span>
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest">ESGFlow</p>
                  <p className="text-lg font-bold text-slate-800">Page introuvable</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-slate-800 mb-3">
          Cette page n'existe pas
        </h1>
        <p className="text-slate-500 mb-8 leading-relaxed">
          La page que vous recherchez a peut-être été déplacée, renommée ou n'existe tout simplement plus.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50 transition-colors"
          >
            ← Retour
          </button>
          <button
            onClick={() => navigate(isAuthenticated ? '/app' : '/login')}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors"
          >
            {isAuthenticated ? 'Tableau de bord' : 'Se connecter'}
          </button>
        </div>

        <p className="mt-10 text-xs text-slate-400">
          Code d'erreur : 404 · Not Found
        </p>
      </div>
    </div>
  );
}
