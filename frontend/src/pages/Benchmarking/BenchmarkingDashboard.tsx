import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
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

// --- Mock / fallback data ---

const SECTOR_BENCHMARKS = {
  environmental: { your: 68, avg: 55, top25: 75, top10: 88 },
  social: { your: 72, avg: 60, top25: 78, top10: 90 },
  governance: { your: 81, avg: 65, top25: 82, top10: 92 },
}

const RADAR_DATA = [
  { metric: 'CO2 Emissions', you: 65, sector: 52 },
  { metric: 'Renew. Energy', you: 78, sector: 61 },
  { metric: 'Diversity', you: 70, sector: 58 },
  { metric: 'Training', you: 74, sector: 63 },
  { metric: 'Governance', you: 82, sector: 67 },
  { metric: 'Transparency', you: 77, sector: 70 },
]

const INDICATOR_COMPARISON = [
  { name: 'CO2 Emissions (tCO2e)', your: '2,450', sector_avg: '3,200', percentile: 72, badge: 'top25' },
  { name: 'Electricity (MWh)', your: '15,800', sector_avg: '18,500', percentile: 65, badge: 'avg' },
  { name: 'Women share (%)', your: '44%', sector_avg: '38%', percentile: 78, badge: 'top25' },
  { name: 'Turnover (%)', your: '12%', sector_avg: '15%', percentile: 68, badge: 'avg' },
  { name: 'Training (h/emp)', your: '28h', sector_avg: '22h', percentile: 82, badge: 'top10' },
  { name: 'Ind. Directors (%)', your: '60%', sector_avg: '52%', percentile: 71, badge: 'top25' },
]

const SECTORS = [
  { value: 'general', labelKey: 'benchmarking.sectorAll' },
  { value: 'energie', labelKey: 'benchmarking.sectorEnergy' },
  { value: 'finance', labelKey: 'benchmarking.sectorFinance' },
  { value: 'industrie', labelKey: 'benchmarking.sectorIndustry' },
  { value: 'services', labelKey: 'benchmarking.sectorServices' },
  { value: 'immobilier', labelKey: 'benchmarking.sectorRealEstate' },
  { value: 'agriculture', labelKey: 'benchmarking.sectorAgriculture' },
]

// --- Types ---

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

// --- Helpers ---

function badgeConfig(badge: string, t: (k: string) => string): { label: string; className: string } {
  switch (badge) {
    case 'top10':
      return { label: 'Top 10 %', className: 'bg-purple-100 text-purple-700 border border-purple-200' }
    case 'top25':
      return { label: 'Top 25 %', className: 'bg-emerald-100 text-emerald-700 border border-emerald-200' }
    case 'avg':
      return { label: t('benchmarking.inAverage'), className: 'bg-blue-100 text-blue-700 border border-blue-200' }
    default:
      return { label: t('benchmarking.toImprove'), className: 'bg-amber-100 text-amber-700 border border-amber-200' }
  }
}

