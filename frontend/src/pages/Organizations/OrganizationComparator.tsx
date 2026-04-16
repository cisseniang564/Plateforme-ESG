import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Building2, ArrowLeft, Download, Share2, TrendingUp, TrendingDown,
  Award, CheckCircle, XCircle, Search, Plus, X, BarChart3, Activity, Minus
} from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import { getOrgLatestScore } from '@/services/esgScoringService';

interface Organization {
  id: string;
  name: string;
  external_id?: string;
  industry?: string;
}

interface OrgWithScores extends Organization {
  scores: {
    overall: number;
    environmental: number;
    social: number;
    governance: number;
    rating: string;
  };
}

const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

function scoreColor(s: number) {
  if (s >= 75) return 'text-green-600';
  if (s >= 60) return 'text-blue-600';
  if (s >= 45) return 'text-orange-500';
  return 'text-red-500';
}
function ratingCls(r: string) {
  if (r?.startsWith('A')) return 'bg-green-100 text-green-700 border-green-200';
  if (r?.startsWith('B')) return 'bg-blue-100 text-blue-700 border-blue-200';
  if (r === '—') return 'bg-gray-100 text-gray-400 border-gray-200';
  return 'bg-orange-100 text-orange-700 border-orange-200';
}

const EMPTY_SCORES = { overall: 0, environmental: 0, social: 0, governance: 0, rating: '—' };

