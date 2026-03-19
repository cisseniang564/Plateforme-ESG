import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Download,
  Calendar,
  Building2,
  Filter,
  CheckCircle,
  Loader,
  Eye,
  Share2,
  Sparkles,
  BarChart3,
  TrendingUp,
  Award,
  Globe
} from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import { generateConsistentScores, generateEvolutionData } from '@/utils/mockScores';
import { format } from 'date-fns';

interface Organization {
  id: string;
  name: string;
  industry?: string;
  external_id?: string;
}

type ReportType = 'executive' | 'detailed' | 'csrd' | 'gri' | 'tcfd';
type ReportFormat = 'pdf' | 'excel' | 'word';
type ReportPeriod = 'monthly' | 'quarterly' | 'yearly' | 'custom';

export default function ReportGeneration() {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  
  // Formulaire
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [reportType, setReportType] = useState<ReportType>('executive');
  const [reportFormat, setReportFormat] = useState<ReportFormat>('pdf');
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('yearly');
  const [startDate, setStartDate] = useState(format(new Date(2025, 0, 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeRecommendations, setIncludeRecommendations] = useState(true);
  const [includeComparison, setIncludeComparison] = useState(false);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      const res = await api.get('/organizations');
      const orgs = res.data?.organizations || res.data?.items || [];
      setOrganizations(orgs);
      if (orgs.length > 0) {
        setSelectedOrg(orgs[0].id);
      }
    } catch (error) {
      console.error('Error loading organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    if (!selectedOrg) {
      alert('Veuillez sélectionner une organisation');
      return;
    }

    setGenerating(true);

    try {
      const org = organizations.find(o => o.id === selectedOrg);
      if (!org) return;

      const scores = generateConsistentScores(selectedOrg);
      const evolution = generateEvolutionData(selectedOrg, 12);

      // Créer le rapport selon le type
      const reportData = {
        organization: org,
        scores: scores,
        evolution: evolution,
        period: { start: startDate, end: endDate },
        type: reportType,
        generatedAt: new Date().toISOString()
      };

      // Simuler la génération (2 secondes)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Télécharger le rapport
      downloadReport(reportData);

      alert('Rapport généré avec succès !');
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Erreur lors de la génération du rapport');
    } finally {
      setGenerating(false);
    }
  };

  const downloadReport = (data: any) => {
    // Pour la démo, créer un fichier texte
    const content = generateReportContent(data);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-esg-${data.organization.name.replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const generateReportContent = (data: any) => {
    const { organization, scores, evolution, period, type } = data;

    let content = `
╔════════════════════════════════════════════════════════════════╗
║                    RAPPORT ESG ${type.toUpperCase()}                      
║                    ${organization.name}                          
╚════════════════════════════════════════════════════════════════╝

Généré le: ${format(new Date(), 'dd/MM/yyyy à HH:mm')}
Période: ${format(new Date(period.start), 'dd/MM/yyyy')} - ${format(new Date(period.end), 'dd/MM/yyyy')}
Organisation: ${organization.name}
Secteur: ${organization.industry || 'N/A'}
ID Externe: ${organization.external_id || 'N/A'}

═══════════════════════════════════════════════════════════════
RÉSUMÉ EXÉCUTIF
═══════════════════════════════════════════════════════════════

Score ESG Global: ${scores.overall}/100
Rating: ${scores.rating}
Tendance: ${scores.trend > 0 ? '↑' : '↓'} ${Math.abs(scores.trend).toFixed(1)}%

SCORES PAR PILIER:
─────────────────────────────────────────────────────────────
🌿 Environnemental (E): ${scores.environmental}/100
   Performance: ${scores.environmental >= 70 ? 'Excellente' : scores.environmental >= 50 ? 'Bonne' : 'À améliorer'}

👥 Social (S): ${scores.social}/100
   Performance: ${scores.social >= 70 ? 'Excellente' : scores.social >= 50 ? 'Bonne' : 'À améliorer'}

⚖️ Gouvernance (G): ${scores.governance}/100
   Performance: ${scores.governance >= 70 ? 'Excellente' : scores.governance >= 50 ? 'Bonne' : 'À améliorer'}

═══════════════════════════════════════════════════════════════
ÉVOLUTION SUR 12 MOIS
═══════════════════════════════════════════════════════════════

Mois         | Global | E    | S    | G
─────────────────────────────────────────────────────────
${evolution.map((e: any) => 
  `${e.month.padEnd(12)} | ${e.overall.toString().padEnd(6)} | ${e.environmental.toString().padEnd(4)} | ${e.social.toString().padEnd(4)} | ${e.governance}`
).join('\n')}

═══════════════════════════════════════════════════════════════
ANALYSE DÉTAILLÉE
═══════════════════════════════════════════════════════════════

POINTS FORTS:
${scores.governance >= 70 ? '✓ Excellente gouvernance d\'entreprise' : ''}
${scores.environmental >= 70 ? '✓ Leadership en matière environnementale' : ''}
${scores.social >= 70 ? '✓ Forte performance sociale' : ''}

AXES D'AMÉLIORATION:
${scores.environmental < 60 ? '• Renforcer les initiatives environnementales' : ''}
${scores.social < 60 ? '• Améliorer la dimension sociale' : ''}
${scores.governance < 60 ? '• Optimiser la gouvernance' : ''}

RECOMMANDATIONS:
${scores.environmental < 70 ? '1. Mettre en place un plan de réduction des émissions carbone\n' : ''}
${scores.social < 70 ? '2. Développer les programmes de diversité et inclusion\n' : ''}
${scores.governance < 70 ? '3. Renforcer la transparence et la communication ESG\n' : ''}

═══════════════════════════════════════════════════════════════
CONFORMITÉ RÉGLEMENTAIRE
═══════════════════════════════════════════════════════════════

${type === 'csrd' ? `
CSRD (Corporate Sustainability Reporting Directive):
✓ Double matérialité évaluée
✓ Indicateurs de performance collectés
✓ Objectifs de durabilité définis
` : ''}

${type === 'gri' ? `
GRI Standards (Global Reporting Initiative):
✓ GRI 2: Informations générales
✓ GRI 3: Thématiques matérielles
✓ GRI 200: Économie
✓ GRI 300: Environnement
✓ GRI 400: Social
` : ''}

${type === 'tcfd' ? `
TCFD (Task Force on Climate-related Financial Disclosures):
✓ Gouvernance climatique
✓ Stratégie climat
✓ Gestion des risques
✓ Métriques et objectifs
` : ''}

═══════════════════════════════════════════════════════════════
DONNÉES TECHNIQUES
═══════════════════════════════════════════════════════════════

Complétude des données: ${scores.data_completeness}%
Période de reporting: ${format(new Date(period.start), 'MMMM yyyy')} - ${format(new Date(period.end), 'MMMM yyyy')}
Méthodologie: ESGFlow Score Engine v2.0
Référentiels: ${type === 'csrd' ? 'CSRD, ESRS' : type === 'gri' ? 'GRI Standards 2021' : type === 'tcfd' ? 'TCFD Framework' : 'ISO 26000, GRI'}

═══════════════════════════════════════════════════════════════

Rapport généré automatiquement par ESGFlow Platform
© ${new Date().getFullYear()} ESGFlow - Tous droits réservés

Pour toute question: support@esgflow.com
Documentation: https://docs.esgflow.com

═══════════════════════════════════════════════════════════════
`;

    return content;
  };

  const reportTypes = [
    {
      id: 'executive' as ReportType,
      name: 'Rapport Exécutif',
      description: 'Vue d\'ensemble synthétique pour la direction',
      icon: Award,
      color: 'from-purple-500 to-purple-600'
    },
    {
      id: 'detailed' as ReportType,
      name: 'Rapport Détaillé',
      description: 'Analyse complète avec tous les indicateurs',
      icon: BarChart3,
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 'csrd' as ReportType,
      name: 'Rapport CSRD',
      description: 'Conforme à la directive européenne',
      icon: Globe,
      color: 'from-green-500 to-green-600'
    },
    {
      id: 'gri' as ReportType,
      name: 'Rapport GRI',
      description: 'Standards GRI 2021',
      icon: CheckCircle,
      color: 'from-orange-500 to-orange-600'
    },
    {
      id: 'tcfd' as ReportType,
      name: 'Rapport TCFD',
      description: 'Risques et opportunités climatiques',
      icon: TrendingUp,
      color: 'from-red-500 to-red-600'
    }
  ];

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
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary-600" />
          Génération de Rapports ESG
        </h1>
        <p className="text-gray-600 mt-1">
          Créez des rapports professionnels conformes aux standards internationaux
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Type de rapport */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary-600" />
              Type de Rapport
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {reportTypes.map(type => (
                <button
                  key={type.id}
                  onClick={() => setReportType(type.id)}
                  className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                    reportType === type.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${type.color}`}>
                      <type.icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{type.name}</p>
                      <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                    </div>
                    {reportType === type.id && (
                      <CheckCircle className="h-5 w-5 text-primary-600 absolute top-3 right-3" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Configuration détaillée */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary-600" />
              Configuration
            </h2>

            <div className="space-y-4">
              {/* Organisation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organisation *
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <select
                    value={selectedOrg}
                    onChange={(e) => setSelectedOrg(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {organizations.map(org => (
                      <option key={org.id} value={org.id}>
                        {org.name} {org.industry && `- ${org.industry}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Période */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Période de reporting
                </label>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {(['monthly', 'quarterly', 'yearly', 'custom'] as ReportPeriod[]).map(period => (
                    <button
                      key={period}
                      onClick={() => setReportPeriod(period)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        reportPeriod === period
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {period === 'monthly' ? 'Mensuel' : 
                       period === 'quarterly' ? 'Trimestriel' : 
                       period === 'yearly' ? 'Annuel' : 'Personnalisé'}
                    </button>
                  ))}
                </div>

                {reportPeriod === 'custom' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Date de début</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Date de fin</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Format */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Format de sortie
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['pdf', 'excel', 'word'] as ReportFormat[]).map(format => (
                    <button
                      key={format}
                      onClick={() => setReportFormat(format)}
                      className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                        reportFormat === format
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {format.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Options du rapport
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={includeCharts}
                      onChange={(e) => setIncludeCharts(e.target.checked)}
                      className="w-5 h-5 text-primary-600 rounded focus:ring-2 focus:ring-primary-500"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Inclure les graphiques</p>
                      <p className="text-sm text-gray-600">Ajouter les visualisations de données</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={includeRecommendations}
                      onChange={(e) => setIncludeRecommendations(e.target.checked)}
                      className="w-5 h-5 text-primary-600 rounded focus:ring-2 focus:ring-primary-500"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Inclure les recommandations</p>
                      <p className="text-sm text-gray-600">Ajouter des axes d'amélioration</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={includeComparison}
                      onChange={(e) => setIncludeComparison(e.target.checked)}
                      className="w-5 h-5 text-primary-600 rounded focus:ring-2 focus:ring-primary-500"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Inclure la comparaison sectorielle</p>
                      <p className="text-sm text-gray-600">Comparer avec les pairs du secteur</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Aperçu & Actions */}
        <div className="space-y-6">
          {/* Aperçu */}
          <Card className="bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200">
            <h3 className="text-lg font-semibold text-primary-900 mb-4">
              Aperçu du Rapport
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-primary-700">Type:</span>
                <span className="font-medium text-primary-900">
                  {reportTypes.find(t => t.id === reportType)?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-primary-700">Organisation:</span>
                <span className="font-medium text-primary-900 truncate ml-2">
                  {organizations.find(o => o.id === selectedOrg)?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-primary-700">Format:</span>
                <span className="font-medium text-primary-900">{reportFormat.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-primary-700">Période:</span>
                <span className="font-medium text-primary-900">
                  {reportPeriod === 'monthly' ? 'Mensuel' :
                   reportPeriod === 'quarterly' ? 'Trimestriel' :
                   reportPeriod === 'yearly' ? 'Annuel' : 'Personnalisé'}
                </span>
              </div>
              {reportPeriod === 'custom' && (
                <div className="pt-2 border-t border-primary-200">
                  <span className="text-primary-700 block mb-1">Du:</span>
                  <span className="font-medium text-primary-900 block">
                    {format(new Date(startDate), 'dd/MM/yyyy')} au {format(new Date(endDate), 'dd/MM/yyyy')}
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Actions */}
          <Card>
            <Button
              onClick={generateReport}
              disabled={generating || !selectedOrg}
              className="w-full mb-3"
              size="lg"
            >
              {generating ? (
                <>
                  <Loader className="h-5 w-5 mr-2 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <Download className="h-5 w-5 mr-2" />
                  Générer le Rapport
                </>
              )}
            </Button>

            <Button
              variant="secondary"
              className="w-full mb-3"
              onClick={() => {}}
            >
              <Eye className="h-5 w-5 mr-2" />
              Prévisualiser
            </Button>

            <Button
              variant="secondary"
              className="w-full"
              onClick={() => navigate('/reports')}
            >
              <FileText className="h-5 w-5 mr-2" />
              Voir les rapports
            </Button>
          </Card>

          {/* Info */}
          <Card className="bg-blue-50 border-blue-200">
            <div className="flex gap-3">
              <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900 mb-1">Conformité garantie</p>
                <p className="text-sm text-blue-700">
                  Tous nos rapports sont conformes aux standards internationaux et 
                  aux réglementations européennes.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}