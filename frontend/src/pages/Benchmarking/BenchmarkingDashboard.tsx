import { useState, useEffect, useCallback } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts'
import {
  BarChart3,
  TrendingUp,
  Award,
  Target,
  Download,
  RefreshCw,
  Building2,
  ChevronDown,
} from 'lucide-react'

// ─── Mock / fallback data ────────────────────────────────────────────────────

const SECTOR_BENCHMARKS = {
  environmental: { your: 68, avg: 55, top25: 75, top10: 88 },
  social: { your: 72, avg: 60, top25: 78, top10: 90 },
  governance: { your: 81, avg: 65, top25: 82, top10: 92 },
}

const RADAR_DATA = [
  { metric: 'Émissions CO₂', you: 65, sector: 52 },
  { metric: 'Énergie renouv.', you: 78, sector: 61 },
  { metric: 'Diversité', you: 70, sector: 58 },
  { metric: 'Formation', you: 74, sector: 63 },
  { metric: 'Gouvernance', you: 82, sector: 67 },
  { metric: 'Transparence', you: 77, sector: 70 },
]

const INDICATOR_COMPARISON = [
  { name: 'Émissions CO₂ (tCO2e)', your: '2,450', sector_avg: '3,200', percentile: 72, badge: 'top25' },
  { name: 'Consommation électrique (MWh)', your: '15,800', sector_avg: '18,500', percentile: 65, badge: 'avg' },
  { name: 'Part femmes (%)', your: '44%', sector_avg: '38%', percentile: 78, badge: 'top25' },
  { name: 'Turnover (%)', your: '12%', sector_avg: '15%', percentile: 68, badge: 'avg' },
  { name: 'Formations (h/emp)', your: '28h', sector_avg: '22h', percentile: 82, badge: 'top10' },
  { name: 'Administrateurs ind. (%)', your: '60%', sector_avg: '52%', percentile: 71, badge: 'top25' },
]

const SECTORS = [
  { value: 'general', label: 'Tous secteurs' },
  { value: 'energie', label: 'Énergie' },
  { value: 'finance', label: 'Finance' },
  { value: 'industrie', label: 'Industrie' },
  { value: 'services', label: 'Services' },
  { value: 'immobilier', label: 'Immobilier' },
  { value: 'agriculture', label: 'Agriculture' },
]

// ─── Types ────────────────────────────────────────────────────────────────────

interface BenchmarkPillar {
  your: number
  avg: number
  top25: number
  top10: number
}

interface BenchmarkData {
  environmental: BenchmarkPillar
  social: BenchmarkPillar
  governance: BenchmarkPillar
}

type BadgeType = 'top10' | 'top25' | 'avg' | 'improve'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function badgeConfig(badge: string): { label: string; className: string } {
  switch (badge) {
    case 'top10':
      return { label: 'Top 10 %', className: 'bg-purple-100 text-purple-700 border border-purple-200' }
    case 'top25':
      return { label: 'Top 25 %', className: 'bg-emerald-100 text-emerald-700 border border-emerald-200' }
    case 'avg':
      return { label: 'Dans la moyenne', className: 'bg-blue-100 text-blue-700 border border-blue-200' }
    default:
      return { label: 'À améliorer', className: 'bg-amber-100 text-amber-700 border border-amber-200' }
  }
}

function buildBarData(benchmarks: BenchmarkData) {
  return [
    {
      pillar: 'Environnement',
      'Votre score': benchmarks.environmental.your,
      'Moyenne secteur': benchmarks.environmental.avg,
      'Top 25 %': benchmarks.environmental.top25,
      'Top 10 %': benchmarks.environmental.top10,
    },
    {
      pillar: 'Social',
      'Votre score': benchmarks.social.your,
      'Moyenne secteur': benchmarks.social.avg,
      'Top 25 %': benchmarks.social.top25,
      'Top 10 %': benchmarks.social.top10,
    },
    {
      pillar: 'Gouvernance',
      'Votre score': benchmarks.governance.your,
      'Moyenne secteur': benchmarks.governance.avg,
      'Top 25 %': benchmarks.governance.top25,
      'Top 10 %': benchmarks.governance.top10,
    },
  ]
}

