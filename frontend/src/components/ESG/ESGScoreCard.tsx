import { TrendingUp, TrendingDown, Minus, Award, AlertCircle, Leaf, Users, Landmark } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { getConfidenceInfo } from '@/utils/confidenceLevel';

interface ESGScoreCardProps {
  score: {
    overall_score: number;
    rating: string;
    pillar_scores: {
      environmental: number;
      social: number;
      governance: number;
    };
    confidence_level: string;
    data_completeness: number;
    percentile_rank?: number;
    sector_median?: number;
  };
  previousScore?: number;
}

/* ── Rating metadata ──────────────────────────────────────────────────── */
const getRatingMetaMap = (t: TFunction): Record<string, { badge: string; ringColor: string; label: string }> => ({
  AAA: { badge: 'bg-emerald-50 text-emerald-800 border-emerald-200', ringColor: '#10b981', label: t('escard.excellent', 'Excellent') },
  AA:  { badge: 'bg-green-50 text-green-800 border-green-200',       ringColor: '#22c55e', label: t('escard.veryGood', 'Très bien') },
  A:   { badge: 'bg-lime-50 text-lime-800 border-lime-200',          ringColor: '#84cc16', label: t('escard.good', 'Bien') },
  BBB: { badge: 'bg-blue-50 text-blue-800 border-blue-200',          ringColor: '#3b82f6', label: t('escard.satisfactory', 'Satisfaisant') },
  BB:  { badge: 'bg-sky-50 text-sky-800 border-sky-200',             ringColor: '#38bdf8', label: t('escard.average', 'Moyen') },
  B:   { badge: 'bg-indigo-50 text-indigo-800 border-indigo-200',    ringColor: '#818cf8', label: t('escard.limited', 'Limité') },
  CCC: { badge: 'bg-amber-50 text-amber-800 border-amber-200',       ringColor: '#f59e0b', label: t('escard.insufficient', 'Insuffisant') },
  CC:  { badge: 'bg-orange-50 text-orange-800 border-orange-200',    ringColor: '#f97316', label: t('escard.weak', 'Faible') },
  C:   { badge: 'bg-red-50 text-red-800 border-red-200',             ringColor: '#ef4444', label: t('escard.critical', 'Critique') },
});

function getRatingMeta(r: string, t: TFunction) {
  return getRatingMetaMap(t)[r] ?? { badge: 'bg-gray-50 text-gray-700 border-gray-200', ringColor: '#9ca3af', label: '—' };
}

/* ── Animated score ring ────────────────────────────────────────────────── */
function ScoreRing({ score, ringColor }: { score: number; ringColor: string }) {
  const R = 56;
  const circ = 2 * Math.PI * R;
  const dash = (Math.min(Math.max(score, 0), 100) / 100) * circ;
  return (
    <svg width="152" height="152" viewBox="0 0 152 152">
      <defs>
        <linearGradient id="sRingGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={ringColor} stopOpacity="0.7" />
          <stop offset="100%" stopColor={ringColor} />
        </linearGradient>
      </defs>
      {/* Track */}
      <circle cx="76" cy="76" r={R} fill="none" stroke="#f3f4f6" strokeWidth="13" />
      {/* Progress */}
      <circle
        cx="76" cy="76" r={R}
        fill="none"
        stroke="url(#sRingGrad)"
        strokeWidth="13"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ - dash}`}
        transform="rotate(-90 76 76)"
        style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)' }}
      />
      <text x="76" y="70" textAnchor="middle" fontSize="34" fontWeight="700" fill="#111827" fontFamily="system-ui,sans-serif">
        {Math.round(score)}
      </text>
      <text x="76" y="90" textAnchor="middle" fontSize="13" fill="#9ca3af" fontFamily="system-ui,sans-serif">
        / 100
      </text>
    </svg>
  );
}

/* ── Pillar bar ─────────────────────────────────────────────────────────── */
function PillarBar({
  label, icon: Icon, value, color, bgColor,
}: {
  label: string; icon: React.ElementType; value: number; color: string; bgColor: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${bgColor}`}>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-600">{label}</span>
          <span className="text-sm font-bold" style={{ color }}>{Math.round(value)}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${Math.min(Math.max(value, 0), 100)}%`, backgroundColor: color }}
          />
        </div>
      </div>
    </div>
  );
}

/* ── Confidence chip ─────────────────────────────────────────────────────── */
function ConfidenceChip({ level }: { level: string }) {
  const { t } = useTranslation();
  const map: Record<string, { cls: string; label: string }> = {
    high:     { cls: 'bg-green-50 text-green-700 border-green-200',   label: t('escard.confHigh', '● Élevée') },
    medium:   { cls: 'bg-blue-50 text-blue-700 border-blue-200',      label: t('escard.confMedium', '● Moyenne') },
    low:      { cls: 'bg-amber-50 text-amber-700 border-amber-200',   label: t('escard.confLow', '● Faible') },
    very_low: { cls: 'bg-orange-50 text-orange-700 border-orange-200', label: t('escard.confVeryLow', '● Très faible') },
    none:     { cls: 'bg-gray-50 text-gray-600 border-gray-200',      label: t('escard.confNone', '● Aucune donnée') },
  };
  const meta = map[level] ?? { cls: 'bg-gray-50 text-gray-600 border-gray-200', label: level };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.cls}`}>
      {meta.label}
    </span>
  );
}

