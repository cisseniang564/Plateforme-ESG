import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calculator, RefreshCw, History, CheckCircle, Download, Calendar, TrendingUp } from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import PageHeader from '@/components/PageHeader';
import ESGScoreCard from '@/components/ESG/ESGScoreCard';
import api from '@/services/api';

// Rating badge helper
function RatingBadge({ rating }: { rating?: string }) {
  if (!rating) return null;
  const palette: Record<string, string> = {
    AAA: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    AA:  'bg-green-100 text-green-800 border-green-300',
    A:   'bg-teal-100 text-teal-800 border-teal-300',
    BBB: 'bg-blue-100 text-blue-800 border-blue-300',
    BB:  'bg-yellow-100 text-yellow-800 border-yellow-300',
    B:   'bg-orange-100 text-orange-800 border-orange-300',
    CCC: 'bg-red-100 text-red-800 border-red-300',
    CC:  'bg-red-200 text-red-900 border-red-400',
    C:   'bg-red-300 text-red-900 border-red-500',
  };
  const cls = palette[rating] ?? 'bg-gray-100 text-gray-700 border-gray-300';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${cls}`}>
      {rating}
    </span>
  );
}

export default function OrganizationScoring() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<any>(null);
  const [currentScore, setCurrentScore] = useState<any>(null);
  const [historicalScores, setHistoricalScores] = useState<any[]>([]);
  const [dataQuality, setDataQuality] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('12');

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      const [orgRes, scoresRes, qualityRes] = await Promise.all([
        api.get(`/organizations/${id}`),
        api.get(`/esg-scoring/organization/${id}`).catch(() => ({ data: { scores: [] } })),
        api.post('/esg-scoring/data-quality', { organization_id: id }).catch(() => ({ data: null })),
      ]);

      setOrganization(orgRes.data);
      setHistoricalScores(scoresRes.data.scores || []);
      setCurrentScore(scoresRes.data.scores?.[0] || null);
      setDataQuality(qualityRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateScore = async () => {
    setCalculating(true);

    try {
      const response = await api.post('/esg-scoring/calculate', {
        organization_id: id,
        period_months: 12,
      });

      setCurrentScore(response.data);
      await loadData();

      alert(t('scores.calcSuccess'));
    } catch (error: any) {
      alert(error.response?.data?.detail || t('scores.calcScoreError'));
    } finally {
      setCalculating(false);
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
        title={`${t('scores.esgScorePrefix')} - ${organization?.name || t('scores.defaultOrg')}`}
        subtitle={t('scores.sectoralSubtitle')}
        showBack={true}
        backTo="/scores"
      />

      {/* Actions bar with period selector and export */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleCalculateScore} disabled={calculating}>
          {calculating ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              {t('scores.calculating2')}
            </>
          ) : (
            <>
              <Calculator className="h-4 w-4 mr-2" />
              {t('scores.calculateScore2')}
            </>
          )}
        </Button>

        {historicalScores.length > 0 && (
          <Button variant="secondary" onClick={() => navigate(`/scores/${id}/history`)}>
            <History className="h-4 w-4 mr-2" />
            {t('scores.history')}
          </Button>
        )}

        {/* Period selector */}
        <div className="flex items-center gap-1.5 ml-auto">
          <Calendar className="h-4 w-4 text-gray-400" />
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-300 outline-none bg-white"
          >
            <option value="3">{t('scores.period3m')}</option>
            <option value="6">{t('scores.period6m')}</option>
            <option value="12">{t('scores.months12')}</option>
            <option value="24">{t('scores.period24m')}</option>
          </select>
        </div>

        {/* Export button */}
        <Button variant="secondary" onClick={() => {}}>
          <Download className="h-4 w-4 mr-2" />
          {t('scores.export')}
        </Button>
      </div>

      {/* Rating legend */}
      {currentScore && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
          <TrendingUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span className="text-xs text-gray-500 mr-1">{t('scores.ratingScale')}:</span>
          {['AAA', 'AA', 'A', 'BBB', 'BB', 'B'].map((r) => (
            <RatingBadge key={r} rating={r} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score principal */}
        <div className="lg:col-span-2">
          {currentScore ? (
            <ESGScoreCard
              score={currentScore}
              previousScore={historicalScores[1]?.overall_score}
            />
          ) : (
            <Card>
              <div className="text-center py-16 px-6">
                {/* Illustration */}
                <div className="relative inline-flex mb-6">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-100 to-blue-50 flex items-center justify-center">
                    <Calculator className="h-12 w-12 text-primary-400" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                    <span className="text-amber-600 text-xs font-bold">?</span>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('scores.noScoreCalculated')}</h3>
                <p className="text-sm text-gray-500 mb-3 max-w-xs mx-auto">
                  {t('scores.noScoreHint')}
                </p>
                <div className="flex flex-wrap justify-center gap-2 mb-6">
                  {['AAA', 'AA', 'A', 'BBB', 'BB', 'B'].map((r) => (
                    <RatingBadge key={r} rating={r} />
                  ))}
                </div>
                <Button onClick={handleCalculateScore} disabled={calculating}>
                  <Calculator className="h-4 w-4 mr-2" />
                  {t('scores.calculateNow')}
                </Button>
                <p className="text-xs text-gray-400 mt-3">{t('scores.calcDurationHint')}</p>
              </div>
            </Card>
          )}
        </div>

        {/* Qualité des données */}
        <div>
          <Card>
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary-600" />
              {t('scores.dataQuality')}
            </h3>

            {dataQuality ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">{t('scores.globalScore')}</span>
                    <span className="font-semibold text-gray-900">
                      {dataQuality.overall_quality.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${dataQuality.overall_quality >= 80 ? 'bg-green-500' : dataQuality.overall_quality >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${dataQuality.overall_quality}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{t('scores.completeness')}</span>
                    <span className="font-medium">{dataQuality.completeness.toFixed(0)}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{t('scores.consistency')}</span>
                    <span className="font-medium">{dataQuality.consistency.toFixed(0)}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{t('scores.precision')}</span>
                    <span className="font-medium">{dataQuality.accuracy.toFixed(0)}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{t('scores.freshness')}</span>
                    <span className="font-medium">{dataQuality.timeliness.toFixed(0)}%</span>
                  </div>
                </div>

                {dataQuality.recommendations && dataQuality.recommendations.length > 0 && (
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-xs font-medium text-gray-700 mb-2">{t('scores.recommendations')}</p>
                    <ul className="space-y-1">
                      {dataQuality.recommendations.map((rec: string, i: number) => (
                        <li key={i} className="text-xs text-gray-600">{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">{t('common.loading')}</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
