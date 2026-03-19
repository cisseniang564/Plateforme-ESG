import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Upload, Database, CheckCircle, AlertCircle, Trash2, RefreshCw } from 'lucide-react';
import Card from '@/components/common/Card';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';

interface UploadItem {
  id: string;
  filename: string;
  file_size: number;
  status: string;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  success_rate: number;
  created_at: string;
}

interface UploadStats {
  totalRecords: number;
  validatedRecords: number;
  pendingRecords: number;
}

function formatFileSize(bytes: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  processing: 'bg-blue-100 text-blue-700',
  pending: 'bg-yellow-100 text-yellow-700',
  failed: 'bg-red-100 text-red-700',
};

export default function DataManagement() {
  const { t } = useTranslation();
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [stats, setStats] = useState<UploadStats>({ totalRecords: 0, validatedRecords: 0, pendingRecords: 0 });
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/data/uploads', { params: { page_size: 50 } });
      const items: UploadItem[] = response.data.items || [];
      setUploads(items);

      const totalRecords = items.reduce((sum, u) => sum + (u.total_rows || 0), 0);
      const validatedRecords = items.reduce((sum, u) => sum + (u.valid_rows || 0), 0);
      const pendingRecords = items
        .filter(u => u.status !== 'completed')
        .reduce((sum, u) => sum + (u.total_rows || 0), 0);

      setStats({ totalRecords, validatedRecords, pendingRecords });
    } catch (error) {
      console.error('Error loading uploads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('data.confirmDelete', 'Delete this upload record?'))) return;
    setDeletingId(id);
    try {
      await api.delete(`/data/uploads/${id}`);
      await loadData();
    } catch (error) {
      console.error('Error deleting upload:', error);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('data.title', 'Data Management')}</h1>
          <p className="mt-2 text-gray-600">{t('data.subtitle', 'Manage and monitor your ESG data uploads')}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            {t('common.refresh', 'Refresh')}
          </button>
          <Link
            to="/data/upload"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Upload className="h-4 w-4" />
            {t('data.uploadData', 'Upload Data')}
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Database className="h-7 w-7 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('data.totalRecords', 'Total Records')}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalRecords.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <CheckCircle className="h-7 w-7 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('data.validated', 'Validated')}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.validatedRecords.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-100 rounded-xl">
              <AlertCircle className="h-7 w-7 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('data.pendingReview', 'Pending Review')}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingRecords.toLocaleString()}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Uploads Table */}
      <Card title={t('data.recentUploads', 'Recent Uploads')}>
        {uploads.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('data.file', 'File')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('common.status', 'Status')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('data.rows', 'Rows')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('data.valid', 'Valid')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('data.size', 'Size')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('common.date', 'Date')}
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {uploads.map(upload => (
                  <tr key={upload.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 max-w-xs truncate">
                      {upload.filename}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                          STATUS_STYLES[upload.status] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {upload.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">
                      {(upload.total_rows || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {upload.success_rate != null ? (
                        <span
                          className={
                            upload.success_rate >= 90
                              ? 'text-green-600 font-medium'
                              : upload.success_rate >= 70
                              ? 'text-yellow-600 font-medium'
                              : 'text-red-600 font-medium'
                          }
                        >
                          {upload.success_rate.toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-500">
                      {formatFileSize(upload.file_size)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(upload.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(upload.id)}
                        disabled={deletingId === upload.id}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                        title={t('common.delete', 'Delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16">
            <Database className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">{t('data.noUploads', 'No uploads yet')}</p>
            <p className="text-sm text-gray-400 mt-2">
              {t('data.uploadFirst', 'Upload your first ESG data file to get started')}
            </p>
            <Link
              to="/data/upload"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Upload className="h-4 w-4" />
              {t('data.uploadData', 'Upload Data')}
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
