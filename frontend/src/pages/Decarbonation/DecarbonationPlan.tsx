import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Leaf, Target, TrendingDown, Zap, Truck, ShoppingBag,
  Factory, Building2, Users, BarChart3, CheckCircle,
  Clock, AlertTriangle, Play, Download, Filter, Plus,
  Minus, ChevronRight, Info, ArrowRight, FlameKindling,
  Wind, RefreshCw, Star,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type Difficulty = 'Facile' | 'Moyen' | 'Difficile';
type ActionStatus = 'à_faire' | 'en_cours' | 'terminé';
type TabId = 'overview' | 'actions' | 'scenarios' | 'trajectory';

interface Action {
  id: string;
  category: string;
  title: string;
  description: string;
  impact: number;       // tCO2e/an économisées
  cost: number;         // k€
  roi: number;          // mois
  difficulty: Difficulty;
  scope: 'Scope 1' | 'Scope 2' | 'Scope 3';
  status: ActionStatus;
  inPlan: boolean;
  tags: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const BASE_EMISSIONS = 12_500; // tCO2e (2024 baseline)
const SBTI_TARGET_2030 = 7_250; // -42% vs 2024 (SBTi 1.5°C)
const NET_ZERO_2050 = 800;

// Trajectory year points (2024–2050)
function buildTrajectory() {
  const years = Array.from({ length: 27 }, (_, i) => 2024 + i);
  return years.map(y => {
    const t = (y - 2024) / (2050 - 2024);
    const bau = BASE_EMISSIONS * (1 + t * 0.08);                           // +8% BAU drift
    const sbti = y <= 2030
      ? BASE_EMISSIONS * Math.pow(1 - 0.058, y - 2024)                    // -5.8%/yr to 2030
      : SBTI_TARGET_2030 * Math.pow(1 - 0.08, y - 2030);                  // steeper after 2030
    const current = y <= 2030
      ? BASE_EMISSIONS * Math.pow(1 - 0.028, y - 2024)                    // current pace -2.8%/yr
      : undefined;
    return { year: y, bau: Math.round(bau), sbti: Math.round(Math.max(sbti, NET_ZERO_2050)), current };
  });
}

const trajectory = buildTrajectory();

// ─── Actions catalog ─────────────────────────────────────────────────────────
const CATALOG: Action[] = [
  // Énergie
  { id: 'e1', category: 'Énergie', title: 'Contrat d\'électricité verte (EnR)', description: 'Passer à un fournisseur d\'énergie renouvelable certifié REGO/GO pour l\'ensemble des sites.', impact: 1800, cost: 5, roi: 3, difficulty: 'Facile', scope: 'Scope 2', status: 'à_faire', inPlan: false, tags: ['Quick win', 'Électricité'] },
  { id: 'e2', category: 'Énergie', title: 'Audit énergétique & plan d\'efficacité', description: 'Réaliser un audit ISO 50001 sur les 3 principaux sites et déployer les actions prioritaires.', impact: 450, cost: 45, roi: 24, difficulty: 'Moyen', scope: 'Scope 1', status: 'à_faire', inPlan: false, tags: ['ISO 50001'] },
  { id: 'e3', category: 'Énergie', title: 'Panneaux solaires photovoltaïques', description: 'Installation PV en toiture sur les entrepôts (500 kWc) pour auto-consommation.', impact: 280, cost: 320, roi: 84, difficulty: 'Difficile', scope: 'Scope 2', status: 'à_faire', inPlan: false, tags: ['Investissement'] },
  { id: 'e4', category: 'Énergie', title: 'Remplacement éclairage LED + détecteurs', description: 'Migration de l\'éclairage fluorescent vers LED avec détecteurs de présence sur tous les sites.', impact: 90, cost: 38, roi: 18, difficulty: 'Facile', scope: 'Scope 2', status: 'en_cours', inPlan: false, tags: ['Quick win'] },
  { id: 'e5', category: 'Énergie', title: 'Récupération chaleur fatale process', description: 'Récupérer la chaleur des procédés industriels pour préchauffer l\'eau et les locaux.', impact: 350, cost: 80, roi: 30, difficulty: 'Moyen', scope: 'Scope 1', status: 'à_faire', inPlan: false, tags: ['Industrie'] },

  // Transport & Mobilité
  { id: 't1', category: 'Transport', title: 'Électrification flotte véhicules légers', description: 'Remplacer les véhicules thermiques du parc (30 VL) par des véhicules électriques sur 3 ans.', impact: 320, cost: 180, roi: 60, difficulty: 'Moyen', scope: 'Scope 1', status: 'en_cours', inPlan: false, tags: ['Flotte', 'Mobilité'] },
  { id: 't2', category: 'Transport', title: 'Plan de mobilité salariés (PDME)', description: 'Créer un Plan de Déplacements Maison-Entreprise : covoiturage, vélo, transports communs.', impact: 85, cost: 15, roi: 8, difficulty: 'Facile', scope: 'Scope 3', status: 'à_faire', inPlan: false, tags: ['Quick win', 'RH'] },
  { id: 't3', category: 'Transport', title: 'Optimisation logistique & mutualisation', description: 'Optimiser les tournées (TMS), mutualiser les livraisons, réduire les retours à vide.', impact: 450, cost: 30, roi: 10, difficulty: 'Moyen', scope: 'Scope 3', status: 'à_faire', inPlan: false, tags: ['Logistique'] },
  { id: 't4', category: 'Transport', title: 'Report modal vers le ferroviaire', description: 'Transférer 30% du transport amont routier vers le ferroviaire ou le fluvial.', impact: 680, cost: 20, roi: 6, difficulty: 'Moyen', scope: 'Scope 3', status: 'à_faire', inPlan: false, tags: ['Logistique', 'Impact élevé'] },
  { id: 't5', category: 'Transport', title: 'Politique voyage d\'affaires bas-carbone', description: 'Interdire vols intérieurs remplaçables par train, limiter les vols longue distance.', impact: 95, cost: 5, roi: 2, difficulty: 'Facile', scope: 'Scope 3', status: 'à_faire', inPlan: false, tags: ['Quick win', 'Gouvernance'] },

  // Achats & Chaîne de valeur
  { id: 'a1', category: 'Achats', title: 'Critères carbone fournisseurs (EcoVadis)', description: 'Intégrer un score carbone EcoVadis dans les critères de sélection des 50 fournisseurs clés.', impact: 2500, cost: 35, roi: 12, difficulty: 'Moyen', scope: 'Scope 3', status: 'à_faire', inPlan: false, tags: ['Impact élevé', 'Achats responsables'] },
  { id: 'a2', category: 'Achats', title: 'Éco-conception & allongement durée de vie', description: 'Repenser le design produit pour réduire les matières premières et prolonger l\'usage.', impact: 800, cost: 120, roi: 36, difficulty: 'Difficile', scope: 'Scope 3', status: 'à_faire', inPlan: false, tags: ['Économie circulaire'] },
  { id: 'a3', category: 'Achats', title: 'Réduction & recyclage emballages', description: 'Supprimer les suremballages plastique, passer à des matériaux recyclés/recyclables.', impact: 120, cost: 20, roi: 14, difficulty: 'Facile', scope: 'Scope 3', status: 'terminé', inPlan: false, tags: ['Quick win', 'Économie circulaire'] },
  { id: 'a4', category: 'Achats', title: 'Clauses contractuelles réduction GHG', description: 'Exiger des engagements de réduction carbone (-5%/an) dans les contrats fournisseurs critiques.', impact: 1200, cost: 8, roi: 6, difficulty: 'Moyen', scope: 'Scope 3', status: 'à_faire', inPlan: false, tags: ['Impact élevé', 'Gouvernance'] },

  // Production & Process
  { id: 'p1', category: 'Production', title: 'Optimisation process & arrêt veilles', description: 'Mettre les équipements en veille profonde hors production, optimiser les cycles process.', impact: 210, cost: 12, roi: 6, difficulty: 'Facile', scope: 'Scope 1', status: 'à_faire', inPlan: false, tags: ['Quick win'] },
  { id: 'p2', category: 'Production', title: 'Remplacement fluides frigorigènes HFC', description: 'Migrer vers des fluides frigorigènes à faible GWP (CO2, ammoniac, propane) sur les climatisations.', impact: 380, cost: 65, roi: 20, difficulty: 'Moyen', scope: 'Scope 1', status: 'à_faire', inPlan: false, tags: ['Réglementaire'] },
  { id: 'p3', category: 'Production', title: 'Économie circulaire des déchets process', description: 'Valoriser les déchets de production comme matière première secondaire ou énergie.', impact: 180, cost: 10, roi: 5, difficulty: 'Facile', scope: 'Scope 1', status: 'à_faire', inPlan: false, tags: ['Économie circulaire', 'Quick win'] },

  // Bâtiments
  { id: 'b1', category: 'Bâtiments', title: 'Rénovation thermique ITE/ITI', description: 'Isolation thermique par l\'extérieur + changement menuiseries sur les bâtiments DPE D/E.', impact: 280, cost: 420, roi: 120, difficulty: 'Difficile', scope: 'Scope 1', status: 'à_faire', inPlan: false, tags: ['Investissement'] },
  { id: 'b2', category: 'Bâtiments', title: 'Gestion technique centralisée (GTC)', description: 'Déployer une GTC pour piloter le chauffage, la climatisation et l\'éclairage en temps réel.', impact: 150, cost: 55, roi: 30, difficulty: 'Moyen', scope: 'Scope 2', status: 'à_faire', inPlan: false, tags: ['Smart building'] },
  { id: 'b3', category: 'Bâtiments', title: 'Remplacement chauffage fioul/gaz par pompe à chaleur', description: 'Installer des PAC air/eau ou géothermiques sur les sites les plus consommateurs.', impact: 320, cost: 280, roi: 84, difficulty: 'Difficile', scope: 'Scope 1', status: 'à_faire', inPlan: false, tags: ['Décarbonation profonde'] },

  // Digital & RH
  { id: 'd1', category: 'Digital & RH', title: 'Green IT & sobriété numérique', description: 'Prolonger la durée de vie des équipements, éteindre les serveurs inutilisés, charte numérique.', impact: 60, cost: 5, roi: 3, difficulty: 'Facile', scope: 'Scope 2', status: 'à_faire', inPlan: false, tags: ['Quick win'] },
  { id: 'd2', category: 'Digital & RH', title: 'Politique télétravail structurée', description: 'Formaliser 2 jours/semaine de télétravail pour les fonctions éligibles (réduction déplacements).', impact: 95, cost: 8, roi: 4, difficulty: 'Facile', scope: 'Scope 3', status: 'terminé', inPlan: false, tags: ['Quick win', 'RH'] },
  { id: 'd3', category: 'Digital & RH', title: 'Formation & sensibilisation carbone', description: 'Déployer un programme de formation Fresque du Climat + bilan carbone personnel pour 100% des équipes.', impact: 150, cost: 18, roi: 8, difficulty: 'Facile', scope: 'Scope 3', status: 'à_faire', inPlan: false, tags: ['Culture carbone', 'RH'] },
  { id: 'd4', category: 'Digital & RH', title: 'Intégration carbone dans les KPIs dirigeants', description: 'Lier une partie de la rémunération variable des dirigeants aux objectifs de réduction carbone.', impact: 500, cost: 5, roi: 6, difficulty: 'Moyen', scope: 'Scope 1', status: 'à_faire', inPlan: false, tags: ['Gouvernance', 'Impact élevé'] },
];

const CATEGORIES = ['Toutes', 'Énergie', 'Transport', 'Achats', 'Production', 'Bâtiments', 'Digital & RH'];
const DIFFICULTIES: Difficulty[] = ['Facile', 'Moyen', 'Difficile'];

const CATEGORY_ICONS: Record<string, any> = {
  'Énergie': Zap, 'Transport': Truck, 'Achats': ShoppingBag,
  'Production': Factory, 'Bâtiments': Building2, 'Digital & RH': Users,
};

const CATEGORY_COLORS: Record<string, string> = {
  'Énergie': 'bg-yellow-100 text-yellow-700',
  'Transport': 'bg-blue-100 text-blue-700',
  'Achats': 'bg-purple-100 text-purple-700',
  'Production': 'bg-orange-100 text-orange-700',
  'Bâtiments': 'bg-teal-100 text-teal-700',
  'Digital & RH': 'bg-pink-100 text-pink-700',
};

const STATUS_CFG: Record<ActionStatus, { label: string; color: string; bg: string; icon: any }> = {
  à_faire:   { label: 'À faire',    color: 'text-gray-600',  bg: 'bg-gray-100',   icon: Clock },
  en_cours:  { label: 'En cours',   color: 'text-blue-700',  bg: 'bg-blue-100',   icon: Play },
  terminé:   { label: 'Terminé',    color: 'text-green-700', bg: 'bg-green-100',  icon: CheckCircle },
};

const DIFF_CFG: Record<Difficulty, string> = {
  Facile:    'bg-green-100 text-green-700',
  Moyen:     'bg-amber-100 text-amber-700',
  Difficile: 'bg-red-100 text-red-700',
};

// ─── Mini SVG trajectory chart ────────────────────────────────────────────────
function TrajectoryChart({ planReduction }: { planReduction: number }) {
  const { t: tr } = useTranslation();
  const W = 700, H = 260, PAD = { t: 20, r: 20, b: 40, l: 60 };
  const cw = W - PAD.l - PAD.r;
  const ch = H - PAD.t - PAD.b;
  const maxVal = BASE_EMISSIONS * 1.1;

  const xScale = (year: number) => PAD.l + ((year - 2024) / 26) * cw;
  const yScale = (v: number) => PAD.t + ch - (v / maxVal) * ch;

  // Build path strings
  const bauPath = trajectory.map((d, i) => `${i === 0 ? 'M' : 'L'}${xScale(d.year)},${yScale(d.bau)}`).join(' ');
  const sbtiPath = trajectory.map((d, i) => `${i === 0 ? 'M' : 'L'}${xScale(d.year)},${yScale(d.sbti)}`).join(' ');
  const currentPath = trajectory.filter(d => d.current !== undefined).map((d, i) => `${i === 0 ? 'M' : 'L'}${xScale(d.year)},${yScale(d.current!)}`).join(' ');

  // With plan: current pace + plan reduction
  const withPlanPath = trajectory.filter(d => d.current !== undefined).map((d, i) => {
    const val = d.current! - planReduction * Math.min(i / 3, 1);
    return `${i === 0 ? 'M' : 'L'}${xScale(d.year)},${yScale(Math.max(val, NET_ZERO_2050))}`;
  }).join(' ');

  const milestones = [2030, 2040, 2050];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 280 }}>
      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map(pct => {
        const y = PAD.t + ch * pct;
        const val = Math.round(maxVal * (1 - pct));
        return (
          <g key={pct}>
            <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="#f3f4f6" strokeWidth={1} />
            <text x={PAD.l - 8} y={y + 4} textAnchor="end" fontSize={10} fill="#9ca3af">{(val / 1000).toFixed(0)}k</text>
          </g>
        );
      })}

      {/* Milestone lines */}
      {milestones.map(yr => (
        <g key={yr}>
          <line x1={xScale(yr)} y1={PAD.t} x2={xScale(yr)} y2={H - PAD.b} stroke="#e5e7eb" strokeDasharray="4 3" strokeWidth={1} />
          <text x={xScale(yr)} y={H - PAD.b + 14} textAnchor="middle" fontSize={10} fill="#6b7280">{yr}</text>
        </g>
      ))}

      {/* BAU */}
      <path d={bauPath} fill="none" stroke="#ef4444" strokeWidth={2} strokeDasharray="6 4" opacity={0.7} />
      {/* SBTi 1.5°C */}
      <path d={sbtiPath} fill="none" stroke="#16a34a" strokeWidth={2.5} />
      {/* Current trajectory */}
      <path d={currentPath} fill="none" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 3" />
      {/* With plan */}
      {planReduction > 0 && (
        <path d={withPlanPath} fill="none" stroke="#3b82f6" strokeWidth={2.5} strokeDasharray="6 3" />
      )}

      {/* Net Zero zone */}
      <rect x={PAD.l} y={yScale(1200)} width={cw} height={yScale(0) - yScale(1200)} fill="#16a34a" opacity={0.05} />
      <text x={PAD.l + 6} y={yScale(900)} fontSize={9} fill="#16a34a" opacity={0.8}>{tr('decarbonation.legendNetZeroZone')}</text>

      {/* Legend */}
      {[
        { label: tr('decarbonation.legendBau'), color: '#ef4444', dash: '6 4' },
        { label: tr('decarbonation.legendSbtiPath'), color: '#16a34a', dash: '' },
        { label: tr('decarbonation.legendCurrentPace'), color: '#f59e0b', dash: '4 3' },
        ...(planReduction > 0 ? [{ label: tr('decarbonation.legendWithPlan'), color: '#3b82f6', dash: '6 3' }] : []),
      ].map((l, i) => (
        <g key={i} transform={`translate(${PAD.l + i * 160}, ${H - 8})`}>
          <line x1={0} y1={0} x2={24} y2={0} stroke={l.color} strokeWidth={2} strokeDasharray={l.dash} />
          <text x={28} y={4} fontSize={9} fill="#6b7280">{l.label}</text>
        </g>
      ))}

      {/* X axis */}
      <text x={PAD.l} y={H - PAD.b + 14} textAnchor="middle" fontSize={10} fill="#6b7280">2024</text>
    </svg>
  );
}

