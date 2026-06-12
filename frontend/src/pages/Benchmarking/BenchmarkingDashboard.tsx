import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
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
  CheckCircle,
  AlertTriangle,
  Trophy,
  ArrowLeft,
} from 'lucide-react'
import api from '@/services/api'
import { usePlan } from '@/hooks/usePlan'
import PlanGate from '@/components/common/PlanGate'
import PageHero from '@/components/layout/PageHero'

// --- Per-sector mock data ---

type SectorKey = 'general' | 'energie' | 'finance' | 'industrie' | 'services' | 'immobilier' | 'sante' | 'technologie' | 'agriculture'

const SECTOR_DATA: Record<SectorKey, {
  benchmarks: { environmental: BenchmarkPillarRaw; social: BenchmarkPillarRaw; governance: BenchmarkPillarRaw }
  radar: { metric: string; you: number; sector: number }[]
  indicators: { name: string; your: string; sector_avg: string; percentile: number; badge: string }[]
  rank: string
  rankPos: number
  rankTotal: number
}> = {
  general: {
    benchmarks: {
      environmental: { your: 68, avg: 55, top25: 75, top10: 88 },
      social:        { your: 72, avg: 60, top25: 78, top10: 90 },
      governance:    { your: 81, avg: 65, top25: 82, top10: 92 },
    },
    radar: [
      { metric: 'CO2 Émissions', you: 65, sector: 52 },
      { metric: 'Énergie renouv.', you: 78, sector: 61 },
      { metric: 'Diversité', you: 70, sector: 58 },
      { metric: 'Formation', you: 74, sector: 63 },
      { metric: 'Gouvernance', you: 82, sector: 67 },
      { metric: 'Transparence', you: 77, sector: 70 },
    ],
    indicators: [
      { name: 'Émissions CO2 (tCO2e)', your: '2 450', sector_avg: '3 200', percentile: 72, badge: 'top25' },
      { name: 'Consommation élec. (MWh)', your: '15 800', sector_avg: '18 500', percentile: 65, badge: 'avg' },
      { name: 'Part femmes (%)', your: '44 %', sector_avg: '38 %', percentile: 78, badge: 'top25' },
      { name: 'Turnover (%)', your: '12 %', sector_avg: '15 %', percentile: 68, badge: 'avg' },
      { name: 'Formation (h/emp.)', your: '28 h', sector_avg: '22 h', percentile: 82, badge: 'top10' },
      { name: 'Administrateurs indép. (%)', your: '60 %', sector_avg: '52 %', percentile: 71, badge: 'top25' },
    ],
    rank: 'Top 20 %', rankPos: 3, rankTotal: 47,
  },
  energie: {
    benchmarks: {
      environmental: { your: 74, avg: 48, top25: 70, top10: 85 },
      social:        { your: 61, avg: 58, top25: 74, top10: 86 },
      governance:    { your: 78, avg: 62, top25: 80, top10: 91 },
    },
    radar: [
      { metric: 'CO2 Émissions', you: 72, sector: 45 },
      { metric: 'Énergie renouv.', you: 85, sector: 52 },
      { metric: 'Diversité', you: 58, sector: 54 },
      { metric: 'Formation', you: 65, sector: 60 },
      { metric: 'Gouvernance', you: 78, sector: 63 },
      { metric: 'Transparence', you: 80, sector: 66 },
    ],
    indicators: [
      { name: 'Émissions CO2 (tCO2e)', your: '1 820', sector_avg: '4 500', percentile: 85, badge: 'top10' },
      { name: 'Part énergie renouvelable (%)', your: '68 %', sector_avg: '41 %', percentile: 88, badge: 'top10' },
      { name: 'Consommation eau (m³)', your: '48 000', sector_avg: '62 000', percentile: 72, badge: 'top25' },
      { name: 'Part femmes (%)', your: '36 %', sector_avg: '32 %', percentile: 58, badge: 'avg' },
      { name: 'Formation (h/emp.)', your: '24 h', sector_avg: '20 h', percentile: 65, badge: 'avg' },
      { name: 'Administrateurs indép. (%)', your: '65 %', sector_avg: '55 %', percentile: 74, badge: 'top25' },
    ],
    rank: 'Top 15 %', rankPos: 4, rankTotal: 38,
  },
  finance: {
    benchmarks: {
      environmental: { your: 52, avg: 50, top25: 68, top10: 82 },
      social:        { your: 69, avg: 64, top25: 79, top10: 90 },
      governance:    { your: 88, avg: 70, top25: 85, top10: 94 },
    },
    radar: [
      { metric: 'CO2 Émissions', you: 48, sector: 46 },
      { metric: 'Énergie renouv.', you: 55, sector: 52 },
      { metric: 'Diversité', you: 72, sector: 65 },
      { metric: 'Formation', you: 70, sector: 66 },
      { metric: 'Gouvernance', you: 90, sector: 72 },
      { metric: 'Transparence', you: 85, sector: 74 },
    ],
    indicators: [
      { name: 'Émissions CO2 (tCO2e)', your: '980', sector_avg: '1 050', percentile: 54, badge: 'avg' },
      { name: 'Part femmes postes dir. (%)', your: '42 %', sector_avg: '35 %', percentile: 74, badge: 'top25' },
      { name: 'Formation compliance (h)', your: '32 h', sector_avg: '28 h', percentile: 70, badge: 'top25' },
      { name: 'Turnover (%)', your: '11 %', sector_avg: '14 %', percentile: 68, badge: 'avg' },
      { name: 'Administrateurs indép. (%)', your: '75 %', sector_avg: '62 %', percentile: 88, badge: 'top10' },
      { name: 'Politique anti-corruption', your: '100 %', sector_avg: '87 %', percentile: 92, badge: 'top10' },
    ],
    rank: 'Top 10 %', rankPos: 2, rankTotal: 52,
  },
  industrie: {
    benchmarks: {
      environmental: { your: 55, avg: 42, top25: 65, top10: 80 },
      social:        { your: 65, avg: 58, top25: 72, top10: 84 },
      governance:    { your: 70, avg: 60, top25: 76, top10: 88 },
    },
    radar: [
      { metric: 'CO2 Émissions', you: 52, sector: 40 },
      { metric: 'Déchets recyclés', you: 68, sector: 55 },
      { metric: 'Diversité', you: 60, sector: 55 },
      { metric: 'Sécurité trav.', you: 72, sector: 62 },
      { metric: 'Gouvernance', you: 70, sector: 60 },
      { metric: 'Transparence', you: 65, sector: 58 },
    ],
    indicators: [
      { name: 'Émissions CO2 (tCO2e)', your: '5 800', sector_avg: '8 200', percentile: 68, badge: 'avg' },
      { name: 'Déchets recyclés (%)', your: '58 %', sector_avg: '44 %', percentile: 74, badge: 'top25' },
      { name: 'Accidents travail (fréq.)', your: '2.1', sector_avg: '3.8', percentile: 78, badge: 'top25' },
      { name: 'Consommation eau (m³)', your: '92 000', sector_avg: '115 000', percentile: 65, badge: 'avg' },
      { name: 'Part femmes (%)', your: '34 %', sector_avg: '28 %', percentile: 60, badge: 'avg' },
      { name: 'Administrateurs indép. (%)', your: '58 %', sector_avg: '50 %', percentile: 66, badge: 'avg' },
    ],
    rank: 'Top 25 %', rankPos: 8, rankTotal: 61,
  },
  services: {
    benchmarks: {
      environmental: { your: 60, avg: 52, top25: 70, top10: 84 },
      social:        { your: 82, avg: 66, top25: 80, top10: 91 },
      governance:    { your: 76, avg: 63, top25: 79, top10: 90 },
    },
    radar: [
      { metric: 'CO2 Émissions', you: 58, sector: 50 },
      { metric: 'Télétravail (%)', you: 78, sector: 62 },
      { metric: 'Diversité', you: 84, sector: 68 },
      { metric: 'Formation', you: 86, sector: 70 },
      { metric: 'Gouvernance', you: 76, sector: 64 },
      { metric: 'Transparence', you: 72, sector: 65 },
    ],
    indicators: [
      { name: 'Émissions CO2 (tCO2e)', your: '320', sector_avg: '480', percentile: 70, badge: 'top25' },
      { name: 'Part télétravail (%)', your: '62 %', sector_avg: '45 %', percentile: 82, badge: 'top10' },
      { name: 'Part femmes encadrement (%)', your: '52 %', sector_avg: '42 %', percentile: 85, badge: 'top10' },
      { name: 'Satisfaction employés (/10)', your: '7.8', sector_avg: '7.1', percentile: 72, badge: 'top25' },
      { name: 'Formation (h/emp.)', your: '38 h', sector_avg: '30 h', percentile: 80, badge: 'top10' },
      { name: 'Turnover (%)', your: '14 %', sector_avg: '18 %', percentile: 65, badge: 'avg' },
    ],
    rank: 'Top 10 %', rankPos: 5, rankTotal: 74,
  },
  immobilier: {
    benchmarks: {
      environmental: { your: 62, avg: 53, top25: 72, top10: 84 },
      social:        { your: 58, avg: 55, top25: 70, top10: 82 },
      governance:    { your: 72, avg: 61, top25: 78, top10: 88 },
    },
    radar: [
      { metric: 'Consomm. énergie', you: 60, sector: 52 },
      { metric: 'Certif. HQE/BREEAM', you: 72, sector: 58 },
      { metric: 'Diversité', you: 55, sector: 52 },
      { metric: 'Formation', you: 60, sector: 56 },
      { metric: 'Gouvernance', you: 72, sector: 62 },
      { metric: 'Transparence', you: 68, sector: 60 },
    ],
    indicators: [
      { name: 'Consomm. énergie (kWh/m²)', your: '148', sector_avg: '175', percentile: 68, badge: 'avg' },
      { name: 'Bâtiments certifiés (%)', your: '55 %', sector_avg: '40 %', percentile: 75, badge: 'top25' },
      { name: 'Émissions CO2 (kgCO2/m²)', your: '22', sector_avg: '30', percentile: 72, badge: 'top25' },
      { name: 'Eau recyclée (%)', your: '38 %', sector_avg: '28 %', percentile: 66, badge: 'avg' },
      { name: 'Part femmes (%)', your: '40 %', sector_avg: '36 %', percentile: 58, badge: 'avg' },
      { name: 'Administrateurs indép. (%)', your: '62 %', sector_avg: '54 %', percentile: 68, badge: 'avg' },
    ],
    rank: 'Top 25 %', rankPos: 6, rankTotal: 33,
  },
  sante: {
    benchmarks: {
      environmental: { your: 58, avg: 50, top25: 68, top10: 80 },
      social:        { your: 78, avg: 68, top25: 80, top10: 90 },
      governance:    { your: 82, avg: 66, top25: 82, top10: 92 },
    },
    radar: [
      { metric: 'CO2 Émissions', you: 55, sector: 48 },
      { metric: 'Déchets méd. (traitement)', you: 72, sector: 62 },
      { metric: 'Diversité', you: 80, sector: 70 },
      { metric: 'Formation', you: 82, sector: 72 },
      { metric: 'Gouvernance', you: 84, sector: 68 },
      { metric: 'Transparence', you: 76, sector: 65 },
    ],
    indicators: [
      { name: 'Déchets médicaux traités (%)', your: '96 %', sector_avg: '88 %', percentile: 80, badge: 'top10' },
      { name: 'Émissions CO2 (tCO2e)', your: '1 200', sector_avg: '1 600', percentile: 68, badge: 'avg' },
      { name: 'Part femmes (%)', your: '64 %', sector_avg: '58 %', percentile: 72, badge: 'top25' },
      { name: 'Formation sécurité (h)', your: '45 h', sector_avg: '38 h', percentile: 76, badge: 'top25' },
      { name: 'Turnover (%)', your: '9 %', sector_avg: '12 %', percentile: 74, badge: 'top25' },
      { name: 'Politique éthique médicale', your: '100 %', sector_avg: '92 %', percentile: 85, badge: 'top10' },
    ],
    rank: 'Top 15 %', rankPos: 4, rankTotal: 45,
  },
  technologie: {
    benchmarks: {
      environmental: { your: 70, avg: 58, top25: 76, top10: 88 },
      social:        { your: 75, avg: 65, top25: 78, top10: 90 },
      governance:    { your: 80, avg: 67, top25: 82, top10: 93 },
    },
    radar: [
      { metric: 'CO2 Émissions', you: 68, sector: 56 },
      { metric: 'Énergie serveurs (%ren.)', you: 82, sector: 64 },
      { metric: 'Diversité', you: 72, sector: 62 },
      { metric: 'Formation', you: 80, sector: 70 },
      { metric: 'Gouvernance', you: 80, sector: 68 },
      { metric: 'Sécurité données', you: 88, sector: 74 },
    ],
    indicators: [
      { name: 'Émissions CO2 data center (tCO2e)', your: '680', sector_avg: '920', percentile: 72, badge: 'top25' },
      { name: 'PUE data center', your: '1.35', sector_avg: '1.55', percentile: 78, badge: 'top25' },
      { name: 'Part énergie renouvelable (%)', your: '72 %', sector_avg: '55 %', percentile: 80, badge: 'top10' },
      { name: 'Part femmes tech (%)', your: '38 %', sector_avg: '30 %', percentile: 75, badge: 'top25' },
      { name: 'Formation (h/emp.)', your: '52 h', sector_avg: '42 h', percentile: 82, badge: 'top10' },
      { name: 'Cyber-incidents résolus (%)', your: '99.2 %', sector_avg: '97.8 %', percentile: 85, badge: 'top10' },
    ],
    rank: 'Top 10 %', rankPos: 3, rankTotal: 58,
  },
  agriculture: {
    benchmarks: {
      environmental: { your: 65, avg: 44, top25: 62, top10: 78 },
      social:        { your: 55, avg: 50, top25: 65, top10: 78 },
      governance:    { your: 62, avg: 55, top25: 70, top10: 82 },
    },
    radar: [
      { metric: 'CO2 Émissions', you: 62, sector: 42 },
      { metric: 'Eau (usage efficient)', you: 70, sector: 50 },
      { metric: 'Biodiversité', you: 68, sector: 48 },
      { metric: 'Conditions travail', you: 54, sector: 50 },
      { metric: 'Gouvernance', you: 62, sector: 56 },
      { metric: 'Label/certifications', you: 75, sector: 55 },
    ],
    indicators: [
      { name: 'Émissions CH4/N2O (teqCO2)', your: '1 840', sector_avg: '2 900', percentile: 74, badge: 'top25' },
      { name: 'Efficacité hydrique (m³/t)', your: '4.2', sector_avg: '6.8', percentile: 80, badge: 'top10' },
      { name: 'Surface en agriculture bio (%)', your: '28 %', sector_avg: '15 %', percentile: 82, badge: 'top10' },
      { name: 'Pesticides (kg/ha)', your: '1.8', sector_avg: '3.2', percentile: 72, badge: 'top25' },
      { name: 'Conditions travailleurs saisonniers', your: '78 %', sector_avg: '60 %', percentile: 66, badge: 'avg' },
      { name: 'Certifications (Bio, HVE…)', your: '65 %', sector_avg: '42 %', percentile: 76, badge: 'top25' },
    ],
    rank: 'Top 20 %', rankPos: 5, rankTotal: 29,
  },
}

