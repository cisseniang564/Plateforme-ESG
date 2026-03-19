import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Database,
  Building2,
  TrendingUp,
  Download,
  CheckCircle,
  AlertCircle,
  Zap
} from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import PageHeader from '@/components/PageHeader';
import api from '@/services/api';

interface Organization {
  id: string;
  name: string;
  external_id?: string;
  industry?: string;
  metadata?: any;
}

interface Secteur {
  id: string;
  nom: string;
}

export default function DataEnrichment() {
  const { t } = useTranslation();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [secteurs, setSecteurs] = useState<Secteur[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [siren, setSiren] = useState('');
  const [selectedSecteur, setSelectedSecteur] = useState('');
  const [departement, setDepartement] = useState('');
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [orgsRes, secteursRes] = await Promise.all([
        api.get('/organizations'),
        api.get('/insee/secteurs'),
      ]);

      setOrganizations(orgsRes.data.items || []);
      setSecteurs(secteursRes.data.secteurs || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleEnrichOrganization = async () => {
    if (!selectedOrg || !siren) {
      alert('Veuillez sélectionner une organisation et entrer un SIREN');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await api.post('/esg-enrichment/enrichir-organisation', {
        organization_id: selectedOrg,
        siren: siren,
        generer_donnees: true,
      });

      setResult({
        type: 'enrich',
        success: true,
        data: response.data,
      });

      // Recharger les organisations
      await loadData();
    } catch (error: any) {
      setResult({
        type: 'enrich',
        success: false,
        error: error.response?.data?.detail || 'Échec de l\'enrichissement',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImportSecteur = async () => {
    if (!selectedSecteur) {
      alert('Veuillez sélectionner un secteur');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await api.post('/esg-enrichment/importer-secteur', {
        secteur: selectedSecteur,
        departement: departement || undefined,
      });

      setResult({
        type: 'import',
        success: true,
        data: response.data,
      });

      // Recharger les organisations
      await loadData();
    } catch (error: any) {
      setResult({
        type: 'import',
        success: false,
        error: error.response?.data?.detail || 'Échec de l\'import',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enrichissement des Données ESG"
        subtitle="Connectez vos organisations aux données externes et générez des indicateurs automatiquement"
        showBack={true}
        backTo="/app/settings"
      />

      {/* Workflow Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="text-center">
          <div className="space-y-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900">1. Lier au SIREN</h3>
            <p className="text-sm text-gray-600">
              Connectez une organisation existante à son numéro SIREN
            </p>
          </div>
        </Card>

        <Card className="text-center">
          <div className="space-y-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Database className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900">2. Enrichir</h3>
            <p className="text-sm text-gray-600">
              Récupération automatique des données INSEE et génération d'indicateurs
            </p>
          </div>
        </Card>

        <Card className="text-center">
          <div className="space-y-3">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900">3. Analyser</h3>
            <p className="text-sm text-gray-600">
              12 mois de données ESG générées automatiquement selon le secteur
            </p>
          </div>
        </Card>
      </div>

      {/* Enrichir Organisation */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <Zap className="h-6 w-6 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Enrichir une Organisation Existante
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Organisation
            </label>
            <select
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
              title="Sélectionner une organisation"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Sélectionner une organisation</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>
                  {org.name} {org.external_id ? `(${org.external_id})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Numéro SIREN (9 chiffres)
            </label>
            <input
              type="text"
              value={siren}
              onChange={(e) => setSiren(e.target.value)}
              placeholder="ex: 552081317"
              maxLength={9}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex items-end">
            <Button 
              onClick={handleEnrichOrganization} 
              disabled={loading || !selectedOrg || !siren}
              className="w-full"
            >
              {loading ? (
                <Spinner size="sm" />
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Enrichir & Générer Données
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
          <p className="text-sm text-blue-800">
            <strong>💡 Info:</strong> L'enrichissement va :
          </p>
          <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
            <li>Récupérer les données officielles INSEE (secteur, taille, adresse)</li>
            <li>Générer automatiquement 12 mois de données ESG réalistes</li>
            <li>Calculer les valeurs selon le secteur d'activité et la taille</li>
          </ul>
        </div>
      </Card>

      {/* Import Secteur */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <Download className="h-6 w-6 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Importer un Secteur Complet
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Secteur d'activité
            </label>
            <select
              value={selectedSecteur}
              onChange={(e) => setSelectedSecteur(e.target.value)}
              title="Sélectionner un secteur d'activité"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Sélectionner un secteur</option>
              {secteurs.map(s => (
                <option key={s.id} value={s.id}>{s.nom}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Département (optionnel)
            </label>
            <input
              type="text"
              value={departement}
              onChange={(e) => setDepartement(e.target.value)}
              placeholder="ex: 75 (Paris)"
              maxLength={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex items-end">
            <Button 
              onClick={handleImportSecteur} 
              disabled={loading || !selectedSecteur}
              className="w-full"
            >
              {loading ? (
                <Spinner size="sm" />
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Importer Entreprises
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
          <p className="text-sm text-amber-800">
            <strong>⚠️ Attention:</strong> Cette action va créer automatiquement des organisations 
            pour toutes les entreprises du secteur sélectionné. Les doublons seront ignorés.
          </p>
        </div>
      </Card>

      {/* Résultats */}
      {result && (
        <Card>
          {result.success ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-green-600">
                <CheckCircle className="h-6 w-6" />
                <h3 className="font-semibold text-lg">
                  {result.type === 'enrich' ? 'Enrichissement Réussi !' : 'Import Réussi !'}
                </h3>
              </div>

              {result.type === 'enrich' && result.data.donnees_generees && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-2xl font-bold text-green-600">
                      {result.data.donnees_generees.indicators_count}
                    </p>
                    <p className="text-sm text-green-700">Indicateurs</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-2xl font-bold text-blue-600">
                      {result.data.donnees_generees.data_points_created}
                    </p>
                    <p className="text-sm text-blue-700">Données créées</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <p className="text-2xl font-bold text-purple-600">
                      {result.data.donnees_generees.months_generated}
                    </p>
                    <p className="text-sm text-purple-700">Mois générés</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-orange-600">
                      {result.data.donnees_generees.secteur}
                    </p>
                    <p className="text-sm text-orange-700">Secteur</p>
                  </div>
                </div>
              )}

              {result.type === 'import' && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-2xl font-bold text-green-600">
                      {result.data.created}
                    </p>
                    <p className="text-sm text-green-700">Créées</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-2xl font-bold text-gray-600">
                      {result.data.skipped}
                    </p>
                    <p className="text-sm text-gray-700">Ignorées</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-2xl font-bold text-blue-600">
                      {result.data.total_entreprises}
                    </p>
                    <p className="text-sm text-blue-700">Total</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button onClick={() => window.location.href = '/organizations'}>
                  Voir les Organisations
                </Button>
                <Button variant="secondary" onClick={() => window.location.href = '/data'}>
                  Voir les Données
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 text-red-600">
              <AlertCircle className="h-6 w-6 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-lg mb-2">Erreur</h3>
                <p className="text-sm">{result.error}</p>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