// ─── Action card ──────────────────────────────────────────────────────────────
function ActionCard({ action, onTogglePlan, onStatusChange }: {
  action: Action;
  onTogglePlan: (id: string) => void;
  onStatusChange: (id: string, s: ActionStatus) => void;
}) {
  const { t: tr } = useTranslation();
  const Icon = CATEGORY_ICONS[action.category] || Leaf;
  const sc = STATUS_CFG[action.status];
  const SIcon = sc.icon;

  const statusLabels: Record<ActionStatus, string> = {
    à_faire: tr('decarbonation.statusTodo'),
    en_cours: tr('decarbonation.statusInProgress'),
    terminé: tr('decarbonation.statusDone'),
  };

  return (
    <div className={`bg-white rounded-2xl border-2 ${action.inPlan ? 'border-green-400 shadow-green-100 shadow-md' : 'border-gray-100 hover:border-green-200 hover:shadow-md'} p-5 transition-all`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${CATEGORY_COLORS[action.category].replace('text-', 'bg-').split(' ')[0]} bg-opacity-30`}>
            <Icon className={`h-4 w-4 ${CATEGORY_COLORS[action.category].split(' ')[1]}`} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-gray-900 leading-tight">{action.title}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFF_CFG[action.difficulty]}`}>{action.difficulty}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">{action.scope}</span>
              {action.tags.includes('Quick win') && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center gap-1">
                  <Star className="h-3 w-3" /> Quick win
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => onTogglePlan(action.id)}
          className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all ${action.inPlan ? 'bg-green-500 text-white hover:bg-red-500' : 'bg-gray-100 text-gray-400 hover:bg-green-100 hover:text-green-600'}`}
          title={action.inPlan ? tr('decarbonation.removeFromPlan') : tr('decarbonation.addToPlan')}
        >
          {action.inPlan ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </button>
      </div>

      <p className="text-xs text-gray-500 leading-relaxed mb-4">{action.description}</p>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-green-50 rounded-xl p-2.5 text-center">
          <div className="text-base font-bold text-green-700">{action.impact}</div>
          <div className="text-xs text-green-600">{tr('decarbonation.metricImpact')}</div>
        </div>
        <div className="bg-blue-50 rounded-xl p-2.5 text-center">
          <div className="text-base font-bold text-blue-700">{action.cost}k€</div>
          <div className="text-xs text-blue-600">{tr('decarbonation.metricInvestment')}</div>
        </div>
        <div className="bg-amber-50 rounded-xl p-2.5 text-center">
          <div className="text-base font-bold text-amber-700">{action.roi < 12 ? `${action.roi}m` : `${Math.round(action.roi / 12)}a`}</div>
          <div className="text-xs text-amber-600">{tr('decarbonation.metricRoi')}</div>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center justify-between">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${sc.bg} ${sc.color}`}>
          <SIcon className="h-3 w-3" />
          {statusLabels[action.status]}
        </span>
        <div className="flex gap-1">
          {(['à_faire', 'en_cours', 'terminé'] as ActionStatus[]).map(s => (
            <button
              key={s}
              onClick={() => onStatusChange(action.id, s)}
              className={`w-6 h-6 rounded-lg text-xs transition-colors ${action.status === s ? `${STATUS_CFG[s].bg} ${STATUS_CFG[s].color}` : 'bg-gray-100 text-gray-300 hover:bg-gray-200'}`}
              title={statusLabels[s]}
            >
              {s === 'à_faire' ? '○' : s === 'en_cours' ? '◑' : '●'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DecarbonationPlan() {
  const { t: tr } = useTranslation();
  const [actions, setActions] = useState<Action[]>(CATALOG);
  const [tab, setTab] = useState<TabId>('overview');
  const [catFilter, setCatFilter] = useState('Toutes');
  const [diffFilter, setDiffFilter] = useState<string>('Toutes');
  const [scopeFilter, setScopeFilter] = useState('Tous');
  const [quickWinOnly, setQuickWinOnly] = useState(false);
  const [scenarioSelected, setScenarioSelected] = useState<string[]>([]);

  // Compute plan stats
  const planActions = useMemo(() => actions.filter(a => a.inPlan), [actions]);
  const planReduction = useMemo(() => planActions.reduce((s, a) => s + a.impact, 0), [planActions]);
  const planCost = useMemo(() => planActions.reduce((s, a) => s + a.cost, 0), [planActions]);
  const planPct = Math.min(Math.round((planReduction / (BASE_EMISSIONS - SBTI_TARGET_2030)) * 100), 100);
  const projected2030 = Math.max(BASE_EMISSIONS - planReduction, SBTI_TARGET_2030);
  const onTrack = projected2030 <= SBTI_TARGET_2030;

  const completedActions = actions.filter(a => a.status === 'terminé').length;
  const inProgressActions = actions.filter(a => a.status === 'en_cours').length;

  // Quick wins
  const quickWins = useMemo(() => actions.filter(a => a.tags.includes('Quick win') && a.status === 'à_faire'), [actions]);

  // Filtered actions
  const filtered = useMemo(() => actions.filter(a => {
    if (catFilter !== 'Toutes' && a.category !== catFilter) return false;
    if (diffFilter !== 'Toutes' && a.difficulty !== diffFilter) return false;
    if (scopeFilter !== 'Tous' && a.scope !== scopeFilter) return false;
    if (quickWinOnly && !a.tags.includes('Quick win')) return false;
    return true;
  }), [actions, catFilter, diffFilter, scopeFilter, quickWinOnly]);

  // Sorted by impact desc
  const sortedFiltered = useMemo(() => [...filtered].sort((a, b) => b.impact - a.impact), [filtered]);

  const togglePlan = (id: string) => setActions(prev => prev.map(a => a.id === id ? { ...a, inPlan: !a.inPlan } : a));
  const setStatus = (id: string, status: ActionStatus) => setActions(prev => prev.map(a => a.id === id ? { ...a, status } : a));

  // Scenario quick-add
  const SCENARIOS = [
    { id: 'quick', label: `⚡ ${tr('decarbonation.scenarioQuickWins')}`, actionIds: actions.filter(a => a.tags.includes('Quick win')).map(a => a.id) },
    { id: 'sbti42', label: `🎯 ${tr('decarbonation.scenarioSbti42')}`, actionIds: actions.filter(a => a.impact >= 100).sort((a, b) => b.impact - a.impact).slice(0, 12).map(a => a.id) },
    { id: 'netzero', label: `🌍 ${tr('decarbonation.scenarioNetZero')}`, actionIds: actions.map(a => a.id) },
  ];

  const applyScenario = (sid: string) => {
    const sc = SCENARIOS.find(s => s.id === sid);
    if (!sc) return;
    const toggle = scenarioSelected.includes(sid);
    setScenarioSelected(prev => toggle ? prev.filter(x => x !== sid) : [...prev, sid]);
    setActions(prev => prev.map(a => ({
      ...a,
      inPlan: toggle ? (sc.actionIds.includes(a.id) ? false : a.inPlan) : (sc.actionIds.includes(a.id) ? true : a.inPlan),
    })));
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: tr('decarbonation.tabs.overview') },
    { id: 'actions', label: `${tr('decarbonation.tabs.catalogue')} (${actions.length})` },
    { id: 'scenarios', label: tr('decarbonation.tabs.scenarios') },
    { id: 'trajectory', label: tr('decarbonation.tabs.trajectory') },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <FlameKindling className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{tr('decarbonation.title')}</h1>
                <p className="text-sm text-gray-500 mt-0.5">{tr('decarbonation.subtitle')}</p>
              </div>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              <Download className="h-4 w-4" />
              {tr('decarbonation.exportPlan')}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="max-w-7xl mx-auto flex gap-0">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${tab === t.id ? 'border-green-500 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Overview tab ── */}
        {tab === 'overview' && (
          <div className="space-y-8">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: tr('decarbonation.kpiBase2024'), value: `${(BASE_EMISSIONS / 1000).toFixed(1)}k`, unit: 'tCO₂e', color: 'text-gray-900', bg: 'bg-white border-gray-200' },
                { label: tr('decarbonation.kpiSbtiTarget'), value: `${(SBTI_TARGET_2030 / 1000).toFixed(1)}k`, unit: 'tCO₂e (-42%)', color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
                { label: tr('decarbonation.kpiPlanReduction'), value: planReduction.toLocaleString(), unit: 'tCO₂e/an', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
                { label: tr('decarbonation.kpiTotalInvestment'), value: `${planCost}k`, unit: '€', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
              ].map((k, i) => (
                <div key={i} className={`rounded-2xl border-2 ${k.bg} p-5`}>
                  <div className={`text-3xl font-extrabold ${k.color}`}>{k.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{k.unit}</div>
                  <div className="text-sm font-semibold text-gray-700 mt-2">{k.label}</div>
                </div>
              ))}
            </div>

            {/* Progress toward SBTi */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">{tr('decarbonation.sbtiProgressTitle')}</h2>
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${onTrack ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {onTrack ? `✓ ${tr('decarbonation.onTrack')}` : `${tr('decarbonation.offTrack')} ${(projected2030 - SBTI_TARGET_2030).toLocaleString()} tCO₂e`}
                </span>
              </div>
              <div className="space-y-3">
                {/* SBTi bar */}
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                    <span>{tr('decarbonation.sbtiRequired')}</span>
                    <span className="font-semibold">{(BASE_EMISSIONS - SBTI_TARGET_2030).toLocaleString()} tCO₂e</span>
                  </div>
                  <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-4 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-500"
                      style={{ width: `${planPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-green-600 font-semibold">{tr('decarbonation.yourPlan')} {planReduction.toLocaleString()} tCO₂e ({planPct}%)</span>
                    <span className="text-gray-400">{tr('decarbonation.target2030')}</span>
                  </div>
                </div>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{planActions.length}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{tr('decarbonation.quickStatsActions')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{completedActions}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{tr('decarbonation.quickStatsDone')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{inProgressActions}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{tr('decarbonation.quickStatsInProgress')}</div>
                </div>
              </div>
            </div>

            {/* Trajectory preview */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">{tr('decarbonation.trajectoryTitle')}</h2>
              <TrajectoryChart planReduction={planReduction} />
            </div>

            {/* Quick wins */}
            {quickWins.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <Star className="h-5 w-5 text-amber-500" />
                  {tr('decarbonation.quickWinsTitle')}
                </h2>
                <p className="text-sm text-gray-500 mb-5">{tr('decarbonation.quickWinsDesc')}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quickWins.slice(0, 4).map(a => (
                    <div key={a.id} className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
                      <div className="w-8 h-8 bg-amber-200 rounded-lg flex items-center justify-center flex-shrink-0">
                        {(() => { const I = CATEGORY_ICONS[a.category] || Leaf; return <I className="h-4 w-4 text-amber-700" />; })()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900">{a.title}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{a.impact} tCO₂e/an · {a.cost}k€ · ROI {a.roi < 12 ? `${a.roi} ${tr('decarbonation.months')}` : `${Math.round(a.roi / 12)} ${tr('decarbonation.years')}`}</div>
                      </div>
                      <button onClick={() => togglePlan(a.id)} className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs flex-shrink-0 transition-colors ${a.inPlan ? 'bg-green-500 text-white' : 'bg-white border border-amber-300 text-amber-700 hover:bg-amber-100'}`}>
                        {a.inPlan ? '✓' : '+'}
                      </button>
                    </div>
                  ))}
                </div>
                {quickWins.length > 4 && (
                  <button onClick={() => { setTab('actions'); setQuickWinOnly(true); }} className="mt-4 text-sm text-green-600 hover:underline flex items-center gap-1">
                    {tr('decarbonation.viewQuickWins', { count: quickWins.length })} <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Actions catalog tab ── */}
        {tab === 'actions' && (
          <div className="space-y-6">
            {/* Summary bar */}
            {planActions.length > 0 && (
              <div className="flex items-center gap-4 p-4 bg-green-50 border-2 border-green-200 rounded-2xl flex-wrap">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <span className="text-sm font-semibold text-green-800">
                  {tr('decarbonation.catalogSummary', { count: planActions.length, reduction: planReduction.toLocaleString(), cost: planCost })}
                </span>
                <button onClick={() => setTab('overview')} className="ml-auto flex items-center gap-1 text-xs text-green-700 hover:underline">
                  {tr('decarbonation.viewPlan')} <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center bg-white p-4 rounded-2xl border border-gray-200">
              <Filter className="h-4 w-4 text-gray-400" />
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(c => (
                  <button key={c} onClick={() => setCatFilter(c)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${catFilter === c ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {c}
                  </button>
                ))}
              </div>
              <div className="h-5 w-px bg-gray-200 mx-1" />
              {(['Toutes', ...DIFFICULTIES] as string[]).map(d => (
                <button key={d} onClick={() => setDiffFilter(d)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${diffFilter === d ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {d}
                </button>
              ))}
              <div className="h-5 w-px bg-gray-200 mx-1" />
              {['Tous', 'Scope 1', 'Scope 2', 'Scope 3'].map(s => (
                <button key={s} onClick={() => setScopeFilter(s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${scopeFilter === s ? 'bg-slate-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {s}
                </button>
              ))}
              <label className="flex items-center gap-1.5 cursor-pointer ml-auto">
                <input type="checkbox" checked={quickWinOnly} onChange={e => setQuickWinOnly(e.target.checked)} className="rounded" />
                <span className="text-xs font-semibold text-amber-700">{tr('decarbonation.quickWinsOnly')}</span>
              </label>
            </div>

            <div className="text-xs text-gray-400">{sortedFiltered.length} {tr('decarbonation.actionsSorted')}</div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {sortedFiltered.map(a => (
                <ActionCard key={a.id} action={a} onTogglePlan={togglePlan} onStatusChange={setStatus} />
              ))}
            </div>
          </div>
        )}

        {/* ── Scenarios tab ── */}
        {tab === 'scenarios' && (
          <div className="space-y-8">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-2">{tr('decarbonation.scenariosTitle')}</h2>
              <p className="text-sm text-gray-500 mb-6">{tr('decarbonation.scenariosDesc')}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {SCENARIOS.map(sc => {
                  const scActions = actions.filter(a => sc.actionIds.includes(a.id));
                  const scImpact = scActions.reduce((s, a) => s + a.impact, 0);
                  const scCost = scActions.reduce((s, a) => s + a.cost, 0);
                  const active = scenarioSelected.includes(sc.id);
                  return (
                    <div key={sc.id} className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${active ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-green-300'}`} onClick={() => applyScenario(sc.id)}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-base font-bold text-gray-900">{sc.label}</span>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${active ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                          {active && <CheckCircle className="h-4 w-4 text-white" />}
                        </div>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between"><span className="text-gray-500">{tr('decarbonation.scenarioActions')}</span><span className="font-semibold">{scActions.length}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">{tr('decarbonation.scenarioReduction')}</span><span className="font-semibold text-green-700">{scImpact.toLocaleString()} tCO₂e/an</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">{tr('decarbonation.scenarioInvestment')}</span><span className="font-semibold text-amber-700">{scCost}k€</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">{tr('decarbonation.scenarioSbtiCoverage')}</span><span className="font-semibold">{Math.min(Math.round(scImpact / (BASE_EMISSIONS - SBTI_TARGET_2030) * 100), 100)}%</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* What-if result */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">{tr('decarbonation.scenariosTitle')} — {tr('decarbonation.viewPlan')}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                  { label: tr('decarbonation.whatifSelectedActions'), val: planActions.length, unit: '', color: 'text-gray-900' },
                  { label: tr('decarbonation.whatifTotalReduction'), val: planReduction.toLocaleString(), unit: 'tCO₂e/an', color: 'text-green-700' },
                  { label: tr('decarbonation.whatifProjected2030'), val: projected2030.toLocaleString(), unit: 'tCO₂e', color: onTrack ? 'text-green-700' : 'text-amber-700' },
                  { label: tr('decarbonation.whatifSbtiCoverage'), val: `${planPct}%`, unit: '', color: planPct >= 100 ? 'text-green-700' : 'text-amber-700' },
                ].map((k, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-4 text-center">
                    <div className={`text-2xl font-bold ${k.color}`}>{k.val}</div>
                    {k.unit && <div className="text-xs text-gray-500">{k.unit}</div>}
                    <div className="text-xs font-medium text-gray-600 mt-1">{k.label}</div>
                  </div>
                ))}
              </div>
              <TrajectoryChart planReduction={planReduction} />
            </div>

            {/* Impact matrix */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">{tr('decarbonation.matrixTitle')}</h2>
              <p className="text-sm text-gray-500 mb-4">{tr('decarbonation.matrixDesc')}</p>
              <div className="relative bg-gray-50 rounded-xl" style={{ height: 300 }}>
                <div className="absolute top-2 left-1/2 text-xs text-gray-400">{tr('decarbonation.matrixQuadrantQ1')} ↑</div>
                <div className="absolute bottom-2 left-1/2 text-xs text-gray-400">{tr('decarbonation.matrixQuadrantQ3')} ↓</div>
                <div className="absolute left-2 top-1/2 text-xs text-gray-400 -rotate-90">{tr('decarbonation.matrixQuadrantQ3')} ←</div>
                <div className="absolute right-2 top-1/2 text-xs text-gray-400 rotate-90">{tr('decarbonation.matrixQuadrantQ4')} →</div>
                {/* Quadrant lines */}
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-200" />
                <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-200" />
                {actions.filter(a => a.inPlan).map(a => {
                  const maxImpact = 2500, maxCost = 420;
                  const x = 10 + (a.cost / maxCost) * 80;
                  const y = 90 - (a.impact / maxImpact) * 80;
                  const Icon = CATEGORY_ICONS[a.category] || Leaf;
                  return (
                    <div
                      key={a.id}
                      className="absolute w-8 h-8 rounded-full bg-green-500 border-2 border-white shadow flex items-center justify-center cursor-pointer hover:scale-125 transition-transform"
                      style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)' }}
                      title={`${a.title}\n${a.impact} tCO₂e · ${a.cost}k€`}
                    >
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                  );
                })}
                {planActions.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
                    {tr('decarbonation.matrixEmpty')}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Trajectory tab ── */}
        {tab === 'trajectory' && (
          <div className="space-y-8">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{tr('decarbonation.trajectoryTabTitle')}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{tr('decarbonation.trajectoryTabSubtitle')}</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-xl">
                  <Wind className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-semibold text-green-700">{tr('decarbonation.netZeroBadge')} : {NET_ZERO_2050} tCO₂e</span>
                </div>
              </div>
              <TrajectoryChart planReduction={planReduction} />
            </div>

            {/* Milestones table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">{tr('decarbonation.milestonesTitle')}</h2>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-3 text-left">{tr('decarbonation.milestoneYear')}</th>
                    <th className="px-6 py-3 text-right">{tr('decarbonation.legendBau')}</th>
                    <th className="px-6 py-3 text-right">{tr('decarbonation.legendSbtiPath')}</th>
                    <th className="px-6 py-3 text-right">{tr('decarbonation.yourPlan')}</th>
                    <th className="px-6 py-3 text-right">{tr('decarbonation.vsSbti')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {trajectory.filter(d => [2024, 2026, 2028, 2030, 2035, 2040, 2045, 2050].includes(d.year)).map(d => {
                    const planVal = d.current !== undefined ? Math.max(d.current - planReduction, NET_ZERO_2050) : null;
                    const diff = planVal !== null ? planVal - d.sbti : null;
                    return (
                      <tr key={d.year} className={`${d.year === 2030 ? 'bg-green-50' : ''}`}>
                        <td className="px-6 py-3 font-bold text-gray-900">
                          {d.year}
                          {d.year === 2030 && <span className="ml-2 text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full">{tr('decarbonation.kpiSbtiTarget')}</span>}
                          {d.year === 2050 && <span className="ml-2 text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">{tr('decarbonation.netZeroBadge')}</span>}
                        </td>
                        <td className="px-6 py-3 text-right text-red-600 font-medium">{d.bau.toLocaleString()}</td>
                        <td className="px-6 py-3 text-right text-green-700 font-semibold">{d.sbti.toLocaleString()}</td>
                        <td className="px-6 py-3 text-right text-blue-700 font-semibold">{planVal !== null ? planVal.toLocaleString() : '—'}</td>
                        <td className="px-6 py-3 text-right">
                          {diff !== null ? (
                            <span className={`text-xs font-bold ${diff <= 0 ? 'text-green-600' : 'text-red-500'}`}>
                              {diff <= 0 ? `✓ -${Math.abs(diff).toLocaleString()}` : `+${diff.toLocaleString()}`}
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Info box */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
              <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                {tr('decarbonation.trajectoryInfoBox')}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
