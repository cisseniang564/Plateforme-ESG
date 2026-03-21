import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Upload, Database, CheckCircle, AlertCircle, Trash2, RefreshCw,
  ChevronRight, FileSpreadsheet, Wifi, Shield, TrendingUp,
  Clock, XCircle, BarChart3, Plus,
} from 'lucide-react';
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

function StatusChip({ status }: { status: string }) {
  const config: Record<string, { className: string; Icon: React.ElementType }> = {
    completed: { className: 'bg-emerald-100 text-emerald-700 border-emerald-200', Icon: CheckCircle },
    processing: { className: 'bg-blue-100 text-blue-700 border-blue-200', Icon: Clock },
    pending:    { className: 'bg-amber-100 text-amber-700 border-amber-200', Icon: Clock },
    failed:     { className: 'bg-red-100 text-red-700 border-red-200', Icon: XCircle },
  };
  const cfg = config[status] ?? { className: 'bg-gray-100 text-gray-600 border-gray-200', Icon: AlertCircle };
  const Icon = cfg.Icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.className}`}>
      <Icon size={11} />
      {status}
    </span>
  );
}

export default function DataManagement() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [stats, setStats] = useState<UploadStats>({ totalRecords: 0, validatedRecords: 0, pendingRecords: 0 });
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/data/uploads', { params: { page_size: 50 } });
      const items: UploadItem[] = response.data.items || [];
      setUploads(items);
      const totalRecords = items.reduce((sum, u) => sum + (u.total_rows || 0), 0);
      const validatedRecords = items.reduce((sum, u) => sum + (u.valid_rows || 0), 0);
      const pendingRecords = items.filter(u => u.status !== 'completed').reduce((sum, u) => sum + (u.total_rows || 0), 0);
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

  const validRate = stats.totalRecords > 0
    ? Math.round((stats.validatedRecords / stats.totalRecords) * 100)
    : 0;

  const quickLinks = [
    { icon: Upload, label: t('data.uploadData', 'Upload Data'), desc: t('data.uploadDataDesc', 'Import CSV/Excel files'), href: '/app/data/upload', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
    { icon: Wifi, label: t('data.connectorsTitle', 'Connectors'), desc: t('data.connectorsDesc', 'Connect external sources'), href: '/app/data/connectors', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
    { icon: Shield, label: t('data.qualityTitle', 'Data Quality'), desc: t('data.qualityDesc', 'Review validation metrics'), href: '/app/data/quality', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    { icon: BarChart3, label: t('data.myDataTitle', 'My Data'), desc: t('data.myDataDesc', 'View entered data'), href: '/app/my-data', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-900 to-cyan-700 p-8 text-white shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/15">
              <Database size={13} />
              {t('data.heroTag', 'ESG Data Hub')}
            </div>
            <h1 className="mt-4 flex items-center gap-3 text-3xl font-bold tracking-tight">
              <FileSpreadsheet className="h-8 w-8" />
              {t('data.title', 'Data Management')}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-white/80">
              {t('data.subtitle', 'Manage and monitor your ESG data uploads')}
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm text-white/70">
              <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/10">
                {uploads.length} {t('data.uploadFiles', 'files')}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/10">
                {stats.totalRecords.toLocaleString()} {t('data.rows', 'rows')}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/10">
                {validRate}% {t('data.valid', 'valid')}
              </span>
            </div>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <button
              onClick={loadData}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium px-4 py-2 rounded-xl transition-all"
            >
              <RefreshCw size={14} />
              {t('common.refresh', 'Refresh')}
            </button>
            <button
              onClick={() => navigate('/app/data/upload')}
              className="flex items-center gap-2 bg-white text-blue-900 hover:bg-white/90 text-sm font-semibold px-4 py-2 rounded-xl transition-all"
            >
              <Plus size={14} />
              {t('data.uploadData', 'Upload Data')}
            </button>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {quickLinks.map(link => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              to={link.href}
              className={`group flex items-center gap-3 rounded-2xl border p-4 transition-all hover:shadow-md hover:-translate-y-0.5 ${link.border} bg-white`}
            >
              <div className={`rounded-xl p-2.5 ${link.bg} flex-shrink-0`}>
                <Icon size={18} className={link.color} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">{link.label}</p>
                <p className="text-xs text-gray-500 truncate">{link.desc}</p>
              </div>
              <ChevronRight size={14} className="ml-auto text-gray-300 group-hover:text-gray-500 flex-shrink-0 transition-colors" />
            </Link>
          );
        })}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('data.totalRecords', 'Total Records')}</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalRecords.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">{uploads.length} {t('data.uploadFiles', 'files imported')}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl">
              <Database className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('data.validated', 'Validated')}</p>
              <p className="text-3xl font-bold text-emerald-600">{stats.validatedRecords.toLocaleString()}</p>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full">
                  <div className="h-1.5 bg-emerald-500 rounded-full" style={{ width: `${validRate}%` }} />
                </div>
                <span className="text-xs font-semibold text-emerald-600">{validRate}%</span>
              </div>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl">
              <CheckCircle className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('data.pendingReview', 'Pending Review')}</p>
              <p className="text-3xl font-bold text-amber-600">{stats.pendingRecords.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">
                {uploads.filter(u => u.status !== 'completed').length} {t('data.pendingFiles', 'files pending')}
              </p>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl">
              <AlertCircle className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Uploads Table */}
      <Card>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{t('data.recentUploads', 'Recent Uploads')}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{uploads.length} {t('data.filesTotal', 'files total')}</p>
          </div>
          <Link
            to="/app/data/upload"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Upload size={13} />
            {t('data.uploadData', 'Upload Data')}
          </Link>
        </div>

        {uploads.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{t('data.file', 'File')}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{t('common.status', 'Status')}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide text-right">{t('data.rows', 'Rows')}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{t('data.quality.completeness', 'Quality')}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide text-right">{t('data.size', 'Size')}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{t('common.date', 'Date')}</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {uploads.map(upload => {
                  const rate = upload.success_rate ?? 0;
                  const rateColor = rate >= 90 ? 'bg-emerald-500' : rate >= 70 ? 'bg-amber-500' : 'bg-red-500';
                  const rateText = rate >= 90 ? 'text-emerald-600' : rate >= 70 ? 'text-amber-600' : 'text-red-600';
                  return (
                    <tr key={upload.id} className="bg-white hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 max-w-[200px]">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet size={14} className="text-gray-400 flex-shrink-0" />
                          <span className="truncate font-medium text-gray-900">{upload.filename}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusChip status={upload.status} />
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 font-medium">
                        {(upload.total_rows || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        {upload.success_rate != null ? (
                          <div className="flex items-center gap-2 min-w-[90px]">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full">
                              <div className={`h-1.5 rounded-full ${rateColor}`} style={{ width: `${rate}%` }} />
                            </div>
                            <span className={`text-xs font-semibold w-9 text-right ${rateText}`}>{rate.toFixed(0)}%</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">{formatFileSize(upload.file_size)}</td>
                      <td className="px-4 py-3 text-gray-500">{new Date(upload.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDelete(upload.id)}
                          disabled={deletingId === upload.id}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                          title={t('common.delete', 'Delete')}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16">
            <Database className="h-14 w-14 mx-auto text-gray-200 mb-4" />
            <p className="text-lg font-semibold text-gray-900">{t('data.noUploads', 'No uploads yet')}</p>
            <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
              {t('data.uploadFirst', 'Upload your first ESG data file to get started')}
            </p>
            <Link
              to="/app/data/upload"
              className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
            >
              <Upload size={14} />
              {t('data.uploadData', 'Upload Data')}
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
