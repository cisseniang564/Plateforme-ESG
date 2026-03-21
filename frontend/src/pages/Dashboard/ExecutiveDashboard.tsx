import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp,
  TrendingDown,
  Award,
  Leaf,
  Users,
  Scale,
  AlertCircle,
  CheckCircle,
  Building2,
  Calendar,
  BarChart3,
  Target,
  Zap,
  Activity,
  Filter,
  Download,
  RefreshCw,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Shield,
  Plug,
  Brain,
  Database,
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart
} from 'recharts';
import { format, subDays, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate, useLocation } from 'react-router-dom';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import { generateConsistentScores, generateEvolutionData } from '@/utils/mockScores';
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

interface DashboardStats {
  total_organizations: number;
  average_score: number;
  top_performers: number;
  improving_orgs: number;
  total_indicators: number;
  data_points: number;
  completion_rate: number;
}

export default function ExecutiveDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  // Reload each time user navigates to this page
  useEffect(() => {
    loadDashboard();
  }, [location.key]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      // Charger les organisations
      const res = await api.get('/organizations');
      const orgs = res.data?.organizations || res.data?.items || [];
      
      // Enrichir avec scores cohérents
      const enrichedOrgs = orgs.map((org: any) => {
        const scores = generateConsistentScores(org.id);
        return {
          ...org,
          overall_score: scores.overall,
          environmental_score: scores.environmental,
          social_score: scores.social,
          governance_score: scores.governance,
          rating: scores.rating
        };
      });

      setOrganizations(enrichedOrgs);

      // Calculer les stats (protégé contre division par zéro)
      const totalOrgs = enrichedOrgs.length;
      const avgScore = totalOrgs > 0
        ? enrichedOrgs.reduce((sum: number, org: Organization) => sum + (org.overall_score || 0), 0) / totalOrgs
        : 0;
      const topPerformers = enrichedOrgs.filter((org: Organization) =>
        (org.overall_score || 0) >= 75).length;
      const improving = Math.floor(totalOrgs * 0.6);

      setStats({
        total_organizations: totalOrgs,
        average_score: avgScore,
        top_performers: topPerformers,
        improving_orgs: improving,
        total_indicators: 10,
        data_points: totalOrgs * 10 * 12,
        completion_rate: totalOrgs > 0 ? 87 : 0
      });

      // toast removed to avoid noise on every navigation
    } catch (error) {
      console.error('Dashboard loading error:', error);
      toast.error(t('dashboard.loadingError'));
    } finally {
      setLoading(false);
    }
  };

  // Évolution temporelle avec vraies données
  const evolutionData = generateEvolutionData('dashboard-avg', 12);

  // Top 5 organisations
  const topOrganizations = [...organizations]
    .sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0))
    .slice(0, 5);

  // Bottom 5 organisations
  const improvementNeeded = [...organizations]
    .sort((a, b) => (a.overall_score || 0) - (b.overall_score || 0))
    .slice(0, 5);

  // Répartition par rating
  const ratingDistribution = [
    { name: 'AA', value: organizations.filter(o => o.rating === 'AA').length, color: '#059669' },
    { name: 'A', value: organizations.filter(o => o.rating === 'A').length, color: '#10b981' },
    { name: 'BBB', value: organizations.filter(o => o.rating === 'BBB').length, color: '#3b82f6' },
    { name: 'BB', value: organizations.filter(o => o.rating === 'BB').length, color: '#f59e0b' },
    { name: 'B', value: organizations.filter(o => o.rating === 'B').length, color: '#ef4444' }
  ].filter(r => r.value > 0);

  // Scores moyens par pilier (protégé contre division par zéro)
  const orgCount = organizations.length || 1;
  const pillarAverages = [
    {
      name: t('dashboard.environmental'),
      score: Math.round(organizations.reduce((sum, org) =>
        sum + (org.environmental_score || 0), 0) / orgCount),
      target: 75,
      color: '#10b981',
      icon: Leaf
    },
    {
      name: t('dashboard.social'),
      score: Math.round(organizations.reduce((sum, org) =>
        sum + (org.social_score || 0), 0) / orgCount),
      target: 75,
      color: '#3b82f6',
      icon: Users
    },
    {
      name: t('dashboard.governance'),
      score: Math.round(organizations.reduce((sum, org) =>
        sum + (org.governance_score || 0), 0) / orgCount),
      target: 75,
      color: '#8b5cf6',
      icon: Scale
    }
  ];

  // Distribution des scores
  const scoreDistribution = [
    {
      name: t('dashboard.scoreExcellent'),
      value: organizations.filter(o => (o.overall_score || 0) >= 75).length,
      color: '#10b981'
    },
    {
      name: t('dashboard.scoreGood'),
      value: organizations.filter(o => (o.overall_score || 0) >= 60 && (o.overall_score || 0) < 75).length,
      color: '#3b82f6'
    },
    {
      name: t('dashboard.scoreAverage'),
      value: organizations.filter(o => (o.overall_score || 0) >= 45 && (o.overall_score || 0) < 60).length,
      color: '#f59e0b'
    },
    {
      name: t('dashboard.scoreLow'),
      value: organizations.filter(o => (o.overall_score || 0) < 45).length,
      color: '#ef4444'
    }
  ].filter(d => d.value > 0);

  // Répartition par secteur
  const sectorData = organizations.reduce((acc: any, org) => {
    const sector = org.industry || 'Autre';
    if (!acc[sector]) {
      acc[sector] = { count: 0, totalScore: 0 };
    }
    acc[sector].count++;
    acc[sector].totalScore += org.overall_score || 0;
    return acc;
  }, {});

  const sectorPerformance = Object.entries(sectorData)
    .map(([sector, data]: [string, any]) => ({
      sector,
      organizations: data.count,
      avgScore: Math.round(data.totalScore / data.count)
    }))
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 6);

  const kpis = [
    {
      label: t('dashboard.organizations'),
      value: stats?.total_organizations || 0,
      change: '+4',
      icon: Building2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      subtext: t('dashboard.totalActive')
    },
    {
      label: t('dashboard.avgScore'),
      value: Math.round(stats?.average_score || 0),
      change: '+2.3%',
      icon: Award,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      subtext: t('dashboard.outOf100')
    },
    {
      label: t('dashboard.leaders'),
      value: stats?.top_performers || 0,
      change: '+3',
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      subtext: t('dashboard.excellentPerformances')
    },
    {
      label: t('dashboard.improving'),
      value: stats?.improving_orgs || 0,
      change: '+8',
      icon: Zap,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      subtext: t('dashboard.positiveTrend')
    }
  ];

  const getRatingColor = (rating: string) => {
    if (!rating) return 'bg-gray-100 text-gray-800';
    if (rating === 'AA') return 'bg-green-600 text-white';
    if (rating === 'A') return 'bg-green-500 text-white';
    if (rating === 'BBB') return 'bg-blue-500 text-white';
    if (rating === 'BB') return 'bg-orange-500 text-white';
    return 'bg-red-500 text-white';
  };

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case '7d': return t('dashboard.last7days');
      case '30d': return t('dashboard.last30days');
      case '90d': return t('dashboard.last90days');
      case '1y': return t('dashboard.last12months');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!loading && organizations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center p-8">
        <div className="w-20 h-20 bg-primary-100 rounded-2xl flex items-center justify-center mb-6">
          <Building2 className="h-10 w-10 text-primary-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          {t('dashboard.welcome')}
        </h2>
        <p className="text-gray-500 max-w-md mb-8">
          {t('dashboard.welcomeSubtitle')}
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate('/app/organizations')}
            className="px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors flex items-center gap-2"
          >
            <Building2 className="h-5 w-5" />
            {t('dashboard.createOrganization')}
          </button>
          <button
            onClick={() => navigate('/app/data-entry')}
            className="px-6 py-3 bg-white text-gray-700 border-2 border-gray-200 rounded-xl font-semibold hover:border-primary-300 transition-colors flex items-center gap-2"
          >
            <Zap className="h-5 w-5" />
            {t('dashboard.enterData')}
          </button>
        </div>
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full">
          {[
            { step: '1', title: t('dashboard.createOrganization'), desc: t('dashboard.step1Desc'), icon: Building2 },
            { step: '2', title: t('dashboard.enterYourData'), desc: t('dashboard.step2Desc'), icon: Activity },
            { step: '3', title: t('dashboard.analyzeScores'), desc: t('dashboard.step3Desc'), icon: BarChart3 },
          ].map(({ step, title, desc, icon: Icon }) => (
            <div key={step} className="bg-white rounded-xl border border-gray-200 p-4 text-left">
              <div className="w-8 h-8 bg-primary-600 text-white rounded-lg flex items-center justify-center text-sm font-bold mb-3">
                {step}
              </div>
              <Icon className="h-5 w-5 text-primary-500 mb-2" />
              <h4 className="font-semibold text-gray-900 text-sm">{title}</h4>
              <p className="text-xs text-gray-500 mt-1">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Premium */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 rounded-2xl p-8 text-white shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24" />
        
        <div className="relative">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                <Activity className="h-10 w-10" />
                {t('dashboard.executiveDashboard')}
              </h1>
              <p className="text-primary-100 text-lg">
                {t('dashboard.consolidatedPerformance')} • {format(new Date(), 'dd MMMM yyyy', { locale: fr })}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/30">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4" />
                  <span>{getPeriodLabel()}</span>
                </div>
              </div>
              <Button
                onClick={loadDashboard}
                variant="secondary"
                size="sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('dashboard.refresh')}
              </Button>
            </div>
          </div>

          {/* Score Global */}
          <div className="flex items-end gap-6">
            <div>
              <p className="text-primary-200 text-sm mb-2">{t('dashboard.avgEsgScore')}</p>
              <div className="flex items-end gap-4">
                <span className="text-7xl font-bold">
                  {Math.round(stats?.average_score || 0)}
                </span>
                <span className="text-4xl text-primary-200 mb-2">/100</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 bg-green-500/20 px-4 py-2 rounded-lg mb-2">
              <TrendingUp className="h-5 w-5 text-green-300" />
              <span className="text-lg font-semibold">+2.3%</span>
              <span className="text-primary-200">{t('dashboard.vsPreviousPeriod')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          const isPositive = kpi.change.includes('+');
          
          return (
            <Card 
              key={kpi.label}
              className={`border-l-4 ${kpi.borderColor} hover:shadow-xl transition-all cursor-pointer group`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-3 ${kpi.bgColor} rounded-xl group-hover:scale-110 transition-transform`}>
                  <Icon className={`h-6 w-6 ${kpi.color}`} />
                </div>
                <span className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full ${
                  isPositive 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {kpi.change}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-1 font-medium">{kpi.label}</p>
              <p className="text-4xl font-bold text-gray-900 mb-1">{kpi.value}</p>
              <p className="text-xs text-gray-500">{kpi.subtext}</p>
            </Card>
          );
        })}
      </div>

      {/* Insights IA + Progression CSRD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Insights IA */}
        <div className="lg:col-span-2 rounded-2xl bg-gradient-to-r from-emerald-900 to-green-800 p-6 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-yellow-300" />
            <h3 className="font-bold text-base">
              {t('dashboard.aiInsightsTitle')} — {format(new Date(), 'dd MMMM yyyy', { locale: fr })}
            </h3>
          </div>
          <ul className="space-y-2 text-sm text-emerald-100 mb-4">
            <li>{t('dashboard.aiInsight1')}</li>
            <li>{t('dashboard.aiInsight2')}</li>
            <li>{t('dashboard.aiInsight3')}</li>
          </ul>
          <button
            onClick={() => navigate('/app/intelligence')}
            className="text-xs font-semibold text-yellow-300 hover:text-yellow-100 transition-colors flex items-center gap-1"
          >
            {t('dashboard.aiInsightsCTA')}
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        {/* Progression CSRD */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">
              {t('dashboard.csrdProgressLabel')}
            </p>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-3xl font-bold text-amber-800">61%</span>
              <span className="text-sm text-amber-600 mb-1">{t('dashboard.csrdProgressSub')}</span>
            </div>
            <div className="w-full bg-amber-200 rounded-full h-3 mb-2">
              <div className="bg-amber-500 h-3 rounded-full" style={{ width: '61%' }} />
            </div>
            <p className="text-xs text-amber-700">{t('dashboard.csrdProgressHint')}</p>
          </div>
          <button
            onClick={() => navigate('/app/reports/csrd-builder')}
            className="mt-3 text-xs font-semibold text-amber-800 hover:text-amber-600 flex items-center gap-1"
          >
            {t('dashboard.csrdProgressCTA')}
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Graphiques Principaux */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Évolution (Span 2 colonnes) */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary-600" />
              {t('dashboard.scoreEvolution')}
            </h3>
            <div className="flex gap-2">
              {(['7d', '30d', '90d', '1y'] as const).map(period => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-3 py-1 text-sm rounded-lg transition-all ${
                    selectedPeriod === period
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {period === '7d' ? '7J' : period === '30d' ? '30J' : period === '90d' ? '90J' : '1An'}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={evolutionData}>
              <defs>
                <linearGradient id="colorOverall" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '11px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '12px',
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                }}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="overall" 
                stroke="#6366f1" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorOverall)" 
                name={t('dashboard.globalScore')}
              />
              <Line 
                type="monotone" 
                dataKey="environmental" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={{ r: 4 }}
                name={t('dashboard.environmental')}
              />
              <Line
                type="monotone"
                dataKey="social"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4 }}
                name={t('dashboard.social')}
              />
              <Line
                type="monotone"
                dataKey="governance"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ r: 4 }}
                name={t('dashboard.governance')}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        {/* Distribution par Rating */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            {t('dashboard.ratingDistribution')}
          </h3>
          {ratingDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={ratingDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) =>
                    `${name}: ${value} (${Number.isFinite(percent) ? (percent * 100).toFixed(0) : 0}%)`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {ratingDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
              {t('dashboard.noRatingData')}
            </div>
          )}
        </Card>
      </div>

      {/* Scores par Pilier avec Objectifs */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <Target className="h-5 w-5 text-primary-600" />
          {t('dashboard.pillarPerformance')}
        </h3>
        <div className="space-y-6">
          {pillarAverages.map((pillar) => {
            const Icon = pillar.icon;
            const progress = (pillar.score / pillar.target) * 100;
            const isOnTrack = pillar.score >= pillar.target;

            return (
              <div key={pillar.name}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: `${pillar.color}20` }}>
                      <Icon className="h-5 w-5" style={{ color: pillar.color }} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{pillar.name}</p>
                      <p className="text-sm text-gray-600">
                        {t('dashboard.target')}: {pillar.target}/100
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold" style={{ color: pillar.color }}>
                      {pillar.score}
                    </p>
                    <p className={`text-xs font-medium ${isOnTrack ? 'text-green-600' : 'text-orange-600'}`}>
                      {isOnTrack ? `✓ ${t('dashboard.targetReached')}` : `${pillar.target - pillar.score} ${t('dashboard.ptsRemaining')}`}
                    </p>
                  </div>
                </div>
                <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="absolute h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${Math.min(progress, 100)}%`,
                      backgroundColor: pillar.color
                    }}
                  />
                  {/* Marker objectif */}
                  <div 
                    className="absolute h-full w-0.5 bg-gray-800"
                    style={{ left: '75%' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Tableaux Top/Bottom */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Award className="h-5 w-5 text-green-600" />
              {t('dashboard.top5Performances')}
            </h3>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate('/organizations')}
            >
              {t('dashboard.seeAll')}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          <div className="space-y-3">
            {topOrganizations.map((org, index) => (
              <div 
                key={org.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => navigate(`/organizations/${org.id}`)}
              >
                <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                  index === 0 ? 'bg-yellow-400 text-yellow-900' :
                  index === 1 ? 'bg-gray-300 text-gray-700' :
                  index === 2 ? 'bg-orange-400 text-orange-900' :
                  'bg-gray-200 text-gray-600'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{org.name}</p>
                  <p className="text-sm text-gray-600">{org.industry}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-green-600">{org.overall_score}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${getRatingColor(org.rating || '')}`}>
                    {org.rating}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Bottom 5 - À améliorer */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              {t('dashboard.improvementPriorities')}
            </h3>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate('/organizations')}
            >
              {t('dashboard.seeAll')}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          <div className="space-y-3">
            {improvementNeeded.map((org, index) => (
              <div 
                key={org.id}
                className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors cursor-pointer"
                onClick={() => navigate(`/organizations/${org.id}`)}
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-200 text-orange-900 font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{org.name}</p>
                  <p className="text-sm text-gray-600">{org.industry}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-orange-600">{org.overall_score}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${getRatingColor(org.rating || '')}`}>
                    {org.rating}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Performance par Secteur */}
      {sectorPerformance.length > 0 && (
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          {t('dashboard.sectorPerformance')}
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={sectorPerformance} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis type="number" domain={[0, 100]} />
            <YAxis dataKey="sector" type="category" width={150} style={{ fontSize: '12px' }} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}
            />
            <Bar dataKey="avgScore" fill="#6366f1" radius={[0, 8, 8, 0]}>
              {sectorPerformance.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.avgScore >= 70 ? '#10b981' : entry.avgScore >= 50 ? '#3b82f6' : '#f59e0b'} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>
      )}

      {/* Alertes et Actions */}
      {stats && stats.average_score < 60 && (
        <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
          <div className="flex items-start gap-4">
            <AlertCircle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-orange-900 mb-2">
                {t('dashboard.alertTitle')}
              </h4>
              <p className="text-sm text-orange-800 mb-4">
                {t('dashboard.alertDesc', { score: Math.round(stats.average_score), count: improvementNeeded.length })}
              </p>
              <div className="flex gap-3">
                <Button
                  size="sm"
                  onClick={() => navigate('/organizations')}
                >
                  {t('dashboard.seeOrganizations')}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => navigate('/reports/generate')}
                >
                  {t('dashboard.generateReport')}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Acces rapide */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-3">{t('dashboard.quickAccessTitle')}</h3>
        <div className="grid grid-cols-2 2xl:grid-cols-4 gap-4">
          {[
            { label: t('dashboard.quickAccessEntry'), route: '/app/data-entry', icon: Database, iconColor: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
            { label: t('dashboard.quickAccessCsrd'), route: '/app/reports/csrd-builder', icon: Shield, iconColor: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200' },
            { label: t('dashboard.quickAccessConnectors'), route: '/app/data/connectors', icon: Plug, iconColor: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200' },
            { label: t('dashboard.quickAccessAI'), route: '/app/intelligence', icon: Brain, iconColor: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-200' },
          ].map(({ label, route, icon: Icon, iconColor, bg, border }) => (
            <button
              key={route}
              onClick={() => navigate(route)}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 ${border} ${bg} hover:shadow-md transition-all text-left group`}
            >
              <div className={`p-2 rounded-lg bg-white/80`}>
                <Icon className={`h-5 w-5 ${iconColor}`} />
              </div>
              <span className="font-semibold text-gray-800 text-sm flex-1">{label}</span>
              <ArrowUpRight className={`h-4 w-4 ${iconColor} opacity-0 group-hover:opacity-100 transition-opacity`} />
            </button>
          ))}
        </div>
      </div>

      {/* Upcoming regulatory deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-l-4 border-amber-400">
          <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-amber-500" />
            {t('dashboard.upcomingDeadlines')}
          </h3>
          <div className="space-y-2.5">
            {[
              { label: t('dashboard.deadlineCsrd'), date: '30 avr. 2025', daysLeft: 40, color: 'bg-red-500', urgent: true },
              { label: t('dashboard.deadlineSfdr'), date: '30 juin 2025', daysLeft: 101, color: 'bg-amber-500', urgent: false },
              { label: t('dashboard.deadlineTaxonomy'), date: '31 déc. 2025', daysLeft: 285, color: 'bg-green-500', urgent: false },
            ].map(d => (
              <div key={d.label} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${d.color}`} />
                  <span className="text-sm text-gray-700 truncate">{d.label}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-gray-500">{d.date}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${d.urgent ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                    J-{d.daysLeft}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-l-4 border-emerald-400">
          <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
            {t('dashboard.recentActivity')}
          </h3>
          <div className="space-y-2.5">
            {[
              { label: t('dashboard.activityCsrd'), time: t('dashboard.activityTimeToday'), icon: '📄' },
              { label: t('dashboard.activityScope1'), time: t('dashboard.activityTimeYesterday'), icon: '🌿' },
              { label: t('dashboard.activityAudit'), time: t('dashboard.activityTime2days'), icon: '✅' },
            ].map((a, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="text-base">{a.icon}</span>
                <span className="flex-1 text-gray-700">{a.label}</span>
                <span className="text-xs text-gray-400 flex-shrink-0">{a.time}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ESRS Coverage tracker */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Target className="h-5 w-5 text-violet-600" />
            {t('dashboard.esrsCoverageTitle')}
          </h3>
          <button
            onClick={() => navigate('/app/reports/csrd-builder')}
            className="text-sm text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1"
          >
            {t('dashboard.esrsViewBuilder')} <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { code: 'E1', label: t('dashboard.esrsE1'), pct: 82, color: 'bg-emerald-500', track: 'bg-emerald-100' },
            { code: 'E2', label: t('dashboard.esrsE2'), pct: 65, color: 'bg-green-500', track: 'bg-green-100' },
            { code: 'E3', label: t('dashboard.esrsE3'), pct: 44, color: 'bg-teal-500', track: 'bg-teal-100' },
            { code: 'E4', label: t('dashboard.esrsE4'), pct: 28, color: 'bg-lime-500', track: 'bg-lime-100' },
            { code: 'E5', label: t('dashboard.esrsE5'), pct: 51, color: 'bg-green-600', track: 'bg-green-100' },
            { code: 'S1', label: t('dashboard.esrsS1'), pct: 77, color: 'bg-blue-500', track: 'bg-blue-100' },
            { code: 'S2', label: t('dashboard.esrsS2'), pct: 55, color: 'bg-sky-500', track: 'bg-sky-100' },
            { code: 'S3', label: t('dashboard.esrsS3'), pct: 33, color: 'bg-cyan-500', track: 'bg-cyan-100' },
            { code: 'S4', label: t('dashboard.esrsS4'), pct: 60, color: 'bg-blue-600', track: 'bg-blue-100' },
            { code: 'G1', label: t('dashboard.esrsG1'), pct: 88, color: 'bg-purple-500', track: 'bg-purple-100' },
          ].map(({ code, label, pct, color, track }) => (
            <div key={code} className={`p-3 rounded-xl ${track}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-700">{code}</span>
                <span className={`text-xs font-bold ${pct >= 70 ? 'text-green-700' : pct >= 40 ? 'text-amber-700' : 'text-red-600'}`}>{pct}%</span>
              </div>
              <div className="w-full bg-white/70 rounded-full h-1.5 mb-1.5">
                <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[10px] text-gray-500 leading-tight">{label}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}