// Needed before SECTOR_DATA definition
interface BenchmarkPillarRaw { your: number; avg: number; top25: number; top10: number }

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
  const navigate = useNavigate()
  const { can } = usePlan()
  const [sector, setSector] = useState<SectorKey>('general')
  const [loading, setLoading] = useState(false)
  const [sectorOpen, setSectorOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // ── Scores réels depuis l'API ──────────────────────────────────────────────
  const [realScores, setRealScores] = useState<{ env: number; soc: number; gov: number } | null>(null)

  useEffect(() => {
    // Fetch per-pillar real scores from /scores/latest (accurate BBB/73 grade)
    api.get('/scores/latest')
      .then(res => {
        const d = res.data
        if (d?.overall_score > 0) {
          setRealScores({
            env: Math.round(d.environmental_score ?? 0),
            soc: Math.round(d.social_score ?? 0),
            gov: Math.round(d.governance_score ?? 0),
          })
        }
      })
      .catch(() => {
        // Fallback: use dashboard endpoint
        import('@/services/esgScoringService').then(({ getScoringDashboard }) => {
          getScoringDashboard().then((dash) => {
            const st = (dash?.statistics ?? {}) as Record<string, number>
            const env = st.average_environmental ?? st.average_score ?? 0
            const soc = st.average_social ?? st.average_score ?? 0
            const gov = st.average_governance ?? st.average_score ?? 0
            if ((env + soc + gov) > 0) {
              setRealScores({ env: Math.round(env), soc: Math.round(soc), gov: Math.round(gov) })
            }
          }).catch(() => {})
        })
      })
  }, [])

  /**
   * Live sector benchmarks from the backend.
   *
   * The backend returns either real cross-tenant aggregates (source =
   * "cross_tenant", cohort_size populated) or public reference baselines
   * (CDP/MSCI/ADEME) when the cohort is too small for k-anonymity.
   */
  const [liveBenchmarks, setLiveBenchmarks] = useState<{
    source: 'cross_tenant' | 'public_reference' | null;
    cohort_size: number | null;
    distinct_tenants: number | null;
    sector_label: string | null;
    reference_source: string | null;
    environmental?: { p25: number; median: number; p75: number; top10: number };
    social?:        { p25: number; median: number; p75: number; top10: number };
    governance?:    { p25: number; median: number; p75: number; top10: number };
    overall?:       { p25: number; median: number; p75: number; top10: number };
    anonymization_note?: string | null;
  }>({
    source: null, cohort_size: null, distinct_tenants: null,
    sector_label: null, reference_source: null,
  });

  /**
   * Benchmarks actifs : les valeurs "your" sont les scores réels du tenant,
   * les colonnes "avg/top25/top10" viennent du backend (réel ou référence).
   */
  const activeBenchmarks = useMemo((): BenchmarkData => {
    const base = SECTOR_DATA[sector].benchmarks
    const lb = liveBenchmarks;
    const merge = (
      mockPillar: { your: number; avg: number; top25: number; top10: number },
      livePillar?: { p25: number; median: number; p75: number; top10: number },
      realScore?: number,
    ) => ({
      your:  realScore !== undefined ? Math.round(realScore) : mockPillar.your,
      avg:   livePillar ? livePillar.median : mockPillar.avg,
      top25: livePillar ? livePillar.p75    : mockPillar.top25,
      top10: livePillar ? livePillar.top10  : mockPillar.top10,
    })
    return {
      environmental: merge(base.environmental, lb.environmental, realScores?.env),
      social:        merge(base.social,        lb.social,        realScores?.soc),
      governance:    merge(base.governance,    lb.governance,    realScores?.gov),
    }
  }, [sector, realScores, liveBenchmarks])

  /**
   * Radar data with real "you" values, scaled proportionally to real scores
   */
  const activeRadar = useMemo(() => {
    if (!realScores) return SECTOR_DATA[sector].radar
    const mockBench = SECTOR_DATA[sector].benchmarks
    return SECTOR_DATA[sector].radar.map(r => {
      const m = r.metric.toLowerCase()
      // Map each radar metric to a pillar
      let realScore: number
      let mockRef: number
      if (m.includes('co2') || m.includes('énergie') || m.includes('energie') ||
          m.includes('eau') || m.includes('déchet') || m.includes('dechet') ||
          m.includes('renouv') || m.includes('certif') || m.includes('pue') ||
          m.includes('bio') || m.includes('consomm') || m.includes('carbone')) {
        realScore = realScores.env
        mockRef = mockBench.environmental.your || 70
      } else if (m.includes('diversité') || m.includes('diversite') || m.includes('formation') ||
                 m.includes('femme') || m.includes('turnover') || m.includes('accident') ||
                 m.includes('tél') || m.includes('condition') || m.includes('rh') ||
                 m.includes('travail') || m.includes('satisfaction') || m.includes('travaill')) {
        realScore = realScores.soc
        mockRef = mockBench.social.your || 70
      } else {
        // Gouvernance / transparence / politique / sécurité / label
        realScore = realScores.gov
        mockRef = mockBench.governance.your || 70
      }
      const scale = mockRef > 0 ? realScore / mockRef : 1
      return { ...r, you: Math.min(100, Math.max(1, Math.round(r.you * scale))) }
    })
  }, [sector, realScores])

  // Close dropdown on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSectorOpen(false)
      }
    }
    if (sectorOpen) document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [sectorOpen])

  const applyMockWithDelay = useCallback(async (selectedSector: SectorKey) => {
    setLoading(true)
    try {
      const res = await api.get(`/benchmarks/sector/${selectedSector}`)
      if (res.data?.environmental) {
        setLiveBenchmarks({
          source:            res.data.source || 'public_reference',
          cohort_size:       res.data.cohort_size ?? null,
          distinct_tenants:  res.data.distinct_tenants ?? null,
          sector_label:      res.data.sector_label || null,
          reference_source:  res.data.reference_source || null,
          environmental:     res.data.environmental,
          social:            res.data.social,
          governance:        res.data.governance,
          overall:           res.data.overall,
          anonymization_note: res.data.anonymization?.note || null,
        })
      } else {
        // Reset to mock fallback if API shape unexpected
        setLiveBenchmarks({ source: null, cohort_size: null, distinct_tenants: null, sector_label: null, reference_source: null })
      }
    } catch {
      setLiveBenchmarks({ source: null, cohort_size: null, distinct_tenants: null, sector_label: null, reference_source: null })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    applyMockWithDelay(sector)
  }, [sector, applyMockWithDelay])

  const handleDownloadReport = useCallback(() => {
    const sectorLabel = t(SECTORS.find(s => s.value === sector)!.labelKey)
    const date = new Date().toLocaleDateString('fr-FR')
    const mock = SECTOR_DATA[sector]
    // Use real scores where available (activeBenchmarks), fall back to mock
    const bm = activeBenchmarks
    const rd = activeRadar
    const { rank: computedRank } = computeKPIs(bm)

    const lines: string[] = [
      `"Rapport Benchmarking ESG — ${sectorLabel}"`,
      `"Généré le : ${date}"`,
      `""`,
      `"SCORES PAR PILIER"`,
      `"Pilier","Votre Score","Moy. Secteur","Top 25 %","Top 10 %"`,
      `"Environnement","${bm.environmental.your}","${bm.environmental.avg}","${bm.environmental.top25}","${bm.environmental.top10}"`,
      `"Social","${bm.social.your}","${bm.social.avg}","${bm.social.top25}","${bm.social.top10}"`,
      `"Gouvernance","${bm.governance.your}","${bm.governance.avg}","${bm.governance.top25}","${bm.governance.top10}"`,
      `""`,
      `"POSITION ESTIMÉE (données de référence sectorielles)"`,
      `"Position estimée","Source","Note"`,
      `"${computedRank}","Référentiels publics (ADEME / CDP / GHG Protocol)","Classement précis disponible lorsque suffisamment d'organisations rejoignent la plateforme"`,
      `""`,
      `"COMPARAISON INDICATEURS DÉTAILLÉS"`,
      `"Indicateur","Votre valeur","Moy. Secteur","Percentile","Performance"`,
      ...mock.indicators.map(i =>
        `"${i.name}","${i.your}","${i.sector_avg}","${i.percentile}e","${i.badge.toUpperCase()}"`
      ),
      `""`,
      `"PROFIL RADAR ESG"`,
      `"Métrique","Votre entreprise","Moy. Secteur"`,
      ...rd.map(r => `"${r.metric}","${r.you}","${r.sector}"`),
    ]

    const csv = lines.join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `benchmark_esg_${sector}_${new Date().toISOString().slice(0,10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [sector, t, activeBenchmarks, activeRadar])

  const sectorMock = SECTOR_DATA[sector]
  const benchmarks = activeBenchmarks   // scores réels injectés si disponibles
  const radarData = activeRadar

  // Stockage des indicateurs backend (Phase 5 API : carbon_intensity_per_revenue, gender_pay_gap, ...)
  const [backendIndicators, setBackendIndicators] = useState<Record<string, number> | null>(null)
  useEffect(() => {
    api.get(`/benchmarks/sector/${sector}`)
      .then(r => setBackendIndicators(r.data?.indicators || null))
      .catch(() => setBackendIndicators(null))
  }, [sector])

  // Indicators rendus à l'UI — sector_avg remplacé par valeur backend quand disponible
  const indicators = useMemo(() => {
    if (!backendIndicators) return sectorMock.indicators
    // Mapping par mot-clef du nom (heuristique simple)
    const keyMap: Array<{ keys: string[]; backendField: string; format: (v: number) => string }> = [
      { keys: ['co2', 'carbone', 'intensit', 'ghg', 'émissions'],
        backendField: 'carbon_intensity_per_revenue',
        format: v => `${v.toFixed(1)} tCO₂e/M€` },
      { keys: ['renouv', 'renewable', 'élec'],
        backendField: 'renewable_energy_pct',
        format: v => `${v.toFixed(0)} %` },
      { keys: ['écart', 'pay gap', 'gender', 'rémun', 'remun'],
        backendField: 'gender_pay_gap',
        format: v => `${v.toFixed(1)} %` },
      { keys: ['turnover', 'rotation', 'départ', 'depart'],
        backendField: 'employee_turnover',
        format: v => `${v.toFixed(0)} %` },
      { keys: ['ceo', 'pdg', 'ratio'],
        backendField: 'ceo_pay_ratio',
        format: v => `${v.toFixed(0)}:1` },
      { keys: ['accident', 'tfat', 'tf '],
        backendField: 'accident_rate',
        format: v => v.toFixed(1) },
    ]
    return sectorMock.indicators.map(ind => {
      const lowName = ind.name.toLowerCase()
      const match = keyMap.find(m => m.keys.some(k => lowName.includes(k)))
      if (match && backendIndicators[match.backendField] !== undefined) {
        return { ...ind, sector_avg: match.format(backendIndicators[match.backendField]) }
      }
      return ind
    })
  }, [sectorMock.indicators, backendIndicators])

  const { yourScore, sectorAvg, bestScore, rank } = computeKPIs(benchmarks)
  const barData = buildBarData(benchmarks, t)
  const selectedSector = SECTORS.find((s) => s.value === sector)!
  const selectedSectorLabel = t(selectedSector.labelKey)

  // Progress bar position based on computed rank
  const rankLeftPct = rank === 'Top 10 %' ? 6 : rank === 'Top 20 %' ? 15 : rank === 'Top 25 %' ? 22 : 28

  // Dynamic strengths & improvements from real pillar scores
  const { dynamicStrengths, dynamicImprovements } = useMemo(() => {
    const pillars = [
      { name: t('benchmarking.environment', 'Environnement'), your: benchmarks.environmental.your, avg: benchmarks.environmental.avg, top10: benchmarks.environmental.top10 },
      { name: t('benchmarking.social', 'Social'), your: benchmarks.social.your, avg: benchmarks.social.avg, top10: benchmarks.social.top10 },
      { name: t('benchmarking.governance', 'Gouvernance'), your: benchmarks.governance.your, avg: benchmarks.governance.avg, top10: benchmarks.governance.top10 },
    ]
    const sorted = [...pillars].sort((a, b) => (b.your - b.avg) - (a.your - a.avg))

    const strs: string[] = sorted
      .filter(p => p.your >= p.avg)
      .map(p => {
        const delta = p.your - p.avg
        if (p.your >= p.top10) return t('benchmarking.strengthTop10', '{{name}} : score {{your}}/100 — Top 10 % du secteur', { name: p.name, your: p.your })
        return t('benchmarking.strengthAbove', '{{name}} : score {{your}}/100 — +{{delta}} pts au-dessus de la moyenne', { name: p.name, your: p.your, delta })
      })

    const imps: string[] = sorted
      .filter(p => p.your < p.avg)
      .map(p => {
        const delta = p.avg - p.your
        return t('benchmarking.improvementBelow', '{{name}} : score {{your}}/100 — {{delta}} pts sous la moyenne sectorielle ({{avg}})', { name: p.name, your: p.your, delta, avg: p.avg })
      })

    // If all pillars outperform average, suggest progress toward Top 10
    if (imps.length === 0) {
      sorted.forEach(p => {
        const gap = p.top10 - p.your
        if (gap > 0) imps.push(t('benchmarking.improvementGap', '{{name}} : +{{gap}} pts pour atteindre le Top 10 % ({{top10}})', { name: p.name, gap, top10: p.top10 }))
      })
    }

    // Ensure at least one entry in strengths fallback
    if (strs.length === 0) {
      sorted.slice(0, 1).forEach(p => strs.push(t('benchmarking.strengthBest', '{{name}} : score {{your}}/100 — meilleur pilier de votre profil', { name: p.name, your: p.your })))
    }

    return { dynamicStrengths: strs.slice(0, 3), dynamicImprovements: imps.slice(0, 3) }
  }, [benchmarks, t])

  // Gate — Pro feature
  if (!can('benchmark')) {
    return (
      <div className="p-8 max-w-2xl mx-auto mt-16">
        <PlanGate feature="benchmark" minPlan="Pro" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Hero (signature) */}
      <PageHero
        backTo="/app"
        badge={t('benchmarking.badge')}
        badgeIcon={BarChart3}
        icon={BarChart3}
        title={t('benchmarking.title')}
        description={t('benchmarking.subtitle')}
      />
      {/* Status pills (data source) — moved out of hero so they stay readable on light surface */}
      {(realScores || liveBenchmarks.source) && (
        <div className="flex flex-wrap items-center gap-2 -mt-2">
          {realScores && (
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {t('benchmarking.realScoresLoaded', 'Scores ESG réels chargés')}
            </div>
          )}
          {liveBenchmarks.source === 'cross_tenant' && (
            <div
              className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700 ring-1 ring-teal-200"
              title={t('benchmarking.crossTenantTitle', '{{n}} organisations · {{d}} distinct tenants (k-anonymity)', { n: liveBenchmarks.cohort_size, d: liveBenchmarks.distinct_tenants })}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
              {t('benchmarking.crossTenantPill', 'Données cross-tenant · {{n}} organisations', { n: liveBenchmarks.cohort_size })}
            </div>
          )}
          {liveBenchmarks.source === 'public_reference' && (
            <div
              className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200"
              title={liveBenchmarks.anonymization_note || t('benchmarking.publicRefWaiting', "Référentiel public utilisé en attente d'une cohorte suffisante.")}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              {t('benchmarking.publicRefPill', 'Référentiel public · {{src}}', { src: liveBenchmarks.reference_source || 'CDP / MSCI / ADEME' })}
            </div>
          )}
        </div>
      )}

      <div className="space-y-6">
        {/* Toolbar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          {/* Sector selector */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setSectorOpen((o) => !o)}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold shadow-sm transition-all focus:outline-none ${
                sectorOpen
                  ? 'border-teal-400 bg-teal-50 text-teal-700 ring-2 ring-teal-100'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300'
              }`}
            >
              <span className="text-base leading-none">{selectedSector.emoji}</span>
              <span>{selectedSectorLabel}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${sectorOpen ? 'rotate-180 text-teal-500' : 'text-gray-400'}`} />
            </button>

            {sectorOpen && (
              <div className="absolute left-0 z-30 mt-1.5 w-56 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl">
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{t('benchmarking.filterBySector', 'Filtrer par secteur')}</p>
                </div>
                <div className="py-1 max-h-72 overflow-y-auto">
                  {SECTORS.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => { setSector(s.value); setSectorOpen(false) }}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                        sector === s.value
                          ? 'bg-teal-50 font-semibold text-teal-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-base w-6 text-center flex-shrink-0">{s.emoji}</span>
                      <span className="flex-1">{t(s.labelKey)}</span>
                      {sector === s.value && (
                        <span className="flex-shrink-0 h-2 w-2 rounded-full bg-teal-500" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => applyMockWithDelay(sector)}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {t('benchmarking.refresh')}
            </button>
            <button
              onClick={handleDownloadReport}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 active:scale-95 transition-all"
            >
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

        {/* Position estimée — données de référence publiques */}
        <div className="mb-6 rounded-2xl border border-teal-100 bg-gradient-to-r from-teal-50 to-slate-50 p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4 flex-1">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-teal-100">
                <BarChart3 className="h-6 w-6 text-teal-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center flex-wrap gap-2 mb-1">
                  <p className="text-sm font-bold text-teal-900">{t('benchmarking.sectorRank')} — {rank}</p>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border" style={{ background: '#fef3c7', color: '#92400e', borderColor: '#fde68a' }}>
                    <AlertTriangle className="h-3 w-3" /> {t('benchmarking.indicativeData', 'Données indicatives')}
                  </span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed max-w-lg">
                  {t('benchmarking.rankDescription', "Position estimée par rapport aux moyennes sectorielles issues de référentiels publics (ADEME, CDP, GHG Protocol). Le classement précis parmi les pairs sera disponible lorsque davantage d'organisations auront rejoint la plateforme.")}
                </p>
                <div className="mt-3 max-w-xs">
                  <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-teal-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-500" style={{ width: `${100 - rankLeftPct}%` }} />
                    <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-4 w-4 rounded-full bg-teal-600 ring-2 ring-white shadow" style={{ left: `${rankLeftPct}%` }} />
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-teal-400">
                    <span>{t('benchmarking.best')}</span>
                    <span>{t('benchmarking.worst')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Strengths & improvements */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-green-100 bg-green-50 p-5 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-green-800">
              <CheckCircle className="h-4 w-4 text-green-600" />
              {t('benchmarking.strengths')}
            </h3>
            <ul className="space-y-2">
              {dynamicStrengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-green-700">
                  <span className="mt-0.5 flex-shrink-0 h-4 w-4 rounded-full bg-green-200 flex items-center justify-center text-xs font-bold text-green-700">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-5 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              {t('benchmarking.improvements')}
            </h3>
            <ul className="space-y-2">
              {dynamicImprovements.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-amber-700">
                  <span className="mt-0.5 flex-shrink-0 h-4 w-4 rounded-full bg-amber-200 flex items-center justify-center text-xs font-bold text-amber-700">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ul>
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