function computeKPIs(benchmarks: BenchmarkData) {
  const pillars = [benchmarks.environmental, benchmarks.social, benchmarks.governance]
  const yourScore = Math.round(pillars.reduce((s, p) => s + p.your, 0) / 3)
  const sectorAvg = Math.round(pillars.reduce((s, p) => s + p.avg, 0) / 3)
  const bestScore = Math.round(pillars.reduce((s, p) => s + p.top10, 0) / 3)

  // Rough rank estimation based on percentile vs avg
  const delta = yourScore - sectorAvg
  let rank = 'Top 30 %'
  if (delta >= 20) rank = 'Top 10 %'
  else if (delta >= 12) rank = 'Top 20 %'
  else if (delta >= 5) rank = 'Top 25 %'

  return { yourScore, sectorAvg, bestScore, rank }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BenchmarkingDashboard() {
  const [sector, setSector] = useState('general')
  const [loading, setLoading] = useState(false)
  const [benchmarks, setBenchmarks] = useState<BenchmarkData>(SECTOR_BENCHMARKS)
  const [radarData, setRadarData] = useState(RADAR_DATA)
  const [indicators, setIndicators] = useState(INDICATOR_COMPARISON)
  const [sectorOpen, setSectorOpen] = useState(false)

  const fetchBenchmarks = useCallback(async (selectedSector: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/benchmarks/sector/${selectedSector}`)
      if (!res.ok) throw new Error('no data')
      const data = await res.json()
      // If the API returns data in the expected shape, use it; otherwise fall through to mock
      if (data?.environmental && data?.social && data?.governance) {
        setBenchmarks(data)
      } else {
        setBenchmarks(SECTOR_BENCHMARKS)
      }
    } catch {
      // Fallback to mock data
      setBenchmarks(SECTOR_BENCHMARKS)
      setRadarData(RADAR_DATA)
      setIndicators(INDICATOR_COMPARISON)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBenchmarks(sector)
  }, [sector, fetchBenchmarks])

  const { yourScore, sectorAvg, bestScore, rank } = computeKPIs(benchmarks)
  const barData = buildBarData(benchmarks)
  const selectedSectorLabel = SECTORS.find((s) => s.value === sector)?.label ?? sector

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-slate-900 via-teal-900 to-slate-800 px-6 py-10 md:py-14">
        <div className="mx-auto max-w-7xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-teal-500/20 px-4 py-1.5 text-sm font-medium text-teal-300 ring-1 ring-teal-500/30">
            <BarChart3 className="h-4 w-4" />
            Benchmarking Sectoriel
          </div>
          <h1 className="text-3xl font-bold text-white md:text-4xl">
            Positionnement sectoriel
          </h1>
          <p className="mt-2 max-w-2xl text-slate-300">
            Comparez vos performances ESG aux standards de votre secteur et identifiez vos axes de progression.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* ── Toolbar ── */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          {/* Sector selector */}
          <div className="relative">
            <button
              onClick={() => setSectorOpen((o) => !o)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none"
            >
              <Building2 className="h-4 w-4 text-teal-600" />
              {selectedSectorLabel}
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>
            {sectorOpen && (
              <div className="absolute left-0 z-20 mt-1 w-48 rounded-lg border border-gray-200 bg-white shadow-lg">
                {SECTORS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => { setSector(s.value); setSectorOpen(false) }}
                    className={`block w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 ${
                      sector === s.value ? 'bg-teal-50 font-semibold text-teal-700' : 'text-gray-700'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => fetchBenchmarks(sector)}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700">
              <Download className="h-4 w-4" />
              Télécharger rapport
            </button>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {/* Your score */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Target className="h-4 w-4 text-teal-500" />
              Votre score
            </div>
            <p className="mt-2 text-3xl font-bold text-teal-600">{yourScore}</p>
            <p className="text-xs text-gray-400">/100</p>
          </div>

          {/* Sector avg */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <BarChart3 className="h-4 w-4 text-slate-500" />
              Moyenne secteur
            </div>
            <p className="mt-2 text-3xl font-bold text-slate-600">{sectorAvg}</p>
            <p className="text-xs text-gray-400">/100</p>
          </div>

          {/* Best */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Award className="h-4 w-4 text-purple-500" />
              Meilleur du secteur
            </div>
            <p className="mt-2 text-3xl font-bold text-purple-600">{bestScore}</p>
            <p className="text-xs text-gray-400">/100</p>
          </div>

          {/* Rank */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Votre rang
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-600">{rank}</p>
            <p className="text-xs text-gray-400">du secteur</p>
          </div>
        </div>

        {/* ── Charts row ── */}
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          {/* Bar chart */}
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-800">
              Scores par pilier ESG
            </h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData} layout="vertical" margin={{ left: 16, right: 16, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="pillar" width={90} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  cursor={{ fill: '#f1f5f9' }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Votre score" fill="#14b8a6" radius={[0, 4, 4, 0]} />
                <Bar dataKey="Moyenne secteur" fill="#64748b" radius={[0, 4, 4, 0]} />
                <Bar dataKey="Top 25 %" fill="#10b981" radius={[0, 4, 4, 0]} />
                <Bar dataKey="Top 10 %" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Radar chart */}
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-800">
              Profil ESG vs moyenne sectorielle
            </h2>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar
                  name="Votre entreprise"
                  dataKey="you"
                  stroke="#14b8a6"
                  fill="#14b8a6"
                  fillOpacity={0.35}
                />
                <Radar
                  name="Moyenne secteur"
                  dataKey="sector"
                  stroke="#64748b"
                  fill="#64748b"
                  fillOpacity={0.2}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Comparison table ── */}
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-base font-semibold text-gray-800">
              Comparaison détaillée des indicateurs
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-6 py-3 text-left">Indicateur</th>
                  <th className="px-6 py-3 text-right">Votre valeur</th>
                  <th className="px-6 py-3 text-right">Moyenne secteur</th>
                  <th className="px-6 py-3 text-right">Percentile</th>
                  <th className="px-6 py-3 text-center">Performance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {indicators.map((ind) => {
                  const { label, className } = badgeConfig(ind.badge)
                  return (
                    <tr key={ind.name} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-800">{ind.name}</td>
                      <td className="px-6 py-4 text-right font-semibold text-teal-600">{ind.your}</td>
                      <td className="px-6 py-4 text-right text-gray-500">{ind.sector_avg}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className="h-full rounded-full bg-teal-400"
                              style={{ width: `${ind.percentile}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-600">
                            {ind.percentile}e
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
                          {label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
