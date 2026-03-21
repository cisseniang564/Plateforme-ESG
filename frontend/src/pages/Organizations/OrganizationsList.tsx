import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  Download,
  BarChart3,
  Eye,
  Zap,
  Award,
  ArrowUpDown,
  Grid3x3,
  List,
  Sparkles,
  Activity,
  X
} from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import { generateConsistentScores } from '@/utils/mockScores';

interface Organization {
  id: string;
  name: string;
  external_id?: string;
  industry?: string;
  type?: string;
  esg_score?: number;
  environmental_score?: number;
  social_score?: number;
  governance_score?: number;
  rating?: string;
  trend?: number;
  data_completeness?: number;
}

type ViewMode = 'grid' | 'list';
type SortBy = 'name' | 'score' | 'rating';

export default function OrganizationsList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all');
  const [selectedRating, setSelectedRating] = useState<string>('all');
  const [scoreRange, setScoreRange] = useState<[number, number]>([0, 100]);

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('score');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      const res = await api.get('/organizations');
      const orgs = res.data?.organizations || res.data?.items || [];

      const enrichedOrgs = orgs.map((org: any) => {
        const scores = generateConsistentScores(org.id);
        return {
          ...org,
          esg_score: scores.overall,
          environmental_score: scores.environmental,
          social_score: scores.social,
          governance_score: scores.governance,
          rating: scores.rating,
          trend: scores.trend,
          data_completeness: scores.data_completeness
        };
      });

      setOrganizations(enrichedOrgs);
    } catch (error) {
      console.error('Error loading organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSorted = useMemo(() => {
    let result = organizations.filter(org => {
      const matchesSearch = org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           org.external_id?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesIndustry = selectedIndustry === 'all' || org.industry === selectedIndustry;
      const matchesRating = selectedRating === 'all' || org.rating === selectedRating;
      const matchesScore = (org.esg_score || 0) >= scoreRange[0] && (org.esg_score || 0) <= scoreRange[1];

      return matchesSearch && matchesIndustry && matchesRating && matchesScore;
    });

    result.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;

      if (sortBy === 'name') {
        return a.name.localeCompare(b.name) * dir;
      }
      if (sortBy === 'score') {
        return ((b.esg_score || 0) - (a.esg_score || 0)) * dir;
      }
      if (sortBy === 'rating') {
        const ratings = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC', 'CC', 'C'];
        return (ratings.indexOf(a.rating || 'C') - ratings.indexOf(b.rating || 'C')) * dir;
      }

      return 0;
    });

    return result;
  }, [organizations, searchQuery, selectedIndustry, selectedRating, scoreRange, sortBy, sortDir]);

  const industries = useMemo(() =>
    Array.from(new Set(organizations.map(o => o.industry).filter(Boolean))) as string[],
    [organizations]
  );

  const ratings = useMemo(() =>
    Array.from(new Set(organizations.map(o => o.rating).filter(Boolean))).sort(),
    [organizations]
  );

  const stats = useMemo(() => ({
    total: organizations.length,
    avgScore: Math.round(organizations.reduce((sum, o) => sum + (o.esg_score || 0), 0) / organizations.length),
    topPerformers: organizations.filter(o => (o.esg_score || 0) >= 75).length,
    improving: organizations.filter(o => (o.trend || 0) > 0).length,
    sectors: industries.length
  }), [organizations, industries]);

  const getRatingColor = (rating: string) => {
    if (rating?.startsWith('A')) return 'bg-green-100 text-green-800 border-green-200';
    if (rating?.startsWith('B')) return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-orange-100 text-orange-800 border-orange-200';
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 45) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 75) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 45) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const activeFilters = useMemo(() => {
    const filters = [];
    if (selectedIndustry !== 'all') filters.push({ key: 'industry', label: selectedIndustry });
    if (selectedRating !== 'all') filters.push({ key: 'rating', label: `Rating ${selectedRating}` });
    if (scoreRange[0] !== 0 || scoreRange[1] !== 100)
      filters.push({ key: 'score', label: `Score ${scoreRange[0]}-${scoreRange[1]}` });
    return filters;
  }, [selectedIndustry, selectedRating, scoreRange]);

  const clearFilters = () => {
    setSelectedIndustry('all');
    setSelectedRating('all');
    setScoreRange([0, 100]);
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary-600" />
            {t('organizations.title')}
          </h1>
          <p className="text-gray-600 mt-1">
            {filteredAndSorted.length} {t('organizations.company')}{filteredAndSorted.length > 1 ? 's' : ''}
            {filteredAndSorted.length !== organizations.length && ` ${t('organizations.outOf')} ${organizations.length}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => navigate('/app/organizations/compare')}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            {t('organizations.compare')}
          </Button>
          <Button onClick={() => {}}>
            <Download className="h-4 w-4 mr-2" />
            {t('common.export')}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-primary-700 font-medium">{t('common.total')}</p>
              <p className="text-3xl font-bold text-primary-900 mt-1">{stats.total}</p>
            </div>
            <Building2 className="h-10 w-10 text-primary-600 opacity-50" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 font-medium">{t('organizations.avgScore')}</p>
              <p className="text-3xl font-bold text-green-900 mt-1">{stats.avgScore}</p>
            </div>
            <Zap className="h-10 w-10 text-green-600 opacity-50" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700 font-medium">{t('organizations.topAPlus')}</p>
              <p className="text-3xl font-bold text-blue-900 mt-1">{stats.topPerformers}</p>
            </div>
            <Award className="h-10 w-10 text-blue-600 opacity-50" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-700 font-medium">{t('organizations.improving')}</p>
              <p className="text-3xl font-bold text-purple-900 mt-1">{stats.improving}</p>
            </div>
            <TrendingUp className="h-10 w-10 text-purple-600 opacity-50" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-700 font-medium">{t('organizations.sectors')}</p>
              <p className="text-3xl font-bold text-orange-900 mt-1">{stats.sectors}</p>
            </div>
            <Sparkles className="h-10 w-10 text-orange-600 opacity-50" />
          </div>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card>
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={t('organizations.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Sector */}
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={selectedIndustry}
                onChange={(e) => setSelectedIndustry(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 min-w-[180px]"
              >
                <option value="all">{t('organizations.allSectors')}</option>
                {industries.map(industry => (
                  <option key={industry} value={industry}>{industry}</option>
                ))}
              </select>
            </div>

            {/* Rating */}
            <select
              value={selectedRating}
              onChange={(e) => setSelectedRating(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 min-w-[150px]"
            >
              <option value="all">{t('organizations.allRatings')}</option>
              {ratings.map(rating => (
                <option key={rating} value={rating}>Rating {rating}</option>
              ))}
            </select>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-5 w-5 text-gray-400" />
              <select
                value={`${sortBy}-${sortDir}`}
                onChange={(e) => {
                  const [sort, dir] = e.target.value.split('-');
                  setSortBy(sort as SortBy);
                  setSortDir(dir as 'asc' | 'desc');
                }}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="score-desc">{t('organizations.sortScoreDesc')}</option>
                <option value="score-asc">{t('organizations.sortScoreAsc')}</option>
                <option value="name-asc">{t('organizations.sortNameAZ')}</option>
                <option value="name-desc">{t('organizations.sortNameZA')}</option>
                <option value="rating-asc">{t('organizations.sortRatingAsc')}</option>
                <option value="rating-desc">{t('organizations.sortRatingDesc')}</option>
              </select>
            </div>

            {/* View mode */}
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-2.5 flex items-center gap-2 transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Grid3x3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2.5 flex items-center gap-2 border-l border-gray-300 transition-colors ${
                  viewMode === 'list'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Active filters */}
          {activeFilters.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-600">{t('organizations.activeFilters')}:</span>
              {activeFilters.map(filter => (
                <span
                  key={filter.key}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
                >
                  {filter.label}
                  <button
                    onClick={() => {
                      if (filter.key === 'industry') setSelectedIndustry('all');
                      if (filter.key === 'rating') setSelectedRating('all');
                      if (filter.key === 'score') setScoreRange([0, 100]);
                    }}
                    className="hover:text-primary-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <button
                onClick={clearFilters}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                {t('organizations.clearAll')}
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* Grid / List mode */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAndSorted.map(org => (
            <Card
              key={org.id}
              className="hover:shadow-xl transition-all cursor-pointer group"
              onClick={() => navigate(`/app/organizations/${org.id}`)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 text-lg mb-1 truncate group-hover:text-primary-600 transition-colors">
                    {org.name}
                  </h3>
                  {org.external_id && (
                    <p className="text-xs text-gray-500">{org.external_id}</p>
                  )}
                </div>
                {org.rating && (
                  <span className={`flex-shrink-0 px-3 py-1 rounded-lg text-sm font-bold border-2 ${getRatingColor(org.rating)}`}>
                    {org.rating}
                  </span>
                )}
              </div>

              {org.industry && (
                <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full mb-4">
                  {org.industry}
                </span>
              )}

              {/* ESG Score */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 font-medium">{t('organizations.globalEsgScore')}</span>
                  <span className={`text-3xl font-bold ${getScoreColor(org.esg_score || 0)}`}>
                    {org.esg_score}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-3 rounded-full transition-all ${getScoreBgColor(org.esg_score || 0)}`}
                    style={{ width: `${org.esg_score || 0}%` }}
                  />
                </div>
              </div>

              {/* E/S/G pillars */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">E</p>
                  <p className="text-lg font-bold text-green-600">{org.environmental_score}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">S</p>
                  <p className="text-lg font-bold text-blue-600">{org.social_score}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">G</p>
                  <p className="text-lg font-bold text-purple-600">{org.governance_score}</p>
                </div>
              </div>

              {/* Trend */}
              {org.trend !== undefined && (
                <div className="flex items-center gap-2 text-sm pb-4 border-b border-gray-200 mb-4">
                  {org.trend > 0 ? (
                    <>
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="text-green-600 font-semibold">+{org.trend.toFixed(1)}%</span>
                      <span className="text-gray-500">{t('organizations.vsPrevPeriod')}</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-4 w-4 text-red-600" />
                      <span className="text-red-600 font-semibold">{org.trend.toFixed(1)}%</span>
                      <span className="text-gray-500">{t('organizations.vsPrevPeriod')}</span>
                    </>
                  )}
                </div>
              )}

              {/* Completeness */}
              <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                <span>{t('organizations.dataCompleteness')}</span>
                <span className="font-semibold">{org.data_completeness}%</span>
              </div>

              {/* Actions */}
              <Button
                size="sm"
                variant="secondary"
                className="w-full group-hover:bg-primary-600 group-hover:text-white transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/app/organizations/${org.id}`);
                }}
              >
                <Eye className="h-4 w-4 mr-2" />
                {t('organizations.viewDetails')}
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">
                    {t('organizations.organization')}
                  </th>
                  <th className="text-center py-4 px-6 font-semibold text-gray-700 text-sm">
                    Rating
                  </th>
                  <th className="text-center py-4 px-6 font-semibold text-gray-700 text-sm">
                    {t('organizations.globalScore')}
                  </th>
                  <th className="text-center py-4 px-6 font-semibold text-gray-700 text-sm">
                    E / S / G
                  </th>
                  <th className="text-center py-4 px-6 font-semibold text-gray-700 text-sm">
                    {t('organizations.trend')}
                  </th>
                  <th className="text-right py-4 px-6 font-semibold text-gray-700 text-sm">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAndSorted.map(org => (
                  <tr
                    key={org.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/app/organizations/${org.id}`)}
                  >
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-semibold text-gray-900">{org.name}</p>
                        <p className="text-sm text-gray-500">{org.industry}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      {org.rating && (
                        <span className={`inline-block px-3 py-1 rounded-lg text-sm font-bold border-2 ${getRatingColor(org.rating)}`}>
                          {org.rating}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`text-2xl font-bold ${getScoreColor(org.esg_score || 0)}`}>
                        {org.esg_score}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-3 text-sm">
                        <span className="text-green-600 font-semibold">{org.environmental_score}</span>
                        <span className="text-gray-300">/</span>
                        <span className="text-blue-600 font-semibold">{org.social_score}</span>
                        <span className="text-gray-300">/</span>
                        <span className="text-purple-600 font-semibold">{org.governance_score}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {(org.trend || 0) > 0 ? (
                          <>
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            <span className="text-green-600 font-semibold">+{org.trend?.toFixed(1)}%</span>
                          </>
                        ) : (
                          <>
                            <TrendingDown className="h-4 w-4 text-red-600" />
                            <span className="text-red-600 font-semibold">{org.trend?.toFixed(1)}%</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/app/organizations/${org.id}`);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        {t('common.details')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {filteredAndSorted.length === 0 && (
        <Card>
          <div className="text-center py-16">
            <Activity className="h-20 w-20 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-xl font-medium mb-2">{t('organizations.notFound')}</p>
            <p className="text-gray-500 mb-4">
              {t('organizations.tryModifySearch')}
            </p>
            <Button variant="secondary" onClick={clearFilters}>
              {t('organizations.resetFilters')}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
