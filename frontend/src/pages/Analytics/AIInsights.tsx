/**
 * AI ESG Insights — Recommandations intelligentes et actions prioritaires
 * basées sur l'analyse des scores ESG et de la couverture des données.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain, Sparkles, Zap, TrendingUp, Shield, Leaf, Users, Scale,
  ChevronRight, CheckCircle, AlertTriangle, Clock, ArrowLeft,
  BarChart3, Target, Lightbulb, Award, RefreshCw, Star,
  ArrowUpRight, Activity,
} from 'lucide-react';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

interface Scores {
  overall: number; environmental: number; social: number; governance: number;
  rating: string | null; rating_label: string; score_date: string | null; data_completeness: number;
}
interface Risk { pillar: string; label: string; level: 'high' | 'medium' | 'low'; }
interface Recommendation {
  id: string; pillar: string; pillar_label: string; pillar_color: string;
  title: string; description: string; quick_win: boolean;
  effort: string; effort_label: string; impact: string; impact_label: string;
  score_gain_est: number; tags: string[]; actions: string[];
}
interface InsightsData {
  scores: Scores; data_count: number; strengths: string[]; risks: Risk[];
  recommendations: Recommendation[]; quick_wins: Recommendation[]; strategic_actions: Recommendation[];
  total_recommendations: number; total_gain_estimate: number; has_score: boolean;
}

const PILLAR_STYLES: Record<string, { bg: string; text: string; border: string; icon: React.ElementType; badge: string }> = {
  environmental: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: Leaf,  badge: 'bg-emerald-100 text-emerald-800' },
  social:        { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    icon: Users, badge: 'bg-blue-100 text-blue-800' },
  governance:    { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200',  icon: Scale, badge: 'bg-purple-100 text-purple-800' },
};
const EFFORT_COLOR: Record<string, string> = { low: 'bg-green-100 text-green-700', medium: 'bg-yellow-100 text-yellow-700', high: 'bg-red-100 text-red-700' };
const IMPACT_COLOR: Record<string, string> = { low: 'text-gray-500', medium: 'text-amber-600', high: 'text-emerald-600 font-semibold' };
const GRADE_COLORS: Record<string, string> = {
  A: 'text-green-700 bg-green-50 border-green-300', B: 'text-blue-700 bg-blue-50 border-blue-300',
  C: 'text-yellow-700 bg-yellow-50 border-yellow-300', D: 'text-orange-700 bg-orange-50 border-orange-300', F: 'text-red-700 bg-red-50 border-red-300',
};

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}

function RecoCard({ reco, expanded, onToggle }: { reco: Recommendation; expanded: boolean; onToggle: () => void; }) {
  const { t } = useTranslation();
  const style = PILLAR_STYLES[reco.pillar] || PILLAR_STYLES.governance;
  const Icon = style.icon;
  return (
    <div className={`border rounded-xl overflow-hidden transition-all duration-200 ${style.border} bg-white`}>
      <button className="w-full text-left p-4 flex items-start gap-3 hover:bg-gray-50/50 transition-colors" onClick={onToggle}>
        <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${style.bg}`}>
          <Icon size={16} className={style.text} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {reco.quick_win && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                <Zap size={9} /> Quick Win
              </span>
            )}
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${style.badge}`}>{reco.pillar_label}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${EFFORT_COLOR[reco.effort]}`}>{t('ai.effortLabel', 'Effort :')} {reco.effort_label}</span>
          </div>
          <p className="text-sm font-semibold text-gray-900 leading-snug">{reco.title}</p>
          <div className="flex items-center gap-3 mt-1.5 text-xs">
            <span className={IMPACT_COLOR[reco.impact]}>{t('ai.impactLabel', 'Impact')} {reco.impact_label}</span>
            <span className="text-gray-300">·</span>
            <span className="text-emerald-600 font-medium">+{reco.score_gain_est} {t('ai.ptsEst', 'pts estimés')}</span>
          </div>
        </div>
        <ChevronRight size={16} className={`flex-shrink-0 text-gray-400 transition-transform duration-200 mt-1 ${expanded ? 'rotate-90' : ''}`} />
      </button>
      {expanded && (
        <div className={`px-4 pb-4 pt-2 border-t ${style.border} ${style.bg}`}>
          <p className="text-sm text-gray-700 mb-4 leading-relaxed">{reco.description}</p>
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">{t('ai.actionsTitle', 'Actions recommandées')}</h4>
          <ul className="space-y-2 mb-4">
            {reco.actions.map((action, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <CheckCircle size={14} className={`flex-shrink-0 mt-0.5 ${style.text}`} /><span>{action}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-1.5">
            {reco.tags.map(tag => (
              <span key={tag} className="px-2 py-0.5 bg-white border border-gray-200 rounded-full text-[11px] text-gray-500">{tag}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AIInsights() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<InsightsData | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'quick' | 'all' | 'strategic'>('quick');
  const [refreshing, setRefreshing] = useState(false);

  const fetchInsights = async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const res = await api.get('/ai-insights');
      setData(res.data);
    } catch {
      toast.error(t('ai.errLoad', 'Impossible de charger les recommandations'));
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchInsights(); }, []);

  const currentRecos = data
    ? activeTab === 'quick' ? data.quick_wins : activeTab === 'strategic' ? data.strategic_actions : data.recommendations
    : [];

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 rounded-2xl p-8 text-white shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZyIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNnKSIvPjwvc3ZnPg==')] opacity-30" />
        <div className="relative">
          <button onClick={() => navigate(-1)} className="mb-4 inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-white/80 hover:bg-white/20 hover:text-white transition-colors">
            <ArrowLeft size={14} />{t('ai.back', 'Retour')}
          </button>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold tracking-wide uppercase flex items-center gap-1.5">
                  <Brain size={12} />{t('ai.badge', 'IA & Recommandations')}
                </span>
              </div>
              <h1 className="text-3xl font-bold mb-1">{t('ai.heroTitle', 'Insights ESG Intelligents')}</h1>
              <p className="text-violet-100">{t('ai.heroDesc', 'Recommandations personnalisées et actions prioritaires pour améliorer votre performance ESG')}</p>
            </div>
            <button onClick={() => fetchInsights(true)} disabled={refreshing}
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-colors">
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />{t('ai.refresh', 'Actualiser')}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64">
          <Spinner />
          <p className="text-gray-500 mt-4 font-medium">{t('ai.loading', 'Analyse de vos données ESG en cours…')}</p>
          <p className="text-sm text-gray-400 mt-1">{t('ai.loadingSub', 'Génération des recommandations personnalisées')}</p>
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm col-span-2 md:col-span-1 p-4">
              <div className="flex items-center gap-4">
                <div className={`text-4xl font-bold px-4 py-2 rounded-xl border-2 ${GRADE_COLORS[data.scores.rating || ''] || 'text-gray-600 bg-gray-50 border-gray-200'}`}>
                  {data.scores.rating || '—'}
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">{Math.round(data.scores.overall)}</p>
                  <p className="text-xs text-gray-400">{t('ai.scoreGlobal', 'Score global / 100')}</p>
                  <p className="text-xs font-medium text-gray-500 mt-0.5">{data.scores.rating_label}</p>
                </div>
              </div>
            </div>
            {[
              { label: t('ai.environ', 'Environnement'), value: data.scores.environmental, color: 'bg-emerald-500', textColor: 'text-emerald-700', icon: Leaf, iconColor: 'text-emerald-600' },
              { label: 'Social',                          value: data.scores.social,         color: 'bg-blue-500',    textColor: 'text-blue-700',    icon: Users, iconColor: 'text-blue-600' },
              { label: t('ai.governance', 'Gouvernance'), value: data.scores.governance,     color: 'bg-purple-500',  textColor: 'text-purple-700',  icon: Scale, iconColor: 'text-purple-600' },
            ].map(({ label, value, color, textColor, icon: Icon, iconColor }) => (
              <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2"><Icon size={15} className={iconColor} /><span className="text-xs font-medium text-gray-500">{label}</span></div>
                  <span className={`text-lg font-bold ${textColor}`}>{Math.round(value)}</span>
                </div>
                <ScoreBar value={value} color={color} />
              </div>
            ))}
          </div>

          {data.total_gain_estimate > 0 && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0"><TrendingUp size={20} className="text-amber-600" /></div>
                <div>
                  <p className="font-semibold text-amber-900">{t('ai.potentialA', "Potentiel d'amélioration :")} <span className="text-2xl">+{data.total_gain_estimate} pts</span></p>
                  <p className="text-sm text-amber-700">{t('ai.applyRecos', 'En appliquant les 5 recommandations prioritaires, votre score ESG pourrait atteindre ')}
                    <strong>{Math.min(Math.round(data.scores.overall) + data.total_gain_estimate, 100)}/100</strong>
                  </p>
                </div>
              </div>
              <button onClick={() => navigate('/app/scores/calculate')} className="flex-shrink-0 hidden sm:flex items-center gap-2 px-4 py-2 border border-amber-300 text-amber-800 rounded-xl text-sm font-medium hover:bg-amber-100 transition-colors">
                <BarChart3 size={15} />{t('ai.recalculate', 'Recalculer')}
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4"><Star size={18} className="text-amber-500" /><h2 className="text-base font-semibold text-gray-900">{t('ai.strengths', 'Points forts')}</h2></div>
              {data.strengths.length === 0 ? (
                <p className="text-sm text-gray-400">{t('ai.noStrengths', 'Calculez un score pour voir vos points forts.')}</p>
              ) : (
                <ul className="space-y-2.5">{data.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700"><CheckCircle size={15} className="text-emerald-500 flex-shrink-0 mt-0.5" /><span>{s}</span></li>
                ))}</ul>
              )}
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4"><AlertTriangle size={18} className="text-red-500" /><h2 className="text-base font-semibold text-gray-900">{t('ai.risks', 'Points de vigilance')}</h2></div>
              {data.risks.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-emerald-600"><CheckCircle size={15} /><span>{t('ai.noRisks', 'Aucun risque critique détecté — continuez sur cette lancée !')}</span></div>
              ) : (
                <ul className="space-y-2.5">{data.risks.map((r, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <AlertTriangle size={15} className={`flex-shrink-0 mt-0.5 ${r.level === 'high' ? 'text-red-500' : 'text-amber-500'}`} /><span>{r.label}</span>
                  </li>
                ))}</ul>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4"><Lightbulb size={20} className="text-violet-600" /><h2 className="text-lg font-semibold text-gray-900">{t('ai.recoTitle', 'Recommandations ({{n}})', { n: data.total_recommendations })}</h2></div>
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-5">
              {([
                { key: 'quick'     as const, icon: <Zap size={13} />,      label: `Quick Wins (${data.quick_wins.length})` },
                { key: 'strategic' as const, icon: <Target size={13} />,   label: t('ai.tabStrategic', 'Stratégiques ({{n}})', { n: data.strategic_actions.length }) },
                { key: 'all'       as const, icon: <Activity size={13} />, label: t('ai.tabAll', 'Toutes ({{n}})', { n: data.total_recommendations }) },
              ]).map(tab => (
                <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  <span className="pointer-events-none">{tab.icon}</span>
                  <span className="pointer-events-none">{tab.label}</span>
                </button>
              ))}
            </div>
            {currentRecos.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <Award size={36} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">{t('ai.noRecos', 'Excellent ! Aucune recommandation dans cette catégorie.')}</p>
                <p className="text-sm mt-1">{t('ai.noRecosSub', "Votre performance ESG est au-dessus des seuils d'alerte.")}</p>
              </div>
            ) : (
              <div className="space-y-3">{currentRecos.map(reco => (
                <RecoCard key={reco.id} reco={reco} expanded={expandedId === reco.id} onToggle={() => setExpandedId(expandedId === reco.id ? null : reco.id)} />
              ))}</div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { path: '/app/scores/calculate', bg: 'bg-violet-100', iconColor: 'text-violet-600', icon: BarChart3, title: t('ai.calcScore', 'Calculer un score'), desc: t('ai.calcScoreDesc', 'Mettre à jour vos indicateurs') },
              { path: '/app/esrs-gap',         bg: 'bg-emerald-100', iconColor: 'text-emerald-600', icon: Target,   title: 'Analyse ESRS / DMA', desc: t('ai.esrsDesc', 'Vérifier la couverture CSRD') },
              { path: '/app/data-entry',       bg: 'bg-blue-100',    iconColor: 'text-blue-600',    icon: Activity, title: t('ai.enterData', 'Saisir des données'), desc: t('ai.enterDataDesc', 'Enrichir la base ESG') },
            ].map(({ path, bg, iconColor, icon: Icon, title, desc }) => (
              <button key={path} onClick={() => navigate(path)}
                className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-violet-300 hover:shadow-sm transition-all text-left">
                <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}><Icon size={18} className={iconColor} /></div>
                <div><p className="text-sm font-semibold text-gray-900">{title}</p><p className="text-xs text-gray-500">{desc}</p></div>
                <ArrowUpRight size={14} className="text-gray-400 ml-auto" />
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
