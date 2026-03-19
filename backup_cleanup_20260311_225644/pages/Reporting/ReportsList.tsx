import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Download, Eye, FileText, Plus, RefreshCw } from 'lucide-react';
import Card from '@/components/common/Card';
import Spinner from '@/components/common/Spinner';
import reportsService from '@/services/reportsService';

interface Report {
  id: string;
  name?: string;
  title?: string;
  report_type?: string;
  type?: string;
  format?: string;
  created_at?: string;
  generated_at?: string;
  status?: string;
}

const TYPE_STYLES: Record<string, string> = {
  executive: 'bg-purple-100 text-purple-700',
  detailed: 'bg-blue-100 text-blue-700',
  regulatory: 'bg-orange-100 text-orange-700',
  standard: 'bg-gray-100 text-gray-700',
};

export default function ReportsList() {
  const { t } = useTranslation();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await reportsService.getReports();
      const items = Array.isArray(data) ? data : data?.items || data?.reports || [];
      setReports(items);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (reportId: string, name: string) => {
    try {
      let blob = await reportsService.downloadReport(reportId);

      // If backend mistakenly returns text/plain, force PDF blob
      if (blob.type === 'text/plain' || blob.type === '') {
        blob = new Blob([blob], { type: 'application/pdf' });
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (name || `report-${reportId}`).replace(/\s+/g, '-');
      a.download = `${safeName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
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
          <h1 className="text-3xl font-bold text-gray-900">{t('reports.title', 'Reports')}</h1>
          <p className="mt-2 text-gray-600">
            {t('reports.subtitle', 'View and download your ESG reports')}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadReports}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            {t('common.refresh', 'Refresh')}
          </button>
          <Link
            to="/reports/generate"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            {t('reports.generate', 'Generate Report')}
          </Link>
        </div>
      </div>

      <Card>
        {reports.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('reports.reportName', 'Report Name')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('reports.type', 'Type')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('common.date', 'Date')}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('common.status', 'Status')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('common.actions', 'Actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reports.map(report => {
                  const name = report.name || report.title || `Report ${report.id.slice(0, 8)}`;
                  const type = (report.report_type || report.type || 'standard').toLowerCase();
                  const date = report.created_at || report.generated_at;
                  return (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{name}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${TYPE_STYLES[type] || TYPE_STYLES.standard}`}>
                          {type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {date ? new Date(date).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {report.status && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 capitalize">
                            {report.status}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                            title={t('common.view', 'View')}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDownload(report.id, name)}
                            className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                            title={t('common.download', 'Download')}
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16">
            <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">
              {t('reports.noReports', 'No reports generated yet')}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              {t('reports.generateFirst', 'Generate your first ESG report to see it here')}
            </p>
            <Link
              to="/reports/generate"
              className="inline-flex items-center gap-2 mt-5 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              {t('reports.generate', 'Generate Report')}
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