/* ── Main component ─────────────────────────────────────────────────────── */
export default function ESGScoreCard({ score, previousScore }: ESGScoreCardProps) {
  const { t } = useTranslation();
  const meta = getRatingMeta(score.rating, t);

  const trend = (() => {
    if (!previousScore) return null;
    const diff = score.overall_score - previousScore;
    if (diff > 2)  return { Icon: TrendingUp,   color: '#16a34a', text: `+${diff.toFixed(1)} pts`, bg: 'bg-green-50' };
    if (diff < -2) return { Icon: TrendingDown,  color: '#dc2626', text: `${diff.toFixed(1)} pts`,  bg: 'bg-red-50' };
    return           { Icon: Minus,             color: '#6b7280', text: 'Stable',                   bg: 'bg-gray-50' };
  })();

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      {/* Colored top strip */}
      <div className="h-1.5 w-full" style={{ backgroundColor: meta.ringColor }} />

      <div className="p-6">
        {/* Header: ring + rating */}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Score ring */}
          <div className="flex flex-col items-center">
            <ScoreRing score={score.overall_score} ringColor={meta.ringColor} />
            {trend && (
              <div className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${trend.bg}`}>
                <trend.Icon className="h-3.5 w-3.5" style={{ color: trend.color }} />
                <span style={{ color: trend.color }}>{trend.text}</span>
              </div>
            )}
          </div>

          {/* Rating + stats */}
          <div className="flex flex-1 flex-col items-center gap-3 sm:items-end">
            <div className={`inline-flex flex-col items-center gap-1 rounded-2xl border px-6 py-4 ${meta.badge}`}>
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                <span className="text-3xl font-bold tracking-tight">{score.rating}</span>
              </div>
              <span className="text-xs font-medium opacity-80">{meta.label}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center sm:text-right">
              <div className="rounded-xl bg-gray-50 px-3 py-2">
                <p className="text-xs text-gray-500">{t('escard.completeness', 'Complétude')}</p>
                <p className="text-lg font-bold text-gray-900">{Math.round(score.data_completeness ?? 0)}%</p>
              </div>
              {score.percentile_rank !== undefined ? (
                <div className="rounded-xl bg-gray-50 px-3 py-2">
                  <p className="text-xs text-gray-500">Percentile</p>
                  <p className="text-lg font-bold text-gray-900">{Math.round(score.percentile_rank ?? 0)}%</p>
                </div>
              ) : (
                <div className="rounded-xl bg-gray-50 px-3 py-2">
                  <p className="text-xs text-gray-500">Confiance</p>
                  <div className="mt-1">
                    <ConfidenceChip level={score.confidence_level} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="my-5 border-t border-gray-100" />

        {/* Pillar scores */}
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Scores par pilier</p>
          <PillarBar
            label="Environnement"
            icon={Leaf}
            value={score.pillar_scores?.environmental ?? 0}
            color="#16a34a"
            bgColor="bg-green-50"
          />
          <PillarBar
            label="Social"
            icon={Users}
            value={score.pillar_scores?.social ?? 0}
            color="#2563eb"
            bgColor="bg-blue-50"
          />
          <PillarBar
            label="Gouvernance"
            icon={Landmark}
            value={score.pillar_scores?.governance ?? 0}
            color="#7c3aed"
            bgColor="bg-purple-50"
          />
        </div>

        {/* Sector median */}
        {score.sector_median !== undefined && (
          <div className="mt-5 flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
            <span className="text-xs text-gray-500">{t('escard.sectorMedian', 'Médiane sectorielle')}</span>
            <span className="text-sm font-bold text-gray-800">{Math.round(score.sector_median ?? 0)} / 100</span>
          </div>
        )}

        {/* Low confidence warning (low / very_low / none) */}
        {(() => {
          const confidenceInfo = getConfidenceInfo(score.confidence_level, t);
          if (!confidenceInfo.isLowData) return null;
          return (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-semibold text-amber-900">{confidenceInfo.label}</p>
                <p className="mt-0.5 text-xs text-amber-700">{confidenceInfo.description}</p>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
