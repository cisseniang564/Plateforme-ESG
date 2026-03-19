import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, TrendingUp, Leaf, Users, Scale } from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import toast from 'react-hot-toast';

interface Indicator {
  id: string;
  code: string;
  name: string;
  pillar: string;
  category: string;
  unit: string;
  description: string;
  is_active: boolean;
}

const PILLARS = [
  { id: 'environmental', name: 'Environnemental', icon: Leaf, color: 'green' },
  { id: 'social', name: 'Social', icon: Users, color: 'blue' },
  { id: 'governance', name: 'Gouvernance', icon: Scale, color: 'purple' },
];

export default function IndicatorsList() {
  const navigate = useNavigate();
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pillarFilter, setPillarFilter] = useState('');

  useEffect(() => {
    loadIndicators();
  }, [pillarFilter]);

  const loadIndicators = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (pillarFilter) params.append('pillar', pillarFilter);
      
      const response = await api.get(`/indicators?${params.toString()}`);
      console.log('Indicators response:', response.data);
      setIndicators(response.data || []);
    } catch (error: any) {
      console.error('Error loading indicators:', error);
      toast.error('Erreur lors du chargement des indicateurs');
      setIndicators([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredIndicators = indicators.filter(ind =>
    ind.name.toLowerCase().includes(search.toLowerCase()) ||
    ind.code.toLowerCase().includes(search.toLowerCase())
  );

  const getPillarIcon = (pillar: string) => {
    const p = PILLARS.find(p => p.id === pillar);
    return p ? p.icon : TrendingUp;
  };

  const getPillarColor = (pillar: string) => {
    const p = PILLARS.find(p => p.id === pillar);
    return p ? p.color : 'gray';
  };

  const getStats = (pillar?: string) => {
    if (pillar) {
      return indicators.filter(i => i.pillar === pillar).length;
    }
    return indicators.length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-green-600 to-teal-700 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              <TrendingUp className="h-10 w-10" />
              Indicateurs ESG
            </h1>
            <p className="text-green-100 text-lg">
              Gérez vos {getStats()} indicateurs de performance environnementale, sociale et de gouvernance
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-teal-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Indicateurs</p>
              <p className="text-3xl font-bold text-gray-900">{getStats()}</p>
            </div>
            <div className="p-3 bg-teal-50 rounded-xl">
              <TrendingUp className="h-6 w-6 text-teal-600" />
            </div>
          </div>
        </Card>

        {PILLARS.map(pillar => {
          const Icon = pillar.icon;
          const count = getStats(pillar.id);
          return (
            <Card key={pillar.id} className={`border-l-4 border-${pillar.color}-500`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{pillar.name}</p>
                  <p className={`text-3xl font-bold text-${pillar.color}-600`}>{count}</p>
                </div>
                <div className={`p-3 bg-${pillar.color}-50 rounded-xl`}>
                  <Icon className={`h-6 w-6 text-${pillar.color}-600`} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un indicateur..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setPillarFilter('')}
              className={`px-4 py-2 rounded-lg font-medium ${
                pillarFilter === '' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              Tous ({getStats()})
            </button>
            {PILLARS.map(pillar => (
              <button
                key={pillar.id}
                onClick={() => setPillarFilter(pillar.id)}
                className={`px-4 py-2 rounded-lg font-medium ${
                  pillarFilter === pillar.id
                    ? `bg-${pillar.color}-600 text-white`
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {pillar.name} ({getStats(pillar.id)})
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Indicators List */}
      <Card>
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : filteredIndicators.length === 0 ? (
          <div className="text-center py-16">
            <TrendingUp className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <p className="text-xl text-gray-900 font-semibold mb-2">
              Aucun indicateur trouvé
            </p>
            <p className="text-gray-600">
              {search ? 'Essayez une autre recherche' : 'Créez votre premier indicateur'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredIndicators.map((indicator) => {
              const Icon = getPillarIcon(indicator.pillar);
              const color = getPillarColor(indicator.pillar);
              
              return (
                <div
                  key={indicator.id}
                  onClick={() => navigate(`/indicators/${indicator.id}`)}
                  className="p-4 border border-gray-200 rounded-xl hover:border-teal-500 hover:shadow-lg transition-all cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 bg-${color}-50 rounded-lg`}>
                      <Icon className={`h-5 w-5 text-${color}-600`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 font-mono">{indicator.code}</p>
                      <h3 className="font-semibold text-gray-900 mb-1 truncate">
                        {indicator.name}
                      </h3>
                      {indicator.category && (
                        <p className="text-xs text-gray-600 mb-2">{indicator.category}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded bg-${color}-100 text-${color}-800`}>
                          {indicator.pillar}
                        </span>
                        <span className="text-xs text-gray-500">{indicator.unit}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
