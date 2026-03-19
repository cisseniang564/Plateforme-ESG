import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, AlertCircle, XCircle, RefreshCw } from 'lucide-react';
import Card from '@/components/common/Card';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';

interface UploadItem {
  id: string;
  filename: string;
  status: string;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  success_rate: number;
  validation_errors?: Record<string, string[]>;
  created_at: string;
}

interface QualityMetric {
  name: string;
  score: number;
  status: 'good' | 'warning' | 'poor';
}

function getStatus(score: number): 'good' | 'warning' | 'poor' {
  if (score >= 85) return 'good';
  if (score >= 65) return 'warning';
  return 'poor';
}

export default function DataQuality() {
  const { t } = useTranslation();
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/data/uploads', { params: { page_size: 100 } });
      setUploads(response.data.items || []);
    } catch (error) {
      console.error('Error loading quality data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Compute quality metrics from real upload data
  const completedUploads = uploads.filter(u => u.total_rows > 0);
  const totalRows = completedUploads.reduce((s, u) => s + u.total_rows, 0);
  const validRows = completedUploads.reduce((s, u) => s + (u.valid_rows || 0), 0);
  const invalidRows = completedUploads.reduce((s, u) => s + (u.invalid_rows || 0), 0);
  const completedCount = uploads.filter(u => u.status === 'completed').length;

  const completenessScore = totalRows > 0 ? Math.round((validRows / totalRows) * 100) : 0;
  const accuracyScore = completedUploads.length > 0
    ? Math.round(completedUploads.reduce((s, u) => s + (u.success_rate || 0), 0) / completedUploads.length)
    : 0;
  const consistencyScore = uploads.length > 0
    ? Math.round((completedCount / uploads.length) * 100)
    : 0;

  const qualityMetrics: QualityMetric[] = [
    { name: t('data.quality.completeness', 'Completeness'), score: completenessScore, status: getStatus(completenessScore) },
    { name: t('data.quality.accuracy', 'Accuracy'), score: accuracyScore, status: getStatus(accuracyScore) },
    { name: t('data.quality.consistency', 'Consistency'), score: consistencyScore, status: getStatus(consistencyScore) },
    {
      name: t('data.quality.coverage', 'Coverage'),
      score: uploads.length > 0 ? Math.min(100, uploads.length * 10) : 0,
      status: getStatus(uploads.length > 0 ? Math.min(100, uploads.length * 10) : 0),
    },
  ];

  // Collect real issues from validation errors
  const issues: Array<{ type: 'error' | 'warning' | 'info'; message: string }> = [];

  if (invalidRows > 0) {
    issues.push({ type: 'warning', message: `${invalidRows.toLocaleString()} invalid rows detected across all uploads` });
  }

  uploads
    .filter(u => u.status === 'failed')
    .forEach(u => {
      issues.push({ type: 'error', message: `Upload failed: ${u.filename}` });
    });

  if (issues.length === 0 && uploads.length > 0) {
    issues.push({ type: 'info', message: t('data.quality.allGood', 'All data validation checks passed successfully') });
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('data.quality.title', 'Data Quality')}</h1>
          <p className="mt-2 text-gray-600">
            {t('data.quality.subtitle', 'Monitor and improve your ESG data quality')}
          </p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          {t('common.refresh', 'Refresh')}
        </button>
      </div>

      {uploads.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <CheckCircle className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">{t('data.quality.noData', 'No upload data available for quality analysis')}</p>
            <p className="text-sm text-gray-400 mt-2">
              {t('data.uploadFirst', 'Upload ESG data to see quality metrics')}
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* Quality Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {qualityMetrics.map(metric => (
              <Card key={metric.name}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">{metric.name}</h3>
                  {metric.status === 'good' && <CheckCircle className="h-5 w-5 text-green-600" />}
                  {metric.status === 'warning' && <AlertCircle className="h-5 w-5 text-yellow-500" />}
                  {metric.status === 'poor' && <XCircle className="h-5 w-5 text-red-500" />}
                </div>
                <p className={`text-3xl font-bold ${
                  metric.status === 'good' ? 'text-green-600' :
                  metric.status === 'warning' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {metric.score}%
                </p>
                <div className="w-full bg-gray-100 rounded-full h-2 mt-3">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      metric.status === 'good' ? 'bg-green-500' :
                      metric.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${metric.score}%` }}
                  />
                </div>
              </Card>
            ))}
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-700 font-bold text-lg">{uploads.length}</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('data.totalUploads', 'Total Uploads')}</p>
                <p className="text-sm font-semibold text-gray-900">{completedCount} completed</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-700 font-bold text-sm">{validRows.toLocaleString()}</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('data.validRows', 'Valid Rows')}</p>
                <p className="text-sm font-semibold text-gray-900">{totalRows.toLocaleString()} total</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <span className="text-red-700 font-bold text-sm">{invalidRows.toLocaleString()}</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('data.invalidRows', 'Invalid Rows')}</p>
                <p className="text-sm font-semibold text-gray-900">
                  {totalRows > 0 ? ((invalidRows / totalRows) * 100).toFixed(1) : 0}% error rate
                </p>
              </div>
            </div>
          </div>

          {/* Quality Issues */}
          {issues.length > 0 && (
            <Card title={t('data.quality.issues', 'Data Quality Issues')}>
              <div className="space-y-3">
                {issues.map((issue, i) => (
                  <div
                    key={i}
                    className={`p-4 rounded-lg border flex items-start gap-3 ${
                      issue.type === 'error'
                        ? 'bg-red-50 border-red-200'
                        : issue.type === 'warning'
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    {issue.type === 'error' && <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />}
                    {issue.type === 'warning' && <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />}
                    {issue.type === 'info' && <CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />}
                    <p className="text-sm text-gray-800">{issue.message}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
