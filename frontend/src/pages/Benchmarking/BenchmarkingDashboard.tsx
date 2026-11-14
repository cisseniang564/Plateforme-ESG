import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts'
import {
  BarChart3, TrendingUp, Award, Target, Download, RefreshCw, ChevronDown, CheckCircle, AlertTriangle,
} from 'lucide-react'
import api from '@/services/api'
import { usePlan } from '@/hooks/usePlan'
import PlanGate from '@/components/common/PlanGate'
import PageHero from '@/components/layout/PageHero'

type SectorKey = 'general' | 'energie' | 'finance' | 'industrie' | 'services' | 'immobilier' | 'sante' | 'technologie' | 'agriculture'

const SECTORS: { value: SectorKey; labelKey: string; emoji: string }[] = [
  { value: 'general',      labelKey: 'benchmarking.sectorAll',         emoji: '🌐' },
  { value: 'energie',      labelKey: 'benchmarking.sectorEnergy',      emoji: '⚡' },
  { value: 'finance',      labelKey: 'benchmarking.sectorFinance',     emoji: '🏦' },
  { value: 'industrie',    labelKey: 'benchmarking.sectorIndustry',    emoji: '🏭' },
  { value: 'services',     labelKey: 'benchmarking.sectorServices',    emoji: '💼' },
  { value: 'immobilier',   labelKey: 'benchmarking.sectorRealEstate',  emoji: '🏢' },
  { value: 'sante',        labelKey: 'benchmarking.sectorHealth',      emoji: '🏥' },
  { value: 'technologie',  labelKey: 'benchmarking.sectorTech',        emoji: '💻' },
  { value: 'agriculture',  labelKey: 'benchmarking.sectorAgriculture', emoji: '🌾' },
]

interface Quartiles { p25: number; median: number; p75: number; top10: number }
interface SectorRef {
  source: 'cross_tenant' | 'insufficient_cohort' | null
  cohort_size: number | null
  distinct_tenants: number | null
  reference_source: string | null
  anonymization_note: string | null
  environmental?: Quartiles
  social?: Quartiles
  governance?: Quartiles
  overall?: Quartiles
  indicators: Record<string, number>
}
interface RealScores { env: number; soc: number; gov: number }

type Pillar = 'environmental' | 'social' | 'governance'

/** Indicateurs de référence sectoriels renvoyés par le backend (aucune valeur "vous"). */
const REF_INDICATORS: { field: string; labelKey: string; label: string; format: (v: number) => string }[] = [
  { field: 'carbon_intensity_per_revenue', labelKey: 'benchmarking.ind.carbon', label: 'Intensité carbone', format: v => `${v.toFixed(1)} tCO₂e/M€` },
  { field: 'renewable_energy_pct',         labelKey: 'benchmarking.ind.renewable', label: 'Énergie renouvelable', format: v => `${v.toFixed(0)} %` },
  { field: 'gender_pay_gap',               labelKey: 'benchmarking.ind.payGap', label: 'Écart de rémunération F/H', format: v => `${v.toFixed(1)} %` },
  { field: 'employee_turnover',            labelKey: 'benchmarking.ind.turnover', label: 'Rotation des effectifs', format: v => `${v.toFixed(0)} %` },
  { field: 'ceo_pay_ratio',                labelKey: 'benchmarking.ind.ceoRatio', label: 'Ratio de rémunération dirigeant', format: v => `${v.toFixed(0)}:1` },
  { field: 'accident_rate',                labelKey: 'benchmarking.ind.accidents', label: "Taux d'accidents", format: v => v.toFixed(1) },
]

/** Échappe une cellule CSV (guillemets + neutralise =,+,-,@ en tête). */
function esc(v: string | number | null | undefined): string {
  let s = v === null || v === undefined ? '' : String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return `"${s.replace(/"/g, '""')}"`
}

/** Position du score global par rapport aux bandes du secteur — descriptive, sans percentile inventé. */
export function positionBand(score: number, q: Quartiles): 'top10' | 'p75' | 'median' | 'p25' | 'below' {
  if (score >= q.top10) return 'top10'
  if (score >= q.p75) return 'p75'
  if (score >= q.median) return 'median'
  if (score >= q.p25) return 'p25'
  return 'below'
}

const BAND_LABEL: Record<string, [string, string]> = {
  top10:  ['benchmarking.band.top10', 'Dans le top 10 % du référentiel'],
  p75:    ['benchmarking.band.p75', 'Entre le 75e centile et le top 10 %'],
  median: ['benchmarking.band.median', 'Entre la médiane et le 75e centile'],
  p25:    ['benchmarking.band.p25', 'Entre le 25e centile et la médiane'],
  below:  ['benchmarking.band.below', 'Sous le 25e centile'],
}

