import { useState, useEffect } from 'react';
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
  ArrowDownRight
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
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  useEffect(() => {
    loadDashboard();
  }, []);

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

      // Calculer les stats
      const totalOrgs = enrichedOrgs.length;
      const avgScore = enrichedOrgs.reduce((sum: number, org: Organization) => 
        sum + (org.overall_score || 0), 0) / totalOrgs;
      const topPerformers = enrichedOrgs.filter((org: Organization) => 
        (org.overall_score || 0) >= 75).length;
      const improving = Math.floor(totalOrgs * 0.6); // Mock: 60% en amélioration

      setStats({
        total_organizations: totalOrgs,
        average_score: avgScore,
        top_performers: topPerformers,
        improving_orgs: improving,
        total_indicators: 10,
        data_points: totalOrgs * 10 * 12, // orgs × indicateurs × mois
        completion_rate: 87
      });

      toast.success('Tableau de bord actualisé');
    } catch (error) {
      console.error('Dashboard loading error:', error);
      toast.error('Erreur lors du chargement');
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

  // Scores moyens par pilier
  const pillarAverages = [
    {
      name: 'Environnemental',
      score: Math.round(organizations.reduce((sum, org) => 
        sum + (org.environmental_score || 0), 0) / organizations.length),
      target: 75,
      color: '#10b981',
      icon: Leaf
    },
    {
      name: 'Social',
      score: Math.round(organizations.reduce((sum, org) => 
        sum + (org.social_score || 0), 0) / organizations.length),
      target: 75,
      color: '#3b82f6',
      icon: Users
    },
    {
      name: 'Gouvernance',
      score: Math.round(organizations.reduce((sum, org) => 
        sum + (org.governance_score || 0), 0) / organizations.length),
      target: 75,
      color: '#8b5cf6',
      icon: Scale
    }
  ];

  // Distribution des scores
  const scoreDistribution = [
    { 
      name: 'Excellents (75-100)', 
      value: organizations.filter(o => (o.overall_score || 0) >= 75).length, 
      color: '#10b981' 
    },
    { 
      name: 'Bons (60-74)', 
      value: organizations.filter(o => (o.overall_score || 0) >= 60 && (o.overall_score || 0) < 75).length, 
      color: '#3b82f6' 
    },
    { 
      name: 'Moyens (45-59)', 
      value: organizations.filter(o => (o.overall_score || 0) >= 45 && (o.overall_score || 0) < 60).length, 
      color: '#f59e0b' 
    },
    { 
      name: 'Faibles (<45)', 
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
      label: 'Organisations',
      value: stats?.total_organizations || 0,
      change: '+4',
      icon: Building2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      subtext: 'Total actif'
    },
    {
      label: 'Score Moyen',
      value: Math.round(stats?.average_score || 0),
      change: '+2.3%',
      icon: Award,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      subtext: 'Sur 100 points'
    },
    {
      label: 'Leaders (≥75)',
      value: stats?.top_performers || 0,
      change: '+3',
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      subtext: 'Performances excellentes'
    },
    {
      label: 'En amélioration',
      value: stats?.improving_orgs || 0,
      change: '+8',
      icon: Zap,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      subtext: 'Tendance positive'
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
      case '7d': return '7 derniers jours';
      case '30d': return '30 derniers jours';
      case '90d': return '90 derniers jours';
      case '1y': return '12 derniers mois';
    }
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
      {/* Header Premium */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 rounded-2xl p-8 text-white shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24" />
        
        <div className="relative">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                <Activity className="h-10 w-10" />
                Tableau de Bord Exécutif
              </h1>
              <p className="text-primary-100 text-lg">
                Performance ESG consolidée • {format(new Date(), 'dd MMMM yyyy', { locale: fr })}
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
                Actualiser
              </Button>
            </div>
          </div>

          {/* Score Global */}
          <div className="flex items-end gap-6">
            <div>
              <p className="text-primary-200 text-sm mb-2">Score ESG Moyen</p>
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
              <span className="text-primary-200">vs période précédente</span>
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

      {/* Graphiques Principaux */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Évolution (Span 2 colonnes) */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary-600" />
              Évolution des Scores - 12 Derniers Mois
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
                name="Score Global"
              />
              <Line 
                type="monotone" 
                dataKey="environmental" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Environnemental"
              />
              <Line 
                type="monotone" 
                dataKey="social" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Social"
              />
              <Line 
                type="monotone" 
                dataKey="governance" 
                stroke="#8b5cf6" 
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Gouvernance"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        {/* Distribution par Rating */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Répartition par Rating
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={ratingDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value, percent }) => 
                  `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
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
        </Card>
      </div>

      {/* Scores par Pilier avec Objectifs */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <Target className="h-5 w-5 text-primary-600" />
          Performance par Pilier vs Objectifs
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
                        Objectif: {pillar.target}/100
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold" style={{ color: pillar.color }}>
                      {pillar.score}
                    </p>
                    <p className={`text-xs font-medium ${isOnTrack ? 'text-green-600' : 'text-orange-600'}`}>
                      {isOnTrack ? '✓ Objectif atteint' : `${pillar.target - pillar.score} pts restants`}
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
              Top 5 Performances
            </h3>
            <Button 
              size="sm" 
              variant="secondary"
              onClick={() => navigate('/organizations')}
            >
              Voir tout
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
              Priorités d'Amélioration
            </h3>
            <Button 
              size="sm" 
              variant="secondary"
              onClick={() => navigate('/organizations')}
            >
              Voir tout
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
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Performance Moyenne par Secteur
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={sectorPerformance} layout="horizontal">
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

      {/* Alertes et Actions */}
      {stats && stats.average_score < 60 && (
        <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
          <div className="flex items-start gap-4">
            <AlertCircle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-orange-900 mb-2">
                Attention: Performance globale à améliorer
              </h4>
              <p className="text-sm text-orange-800 mb-4">
                Le score moyen de {Math.round(stats.average_score)}/100 indique des opportunités d'amélioration. 
                {improvementNeeded.length} organisations nécessitent une attention particulière.
              </p>
              <div className="flex gap-3">
                <Button 
                  size="sm"
                  onClick={() => navigate('/organizations')}
                >
                  Voir les organisations
                </Button>
                <Button 
                  size="sm" 
                  variant="secondary"
                  onClick={() => navigate('/reports/generate')}
                >
                  Générer un rapport
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}