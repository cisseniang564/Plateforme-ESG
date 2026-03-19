import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Download,
  Eye,
  FileText,
  Plus,
  RefreshCw,
  Filter,
  Search,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  FileBarChart,
  FileSpreadsheet,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import reportsService from '@/services/reportsService';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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

const TYPE_CONFIG = {
  executive: {
    label: 'Exécutif',
    icon: FileBarChart,
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    iconBg: 'bg-purple-100 text-purple-600'
  },
  detailed: {
    label: 'Détaillé',
    icon: FileText,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    iconBg: 'bg-blue-100 text-blue-600'
  },
  regulatory: {
    label: 'Réglementaire',
    icon: FileSpreadsheet,
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    iconBg: 'bg-orange-100 text-orange-600'
  },
  standard: {
    label: 'Standard',
    icon: FileText,
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    iconBg: 'bg-gray-100 text-gray-600'
  }
};

const MOCK_REPORTS: Report[] = [
  {
    id: '1',
    name: 'Rapport ESG Annuel 2024',
    report_type: 'executive',
    format: 'PDF',
    created_at: new Date(2024, 11, 15).toISOString(),
    status: 'completed'
  },
  {
    id: '2',
    name: 'Analyse Carbone Q4 2024',
    report_type: 'detailed',
    format: 'PDF',
    created_at: new Date(2024, 11, 10).toISOString(),
    status: 'completed'
  },
  {
    id: '3',
    name: 'Rapport CSRD 2024',
    report_type: 'regulatory',
    format: 'PDF',
    created_at: new Date(2024, 11, 5).toISOString(),
    status: 'completed'
  },
  {
    id: '4',
    name: 'Indicateurs Sociaux Novembre',
    report_type: 'standard',
    format: 'XLSX',
    created_at: new Date(2024, 10, 28).toISOString(),
    status: 'completed'
  },
  {
    id: '5',
    name: 'Benchmark Sectoriel 2024',
    report_type: 'detailed',
    format: 'PDF',
    created_at: new Date(2024, 10, 20).toISOString(),
    status: 'completed'
  }
];

export default function ReportsList() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await reportsService.getReports();
      const items = Array.isArray(data) ? data : data?.items || data?.reports || [];
      
      // Si pas de rapports réels, utiliser les mock
      setReports(items.length > 0 ? items : MOCK_REPORTS);
    } catch (error) {
      // Utiliser les mock en cas d'erreur
      setReports(MOCK_REPORTS);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (reportId: string, name: string) => {
    try {
      const blob = await reportsService.downloadReport(reportId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name || `report-${reportId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Téléchargement non disponible en mode démo');
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = (report.name || report.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || (report.report_type || report.type) === typeFilter;
    return matchesSearch && matchesType;
  });

  // Stats
  const stats = {
    total: reports.length,
    thisMonth: reports.filter(r => {
      const date = new Date(r.created_at || r.generated_at || '');
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length,
    completed: reports.filter(r => r.status === 'completed').length
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
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary-600" />
            Rapports ESG
          </h1>
          <p className="mt-2 text-gray-600">
            Générez et consultez vos rapports de conformité et d'analyse
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={loadReports}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          <Button onClick={() => navigate('/reports/generate')}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau Rapport
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-primary-700 font-medium">Total Rapports</p>
              <p className="text-3xl font-bold text-primary-900 mt-1">{stats.total}</p>
            </div>
            <FileText className="h-10 w-10 text-primary-600 opacity-50" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 font-medium">Ce mois-ci</p>
              <p className="text-3xl font-bold text-green-900 mt-1">{stats.thisMonth}</p>
            </div>
            <TrendingUp className="h-10 w-10 text-green-600 opacity-50" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700 font-medium">Complétés</p>
              <p className="text-3xl font-bold text-blue-900 mt-1">{stats.completed}</p>
            </div>
            <CheckCircle className="h-10 w-10 text-blue-600 opacity-50" />
          </div>
        </Card>
      </div>

      {/* Templates rapides */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary-600" />
          Templates Rapides
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Object.entries(TYPE_CONFIG).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <button
                key={key}
                onClick={() => navigate(`/reports/generate?type=${key}`)}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-all text-left group"
              >
                <div className={`w-12 h-12 rounded-lg ${config.iconBg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <Icon className="h-6 w-6" />
                </div>
                <p className="font-semibold text-gray-900">{config.label}</p>
                <p className="text-sm text-gray-500 mt-1">Générer un rapport {config.label.toLowerCase()}</p>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Filtres et recherche */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          {/* Recherche */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un rapport..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Filtre type */}
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 min-w-[180px]"
            >
              <option value="all">Tous les types</option>
              {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Liste des rapports */}
      <Card>
        {filteredReports.length > 0 ? (
          <div className="space-y-3">
            {filteredReports.map(report => {
              const name = report.name || report.title || `Report ${report.id.slice(0, 8)}`;
              const type = (report.report_type || report.type || 'standard') as keyof typeof TYPE_CONFIG;
              const config = TYPE_CONFIG[type] || TYPE_CONFIG.standard;
              const Icon = config.icon;
              const date = report.created_at || report.generated_at;

              return (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`w-12 h-12 rounded-lg ${config.iconBg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color} border`}>
                          {config.label}
                        </span>
                        {date && (
                          <span className="flex items-center gap-1 text-sm text-gray-500">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(date), 'dd MMM yyyy', { locale: fr })}
                          </span>
                        )}
                        {report.format && (
                          <span className="text-xs text-gray-500 font-medium">
                            {report.format}
                          </span>
                        )}
                      </div>
                    </div>

                    {report.status && (
                      <div className="flex items-center gap-2">
                        {report.status === 'completed' && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                            <CheckCircle className="h-3 w-3" />
                            Terminé
                          </span>
                        )}
                        {report.status === 'processing' && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                            <Clock className="h-3 w-3" />
                            En cours
                          </span>
                        )}
                        {report.status === 'failed' && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                            <AlertCircle className="h-3 w-3" />
                            Échec
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Voir
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleDownload(report.id, name)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Télécharger
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <FileText className="h-20 w-20 mx-auto text-gray-300 mb-4" />
            <p className="text-xl text-gray-600 font-medium mb-2">
              {searchQuery || typeFilter !== 'all' ? 'Aucun rapport trouvé' : 'Aucun rapport généré'}
            </p>
            <p className="text-gray-500 mb-6">
              {searchQuery || typeFilter !== 'all' 
                ? 'Essayez de modifier vos filtres' 
                : 'Générez votre premier rapport ESG pour le voir ici'
              }
            </p>
            <Button onClick={() => navigate('/reports/generate')}>
              <Plus className="h-4 w-4 mr-2" />
              Générer un Rapport
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}