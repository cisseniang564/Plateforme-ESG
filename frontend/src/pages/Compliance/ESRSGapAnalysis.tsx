import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Download, RefreshCw, ChevronDown, ChevronUp, Leaf, Users, Building2, Target } from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';

// Types
interface Disclosure {
  id: string;
  label: string;
  covered: boolean;
}

interface ESRSSection {
  code: string;
  label: string;
  short: string;
  pillar: 'environmental' | 'social' | 'governance';
  pillar_color: string;
  description: string;
  coverage_pct: number;
  status: 'ready' | 'partial' | 'missing';
  matching_entries: number;
  disclosures_total: number;
  disclosures_covered: number;
  disclosures_missing: number;
  disclosures: Disclosure[];
}

interface GapAnalysis {
  overall_coverage_pct: number;
  total_entries: number;
  total_sections: number;
  sections_ready: number;
  sections_partial: number;
  sections_missing: number;
  total_disclosures: number;
  covered_disclosures: number;
  pillar_counts: Record<string, number>;
  sections: ESRSSection[];
}

const PILLAR_STYLES = {
  environmental: { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500', icon: Leaf, label: 'Environnement' },
  social: { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700', bar: 'bg-blue-500', icon: Users, label: 'Social' },
  governance: { bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700', bar: 'bg-purple-500', icon: Building2, label: 'Gouvernance' },
};

const STATUS_CONFIG = {
  ready: { label: 'Prêt', color: 'text-emerald-600', bg: 'bg-emerald-100', icon: CheckCircle2 },
  partial: { label: 'Partiel', color: 'text-amber-600', bg: 'bg-amber-100', icon: AlertCircle },
  missing: { label: 'Manquant', color: 'text-red-600', bg: 'bg-red-100', icon: XCircle },
};

function PillarSummary({ pillar, sections, style }: { pillar: string; sections: ESRSSection[]; style: typeof PILLAR_STYLES['environmental'] }) {
  const pillarSections = sections.filter(s => s.pillar === pillar);
  const totalDisc = pillarSections.reduce((a, s) => a + s.disclosures_total, 0);
  const coveredDisc = pillarSections.reduce((a, s) => a + s.disclosures_covered, 0);
  const pct = totalDisc > 0 ? Math.round((coveredDisc / totalDisc) * 100) : 0;
  const Icon = style.icon;

  // SVG circle progress
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  const strokeColor = pillar === 'environmental' ? '#10b981' : pillar === 'social' ? '#3b82f6' : '#a855f7';

  return (
    <div className={`flex flex-col items-center p-4 rounded-xl ${style.bg} border ${style.border}`}>
      <div className="relative w-20 h-20 mb-2">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r={r} fill="none" stroke="#e5e7eb" strokeWidth="6" />
          <circle cx="36" cy="36" r={r} fill="none" stroke={strokeColor} strokeWidth="6" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-gray-800">{pct}%</span>
        </div>
      </div>
      <div className={`p-1.5 rounded-lg ${style.badge} mb-1`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-sm font-semibold text-gray-700">{style.label}</p>
      <p className="text-xs text-gray-500">{coveredDisc}/{totalDisc} disclosures</p>
    </div>
  );
}

function SectionCard({ section, expanded, onToggle }: { section: ESRSSection; expanded: boolean; onToggle: () => void }) {
  const style = PILLAR_STYLES[section.pillar];
  const status = STATUS_CONFIG[section.status];
  const StatusIcon = status.icon;

  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden transition-all">
      <button
        onClick={onToggle}
        className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <span className={`flex-shrink-0 px-2 py-0.5 rounded-md text-xs font-bold ${style.badge}`}>
              {section.code}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{section.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{section.disclosures_covered}/{section.disclosures_total} disclosures couverts</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </span>
            {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Couverture</span>
            <span className="font-medium">{section.coverage_pct}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${style.bar}`}
              style={{ width: `${section.coverage_pct}%` }}
            />
          </div>
        </div>
      </button>

      {expanded && (
        <div className={`border-t border-gray-100 ${style.bg} p-4`}>
          <p className="text-xs text-gray-600 mb-3 italic">{section.description}</p>
          <div className="space-y-2">
            {section.disclosures.map(d => (
              <div key={d.id} className="flex items-start gap-2">
                {d.covered
                  ? <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  : <XCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />}
                <div>
                  <span className="text-xs font-semibold text-gray-500 mr-2">{d.id}</span>
                  <span className="text-xs text-gray-700">{d.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ESRSGapAnalysis() {
  const [data, setData] = useState<GapAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [filterPillar, setFilterPillar] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/esrs/gap-analysis');
      setData(res.data);
    } catch {
      toast.error('Erreur lors du chargement de l\'analyse ESRS');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.post('/esrs/gap-analysis/export', {}, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'esrs_gap_analysis.csv';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export CSV téléchargé');
    } catch {
      toast.error('Erreur lors de l\'export');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const filteredSections = filterPillar === 'all'
    ? data.sections
    : data.sections.filter(s => s.pillar === filterPillar);

  // SVG ring for overall score
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ - (data.overall_coverage_pct / 100) * circ;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analyse de conformité ESRS</h1>
          <p className="text-sm text-gray-500 mt-1">
            Couverture de vos données par rapport aux {data.total_disclosures} exigences CSRD
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Actualiser"
          >
            <RefreshCw className="h-4 w-4 text-gray-500" />
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Export...' : 'Exporter CSV'}
          </button>
        </div>
      </div>

      {/* Overview row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Big score */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center justify-center">
          <div className="relative w-32 h-32 mb-3">
            <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r={r} fill="none" stroke="#f3f4f6" strokeWidth="10" />
              <circle
                cx="60" cy="60" r={r} fill="none"
                stroke={data.overall_coverage_pct >= 70 ? '#10b981' : data.overall_coverage_pct >= 40 ? '#f59e0b' : '#ef4444'}
                strokeWidth="10"
                strokeDasharray={circ}
                strokeDashoffset={offset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-gray-900">{data.overall_coverage_pct}%</span>
              <span className="text-xs text-gray-500">couverture</span>
            </div>
          </div>
          <div className="flex gap-3 text-center">
            <div>
              <p className="text-lg font-bold text-emerald-600">{data.sections_ready}</p>
              <p className="text-xs text-gray-500">Prêts</p>
            </div>
            <div className="w-px bg-gray-200" />
            <div>
              <p className="text-lg font-bold text-amber-600">{data.sections_partial}</p>
              <p className="text-xs text-gray-500">Partiels</p>
            </div>
            <div className="w-px bg-gray-200" />
            <div>
              <p className="text-lg font-bold text-red-500">{data.sections_missing}</p>
              <p className="text-xs text-gray-500">Manquants</p>
            </div>
          </div>
        </div>

        {/* Pillar summaries */}
        {(['environmental', 'social', 'governance'] as const).map(p => (
          <PillarSummary key={p} pillar={p} sections={data.sections} style={PILLAR_STYLES[p]} />
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[
          { key: 'all', label: 'Tous' },
          { key: 'environmental', label: '🌿 Environnement' },
          { key: 'social', label: '👥 Social' },
          { key: 'governance', label: '🏛️ Gouvernance' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilterPillar(f.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterPillar === f.key
                ? 'bg-green-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Standards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredSections.map(section => (
          <SectionCard
            key={section.code}
            section={section}
            expanded={expandedSection === section.code}
            onToggle={() => setExpandedSection(expandedSection === section.code ? null : section.code)}
          />
        ))}
      </div>

      {/* Footer note */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex gap-3">
          <Target className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Comment améliorer votre score ?</p>
            <p className="text-sm text-amber-700 mt-1">
              Ajoutez des données dans <strong>Saisie des données</strong> en sélectionnant le pilier correspondant à chaque standard manquant.
              Plus vous renseignez d'entrées avec des catégories précises, meilleure sera votre couverture ESRS.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
