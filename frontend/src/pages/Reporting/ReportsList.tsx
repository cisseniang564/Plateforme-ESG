import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Download, Eye, FileText, Plus, RefreshCw } from 'lucide-react';
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
      const items = await reportsService.getReports();
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
      <div className="space-y-6 animate-fade-in">
        <div className="skeleton h-40 rounded-2xl" />
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ─── Hero ───────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl shadow-xl" style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 40%, #065f46 100%)' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 80% 15%, rgba(255,255,255,0.1) 0%, transparent 55%)' }} />
        <div className="relative px-8 py-7 flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <FileText className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white">{t('reports.title', 'Rapports ESG')}</h1>
            </div>
            <p className="text-emerald-100 text-sm ml-1 mb-4">{t('reports.subtitle', 'Consultez et téléchargez vos rapports ESG générés')}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="px-3 py-1.5 rounded-full text-xs font-semibold text-white" style={{ background: 'rgba(255,255,255,0.15)' }}>
                {reports.length} rapport{reports.length > 1 ? 's' : ''} disponible{reports.length > 1 ? 's' : ''}
              </div>
              {['GRI', 'CSRD', 'TCFD', 'ESRS'].map(std => (
                <div key={std} className="px-2.5 py-1 rounded-full text-xs font-medium text-white" style={{ background: 'rgba(255,255,255,0.12)' }}>{std}</div>
              ))}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={loadReports} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors" style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}>
              <RefreshCw className="h-4 w-4" />{t('common.refresh', 'Actualiser')}
            </button>
            <Link
              to="/app/reports/generate"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md transition-colors"
              style={{ background: 'white', color: '#059669' }}
            >
              <Plus className="h-4 w-4" />{t('reports.generate', 'Générer un rapport')}
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
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
                            onClick={() => handleDownload(report.id, name)}
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
              to="/app/reports/generate"
              className="inline-flex items-center gap-2 mt-5 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              {t('reports.generate', 'Generate Report')}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
