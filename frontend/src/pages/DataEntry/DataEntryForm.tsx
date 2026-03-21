import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Database,
  Plus,
  Save,
  Calendar,
  Building2,
  Leaf,
  Users,
  Scale,
  TrendingUp,
  FileText,
  CheckCircle,
  AlertCircle,
  Trash2,
  Edit,
  Download,
  Upload,
  X,
} from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Organization {
  id: string;
  name: string;
}

interface DataEntry {
  id: string;
  organization_id?: string;
  period_start: string;
  period_end: string;
  period_type: string;
  pillar: string;
  category: string;
  metric_name: string;
  value_numeric?: number;
  value_text?: string;
  unit?: string;
  data_source?: string;
  verification_status: string;
  notes?: string;
}

interface MetricTemplate {
  name: string;
  unit: string;
  description?: string;
}

const PILLARS = [
  { id: 'environmental', nameKey: 'dashboard.environmental', icon: Leaf, color: 'green' },
  { id: 'social', nameKey: 'dashboard.social', icon: Users, color: 'blue' },
  { id: 'governance', nameKey: 'dashboard.governance', icon: Scale, color: 'purple' },
];

export default function DataEntryForm() {
  const { t } = useTranslation();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [entries, setEntries] = useState<DataEntry[]>([]);
  const [templates, setTemplates] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedPillar, setSelectedPillar] = useState<string>('environmental');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedMetric, setSelectedMetric] = useState<MetricTemplate | null>(null);
  
  const [formData, setFormData] = useState({
    organization_id: '',
    period_start: new Date().getFullYear() + '-01-01',
    period_end: new Date().getFullYear() + '-12-31',
    period_type: 'annual',
    pillar: 'environmental',
    category: '',
    metric_name: '',
    value_numeric: '',
    unit: '',
    data_source: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load organizations
      const orgsRes = await api.get('/organizations');
      setOrganizations(orgsRes.data.items || []);
      
      // Load templates
      const templatesRes = await api.get('/data-entry/templates/metrics');
      setTemplates(templatesRes.data);
      
      // Load existing entries
      await loadEntries();
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error(t('dataEntry.loadingError'));
    } finally {
      setLoading(false);
    }
  };

  const loadEntries = async () => {
    try {
      const res = await api.get('/data-entry/');
      setEntries(res.data || []);
    } catch (error: any) {
      console.error('Error loading entries:', error);
    }
  };

  const handlePillarChange = (pillar: string) => {
    setSelectedPillar(pillar);
    setSelectedCategory('');
    setSelectedMetric(null);
    setFormData({
      ...formData,
      pillar,
      category: '',
      metric_name: '',
      unit: '',
    });
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setSelectedMetric(null);
    setFormData({
      ...formData,
      category,
      metric_name: '',
      unit: '',
    });
  };

  const handleMetricSelect = (metric: MetricTemplate) => {
    setSelectedMetric(metric);
    setFormData({
      ...formData,
      metric_name: metric.name,
      unit: metric.unit || '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        value_numeric: formData.value_numeric ? parseFloat(formData.value_numeric as any) : null,
        organization_id: formData.organization_id || null,
      };

      await api.post('/data-entry/', payload);
      toast.success(t('dataEntry.savedSuccess'));
      
      setShowModal(false);
      resetForm();
      await loadEntries();
    } catch (error: any) {
      console.error('Error saving entry:', error);
      toast.error(error.response?.data?.detail || t('dataEntry.saveError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette entrée ?')) return;
    
    try {
      await api.delete(`/data-entry/${id}`);
      toast.success(t('dataEntry.entryDeleted'));
      await loadEntries();
    } catch (error: any) {
      console.error('Error deleting entry:', error);
      toast.error(t('dataEntry.deleteError'));
    }
  };

  const resetForm = () => {
    setFormData({
      organization_id: '',
      period_start: new Date().getFullYear() + '-01-01',
      period_end: new Date().getFullYear() + '-12-31',
      period_type: 'annual',
      pillar: 'environmental',
      category: '',
      metric_name: '',
      value_numeric: '',
      unit: '',
      data_source: '',
      notes: '',
    });
    setSelectedPillar('environmental');
    setSelectedCategory('');
    setSelectedMetric(null);
  };

  const getPillarIcon = (pillar: string) => {
    const p = PILLARS.find(p => p.id === pillar);
    return p ? p.icon : Database;
  };

  const getPillarColor = (pillar: string) => {
    const p = PILLARS.find(p => p.id === pillar);
    return p ? p.color : 'gray';
  };

  const stats = {
    total: entries.length,
    byPillar: {
      environmental: entries.filter(e => e.pillar === 'environmental').length,
      social: entries.filter(e => e.pillar === 'social').length,
      governance: entries.filter(e => e.pillar === 'governance').length,
    },
    thisYear: entries.filter(e => e.period_start.startsWith(new Date().getFullYear().toString())).length,
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
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              <Database className="h-10 w-10" />
              {t('dataEntry.title')}
            </h1>
            <p className="text-emerald-100 text-lg">
              {t('dataEntry.subtitle')}
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={loadEntries}>
              <TrendingUp className="h-4 w-4 mr-2" />
              {t('dataEntry.refresh')}
            </Button>
            <Button variant="secondary" onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('dataEntry.newEntry')}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in">
        <Card className="border-l-4 border-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('dataEntry.totalEntries')}</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl">
              <Database className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('dashboard.environmental')}</p>
              <p className="text-3xl font-bold text-green-600">{stats.byPillar.environmental}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-xl">
              <Leaf className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('dashboard.social')}</p>
              <p className="text-3xl font-bold text-blue-600">{stats.byPillar.social}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('dashboard.governance')}</p>
              <p className="text-3xl font-bold text-purple-600">{stats.byPillar.governance}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-xl">
              <Scale className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Entries List */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">{t('dataEntry.entriesTitle')}</h2>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm">
              <Download className="h-4 w-4 mr-2" />
              {t('dataEntry.exportCsv')}
            </Button>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-16">
            <Database className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <p className="text-xl text-gray-900 font-semibold mb-2">
              {t('dataEntry.emptyTitle')}
            </p>
            <p className="text-gray-600 mb-6">
              {t('dataEntry.emptySubtitle')}
            </p>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="h-5 w-5 mr-2" />
              {t('dataEntry.newEntry')}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => {
              const Icon = getPillarIcon(entry.pillar);
              const color = getPillarColor(entry.pillar);
              
              return (
                <div
                  key={entry.id}
                  className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 bg-${color}-50 rounded-lg`}>
                          <Icon className={`h-5 w-5 text-${color}-600`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{entry.metric_name}</h3>
                          <p className="text-sm text-gray-600">
                            {entry.category} • {format(new Date(entry.period_start), 'dd MMM yyyy', { locale: fr })}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                        <div>
                          <p className="text-xs text-gray-600 mb-1">{t('dataEntry.value')}</p>
                          <p className="font-bold text-gray-900">
                            {entry.value_numeric !== null ? `${entry.value_numeric} ${entry.unit || ''}` : entry.value_text}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">{t('dataEntry.period')}</p>
                          <p className="text-sm text-gray-900">{entry.period_type === 'annual' ? t('dataEntry.annual') : entry.period_type}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">{t('dataEntry.status')}</p>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            entry.verification_status === 'verified'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {entry.verification_status === 'verified' ? t('dataEntry.verified') : t('dataEntry.pending')}
                          </span>
                        </div>
                        {entry.data_source && (
                          <div>
                            <p className="text-xs text-gray-600 mb-1">{t('dataEntry.source')}</p>
                            <p className="text-sm text-gray-900 truncate">{entry.data_source}</p>
                          </div>
                        )}
                      </div>

                      {entry.notes && (
                        <div className="mt-3 p-2 bg-gray-50 rounded text-sm text-gray-700">
                          {entry.notes}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 modal-backdrop">
          <div className="bg-white rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{t('dataEntry.modalTitle')}</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Step 1: Pillar Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  {t('dataEntry.stepPillar')}
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {PILLARS.map((pillar) => {
                    const Icon = pillar.icon;
                    return (
                      <button
                        key={pillar.id}
                        type="button"
                        onClick={() => handlePillarChange(pillar.id)}
                        className={`p-4 border-2 rounded-xl transition-all ${
                          selectedPillar === pillar.id
                            ? `border-${pillar.color}-500 bg-${pillar.color}-50`
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon className={`h-8 w-8 mx-auto mb-2 ${
                          selectedPillar === pillar.id ? `text-${pillar.color}-600` : 'text-gray-400'
                        }`} />
                        <p className={`text-sm font-medium ${
                          selectedPillar === pillar.id ? `text-${pillar.color}-900` : 'text-gray-600'
                        }`}>
                          {t(pillar.nameKey)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Category & Metric */}
              {selectedPillar && templates[selectedPillar] && (
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('dataEntry.stepCategory')}
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      required
                      disabled={submitting}
                    >
                      <option value="">{t('dataEntry.chooseCategory')}</option>
                      {Object.keys(templates[selectedPillar]).map((cat) => (
                        <option key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('dataEntry.stepIndicator')}
                    </label>
                    <select
                      value={selectedMetric?.name || ''}
                      onChange={(e) => {
                        const metric = templates[selectedPillar][selectedCategory]?.find(
                          (m: MetricTemplate) => m.name === e.target.value
                        );
                        if (metric) handleMetricSelect(metric);
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      required
                      disabled={!selectedCategory || submitting}
                    >
                      <option value="">{t('dataEntry.chooseIndicator')}</option>
                      {selectedCategory && templates[selectedPillar][selectedCategory]?.map((metric: MetricTemplate) => (
                        <option key={metric.name} value={metric.name}>
                          {metric.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Step 3: Value & Details */}
              {selectedMetric && (
                <>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('dataEntry.valueLabel')}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="any"
                          value={formData.value_numeric}
                          onChange={(e) => setFormData({ ...formData, value_numeric: e.target.value })}
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                          placeholder="0.00"
                          required
                          disabled={submitting}
                        />
                        <input
                          type="text"
                          value={formData.unit}
                          onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                          className="w-24 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                          placeholder={t('dataEntry.unitPlaceholder')}
                          disabled={submitting}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('dataEntry.organisation')}
                      </label>
                      <select
                        value={formData.organization_id}
                        onChange={(e) => setFormData({ ...formData, organization_id: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                        disabled={submitting}
                      >
                        <option value="">{t('dataEntry.allOrgs')}</option>
                        {organizations.map((org) => (
                          <option key={org.id} value={org.id}>
                            {org.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('dataEntry.periodStart')}
                      </label>
                      <input
                        type="date"
                        value={formData.period_start}
                        onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                        required
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('dataEntry.periodEnd')}
                      </label>
                      <input
                        type="date"
                        value={formData.period_end}
                        onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                        required
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('dataEntry.periodType')}
                      </label>
                      <select
                        value={formData.period_type}
                        onChange={(e) => setFormData({ ...formData, period_type: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                        disabled={submitting}
                      >
                        <option value="annual">{t('dataEntry.annual')}</option>
                        <option value="quarterly">{t('dataEntry.quarterly')}</option>
                        <option value="monthly">{t('dataEntry.monthly')}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('dataEntry.dataSource')}
                    </label>
                    <input
                      type="text"
                      value={formData.data_source}
                      onChange={(e) => setFormData({ ...formData, data_source: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      placeholder="Ex: Rapport annuel 2024, Système RH, etc."
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('dataEntry.notes')}
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      placeholder={t('dataEntry.notesPlaceholder')}
                      disabled={submitting}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button type="submit" className="flex-1" disabled={submitting}>
                      {submitting ? (
                        <>
                          <Spinner size="sm" className="mr-2" />
                          {t('dataEntry.saving')}
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          {t('dataEntry.save')}
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setShowModal(false);
                        resetForm();
                      }}
                      className="flex-1"
                      disabled={submitting}
                    >
                      {t('dataEntry.cancel')}
                    </Button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
