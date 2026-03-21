import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  FileText, Download, Shield, Globe, TrendingUp, Leaf,
  Settings, Calendar, CheckCircle, AlertCircle, XCircle, Clock, Plus, ChevronRight,
  ChevronDown, Code2, BarChart3, RefreshCw, ArrowRight, Target, Zap, Building2,
  Users, Droplets, Recycle, TreePine, Scale, Eye, Share2, AlertTriangle, Info,
} from 'lucide-react'
import api from '@/services/api'
import Card from '@/components/common/Card'
import Button from '@/components/common/Button'
import toast from 'react-hot-toast'

// ─── Types ────────────────────────────────────────────────────────────────────

interface IndicatorData {
  code: string
  name: string
  unit: string
  value: string | null
  status: 'validated' | 'partial' | 'missing'
  source: string | null
}

interface ESRSSection {
  id: string
  name: string
  color: string
  indicators: IndicatorData[]
  completion: number
}

type ExportFormat = 'PDF' | 'Excel' | 'Word' | 'JSON'
type Language = 'FR' | 'EN'
type TabKey = 'builder' | 'indicators' | 'score' | 'generate'

// ─── Mock Data ────────────────────────────────────────────────────────────────

const ESRS_SECTIONS: ESRSSection[] = [
  {
    id: 'E1', name: 'Changement climatique', color: '#dc2626',
    indicators: [
      { code: 'GHG-S1', name: 'Emissions GES Scope 1', unit: 'tCO2e', value: '2 450', status: 'validated', source: 'SAP S/4HANA' },
      { code: 'GHG-S2', name: 'Emissions GES Scope 2', unit: 'tCO2e', value: '1 890', status: 'validated', source: 'Schneider Electric' },
      { code: 'GHG-S3', name: 'Emissions GES Scope 3', unit: 'tCO2e', value: '8 210', status: 'partial', source: 'Manuel' },
      { code: 'INT-C', name: 'Intensite carbone', unit: 'tCO2e/M EUR', value: null, status: 'missing', source: null },
      { code: 'ENR-%', name: 'Part energie renouvelable', unit: '%', value: '34%', status: 'validated', source: 'Enedis' },
      { code: 'TEMP', name: 'Objectif reduction temperature', unit: 'C', value: '1.5C', status: 'validated', source: 'Manuel' },
    ],
    completion: 78,
  },
  {
    id: 'E2', name: 'Pollution', color: '#ea580c',
    indicators: [
      { code: 'POL-AIR', name: 'Emissions polluants atmospheriques', unit: 'tonnes', value: '12.4', status: 'validated', source: 'Manuel' },
      { code: 'POL-EAU', name: 'Rejets dans l\'eau', unit: 'm3', value: null, status: 'missing', source: null },
      { code: 'POL-SOL', name: 'Contamination des sols', unit: 'sites', value: '0', status: 'validated', source: 'Manuel' },
    ],
    completion: 62,
  },
  {
    id: 'E3', name: 'Ressources marines & aquatiques', color: '#0891b2',
    indicators: [
      { code: 'EAU-CONS', name: 'Consommation d\'eau', unit: 'm3', value: '45 200', status: 'validated', source: 'Schneider' },
      { code: 'EAU-REC', name: 'Eau recyclee', unit: '%', value: null, status: 'missing', source: null },
      { code: 'EAU-STRESS', name: 'Prelevement zones stress hydrique', unit: 'm3', value: null, status: 'missing', source: null },
    ],
    completion: 45,
  },
  {
    id: 'E4', name: 'Biodiversite', color: '#16a34a',
    indicators: [
      { code: 'BIO-SITE', name: 'Sites proches zones protegees', unit: 'nombre', value: '2', status: 'validated', source: 'Manuel' },
      { code: 'BIO-IMP', name: 'Impact sur la biodiversite', unit: 'score', value: null, status: 'missing', source: null },
    ],
    completion: 34,
  },
  {
    id: 'E5', name: 'Economie circulaire', color: '#7c3aed',
    indicators: [
      { code: 'DEC-TOT', name: 'Dechets totaux generes', unit: 'tonnes', value: '1 240', status: 'validated', source: 'Manuel' },
      { code: 'DEC-REC', name: 'Taux de recyclage', unit: '%', value: '67%', status: 'validated', source: 'Manuel' },
      { code: 'DEC-HAZ', name: 'Dechets dangereux', unit: 'tonnes', value: '8.2', status: 'partial', source: 'Manuel' },
    ],
    completion: 51,
  },
  {
    id: 'S1', name: 'Effectifs propres', color: '#2563eb',
    indicators: [
      { code: 'EFF-TOT', name: 'Effectif total', unit: 'ETP', value: '1 234', status: 'validated', source: 'Workday' },
      { code: 'EFF-F', name: 'Part femmes', unit: '%', value: '44%', status: 'validated', source: 'Workday' },
      { code: 'EFF-HAP', name: 'Ecart salarial H/F', unit: '%', value: '8.2%', status: 'validated', source: 'Workday' },
      { code: 'EFF-TUR', name: 'Taux de turnover', unit: '%', value: '12%', status: 'validated', source: 'Workday' },
      { code: 'EFF-TF', name: 'Taux de frequence accidents', unit: 'pour 1M h', value: '2.1', status: 'validated', source: 'Manuel' },
      { code: 'FORM-H', name: 'Heures formation / salarie', unit: 'heures', value: '28h', status: 'validated', source: 'Workday' },
    ],
    completion: 89,
  },
  {
    id: 'S2', name: 'Travailleurs chaine de valeur', color: '#0891b2',
    indicators: [
      { code: 'SC-AUD', name: 'Fournisseurs audites ESG', unit: '%', value: '43%', status: 'partial', source: 'Supply Chain ESG' },
      { code: 'SC-RISK', name: 'Fournisseurs risque eleve', unit: 'nombre', value: '2', status: 'validated', source: 'Supply Chain ESG' },
    ],
    completion: 61,
  },
  {
    id: 'S3', name: 'Communautes affectees', color: '#db2777',
    indicators: [
      { code: 'COM-ENG', name: 'Parties prenantes consultees', unit: 'nombre', value: null, status: 'missing', source: null },
    ],
    completion: 28,
  },
  {
    id: 'S4', name: 'Consommateurs', color: '#ea580c',
    indicators: [
      { code: 'SAT-CLI', name: 'Score satisfaction client', unit: '/10', value: '8.2', status: 'validated', source: 'Manuel' },
      { code: 'RECL', name: 'Reclamations recues', unit: 'nombre', value: null, status: 'missing', source: null },
    ],
    completion: 43,
  },
  {
    id: 'G1', name: 'Conduite des affaires', color: '#374151',
    indicators: [
      { code: 'GOV-CA', name: 'Part femmes CA', unit: '%', value: '40%', status: 'validated', source: 'Manuel' },
      { code: 'GOV-IND', name: 'Administrateurs independants', unit: '%', value: '60%', status: 'validated', source: 'Manuel' },
      { code: 'GOV-ETH', name: 'Formation ethique/conformite', unit: '%', value: '92%', status: 'validated', source: 'Manuel' },
      { code: 'CORR', name: 'Cas de corruption signales', unit: 'nombre', value: '0', status: 'validated', source: 'Manuel' },
    ],
    completion: 75,
  },
]

