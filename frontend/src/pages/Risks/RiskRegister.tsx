import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Plus,
  Download,
  RefreshCw,
  Shield,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  Calendar,
  User,
  Target,
  Activity,
  X,
} from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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

export default function RiskRegister() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [risks, setRisks] = useState<ESGRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<ESGRisk | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
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

  useEffect(() => {
    loadRisks();
  }, []);

  const loadRisks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/materiality/risks');
      setRisks(res.data || []);
    } catch (error: any) {
      console.error('Error loading risks:', error);
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
      console.error('Error saving risk:', error);
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
      console.error('Error deleting risk:', error);
      toast.error(error.response?.data?.detail || t('risks.deleteError'));
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'environmental',
      probability: 3,
      impact: 3,
      mitigation_plan: '',
      responsible_person: '',
      target_date: ''
    });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedRisk(null);
    resetForm();
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      critical: 'bg-red-100 text-red-800 border-red-300',
      high: 'bg-orange-100 text-orange-800 border-orange-300',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      low: 'bg-green-100 text-green-800 border-green-300'
    };
    return colors[severity as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-red-100 text-red-800',
      mitigated: 'bg-blue-100 text-blue-800',
      closed: 'bg-green-100 text-green-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      environmental: '🌿',
      social: '👥',
      governance: '⚖️'
    };
    return icons[category as keyof typeof icons] || '📊';
  };

  const filteredRisks = risks.filter(risk => {
    const categoryMatch = filterCategory === 'all' || risk.category === filterCategory;
    const severityMatch = filterSeverity === 'all' || risk.severity === filterSeverity;
    return categoryMatch && severityMatch;
  });

  const stats = {
    total: risks.length,
    critical: risks.filter(r => r.severity === 'critical').length,
    active: risks.filter(r => r.status === 'active').length,
    mitigated: risks.filter(r => r.status === 'mitigated' || r.status === 'closed').length,
    avg_score: risks.length > 0
      ? Math.round(risks.reduce((sum, r) => sum + r.risk_score, 0) / risks.length)
      : 0
  };

  // Heatmap data (5x5 matrix)
  const heatmapData = Array.from({ length: 5 }, (_, i) =>
    Array.from({ length: 5 }, (_, j) => {
      const prob = i + 1;
      const imp = j + 1;
      const count = risks.filter(r => r.probability === prob && r.impact === imp).length;
      const score = prob * imp;
      return { prob, imp, count, score };
    })
  );

  const getHeatmapColor = (score: number) => {
    if (score >= 20) return 'bg-red-600';
    if (score >= 12) return 'bg-orange-500';
    if (score >= 6) return 'bg-yellow-400';
    return 'bg-green-400';
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
      {/* Header */}
      <div className="bg-gradient-to-br from-red-600 to-orange-700 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              <Shield className="h-10 w-10" />
              {t('risks.title')}
            </h1>
            <p className="text-red-100 text-lg">
              {t('risks.subtitle')}
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={loadRisks} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {t('risks.refresh')}
            </Button>
            <Button variant="secondary" onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('risks.newRisk')}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('risks.totalRisks')}</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-xl">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-red-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('risks.critical')}</p>
              <p className="text-3xl font-bold text-red-700">{stats.critical}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-xl">
              <XCircle className="h-6 w-6 text-red-700" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('risks.active')}</p>
              <p className="text-3xl font-bold text-orange-600">{stats.active}</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-xl">
              <Activity className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('risks.mitigated')}</p>
              <p className="text-3xl font-bold text-green-600">{stats.mitigated}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-xl">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('risks.avgScore')}</p>
              <p className="text-3xl font-bold text-purple-600">{stats.avg_score}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-xl">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Heatmap */}
      <Card>
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          {t('risks.heatmap')}
        </h2>

        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <div className="flex gap-2">
              {/* Y-axis label */}
              <div className="flex flex-col justify-center items-end pr-4">
                <div className="transform -rotate-90 whitespace-nowrap">
                  <p className="text-sm font-bold text-gray-700">{t('risks.probabilityAxis')}</p>
                </div>
              </div>

              {/* Grid */}
              <div>
                {/* Heatmap grid */}
                <div className="grid grid-rows-5 gap-2">
                  {[5, 4, 3, 2, 1].map((prob, i) => (
                    <div key={prob} className="grid grid-cols-5 gap-2">
                      {[1, 2, 3, 4, 5].map((imp, j) => {
                        const cell = heatmapData[prob - 1][imp - 1];
                        return (
                          <div
                            key={`${prob}-${imp}`}
                            className={`
                              h-20 w-20 rounded-lg
                              ${getHeatmapColor(cell.score)}
                              flex flex-col items-center justify-center
                              text-white font-bold
                              cursor-pointer
                              transition-all duration-200
                              hover:scale-110 hover:shadow-xl
                              ${cell.count > 0 ? 'ring-4 ring-white' : ''}
                            `}
                          >
                            <span className="text-2xl">{cell.count || ''}</span>
                            <span className="text-xs opacity-75">{cell.score}</span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* X-axis labels */}
                <div className="grid grid-cols-5 gap-2 mt-2">
                  {[1, 2, 3, 4, 5].map(imp => (
                    <div key={imp} className="h-8 w-20 flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-600">{imp}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* X-axis label */}
            <div className="text-center mt-4">
              <p className="text-sm font-bold text-gray-700">{t('risks.impactAxis')}</p>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 flex items-center gap-6 justify-center">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-400 rounded" />
            <span className="text-xs text-gray-600">{t('risks.legendLow')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-yellow-400 rounded" />
            <span className="text-xs text-gray-600">{t('risks.legendMedium')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-orange-500 rounded" />
            <span className="text-xs text-gray-600">{t('risks.legendHigh')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-red-600 rounded" />
            <span className="text-xs text-gray-600">{t('risks.legendCritical')}</span>
          </div>
        </div>
      </Card>

      {/* Filters */}
      <Card>
        <div className="flex gap-4 items-center flex-wrap">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('risks.categoryLabel')}</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
            >
              <option value="all">{t('risks.allCategories')}</option>
              <option value="environmental">{t('risks.categoryEnv')}</option>
              <option value="social">{t('risks.categorySocial')}</option>
              <option value="governance">{t('risks.categoryGov')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('risks.severityLabel')}</label>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
            >
              <option value="all">{t('risks.allSeverities')}</option>
              <option value="critical">{t('risks.severityCritical')}</option>
              <option value="high">{t('risks.severityHigh')}</option>
              <option value="medium">{t('risks.severityMedium')}</option>
              <option value="low">{t('risks.severityLow')}</option>
            </select>
          </div>

          <div className="ml-auto">
            <p className="text-sm text-gray-600 mb-2">&nbsp;</p>
            <p className="text-lg font-bold text-gray-900">
              {t('risks.risksCount', { count: filteredRisks.length })}
            </p>
          </div>
        </div>
      </Card>

      {/* Risk List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredRisks.map((risk) => (
          <Card key={risk.id} className={`border-l-4 ${getSeverityColor(risk.severity).includes('red') ? 'border-red-500' : getSeverityColor(risk.severity).includes('orange') ? 'border-orange-500' : getSeverityColor(risk.severity).includes('yellow') ? 'border-yellow-500' : 'border-green-500'}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <span className="text-2xl">{getCategoryIcon(risk.category)}</span>
                  <h3 className="text-lg font-bold text-gray-900">{risk.title}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${getSeverityColor(risk.severity)}`}>
                    {risk.severity.toUpperCase()}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(risk.status)}`}>
                    {risk.status === 'active' ? t('risks.statusActive') : risk.status === 'mitigated' ? t('risks.statusMitigated') : t('risks.statusClosed')}
                  </span>
                </div>

                {risk.description && (
                  <p className="text-gray-600 mb-4">{risk.description}</p>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">{t('risks.probability')}</p>
                    <p className="text-xl font-bold text-gray-900">{risk.probability}/5</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">{t('risks.impact')}</p>
                    <p className="text-xl font-bold text-gray-900">{risk.impact}/5</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">{t('risks.riskScore')}</p>
                    <p className="text-xl font-bold text-red-600">{risk.risk_score}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">{t('risks.categoryField')}</p>
                    <p className="text-sm font-medium text-gray-900 capitalize">{risk.category}</p>
                  </div>
                </div>

                {risk.mitigation_plan && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                    <p className="text-xs font-medium text-blue-900 mb-1 flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      {t('risks.mitigationPlan')}
                    </p>
                    <p className="text-sm text-blue-800">{risk.mitigation_plan}</p>
                  </div>
                )}

                <div className="flex items-center gap-6 text-sm text-gray-600 flex-wrap">
                  {risk.responsible_person && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{risk.responsible_person}</span>
                    </div>
                  )}
                  {risk.target_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{t('risks.deadline')} {format(new Date(risk.target_date), 'dd MMM yyyy', { locale: fr })}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{t('risks.updatedAt')} {format(new Date(risk.updated_at), 'dd MMM yyyy', { locale: fr })}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => handleEdit(risk)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleDelete(risk.id, risk.title)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredRisks.length === 0 && (
        <Card>
          <div className="text-center py-16">
            <Shield className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <p className="text-xl text-gray-900 font-semibold mb-2">
              {t('risks.noRisksFound')}
            </p>
            <p className="text-gray-600 mb-6">
              {filterCategory !== 'all' || filterSeverity !== 'all'
                ? t('risks.tryChangeFilters')
                : t('risks.createFirst')}
            </p>
            {filterCategory === 'all' && filterSeverity === 'all' && (
              <Button onClick={() => setShowModal(true)}>
                <Plus className="h-5 w-5 mr-2" />
                {t('risks.newRisk')}
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedRisk ? t('risks.editTitle') : t('risks.newTitle')}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('risks.riskTitleField')}
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder={t('risks.riskTitlePlaceholder')}
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('risks.descriptionField')}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder={t('risks.descriptionPlaceholder')}
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('risks.categoryRequired')}
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  disabled={submitting}
                >
                  <option value="environmental">{t('risks.categoryEnv')}</option>
                  <option value="social">{t('risks.categorySocial')}</option>
                  <option value="governance">{t('risks.categoryGov')}</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('risks.probabilitySlider', { value: formData.probability })}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={formData.probability}
                    onChange={(e) => setFormData({...formData, probability: Number(e.target.value)})}
                    className="w-full"
                    disabled={submitting}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{t('risks.veryLow')}</span>
                    <span>{t('risks.veryHigh')}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('risks.impactSlider', { value: formData.impact })}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={formData.impact}
                    onChange={(e) => setFormData({...formData, impact: Number(e.target.value)})}
                    className="w-full"
                    disabled={submitting}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{t('risks.veryLow')}</span>
                    <span>{t('risks.veryHighImpact')}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-100 rounded-lg">
                <p className="text-sm font-medium text-gray-700">
                  {t('risks.riskScoreDisplay')} <span className="text-xl font-bold text-red-600">{formData.probability * formData.impact}</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('risks.mitigationField')}
                </label>
                <textarea
                  value={formData.mitigation_plan}
                  onChange={(e) => setFormData({...formData, mitigation_plan: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder={t('risks.mitigationPlaceholder')}
                  disabled={submitting}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('risks.responsibleField')}
                  </label>
                  <input
                    type="text"
                    value={formData.responsible_person}
                    onChange={(e) => setFormData({...formData, responsible_person: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder={t('risks.responsiblePlaceholder')}
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('risks.targetDate')}
                  </label>
                  <input
                    type="date"
                    value={formData.target_date}
                    onChange={(e) => setFormData({...formData, target_date: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      {selectedRisk ? t('risks.updating') : t('risks.creating')}
                    </>
                  ) : (
                    selectedRisk ? t('risks.update') : t('risks.create')
                  )}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCloseModal}
                  className="flex-1"
                  disabled={submitting}
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
