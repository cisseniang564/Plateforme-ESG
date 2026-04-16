import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Building2, ArrowLeft, TrendingUp, TrendingDown, Award,
  Calendar, Download, AlertCircle, CheckCircle, Activity,
  BarChart3, Zap, Target, Users, Minus
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell
} from 'recharts';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import { format } from 'date-fns';
import { getOrgScores, type OrgScore } from '@/services/esgScoringService';

interface Organization {
  id: string;
  name: string;
  external_id?: string;
  industry?: string;
  type?: string;
  created_at?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function scoreColor(s: number) {
  if (s >= 75) return '#16a34a';
  if (s >= 60) return '#2563eb';
  if (s >= 45) return '#ea580c';
  return '#dc2626';
}
function scoreBgBorder(s: number) {
  if (s >= 75) return 'bg-green-50 border-green-200';
  if (s >= 60) return 'bg-blue-50 border-blue-200';
  if (s >= 45) return 'bg-orange-50 border-orange-200';
  return 'bg-red-50 border-red-200';
}
function ratingCls(r: string) {
  if (r?.startsWith('A')) return 'bg-green-100 text-green-700 border-green-200';
  if (r?.startsWith('B')) return 'bg-blue-100 text-blue-700 border-blue-200';
  return 'bg-orange-100 text-orange-700 border-orange-200';
}

// ─── Score arc SVG ────────────────────────────────────────────────────────────
function ScoreArc({ score }: { score: number }) {
  const size = 140; const sw = 10;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(score, 100) / 100) * circ;
  const c = scoreColor(score);
  const track = score >= 75 ? '#dcfce7' : score >= 60 ? '#dbeafe' : score >= 45 ? '#ffedd5' : '#fee2e2';
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track} strokeWidth={sw} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth={sw}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold leading-none" style={{ color: c }}>{score}</span>
        <span className="text-xs text-gray-400 font-medium tracking-widest mt-1">/ 100</span>
      </div>
    </div>
  );
}

