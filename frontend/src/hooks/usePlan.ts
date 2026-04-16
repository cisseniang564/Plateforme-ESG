/**
 * usePlan — fetches the current tenant's plan tier and feature gates.
 * Caches the result for the lifetime of the page (no re-fetch on re-render).
 *
 * Usage:
 *   const { plan, can, loading } = usePlan()
 *   if (!can('ai_narrative')) return <PlanGate feature="ai_narrative" />
 */
import { useState, useEffect, useRef } from 'react'
import { api } from '@/services/api'

export type FeatureKey =
  | 'basic_reports'
  | 'csrd_report'
  | 'sfdr_report'
  | 'dpef_report'
  | 'carbon_report'
  | 'ai_narrative'
  | 'fec_import'
  | 'advanced_connectors'
  | 'materiality_matrix'
  | 'esrs_gap_analysis'
  | 'supply_chain_esg'
  | 'benchmark'
  | 'api_access'
  | 'data_export'
  | 'multi_standard'

export interface PlanData {
  plan_tier: string
  max_users: number
  max_orgs: number
  max_monthly_api_calls: number
  features: Record<FeatureKey, boolean>
  feature_min_plan: Record<FeatureKey, string>
  is_free: boolean
  is_trial: boolean
}

const DEFAULT_PLAN: PlanData = {
  plan_tier: 'free',
  max_users: 3,
  max_orgs: 5,
  max_monthly_api_calls: 1000,
  features: {
    basic_reports: true,
    csrd_report: false,
    sfdr_report: false,
    dpef_report: false,
    carbon_report: false,
    ai_narrative: false,
    fec_import: false,
    advanced_connectors: false,
    materiality_matrix: true,
    esrs_gap_analysis: false,
    supply_chain_esg: false,
    benchmark: false,
    api_access: false,
    data_export: false,
    multi_standard: false,
  },
  feature_min_plan: {
    basic_reports: 'Free',
    csrd_report: 'Starter',
    sfdr_report: 'Pro',
    dpef_report: 'Starter',
    carbon_report: 'Starter',
    ai_narrative: 'Pro',
    fec_import: 'Starter',
    advanced_connectors: 'Pro',
    materiality_matrix: 'Free',
    esrs_gap_analysis: 'Starter',
    supply_chain_esg: 'Starter',
    benchmark: 'Pro',
    api_access: 'Starter',
    data_export: 'Starter',
    multi_standard: 'Pro',
  },
  is_free: true,
  is_trial: false,
}

// Module-level cache so multiple components share the same request
let _cache: PlanData | null = null
let _pending: Promise<PlanData> | null = null

async function fetchPlan(): Promise<PlanData> {
  if (_cache) return _cache
  if (_pending) return _pending
  _pending = api
    .get<PlanData>('/billing/features')
    .then(res => {
      _cache = res.data
      _pending = null
      return res.data
    })
    .catch(() => {
      _pending = null
      return DEFAULT_PLAN
    })
  return _pending
}

interface UsePlanResult {
  plan: PlanData
  loading: boolean
  /** Returns true if the feature is available on the current plan */
  can: (feature: FeatureKey) => boolean
  /** Returns the minimum plan name required for a feature */
  minPlan: (feature: FeatureKey) => string
}

export function usePlan(): UsePlanResult {
  const [plan, setPlan] = useState<PlanData>(_cache ?? DEFAULT_PLAN)
  const [loading, setLoading] = useState(!_cache)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    if (_cache) {
      setPlan(_cache)
      setLoading(false)
      return
    }
    fetchPlan().then(data => {
      if (mounted.current) {
        setPlan(data)
        setLoading(false)
      }
    })
    return () => { mounted.current = false }
  }, [])

  const can = (feature: FeatureKey): boolean => plan.features[feature] ?? false
  const minPlan = (feature: FeatureKey): string => plan.feature_min_plan[feature] ?? 'Starter'

  return { plan, loading, can, minPlan }
}

/** Invalidate the module-level cache (call after plan upgrade). */
export function invalidatePlanCache() {
  _cache = null
  _pending = null
}
