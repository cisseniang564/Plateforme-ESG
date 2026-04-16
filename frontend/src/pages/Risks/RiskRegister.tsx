import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle, Plus, RefreshCw, Shield, TrendingUp, Clock,
  CheckCircle, XCircle, Edit, Trash2, Calendar, User, Target,
  Activity, X, Search, ChevronDown, ChevronUp, BarChart2,
  Grid, List, Zap, ArrowUpRight,
} from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ESGRisk {
  id: string;
  title: string;
  description?: string;
  category: string;
  probability: number;
  impact: number;
  risk_score: number;
  severity: string;
  status: string;
  mitigation_plan?: string;
  mitigation_status?: string;
  responsible_person?: string;
  target_date?: string;
  created_at: string;
  updated_at: string;
}

type TabKey = 'matrix' | 'list' | 'analysis';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEVERITY_CONFIG = {
  critical: { label: 'Critique',  bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-400',    bar: 'bg-red-500',    dot: 'bg-red-500' },
  high:     { label: 'Élevé',     bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-400', bar: 'bg-orange-500', dot: 'bg-orange-500' },
  medium:   { label: 'Moyen',     bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-400', bar: 'bg-yellow-400', dot: 'bg-yellow-400' },
  low:      { label: 'Faible',    bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-400',  bar: 'bg-green-500',  dot: 'bg-green-500'  },
} as const;

const STATUS_CONFIG = {
  active:   { label: 'Actif',    bg: 'bg-red-50',   text: 'text-red-600',   dot: 'bg-red-500'   },
  mitigated:{ label: 'Mitigé',   bg: 'bg-blue-50',  text: 'text-blue-600',  dot: 'bg-blue-500'  },
  closed:   { label: 'Fermé',    bg: 'bg-green-50', text: 'text-green-600', dot: 'bg-green-500' },
} as const;

const CATEGORY_CONFIG = {
  environmental: { icon: '🌿', label: 'Environnemental', color: 'text-green-600', bg: 'bg-green-50' },
  social:        { icon: '👥', label: 'Social',           color: 'text-blue-600',  bg: 'bg-blue-50'  },
  governance:    { icon: '⚖️', label: 'Gouvernance',     color: 'text-purple-600',bg: 'bg-purple-50'},
} as const;

const getHeatCell = (score: number) => {
  if (score >= 20) return { bg: 'bg-red-600',    text: 'text-white', label: 'Critique' };
  if (score >= 12) return { bg: 'bg-orange-500', text: 'text-white', label: 'Élevé' };
  if (score >= 6)  return { bg: 'bg-yellow-400', text: 'text-gray-900', label: 'Moyen' };
  return              { bg: 'bg-green-400',   text: 'text-white', label: 'Faible' };
};

const scoreColor = (score: number) => {
  if (score >= 20) return 'text-red-600';
  if (score >= 12) return 'text-orange-500';
  if (score >= 6)  return 'text-yellow-600';
  return 'text-green-600';
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon, iconBg, valueColor = 'text-gray-900' }: {
  label: string; value: number | string; sub?: string;
  icon: React.ElementType; iconBg: string; valueColor?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${iconBg}`}>
          <Icon className="h-5 w-5" />
        </div>
        <ArrowUpRight className="h-4 w-4 text-gray-300" />
      </div>
      <p className={`text-3xl font-bold mb-0.5 ${valueColor}`}>{value}</p>
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function HeatmapTab({ risks }: { risks: ESGRisk[] }) {
  const [hovered, setHovered] = useState<{ prob: number; imp: number } | null>(null);

  const getCell = (prob: number, imp: number) => {
    const score = prob * imp;
    const inCell = risks.filter(r => r.probability === prob && r.impact === imp);
    return { score, risks: inCell, count: inCell.length };
  };

  const hoverData = hovered ? getCell(hovered.prob, hovered.imp) : null;

  return (
    <div className="space-y-6">
      <div className="flex gap-8 items-start">
        {/* Matrix */}
        <div className="flex-1">
          <div className="flex gap-3 items-center mb-4">
            <div className="flex flex-col-reverse gap-1.5 items-end mr-1">
              {[1,2,3,4,5].map(p => (
                <div key={p} className="h-14 flex items-center justify-end">
                  <span className="text-xs font-semibold text-gray-500 w-3">{p}</span>
                </div>
              ))}
              <div className="h-5" />
            </div>

            <div className="space-y-1.5">
              {/* Rows: prob 5 down to 1 */}
              {[5,4,3,2,1].map(prob => (
                <div key={prob} className="flex gap-1.5">
                  {[1,2,3,4,5].map(imp => {
                    const cell = getCell(prob, imp);
                    const style = getHeatCell(cell.score);
                    const isHovered = hovered?.prob === prob && hovered?.imp === imp;
                    return (
                      <div
                        key={imp}
                        onMouseEnter={() => setHovered({ prob, imp })}
                        onMouseLeave={() => setHovered(null)}
                        className={`
                          relative h-14 w-14 rounded-xl flex flex-col items-center justify-center
                          cursor-pointer transition-all duration-150 select-none
                          ${style.bg} ${style.text}
                          ${isHovered ? 'ring-4 ring-white ring-offset-2 scale-110 shadow-xl z-10' : 'hover:scale-105'}
                          ${cell.count > 0 ? 'shadow-md' : 'opacity-70'}
                        `}
                      >
                        {cell.count > 0 ? (
                          <>
                            <span className="text-xl font-bold leading-none">{cell.count}</span>
                            <span className="text-[10px] opacity-75 font-medium">risque{cell.count > 1 ? 's' : ''}</span>
                          </>
                        ) : (
                          <span className="text-xs opacity-50 font-medium">{cell.score}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* X-axis */}
              <div className="flex gap-1.5 mt-1">
                {[1,2,3,4,5].map(imp => (
                  <div key={imp} className="h-5 w-14 flex items-center justify-center">
                    <span className="text-xs font-semibold text-gray-500">{imp}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Axis labels */}
          <div className="flex items-center gap-8 mt-2 ml-8">
            <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
              <span className="inline-block transform -rotate-90 mr-6 whitespace-nowrap text-[10px]">↑ Probabilité</span>
            </div>
            <div className="flex-1 text-center text-xs text-gray-500 font-medium">Impact →</div>
          </div>
        </div>

        {/* Tooltip / Detail panel */}
        <div className="w-64 flex-shrink-0">
          {hoverData ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-3 h-3 rounded-full ${getHeatCell(hoverData.score).bg}`} />
                <span className="text-sm font-bold text-gray-900">{getHeatCell(hoverData.score).label}</span>
                <span className="ml-auto text-xs font-bold text-gray-500">Score {hoverData.score}</span>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                P={hovered?.prob} × I={hovered?.imp}
              </p>
              {hoverData.risks.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Aucun risque dans cette zone</p>
              ) : (
                <div className="space-y-2">
                  {hoverData.risks.map(r => (
                    <div key={r.id} className="p-2 bg-gray-50 rounded-lg">
                      <p className="text-xs font-semibold text-gray-800 line-clamp-2">{r.title}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5 capitalize">{r.category}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-4 flex flex-col items-center justify-center h-40 text-center">
              <Grid className="h-6 w-6 text-gray-300 mb-2" />
              <p className="text-xs text-gray-400">Survolez une cellule pour voir les risques</p>
            </div>
          )}

          {/* Legend */}
          <div className="mt-4 space-y-2">
            {[
              { bg: 'bg-green-400',   label: 'Faible',   range: '1–5'  },
              { bg: 'bg-yellow-400',  label: 'Moyen',    range: '6–11' },
              { bg: 'bg-orange-500',  label: 'Élevé',    range: '12–19'},
              { bg: 'bg-red-600',     label: 'Critique', range: '20–25'},
            ].map(l => (
              <div key={l.label} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${l.bg} flex-shrink-0`} />
                <span className="text-xs text-gray-600 flex-1">{l.label}</span>
                <span className="text-xs text-gray-400 font-mono">{l.range}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RiskCard({ risk, onEdit, onDelete }: {
  risk: ESGRisk;
  onEdit: (r: ESGRisk) => void;
  onDelete: (id: string, title: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const sev = SEVERITY_CONFIG[risk.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.low;
  const sta = STATUS_CONFIG[risk.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.active;
  const cat = CATEGORY_CONFIG[risk.category as keyof typeof CATEGORY_CONFIG] ?? CATEGORY_CONFIG.environmental;

  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden`}>
      {/* Left severity bar */}
      <div className={`flex`}>
        <div className={`w-1.5 flex-shrink-0 ${sev.bar}`} />

        <div className="flex-1 p-5">
          {/* Top row */}
          <div className="flex items-start gap-4">
            {/* Score bubble */}
            <div className={`flex-shrink-0 w-14 h-14 rounded-2xl flex flex-col items-center justify-center ${sev.bg}`}>
              <span className={`text-2xl font-bold leading-none ${sev.text}`}>{risk.risk_score}</span>
              <span className={`text-[9px] font-semibold uppercase tracking-wider ${sev.text} opacity-70`}>score</span>
            </div>

            {/* Title + badges */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="text-base font-bold text-gray-900 truncate">{risk.title}</h3>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${sev.bg} ${sev.text} ${sev.border}`}>
                  {sev.label}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${sta.bg} ${sta.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${sta.dot}`} />
                  {sta.label}
                </span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${cat.bg} ${cat.color}`}>
                  {cat.icon} {cat.label}
                </span>
              </div>
            </div>

            {/* Prob × Impact */}
            <div className="flex-shrink-0 hidden sm:flex items-center gap-3 text-xs text-gray-500">
              <div className="text-center">
                <p className="font-bold text-gray-900 text-sm">{risk.probability}/5</p>
                <p>Probabilité</p>
              </div>
              <span className="text-gray-300">×</span>
              <div className="text-center">
                <p className="font-bold text-gray-900 text-sm">{risk.impact}/5</p>
                <p>Impact</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => setExpanded(e => !e)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title={expanded ? 'Réduire' : 'Voir détails'}
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              <button
                onClick={() => onEdit(risk)}
                className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                title="Modifier"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={() => onDelete(risk.id, risk.title)}
                className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                title="Supprimer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Description */}
          {risk.description && !expanded && (
            <p className="text-sm text-gray-500 mt-3 line-clamp-1">{risk.description}</p>
          )}

          {/* Expandable detail */}
          {expanded && (
            <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
              {risk.description && (
                <p className="text-sm text-gray-600">{risk.description}</p>
              )}

              {/* Prob / Impact bars */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-500">Probabilité</span>
                    <span className="text-xs font-bold text-gray-900">{risk.probability}/5</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${sev.bar} rounded-full transition-all`} style={{ width: `${(risk.probability / 5) * 100}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-500">Impact</span>
                    <span className="text-xs font-bold text-gray-900">{risk.impact}/5</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${sev.bar} rounded-full transition-all`} style={{ width: `${(risk.impact / 5) * 100}%` }} />
                  </div>
                </div>
              </div>

              {risk.mitigation_plan && (
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <p className="text-xs font-semibold text-blue-800 mb-1 flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5" /> Plan de mitigation
                  </p>
                  <p className="text-sm text-blue-700">{risk.mitigation_plan}</p>
                </div>
              )}

              <div className="flex items-center gap-5 text-xs text-gray-500 flex-wrap">
                {risk.responsible_person && (
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    <span>{risk.responsible_person}</span>
                  </div>
                )}
                {risk.target_date && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Échéance : {format(new Date(risk.target_date), 'dd MMM yyyy', { locale: fr })}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Mis à jour le {format(new Date(risk.updated_at), 'dd MMM yyyy', { locale: fr })}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AnalysisTab({ risks }: { risks: ESGRisk[] }) {
  const total = risks.length || 1;

  const byCategory = ['environmental', 'social', 'governance'].map(cat => ({
    cat,
    cfg: CATEGORY_CONFIG[cat as keyof typeof CATEGORY_CONFIG],
    count: risks.filter(r => r.category === cat).length,
    avgScore: risks.filter(r => r.category === cat).reduce((s, r) => s + r.risk_score, 0) /
              (risks.filter(r => r.category === cat).length || 1),
  }));

  const bySeverity = ['critical', 'high', 'medium', 'low'].map(sev => ({
    sev,
    cfg: SEVERITY_CONFIG[sev as keyof typeof SEVERITY_CONFIG],
    count: risks.filter(r => r.severity === sev).length,
  }));

  const byStatus = ['active', 'mitigated', 'closed'].map(s => ({
    s,
    cfg: STATUS_CONFIG[s as keyof typeof STATUS_CONFIG],
    count: risks.filter(r => r.status === s).length,
  }));

  const coverageRate = risks.length
    ? Math.round((risks.filter(r => r.mitigation_plan && r.mitigation_plan.length > 0).length / risks.length) * 100)
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* By Category */}
      <Card>
        <h3 className="text-base font-bold text-gray-900 mb-4">Répartition par catégorie</h3>
        <div className="space-y-4">
          {byCategory.map(({ cat, cfg, count, avgScore }) => (
            <div key={cat}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span>{cfg.icon}</span>
                  <span className="text-sm font-medium text-gray-700">{cfg.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">score moy. {Math.round(avgScore)}</span>
                  <span className="text-sm font-bold text-gray-900">{count}</span>
                </div>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    cat === 'environmental' ? 'bg-green-500' : cat === 'social' ? 'bg-blue-500' : 'bg-purple-500'
                  }`}
                  style={{ width: `${(count / total) * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{Math.round((count / total) * 100)}% du total</p>
            </div>
          ))}
        </div>
      </Card>

      {/* By Severity */}
      <Card>
        <h3 className="text-base font-bold text-gray-900 mb-4">Répartition par sévérité</h3>
        <div className="space-y-4">
          {bySeverity.map(({ sev, cfg, count }) => (
            <div key={sev}>
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-sm font-medium ${cfg.text}`}>{cfg.label}</span>
                <span className="text-sm font-bold text-gray-900">{count}</span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${cfg.bar}`}
                  style={{ width: `${(count / total) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* By Status */}
      <Card>
        <h3 className="text-base font-bold text-gray-900 mb-4">Statut des risques</h3>
        <div className="grid grid-cols-3 gap-3">
          {byStatus.map(({ s, cfg, count }) => (
            <div key={s} className={`rounded-2xl p-4 text-center ${cfg.bg}`}>
              <p className={`text-3xl font-bold mb-1 ${cfg.text}`}>{count}</p>
              <p className={`text-xs font-semibold ${cfg.text}`}>{cfg.label}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Coverage */}
      <Card>
        <h3 className="text-base font-bold text-gray-900 mb-4">Couverture des mitigations</h3>
        <div className="flex items-center gap-6">
          {/* Ring */}
          <div className="relative flex-shrink-0 w-24 h-24">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3f4f6" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15.9" fill="none"
                stroke={coverageRate >= 75 ? '#22c55e' : coverageRate >= 50 ? '#f59e0b' : '#ef4444'}
                strokeWidth="3"
                strokeDasharray={`${coverageRate} ${100 - coverageRate}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold text-gray-900">{coverageRate}%</span>
            </div>
          </div>
          <div className="space-y-2 flex-1">
            <div>
              <p className="text-sm text-gray-500">Risques avec plan de mitigation</p>
              <p className="text-2xl font-bold text-gray-900">
                {risks.filter(r => r.mitigation_plan && r.mitigation_plan.length > 0).length}
                <span className="text-base font-normal text-gray-400"> / {risks.length}</span>
              </p>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${coverageRate >= 75 ? 'bg-green-500' : coverageRate >= 50 ? 'bg-amber-400' : 'bg-red-500'}`}
                style={{ width: `${coverageRate}%` }}
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Score preview helper ─────────────────────────────────────────────────────

function ScorePreview({ prob, impact }: { prob: number; impact: number }) {
  const score = prob * impact;
  const sev = score >= 20 ? 'critical' : score >= 12 ? 'high' : score >= 6 ? 'medium' : 'low';
  const cfg = SEVERITY_CONFIG[sev];
  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl ${cfg.bg} border ${cfg.border}`}>
      <div className={`text-3xl font-bold ${cfg.text}`}>{score}</div>
      <div>
        <p className={`text-sm font-bold ${cfg.text}`}>{cfg.label}</p>
        <p className={`text-xs ${cfg.text} opacity-70`}>{prob} × {impact} = {score}/25</p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RiskRegister() {
  const { t } = useTranslation();
  const [risks, setRisks] = useState<ESGRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<ESGRisk | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('matrix');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'environmental',
    probability: 3,
    impact: 3,
    mitigation_plan: '',
    responsible_person: '',
    target_date: ''
  });

  useEffect(() => { loadRisks(); }, []);

  const loadRisks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/materiality/risks');
      setRisks(res.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || t('risks.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (selectedRisk) {
        await api.put(`/materiality/risks/${selectedRisk.id}`, formData);
        toast.success(t('risks.updateSuccess'));
      } else {
        await api.post('/materiality/risks', formData);
        toast.success(t('risks.createSuccess'));
      }
      setShowModal(false);
      setSelectedRisk(null);
      resetForm();
      await loadRisks();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || t('risks.saveError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (risk: ESGRisk) => {
    setSelectedRisk(risk);
    setFormData({
      title: risk.title,
      description: risk.description || '',
      category: risk.category,
      probability: risk.probability,
      impact: risk.impact,
      mitigation_plan: risk.mitigation_plan || '',
      responsible_person: risk.responsible_person || '',
      target_date: risk.target_date ? risk.target_date.split('T')[0] : ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(t('risks.deleteConfirm', { title }))) return;
    try {
      await api.delete(`/materiality/risks/${id}`);
      toast.success(t('risks.deleteSuccess'));
      await loadRisks();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || t('risks.deleteError'));
    }
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', category: 'environmental', probability: 3, impact: 3, mitigation_plan: '', responsible_person: '', target_date: '' });
  };

  const handleCloseModal = () => { setShowModal(false); setSelectedRisk(null); resetForm(); };

  const filteredRisks = risks.filter(r => {
    if (filterCategory !== 'all' && r.category !== filterCategory) return false;
    if (filterSeverity !== 'all' && r.severity !== filterSeverity) return false;
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !(r.description || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: risks.length,
    critical: risks.filter(r => r.severity === 'critical').length,
    active: risks.filter(r => r.status === 'active').length,
    mitigated: risks.filter(r => r.status === 'mitigated' || r.status === 'closed').length,
    avg_score: risks.length > 0 ? Math.round(risks.reduce((s, r) => s + r.risk_score, 0) / risks.length) : 0,
  };

  const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: 'matrix',   label: 'Matrice des risques', icon: Grid },
    { key: 'list',     label: 'Registre',             icon: List },
    { key: 'analysis', label: 'Analyse',               icon: BarChart2 },
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-96"><Spinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-rose-600 via-red-600 to-orange-600 rounded-2xl p-8 text-white shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZyIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNnKSIvPjwvc3ZnPg==')] opacity-30" />
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold tracking-wide uppercase">
                Gestion des Risques ESG
              </span>
            </div>
            <h1 className="text-3xl font-bold mb-1 flex items-center gap-3">
              <Shield className="h-8 w-8" />
              {t('risks.title')}
            </h1>
            <p className="text-red-100">{t('risks.subtitle')}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadRisks}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/20 rounded-xl text-sm font-medium transition-all"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-red-600 rounded-xl text-sm font-bold hover:bg-red-50 transition-all shadow-md"
            >
              <Plus className="h-4 w-4" />
              Nouveau risque
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard label="Total risques"   value={stats.total}     icon={AlertTriangle} iconBg="bg-slate-100 text-slate-600" />
        <KpiCard label="Critiques"       value={stats.critical}  icon={XCircle}       iconBg="bg-red-100 text-red-600"     valueColor={stats.critical > 0 ? 'text-red-600' : 'text-gray-900'} />
        <KpiCard label="Actifs"          value={stats.active}    icon={Activity}      iconBg="bg-orange-100 text-orange-600" valueColor="text-orange-600" />
        <KpiCard label="Mitigés / Fermés" value={stats.mitigated} icon={CheckCircle}  iconBg="bg-green-100 text-green-600"  valueColor="text-green-600" />
        <KpiCard label="Score moyen"     value={stats.avg_score} icon={TrendingUp}    iconBg="bg-purple-100 text-purple-600" valueColor={scoreColor(stats.avg_score)} />
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-gray-100">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold border-b-2 transition-all ${
                  active
                    ? 'border-red-500 text-red-600 bg-red-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.key === 'list' && (
                  <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${active ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                    {risks.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="p-6">

          {/* MATRIX */}
          {activeTab === 'matrix' && <HeatmapTab risks={risks} />}

          {/* LIST */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Rechercher un risque..."
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-300 focus:border-red-400 outline-none"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {/* Category pills */}
                  {[
                    { value: 'all', label: 'Tout' },
                    { value: 'environmental', label: '🌿 Env.' },
                    { value: 'social', label: '👥 Social' },
                    { value: 'governance', label: '⚖️ Gov.' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setFilterCategory(opt.value)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        filterCategory === opt.value
                          ? 'bg-red-500 text-white border-red-500'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-red-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                  <div className="w-px bg-gray-200 mx-1" />
                  {/* Severity pills */}
                  {[
                    { value: 'all', label: 'Tout', color: '' },
                    { value: 'critical', label: 'Critique', color: 'bg-red-500' },
                    { value: 'high', label: 'Élevé', color: 'bg-orange-500' },
                    { value: 'medium', label: 'Moyen', color: 'bg-yellow-400' },
                    { value: 'low', label: 'Faible', color: 'bg-green-500' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setFilterSeverity(opt.value)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        filterSeverity === opt.value
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {opt.color && <span className={`w-2 h-2 rounded-full ${opt.color}`} />}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Count */}
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>{filteredRisks.length} risque{filteredRisks.length > 1 ? 's' : ''} affiché{filteredRisks.length > 1 ? 's' : ''}</span>
                {(search || filterCategory !== 'all' || filterSeverity !== 'all') && (
                  <button
                    onClick={() => { setSearch(''); setFilterCategory('all'); setFilterSeverity('all'); setFilterStatus('all'); }}
                    className="text-red-500 hover:text-red-700 text-xs font-medium flex items-center gap-1"
                  >
                    <X className="h-3.5 w-3.5" /> Réinitialiser
                  </button>
                )}
              </div>

              {/* Cards */}
              {filteredRisks.length > 0 ? (
                <div className="space-y-3">
                  {filteredRisks.map(risk => (
                    <RiskCard key={risk.id} risk={risk} onEdit={handleEdit} onDelete={handleDelete} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Shield className="h-12 w-12 mx-auto text-gray-200 mb-3" />
                  <p className="text-base font-semibold text-gray-700 mb-1">Aucun risque trouvé</p>
                  <p className="text-sm text-gray-400">
                    {search || filterCategory !== 'all' || filterSeverity !== 'all'
                      ? 'Essayez de modifier les filtres'
                      : 'Créez votre premier risque ESG'}
                  </p>
                  {!search && filterCategory === 'all' && filterSeverity === 'all' && (
                    <button
                      onClick={() => setShowModal(true)}
                      className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
                    >
                      <Plus className="h-4 w-4" /> Nouveau risque
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ANALYSIS */}
          {activeTab === 'analysis' && <AnalysisTab risks={risks} />}
        </div>
      </div>

      {/* ── Modal ─────────────────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 rounded-xl">
                  <Zap className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {selectedRisk ? t('risks.editTitle') : t('risks.newTitle')}
                  </h2>
                  <p className="text-xs text-gray-400">Remplissez les champs ci-dessous</p>
                </div>
              </div>
              <button onClick={handleCloseModal} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('risks.riskTitleField')}</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-300 focus:border-red-400 outline-none"
                  placeholder={t('risks.riskTitlePlaceholder')}
                  disabled={submitting}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('risks.descriptionField')}</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-300 focus:border-red-400 outline-none resize-none"
                  placeholder={t('risks.descriptionPlaceholder')}
                  disabled={submitting}
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('risks.categoryRequired')}</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['environmental', 'social', 'governance'] as const).map(cat => {
                    const cfg = CATEGORY_CONFIG[cat];
                    const active = formData.category === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setFormData({ ...formData, category: cat })}
                        className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-semibold transition-all ${
                          active ? `${cfg.bg} ${cfg.color} border-current` : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                        disabled={submitting}
                      >
                        <span className="text-xl">{cfg.icon}</span>
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Probability + Impact sliders */}
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Probabilité : <span className="text-red-600 font-bold">{formData.probability}/5</span>
                  </label>
                  <input
                    type="range" min="1" max="5"
                    value={formData.probability}
                    onChange={e => setFormData({ ...formData, probability: Number(e.target.value) })}
                    className="w-full accent-red-600"
                    disabled={submitting}
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                    <span>Très faible</span><span>Très élevée</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Impact : <span className="text-red-600 font-bold">{formData.impact}/5</span>
                  </label>
                  <input
                    type="range" min="1" max="5"
                    value={formData.impact}
                    onChange={e => setFormData({ ...formData, impact: Number(e.target.value) })}
                    className="w-full accent-red-600"
                    disabled={submitting}
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                    <span>Très faible</span><span>Très élevé</span>
                  </div>
                </div>
              </div>

              {/* Live score */}
              <ScorePreview prob={formData.probability} impact={formData.impact} />

              {/* Mitigation */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('risks.mitigationField')}</label>
                <textarea
                  value={formData.mitigation_plan}
                  onChange={e => setFormData({ ...formData, mitigation_plan: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-300 focus:border-red-400 outline-none resize-none"
                  placeholder={t('risks.mitigationPlaceholder')}
                  disabled={submitting}
                />
              </div>

              {/* Responsible + Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('risks.responsibleField')}</label>
                  <input
                    type="text"
                    value={formData.responsible_person}
                    onChange={e => setFormData({ ...formData, responsible_person: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-300 focus:border-red-400 outline-none"
                    placeholder={t('risks.responsiblePlaceholder')}
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('risks.targetDate')}</label>
                  <input
                    type="date"
                    value={formData.target_date}
                    onChange={e => setFormData({ ...formData, target_date: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-300 focus:border-red-400 outline-none"
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition-colors"
                >
                  {submitting ? <><Spinner size="sm" className="mr-1" />{selectedRisk ? t('risks.updating') : t('risks.creating')}</> : (selectedRisk ? t('risks.update') : t('risks.create'))}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={submitting}
                  className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
