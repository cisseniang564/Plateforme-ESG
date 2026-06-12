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
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'

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
  PME: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700',
    text: 'text-emerald-700',
    btn: 'bg-emerald-600 hover:bg-emerald-700',
  },
  ETI: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
    text: 'text-blue-700',
    btn: 'bg-blue-600 hover:bg-blue-700',
  },
  Groupe: {
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    badge: 'bg-violet-100 text-violet-700',
    text: 'text-violet-700',
    btn: 'bg-violet-600 hover:bg-violet-700',
  },
  Enterprise: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-700',
    text: 'text-amber-700',
    btn: 'bg-amber-600 hover:bg-amber-700',
  },
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
}

const getFeatureLabels = (t: TFunction): Partial<Record<FeatureKey, string>> => ({
  csrd_report: t('gate.csrdReport', 'Rapports CSRD'),
  sfdr_report: t('gate.sfdrReport', 'Rapports SFDR'),
  dpef_report: t('gate.dpefReport', 'Rapports DPEF'),
  carbon_report: t('gate.carbonReport', 'Bilan Carbone ADEME'),
  ai_narrative: t('gate.aiNarrative', 'Génération IA ESRS'),
  fec_import: t('gate.fecImport', 'Import FEC comptable'),
  advanced_connectors: t('gate.advConnectors', 'Connecteurs avancés'),
  esrs_gap_analysis: t('gate.esrsGap', 'Analyse ESRS / DMA'),
  supply_chain_esg: t('gate.supplyChain', "Chaîne d'approvisionnement"),
  benchmark: t('gate.benchmark', 'Benchmarking sectoriel'),
  api_access: t('gate.apiAccess', 'Accès API'),
  data_export: t('gate.dataExport', 'Export de données'),
  multi_standard: t('gate.multiStandard', 'Multi-référentiels'),
})

export default function PlanGate({ feature, minPlan: minPlanOverride, children, inline = false, className = '' }: PlanGateProps) {
  const { t } = useTranslation()
  const { can, minPlan, loading } = usePlan()
  const navigate = useNavigate()
  const FEATURE_LABELS = getFeatureLabels(t)

  // While loading, render children (optimistic — avoids flash)
  if (loading) return <>{children}</>

  // Access granted
  if (can(feature)) return <>{children}</>

  const requiredPlan = minPlanOverride ?? minPlan(feature)
  const colors = PLAN_COLORS[requiredPlan] ?? PLAN_COLORS['PME']
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
            {t('gate.availableWith', 'Disponible avec le plan')}
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
          {t('gate.upgrade', 'Mettre à niveau')}
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
            {t('gate.planRequired', 'Plan {{plan}} requis', { plan: requiredPlan })}
          </span>

          <h3 className="text-lg font-bold text-gray-800 mb-2">{featureLabel}</h3>
          <p className="text-sm text-gray-500 mb-6">
            {t('gate.overlayDescA', 'Cette fonctionnalité est disponible à partir du plan')}{' '}
            <span className={`font-semibold ${colors.text}`}>{requiredPlan}</span>.{' '}
            {t('gate.overlayDescB', 'Mettez à niveau pour y accéder.')}
          </p>

          <button
            onClick={handleUpgrade}
            className={`w-full flex items-center justify-center gap-2 px-5 py-3 ${colors.btn} text-white font-semibold rounded-xl transition-colors`}
          >
            <Zap size={15} />
            {t('gate.switchTo', 'Passer au plan {{plan}}', { plan: requiredPlan })}
            <ArrowRight size={15} />
          </button>

          <p className="text-xs text-gray-400 mt-3">
            {t('gate.noCommitment', 'Annulation à tout moment · Sans engagement')}
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
  const colors = PLAN_COLORS[plan] ?? PLAN_COLORS['PME']
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-semibold ${colors.badge}`}>
      <Lock size={9} />
      {plan}
    </span>
  )
}
