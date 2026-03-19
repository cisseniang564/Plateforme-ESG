import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Search, 
  Building2, 
  MapPin,
  Users,
  Factory,
  ExternalLink,
  Download
} from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import PageHeader from '@/components/PageHeader';
import api from '@/services/api';

interface Entreprise {
  siren?: string;
  siret?: string;
  denomination: string;
  activite_principale?: string;
  tranche_effectifs?: string;
  adresse?: {
    adresse_complete?: string;
    code_postal?: string;
    commune?: string;
  };
  etablissement_siege?: boolean;
  etat_administratif?: string;
}

interface Secteur {
  id: string;
  nom: string;
  description: string;
}

export default function EntreprisesINSEE() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'nom' | 'secteur'>('nom');
  const [selectedSecteur, setSelectedSecteur] = useState('');
  const [departement, setDepartement] = useState('');
  const [loading, setLoading] = useState(false);
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [total, setTotal] = useState(0);
  const [secteurs, setSecteurs] = useState<Secteur[]>([]);

  useEffect(() => {
    loadSecteurs();
  }, []);

  const loadSecteurs = async () => {
    try {
      const response = await api.get('/insee/secteurs');
      setSecteurs(response.data.secteurs || []);
    } catch (error) {
      console.error('Error loading secteurs:', error);
    }
  };

  const handleSearch = async () => {
    if (searchType === 'nom' && !searchQuery.trim()) {
      alert('Veuillez entrer un nom ou SIREN/SIRET');
      return;
    }

    if (searchType === 'secteur' && !selectedSecteur) {
      alert('Veuillez sélectionner un secteur');
      return;
    }

    setLoading(true);
    setEntreprises([]);

    try {
      let response;

      if (searchType === 'nom') {
        response = await api.get('/insee/rechercher', {
          params: {
            q: searchQuery,
            nombre: 50,
          },
        });
        setEntreprises(response.data.entreprises || []);
        setTotal(response.data.total || 0);
      } else {
        response = await api.get(`/insee/secteur/${selectedSecteur}`, {
          params: {
            departement: departement || undefined,
            nombre: 100,
          },
        });
        setEntreprises(response.data.entreprises || []);
        setTotal(response.data.total || 0);
      }
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Erreur lors de la recherche');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (entreprises.length === 0) {
      alert('Aucune donnée à exporter');
      return;
    }

    const headers = ['SIREN', 'SIRET', 'Dénomination', 'Activité', 'Effectifs', 'Adresse', 'Code Postal', 'Commune'];
    const rows = entreprises.map(e => [
      e.siren || '',
      e.siret || '',
      e.denomination || '',
      e.activite_principale || '',
      e.tranche_effectifs || '',
      e.adresse?.adresse_complete || '',
      e.adresse?.code_postal || '',
      e.adresse?.commune || '',
    ]);

    const csv = [headers, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `entreprises_insee_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getEffectifsLabel = (code: string) => {
    const tranches: Record<string, string> = {
      'NN': 'Non précisé',
      '00': '0 salarié',
      '01': '1 ou 2 salariés',
      '02': '3 à 5 salariés',
      '03': '6 à 9 salariés',
      '11': '10 à 19 salariés',
      '12': '20 à 49 salariés',
      '21': '50 à 99 salariés',
      '22': '100 à 199 salariés',
      '31': '200 à 249 salariés',
      '32': '250 à 499 salariés',
      '41': '500 à 999 salariés',
      '42': '1000 à 1999 salariés',
      '51': '2000 à 4999 salariés',
      '52': '5000 à 9999 salariés',
      '53': '10000 salariés et plus',
    };
    return tranches[code] || code;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Entreprises Françaises (INSEE)"
        subtitle="Recherche dans la base Sirene - Données officielles"
        showBack={true}
        backTo="/app/settings"
      />

      <Card>
        <div className="space-y-4">
          <div className="flex gap-4">
            <Button
              variant={searchType === 'nom' ? 'primary' : 'secondary'}
              onClick={() => setSearchType('nom')}
              size="sm"
            >
              Recherche par nom/SIREN
            </Button>
            <Button
              variant={searchType === 'secteur' ? 'primary' : 'secondary'}
              onClick={() => setSearchType('secteur')}
              size="sm"
            >
              Recherche par secteur
            </Button>
          </div>

          {searchType === 'nom' && (
            <div className="flex gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Nom entreprise, SIREN (9 chiffres) ou SIRET (14 chiffres)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button onClick={handleSearch} disabled={loading}>
                {loading ? <Spinner size="sm" /> : <Search className="h-4 w-4 mr-2" />}
                {loading ? 'Recherche...' : 'Rechercher'}
              </Button>
            </div>
          )}

          {searchType === 'secteur' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Secteur d'activité
                </label>
                <select
                  value={selectedSecteur}
                  onChange={(e) => setSelectedSecteur(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                  aria-label="Secteur d'activité"
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
                  placeholder="ex: 75, 93, 69"
                  maxLength={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex items-end">
                <Button onClick={handleSearch} disabled={loading} className="w-full">
                  {loading ? <Spinner size="sm" /> : <Search className="h-4 w-4 mr-2" />}
                  {loading ? 'Recherche...' : 'Rechercher'}
                </Button>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>💡 Astuce:</strong> {searchType === 'nom' 
                ? 'Vous pouvez rechercher par nom (ex: Renault), SIREN (9 chiffres) ou SIRET (14 chiffres)'
                : 'Recherchez des entreprises dans des secteurs à fort impact ESG'}
            </p>
          </div>
        </div>
      </Card>

      {total > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {total} entreprise{total > 1 ? 's' : ''} trouvée{total > 1 ? 's' : ''}
              </h3>
              <p className="text-sm text-gray-600">
                Affichage de {entreprises.length} résultat{entreprises.length > 1 ? 's' : ''}
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Exporter CSV
            </Button>
          </div>

          <div className="space-y-3">
            {entreprises.map((entreprise, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Building2 className="h-5 w-5 text-primary-600" />
                      <h4 className="font-semibold text-gray-900">{entreprise.denomination}</h4>
                      {entreprise.etablissement_siege && (
                        <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                          Siège
                        </span>
                      )}
                      {entreprise.etat_administratif === 'A' && (
                        <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                          Actif
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      {entreprise.siren && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <span className="font-medium">SIREN:</span>
                          <code className="bg-gray-100 px-2 py-0.5 rounded">{entreprise.siren}</code>
                        </div>
                      )}
                      {entreprise.siret && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <span className="font-medium">SIRET:</span>
                          <code className="bg-gray-100 px-2 py-0.5 rounded">{entreprise.siret}</code>
                        </div>
                      )}
                      {entreprise.activite_principale && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Factory className="h-4 w-4" />
                          <span>APE: {entreprise.activite_principale}</span>
                        </div>
                      )}
                    </div>

                    {entreprise.adresse?.adresse_complete && (
                      <div className="flex items-start gap-2 text-sm text-gray-600 mt-2">
                        <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>{entreprise.adresse.adresse_complete}</span>
                      </div>
                    )}

                    {entreprise.tranche_effectifs && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                        <Users className="h-4 w-4" />
                        <span>{getEffectifsLabel(entreprise.tranche_effectifs)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {entreprise.siren && (
                      
                        <a href={`https://annuaire-entreprises.data.gouv.fr/entreprise/${entreprise.siren}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-900"
                      >
                        <ExternalLink className="h-5 w-5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {!loading && entreprises.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 font-medium mb-2">Aucun résultat</p>
            <p className="text-sm text-gray-400">
              Effectuez une recherche pour trouver des entreprises françaises
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
