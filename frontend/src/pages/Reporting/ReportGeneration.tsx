/**
 * ReportGeneration — Page de génération de rapports ESG professionnels
 * Connectée aux vraies données via le backend ReportLab
 * Design : 2 colonnes — configurateur à gauche, aperçu live à droite
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FileText, Download, Building2, CheckCircle, Loader2,
  Sparkles, BarChart3, TrendingUp, Award, Globe,
  FileSpreadsheet, FileType, Braces, ChevronRight,
  Leaf, Users, Landmark, AlertTriangle, Target,
  ShieldCheck, Calendar, RefreshCw, Eye, Star,
  ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react';
import BackButton from '@/components/common/BackButton';
import api from '@/services/api';
import { getOrgLatestScore, getOrgScores } from '@/services/esgScoringService';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Organization { id: string; name: string; industry?: string; }
type ReportType = 'executive' | 'detailed' | 'csrd' | 'dpef' | 'carbon' | 'tcfd' | 'gri';
type ReportFormat = 'pdf' | 'excel' | 'word';

interface LiveData {
  score: number;
  rating: string;
  environmental: number;
  social: number;
  governance: number;
  data_completeness: number;
  trend: number;          // delta vs previous score
  materiality_count: number;
  material_count: number;
  risks_count: number;
  critical_risks: number;
  entries_count: number;
}

// ─── Config des types de rapports ────────────────────────────────────────────
const REPORT_TYPES: Array<{
  id: ReportType; name: string; desc: string; badge: string;
  icon: React.ElementType; gradient: string; pages: string; formats: ReportFormat[];
}> = [
  {
    id: 'csrd', name: 'Rapport CSRD', badge: 'Obligatoire',
    desc: 'Rapport complet conforme directive CSRD/ESRS avec couverture E1-G1, double matérialité et piste d\'audit.',
    icon: Globe, gradient: 'from-green-600 to-emerald-700', pages: '25-40 pages',
    formats: ['pdf', 'excel', 'word'],
  },
  {
    id: 'executive', name: 'Synthèse Exécutive', badge: 'Populaire',
    desc: 'Tableau de bord 1 page pour COMEX et investisseurs — scores E/S/G, tendance, points clés.',
    icon: Award, gradient: 'from-purple-600 to-violet-700', pages: '8-12 pages',
    formats: ['pdf', 'excel', 'word'],
  },
  {
    id: 'dpef', name: 'DPEF', badge: 'Réglementaire',
    desc: 'Déclaration de performance extra-financière conforme articles L.225-102-1 et suivants.',
    icon: FileText, gradient: 'from-blue-600 to-indigo-700', pages: '15-25 pages',
    formats: ['pdf', 'word'],
  },
  {
    id: 'carbon', name: 'Bilan Carbone', badge: 'GHG Protocol',
    desc: 'Émissions Scopes 1/2/3 détaillées selon GHG Protocol, facteurs ADEME, objectifs SBTi.',
    icon: Leaf, gradient: 'from-teal-600 to-green-700', pages: '10-18 pages',
    formats: ['pdf', 'excel'],
  },
  {
    id: 'tcfd', name: 'Rapport TCFD', badge: 'Investisseurs',
    desc: 'Divulgations climatiques selon le cadre Task Force on Climate-related Financial Disclosures.',
    icon: TrendingUp, gradient: 'from-orange-600 to-amber-700', pages: '12-20 pages',
    formats: ['pdf', 'word'],
  },
  {
    id: 'gri', name: 'Rapport GRI', badge: 'International',
    desc: 'Standards GRI (Global Reporting Initiative) — référentiel international de durabilité.',
    icon: BarChart3, gradient: 'from-rose-600 to-red-700', pages: '20-35 pages',
    formats: ['pdf', 'excel', 'word'],
  },
  {
    id: 'detailed', name: 'Rapport Détaillé', badge: 'Complet',
    desc: 'Tous les indicateurs ESG avec données brutes, historique, matérialité, risques et fournisseurs.',
    icon: ShieldCheck, gradient: 'from-gray-700 to-gray-900', pages: '30-50 pages',
    formats: ['pdf', 'excel', 'word'],
  },
];

const FORMAT_CONFIG: Record<ReportFormat, { icon: React.ElementType; label: string; ext: string; color: string }> = {
  pdf:   { icon: FileType,        label: 'PDF',   ext: '.pdf',  color: 'text-red-600 bg-red-50 border-red-200' },
  excel: { icon: FileSpreadsheet, label: 'Excel', ext: '.xlsx', color: 'text-green-700 bg-green-50 border-green-200' },
  word:  { icon: FileText,        label: 'Word',  ext: '.docx', color: 'text-blue-700 bg-blue-50 border-blue-200' },
};

// ─── Score gauge SVG ──────────────────────────────────────────────────────────
function ScoreGauge({ value, size = 96 }: { value: number; size?: number }) {
  const r = 36; const cx = 50; const cy = 52;
  const circ = Math.PI * r;
  const pct = Math.min(1, Math.max(0, value / 100));
  const dash = pct * circ;
  const color = value >= 60 ? '#059669' : value >= 35 ? '#d97706' : '#dc2626';
  return (
    <svg width={size} height={size * 0.7} viewBox="0 0 100 65">
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#e5e7eb" strokeWidth="8" strokeLinecap="round" />
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`} style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="16" fontWeight="700" fill={color}>{Math.round(value)}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="7" fill="#9ca3af">/100</text>
    </svg>
  );
}

// ─── Mini bar ─────────────────────────────────────────────────────────────────
function MiniBar({ label, value, color, icon: Icon }: { label: string; value: number; color: string; icon: React.ElementType }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <Icon className={`h-3 w-3 ${color}`} /> {label}
        </span>
        <span className="text-xs font-bold text-gray-700">{Math.round(value)}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(100, value)}%`, background: color.includes('green') ? '#059669' : color.includes('blue') ? '#2563eb' : '#7c3aed' }} />
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function ReportGeneration() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // State
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [reportType, setReportType] = useState<ReportType>('csrd');
  const [reportFormat, setReportFormat] = useState<ReportFormat>('pdf');
  const [year, setYear] = useState(new Date().getFullYear());
  const [generating, setGenerating] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [liveData, setLiveData] = useState<LiveData | null>(null);

  const selectedTypeConfig = REPORT_TYPES.find(r => r.id === reportType)!;
  const availableFormats = selectedTypeConfig.formats;

  // Charger les organisations
  useEffect(() => {
    api.get('/organizations').then(res => {
      const data = res.data?.items || res.data?.organizations || (Array.isArray(res.data) ? res.data : []);
      setOrgs(Array.isArray(data) ? data : []);
      if (data.length > 0) setSelectedOrg(data[0].id);
    }).catch(() => {});
  }, []);

  // Ajuster le format si pas dispo pour ce type
  useEffect(() => {
    if (!availableFormats.includes(reportFormat)) {
      setReportFormat(availableFormats[0]);
    }
  }, [reportType]);

  // Charger les données live quand org change
  const loadLiveData = useCallback(async (orgId: string) => {
    if (!orgId) return;
    setLoadingData(true);
    try {
      const [latestScore, history, matRes, riskRes, entriesRes] = await Promise.allSettled([
        getOrgLatestScore(orgId),
        getOrgScores(orgId, 2),
        api.get('/materiality/issues'),
        api.get('/esg-risks'),
        api.get('/data-entries'),
      ]);

      const score = latestScore.status === 'fulfilled' ? latestScore.value : null;
      const hist  = history.status === 'fulfilled' ? history.value : [];
      const mat   = matRes.status === 'fulfilled' ? (matRes.value.data?.issues || matRes.value.data || []) : [];
      const risks = riskRes.status === 'fulfilled' ? (riskRes.value.data?.risks || riskRes.value.data || []) : [];
      const entries = entriesRes.status === 'fulfilled' ? (entriesRes.value.data?.entries || entriesRes.value.data || []) : [];

      // Calcul de tendance
      let trend = 0;
      if (Array.isArray(hist) && hist.length >= 2) {
        const sorted = [...hist].sort((a,b) => new Date(b.date||0).getTime() - new Date(a.date||0).getTime());
        trend = (sorted[0]?.overall_score || 0) - (sorted[1]?.overall_score || 0);
      }

      setLiveData({
        score: score?.overall_score || 0,
        rating: score?.rating || '—',
        environmental: score?.environmental_score || 0,
        social: score?.social_score || 0,
        governance: score?.governance_score || 0,
        data_completeness: score?.data_completeness || 0,
        trend: Math.round(trend * 10) / 10,
        materiality_count: Array.isArray(mat) ? mat.length : 0,
        material_count: Array.isArray(mat) ? mat.filter((m:any) => m.is_material).length : 0,
        risks_count: Array.isArray(risks) ? risks.length : 0,
        critical_risks: Array.isArray(risks) ? risks.filter((r:any) => r.severity === 'critical').length : 0,
        entries_count: Array.isArray(entries) ? entries.length : 0,
      });
    } catch {
      setLiveData(null);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (selectedOrg) loadLiveData(selectedOrg);
  }, [selectedOrg]);

  // Génération via backend
  const handleGenerate = async () => {
    if (!selectedOrg) { toast.error('Sélectionnez une organisation.'); return; }
    setGenerating(true);
    const toastId = toast.loading('Génération du rapport en cours…');
    try {
      const org = orgs.find(o => o.id === selectedOrg);
      const res = await api.post('/reports/generate', {
        report_type: reportType,
        organization_id: selectedOrg,
        year,
        format: reportFormat,
        period: 'yearly',
      }, { responseType: 'blob' });

      // Téléchargement du fichier
      const ext = FORMAT_CONFIG[reportFormat].ext;
      const orgSlug = (org?.name || 'rapport').toLowerCase().replace(/[^a-z0-9]/g, '_');
      const filename = `esgflow_${reportType}_${orgSlug}_${year}${ext}`;
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);

      toast.success(`Rapport ${FORMAT_CONFIG[reportFormat].label} généré avec succès !`, { id: toastId });
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Erreur lors de la génération.';
      toast.error(msg, { id: toastId });
    } finally {
      setGenerating(false);
    }
  };

  const selectedOrg_ = orgs.find(o => o.id === selectedOrg);
  const TrendIcon = liveData ? (liveData.trend > 0 ? ArrowUpRight : liveData.trend < 0 ? ArrowDownRight : Minus) : Minus;
  const trendColor = liveData ? (liveData.trend > 0 ? 'text-green-600' : liveData.trend < 0 ? 'text-red-500' : 'text-gray-400') : 'text-gray-400';

  return (
    <div className="space-y-6 animate-fade-in">
      <BackButton to="/app/reports" label="Rapports" />

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl p-6 text-white" style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-3 py-1 text-xs font-medium mb-3">
              <Sparkles className="h-3.5 w-3.5" /> Rapports professionnels connectés aux données réelles
            </div>
            <h1 className="text-2xl font-bold mb-1">Générateur de rapports ESG</h1>
            <p className="text-green-200 text-sm">PDF haute qualité · ReportLab · Données temps réel · Piste d'audit SHA-256</p>
          </div>
          <div className="hidden lg:flex items-center gap-3">
            <button onClick={() => navigate('/app/reports/list')} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm px-4 py-2 rounded-xl transition-colors border border-white/20">
              <Eye className="h-4 w-4" /> Historique
            </button>
          </div>
        </div>
      </div>

      {/* ── Layout 2 colonnes ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

        {/* ── Colonne gauche : Configurateur ─────────────────────────────── */}
        <div className="xl:col-span-3 space-y-5">

          {/* Organisation + Année */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-green-600" /> Organisation & Période
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Organisation</label>
                <select
                  value={selectedOrg}
                  onChange={e => setSelectedOrg(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                >
                  <option value="">— Sélectionner —</option>
                  {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Exercice</label>
                <select
                  value={year}
                  onChange={e => setYear(+e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                >
                  {[2026, 2025, 2024, 2023].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Type de rapport */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-green-600" /> Type de rapport
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {REPORT_TYPES.map(type => {
                const Icon = type.icon;
                const selected = reportType === type.id;
                return (
                  <button
                    key={type.id}
                    onClick={() => setReportType(type.id)}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      selected ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${type.gradient} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="h-4.5 w-4.5 text-white" style={{ width: 18, height: 18 }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-gray-900">{type.name}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            type.badge === 'Obligatoire' ? 'bg-red-100 text-red-700' :
                            type.badge === 'Populaire' ? 'bg-purple-100 text-purple-700' :
                            type.badge === 'Réglementaire' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{type.badge}</span>
                        </div>
                        <p className="text-xs text-gray-500 leading-snug line-clamp-2">{type.desc}</p>
                        <p className="text-[10px] text-gray-400 mt-1 font-medium">{type.pages}</p>
                      </div>
                      {selected && <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Format */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Download className="h-4 w-4 text-green-600" /> Format d'export
            </h2>
            <div className="flex flex-wrap gap-3">
              {availableFormats.map(fmt => {
                const cfg = FORMAT_CONFIG[fmt];
                const Icon = cfg.icon;
                return (
                  <button
                    key={fmt}
                    onClick={() => setReportFormat(fmt)}
                    className={`flex items-center gap-2.5 px-5 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                      reportFormat === fmt
                        ? cfg.color + ' border-current shadow-sm'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
                    {cfg.label}
                    <span className="font-mono text-xs opacity-60">{cfg.ext}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 mt-3">
              {reportFormat === 'pdf' && '📄 PDF haute qualité — ReportLab, design professionnel, piste d\'audit SHA-256 intégrée.'}
              {reportFormat === 'excel' && '📊 Excel multi-onglets — Données brutes ESRS, historique scores, matérialité, risques.'}
              {reportFormat === 'word' && '📝 Word structuré — Document éditable pour personnalisation avant soumission.'}
            </p>
          </div>

          {/* Bouton générer */}
          <button
            onClick={handleGenerate}
            disabled={generating || !selectedOrg}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-white font-bold text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            style={{ background: generating || !selectedOrg ? '#9ca3af' : 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}
          >
            {generating ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Génération en cours…</>
            ) : (
              <><Download className="h-5 w-5" /> Générer {selectedTypeConfig.name} · {FORMAT_CONFIG[reportFormat].label} <ChevronRight className="h-4 w-4" /></>
            )}
          </button>
        </div>

        {/* ── Colonne droite : Aperçu données live ─────────────────────────── */}
        <div className="xl:col-span-2 space-y-4">

          {/* Header aperçu */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-green-600" /> Données réelles
              </h2>
              {selectedOrg && (
                <button onClick={() => loadLiveData(selectedOrg)} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                  <RefreshCw className="h-3 w-3" /> Actualiser
                </button>
              )}
            </div>

            {!selectedOrg && (
              <div className="text-center py-8 text-gray-400">
                <Building2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sélectionnez une organisation</p>
              </div>
            )}

            {selectedOrg && loadingData && (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 text-green-500 animate-spin mx-auto mb-2" />
                <p className="text-xs text-gray-400">Chargement des données…</p>
              </div>
            )}

            {selectedOrg && !loadingData && liveData && (
              <div className="space-y-4">
                {/* Org name */}
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{selectedOrg_?.name}</p>
                    <p className="text-xs text-gray-400">{selectedOrg_?.industry || 'Exercice ' + year}</p>
                  </div>
                </div>

                {/* Score global */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4">
                  <div className="flex items-center gap-4">
                    <ScoreGauge value={liveData.score} size={100} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-gray-900">{liveData.rating}</span>
                        <span className={`flex items-center gap-0.5 text-sm font-bold ${trendColor}`}>
                          <TrendIcon className="h-4 w-4" />
                          {liveData.trend > 0 ? '+' : ''}{liveData.trend !== 0 ? liveData.trend : '—'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">Score ESG global</p>
                      <div className="flex items-center gap-1.5 mt-2">
                        <div className="h-1.5 w-16 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, liveData.data_completeness)}%` }} />
                        </div>
                        <span className="text-[10px] text-gray-400">{Math.round(liveData.data_completeness)}% données</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* E/S/G bars */}
                <div className="space-y-2.5">
                  <MiniBar label="Environnement (E)" value={liveData.environmental} color="text-green-600" icon={Leaf} />
                  <MiniBar label="Social (S)" value={liveData.social} color="text-blue-600" icon={Users} />
                  <MiniBar label="Gouvernance (G)" value={liveData.governance} color="text-purple-600" icon={Landmark} />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Enjeux matériels', value: liveData.material_count, sub: `sur ${liveData.materiality_count}`, icon: Target, color: 'text-green-600 bg-green-50' },
                    { label: 'Risques critiques', value: liveData.critical_risks, sub: `sur ${liveData.risks_count}`, icon: AlertTriangle, color: liveData.critical_risks > 0 ? 'text-red-600 bg-red-50' : 'text-gray-600 bg-gray-50' },
                  ].map(s => (
                    <div key={s.label} className={`rounded-xl p-3 ${s.color.split(' ')[1]}`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <s.icon className={`h-3.5 w-3.5 ${s.color.split(' ')[0]}`} />
                        <span className="text-[10px] text-gray-500 font-medium">{s.label}</span>
                      </div>
                      <p className={`text-xl font-black ${s.color.split(' ')[0]}`}>{s.value}</p>
                      <p className="text-[10px] text-gray-400">{s.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Contenu du rapport */}
                <div className="border border-gray-100 rounded-xl p-3 bg-gray-50">
                  <p className="text-[11px] font-bold text-gray-600 mb-2">Ce rapport contiendra :</p>
                  <div className="space-y-1">
                    {[
                      `Score ESG ${liveData.rating} (${Math.round(liveData.score)}/100)`,
                      `${liveData.entries_count} points de données ESRS`,
                      `${liveData.material_count} enjeux de double matérialité`,
                      `${liveData.risks_count} risques ESG évalués`,
                      'Piste d\'audit SHA-256 certifiable',
                      reportType === 'csrd' ? 'Balisage iXBRL EFRAG 2024-12-31' : 'Historique scores & tendances',
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px] text-gray-600">
                        <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {selectedOrg && !loadingData && !liveData && (
              <div className="text-center py-6 text-gray-400">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Aucune donnée disponible</p>
                <p className="text-xs mt-1">Collectez des données avant de générer un rapport.</p>
              </div>
            )}
          </div>

          {/* Qualité du rapport */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-xs font-bold text-gray-700 mb-3 flex items-center gap-2">
              <Star className="h-3.5 w-3.5 text-amber-500" /> Standard professionnel
            </h3>
            <div className="space-y-2">
              {[
                { label: 'Moteur PDF', value: 'ReportLab 4.x', icon: '🔧' },
                { label: 'Données', value: 'Temps réel (DB)', icon: '📡' },
                { label: 'Audit trail', value: 'SHA-256 intégré', icon: '🔒' },
                { label: 'Histori.', value: 'Sauvegardé auto', icon: '📁' },
                { label: 'iXBRL', value: 'EFRAG 2024-12-31', icon: '✳️' },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">{r.icon} {r.label}</span>
                  <span className="font-semibold text-gray-700">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