function buildBarData(benchmarks: BenchmarkData, t: (k: string) => string) {
  return [
    {
      pillar: t('benchmarking.environment'),
      [t('benchmarking.yourScore')]: benchmarks.environmental.your,
      [t('benchmarking.sectorAvg')]: benchmarks.environmental.avg,
      'Top 25 %': benchmarks.environmental.top25,
      'Top 10 %': benchmarks.environmental.top10,
    },
    {
      pillar: t('benchmarking.social'),
      [t('benchmarking.yourScore')]: benchmarks.social.your,
      [t('benchmarking.sectorAvg')]: benchmarks.social.avg,
      'Top 25 %': benchmarks.social.top25,
      'Top 10 %': benchmarks.social.top10,
    },
    {
      pillar: t('benchmarking.governance'),
      [t('benchmarking.yourScore')]: benchmarks.governance.your,
      [t('benchmarking.sectorAvg')]: benchmarks.governance.avg,
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

  const delta = yourScore - sectorAvg
  let rank = 'Top 30 %'
  if (delta >= 20) rank = 'Top 10 %'
  else if (delta >= 12) rank = 'Top 20 %'
  else if (delta >= 5) rank = 'Top 25 %'

  return { yourScore, sectorAvg, bestScore, rank }
}

// --- Component ---

export default function BenchmarkingDashboard() {
  const { t } = useTranslation()
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
      if (data?.environmental && data?.social && data?.governance) {
        setBenchmarks(data)
      } else {
        setBenchmarks(SECTOR_BENCHMARKS)
      }
    } catch {
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
  const barData = buildBarData(benchmarks, t)
  const selectedSectorLabel = SECTORS.find((s) => s.value === sector)
    ? t(SECTORS.find((s) => s.value === sector)!.labelKey)
    : sector

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 via-teal-900 to-slate-800 px-6 py-10 md:py-14">
        <div className="mx-auto max-w-7xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-teal-500/20 px-4 py-1.5 text-sm font-medium text-teal-300 ring-1 ring-teal-500/30">
            <BarChart3 className="h-4 w-4" />
            {t('benchmarking.badge')}
          </div>
          <h1 className="text-3xl font-bold text-white md:text-4xl">
            {t('benchmarking.title')}
          </h1>
          <p className="mt-2 max-w-2xl text-slate-300">
            {t('benchmarking.subtitle')}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Toolbar */}
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
                    {t(s.labelKey)}
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
              {t('benchmarking.refresh')}
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700">
              <Download className="h-4 w-4" />
              {t('benchmarking.downloadReport')}
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Target className="h-4 w-4 text-teal-500" />
              {t('benchmarking.yourScore')}
            </div>
            <p className="mt-2 text-3xl font-bold text-teal-600">{yourScore}</p>
            <p className="text-xs text-gray-400">/100</p>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <BarChart3 className="h-4 w-4 text-slate-500" />
              {t('benchmarking.sectorAvg')}
            </div>
            <p className="mt-2 text-3xl font-bold text-slate-600">{sectorAvg}</p>
            <p className="text-xs text-gray-400">/100</p>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Award className="h-4 w-4 text-purple-500" />
              {t('benchmarking.bestSector')}
            </div>
            <p className="mt-2 text-3xl font-bold text-purple-600">{bestScore}</p>
            <p className="text-xs text-gray-400">/100</p>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              {t('benchmarking.yourRank')}
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-600">{rank}</p>
            <p className="text-xs text-gray-400">{t('benchmarking.ofSector')}</p>
          </div>
        </div>

        {/* Charts row */}
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          {/* Bar chart */}
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-800">
              {t('benchmarking.scoresByPillar')}
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
                <Bar dataKey={t('benchmarking.yourScore')} fill="#14b8a6" radius={[0, 4, 4, 0]} />
                <Bar dataKey={t('benchmarking.sectorAvg')} fill="#64748b" radius={[0, 4, 4, 0]} />
                <Bar dataKey="Top 25 %" fill="#10b981" radius={[0, 4, 4, 0]} />
                <Bar dataKey="Top 10 %" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Radar chart */}
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-800">
              {t('benchmarking.esgProfileVsSector')}
            </h2>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar
                  name={t('benchmarking.yourCompany')}
                  dataKey="you"
                  stroke="#14b8a6"
                  fill="#14b8a6"
                  fillOpacity={0.35}
                />
                <Radar
                  name={t('benchmarking.sectorAvg')}
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

        {/* Comparison table */}
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-base font-semibold text-gray-800">
              {t('benchmarking.detailedComparison')}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-6 py-3 text-left">{t('benchmarking.indicator')}</th>
                  <th className="px-6 py-3 text-right">{t('benchmarking.yourValue')}</th>
                  <th className="px-6 py-3 text-right">{t('benchmarking.sectorAvg')}</th>
                  <th className="px-6 py-3 text-right">{t('benchmarking.percentile')}</th>
                  <th className="px-6 py-3 text-center">{t('benchmarking.performance')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {indicators.map((ind) => {
                  const { label, className } = badgeConfig(ind.badge, t)
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