export default function OrganizationComparator() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [allOrgs, setAllOrgs] = useState<Organization[]>([]);
  const [selected, setSelected] = useState<OrgWithScores[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { loadOrganizations(); }, []);

  useEffect(() => {
    const ids = searchParams.get('ids')?.split(',').filter(Boolean) || [];
    if (ids.length > 0 && allOrgs.length > 0) {
      const matching = allOrgs.filter(o => ids.includes(o.id)).slice(0, 5);
      Promise.all(matching.map(async org => {
        const s = await getOrgLatestScore(org.id);
        return { ...org, scores: s ? { overall: s.overall_score, environmental: s.environmental_score, social: s.social_score, governance: s.governance_score, rating: s.rating ?? '—' } : EMPTY_SCORES };
      })).then(setSelected);
    }
  }, [searchParams, allOrgs]);

  const loadOrganizations = async () => {
    try {
      const res = await api.get('/organizations');
      setAllOrgs(res.data?.organizations || res.data?.items || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const toggleOrg = async (org: Organization) => {
    const isSelected = selected.find(o => o.id === org.id);
    if (isSelected) {
      const next = selected.filter(o => o.id !== org.id);
      setSelected(next);
      updateUrl(next);
    } else {
      if (selected.length >= 5) return;
      setAdding(org.id);
      const s = await getOrgLatestScore(org.id);
      const orgWithScores: OrgWithScores = {
        ...org,
        scores: s ? { overall: s.overall_score, environmental: s.environmental_score, social: s.social_score, governance: s.governance_score, rating: s.rating ?? '—' } : EMPTY_SCORES,
      };
      const next = [...selected, orgWithScores];
      setSelected(next);
      updateUrl(next);
      setAdding(null);
    }
  };

  const updateUrl = (orgs: OrgWithScores[]) => {
    orgs.length > 0 ? setSearchParams({ ids: orgs.map(o => o.id).join(',') }) : setSearchParams({});
  };

  const filteredOrgs = useMemo(() =>
    allOrgs.filter(o => o.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [allOrgs, searchQuery]);

  const radarData = useMemo(() => {
    if (!selected.length) return [];
    return [
      { subject: 'Global',        ...Object.fromEntries(selected.map(o => [o.name, o.scores.overall])) },
      { subject: 'Environnement', ...Object.fromEntries(selected.map(o => [o.name, o.scores.environmental])) },
      { subject: 'Social',        ...Object.fromEntries(selected.map(o => [o.name, o.scores.social])) },
      { subject: 'Gouvernance',   ...Object.fromEntries(selected.map(o => [o.name, o.scores.governance])) },
    ];
  }, [selected]);

  const barData = useMemo(() =>
    selected.map(org => ({
      name: org.name.length > 14 ? org.name.slice(0, 14) + '…' : org.name,
      E: org.scores.environmental,
      S: org.scores.social,
      G: org.scores.governance,
    })),
    [selected]);

  const insights = useMemo(() => {
    if (!selected.length) return null;
    const best = selected.reduce((b, o) => o.scores.overall > b.scores.overall ? o : b);
    const worst = selected.reduce((b, o) => o.scores.overall < b.scores.overall ? o : b);
    const avg = Math.round(selected.reduce((s, o) => s + o.scores.overall, 0) / selected.length);
    const bestEnv = selected.reduce((b, o) => o.scores.environmental > b.scores.environmental ? o : b);
    return { best, worst, avg, bestEnv, gap: best.scores.overall - worst.scores.overall };
  }, [selected]);

  const exportCSV = () => {
    if (!selected.length) return;
    const rows = [
      ['Organisation','Score Global','E','S','G','Rating'],
      ...selected.map(o => [o.name, o.scores.overall, o.scores.environmental, o.scores.social, o.scores.governance, o.scores.rating]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
      download: 'comparaison-esg.csv',
    });
    a.click();
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">

      {/* ── Hero gradient ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-700 via-purple-700 to-violet-800 p-8 text-white shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0id2hpdGUiIGZpbGwtb3BhY2l0eT0iMC4wOCIvPjwvc3ZnPg==')] opacity-60" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <button
              onClick={() => navigate('/app/organizations')}
              className="mb-4 inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-white/80 hover:bg-white/20 transition-colors"
            >
              <ArrowLeft size={14} /> Retour
            </button>
            <h1 className="text-3xl font-bold mb-1 flex items-center gap-3">
              <BarChart3 className="h-8 w-8 opacity-80" />
              Comparateur d'organisations ESG
            </h1>
            <p className="text-indigo-100 text-sm">
              Comparez jusqu'à 5 organisations côte-à-côte — scores E / S / G, radar multidimensionnel
            </p>
            {selected.length > 0 && (
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="px-2.5 py-1 bg-white/20 rounded-full text-xs font-semibold">
                  {selected.length} organisation{selected.length > 1 ? 's' : ''} sélectionnée{selected.length > 1 ? 's' : ''}
                </span>
                {selected.map((org, i) => (
                  <span key={org.id} className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: `${['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6'][i]}40`, color: 'white', border: `1px solid ${['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6'][i]}80` }}>
                    {org.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => navigator.clipboard.writeText(window.location.href)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-colors"
            >
              <Share2 size={14} /> Partager
            </button>
            <button
              onClick={exportCSV}
              disabled={!selected.length}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
            >
              <Download size={14} /> CSV
            </button>
          </div>
        </div>
      </div>

      {/* ── Selection panel ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">
            Organisations sélectionnées
            <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs font-normal">
              {selected.length}/5
            </span>
          </h2>
          {selected.length > 0 && (
            <button onClick={() => { setSelected([]); setSearchParams({}); }}
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
              <X className="h-3.5 w-3.5" />Tout effacer
            </button>
          )}
        </div>

        {/* Chips */}
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {selected.map((org, i) => (
              <span key={org.id}
                className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: PALETTE[i] }}>
                {org.name.length > 22 ? org.name.slice(0, 22) + '…' : org.name}
                <button onClick={() => toggleOrg(org)}
                  className="hover:bg-white/20 rounded-full p-0.5 transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher une organisation…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Org grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-56 overflow-y-auto pr-1">
          {filteredOrgs.map(org => {
            const isSelected = !!selected.find(o => o.id === org.id);
            const idx = selected.findIndex(o => o.id === org.id);
            const isAdding = adding === org.id;
            return (
              <button
                key={org.id}
                onClick={() => toggleOrg(org)}
                disabled={isAdding || (!isSelected && selected.length >= 5)}
                className={`p-3 rounded-lg border-2 text-left transition-all text-xs disabled:opacity-40 disabled:cursor-not-allowed ${
                  isSelected
                    ? 'border-transparent text-white'
                    : 'border-gray-100 bg-white hover:border-gray-300 text-gray-700'
                }`}
                style={isSelected ? { backgroundColor: PALETTE[idx] } : undefined}
              >
                <div className="flex items-start justify-between gap-1">
                  <span className="line-clamp-2 font-medium leading-snug">{org.name}</span>
                  {isAdding ? (
                    <div className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin flex-shrink-0 mt-0.5" />
                  ) : isSelected ? (
                    <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5 opacity-80" />
                  ) : (
                    <Plus className="h-4 w-4 flex-shrink-0 mt-0.5 text-gray-400" />
                  )}
                </div>
                {org.industry && <p className="text-gray-400 mt-1 truncate" style={isSelected ? { color: 'rgba(255,255,255,0.7)' } : undefined}>{org.industry}</p>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Empty state ── */}
      {selected.length === 0 && (
        <div className="text-center py-20 bg-white border border-dashed border-gray-200 rounded-xl">
          <Building2 className="h-14 w-14 text-gray-200 mx-auto mb-4" />
          <p className="font-semibold text-gray-700 mb-1">Aucune organisation sélectionnée</p>
          <p className="text-sm text-gray-400">Choisissez au moins 2 organisations pour comparer leurs scores ESG.</p>
        </div>
      )}

      {selected.length >= 1 && (
        <>
          {/* ── KPI insights ── */}
          {insights && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Meilleur score', value: insights.best.scores.overall, sub: insights.best.name, color: 'text-green-600', bg: 'bg-green-50', icon: Award },
                { label: 'Score moyen',    value: insights.avg,                  sub: `${selected.length} organisations`,  color: 'text-blue-600',  bg: 'bg-blue-50',  icon: Activity },
                { label: 'Écart max',      value: `${Math.round(insights.gap)} pts`, sub: 'entre min et max', color: 'text-orange-500', bg: 'bg-orange-50', icon: TrendingUp },
                { label: 'Leader Env.',    value: insights.bestEnv.scores.environmental, sub: insights.bestEnv.name, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle },
              ].map(({ label, value, sub, color, bg, icon: Icon }) => (
                <div key={label} className={`${bg} rounded-xl p-4`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500 font-medium">{label}</span>
                    <Icon className={`h-4 w-4 ${color} opacity-60`} />
                  </div>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{sub}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── Comparison table ── */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">Tableau comparatif</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">Indicateur</th>
                    {selected.map((org, i) => (
                      <th key={org.id} className="text-center px-4 py-3 text-xs font-semibold text-gray-700">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PALETTE[i] }} />
                          <span className="truncate max-w-[100px]">{org.name}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {/* Global score */}
                  {(() => {
                    const maxGlobal = Math.max(...selected.map(o => o.scores.overall));
                    return (
                      <tr className="hover:bg-gray-50/50">
                        <td className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Score ESG</td>
                        {selected.map(org => (
                          <td key={org.id} className="px-4 py-3.5 text-center">
                            <span className={`text-2xl font-bold ${scoreColor(org.scores.overall)} ${org.scores.overall === maxGlobal ? 'underline decoration-dotted underline-offset-4' : ''}`}>
                              {org.scores.overall || '—'}
                            </span>
                            {org.scores.overall === maxGlobal && selected.length > 1 && (
                              <Award className="inline-block ml-1 h-3.5 w-3.5 text-yellow-500 mb-1" />
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })()}

                  {/* Rating */}
                  <tr className="hover:bg-gray-50/50">
                    <td className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rating</td>
                    {selected.map(org => (
                      <td key={org.id} className="px-4 py-3.5 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold border ${ratingCls(org.scores.rating)}`}>
                          {org.scores.rating}
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* Pillars */}
                  {[
                    { label: 'Environnement', key: 'environmental' as const, color: 'text-green-600' },
                    { label: 'Social',        key: 'social' as const,        color: 'text-blue-600' },
                    { label: 'Gouvernance',   key: 'governance' as const,     color: 'text-purple-600' },
                  ].map(({ label, key, color }) => {
                    const maxVal = Math.max(...selected.map(o => o.scores[key]));
                    return (
                      <tr key={key} className="hover:bg-gray-50/50">
                        <td className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</td>
                        {selected.map(org => (
                          <td key={org.id} className="px-4 py-3 text-center">
                            <div>
                              <span className={`text-lg font-bold ${org.scores[key] === maxVal && selected.length > 1 ? color : 'text-gray-700'}`}>
                                {org.scores[key] || '—'}
                              </span>
                              <div className="mt-1 mx-auto w-16 h-1 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-current opacity-40"
                                  style={{
                                    width: `${org.scores[key]}%`,
                                    backgroundColor: key === 'environmental' ? '#16a34a' : key === 'social' ? '#2563eb' : '#7c3aed',
                                  }} />
                              </div>
                            </div>
                          </td>
                        ))}
                      </tr>
                    );
                  })}

                  {/* Sector */}
                  <tr className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Secteur</td>
                    {selected.map(org => (
                      <td key={org.id} className="px-4 py-3 text-center text-xs text-gray-500">
                        {org.industry || <span className="text-gray-300">—</span>}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Charts ── */}
          {selected.length >= 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Radar */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Vue multidimensionnelle</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} tickCount={5} />
                    {selected.map((org, i) => (
                      <Radar key={org.id} name={org.name} dataKey={org.name}
                        stroke={PALETTE[i]} fill={PALETTE[i]} fillOpacity={0.15} strokeWidth={2} />
                    ))}
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Bar chart */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Comparaison E / S / G</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={barData} margin={{ left: -10, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="E" fill="#16a34a" name="Environnement" radius={[3, 3, 0, 0]} maxBarSize={20} />
                    <Bar dataKey="S" fill="#2563eb" name="Social"        radius={[3, 3, 0, 0]} maxBarSize={20} />
                    <Bar dataKey="G" fill="#7c3aed" name="Gouvernance"   radius={[3, 3, 0, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
