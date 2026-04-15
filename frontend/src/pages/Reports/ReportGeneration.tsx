import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Download, Eye, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import BackButton from '@/components/common/BackButton';
import api from '@/services/api';
import toast from 'react-hot-toast';

interface ReportType {
  id: string;
  name: string;
  description: string;
  icon: string;
}

const REPORT_TYPES: ReportType[] = [
  { id: 'executive', name: 'executive', description: 'executive_desc', icon: '' },
  { id: 'detailed', name: 'detailed', description: 'detailed_desc', icon: '' },
  { id: 'csrd', name: 'csrd', description: 'csrd_desc', icon: '' },
  { id: 'gri', name: 'gri', description: 'gri_desc', icon: '' },
  { id: 'tcfd', name: 'tcfd', description: 'tcfd_desc', icon: '' },
];

export default function ReportGeneration() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState('executive');
  const [period, setPeriod] = useState('annual');
  const [year, setYear] = useState(new Date().getFullYear());
  const [format, setFormat] = useState('pdf');
  const [generating, setGenerating] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  const getTypeName = (id: string) => {
    const map: Record<string, string> = {
      executive: t('reporting.typeExecutive'),
      detailed: t('reporting.typeDetailed'),
      csrd: t('reporting.typeCSRD'),
      gri: t('reporting.typeGRI'),
      tcfd: t('reporting.typeTCFD'),
    };
    return map[id] || id;
  };

  const getTypeDesc = (id: string) => {
    const map: Record<string, string> = {
      executive: t('reporting.typeExecutiveDesc'),
      detailed: t('reporting.typeDetailedDesc'),
      csrd: t('reporting.typeCSRDDesc'),
      gri: t('reporting.typeGRIDesc'),
      tcfd: t('reporting.typeTCFDDesc'),
    };
    return map[id] || id;
  };

  const getTypeIcon = (id: string) => {
    const map: Record<string, string> = {
      executive: '',
      detailed: '',
      csrd: '',
      gri: '',
      tcfd: '',
    };
    return map[id] || '';
  };

  const handlePreview = async () => {
    setPreviewing(true);
    try {
      const response = await api.get(`/reports/preview/${selectedType}?year=${year}`);
      setPreviewData(response.data);
    } catch (err: any) {
      console.error('Preview error:', err);
      // Return empty but valid structure so UI shows "0 données"
      setPreviewData({
        report_type: selectedType,
        year,
        data_points: { environmental: 0, social: 0, governance: 0 },
        stats: { total_entries: 0 },
        data_available: false,
      });
    } finally {
      setPreviewing(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const response = await api.post('/reports/generate', {
        report_type: selectedType,
        period,
        year,
        format,
      }, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], {
        type: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rapport_${selectedType}_${year}.${format}`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success(t('reporting.generateSuccess'));
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(t('reporting.generateError'));
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    handlePreview();
  }, [selectedType, year]);

  const selectedReport = REPORT_TYPES.find(r => r.id === selectedType);

  return (
    <div className="space-y-6">
      <BackButton to="/app/reports" label="Rapports" />
      {/* Header */}
      <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center gap-4">
          <FileText className="h-12 w-12" />
          <div>
            <h1 className="text-4xl font-bold mb-2">{t('reporting.title')}</h1>
            <p className="text-green-100 text-lg">
              {t('reporting.subtitleShort')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Report Type */}
          <Card>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-600" />
              {t('reporting.reportType')}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {REPORT_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    selectedType === type.id
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-green-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{getTypeIcon(type.id)}</span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{getTypeName(type.id)}</h3>
                      <p className="text-sm text-gray-600">{getTypeDesc(type.id)}</p>
                    </div>
                    {selectedType === type.id && (
                      <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Configuration */}
          <Card>
            <h2 className="text-xl font-bold text-gray-900 mb-4">{t('reporting.configuration')}</h2>

            <div className="space-y-4">
              {/* Reporting Period */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('reporting.reportingPeriod')}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['monthly', 'quarterly', 'annual', 'custom'].map((p) => (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        period === p
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {p === 'monthly' ? t('reporting.monthly') :
                       p === 'quarterly' ? t('reporting.quarterly') :
                       p === 'annual' ? t('reporting.yearly') : t('reporting.custom')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Year */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('reporting.year')}
                </label>
                <select
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  {[2024, 2025, 2026].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {/* Output Format */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('reporting.outputFormat')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['pdf', 'excel', 'word'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setFormat(f)}
                      disabled={f !== 'pdf'}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        format === f
                          ? 'bg-green-600 text-white'
                          : f === 'pdf'
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
                {format !== 'pdf' && (
                  <p className="text-xs text-gray-500 mt-2">
                    {t('reporting.excelWordSoon')}
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Preview */}
        <div className="space-y-6">
          <Card>
            <h2 className="text-xl font-bold text-gray-900 mb-4">{t('reporting.reportPreview')}</h2>

            {selectedReport && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('reporting.type')}:</p>
                  <p className="text-lg font-bold text-gray-900">{getTypeName(selectedReport.id)}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">{t('reporting.format')}:</p>
                  <p className="text-lg font-bold text-gray-900">{format.toUpperCase()}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">{t('reporting.period')}:</p>
                  <p className="text-lg font-bold text-gray-900">
                    {period === 'annual' ? t('reporting.yearly') :
                     period === 'monthly' ? t('reporting.monthly') : t('reporting.quarterly')} - {year}
                  </p>
                </div>

                {previewData && (
                  <>
                    <hr className="my-4" />
                    {previewData.data_available === false && previewData.stats.total_entries === 0 ? (
                      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                        <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-amber-800">{t('reporting.noDataTitle') || 'Aucune donnée pour cette période'}</p>
                          <p className="text-xs text-amber-600 mt-0.5">{t('reporting.noDataHint') || 'Saisissez des données dans "Saisie de données" puis relancez l\'aperçu.'}</p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-2">{t('reporting.includedData')}:</p>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>{t('reporting.environmental')}</span>
                            <span className="font-semibold">{previewData.data_points.environmental}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>{t('reporting.social')}</span>
                            <span className="font-semibold">{previewData.data_points.social}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>{t('reporting.governance')}</span>
                            <span className="font-semibold">{previewData.data_points.governance}</span>
                          </div>
                          <hr />
                          <div className="flex justify-between font-bold">
                            <span>{t('common.total')}</span>
                            <span>{previewData.stats.total_entries}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="space-y-3 mt-6">
              <Button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full"
              >
                {generating ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    {t('reporting.generating')}
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    {t('reporting.generateReportBtn')}
                  </>
                )}
              </Button>

              <Button
                onClick={handlePreview}
                disabled={previewing}
                variant="secondary"
                className="w-full"
              >
                {previewing ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    {t('common.loading')}
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    {t('reporting.preview')}
                  </>
                )}
              </Button>

              <Button
                onClick={() => navigate('/app/reports')}
                variant="secondary"
                className="w-full"
              >
                <FileText className="h-4 w-4 mr-2" />
                {t('reporting.viewReports')}
              </Button>
            </div>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-blue-900 mb-1">{t('reporting.complianceTitle')}</p>
                <p className="text-sm text-blue-700">
                  {t('reporting.complianceDesc')}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