export default function BenchmarkingDashboard() {
  const { t } = useTranslation()
  const { can } = usePlan()
  const [sector, setSector] = useState<SectorKey>('general')
  const [loading, setLoading] = useState(false)
  const [sectorOpen, setSectorOpen] = useState(false)
  const [ref, setRef] = useState<SectorRef | null>(null)
  const [refError, setRefError] = useState<string | null>(null)
  const [realScores, setRealScores] = useState<RealScores | null>(null)
  const [scoresLoaded, setScoresLoaded] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Scores réels de l'organisation
  useEffect(() => {
    let cancelled = false
    const done = () => { if (!cancelled) setScoresLoaded(true) }
    api.get('/scores/latest')
      .then(res => {
        const d = res.data
        if (!cancelled && d?.overall_score > 0) {
          setRealScores({
            env: Math.round(d.environmental_score ?? 0),
            soc: Math.round(d.social_score ?? 0),
            gov: Math.round(d.governance_score ?? 0),
          })
        }
      })
      .catch(() => { /* aucun score disponible : état vide affiché */ })
      .finally(done)
    return () => { cancelled = true }
  }, [])

  const loadSector = useCallback(async (s: SectorKey) => {
    setLoading(true)
    setRefError(null)
    try {
      const res = await api.get(`/benchmarks/sector/${s}`)
      const d = res.data
      if (d?.source !== 'insufficient_cohort' && !d?.environmental) throw new Error('shape')
      setRef({
        source: d.source === 'cross_tenant' ? 'cross_tenant' : 'insufficient_cohort',
        cohort_size: d.cohort_size ?? null,
        distinct_tenants: d.distinct_tenants ?? null,
        reference_source: d.reference_source || null,
        anonymization_note: d.anonymization?.note || null,
        environmental: d.environmental,
        social: d.social,
        governance: d.governance,
        overall: d.overall,
        indicators: d.indicators || {},
      })
    } catch (e: any) {
      setRef(null)
      setRefError(e?.response?.status === 404
        ? t('benchmarking.noRefForSector', "Aucun référentiel disponible pour ce secteur.")
        : t('benchmarking.loadError', 'Impossible de charger les référentiels sectoriels. Réessayez.'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { loadSector(sector) }, [sector, loadSector])

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setSectorOpen(false)
    }
    if (sectorOpen) document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [sectorOpen])

  const yourOverall = realScores ? Math.round((realScores.env + realScores.soc + realScores.gov) / 3) : null
  const overallRef: Quartiles | null = useMemo(() => {
    if (!ref) return null
    if (ref.overall) return ref.overall
    const ps = [ref.environmental, ref.social, ref.governance]
    if (ps.some(p => !p)) return null
    const m = (k: keyof Quartiles) => Math.round(ps.reduce((s, p) => s + (p as Quartiles)[k], 0) / 3)
    return { p25: m('p25'), median: m('median'), p75: m('p75'), top10: m('top10') }
  }, [ref])

  const pillars = useMemo(() => {
    const yours: Record<Pillar, number | null> = {
      environmental: realScores?.env ?? null, social: realScores?.soc ?? null, governance: realScores?.gov ?? null,
    }
    const names: Record<Pillar, string> = {
      environmental: t('benchmarking.environment', 'Environnement'),
      social: t('benchmarking.social', 'Social'),
      governance: t('benchmarking.governance', 'Gouvernance'),
    }
    return (['environmental', 'social', 'governance'] as Pillar[]).map(k => ({
      key: k, name: names[k], your: yours[k], q: ref?.[k] ?? null,
    }))
  }, [realScores, ref, t])

  const barData = pillars.map(p => ({
    pillar: p.name,
    [t('benchmarking.yourScore', 'Votre score')]: p.your,
    [t('benchmarking.sectorMedian', 'Médiane du secteur')]: p.q?.median ?? null,
    'Top 25 %': p.q?.p75 ?? null,
    'Top 10 %': p.q?.top10 ?? null,
  }))

  const radarData = pillars.map(p => ({ metric: p.name, you: p.your ?? 0, sector: p.q?.median ?? 0 }))
  const canCompare = !!realScores && !!ref

  const band = yourOverall !== null && overallRef ? positionBand(yourOverall, overallRef) : null

  const strengths: string[] = []
  const improvements: string[] = []
  if (canCompare) {
    pillars.forEach(p => {
      if (p.your === null || !p.q) return
      const delta = Math.round(p.your - p.q.median)
      if (delta >= 0) strengths.push(t('benchmarking.strengthAbove', '{{name}} : {{your}}/100, soit {{delta}} pts au-dessus de la médiane du référentiel', { name: p.name, your: p.your, delta }))
      else improvements.push(t('benchmarking.improvementBelow', '{{name}} : {{your}}/100, soit {{delta}} pts sous la médiane du référentiel ({{avg}})', { name: p.name, your: p.your, delta: -delta, avg: Math.round(p.q.median) }))
    })
  }

  const refIndicators = REF_INDICATORS
    .filter(i => ref && ref.indicators[i.field] !== undefined && ref.indicators[i.field] !== null)
    .map(i => ({ name: t(i.labelKey, i.label), value: i.format(ref!.indicators[i.field]) }))

  const sectorLabel = t(SECTORS.find(s => s.value === sector)!.labelKey)

  const handleDownloadReport = useCallback(() => {
    const date = new Date().toLocaleDateString('fr-FR')
    const lines: string[] = [
      esc(`Rapport Benchmarking ESG — ${sectorLabel}`),
      esc(`Généré le : ${date}`),
      esc(`Source du référentiel : ${ref?.source === 'cross_tenant' ? `agrégats plateforme (${ref.cohort_size} organisations)` : 'cohorte insuffisante : aucune comparaison'}`),
      '',
      ['Pilier', 'Votre score', 'Médiane secteur', '75e centile', 'Top 10 %'].map(esc).join(','),
      ...pillars.map(p => [p.name, p.your ?? 'n/d', p.q?.median ?? 'n/d', p.q?.p75 ?? 'n/d', p.q?.top10 ?? 'n/d'].map(esc).join(',')),
      '',
      ['Indicateur de référence du secteur', 'Valeur'].map(esc).join(','),
      ...refIndicators.map(i => [i.name, i.value].map(esc).join(',')),
    ]
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `benchmark_esg_${sector}_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [sector, sectorLabel, ref, pillars, refIndicators])

  if (!can('benchmark')) {
    return (
      <div className="p-8 max-w-2xl mx-auto mt-16">
        <PlanGate feature="benchmark" minPlan="Pro" />
      </div>
    )
  }

  const selectedSector = SECTORS.find(s => s.value === sector)!
  const dash = '—'

  return (
    <div className="space-y-6">
      <PageHero
        backTo="/app"
        badge={t('benchmarking.badge')}
        badgeIcon={BarChart3}
        icon={BarChart3}
        title={t('benchmarking.title')}
        description={t('benchmarking.subtitle')}
      />

      {ref?.source && (
        <div className="flex flex-wrap items-center gap-2 -mt-2">
          {ref.source === 'cross_tenant' ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700 ring-1 ring-teal-200"
              title={t('benchmarking.crossTenantTitle', '{{n}} organisations · {{d}} tenants distincts (k-anonymat)', { n: ref.cohort_size, d: ref.distinct_tenants })}>
              {t('benchmarking.crossTenantPill', 'Agrégats plateforme · {{n}} organisations', { n: ref.cohort_size })}
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200"
              title={ref.anonymization_note || undefined}>
              {t('benchmarking.insufficientPill', 'Comparaison indisponible · cohorte insuffisante')}
            </div>
          )}
        </div>
      )}

      {/* Barre d'outils */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setSectorOpen(o => !o)}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <span className="text-base leading-none">{selectedSector.emoji}</span>
            <span>{sectorLabel}</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${sectorOpen ? 'rotate-180' : ''}`} />
          </button>
          {sectorOpen && (
            <div className="absolute left-0 z-30 mt-1.5 w-56 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl">
              <div className="py-1 max-h-72 overflow-y-auto">
                {SECTORS.map(s => (
                  <button key={s.value} onClick={() => { setSector(s.value); setSectorOpen(false) }}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm ${sector === s.value ? 'bg-teal-50 font-semibold text-teal-700' : 'text-gray-700 hover:bg-gray-50'}`}>
                    <span className="w-6 text-center">{s.emoji}</span>
                    <span className="flex-1">{t(s.labelKey)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => loadSector(sector)} disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {t('benchmarking.refresh')}
          </button>
          <button onClick={handleDownloadReport} disabled={!ref}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50">
            <Download className="h-4 w-4" />
            {t('benchmarking.downloadReport')}
          </button>
        </div>
      </div>

      {refError && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{refError}</span>
          <button onClick={() => loadSector(sector)} className="rounded-lg border border-red-200 bg-white px-3 py-1 font-medium hover:bg-red-100">
            {t('benchmarking.retry', 'Réessayer')}
          </button>
        </div>
      )}

      {ref?.source === 'insufficient_cohort' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {ref.anonymization_note || t('benchmarking.insufficientNote', "Pas encore assez d'organisations comparables dans ce secteur : aucune comparaison n'est affichée plutôt que des valeurs de référence non vérifiables.")}
        </div>
      )}

      {scoresLoaded && !realScores && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t('benchmarking.noScores', "Aucun score ESG calculé pour votre organisation. Calculez un score (Analyses → Scores) pour vous situer par rapport au référentiel du secteur.")}
        </div>
      )}

      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi icon={<Target className="h-4 w-4 text-teal-500" />} label={t('benchmarking.yourScore', 'Votre score')} value={yourOverall ?? dash} unit="/100" color="text-teal-600" />
        <Kpi icon={<BarChart3 className="h-4 w-4 text-slate-500" />} label={t('benchmarking.sectorMedian', 'Médiane du secteur')} value={overallRef ? Math.round(overallRef.median) : dash} unit="/100" color="text-slate-600" />
        <Kpi icon={<Award className="h-4 w-4 text-purple-500" />} label={t('benchmarking.bestSector')} value={overallRef ? Math.round(overallRef.top10) : dash} unit="/100" color="text-purple-600" />
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-500"><TrendingUp className="h-4 w-4 text-emerald-500" />{t('benchmarking.yourRank', 'Votre position')}</div>
          <p className="mt-2 text-sm font-semibold text-emerald-700">{band ? t(BAND_LABEL[band][0], BAND_LABEL[band][1]) : dash}</p>
          <p className="mt-1 text-xs text-gray-400">{t('benchmarking.indicativeData', 'Données indicatives')}</p>
        </div>
      </div>

      {/* Graphiques */}
      {canCompare ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-800">{t('benchmarking.scoresByPillar')}</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData} layout="vertical" margin={{ left: 16, right: 16, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="pillar" width={90} tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} cursor={{ fill: '#f1f5f9' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey={t('benchmarking.yourScore', 'Votre score')} fill="#14b8a6" radius={[0, 4, 4, 0]} />
                <Bar dataKey={t('benchmarking.sectorMedian', 'Médiane du secteur')} fill="#64748b" radius={[0, 4, 4, 0]} />
                <Bar dataKey="Top 25 %" fill="#10b981" radius={[0, 4, 4, 0]} />
                <Bar dataKey="Top 10 %" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-800">{t('benchmarking.esgProfileVsSector')}</h2>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar name={t('benchmarking.yourCompany', 'Votre entreprise')} dataKey="you" stroke="#14b8a6" fill="#14b8a6" fillOpacity={0.35} />
                <Radar name={t('benchmarking.sectorMedian', 'Médiane du secteur')} dataKey="sector" stroke="#64748b" fill="#64748b" fillOpacity={0.2} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          {t('benchmarking.chartsNeedBoth', "Les graphiques apparaissent dès que votre score ESG et le référentiel du secteur sont disponibles.")}
        </div>
      )}

      {canCompare && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-green-100 bg-green-50 p-5 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-green-800"><CheckCircle className="h-4 w-4 text-green-600" />{t('benchmarking.strengths')}</h3>
            <ul className="space-y-2">
              {strengths.length ? strengths.map((s, i) => <li key={i} className="text-sm text-green-700">{s}</li>)
                : <li className="text-sm text-green-700">{t('benchmarking.noneAbove', 'Aucun pilier au-dessus de la médiane du référentiel.')}</li>}
            </ul>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-5 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-800"><AlertTriangle className="h-4 w-4 text-amber-600" />{t('benchmarking.improvements')}</h3>
            <ul className="space-y-2">
              {improvements.length ? improvements.map((s, i) => <li key={i} className="text-sm text-amber-700">{s}</li>)
                : <li className="text-sm text-amber-700">{t('benchmarking.noneBelow', 'Aucun pilier sous la médiane du référentiel.')}</li>}
            </ul>
          </div>
        </div>
      )}

      {/* Indicateurs de référence */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-800">{t('benchmarking.refIndicators', 'Indicateurs de référence du secteur')}</h2>
          <p className="mt-1 text-xs text-gray-500">
            {t('benchmarking.refIndicatorsNote', "Valeurs de référence. Elles ne sont pas comparées à vos propres données : renseignez vos indicateurs dans la saisie de données pour les suivre.")}
          </p>
        </div>
        {refIndicators.length ? (
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-50">
              {refIndicators.map(i => (
                <tr key={i.name}>
                  <td className="px-6 py-3 font-medium text-gray-800">{i.name}</td>
                  <td className="px-6 py-3 text-right text-gray-600">{i.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-6 py-6 text-sm text-gray-500">{t('benchmarking.noRefIndicators', 'Aucun indicateur de référence disponible pour ce secteur.')}</p>
        )}
      </div>
    </div>
  )
}

function Kpi({ icon, label, value, unit, color }: { icon: React.ReactNode; label: string; value: number | string; unit: string; color: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm text-gray-500">{icon}{label}</div>
      <p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p>
      {typeof value === 'number' && <p className="text-xs text-gray-400">{unit}</p>}
    </div>
  )
}
