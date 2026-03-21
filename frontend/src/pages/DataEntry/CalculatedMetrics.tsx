import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Calculator, TrendingUp, TrendingDown, Minus, Zap , RefreshCw } from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import toast from 'react-hot-toast';

interface CalculatedMetric {
  value: number;
  unit: string;
  category: string;
  pillar: string;
  inputs_used: Record<string, number>;
}

interface Evolution {
  current_year: number;
  current_value: number;
  previous_year: number;
  previous_value: number;
  evolution: number;
  evolution_percentage: number;
  trend: 'up' | 'down' | 'stable';
}

export default function CalculatedMetrics() {
  const { t } = useTranslation();
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Record<string, CalculatedMetric>>({});
  const [kpisSummary, setKpisSummary] = useState<any>(null);



  useEffect(() => {
    loadCalculations();
  }, [year]);

  const loadCalculations = async () => {
    setLoading(true);
    try {
      // Charger les metriques calculees
      const metricsRes = await api.get(`/calculations/metrics?year=${year}`);
      setMetrics(metricsRes.data);

      // Charger le resume KPIs
      const kpisRes = await api.get(`/calculations/kpis-summary?year=${year}`);
      setKpisSummary(kpisRes.data);

    } catch (error: any) {
      console.error('Error loading calculations:', error);
      toast.error(t('calculatedMetrics.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="h-5 w-5 text-green-600" />;
    if (trend === 'down') return <TrendingDown className="h-5 w-5 text-red-600" />;
    return <Minus className="h-5 w-5 text-gray-600" />;
  };

  const getTrendColor = (trend: string) => {
    if (trend === 'up') return 'text-green-600';
    if (trend === 'down') return 'text-red-600';
    return 'text-gray-600';
  };

  const getPillarColor = (pillar: string) => {
    const colors = {
      environmental: 'green',
      social: 'blue',
      governance: 'purple',
    };
    return colors[pillar as keyof typeof colors] || 'gray';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Calculator className="h-12 w-12" />
            <div>

          <Button
            onClick={loadCalculations}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            {t('calculatedMetrics.recalculate')}
          </Button>
        <h1 className="text-4xl font-bold mb-2">{t('calculatedMetrics.title')}</h1>
              <p className="text-indigo-100 text-lg">
                {t('calculatedMetrics.subtitle')}
              </p>
            </div>
          </div>

          <div>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="px-4 py-2 rounded-lg bg-white text-gray-900 font-semibold"
            >
              {[2024, 2025, 2026].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Metriques calculees */}
      {Object.keys(metrics).length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(metrics).map(([name, data]) => {
            const color = getPillarColor(data.pillar);
            return (
              <Card key={name} className={`border-l-4 border-${color}-500`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                      {data.category}
                    </p>
                    <h3 className="text-lg font-bold text-gray-900">
                      {name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </h3>
                  </div>
                  <div className={`p-2 bg-${color}-50 rounded-lg`}>
                    <Zap className={`h-5 w-5 text-${color}-600`} />
                  </div>
                </div>

                <div className="mb-3">
                  <p className="text-3xl font-bold text-gray-900">
                    {data.value.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">{data.unit}</p>
                </div>

                <div className="pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">{t('calculatedMetrics.calculatedFrom')}</p>
                  <div className="space-y-1">
                    {Object.entries(data.inputs_used).map(([input, value]) => (
                      <div key={input} className="flex justify-between text-xs">
                        <span className="text-gray-600">{input.replace(/_/g, ' ')}</span>
                        <span className="font-semibold text-gray-900">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <div className="text-center py-12">
            <Calculator className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <p className="text-xl text-gray-900 font-semibold mb-2">
              {t('calculatedMetrics.noCalculations')}
            </p>
            <p className="text-gray-600">
              {t('calculatedMetrics.addDataPrompt')}
            </p>
          </div>
        </Card>
      )}

      {/* Evolutions annee N vs N-1 */}
      {kpisSummary?.evolutions && Object.keys(kpisSummary.evolutions).length > 0 && (
        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            {t('calculatedMetrics.evolutions', { year, prevYear: year - 1 })}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(kpisSummary.evolutions).map(([metric, evolution]: [string, any]) => (
              <div key={metric} className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-600 mb-2">
                  {metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </p>

                <div className="flex items-baseline gap-2 mb-2">
                  <p className="text-2xl font-bold text-gray-900">
                    {evolution.current_value?.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">
                    vs {evolution.previous_value?.toLocaleString()}
                  </p>
                </div>

                <div className={`flex items-center gap-2 ${getTrendColor(evolution.trend)}`}>
                  {getTrendIcon(evolution.trend)}
                  <span className="font-semibold">
                    {evolution.evolution > 0 ? '+' : ''}
                    {evolution.evolution_percentage?.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* KPIs par pilier */}
      {kpisSummary?.calculated_kpis && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(kpisSummary.calculated_kpis).map(([pillar, kpis]: [string, any]) => {
            if (!kpis || kpis.length === 0) return null;

            const color = getPillarColor(pillar);
            const pillarNames: Record<string, string> = {
              environmental: t('calculatedMetrics.environmental'),
              social: t('calculatedMetrics.social'),
              governance: t('calculatedMetrics.governance'),
            };

            return (
              <Card key={pillar} className={`border-t-4 border-${color}-500`}>
                <h3 className={`text-lg font-bold mb-4 text-${color}-700`}>
                  {pillarNames[pillar as keyof typeof pillarNames]}
                </h3>

                <div className="space-y-3">
                  {kpis.map((kpi: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{kpi.name}</span>
                      <div className="text-right">
                        <span className="font-bold text-gray-900">{kpi.value}</span>
                        <span className="text-xs text-gray-500 ml-1">{kpi.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Info formules */}
      <Card className="bg-indigo-50 border-indigo-200">
        <div className="flex items-start gap-3">
          <Zap className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-indigo-900 mb-2">{t('calculatedMetrics.autoCalcTitle')}</p>
            <p className="text-sm text-indigo-700 mb-3">
              {t('calculatedMetrics.autoCalcDesc')}
            </p>
            <div className="text-xs text-indigo-600 space-y-1">
              <p>{t('calculatedMetrics.formula1')}</p>
              <p>{t('calculatedMetrics.formula2')}</p>
              <p>{t('calculatedMetrics.formula3')}</p>
              <p>{t('calculatedMetrics.formulaMore')}</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
