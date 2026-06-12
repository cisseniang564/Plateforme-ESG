/**
 * PageHero — Signature hero component for in-app pages.
 *
 * One gradient. One pattern. Used everywhere inside the authenticated app
 * (≠ landing page, which has its own marketing hero).
 *
 * Design tokens:
 *   - Base: slate-950 → slate-900 (sober, premium, Linear/Stripe-coded)
 *   - Accent: emerald-500 radial glow (brand color, single accent point)
 *   - Optional pattern overlay (dotted grid, subtle)
 *
 * Replaces the dozens of per-page gradients that fragmented the visual
 * identity (emerald/teal for LCA, slate/blue/indigo for Validation,
 * navy/violet for Benchmarking, etc.).
 */
import { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

interface PageHeroProps {
  /** Top-line page title — short noun phrase, no period. */
  title: string;
  /** One-line description under the title. Keep < 140 chars. */
  description?: string;
  /** Optional badge label at the top (e.g. "Phase 6 · ISAE 3000"). */
  badge?: string;
  /** Optional icon shown next to the badge. */
  badgeIcon?: LucideIcon;
  /** Optional icon shown in the corner / next to the title. */
  icon?: LucideIcon;
  /** Right-side action buttons (Refresh, Settings, etc.). */
  actions?: ReactNode;
  /** Optional bottom KPI row (3-4 metrics). */
  kpis?: Array<{ label: string; value: string | number; sub?: string }>;
  /** Optional "back" link in top-left. */
  backTo?: string;
  /** Compact mode — reduces padding for secondary pages. */
  compact?: boolean;
}

export default function PageHero({
  title, description, badge, badgeIcon: BadgeIcon, icon: Icon,
  actions, kpis, backTo, compact = false,
}: PageHeroProps) {
  const navigate = useNavigate();
  const padY = compact ? 'py-6' : 'py-10';

  return (
    <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-900 text-white ${padY} px-6 md:px-8 shadow-xl mb-6`}>
      {/* Single accent point — emerald radial glow */}
      <div
        className="absolute inset-0 opacity-100 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 80% 20%, rgba(16,185,129,0.18), transparent 55%)',
        }}
      />
      {/* Subtle dotted grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative">
        {/* Optional back link */}
        {backTo && (
          <button
            onClick={() => navigate(backTo)}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-3 font-medium"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour
          </button>
        )}

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            {/* Badge — single chip with brand-tone background */}
            {badge && (
              <div className="inline-flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full mb-3">
                {BadgeIcon && <BadgeIcon className="h-3 w-3" />}
                {badge}
              </div>
            )}

            {/* Title row */}
            <div className="flex items-center gap-3">
              {Icon && (
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                  <Icon className="h-5 w-5 text-emerald-300" />
                </div>
              )}
              <h1 className={`${compact ? 'text-xl md:text-2xl' : 'text-2xl md:text-3xl'} font-bold leading-tight tracking-tight`}>
                {title}
              </h1>
            </div>

            {description && (
              <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
                {description}
              </p>
            )}
          </div>

          {actions && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>

        {/* Optional KPI row */}
        {kpis && kpis.length > 0 && (
          <div className={`grid grid-cols-2 sm:grid-cols-${Math.min(kpis.length, 4)} gap-4 mt-6 pt-6 border-t border-white/10`}>
            {kpis.map((kpi, i) => (
              <div key={i}>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{kpi.label}</p>
                <p className="text-2xl font-bold tabular-nums mt-0.5">{kpi.value}</p>
                {kpi.sub && <p className="text-xs text-slate-400 mt-0.5">{kpi.sub}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Action button helpers (for the actions prop) ──────────────────────────

/** Secondary button styled for the dark hero. */
export function PageHeroButton({
  onClick, children, disabled = false, icon: Icon,
}: { onClick?: () => void; children: ReactNode; disabled?: boolean; icon?: LucideIcon }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/15 border border-white/15 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors disabled:opacity-50"
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}

/** Primary button styled for the dark hero (brand emerald). */
export function PageHeroPrimaryButton({
  onClick, children, disabled = false, icon: Icon,
}: { onClick?: () => void; children: ReactNode; disabled?: boolean; icon?: LucideIcon }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold px-3.5 py-2 rounded-lg transition-colors disabled:opacity-50 shadow-md shadow-emerald-500/20"
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}
