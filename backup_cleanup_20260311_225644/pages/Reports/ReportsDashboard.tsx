import { useTranslation } from 'react-i18next';
import { FileText, Download, Calendar, Filter } from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';

export default function ReportsDashboard() {
  const { t } = useTranslation();

  const reportTemplates = [
    {
      id: 1,
      name: 'ESG Performance Report',
      description: 'Comprehensive ESG performance overview',
      icon: FileText,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      id: 2,
      name: 'Carbon Footprint Report',
      description: 'Detailed carbon emissions analysis',
      icon: FileText,
      color: 'bg-green-100 text-green-600',
    },
    {
      id: 3,
      name: 'Social Impact Report',
      description: 'Social pillar metrics and trends',
      icon: FileText,
      color: 'bg-purple-100 text-purple-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('nav.reports')}</h1>
          <p className="mt-2 text-gray-600">{t('nav.generateReports')}</p>
        </div>
        <Button>
          <Download className="h-5 w-5 mr-2" />
          {t('dashboard.generateReport')}
        </Button>
      </div>

      {/* Report Templates */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reportTemplates.map((template) => {
          const Icon = template.icon;
          return (
            <Card key={template.id}>
              <div className="space-y-4">
                <div className={`w-12 h-12 rounded-lg ${template.color} flex items-center justify-center`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{template.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                </div>
                <Button variant="secondary" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Generate
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Recent Reports */}
      <Card title="Recent Reports">
        <div className="text-center py-12 text-gray-500">
          <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>No reports generated yet</p>
          <p className="text-sm text-gray-400 mt-2">Generate your first report to see it here</p>
        </div>
      </Card>
    </div>
  );
}
