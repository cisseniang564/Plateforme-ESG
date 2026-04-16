import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp,
  TrendingDown,
  Award,
  Leaf,
  Users,
  Scale,
  AlertCircle,
  Building2,
  Calendar,
  Zap,
  Activity,
  RefreshCw,
  ChevronRight,
  ArrowUpRight,
  CheckCircle,
  ArrowDownRight,
  Target,
  BarChart3,
  PieChart as PieChartIcon,
  Download,
  Eye,
  Bell,
  Star,
  Sparkles
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  RadialBarChart,
  RadialBar
} from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import { usePlan } from '@/hooks/usePlan';

// ─── Onboarding checklist ──────────────────────────────────────────────────────
interface CheckStep {
  id: string
  label: string
  detail: string
  icon: React.ElementType
  path: string
  done: boolean
}

function OnboardingChecklist({ steps, collapsed, onToggleCollapse, onDismiss }: {
  steps: CheckStep[]
  collapsed: boolean
  onToggleCollapse: () => void
  onDismiss: () => void
}) {
  const navigate = useNavigate();
  const done = steps.filter(s => s.done).length
  const pct = Math.round((done / steps.length) * 100)

  return (
    <div className="bg-white border border-indigo-100 rounded-2xl shadow-sm overflow-hidden">
      {/* Header — always visible */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <Star className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-800 text-sm">Premiers pas sur ESGFlow</h3>
            <p className="text-xs text-gray-500">{done}/{steps.length} étapes complétées</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Progress pill */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-indigo-100 shadow-sm">
            <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-bold text-indigo-600">{pct}%</span>
          </div>
          <button
            onClick={onToggleCollapse}
            className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded-lg hover:bg-white"
            title={collapsed ? 'Développer' : 'Réduire'}
          >
            <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${collapsed ? '' : 'rotate-90'}`} />
          </button>
          <button onClick={onDismiss} className="text-gray-300 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-white" title="Fermer">
            ✕
          </button>
        </div>
      </div>

      {/* Steps — collapsible */}
      {!collapsed && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 border-t border-indigo-50">
          {steps.map(step => {
            const Icon = step.icon
            return (
              <button
                key={step.id}
                onClick={() => navigate(step.path)}
                className={`flex items-start gap-3 p-4 text-left transition-colors hover:bg-indigo-50/40 ${step.done ? 'opacity-60' : ''}`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  step.done ? 'bg-green-100' : 'bg-indigo-100'
                }`}>
                  {step.done
                    ? <CheckCircle className="h-4 w-4 text-green-600" />
                    : <Icon className="h-3.5 w-3.5 text-indigo-600" />
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-semibold truncate ${step.done ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-tight">{step.detail}</p>
                </div>
                {!step.done && <ChevronRight className="h-3.5 w-3.5 text-gray-300 flex-shrink-0 ml-auto mt-1" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
import { getBatchOrgScores } from '@/services/esgScoringService';
import toast from 'react-hot-toast';

interface Organization {
  id: string;
  name: string;
  industry?: string;
  overall_score?: number;
  environmental_score?: number;
  social_score?: number;
  governance_score?: number;
  rating?: string;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { plan } = usePlan();
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [evolutionData, setEvolutionData] = useState<any[]>([]);
  const [showChecklist, setShowChecklist] = useState(true);
  const [checklistCollapsed, setChecklistCollapsed] = useState(() => {
    return localStorage.getItem('onboarding_collapsed') === '1'
  });
  const [checklistDone, setChecklistDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadDashboard();
  }, []);

  // Check onboarding steps completion
  useEffect(() => {
    const check = async () => {
      const done: Record<string, boolean> = {}
      try {
        const [orgsRes, dataRes, connRes] = await Promise.allSettled([
          api.get('/organizations?limit=1'),
          api.get('/data-entry?limit=1'),
          api.get('/connectors/catalog'),
        ])
        done['org'] = orgsRes.status === 'fulfilled' &&
          ((orgsRes.value.data?.total ?? orgsRes.value.data?.items?.length ?? 0) > 0)
        done['data'] = dataRes.status === 'fulfilled' &&
          ((dataRes.value.data?.total ?? dataRes.value.data?.items?.length ?? 0) > 0)
        done['connector'] = connRes.status === 'fulfilled' &&
          (connRes.value.data?.connectors ?? []).some((c: any) => c.status === 'connected')
        done['score'] = organizations.length > 0 && organizations.some(o => (o as any).overall_score > 0)
        done['report'] = false // will stay unchecked until user generates one
      } catch {/* ignore */}
      setChecklistDone(done)
    }
    check()
  }, [organizations]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.get('/organizations');
      const orgs = res.data?.organizations || res.data?.items || [];

      const scoreMap = await getBatchOrgScores(orgs.map((o: any) => o.id));
      const enrichedOrgs = orgs.map((org: any) => {
        const s = scoreMap[org.id];
        return {
          ...org,
          overall: s?.overall_score ?? null,
          overall_score: s?.overall_score ?? null,
          environmental_score: s?.environmental_score ?? null,
          social_score: s?.social_score ?? null,
          governance_score: s?.governance_score ?? null,
          rating: s?.rating ?? null,
        };
      });

      setOrganizations(enrichedOrgs);

      // Charger l'historique des scores pour le graphique d'évolution
      try {
        const histRes = await api.get('/scores/history');
        const scores: any[] = histRes.data?.scores ?? [];
        const mapped = [...scores].reverse().map((s: any) => ({
          date: new Date(s.calculation_date).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
          global: Math.round(s.overall_score ?? 0),
          env: Math.round(s.environmental_score ?? 0),
          soc: Math.round(s.social_score ?? 0),
          gov: Math.round(s.governance_score ?? 0),
        }));
        setEvolutionData(mapped);
      } catch {
        // Graphique vide si pas de scores, sans bloquer le reste
      }

      toast.success(t('dashboard.refreshed'));
    } catch (error) {
      console.error('Dashboard error:', error);
      toast.error(t('dashboard.loadingError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="text-gray-600 mt-4">{t('dashboard.loading')}</p>
        </div>
      </div>
    );
  }

  // Calculs — guard against division by zero
  const totalOrgs = organizations.length;
  const safeDivisor = totalOrgs || 1;
  const scoredOrgs = organizations.filter(o => (o.overall_score ?? 0) > 0);
  const avgScore = scoredOrgs.length > 0
    ? scoredOrgs.reduce((sum, org) => sum + (org.overall_score || 0), 0) / scoredOrgs.length
    : 0;
  const topPerformers = organizations.filter(org => (org.overall_score || 0) >= 75).length;
  const avgEnv = Math.round(organizations.reduce((sum, org) => sum + (org.environmental_score || 0), 0) / safeDivisor);
  const avgSoc = Math.round(organizations.reduce((sum, org) => sum + (org.social_score || 0), 0) / safeDivisor);
  const avgGov = Math.round(organizations.reduce((sum, org) => sum + (org.governance_score || 0), 0) / safeDivisor);

  const topOrgs = [...organizations].sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0)).slice(0, 5);
  const needsImprovement = [...organizations].sort((a, b) => (a.overall_score || 0) - (b.overall_score || 0)).slice(0, 5);

  const ratingDist = [
    { name: 'AA', value: organizations.filter(o => o.rating === 'AA').length, color: '#059669' },
    { name: 'A', value: organizations.filter(o => o.rating === 'A').length, color: '#10b981' },
    { name: 'BBB', value: organizations.filter(o => o.rating === 'BBB').length, color: '#3b82f6' },
    { name: 'BB', value: organizations.filter(o => o.rating === 'BB').length, color: '#f59e0b' },
    { name: 'B', value: organizations.filter(o => o.rating === 'B').length, color: '#ef4444' }
  ].filter(r => r.value > 0);

  const pillarData = [
    { subject: t('dashboard.environmental'), A: avgEnv, fullMark: 100, color: '#10b981' },
    { subject: t('dashboard.social'), A: avgSoc, fullMark: 100, color: '#3b82f6' },
    { subject: t('dashboard.governance'), A: avgGov, fullMark: 100, color: '#8b5cf6' }
  ];

  const scoreGauge = [
    { name: 'Score', value: Math.round(avgScore), fill: avgScore >= 75 ? '#10b981' : avgScore >= 50 ? '#3b82f6' : '#f59e0b' }
  ];

  const scoredCount = scoredOrgs.length;
  const needsImprovementCount = organizations.filter(o => (o.overall_score ?? 0) > 0 && (o.overall_score ?? 0) < 50).length;

  const kpis = [
    {
      label: t('dashboard.avgEsgScore'),
      value: Math.round(avgScore) || '—',
      change: null,
      trend: 'up',
      icon: Award,
      color: 'from-green-500 to-emerald-600',
      textColor: 'text-green-600',
      bgColor: 'bg-green-50',
      detail: t('dashboard.outOf100')
    },
    {
      label: t('dashboard.organizations'),
      value: totalOrgs,
      change: null,
      trend: 'up',
      icon: Building2,
      color: 'from-blue-500 to-indigo-600',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      detail: t('dashboard.activePortfolio')
    },
    {
      label: t('dashboard.esgLeaders'),
      value: topPerformers,
      change: scoredCount > 0 ? `${Math.round((topPerformers / scoredCount) * 100)}%` : null,
      trend: 'up',
      icon: Star,
      color: 'from-purple-500 to-pink-600',
      textColor: 'text-purple-600',
      bgColor: 'bg-purple-50',
      detail: t('dashboard.scoreGe75')
    },
    {
      label: t('dashboard.improving'),
      value: scoredCount,
      change: null,
      trend: 'up',
      icon: TrendingUp,
      color: 'from-orange-500 to-red-600',
      textColor: 'text-orange-600',
      bgColor: 'bg-orange-50',
      detail: needsImprovementCount > 0 ? `${needsImprovementCount} en dessous de 50` : t('dashboard.positiveTrend')
    }
  ];

  const getRatingBadge = (rating: string) => {
    const colors: Record<string, string> = {
      AA: 'bg-green-600 text-white',
      A: 'bg-green-500 text-white',
      BBB: 'bg-blue-500 text-white',
      BB: 'bg-orange-500 text-white',
      B: 'bg-red-500 text-white'
    };
    return colors[rating] || 'bg-gray-400 text-white';
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Freemium upgrade banner */}
      {plan.is_free && !plan.is_trial && (
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <Sparkles size={18} className="flex-shrink-0 text-yellow-300" />
            <div>
              <span className="font-semibold text-sm">Plan gratuit</span>
              <span className="text-purple-200 text-sm ml-2">— Débloquez CSRD, SFDR, IA ESRS et les connecteurs avancés</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/app/billing')}
            className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 bg-white text-purple-700 text-sm font-bold rounded-xl hover:bg-purple-50 transition-colors"
          >
            <Zap size={13} />
            Mettre à niveau
          </button>
        </div>
      )}
      {/* Onboarding checklist */}
      {showChecklist && (
        <OnboardingChecklist
          collapsed={checklistCollapsed}
          onToggleCollapse={() => {
            const next = !checklistCollapsed
            setChecklistCollapsed(next)
            localStorage.setItem('onboarding_collapsed', next ? '1' : '0')
          }}
          onDismiss={() => {
            setShowChecklist(false)
          }}
          steps={[
            {
              id: 'org', label: 'Créer une organisation', detail: 'Ajoutez votre première entité ESG',
              icon: Building2, path: '/app/organizations', done: !!checklistDone['org']
            },
            {
              id: 'data', label: 'Saisir des données', detail: 'Renseignez vos premiers indicateurs',
              icon: Activity, path: '/app/data-entry', done: !!checklistDone['data']
            },
            {
              id: 'connector', label: 'Connecter une source', detail: 'Branchez un connecteur ou importez un FEC',
              icon: Zap, path: '/app/data/connectors', done: !!checklistDone['connector']
            },
            {
              id: 'score', label: 'Calculer le score ESG', detail: 'Obtenez votre note et les piliers',
              icon: Star, path: '/app/scores', done: !!checklistDone['score']
            },
            {
              id: 'report', label: 'Générer un rapport', detail: 'Produisez votre premier rapport CSRD/GRI',
              icon: Download, path: '/app/reports', done: !!checklistDone['report']
            },
          ]}
        />
      )}

      {/* Header Premium avec Glassmorphism */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-3xl shadow-2xl">
        {/* Animated Background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 -left-4 w-96 h-96 bg-white rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
          <div className="absolute top-0 -right-4 w-96 h-96 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
          <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
        </div>

        <div className="relative px-8 py-10">
          <div className="flex items-start justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-white/20 backdrop-blur-lg rounded-2xl border border-white/30">
                  <Activity className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-white mb-1">
                    {t('dashboard.executiveDashboard')}
                  </h1>
                  <p className="text-white/80 text-lg flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(), 'EEEE dd MMMM yyyy', { locale: fr })}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleRefresh}
                disabled={refreshing}
                className="bg-white/20 backdrop-blur-lg border border-white/30 text-white hover:bg-white/30"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {t('dashboard.refresh')}
              </Button>
              <Button
                onClick={() => navigate('/app/reports/generate')}
                className="bg-white text-indigo-600 hover:bg-white/90"
              >
                <Download className="h-4 w-4 mr-2" />
                {t('dashboard.export')}
              </Button>
            </div>
          </div>

          {/* Score Principal */}
          <div className="flex items-end gap-8">
            <div className="flex items-baseline gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 blur-2xl rounded-full" />
                <div className="relative">
                  <span className="text-8xl font-black text-white drop-shadow-2xl">
                    {Math.round(avgScore)}
                  </span>
                  <span className="text-4xl text-white/70 ml-2">/100</span>
                </div>
              </div>
            </div>

            {scoredCount > 0 && (
              <div className="flex items-center gap-3 bg-white/20 backdrop-blur-lg px-6 py-3 rounded-2xl border border-white/30 mb-2">
                <div className="p-2 bg-green-500/30 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{scoredCount}/{totalOrgs}</p>
                  <p className="text-sm text-white/70">organisations scorées</p>
                </div>
              </div>
            )}

            <div className="flex gap-4 mb-2">
              <div className="text-center">
                <div className="p-3 bg-green-500/20 backdrop-blur-sm rounded-xl mb-2">
                  <Leaf className="h-6 w-6 text-white mx-auto" />
                </div>
                <p className="text-2xl font-bold text-white">{avgEnv}</p>
                <p className="text-xs text-white/70">Env.</p>
              </div>
              <div className="text-center">
                <div className="p-3 bg-blue-500/20 backdrop-blur-sm rounded-xl mb-2">
                  <Users className="h-6 w-6 text-white mx-auto" />
                </div>
                <p className="text-2xl font-bold text-white">{avgSoc}</p>
                <p className="text-xs text-white/70">Social</p>
              </div>
              <div className="text-center">
                <div className="p-3 bg-purple-500/20 backdrop-blur-sm rounded-xl mb-2">
                  <Scale className="h-6 w-6 text-white mx-auto" />
                </div>
                <p className="text-2xl font-bold text-white">{avgGov}</p>
                <p className="text-xs text-white/70">Gouv.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs Modernes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div 
              key={kpi.label}
              className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer border border-gray-100"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${kpi.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
              
              <div className="relative p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 ${kpi.bgColor} rounded-xl group-hover:scale-110 transition-transform`}>
                    <Icon className={`h-6 w-6 ${kpi.textColor}`} />
                  </div>
                  {kpi.change != null && (
                    <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full ${
                      kpi.trend === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {kpi.trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      <span className="text-xs font-bold">{kpi.change}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">{kpi.label}</p>
                  <p className="text-4xl font-black text-gray-900">{kpi.value}</p>
                  <p className="text-xs text-gray-500">{kpi.detail}</p>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-0 group-hover:opacity-100 transition-opacity" 
                  style={{ color: kpi.textColor.replace('text-', '') }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Graphiques Principaux */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        {/* Évolution (5 cols) */}
        <Card className="lg:col-span-5 shadow-xl border-0">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{t('dashboard.scoreEvolutionTitle')}</h3>
                <p className="text-sm text-gray-600">{t('dashboard.performanceOver12Months')}</p>
              </div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={evolutionData}>
              <defs>
                <linearGradient id="colorGlobal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white',
                  border: 'none',
                  borderRadius: '16px',
                  boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                  padding: '16px'
                }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Area 
                type="monotone" 
                dataKey="overall" 
                stroke="#6366f1" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorGlobal)" 
                name="Global"
              />
              <Line type="monotone" dataKey="environmental" stroke="#10b981" strokeWidth={2.5} dot={{ r: 5 }} name="Env." />
              <Line type="monotone" dataKey="social" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 5 }} name="Social" />
              <Line type="monotone" dataKey="governance" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 5 }} name="Gouv." />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        {/* Score Gauge + Ratings (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Jauge Score */}
          <Card className="shadow-xl border-0">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{t('dashboard.globalScore')}</h3>
            <ResponsiveContainer width="100%" height={180}>
              <RadialBarChart 
                cx="50%" 
                cy="50%" 
                innerRadius="60%" 
                outerRadius="100%" 
                data={scoreGauge}
                startAngle={180}
                endAngle={0}
              >
                <RadialBar
                  background
                  dataKey="value"
                  cornerRadius={30}
                />
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                  <tspan x="50%" fontSize="32" fontWeight="bold" fill="#111827">
                    {Math.round(avgScore)}
                  </tspan>
                  <tspan x="50%" dy="24" fontSize="14" fill="#6b7280">
                    /100
                  </tspan>
                </text>
              </RadialBarChart>
            </ResponsiveContainer>
          </Card>

          {/* Ratings Distribution */}
          <Card className="shadow-xl border-0">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{t('dashboard.ratings')}</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={ratingDist}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {ratingDist.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-4">
              {ratingDist.map(r => (
                <div key={r.name} className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: r.color }} />
                  <span className="font-semibold">{r.name}</span>
                  <span className="text-gray-600">({r.value})</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Top & Bottom Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 */}
        <Card className="shadow-xl border-0">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
                <Award className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">{t('dashboard.top5Performances')}</h3>
            </div>
            <Button size="sm" variant="secondary" onClick={() => navigate('/app/organizations')}>
              {t('dashboard.seeAll')} <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          <div className="space-y-3">
            {topOrgs.map((org, idx) => (
              <div
                key={org.id}
                className="group flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-2xl hover:from-green-50 hover:to-emerald-50 transition-all cursor-pointer border border-gray-100 hover:border-green-200"
                onClick={() => navigate(`/app/organizations/${org.id}`)}
              >
                <div className={`flex items-center justify-center w-10 h-10 rounded-xl font-bold text-sm shadow-lg ${
                  idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white' :
                  idx === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white' :
                  idx === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white' :
                  'bg-gradient-to-br from-gray-200 to-gray-400 text-gray-700'
                }`}>
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate group-hover:text-green-700 transition-colors">
                    {org.name}
                  </p>
                  <p className="text-sm text-gray-600">{org.industry}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-green-600">{Math.round(org.overall_score ?? 0)}</p>
                  <span className={`inline-block mt-1 text-xs px-3 py-1 rounded-full font-bold ${getRatingBadge(org.rating || '')}`}>
                    {org.rating}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* À Améliorer */}
        <Card className="shadow-xl border-0">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl">
                <AlertCircle className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">{t('dashboard.improvementPriorities')}</h3>
            </div>
            <Button size="sm" variant="secondary" onClick={() => navigate('/app/organizations')}>
              {t('dashboard.seeAll')} <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          <div className="space-y-3">
            {needsImprovement.map((org, idx) => (
              <div
                key={org.id}
                className="group flex items-center gap-4 p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl hover:from-orange-100 hover:to-red-100 transition-all cursor-pointer border border-orange-200"
                onClick={() => navigate(`/app/organizations/${org.id}`)}
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 text-white font-bold text-sm shadow-lg">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate">{org.name}</p>
                  <p className="text-sm text-gray-600">{org.industry}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-orange-600">{Math.round(org.overall_score ?? 0)}</p>
                  <span className={`inline-block mt-1 text-xs px-3 py-1 rounded-full font-bold ${getRatingBadge(org.rating || '')}`}>
                    {org.rating}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Actions Rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div 
          className="group p-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl cursor-pointer hover:shadow-2xl transition-all"
          onClick={() => navigate('/app/calculated-metrics')}
        >
          <Zap className="h-8 w-8 text-white mb-3" />
          <h4 className="text-white font-bold text-lg mb-1">{t('dashboard.autoCalcs')}</h4>
          <p className="text-blue-100 text-sm">{t('dashboard.kpisRealTime')}</p>
          <ChevronRight className="h-5 w-5 text-white mt-3 group-hover:translate-x-1 transition-transform" />
        </div>

        <div 
          className="group p-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl cursor-pointer hover:shadow-2xl transition-all"
          onClick={() => navigate('/app/reports/generate')}
        >
          <Download className="h-8 w-8 text-white mb-3" />
          <h4 className="text-white font-bold text-lg mb-1">{t('dashboard.pdfReports')}</h4>
          <p className="text-green-100 text-sm">{t('dashboard.csrdGriExports')}</p>
          <ChevronRight className="h-5 w-5 text-white mt-3 group-hover:translate-x-1 transition-transform" />
        </div>

        <div 
          className="group p-6 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl cursor-pointer hover:shadow-2xl transition-all"
          onClick={() => navigate('/app/my-data')}
        >
          <Eye className="h-8 w-8 text-white mb-3" />
          <h4 className="text-white font-bold text-lg mb-1">{t('dashboard.myData')}</h4>
          <p className="text-purple-100 text-sm">{t('dashboard.allEsgData')}</p>
          <ChevronRight className="h-5 w-5 text-white mt-3 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </div>
  );
}
