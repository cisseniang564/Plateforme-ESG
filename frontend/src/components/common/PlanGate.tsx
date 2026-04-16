/**
 * PlanGate — blocks access to premium features and shows an upgrade prompt.
 *
 * Usage (full page block):
 *   <PlanGate feature="ai_narrative" minPlan="Pro">
 *     <ActualContent />
 *   </PlanGate>
 *
 * Usage (inline banner only, no children):
 *   <PlanGate feature="sfdr_report" minPlan="Pro" inline />
 *
 * Usage (button wrapper):
 *   <PlanGate feature="benchmark" minPlan="Pro" asButton onClick={handleClick}>
 *     Voir le benchmark
 *   </PlanGate>
 */
import { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Zap, ArrowRight, Star } from 'lucide-react'
import { usePlan, FeatureKey } from '@/hooks/usePlan'

interface PlanGateProps {
  feature: FeatureKey
  /** Override the minimum plan label shown in the CTA (defaults to hook value) */
  minPlan?: string
  /** Children to render when access is granted */
  children?: ReactNode
  /** If true, renders a compact inline banner instead of a full overlay */
  inline?: boolean
  /** If true, renders as a locked button wrapper */
  asButton?: boolean
  /** Extra className for the wrapper */
  className?: string
}

const PLAN_COLORS: Record<string, { bg: string; border: string; badge: string; text: string; btn: string }> = {
  Starter: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
    text: 'text-blue-700',
    btn: 'bg-blue-600 hover:bg-blue-700',
  },
  Pro: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    badge: 'bg-purple-100 text-purple-700',
    text: 'text-purple-700',
    btn: 'bg-purple-600 hover:bg-purple-700',
  },
  Enterprise: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-700',
    text: 'text-amber-700',
    btn: 'bg-amber-600 hover:bg-amber-700',
  },
}

const FEATURE_LABELS: Partial<Record<FeatureKey, string>> = {
  csrd_report: 'Rapports CSRD',
  sfdr_report: 'Rapports SFDR',
  dpef_report: 'Rapports DPEF',
  carbon_report: 'Bilan Carbone ADEME',
  ai_narrative: 'Génération IA ESRS',
  fec_import: 'Import FEC comptable',
  advanced_connectors: 'Connecteurs avancés',
  esrs_gap_analysis: 'Analyse ESRS / DMA',
  supply_chain_esg: "Chaîne d'approvisionnement",
  benchmark: 'Benchmarking sectoriel',
  api_access: 'Accès API',
  data_export: 'Export de données',
  multi_standard: 'Multi-référentiels',
}

export default function PlanGate({ feature, minPlan: minPlanOverride, children, inline = false, className = '' }: PlanGateProps) {
  const { can, minPlan, loading } = usePlan()
  const navigate = useNavigate()

  // While loading, render children (optimistic — avoids flash)
  if (loading) return <>{children}</>

  // Access granted
  if (can(feature)) return <>{children}</>

  const requiredPlan = minPlanOverride ?? minPlan(feature)
  const colors = PLAN_COLORS[requiredPlan] ?? PLAN_COLORS['Starter']
  const featureLabel = FEATURE_LABELS[feature] ?? feature

  const handleUpgrade = () => navigate('/app/billing')

  // ── Inline banner (no children overlay) ──────────────────────────────────
  if (inline) {
    return (
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${colors.bg} ${colors.border} ${className}`}>
        <Lock size={15} className={`${colors.text} flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <span className={`text-sm font-medium ${colors.text}`}>
            {featureLabel}
          </span>
          <span className="text-xs text-gray-500 ml-2">
            Disponible avec le plan
          </span>
          <span className={`ml-1.5 text-xs font-semibold px-1.5 py-0.5 rounded ${colors.badge}`}>
            {requiredPlan}
          </span>
        </div>
        <button
          onClick={handleUpgrade}
          className={`flex items-center gap-1.5 px-3 py-1.5 ${colors.btn} text-white text-xs font-semibold rounded-lg transition-colors flex-shrink-0`}
        >
          <Zap size={12} />
          Mettre à niveau
        </button>
      </div>
    )
  }

  // ── Full page gate (overlays children) ────────────────────────────────────
  return (
    <div className={`relative ${className}`}>
      {/* Blurred preview of children */}
      {children && (
        <div className="pointer-events-none select-none blur-sm opacity-40 overflow-hidden max-h-64">
          {children}
        </div>
      )}

      {/* Upgrade overlay */}
      <div className={`${children ? 'absolute inset-0' : ''} flex items-center justify-center`}>
        <div className={`mx-auto max-w-md w-full rounded-2xl border-2 ${colors.border} ${colors.bg} p-8 text-center shadow-lg`}>
          {/* Icon */}
          <div className={`w-14 h-14 mx-auto mb-4 rounded-full ${colors.badge} flex items-center justify-center`}>
            <Star size={24} className={colors.text} />
          </div>

          {/* Badge */}
          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${colors.badge} mb-3`}>
            <Zap size={11} />
            Plan {requiredPlan} requis
          </span>

          <h3 className="text-lg font-bold text-gray-800 mb-2">{featureLabel}</h3>
          <p className="text-sm text-gray-500 mb-6">
            Cette fonctionnalité est disponible à partir du plan{' '}
            <span className={`font-semibold ${colors.text}`}>{requiredPlan}</span>.
            Mettez à niveau pour y accéder.
          </p>

          <button
            onClick={handleUpgrade}
            className={`w-full flex items-center justify-center gap-2 px-5 py-3 ${colors.btn} text-white font-semibold rounded-xl transition-colors`}
          >
            <Zap size={15} />
            Passer au plan {requiredPlan}
            <ArrowRight size={15} />
          </button>

          <p className="text-xs text-gray-400 mt-3">
            Annulation à tout moment · Sans engagement
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * PlanBadge — small inline badge showing the minimum plan for a feature.
 * Use in menus/tooltips.
 */
export function PlanBadge({ feature }: { feature: FeatureKey }) {
  const { minPlan } = usePlan()
  const plan = minPlan(feature)
  const colors = PLAN_COLORS[plan] ?? PLAN_COLORS['Starter']
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-semibold ${colors.badge}`}>
      <Lock size={9} />
      {plan}
    </span>
  )
}