// ─── Pillar card ──────────────────────────────────────────────────────────────
function PillarCard({ label, score, icon: Icon, color }: { label: string; score: number; icon: any; color: string }) {
  return (
    <div className={`rounded-xl border p-5 ${scoreBgBorder(score)}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-600">{label}</span>
        <Icon className="h-5 w-5 opacity-40" style={{ color }} />
      </div>
      <div className="flex items-end gap-2 mb-3">
        <span className="text-3xl font-bold" style={{ color }}>{score}</span>
        <span className="text-sm text-gray-400 mb-0.5">/ 100</span>
      </div>
      <div className="w-full h-1.5 bg-white/70 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <p className="text-xs text-gray-500 mt-2">
        {score >= 70 ? 'Excellent' : score >= 50 ? 'Satisfaisant' : 'À améliorer'}
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function OrganizationDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scoreData, setScoreData] = useState<any>(null);
  const [noScores, setNoScores] = useState(false);

  useEffect(() => { if (id) loadOrganization(); }, [id]);

  const loadOrganization = async () => {
    setLoading(true);
    setError(null);
    try {
      let orgData: any = null;
      try {
        const res = await api.get(`/organizations/${id}`);
        orgData = res.data;
      } catch (e: any) {
        if (e?.response?.status === 429) {
          throw new Error('Trop de requêtes — réessayez dans quelques secondes');
        }
        try {
          const listRes = await api.get('/organizations');
          const orgs = listRes.data?.organizations || listRes.data?.items || [];
          orgData = orgs.find((o: any) => o.id === id);
          if (!orgData) throw new Error('Organisation introuvable');
        } catch (e2: any) {
          if (e2?.response?.status === 429) throw new Error('Trop de requêtes — réessayez dans quelques secondes');
          throw e2;
        }
      }
      setOrganization(orgData);

      const scoreHistory: OrgScore[] = await getOrgScores(id!, 12);
      if (scoreHistory.length === 0) {
        setNoScores(true);
      } else {
        const latest = scoreHistory[0];
        const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
        const evolution = [...scoreHistory].reverse().map(s => ({
          month: MONTHS[new Date(s.date).getMonth()],
          Global: s.overall_score,
          Environnement: s.environmental_score,
          Social: s.social_score,
          Gouvernance: s.governance_score,
        }));
        const radar = [
          { subject: 'Environnement', score: latest.environmental_score, fullMark: 100 },
          { subject: 'Social',        score: latest.social_score,        fullMark: 100 },
          { subject: 'Gouvernance',   score: latest.governance_score,    fullMark: 100 },
          { subject: 'Global',        score: latest.overall_score,       fullMark: 100 },
        ];
        // Sector comparison: only show real data for this org; benchmark shown as N/A until API available
        const sectorComparison = [
          { name: 'Cette org.', score: latest.overall_score },
        ];
        setScoreData({
          current: {
            overall: latest.overall_score,
            environmental: latest.environmental_score,
            social: latest.social_score,
            governance: latest.governance_score,
            rating: latest.rating ?? '—',
            trend: scoreHistory.length >= 2
              ? latest.overall_score - scoreHistory[1].overall_score
              : null,
            completeness: latest.data_completeness,
          },
          evolution,
          radar,
          sectorComparison,
        });
      }
    } catch (e: any) {
      setError(e.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-96"><Spinner size="lg" /></div>
  );

  if (error || !organization) return (
    <div className="flex flex-col items-center justify-center h-96 gap-4">
      <AlertCircle className="h-14 w-14 text-red-400" />
      <p className="text-lg font-semibold text-gray-800">Organisation introuvable</p>
      <p className="text-sm text-gray-500">{error}</p>
      <Button size="sm" onClick={() => navigate('/app/organizations')}>
        <ArrowLeft className="h-4 w-4 mr-2" />Retour à la liste
      </Button>
    </div>
  );

  const sc = scoreData?.current;

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="secondary" size="sm" onClick={() => navigate('/app/organizations')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                <Building2 className="h-5 w-5 text-primary-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{organization.name}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 ml-[52px] text-sm text-gray-500">
              {organization.industry && (
                <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs font-medium text-gray-600">
                  {organization.industry}
                </span>
              )}
              {organization.external_id && <span className="text-xs">{organization.external_id}</span>}
              {organization.created_at && (
                <span className="flex items-center gap-1 text-xs">
                  <Calendar className="h-3.5 w-3.5" />
                  Suivi depuis {format(new Date(organization.created_at), 'MMM yyyy')}
                </span>
              )}
            </div>
          </div>
        </div>
        <Button variant="secondary" size="sm">
          <Download className="h-4 w-4 mr-1.5" />Exporter
        </Button>
      </div>

      {/* ── No scores state ── */}
      {noScores && (
        <div className="text-center py-20 bg-gray-50 border border-dashed border-gray-200 rounded-2xl">
          <Award className="h-14 w-14 text-gray-200 mx-auto mb-4" />
          <p className="font-semibold text-gray-700 mb-1">Aucun score ESG calculé</p>
          <p className="text-sm text-gray-400 mb-6">Importez des données puis lancez le calcul du score.</p>
          <Button size="sm" onClick={() => navigate('/app/scores/calculate')}>
            <Zap className="h-4 w-4 mr-2" />Calculer le score ESG
          </Button>
        </div>
      )}

      {/* ── Score content ── */}
      {scoreData && sc && (
        <>
          {/* Hero card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">

              {/* Arc gauge */}
              <div className="flex-shrink-0">
                <ScoreArc score={sc.overall} />
                <p className="text-center text-xs text-gray-400 mt-1">Score ESG Global</p>
              </div>

              {/* Right side */}
              <div className="flex-1 min-w-0 space-y-4 w-full">
                {/* Rating + trend */}
                <div className="flex flex-wrap items-center gap-3">
                  {sc.rating && sc.rating !== '—' && (
                    <span className={`px-3 py-1 rounded-lg text-sm font-bold border ${ratingCls(sc.rating)}`}>
                      {sc.rating}
                    </span>
                  )}
                  {sc.trend != null ? (
                    sc.trend > 0 ? (
                      <span className="flex items-center gap-1 text-green-600 text-sm font-semibold bg-green-50 px-2.5 py-1 rounded-full">
                        <TrendingUp className="h-3.5 w-3.5" />+{sc.trend.toFixed(1)} pts
                      </span>
                    ) : sc.trend < 0 ? (
                      <span className="flex items-center gap-1 text-red-500 text-sm font-semibold bg-red-50 px-2.5 py-1 rounded-full">
                        <TrendingDown className="h-3.5 w-3.5" />{sc.trend.toFixed(1)} pts
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-gray-400 text-sm bg-gray-50 px-2.5 py-1 rounded-full">
                        <Minus className="h-3.5 w-3.5" />Stable
                      </span>
                    )
                  ) : null}
                </div>

                {/* E / S / G inline bars */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Environnement', key: 'E', score: sc.environmental, color: '#16a34a' },
                    { label: 'Social',        key: 'S', score: sc.social,        color: '#2563eb' },
                    { label: 'Gouvernance',   key: 'G', score: sc.governance,    color: '#7c3aed' },
                  ].map(({ label, key, score, color }) => (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500 font-medium">{label}</span>
                        <span className="text-sm font-bold" style={{ color }}>{score}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${score}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Data completeness */}
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-xs text-gray-500 whitespace-nowrap">Complétude données</span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-500 rounded-full" style={{ width: `${sc.completeness}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 w-10 text-right">{sc.completeness}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pillar detail cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <PillarCard label="Environnement" score={sc.environmental} icon={Target}       color="#16a34a" />
            <PillarCard label="Social"        score={sc.social}        icon={Users}        color="#2563eb" />
            <PillarCard label="Gouvernance"   score={sc.governance}    icon={CheckCircle}  color="#7c3aed" />
          </div>

          {/* Charts grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Evolution line chart */}
            {scoreData.evolution.length >= 2 ? (
              <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary-500" />Évolution temporelle
                </h3>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={scoreData.evolution} margin={{ top: 4, right: 8, bottom: 0, left: -15 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="Global"        stroke="#6366f1" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="Environnement" stroke="#16a34a" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                    <Line type="monotone" dataKey="Social"        stroke="#2563eb" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                    <Line type="monotone" dataKey="Gouvernance"   stroke="#7c3aed" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="lg:col-span-2 flex flex-col items-center justify-center py-12 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-sm text-gray-400">
                <BarChart3 className="h-8 w-8 mb-2 text-gray-200" />
                Historique insuffisant — minimum 2 scores requis
              </div>
            )}

            {/* Radar */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Profil multidimensionnel</h3>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={scoreData.radar} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} tickCount={5} />
                  <Radar name="Score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Sector comparison */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Comparaison sectorielle</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={scoreData.sectorComparison} layout="vertical" margin={{ left: 10, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" width={88} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="score" radius={[0, 6, 6, 0]} maxBarSize={28}>
                    {scoreData.sectorComparison.map((_: any, i: number) => (
                      <Cell key={i} fill={i === 0 ? '#6366f1' : i === 1 ? '#94a3b8' : '#10b981'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Zap className="h-4 w-4 text-orange-500" />Recommandations
            </h3>
            <div className="space-y-2.5">
              {(() => {
                const pillars = [
                  { key: 'Environnement', score: sc.environmental },
                  { key: 'Social', score: sc.social },
                  { key: 'Gouvernance', score: sc.governance },
                ].sort((a, b) => a.score - b.score);
                const weakest = pillars[0];
                const strongest = pillars[pillars.length - 1];
                const items = [];
                if (weakest.score < 50) {
                  items.push({ icon: AlertCircle, iconCls: 'text-red-500', bg: 'bg-red-50 border-red-100', title: 'Priorité haute', desc: `Le pilier ${weakest.key} (${weakest.score}/100) est en dessous du seuil acceptable. Renforcer la collecte de données et les actions correctives.` });
                } else if (weakest.score < 70) {
                  items.push({ icon: Activity, iconCls: 'text-orange-500', bg: 'bg-orange-50 border-orange-100', title: 'Priorité moyenne', desc: `Le pilier ${weakest.key} (${weakest.score}/100) peut être amélioré. Documenter les politiques et renforcer les indicateurs manquants.` });
                }
                if (sc.completeness != null && sc.completeness < 70) {
                  items.push({ icon: Activity, iconCls: 'text-orange-500', bg: 'bg-orange-50 border-orange-100', title: 'Complétude insuffisante', desc: `La complétude des données est de ${sc.completeness}%. Saisir davantage d'indicateurs pour améliorer la fiabilité du score.` });
                }
                items.push({ icon: CheckCircle, iconCls: 'text-green-500', bg: 'bg-green-50 border-green-100', title: 'Point fort', desc: `Le pilier ${strongest.key} (${strongest.score}/100) est le meilleur atout de cette organisation.` });
                return items.map(({ icon: Icon, iconCls, bg, title, desc }) => (
                  <div key={title} className={`flex gap-3 p-3.5 rounded-lg border ${bg}`}>
                    <Icon className={`h-4 w-4 flex-shrink-0 mt-0.5 ${iconCls}`} />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
