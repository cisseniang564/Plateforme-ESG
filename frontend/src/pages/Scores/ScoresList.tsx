import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award, TrendingUp, Building2, Calculator, Search,
  Leaf, Users, Scale, ArrowRight, History, Sparkles,
} from 'lucide-react';
import Spinner from '@/components/common/Spinner';
import BackButton from '@/components/common/BackButton';
import api from '@/services/api';

interface Organization {
  id: string;
  name: string;
  industry?: string;
  external_id?: string;
  country?: string;
}

interface OrgScore {
  overall_score: number;
  environmental_score: number;
  social_score: number;
  governance_score: number;
  grade: string;
  calculated_at: string;
}

const GRADE_COLOR: Record<string, { bg: string; text: string }> = {
  'A+': { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  A:   { bg: 'bg-green-100',   text: 'text-green-700'   },
  'B+': { bg: 'bg-lime-100',   text: 'text-lime-700'    },
  B:   { bg: 'bg-yellow-100',  text: 'text-yellow-700'  },
  C:   { bg: 'bg-orange-100',  text: 'text-orange-700'  },
  D:   { bg: 'bg-red-100',     text: 'text-red-700'     },
};

function ScoreBadge({ score, compact = false }: { score: OrgScore; compact?: boolean }) {
  const g = GRADE_COLOR[score.grade] ?? GRADE_COLOR['C'];
  if (compact) {
    return (
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${g.bg} ${g.text}`}>
        {score.grade}
      </span>
    );
  }
  return (
    <div className={`rounded-2xl px-4 py-2 text-center ${g.bg}`}>
      <p className={`text-2xl font-bold ${g.text}`}>{score.grade}</p>
      <p className={`text-xs font-medium ${g.text}`}>{score.overall_score.toFixed(0)}/100</p>
    </div>
  );
}

function PillarBar({ value, color, label }: { value: number; color: string; label: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500">{label}</span>
        <span className="font-medium text-gray-700">{value.toFixed(0)}</span>
      </div>
      <div className="w-full h-1.5 bg-gray-100 rounded-full">
        <div className="h-1.5 rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export default function ScoresList() {
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [scores, setScores] = useState<Record<string, OrgScore>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const orgRes = await api.get('/organizations');
      const list: Organization[] = orgRes.data.items || [];
      setOrgs(list);
      // Load latest score per org in parallel
      const scoreResults = await Promise.allSettled(
        list.map(o => api.get(`/scores/latest?organization_id=${o.id}`).then(r => ({ id: o.id, data: r.data })))
      );
      const map: Record<string, OrgScore> = {};
      scoreResults.forEach(r => { if (r.status === 'fulfilled') map[r.value.id] = r.value.data; });
      setScores(map);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = orgs.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    (o.industry ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const scored = filtered.filter(o => scores[o.id]);
  const unscored = filtered.filter(o => !scores[o.id]);
  const avgScore = scored.length > 0
    ? scored.reduce((acc, o) => acc + scores[o.id].overall_score, 0) / scored.length
    : null;

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center"><Spinner size="lg" /><p className="mt-4 text-gray-500">Chargement des scores…</p></div>
    </div>
  );

  return (
    <div className="space-y-6">
      <BackButton to="/app/scores" label="Scores ESG" />
      {/* Hero */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-violet-900 to-purple-800 p-8 text-white shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/15">
              <Award className="h-3.5 w-3.5" /> Scores ESG
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight">Tableau des Scores</h1>
            <p className="mt-2 text-sm text-white/80">Évaluations ESG par organisation · Piliers E, S, G</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Organisations', value: orgs.length },
              { label: 'Scorées', value: scored.length },
              { label: 'Score moyen', value: avgScore ? avgScore.toFixed(0) : '—' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10 text-center">
                <p className="text-xs uppercase tracking-wide text-white/70">{s.label}</p>
                <p className="mt-1 text-2xl font-semibold">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Search + actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher une organisation…"
            className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        <button
          onClick={() => navigate('/app/scores/calculate')}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 transition-colors"
        >
          <Calculator size={15} /> Calculer un score
        </button>
      </div>

      {orgs.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-16 text-center shadow-sm">
          <Building2 className="h-16 w-16 mx-auto text-gray-200 mb-4" />
          <p className="text-xl font-semibold text-gray-900">Aucune organisation</p>
          <p className="mt-2 text-gray-500 mb-6">Ajoutez des organisations pour calculer leurs scores ESG.</p>
          <button
            onClick={() => navigate('/app/organizations')}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-700 transition-colors"
          >
            <Building2 size={15} /> Gérer les organisations
          </button>
        </div>
      ) : (
        <>
          {/* Scored orgs */}
          {scored.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Scores calculés ({scored.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {scored.map(org => {
                  const s = scores[org.id];
                  return (
                    <div
                      key={org.id}
                      className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-violet-200 transition-all cursor-pointer"
                      onClick={() => navigate('/app/scores/breakdown')}
                    >
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{org.name}</h3>
                          {org.industry && <p className="text-xs text-gray-500 mt-0.5 capitalize">{org.industry}</p>}
                          {org.external_id && <p className="text-xs text-gray-400 mt-0.5">SIREN : {org.external_id}</p>}
                        </div>
                        <ScoreBadge score={s} />
                      </div>

                      <div className="space-y-2 mb-4">
                        <PillarBar value={s.environmental_score} color="#22c55e" label="E" />
                        <PillarBar value={s.social_score}        color="#3b82f6" label="S" />
                        <PillarBar value={s.governance_score}    color="#a855f7" label="G" />
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-400">
                          {new Date(s.calculated_at).toLocaleDateString('fr-FR')}
                        </p>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={e => { e.stopPropagation(); navigate('/app/scores/history'); }}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
                          >
                            <History size={11} /> Historique
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); navigate('/app/scores/breakdown'); }}
                            className="inline-flex items-center gap-1 rounded-lg bg-violet-50 border border-violet-200 px-2.5 py-1 text-xs text-violet-700 hover:bg-violet-100"
                          >
                            Détail <ArrowRight size={11} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Unscored orgs */}
          {unscored.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Non scorées ({unscored.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {unscored.map(org => (
                  <div key={org.id} className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-800">{org.name}</h3>
                        {org.industry && <p className="text-xs text-gray-500 mt-0.5 capitalize">{org.industry}</p>}
                      </div>
                      <div className="rounded-xl bg-gray-100 p-2">
                        <Building2 size={18} className="text-gray-400" />
                      </div>
                    </div>
                    <button
                      onClick={() => navigate('/app/scores/calculate')}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-50 transition-colors"
                    >
                      <Calculator size={14} /> Calculer le score
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom CTA */}
          <div className="rounded-2xl border border-violet-100 bg-violet-50 p-5 flex items-center gap-4">
            <Sparkles className="h-6 w-6 text-violet-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-violet-900">Obtenez des recommandations IA</p>
              <p className="text-sm text-violet-700 mt-0.5">Analysez vos scores et recevez des actions prioritaires pour progresser.</p>
            </div>
            <button
              onClick={() => navigate('/app/ai-insights')}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 transition-colors flex-shrink-0"
            >
              <TrendingUp size={15} /> Insights IA
            </button>
          </div>
        </>
      )}
    </div>
  );
}
