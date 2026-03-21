import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Award, TrendingUp, Building2, Calculator } from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import PageHeader from '@/components/PageHeader';
import api from '@/services/api';

interface Organization {
  id: string;
  name: string;
  industry?: string;
  external_id?: string;
}

export default function ScoresList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      const response = await api.get('/organizations');
      setOrganizations(response.data.items || []);
    } catch (error) {
      console.error('Error loading organizations:', error);
    } finally {
      setLoading(false);
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
      <PageHeader
        title={t('scores.title')}
        subtitle={t('scores.sectoralSubtitle')}
      />

      {organizations.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 font-medium mb-2">{t('scores.noOrganizations')}</p>
            <p className="text-sm text-gray-400 mb-6">
              {t('scores.enrichOrgsHint')}
            </p>
            <Button onClick={() => navigate('/settings/esg-enrichment')}>
              {t('scores.enrichOrgs')}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {organizations.map(org => (
            <Card
              key={org.id}
              className="hover:shadow-lg transition-all cursor-pointer"
              onClick={() => navigate(`/scores/calculate/${org.id}`)}
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{org.name}</h3>
                    {org.industry && (
                      <p className="text-sm text-gray-600 capitalize">{org.industry}</p>
                    )}
                    {org.external_id && (
                      <p className="text-xs text-gray-500 mt-1">
                        SIREN: {org.external_id}
                      </p>
                    )}
                  </div>
                  <Award className="h-8 w-8 text-primary-600" />
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/scores/calculate/${org.id}`);
                  }}
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  {t('scores.calculateEsgScore')}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="bg-blue-50 border-blue-200">
        <div className="flex items-start gap-4">
          <TrendingUp className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">{t('scores.methodology')}</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• {t('scores.methodStep1')}</li>
              <li>• {t('scores.methodStep2')}</li>
              <li>• {t('scores.methodStep3')}</li>
              <li>• {t('scores.methodStep4')}</li>
              <li>• {t('scores.methodStep5')}</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