const PILLAR_GROUPS = {
  env: { label: 'Environnement (E)', sections: ['E1', 'E2', 'E3', 'E4', 'E5'] },
  soc: { label: 'Social (S)', sections: ['S1', 'S2', 'S3', 'S4'] },
  gov: { label: 'Gouvernance (G)', sections: ['G1'] },
}

function globalScore(sections: ESRSSection[]): number {
  return Math.round(sections.reduce((acc, s) => acc + s.completion, 0) / sections.length)
}

function missingCount(sections: ESRSSection[], ids: string[]): number {
  return sections
    .filter(s => ids.includes(s.id))
    .flatMap(s => s.indicators)
    .filter(i => i.status === 'missing').length
}

// ─── Radar SVG ────────────────────────────────────────────────────────────────

function RadarChart({ sections }: { sections: ESRSSection[] }) {
  const cx = 200, cy = 200, r = 160
  const n = sections.length
  const points = sections.map((s, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2
    const pct = s.completion / 100
    return {
      x: cx + Math.cos(angle) * r * pct,
      y: cy + Math.sin(angle) * r * pct,
      lx: cx + Math.cos(angle) * (r + 30),
      ly: cy + Math.sin(angle) * (r + 30),
      label: s.id,
      pct: s.completion,
    }
  })

  const gridLevels = [20, 40, 60, 80, 100]

  const gridPolygon = (pct: number) => {
    return Array.from({ length: n }, (_, i) => {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2
      return `${cx + Math.cos(angle) * r * (pct / 100)},${cy + Math.sin(angle) * r * (pct / 100)}`
    }).join(' ')
  }

  const dataPath = points.map(p => `${p.x},${p.y}`).join(' ')

  return (
    <svg viewBox="0 0 400 400" className="w-full max-w-lg mx-auto">
      {/* Grid */}
      {gridLevels.map(lvl => (
        <polygon key={lvl} points={gridPolygon(lvl)} fill="none" stroke="#e5e7eb" strokeWidth="1" />
      ))}
      {/* Axes */}
      {Array.from({ length: n }, (_, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2
        return (
          <line
            key={i}
            x1={cx} y1={cy}
            x2={cx + Math.cos(angle) * r}
            y2={cy + Math.sin(angle) * r}
            stroke="#e5e7eb" strokeWidth="1"
          />
        )
      })}
      {/* Data fill */}
      <polygon points={dataPath} fill="rgba(34,197,94,0.2)" stroke="#16a34a" strokeWidth="2" />
      {/* Data points */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4} fill="#16a34a" />
      ))}
      {/* Labels */}
      {points.map((p, i) => (
        <g key={i}>
          <text
            x={p.lx} y={p.ly}
            textAnchor={p.lx < cx - 5 ? 'end' : p.lx > cx + 5 ? 'start' : 'middle'}
            dominantBaseline="middle"
            fontSize="11"
            fontWeight="600"
            fill="#374151"
          >
            {p.label}
          </text>
          <text
            x={p.lx} y={p.ly + 13}
            textAnchor={p.lx < cx - 5 ? 'end' : p.lx > cx + 5 ? 'start' : 'middle'}
            dominantBaseline="middle"
            fontSize="9"
            fill="#6b7280"
          >
            {p.pct}%
          </text>
        </g>
      ))}
      {/* Grid labels */}
      {gridLevels.map(lvl => (
        <text key={lvl} x={cx + 4} y={cy - r * (lvl / 100) + 3} fontSize="8" fill="#9ca3af">{lvl}%</text>
      ))}
    </svg>
  )
}

