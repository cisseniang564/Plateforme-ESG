import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Award,
  Calendar,
  Download,
  Share2,
  AlertCircle,
  CheckCircle,
  Activity,
  BarChart3,
  Zap,
  Target,
  Users
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import { format } from 'date-fns';
import { generateConsistentScores, generateEvolutionData, generateRadarData } from '@/utils/mockScores';

interface Organization {
  id: string;
  name: string;
  external_id?: string;
  industry?: string;
  type?: string;
  created_at?: string;
}

export default function OrganizationDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scoreData, setScoreData] = useState<any>(null);

  useEffect(() => {
    if (id) {
      loadOrganization();
    }
  }, [id]);

  const loadOrganization = async () => {
    setLoading(true);
    setError(null);

    try {
      let orgData = null;

      try {
        const res = await api.get(`/organizations/${id}`);
        orgData = res.data;
      } catch (err: any) {
        const listRes = await api.get('/organizations');
        const orgs = listRes.data?.organizations || listRes.data?.items || [];
        orgData = orgs.find((o: any) => o.id === id);

        if (!orgData) {
          throw new Error('Organisation not found in list');
        }
      }

      setOrganization(orgData);

      if (id) {
        const scores = generateConsistentScores(id);
        const evolution = generateEvolutionData(id, 12);
        const radar = generateRadarData(id);

        const distributionData = [
          { name: t('orgDetail.excellent'), value: 3, color: '#10b981' },
          { name: t('orgDetail.good'), value: 4, color: '#3b82f6' },
          { name: t('orgDetail.average'), value: 2, color: '#f59e0b' },
          { name: t('orgDetail.weak'), value: 1, color: '#ef4444' }
        ];

        const sectorComparison = [
          { name: orgData.name.substring(0, 15), score: scores.overall },
          { name: t('orgDetail.sectorAvg'), score: Math.round(scores.overall - 5) },
          { name: t('orgDetail.sectorBest'), score: Math.round(scores.overall + 10) }
        ];

        setScoreData({
          current: scores,
          evolution: evolution,
          radar: radar,
          distribution: distributionData,
          sectorComparison: sectorComparison
        });
      }

    } catch (error: any) {
      console.error('Error loading organization:', error);
      setError(error.message || t('orgDetail.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const getRatingColor = (rating: string) => {
    if (rating?.startsWith('A')) return 'bg-green-100 text-green-800 border-green-200';
    if (rating?.startsWith('B')) return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-orange-100 text-orange-800 border-orange-200';
  };

  const getPerformanceLabel = (score: number) => {
    if (score >= 70) return t('orgDetail.excellent');
    if (score >= 50) return t('orgDetail.good');
    return t('orgDetail.toImprove');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !organization) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <p className="text-xl text-gray-900 font-semibold mb-2">{t('orgDetail.notFound')}</p>
        <p className="text-gray-600 mb-4">{error || 'ID: ' + id}</p>
        <Button onClick={() => navigate('/organizations')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('orgDetail.backToList')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="secondary"
            onClick={() => navigate('/organizations')}
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('common.back')}
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Building2 className="h-8 w-8 text-primary-600" />
              {organization.name}
            </h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
              {organization.industry && (
                <span className="flex items-center gap-1">
                  <BarChart3 className="h-4 w-4" />
                  {organization.industry}
                </span>
              )}
              {organization.external_id && (
                <span className="flex items-center gap-1">
                  <Award className="h-4 w-4" />
                  {organization.external_id}
                </span>
              )}
              {organization.created_at && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {t('orgDetail.trackedSince')} {format(new Date(organization.created_at), 'MMM yyyy')}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary">
            <Share2 className="h-4 w-4 mr-2" />
            {t('orgDetail.share')}
          </Button>
          <Button variant="secondary">
            <Download className="h-4 w-4 mr-2" />
            {t('common.export')}
          </Button>
        </div>
      </div>

      {/* Score Global */}
      {scoreData && (
        <>
          <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-8 text-white shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <Award className="h-8 w-8" />
                  <h2 className="text-2xl font-bold">{t('orgDetail.globalEsgScore')}</h2>
                </div>
                <div className="flex items-end gap-4">
                  <div className="text-7xl font-bold">
                    {scoreData.current.overall}
                  </div>
                  <div className="mb-4">
                    <div className={`px-4 py-2 rounded-lg text-xl font-bold border-2 ${getRatingColor(scoreData.current.rating)}`}>
                      {scoreData.current.rating}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  {scoreData.current.trend > 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-300" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-300" />
                  )}
                  <span className="text-lg font-semibold">
                    {scoreData.current.trend > 0 ? '+' : ''}{scoreData.current.trend.toFixed(1)}%
                  </span>
                  <span className="text-white/80">{t('orgDetail.vsPrevPeriod')}</span>
                </div>
              </div>

              <div className="text-right">
                <p className="text-white/80 text-sm mb-2">{t('orgDetail.lastUpdate')}</p>
                <p className="text-lg font-medium">{format(new Date(), 'dd/MM/yyyy')}</p>
              </div>
            </div>
          </div>

          {/* Scores by Pillar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-green-700 font-medium mb-1">{t('orgDetail.environmental')}</p>
                  <p className="text-4xl font-bold text-green-900">{scoreData.current.environmental}</p>
                  <p className="text-sm text-green-600 mt-2">
                    {getPerformanceLabel(scoreData.current.environmental)}
                  </p>
                </div>
                <Target className="h-10 w-10 text-green-600 opacity-50" />
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-blue-700 font-medium mb-1">{t('orgDetail.social')}</p>
                  <p className="text-4xl font-bold text-blue-900">{scoreData.current.social}</p>
                  <p className="text-sm text-blue-600 mt-2">
                    {getPerformanceLabel(scoreData.current.social)}
                  </p>
                </div>
                <Users className="h-10 w-10 text-blue-600 opacity-50" />
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-purple-700 font-medium mb-1">{t('orgDetail.governance')}</p>
                  <p className="text-4xl font-bold text-purple-900">{scoreData.current.governance}</p>
                  <p className="text-sm text-purple-600 mt-2">
                    {getPerformanceLabel(scoreData.current.governance)}
                  </p>
                </div>
                <CheckCircle className="h-10 w-10 text-purple-600 opacity-50" />
              </div>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="col-span-1 lg:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary-600" />
                {t('orgDetail.scoreEvolution')}
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={scoreData.evolution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="overall" stroke="#6366f1" strokeWidth={3} name={t('orgDetail.globalScore')} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="environmental" stroke="#10b981" strokeWidth={2} name={t('orgDetail.environmental')} />
                  <Line type="monotone" dataKey="social" stroke="#3b82f6" strokeWidth={2} name={t('orgDetail.social')} />
                  <Line type="monotone" dataKey="governance" stroke="#8b5cf6" strokeWidth={2} name={t('orgDetail.governance')} />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('orgDetail.performanceByIndicator')}</h3>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={scoreData.radar}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="subject" style={{ fontSize: '11px' }} />
                  <PolarRadiusAxis domain={[0, 100]} style={{ fontSize: '10px' }} />
                  <Radar name={t('orgDetail.score')} dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.6} strokeWidth={2} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('orgDetail.sectorComparison')}</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={scoreData.sectorComparison} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="name" type="category" width={120} style={{ fontSize: '12px' }} />
                  <Tooltip />
                  <Bar dataKey="score" radius={[0, 8, 8, 0]}>
                    {scoreData.sectorComparison.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#6366f1' : index === 1 ? '#94a3b8' : '#10b981'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="col-span-1 lg:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('orgDetail.performanceDistribution')}</h3>
              <div className="flex items-center gap-8">
                <ResponsiveContainer width="40%" height={250}>
                  <PieChart>
                    <Pie
                      data={scoreData.distribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {scoreData.distribution.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                <div className="flex-1 space-y-3">
                  {scoreData.distribution.map((item: any) => (
                    <div key={item.name} className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm font-medium text-gray-700">{item.name}</span>
                      <span className="text-sm text-gray-500">({item.value} {t('orgDetail.indicators')})</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* Recommendations */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-orange-600" />
              {t('orgDetail.improvementRecs')}
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-orange-900">{t('orgDetail.highPriority')}</p>
                  <p className="text-sm text-orange-700 mt-1">
                    {t('orgDetail.highPriorityDesc')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">{t('orgDetail.mediumPriority')}</p>
                  <p className="text-sm text-blue-700 mt-1">
                    {t('orgDetail.mediumPriorityDesc')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900">{t('orgDetail.strength')}</p>
                  <p className="text-sm text-green-700 mt-1">
                    {t('orgDetail.strengthDesc')}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
