import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info, X, AlertTriangle } from 'lucide-react';
import api from '@/services/api';

interface Methodology {
  method_version: string;
  steps: string[];
  rating_thresholds: { rating: string; min_score: number }[];
  default_sector_weights: Record<string, Record<string, number>>;
  indicators: { code: string; name: string; unit: string; range_min: number; range_max: number; higher_is_better: boolean }[];
  size_adjustment?: { scaled_indicators: string[]; reference_employees: number; description: string };
  completeness_definition: string;
  confidence_rules: string;
  benchmark_definition: string;
  limitations: string[];
}

/** Bouton + fenêtre « Comment ce score est calculé » : tout vient du moteur de calcul, rien n'est écrit en dur ici. */
export default function ScoreMethodology({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Methodology | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open || data) return;
    api.get('/esg-scoring/methodology').then(r => setData(r.data)).catch(() => setError(true));
  }, [open, data]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-900 hover:underline ${className}`}>
        <Info className="h-3.5 w-3.5" /> Comment ce score est calculé
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="Méthodologie du score ESG"
            className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8" onClick={e => e.stopPropagation()}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Comment ce score est calculé</h2>
                {data && <p className="mt-1 text-xs text-slate-400">Méthode du {data.method_version}</p>}
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && <p className="text-sm text-red-600">Impossible de charger la méthodologie. Réessayez dans un instant.</p>}
            {!data && !error && <p className="text-sm text-slate-500">Chargement…</p>}

            {data && (
              <div className="space-y-6 text-sm text-slate-700">
                <ol className="list-decimal space-y-2 pl-5">{data.steps.map(s => <li key={s}>{s}</li>)}</ol>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                  <p className="mb-2 flex items-center gap-2 font-bold"><AlertTriangle className="h-4 w-4" /> Limites à connaître</p>
                  <ul className="list-disc space-y-1.5 pl-5">{data.limitations.map(l => <li key={l}>{l}</li>)}</ul>
                </div>

                {data.size_adjustment && (
                  <section>
                    <h3 className="mb-2 font-bold text-slate-900">Adapter le score à la taille (option)</h3>
                    <p>{data.size_adjustment.description}</p>
                    <p className="mt-2 text-xs text-slate-500">Indicateurs concernés : {data.size_adjustment.scaled_indicators.join(', ')}. Réglage dans la fiche de chaque organisation.</p>
                  </section>
                )}

                <section>
                  <h3 className="mb-2 font-bold text-slate-900">Ce que veulent dire les chiffres</h3>
                  <p className="mb-2"><span className="font-semibold">Complétude : </span>{data.completeness_definition}</p>
                  <p className="mb-2"><span className="font-semibold">Confiance : </span>{data.confidence_rules}</p>
                  <p><span className="font-semibold">Comparaison : </span>{data.benchmark_definition}</p>
                </section>

                <section>
                  <h3 className="mb-2 font-bold text-slate-900">Ratings</h3>
                  <p className="flex flex-wrap gap-2">
                    {data.rating_thresholds.map(r => (
                      <span key={r.rating} className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs">{r.rating} ≥ {r.min_score}</span>
                    ))}
                  </p>
                </section>

                <section>
                  <h3 className="mb-2 font-bold text-slate-900">Plages de référence des indicateurs</h3>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr><th className="px-3 py-2">Indicateur</th><th className="px-3 py-2">Plage</th><th className="px-3 py-2">Meilleur</th></tr>
                      </thead>
                      <tbody>
                        {data.indicators.map(i => (
                          <tr key={i.code} className="border-t border-slate-100">
                            <td className="px-3 py-1.5">{i.name} <span className="font-mono text-slate-400">{i.code}</span></td>
                            <td className="px-3 py-1.5 tabular-nums">{i.range_min} – {i.range_max} {i.unit}</td>
                            <td className="px-3 py-1.5">{i.higher_is_better ? 'plus haut' : 'plus bas'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section>
                  <h3 className="mb-2 font-bold text-slate-900">Pondérations E / S / G par secteur (par défaut)</h3>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500"><tr><th className="px-3 py-2">Secteur</th><th className="px-3 py-2">E</th><th className="px-3 py-2">S</th><th className="px-3 py-2">G</th></tr></thead>
                      <tbody>
                        {Object.entries(data.default_sector_weights).map(([k, w]) => (
                          <tr key={k} className="border-t border-slate-100"><td className="px-3 py-1.5 capitalize">{k}</td><td className="px-3 py-1.5">{w.E} %</td><td className="px-3 py-1.5">{w.S} %</td><td className="px-3 py-1.5">{w.G} %</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