// ─── Circular gauge ───────────────────────────────────────────────────────────

function CircularGauge({ value, size = 120 }: { value: number; size?: number }) {
  const r = 45
  const circ = 2 * Math.PI * r
  const fill = circ - (value / 100) * circ
  const color = value >= 75 ? '#16a34a' : value >= 50 ? '#f59e0b' : '#dc2626'

  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#e5e7eb" strokeWidth="10" />
      <circle
        cx="50" cy="50" r={r}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeDasharray={circ}
        strokeDashoffset={fill}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
      <text x="50" y="46" textAnchor="middle" fontSize="18" fontWeight="bold" fill={color}>{value}</text>
      <text x="50" y="60" textAnchor="middle" fontSize="9" fill="#6b7280">/ 100</text>
    </svg>
  )
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ value, color = '#16a34a', className = '' }: { value: number; color?: string; className?: string }) {
  return (
    <div className={`w-full bg-gray-100 rounded-full h-2 ${className}`}>
      <div
        className="h-2 rounded-full transition-all duration-500"
        style={{ width: `${value}%`, backgroundColor: color }}
      />
    </div>
  )
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: 'validated' | 'partial' | 'missing' }) {
  if (status === 'validated') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <CheckCircle className="h-3 w-3" /> Valide
      </span>
    )
  }
  if (status === 'partial') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
        <AlertCircle className="h-3 w-3" /> Partiel
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
      <XCircle className="h-3 w-3" /> Manquant
    </span>
  )
}

// ─── TAB 1 — Builder ──────────────────────────────────────────────────────────

