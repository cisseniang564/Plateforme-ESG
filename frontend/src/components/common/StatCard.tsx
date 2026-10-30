import type { ReactNode } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: ReactNode;
  /** Évolution en % (positif = hausse). */
  delta?: number;
  /** Pour certains indicateurs (émissions), une baisse est une bonne nouvelle. */
  lowerIsBetter?: boolean;
  hint?: string;
  icon?: ReactNode;
}

/** Carte « chiffre clé » : même présentation pour tous les indicateurs. */
export default function StatCard({ label, value, delta, lowerIsBetter = false, hint, icon }: StatCardProps) {
  const good = delta === undefined ? true : lowerIsBetter ? delta <= 0 : delta >= 0;
  const Trend = delta !== undefined && delta < 0 ? TrendingDown : TrendingUp;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-kpi hover:shadow-kpi-hover transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
      <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 tabular-nums">{value}</p>
      <div className="mt-2 flex items-center gap-2 text-xs">
        {delta !== undefined && (
          <span className={`inline-flex items-center gap-1 font-semibold ${good ? 'text-emerald-600' : 'text-red-600'}`}>
            <Trend className="h-3.5 w-3.5" aria-hidden="true" />
            {delta > 0 ? '+' : ''}{delta.toFixed(1)} %
          </span>
        )}
        {hint && <span className="text-gray-500">{hint}</span>}
      </div>
    </div>
  );
}
