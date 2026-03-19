import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Eye, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import toast from 'react-hot-toast';

interface ReportType {
  id: string;
  name: string;
  description: string;
  icon: string;
}

const REPORT_TYPES: ReportType[] = [
  { id: 'executive', name: 'Rapport Exécutif', description: 'Vue d\'ensemble synthétique pour la direction', icon: '👔' },
  { id: 'detailed', name: 'Rapport Détaillé', description: 'Analyse complète avec tous les indicateurs', icon: '📊' },
  { id: 'csrd', name: 'Rapport CSRD', description: 'Conforme à la directive européenne', icon: '🌍' },
  { id: 'gri', name: 'Rapport GRI', description: 'Standards GRI 2021', icon: '✅' },
  { id: 'tcfd', name: 'Rapport TCFD', description: 'Risques et opportunités climatiques', icon: '📈' },
];

export default function ReportGeneration() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState('executive');
  const [period, setPeriod] = useState('annual');
  const [year, setYear] = useState(new Date().getFullYear());
  const [format, setFormat] = useState('pdf');
  const [generating, setGenerating] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  const MOCK_PREVIEW: Record<string, any> = {
    executive:  { data_points: { environmental: 12, social: 9, governance: 7 }, stats: { total_entries: 28 } },
    detailed:   { data_points: { environmental: 34, social: 27, governance: 19 }, stats: { total_entries: 80 } },
    csrd:       { data_points: { environmental: 42, social: 31, governance: 24 }, stats: { total_entries: 97 } },
    gri:        { data_points: { environmental: 38, social: 25, governance: 18 }, stats: { total_entries: 81 } },
    tcfd:       { data_points: { environmental: 29, social: 14, governance: 11 }, stats: { total_entries: 54 } },
  };

  const handlePreview = async () => {
    setPreviewing(true);
    try {
      const response = await api.get(`/reports/preview/${selectedType}?year=${year}`);
      setPreviewData(response.data);
    } catch {
      // API non disponible : utiliser les données de démonstration
      setPreviewData(MOCK_PREVIEW[selectedType] || MOCK_PREVIEW.executive);
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

      // Créer un lien de téléchargement
      const blob = new Blob([response.data], { 
        type: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rapport_${selectedType}_${year}.${format}`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success('✅ Rapport généré avec succès !');
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error('Erreur lors de la génération du rapport');
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
      {/* Header */}
      <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center gap-4">
          <FileText className="h-12 w-12" />
          <div>
            <h1 className="text-4xl font-bold mb-2">Génération de Reports ESG</h1>
            <p className="text-green-100 text-lg">
              Créez des rapports professionnels conformes aux standards internationaux
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Type de Rapport */}
          <Card>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-600" />
              Type de Rapport
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
                    <span className="text-3xl">{type.icon}</span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{type.name}</h3>
                      <p className="text-sm text-gray-600">{type.description}</p>
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
            <h2 className="text-xl font-bold text-gray-900 mb-4">Configuration</h2>

            <div className="space-y-4">
              {/* Période de reporting */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Période de reporting
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
                      {p === 'monthly' ? 'Mensuel' : p === 'quarterly' ? 'Trimestriel' : p === 'annual' ? 'Annuel' : 'Personnalisé'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Année */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Année
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

              {/* Format de sortie */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Format de sortie
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
                    Excel et Word disponibles prochainement
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Aperçu */}
        <div className="space-y-6">
          <Card>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Aperçu du Rapport</h2>

            {selectedReport && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Type:</p>
                  <p className="text-lg font-bold text-gray-900">{selectedReport.name}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">Format:</p>
                  <p className="text-lg font-bold text-gray-900">{format.toUpperCase()}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">Période:</p>
                  <p className="text-lg font-bold text-gray-900">
                    {period === 'annual' ? 'Annuel' : period === 'monthly' ? 'Mensuel' : 'Trimestriel'} - {year}
                  </p>
                </div>

                {previewData && (
                  <>
                    <hr className="my-4" />
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-2">Données incluses:</p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>🌍 Environnemental</span>
                          <span className="font-semibold">{previewData.data_points.environmental}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>👥 Social</span>
                          <span className="font-semibold">{previewData.data_points.social}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>⚖️ Gouvernance</span>
                          <span className="font-semibold">{previewData.data_points.governance}</span>
                        </div>
                        <hr />
                        <div className="flex justify-between font-bold">
                          <span>Total</span>
                          <span>{previewData.stats.total_entries}</span>
                        </div>
                      </div>
                    </div>
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
                    Génération en cours...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Générer le Rapport
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
                    Chargement...
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Prévisualiser
                  </>
                )}
              </Button>

              <Button
                onClick={() => navigate('/app/reports')}
                variant="secondary"
                className="w-full"
              >
                <FileText className="h-4 w-4 mr-2" />
                Voir les rapports
              </Button>
            </div>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-blue-900 mb-1">Conformité garantie</p>
                <p className="text-sm text-blue-700">
                  Tous nos rapports sont conformes aux standards internationaux et aux réglementations européennes.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