function TabBuilder({
  selectedSections,
  setSelectedSections,
  org,
  setOrg,
  orgs,
  year,
  setYear,
  lang,
  setLang,
  format,
  setFormat,
  options,
  setOptions,
  onGenerate,
}: {
  selectedSections: string[]
  setSelectedSections: (ids: string[]) => void
  org: string
  setOrg: (v: string) => void
  orgs: string[]
  year: string
  setYear: (v: string) => void
  lang: Language
  setLang: (v: Language) => void
  format: ExportFormat
  setFormat: (v: ExportFormat) => void
  options: Record<string, boolean>
  setOptions: (o: Record<string, boolean>) => void
  onGenerate: () => void
}) {
  const { t } = useTranslation()
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genStage, setGenStage] = useState<string | null>(null)
  const [genDone, setGenDone] = useState(false)

  const toggleSection = (id: string) => {
    if (selectedSections.includes(id)) {
      setSelectedSections(selectedSections.filter(s => s !== id))
    } else {
      setSelectedSections([...selectedSections, id])
    }
  }

  const checkedSections = ESRS_SECTIONS.filter(s => selectedSections.includes(s.id))
  const overallScore = checkedSections.length
    ? Math.round(checkedSections.reduce((acc, s) => acc + s.completion, 0) / checkedSections.length)
    : 0
  const missingTotal = checkedSections.flatMap(s => s.indicators).filter(i => i.status === 'missing').length

  const handleGenerate = async () => {
    setGenerating(true)
    setGenDone(false)
    const stages = [
      t('csrdBuilder.progress.step1'),
      t('csrdBuilder.progress.step2'),
      t('csrdBuilder.progress.step3'),
    ]
    for (const stage of stages) {
      setGenStage(stage)
      await new Promise(res => setTimeout(res, 1200))
    }
    setGenerating(false)
    setGenDone(true)
    setGenStage(null)
    toast.success(t('csrdBuilder.successTitle'))
  }

  const formatButtons: { key: ExportFormat; icon: React.ElementType; label: string }[] = [
    { key: 'PDF', icon: Shield, label: 'PDF' },
    { key: 'Excel', icon: BarChart3, label: 'Excel' },
    { key: 'Word', icon: FileText, label: 'Word' },
    { key: 'JSON', icon: Code2, label: 'JSON' },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* LEFT PANEL */}
      <div className="lg:col-span-2 space-y-6">
        {/* Section A — Configuration */}
        <Card title={t('csrdBuilder.config')}>
          <div className="space-y-5">
            {/* Org */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Building2 className="inline h-4 w-4 mr-1 text-gray-400" />
                {t('csrdBuilder.orgLabel')}
              </label>
              <select
                value={org}
                onChange={e => setOrg(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-300 focus:border-primary-400 outline-none"
              >
                {orgs.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>

            {/* Period */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="inline h-4 w-4 mr-1 text-gray-400" />
                {t('csrdBuilder.periodLabel')}
              </label>
              <div className="flex gap-2">
                {['2024', '2023', '2022'].map(y => (
                  <button
                    key={y}
                    onClick={() => setYear(y)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors
                      ${year === y ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'}`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>

            {/* Language */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Globe className="inline h-4 w-4 mr-1 text-gray-400" />
                {t('csrdBuilder.langLabel')}
              </label>
              <div className="flex gap-2">
                {(['FR', 'EN'] as Language[]).map(l => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`px-5 py-1.5 rounded-full text-sm font-medium border transition-colors
                      ${lang === l ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'}`}
                  >
                    {l === 'FR' ? 'FR' : 'EN'}
                  </button>
                ))}
              </div>
            </div>

            {/* Format */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('csrdBuilder.formatLabel')}
              </label>
              <div className="flex gap-2 flex-wrap">
                {formatButtons.map(({ key, icon: Icon, label }) => (
                  <button
                    key={key}
                    onClick={() => setFormat(key)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-colors
                      ${format === key ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Section B — ESRS Sections */}
        <Card title={t('csrdBuilder.esrsSections')}>
          <div className="space-y-5">
            {Object.entries(PILLAR_GROUPS).map(([pillarKey, pillar]) => (
              <div key={pillarKey}>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">{pillar.label}</p>
                <div className="space-y-2">
                  {ESRS_SECTIONS.filter(s => pillar.sections.includes(s.id)).map(section => (
                    <label key={section.id} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={selectedSections.includes(section.id)}
                        onChange={() => toggleSection(section.id)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-800 group-hover:text-primary-700 transition-colors">
                            <span
                              className="inline-block w-7 h-5 text-xs font-bold rounded text-white text-center leading-5 mr-1.5"
                              style={{ backgroundColor: section.color }}
                            >
                              {section.id}
                            </span>
                            {section.name}
                          </span>
                          <span className="text-xs font-semibold text-gray-600 flex-shrink-0 ml-2">{section.completion}%</span>
                        </div>
                        <ProgressBar
                          value={section.completion}
                          color={section.completion >= 75 ? '#16a34a' : section.completion >= 50 ? '#f59e0b' : '#dc2626'}
                        />
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Section C — Advanced Options */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setAdvancedOpen(!advancedOpen)}
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-700">{t('csrdBuilder.advancedOptions')}</span>
            </div>
            {advancedOpen ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
          </button>
          {advancedOpen && (
            <div className="p-4 space-y-3 bg-white">
              {([
                ['executiveSummary', 'Inclure synthese executive'],
                ['charts', 'Inclure graphiques et visualisations'],
                ['yearComparison', 'Comparaison avec annee precedente'],
                ['aiRecommendations', 'Inclure recommandations IA'],
                ['technicalAnnexes', 'Annexes techniques detaillees'],
                ['doubleMateriality', 'Double materialite (art. 29a CSRD)'],
              ] as [string, string][]).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options[key] ?? false}
                    onChange={e => setOptions({ ...options, [key]: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL — Sticky preview */}
      <div className="lg:col-span-1">
        <div className="sticky top-6 space-y-4">
          <div className="rounded-xl overflow-hidden border border-gray-200 shadow-lg">
            {/* Dark header */}
            <div className="bg-gradient-to-br from-emerald-800 to-emerald-600 p-4">
              <div className="flex items-center gap-2 text-white">
                <Eye className="h-4 w-4" />
                <span className="text-sm font-semibold">{t('csrdBuilder.reportPreview')}</span>
              </div>
            </div>

            {/* Cover preview */}
            <div className="bg-white p-4 border-b border-gray-100">
              <div className="border border-gray-200 rounded-lg overflow-hidden text-center">
                <div className="h-2 bg-gradient-to-r from-emerald-500 to-emerald-700" />
                <div className="py-4 px-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-[9px] font-bold text-gray-800 uppercase tracking-widest leading-tight">
                    RAPPORT DE DURABILITE CSRD
                  </p>
                  <p className="text-[8px] text-gray-500 mt-1">{org}</p>
                  <p className="text-[8px] text-emerald-600 font-medium">Exercice {year}</p>
                </div>
                <div className="h-1 bg-gradient-to-r from-emerald-500 to-emerald-700" />
              </div>
            </div>

            {/* TOC preview */}
            <div className="bg-white p-4 border-b border-gray-100">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Table des matieres</p>
              <div className="space-y-1">
                {checkedSections.slice(0, 6).map(s => (
                  <div key={s.id} className="flex items-center gap-1.5">
                    <span className="text-[8px] font-bold text-white px-1 rounded" style={{ backgroundColor: s.color }}>
                      {s.id}
                    </span>
                    <span className="text-[9px] text-gray-600 truncate">{s.name}</span>
                  </div>
                ))}
                {checkedSections.length > 6 && (
                  <p className="text-[8px] text-gray-400">+{checkedSections.length - 6} autres sections...</p>
                )}
              </div>
            </div>

            {/* Score */}
            <div className="bg-white p-4 border-b border-gray-100">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Score de completude global</p>
              <div className="flex items-center gap-3">
                <CircularGauge value={overallScore} size={70} />
                <div>
                  <p className="text-2xl font-bold text-gray-900">{overallScore}%</p>
                  <p className="text-xs text-gray-500">{checkedSections.length} sections</p>
                </div>
              </div>
            </div>

            {/* Missing data warning */}
            <div className="bg-white p-4">
              {missingTotal > 5 && (
                <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg mb-3">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                  <p className="text-[10px] text-red-700">
                    {missingTotal} donnees manquantes detectees
                  </p>
                </div>
              )}

              {/* Generate button */}
              {!generating && !genDone && (
                <button
                  onClick={handleGenerate}
                  className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <Shield className="h-4 w-4" />
                  {t('csrdBuilder.generateBtn')}
                </button>
              )}

              {generating && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                    {genStage}
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-emerald-500 animate-pulse" style={{ width: '60%' }} />
                  </div>
                </div>
              )}

              {genDone && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <p className="text-xs text-green-700 font-medium">{t('csrdBuilder.successTitle')}</p>
                  </div>
                  <button className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50">
                    <Download className="h-3.5 w-3.5" />
                    {t('csrdBuilder.downloadBtn')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── TAB 2 — Indicators & Data ────────────────────────────────────────────────

function TabIndicators({ selectedSections }: { selectedSections: string[] }) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [filterSection, setFilterSection] = useState('')
  const [onlyMissing, setOnlyMissing] = useState(false)
  const [expanded, setExpanded] = useState<string[]>(['E1'])

  const toggleExpand = (id: string) => {
    setExpanded(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const filteredSections = ESRS_SECTIONS.filter(s => {
    if (filterSection && s.id !== filterSection) return false
    return true
  })

  return (
    <div className="space-y-4">
      {/* Header filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Rechercher un indicateur..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-300 outline-none"
        />
        <select
          value={filterSection}
          onChange={e => setFilterSection(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-300 outline-none"
        >
          <option value="">Toutes les sections ESRS</option>
          {ESRS_SECTIONS.map(s => (
            <option key={s.id} value={s.id}>{s.id} — {s.name}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
          <input
            type="checkbox"
            checked={onlyMissing}
            onChange={e => setOnlyMissing(e.target.checked)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700">Donnees manquantes uniquement</span>
        </label>
      </div>

      {/* Accordion sections */}
      <div className="space-y-3">
        {filteredSections.map(section => {
          const isExpanded = expanded.includes(section.id)
          const filteredIndicators = section.indicators.filter(ind => {
            if (onlyMissing && ind.status !== 'missing') return false
            if (search && !ind.name.toLowerCase().includes(search.toLowerCase()) && !ind.code.toLowerCase().includes(search.toLowerCase())) return false
            return true
          })
          if (search || onlyMissing) {
            if (filteredIndicators.length === 0) return null
          }

          return (
            <div key={section.id} className="border border-gray-200 rounded-xl overflow-hidden">
              {/* Section header */}
              <button
                onClick={() => toggleExpand(section.id)}
                className="w-full flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
              >
                <span
                  className="inline-flex items-center justify-center w-10 h-7 rounded text-xs font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: section.color }}
                >
                  {section.id}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-gray-800">{section.name}</span>
                    <span className="text-xs font-bold text-gray-600 ml-2">{section.completion}%</span>
                  </div>
                  <ProgressBar value={section.completion} color={section.color} />
                </div>
                <span className="text-xs text-gray-400 ml-2">{section.indicators.length} indicateurs</span>
                {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />}
              </button>

              {/* Indicators table */}
              {isExpanded && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-white border-b border-gray-100">
                        <th className="text-left py-2 px-4 font-medium text-gray-600 text-xs">Indicateur</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-600 text-xs">Code</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-600 text-xs">Unite</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-600 text-xs">Valeur 2024</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-600 text-xs">Statut</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-600 text-xs">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(search || onlyMissing ? filteredIndicators : section.indicators).map((ind, idx) => (
                        <tr
                          key={ind.code}
                          className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                        >
                          <td className="py-2.5 px-4 font-medium text-gray-900 text-xs">{ind.name}</td>
                          <td className="py-2.5 px-3">
                            <code className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-mono">{ind.code}</code>
                          </td>
                          <td className="py-2.5 px-3 text-gray-500 text-xs">{ind.unit}</td>
                          <td className="py-2.5 px-3 font-semibold text-gray-900 text-xs">
                            {ind.value ?? <span className="text-gray-300">—</span>}
                          </td>
                          <td className="py-2.5 px-3">
                            <StatusBadge status={ind.status} />
                          </td>
                          <td className="py-2.5 px-3 text-gray-500 text-xs">
                            {ind.source ?? <span className="text-gray-300">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── TAB 3 — CSRD Score ───────────────────────────────────────────────────────

function TabScore() {
  const { t } = useTranslation()
  const [apiScore, setApiScore] = useState<number | null>(null)

  useEffect(() => {
    api.get('/scores/dashboard')
      .then(res => {
        const data = res.data
        if (typeof data?.statistics?.average_score === 'number') {
          setApiScore(Math.round(data.statistics.average_score))
        }
      })
      .catch(() => {})
  }, [])

  const global = apiScore ?? globalScore(ESRS_SECTIONS)
  const compliantSections = ESRS_SECTIONS.filter(s => s.completion >= 75).length
  const missingTotal = missingCount(ESRS_SECTIONS, ESRS_SECTIONS.map(s => s.id))

  const envAvg = Math.round(ESRS_SECTIONS.filter(s => ['E1','E2','E3','E4','E5'].includes(s.id)).reduce((a, s) => a + s.completion, 0) / 5)
  const socAvg = Math.round(ESRS_SECTIONS.filter(s => ['S1','S2','S3','S4'].includes(s.id)).reduce((a, s) => a + s.completion, 0) / 4)
  const govAvg = ESRS_SECTIONS.find(s => s.id === 'G1')?.completion ?? 0

  // Lowest 3 sections
  const lowestSections = [...ESRS_SECTIONS].sort((a, b) => a.completion - b.completion).slice(0, 3)

  const recommendedActions: Record<string, string> = {
    'E3': 'Ajouter donnees consommation eau recyclee et stress hydrique',
    'E4': 'Evaluer l\'impact biodiversite avec un outil certifie',
    'S3': 'Initier une consultation des communautes affectees',
    'S4': 'Mettre en place un systeme de collecte des reclamations',
    'E2': 'Completer les donnees de rejets dans l\'eau',
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex flex-col items-center py-2">
            <p className="text-sm font-medium text-gray-600 mb-3">{t('csrdBuilder.globalScore')}</p>
            <CircularGauge value={global} size={120} />
            <p className="text-xs text-gray-500 mt-2">
              {global >= 75 ? 'Bonne conformite' : global >= 50 ? 'Conformite partielle' : 'Non conforme'}
            </p>
          </div>
        </Card>
        <Card>
          <div className="flex flex-col items-center py-4">
            <CheckCircle className="h-10 w-10 text-green-500 mb-2" />
            <p className="text-4xl font-bold text-gray-900">{compliantSections}</p>
            <p className="text-sm font-medium text-gray-600 mt-1">{t('csrdBuilder.compliantSections')}</p>
            <p className="text-xs text-gray-500 mt-1">sections ≥ 75%</p>
          </div>
        </Card>
        <Card>
          <div className="flex flex-col items-center py-4">
            <AlertTriangle className="h-10 w-10 text-red-400 mb-2" />
            <p className="text-4xl font-bold text-gray-900">{missingTotal}</p>
            <p className="text-sm font-medium text-gray-600 mt-1">{t('csrdBuilder.missingPoints')}</p>
            <p className="text-xs text-gray-500 mt-1">indicateurs sans donnees</p>
          </div>
        </Card>
      </div>

      {/* Radar */}
      <Card title={t('csrdBuilder.radarTitle')}>
        <RadarChart sections={ESRS_SECTIONS} />
      </Card>

      {/* Pillar analysis */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Environnement */}
        <Card title={t('csrdBuilder.pillarEnv')}>
          <div className="space-y-3">
            <div className="text-center mb-4">
              <span className="text-3xl font-bold text-emerald-600">{envAvg}%</span>
              <p className="text-xs text-gray-500">Score moyen</p>
            </div>
            {ESRS_SECTIONS.filter(s => ['E1','E2','E3','E4','E5'].includes(s.id)).map(s => (
              <div key={s.id}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-600">{s.id} — {s.name.slice(0, 18)}</span>
                  <span className="font-bold text-gray-700">{s.completion}%</span>
                </div>
                <ProgressBar value={s.completion} color={s.color} />
              </div>
            ))}
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-700 mb-1">Points forts</p>
              <p className="text-xs text-green-600">GES Scope 1 & 2 valides, Energie renouvelable suivie</p>
              <p className="text-xs font-semibold text-gray-700 mb-1 mt-2">A ameliorer</p>
              <p className="text-xs text-red-600">Biodiversite, stress hydrique, eau recyclee</p>
            </div>
          </div>
        </Card>

        {/* Social */}
        <Card title={t('csrdBuilder.pillarSoc')}>
          <div className="space-y-3">
            <div className="text-center mb-4">
              <span className="text-3xl font-bold text-blue-600">{socAvg}%</span>
              <p className="text-xs text-gray-500">Score moyen</p>
            </div>
            {ESRS_SECTIONS.filter(s => ['S1','S2','S3','S4'].includes(s.id)).map(s => (
              <div key={s.id}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-600">{s.id} — {s.name.slice(0, 18)}</span>
                  <span className="font-bold text-gray-700">{s.completion}%</span>
                </div>
                <ProgressBar value={s.completion} color={s.color} />
              </div>
            ))}
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-700 mb-1">Points forts</p>
              <p className="text-xs text-green-600">Effectifs complets (89%), donnees RH fiables</p>
              <p className="text-xs font-semibold text-gray-700 mb-1 mt-2">A ameliorer</p>
              <p className="text-xs text-red-600">Communautes (28%), consommateurs partiels</p>
            </div>
          </div>
        </Card>

        {/* Gouvernance */}
        <Card title={t('csrdBuilder.pillarGov')}>
          <div className="space-y-3">
            <div className="text-center mb-4">
              <span className="text-3xl font-bold text-gray-700">{govAvg}%</span>
              <p className="text-xs text-gray-500">Score moyen</p>
            </div>
            {ESRS_SECTIONS.filter(s => ['G1'].includes(s.id)).map(s => (
              <div key={s.id}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-600">{s.id} — {s.name}</span>
                  <span className="font-bold text-gray-700">{s.completion}%</span>
                </div>
                <ProgressBar value={s.completion} color={s.color} />
              </div>
            ))}
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-700 mb-1">Points forts</p>
              <p className="text-xs text-green-600">Gouvernance diversifiee, zero corruption signale</p>
              <p className="text-xs font-semibold text-gray-700 mb-1 mt-2">A ameliorer</p>
              <p className="text-xs text-amber-600">Completer la formation ethique a 100%</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recommendations */}
      <Card title={t('csrdBuilder.recommendations')}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {lowestSections.map((section, i) => (
            <div key={section.id} className="border border-gray-200 rounded-xl p-4 hover:border-primary-300 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold text-white px-2 py-1 rounded" style={{ backgroundColor: section.color }}>
                  #{i + 1} {section.id}
                </span>
                <span className="text-xs font-semibold text-gray-600">{section.completion}%</span>
              </div>
              <p className="text-sm font-medium text-gray-800 mb-1">{section.name}</p>
              <p className="text-xs text-gray-500 mb-3">
                {recommendedActions[section.id] ?? 'Completer les donnees manquantes pour cette section'}
              </p>
              <button className="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-800 transition-colors">
                {t('csrdBuilder.completeSection')} <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ─── TAB 4 — Generate & Export ────────────────────────────────────────────────

function TabGenerate({
  selectedSections,
  org,
  year,
  lang,
  format,
  options,
  onFormatChange,
}: {
  selectedSections: string[]
  org: string
  year: string
  lang: Language
  format: ExportFormat
  options: Record<string, boolean>
  onFormatChange: (f: ExportFormat) => void
}) {
  const { t } = useTranslation()
  const [generating, setGenerating] = useState(false)
  const [genStage, setGenStage] = useState<number>(-1)
  const [genDone, setGenDone] = useState(false)

  const checkedSections = ESRS_SECTIONS.filter(s => selectedSections.includes(s.id))
  const overallScore = checkedSections.length
    ? Math.round(checkedSections.reduce((acc, s) => acc + s.completion, 0) / checkedSections.length)
    : 0
  const incompleteSections = checkedSections.filter(s => s.completion < 50)

  const stages = [
    t('csrdBuilder.progress.step1'),
    t('csrdBuilder.progress.step2'),
    t('csrdBuilder.progress.step3'),
  ]

  const handleGenerate = async () => {
    setGenerating(true)
    setGenDone(false)
    for (let i = 0; i < stages.length; i++) {
      setGenStage(i)
      await new Promise(res => setTimeout(res, i === 2 ? 1500 : 1200))
    }
    setGenerating(false)
    setGenDone(true)
    toast.success(t('csrdBuilder.successTitle'))
  }

  const optionLabels: Record<string, string> = {
    executiveSummary: 'Synthese executive incluse',
    charts: 'Graphiques et visualisations',
    yearComparison: 'Comparaison annee precedente',
    aiRecommendations: 'Recommandations IA',
    technicalAnnexes: 'Annexes techniques',
    doubleMateriality: 'Double materialite (art. 29a)',
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Step 1 — Config summary */}
      <Card title={`Etape 1 — ${t('csrdBuilder.configSummary')}`}>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">{t('csrdBuilder.orgLabel')}</p>
            <p className="font-medium text-gray-900 flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5 text-green-500" /> {org}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">{t('csrdBuilder.periodLabel')}</p>
            <p className="font-medium text-gray-900 flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5 text-green-500" /> Exercice {year}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">{t('csrdBuilder.langLabel')}</p>
            <p className="font-medium text-gray-900 flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5 text-green-500" /> {lang === 'FR' ? 'Francais' : 'English'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">{t('csrdBuilder.formatLabel')}</p>
            <p className="font-medium text-gray-900 flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5 text-green-500" /> {format}
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Options selectionnees</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(options).filter(([, v]) => v).map(([k]) => (
              <span key={k} className="flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs">
                <CheckCircle className="h-3 w-3" /> {optionLabels[k] ?? k}
              </span>
            ))}
          </div>
        </div>
      </Card>

      {/* Step 2 — Content */}
      <Card title={`Etape 2 — ${t('csrdBuilder.reportContent')}`}>
        <div className="space-y-3">
          {checkedSections.map(s => (
            <div key={s.id} className="flex items-center gap-3">
              <span className="text-xs font-bold text-white px-2 py-1 rounded flex-shrink-0" style={{ backgroundColor: s.color }}>
                {s.id}
              </span>
              <span className="text-sm text-gray-700 flex-1">{s.name}</span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <ProgressBar value={s.completion} color={s.completion >= 75 ? '#16a34a' : s.completion >= 50 ? '#f59e0b' : '#dc2626'} className="w-20" />
                <span className="text-xs font-bold text-gray-600 w-8 text-right">{s.completion}%</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
          <CircularGauge value={overallScore} size={60} />
          <div>
            <p className="text-lg font-bold text-gray-900">Score CSRD global: {overallScore}%</p>
            <p className="text-xs text-gray-500">{checkedSections.length} sections selectionnees</p>
          </div>
        </div>

        {incompleteSections.length > 0 && (
          <div className="mt-4 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              <strong>{incompleteSections.length} {t('csrdBuilder.incompleteSections')}</strong> (
              {incompleteSections.map(s => s.id).join(', ')}) — {t('csrdBuilder.warningIncomplete')}
            </p>
          </div>
        )}
      </Card>

      {/* Step 3 — Generate */}
      <Card title="Etape 3 — Generer">
        <div className="space-y-4">
          {/* Format selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Format d'export</label>
            <div className="flex gap-2 flex-wrap">
              {(['PDF', 'Excel', 'Word'] as ExportFormat[]).map(fmt => (
                <button
                  key={fmt}
                  onClick={() => onFormatChange(fmt)}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors
                    ${format === fmt ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'}`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          {!generating && !genDone && (
            <button
              onClick={handleGenerate}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl py-4 text-base font-bold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
            >
              <Shield className="h-5 w-5" />
              Generer le rapport CSRD {year}
            </button>
          )}

          {generating && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-xl">
              {stages.map((stage, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                    genStage > i ? 'bg-green-500' : genStage === i ? 'bg-primary-600 animate-pulse' : 'bg-gray-200'
                  }`}>
                    {genStage > i
                      ? <CheckCircle className="h-3.5 w-3.5 text-white" />
                      : genStage === i
                        ? <RefreshCw className="h-3 w-3 text-white animate-spin" />
                        : <span className="text-[10px] text-gray-500">{i + 1}</span>
                    }
                  </div>
                  <span className={`text-sm ${genStage === i ? 'text-primary-700 font-semibold' : genStage > i ? 'text-green-600' : 'text-gray-400'}`}>
                    {stage}
                  </span>
                </div>
              ))}
            </div>
          )}

          {genDone && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-green-800">{t('csrdBuilder.successTitle')}</span>
                </div>
                <p className="text-xs text-green-700">Rapport_CSRD_{org.replace(/\s+/g, '_')}_{year}.{format.toLowerCase()}</p>
                <p className="text-xs text-green-600 mt-0.5">Taille estimee: ~2.4 MB</p>
              </div>
              <div className="flex gap-3">
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors">
                  <Download className="h-4 w-4" />
                  {t('csrdBuilder.downloadBtn')}
                </button>
                <button className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
                  <Share2 className="h-4 w-4" />
                  {t('csrdBuilder.shareBtn')}
                </button>
              </div>
              <button
                onClick={() => setGenDone(false)}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Regenerer le rapport
              </button>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CSRDReportBuilder() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<TabKey>('builder')
  const [selectedSections, setSelectedSections] = useState<string[]>(ESRS_SECTIONS.map(s => s.id))
  const [org, setOrg] = useState('Demo Organization')
  const [orgs, setOrgs] = useState<string[]>(['Demo Organization'])
  const [year, setYear] = useState('2024')
  const [lang, setLang] = useState<Language>('FR')
  const [format, setFormat] = useState<ExportFormat>('PDF')
  const [options, setOptions] = useState<Record<string, boolean>>({
    executiveSummary: true,
    charts: true,
    yearComparison: true,
    aiRecommendations: false,
    technicalAnnexes: false,
    doubleMateriality: true,
  })

  useEffect(() => {
    api.get('/organizations')
      .then(res => {
        const data: Array<{ name: string }> = Array.isArray(res.data) ? res.data : []
        if (data.length > 0) {
          const names = data.map(o => o.name)
          setOrgs(names)
          setOrg(names[0])
        }
      })
      .catch(() => {})
  }, [])

  const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: 'builder', label: t('csrdBuilder.tabs.builder'), icon: Settings },
    { key: 'indicators', label: t('csrdBuilder.tabs.indicators'), icon: BarChart3 },
    { key: 'score', label: t('csrdBuilder.tabs.score'), icon: Target },
    { key: 'generate', label: t('csrdBuilder.tabs.generate'), icon: Zap },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('csrdBuilder.title')}</h1>
          <p className="mt-1 text-gray-500 text-sm">{t('csrdBuilder.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-violet-100 text-violet-700 text-xs font-bold rounded-full uppercase tracking-wider">
            CSRD 2024
          </span>
          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full uppercase tracking-wider">
            ESRS
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-1">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px
                ${activeTab === tab.key
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'builder' && (
        <TabBuilder
          selectedSections={selectedSections}
          setSelectedSections={setSelectedSections}
          org={org}
          setOrg={setOrg}
          orgs={orgs}
          year={year}
          setYear={setYear}
          lang={lang}
          setLang={setLang}
          format={format}
          setFormat={setFormat}
          options={options}
          setOptions={setOptions}
          onGenerate={() => setActiveTab('generate')}
        />
      )}
      {activeTab === 'indicators' && (
        <TabIndicators selectedSections={selectedSections} />
      )}
      {activeTab === 'score' && <TabScore />}
      {activeTab === 'generate' && (
        <TabGenerate
          selectedSections={selectedSections}
          org={org}
          year={year}
          lang={lang}
          format={format}
          options={options}
          onFormatChange={setFormat}
        />
      )}
    </div>
  )
}
