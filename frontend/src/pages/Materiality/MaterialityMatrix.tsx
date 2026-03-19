import { useState, useEffect } from 'react';
import {
  Grid,
  Plus,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Edit,
  Trash2,
  X,
  List,
  ShieldAlert,
  Target,
  Activity,
  ChevronDown,
  ChevronUp,
  Zap,
} from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import toast from 'react-hot-toast';

interface MaterialityIssue {
  id: string;
  name: string;
  description?: string;
  category: string;
  financial_impact: number;
  esg_impact: number;
  is_material: boolean;
  priority: string;
  stakeholders?: string;
}

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
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  environmental: { label: 'Environnemental', color: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500' },
  social:        { label: 'Social',          color: 'bg-blue-100 text-blue-800',    dot: 'bg-blue-500'    },
  governance:    { label: 'Gouvernance',     color: 'bg-purple-100 text-purple-800', dot: 'bg-purple-500'  },
};

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  critical: { label: 'Critique',   color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-400'    },
  high:     { label: 'Élevé',      color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-400' },
  medium:   { label: 'Modéré',     color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-400' },
  low:      { label: 'Faible',     color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-400'  },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  high:   { label: 'Haute',   color: 'bg-red-100 text-red-700'    },
  medium: { label: 'Moyenne', color: 'bg-yellow-100 text-yellow-700' },
  low:    { label: 'Faible',  color: 'bg-gray-100 text-gray-600'  },
};

export default function MaterialityMatrix() {
  const [issues, setIssues] = useState<MaterialityIssue[]>([]);
  const [risks, setRisks] = useState<ESGRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<MaterialityIssue | null>(null);
  const [selectedRisk, setSelectedRisk] = useState<ESGRisk | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<'matrix' | 'list'>('matrix');
  const [activeTab, setActiveTab] = useState<'materiality' | 'risks'>('materiality');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'environmental',
    financial_impact: 50,
    esg_impact: 50,
    stakeholders: '',
  });

  const [riskForm, setRiskForm] = useState({
    title: '',
    description: '',
    category: 'environmental',
    probability: 3,
    impact: 3,
    mitigation_plan: '',
    responsible_person: '',
  });

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [issuesRes, risksRes] = await Promise.all([
        api.get('/materiality/issues'),
        api.get('/materiality/risks'),
      ]);
      setIssues(issuesRes.data || []);
      setRisks(risksRes.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  // ── Issue CRUD ──────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (selectedIssue) {
        await api.put(`/materiality/issues/${selectedIssue.id}`, formData);
        toast.success('Enjeu mis à jour');
      } else {
        await api.post('/materiality/issues', formData);
        toast.success('Enjeu créé');
      }
      closeIssueModal();
      await loadAll();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la sauvegarde');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (issue: MaterialityIssue) => {
    setSelectedIssue(issue);
    setFormData({
      name: issue.name,
      description: issue.description || '',
      category: issue.category,
      financial_impact: issue.financial_impact,
      esg_impact: issue.esg_impact,
      stakeholders: issue.stakeholders || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Supprimer l'enjeu "${name}" ?`)) return;
    try {
      await api.delete(`/materiality/issues/${id}`);
      toast.success('Enjeu supprimé');
      await loadAll();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la suppression');
    }
  };

  const closeIssueModal = () => {
    setShowModal(false);
    setSelectedIssue(null);
    setFormData({ name: '', description: '', category: 'environmental', financial_impact: 50, esg_impact: 50, stakeholders: '' });
  };

  // ── Risk CRUD ───────────────────────────────────────────────────────────────
  const handleRiskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (selectedRisk) {
        await api.put(`/materiality/risks/${selectedRisk.id}`, riskForm);
        toast.success('Risque mis à jour');
      } else {
        await api.post('/materiality/risks', riskForm);
        toast.success('Risque créé');
      }
      closeRiskModal();
      await loadAll();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRiskEdit = (risk: ESGRisk) => {
    setSelectedRisk(risk);
    setRiskForm({
      title: risk.title,
      description: risk.description || '',
      category: risk.category,
      probability: risk.probability,
      impact: risk.impact,
      mitigation_plan: risk.mitigation_plan || '',
      responsible_person: risk.responsible_person || '',
    });
    setShowRiskModal(true);
  };

  const handleRiskDelete = async (id: string, title: string) => {
    if (!confirm(`Supprimer le risque "${title}" ?`)) return;
    try {
      await api.delete(`/materiality/risks/${id}`);
      toast.success('Risque supprimé');
      await loadAll();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur');
    }
  };

  const closeRiskModal = () => {
    setShowRiskModal(false);
    setSelectedRisk(null);
    setRiskForm({ title: '', description: '', category: 'environmental', probability: 3, impact: 3, mitigation_plan: '', responsible_person: '' });
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const getQuadrant = (x: number, y: number) => {
    if (x > 60 && y > 60) return { label: 'Matériel', bg: 'bg-red-50', border: 'border-red-400', text: 'text-red-700' };
    if (x > 60)            return { label: 'Impact financier', bg: 'bg-orange-50', border: 'border-orange-400', text: 'text-orange-700' };
    if (y > 60)            return { label: 'Impact ESG', bg: 'bg-blue-50', border: 'border-blue-400', text: 'text-blue-700' };
    return                        { label: 'Non matériel', bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-600' };
  };

  const getCatDot  = (cat: string) => CATEGORY_CONFIG[cat]?.dot || 'bg-gray-400';
  const getCatBadge = (cat: string) => CATEGORY_CONFIG[cat]?.color || 'bg-gray-100 text-gray-600';
  const getCatLabel = (cat: string) => CATEGORY_CONFIG[cat]?.label || cat;

  const stats = {
    total:        issues.length,
    material:     issues.filter(i => i.is_material).length,
    highPriority: issues.filter(i => i.priority === 'high').length,
    env:          issues.filter(i => i.category === 'environmental').length,
    criticalRisks: risks.filter(r => r.severity === 'critical' || r.severity === 'high').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-700 via-purple-700 to-violet-800 p-8 text-white shadow-2xl">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/20 -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white/10 -ml-24 -mb-24" />
        </div>
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium ring-1 ring-white/20">
              <Activity className="h-3.5 w-3.5" />
              Double Matérialité · CSRD
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight flex items-center gap-3">
              <Grid className="h-9 w-9 opacity-90" />
              Matérialité &amp; Risques
            </h1>
            <p className="mt-2 text-indigo-200 max-w-xl">
              Identifiez vos enjeux matériels et pilotez vos risques ESG selon les exigences CSRD / ESRS.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="secondary" onClick={loadAll} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            {activeTab === 'materiality' ? (
              <Button variant="secondary" onClick={() => setShowModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un enjeu
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => setShowRiskModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un risque
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total enjeux',     value: stats.total,         icon: Grid,        color: 'text-indigo-600', bg: 'bg-indigo-50',  border: 'border-indigo-400' },
          { label: 'Matériels',        value: stats.material,       icon: Target,      color: 'text-red-600',    bg: 'bg-red-50',     border: 'border-red-400'    },
          { label: 'Haute priorité',   value: stats.highPriority,   icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50',  border: 'border-orange-400' },
          { label: 'Environnemental',  value: stats.env,            icon: CheckCircle, color: 'text-green-600',  bg: 'bg-green-50',   border: 'border-green-400'  },
          { label: 'Risques critiques',value: stats.criticalRisks,  icon: ShieldAlert, color: 'text-purple-600', bg: 'bg-purple-50',  border: 'border-purple-400' },
        ].map(({ label, value, icon: Icon, color, bg, border }) => (
          <Card key={label} className={`border-l-4 ${border} shadow-sm`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">{label}</p>
                <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
              </div>
              <div className={`p-2.5 rounded-xl ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('materiality')}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'materiality'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Grid className="h-4 w-4 inline mr-1.5 -mt-0.5" />
          Matrice de matérialité
        </button>
        <button
          onClick={() => setActiveTab('risks')}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'risks'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <ShieldAlert className="h-4 w-4 inline mr-1.5 -mt-0.5" />
          Registre des risques
          {stats.criticalRisks > 0 && (
            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold">
              {stats.criticalRisks}
            </span>
          )}
        </button>
      </div>

      {/* ══ MATERIALITY TAB ══════════════════════════════════════════════════ */}
      {activeTab === 'materiality' && (
        <>
          {/* View toggle */}
          <div className="flex justify-end">
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('matrix')}
                className={`px-4 py-1.5 rounded text-sm font-medium transition-all ${viewMode === 'matrix' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
              >
                <Grid className="h-4 w-4 inline mr-1.5" />Matrice
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-1.5 rounded text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
              >
                <List className="h-4 w-4 inline mr-1.5" />Liste
              </button>
            </div>
          </div>

          {/* ── List View ── */}
          {viewMode === 'list' && (
            <div className="space-y-3">
              {issues.length === 0 ? (
                <Card className="py-16 text-center">
                  <Grid className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                  <p className="font-semibold text-gray-700">Aucun enjeu enregistré</p>
                  <p className="text-sm text-gray-500 mt-1">Cliquez sur « Ajouter un enjeu » pour commencer.</p>
                </Card>
              ) : issues.map(issue => {
                const quadrant = getQuadrant(issue.financial_impact, issue.esg_impact);
                const priority = PRIORITY_CONFIG[issue.priority] || PRIORITY_CONFIG.low;
                return (
                  <Card key={issue.id} className="hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${getCatDot(issue.category)}`} />
                          <h3 className="text-base font-semibold text-gray-900">{issue.name}</h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${quadrant.bg} ${quadrant.border} ${quadrant.text}`}>
                            {quadrant.label}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priority.color}`}>
                            {priority.label}
                          </span>
                        </div>
                        {issue.description && (
                          <p className="text-sm text-gray-500 mb-3">{issue.description}</p>
                        )}
                        <div className="flex flex-wrap gap-3">
                          <div className="flex items-center gap-2 bg-orange-50 rounded-lg px-3 py-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                            <span className="text-xs text-gray-600">Impact financier</span>
                            <span className="text-sm font-bold text-orange-600">{issue.financial_impact}/100</span>
                          </div>
                          <div className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                            <span className="text-xs text-gray-600">Impact ESG</span>
                            <span className="text-sm font-bold text-blue-600">{issue.esg_impact}/100</span>
                          </div>
                          <span className={`text-xs px-2.5 py-1.5 rounded-lg font-medium ${getCatBadge(issue.category)}`}>
                            {getCatLabel(issue.category)}
                          </span>
                        </div>
                        {issue.stakeholders && (
                          <p className="mt-2 text-xs text-gray-400">
                            Parties prenantes : {issue.stakeholders}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button onClick={() => handleEdit(issue)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(issue.id, issue.name)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* ── Matrix View ── */}
          {viewMode === 'matrix' && (
            <Card className="overflow-hidden">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Matrice de Double Matérialité</h2>
                  <p className="text-sm text-gray-500">Survolez un point pour voir les détails · Cliquez pour modifier</p>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                  {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-1.5">
                      <div className={`w-3 h-3 rounded-full ${v.dot}`} />
                      {v.label}
                    </div>
                  ))}
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-gray-300 ring-2 ring-red-400" />
                    Matériel
                  </div>
                </div>
              </div>

              {/* Matrix area */}
              <div
                className="relative rounded-xl border-2 border-gray-200 bg-gradient-to-br from-slate-50 to-gray-100"
                style={{ height: '640px', padding: '48px 48px 48px 64px' }}
              >
                {/* Background quadrants */}
                <div className="absolute inset-0 rounded-xl overflow-hidden" style={{ margin: '40px 40px 40px 56px' }}>
                  <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-blue-50/60 border-b-2 border-l-2 border-dashed border-blue-200" />
                  <div className="absolute bottom-0 right-0 w-[40%] h-[60%] bg-red-50/60 border-t-2 border-l-2 border-dashed border-red-200" />
                </div>

                {/* Grid lines */}
                <div className="absolute inset-0 grid grid-cols-10 grid-rows-10 opacity-20 pointer-events-none" style={{ margin: '40px 40px 40px 56px' }}>
                  {[...Array(100)].map((_, i) => (
                    <div key={i} className="border border-gray-300" />
                  ))}
                </div>

                {/* Threshold lines */}
                <div className="absolute pointer-events-none" style={{ inset: '40px 40px 40px 56px' }}>
                  <div className="absolute w-px bg-orange-400/60 top-0 bottom-0" style={{ left: '60%' }} />
                  <div className="absolute h-px bg-blue-400/60 left-0 right-0" style={{ bottom: '60%' }} />
                </div>

                {/* Quadrant labels */}
                <div className="absolute top-12 left-16 px-2 py-1 bg-white/80 backdrop-blur-sm rounded text-[11px] font-medium text-gray-500 shadow-sm">
                  Impact ESG ↑
                </div>
                <div className="absolute top-12 right-12 px-2 py-1 bg-blue-100/90 rounded text-[11px] font-bold text-blue-700 shadow-sm">
                  Impact ESG Élevé
                </div>
                <div className="absolute bottom-12 left-16 px-2 py-1 bg-white/80 rounded text-[11px] font-medium text-gray-500 shadow-sm">
                  Impact Financier →
                </div>
                <div className="absolute bottom-12 right-12 px-2 py-1 bg-red-100/90 rounded text-[11px] font-bold text-red-700 shadow-sm">
                  MATÉRIEL (Double)
                </div>

                {/* Data points */}
                <div className="relative h-full">
                  {issues.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <Grid className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                        <p className="text-gray-400 text-sm">Ajoutez des enjeux pour les voir apparaître ici</p>
                      </div>
                    </div>
                  ) : issues.map((issue, idx) => (
                    <div
                      key={issue.id}
                      className="absolute group cursor-pointer"
                      style={{
                        left: `${issue.financial_impact}%`,
                        bottom: `${issue.esg_impact}%`,
                        transform: 'translate(-50%, 50%)',
                        zIndex: 20,
                      }}
                      onClick={() => handleEdit(issue)}
                    >
                      {/* Dot */}
                      <div className={`
                        w-5 h-5 rounded-full shadow-md transition-all duration-200
                        ${getCatDot(issue.category)}
                        ${issue.is_material ? 'ring-4 ring-red-400/60' : 'ring-2 ring-white'}
                        group-hover:scale-[2.5] group-hover:shadow-xl
                      `} />

                      {/* Tooltip */}
                      <div className="
                        absolute left-1/2 -translate-x-1/2 bottom-full mb-3
                        w-64 p-3.5 bg-white rounded-xl shadow-xl border border-gray-100
                        opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity
                        z-50 text-left
                      ">
                        <p className="font-bold text-gray-900 text-sm mb-1">{issue.name}</p>
                        {issue.description && (
                          <p className="text-xs text-gray-500 mb-2 line-clamp-2">{issue.description}</p>
                        )}
                        <div className="grid grid-cols-2 gap-1.5 mb-2">
                          <div className="bg-orange-50 rounded p-1.5 text-center">
                            <p className="text-[10px] text-gray-500">Fin.</p>
                            <p className="text-sm font-bold text-orange-600">{issue.financial_impact}</p>
                          </div>
                          <div className="bg-blue-50 rounded p-1.5 text-center">
                            <p className="text-[10px] text-gray-500">ESG</p>
                            <p className="text-sm font-bold text-blue-600">{issue.esg_impact}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${getCatBadge(issue.category)}`}>
                            {getCatLabel(issue.category)}
                          </span>
                          <span className="text-[10px] text-gray-400">#{idx + 1} · cliquer pour modifier</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Axis labels */}
                <div className="absolute left-2 top-1/2 -translate-y-1/2 -rotate-90">
                  <p className="text-xs font-semibold text-gray-500 whitespace-nowrap tracking-wide">
                    Impact Environnement &amp; Société →
                  </p>
                </div>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
                  <p className="text-xs font-semibold text-gray-500 tracking-wide">
                    Impact Performance Financière →
                  </p>
                </div>
              </div>

              <p className="mt-3 text-xs text-gray-400 text-center">
                💡 Survolez les points pour les détails · Cliquez pour modifier · Les enjeux matériels sont encadrés en rouge
              </p>
            </Card>
          )}
        </>
      )}

      {/* ══ RISKS TAB ════════════════════════════════════════════════════════ */}
      {activeTab === 'risks' && (
        <div className="space-y-4">
          {risks.length === 0 ? (
            <Card className="py-16 text-center">
              <ShieldAlert className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p className="font-semibold text-gray-700">Aucun risque enregistré</p>
              <p className="text-sm text-gray-500 mt-1 mb-4">
                Identifiez et documentez vos risques ESG pour mieux les piloter.
              </p>
              <Button onClick={() => setShowRiskModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter le premier risque
              </Button>
            </Card>
          ) : (
            <>
              {/* Risk heat-map summary */}
              <Card className="border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  Vue d'ensemble des risques
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(SEVERITY_CONFIG).map(([key, cfg]) => {
                    const count = risks.filter(r => r.severity === key).length;
                    return (
                      <div key={key} className={`rounded-lg p-3 border ${cfg.bg} ${cfg.border} border`}>
                        <p className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</p>
                        <p className={`text-2xl font-bold ${cfg.color}`}>{count}</p>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Risk list */}
              {risks
                .sort((a, b) => b.risk_score - a.risk_score)
                .map(risk => {
                  const sev = SEVERITY_CONFIG[risk.severity] || SEVERITY_CONFIG.low;
                  return (
                    <Card key={risk.id} className={`border-l-4 ${sev.border} hover:shadow-md transition-shadow`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${sev.bg} ${sev.color} border ${sev.border}`}>
                              {sev.label}
                            </span>
                            <h3 className="text-base font-semibold text-gray-900">{risk.title}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getCatBadge(risk.category)}`}>
                              {getCatLabel(risk.category)}
                            </span>
                          </div>
                          {risk.description && (
                            <p className="text-sm text-gray-500 mb-3">{risk.description}</p>
                          )}
                          <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                            <div className="flex items-center gap-1.5 bg-gray-50 rounded px-2.5 py-1.5">
                              <span>Probabilité</span>
                              <div className="flex gap-0.5">
                                {[1,2,3,4,5].map(i => (
                                  <div key={i} className={`w-2 h-2 rounded-full ${i <= risk.probability ? 'bg-indigo-500' : 'bg-gray-200'}`} />
                                ))}
                              </div>
                              <span className="font-bold text-indigo-600">{risk.probability}/5</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-gray-50 rounded px-2.5 py-1.5">
                              <span>Impact</span>
                              <div className="flex gap-0.5">
                                {[1,2,3,4,5].map(i => (
                                  <div key={i} className={`w-2 h-2 rounded-full ${i <= risk.impact ? 'bg-orange-500' : 'bg-gray-200'}`} />
                                ))}
                              </div>
                              <span className="font-bold text-orange-600">{risk.impact}/5</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-gray-50 rounded px-2.5 py-1.5 font-semibold text-gray-800">
                              Score : <span className={`ml-1 ${sev.color}`}>{risk.risk_score}/25</span>
                            </div>
                            {risk.responsible_person && (
                              <div className="flex items-center gap-1.5 text-gray-500">
                                Responsable : <span className="font-medium text-gray-700">{risk.responsible_person}</span>
                              </div>
                            )}
                          </div>
                          {risk.mitigation_plan && (
                            <div className="mt-3 p-2.5 bg-indigo-50 rounded-lg border border-indigo-100">
                              <p className="text-xs font-semibold text-indigo-700 mb-0.5">Plan de mitigation</p>
                              <p className="text-xs text-indigo-600">{risk.mitigation_plan}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                          <button onClick={() => handleRiskEdit(risk)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                            <Edit className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleRiskDelete(risk.id, risk.title)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </Card>
                  );
                })
              }
            </>
          )}
        </div>
      )}

      {/* ══ ISSUE MODAL ══════════════════════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">
                {selectedIssue ? "Modifier l'enjeu" : 'Nouvel enjeu de matérialité'}
              </h2>
              <button onClick={closeIssueModal} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom *</label>
                <input type="text" required value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  placeholder="Ex : Émissions de CO₂" disabled={submitting} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea rows={3} value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none"
                  placeholder="Décrivez l'enjeu..." disabled={submitting} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Catégorie *</label>
                <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm" disabled={submitting}>
                  <option value="environmental">🌿 Environnemental</option>
                  <option value="social">👥 Social</option>
                  <option value="governance">⚖️ Gouvernance</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Impact Financier : <span className="font-bold text-orange-600">{formData.financial_impact}/100</span>
                </label>
                <input type="range" min="0" max="100" value={formData.financial_impact}
                  onChange={e => setFormData({ ...formData, financial_impact: Number(e.target.value) })}
                  className="w-full accent-orange-500" disabled={submitting} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Impact ESG : <span className="font-bold text-blue-600">{formData.esg_impact}/100</span>
                </label>
                <input type="range" min="0" max="100" value={formData.esg_impact}
                  onChange={e => setFormData({ ...formData, esg_impact: Number(e.target.value) })}
                  className="w-full accent-blue-500" disabled={submitting} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Parties prenantes</label>
                <input type="text" value={formData.stakeholders}
                  onChange={e => setFormData({ ...formData, stakeholders: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="Ex : Investisseurs, ONG, Régulateurs" disabled={submitting} />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting ? <Spinner size="sm" className="mr-2" /> : null}
                  {selectedIssue ? 'Mettre à jour' : "Créer l'enjeu"}
                </Button>
                <Button type="button" variant="secondary" onClick={closeIssueModal} className="flex-1" disabled={submitting}>
                  Annuler
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ RISK MODAL ═══════════════════════════════════════════════════════ */}
      {showRiskModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">
                {selectedRisk ? 'Modifier le risque' : 'Nouveau risque ESG'}
              </h2>
              <button onClick={closeRiskModal} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleRiskSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Titre *</label>
                <input type="text" required value={riskForm.title}
                  onChange={e => setRiskForm({ ...riskForm, title: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="Ex : Risque de transition climatique" disabled={submitting} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea rows={3} value={riskForm.description}
                  onChange={e => setRiskForm({ ...riskForm, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
                  disabled={submitting} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Catégorie *</label>
                <select value={riskForm.category} onChange={e => setRiskForm({ ...riskForm, category: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm" disabled={submitting}>
                  <option value="environmental">🌿 Environnemental</option>
                  <option value="social">👥 Social</option>
                  <option value="governance">⚖️ Gouvernance</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Probabilité : <span className="font-bold text-indigo-600">{riskForm.probability}/5</span>
                  </label>
                  <input type="range" min="1" max="5" value={riskForm.probability}
                    onChange={e => setRiskForm({ ...riskForm, probability: Number(e.target.value) })}
                    className="w-full accent-indigo-500" disabled={submitting} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Impact : <span className="font-bold text-orange-600">{riskForm.impact}/5</span>
                  </label>
                  <input type="range" min="1" max="5" value={riskForm.impact}
                    onChange={e => setRiskForm({ ...riskForm, impact: Number(e.target.value) })}
                    className="w-full accent-orange-500" disabled={submitting} />
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl text-center text-sm">
                Score de risque estimé :
                <span className={`ml-2 text-lg font-bold ${
                  riskForm.probability * riskForm.impact >= 20 ? 'text-red-600' :
                  riskForm.probability * riskForm.impact >= 12 ? 'text-orange-600' :
                  riskForm.probability * riskForm.impact >= 6  ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {riskForm.probability * riskForm.impact}/25
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Plan de mitigation</label>
                <textarea rows={2} value={riskForm.mitigation_plan}
                  onChange={e => setRiskForm({ ...riskForm, mitigation_plan: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
                  placeholder="Actions prévues pour réduire ce risque..." disabled={submitting} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Responsable</label>
                <input type="text" value={riskForm.responsible_person}
                  onChange={e => setRiskForm({ ...riskForm, responsible_person: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="Nom ou fonction" disabled={submitting} />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting ? <Spinner size="sm" className="mr-2" /> : null}
                  {selectedRisk ? 'Mettre à jour' : 'Créer le risque'}
                </Button>
                <Button type="button" variant="secondary" onClick={closeRiskModal} className="flex-1" disabled={submitting}>
                  Annuler
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
