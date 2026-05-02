import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/services/api';
import toast from 'react-hot-toast';
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

interface HistoricalPoint {
  year: number;
  total_tco2e: number;
  scope1: number;
  scope2: number;
  scope3: number;
  has_data: boolean;
}

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
const DEFAULT_BASE_EMISSIONS = 12_500;
const NET_ZERO_2050 = 800;

function buildTrajectory(baseEmissions: number) {
  const sbtiTarget2030 = Math.round(baseEmissions * 0.58); // -42% SBTi 1.5°C
  const years = Array.from({ length: 27 }, (_, i) => 2024 + i);
  return years.map(y => {
    const t = (y - 2024) / (2050 - 2024);
    const bau = baseEmissions * (1 + t * 0.08);
    const sbti = y <= 2030
      ? baseEmissions * Math.pow(1 - 0.058, y - 2024)
      : sbtiTarget2030 * Math.pow(1 - 0.08, y - 2030);
    const current = y <= 2030
      ? baseEmissions * Math.pow(1 - 0.028, y - 2024)
      : undefined;
    return { year: y, bau: Math.round(bau), sbti: Math.round(Math.max(sbti, NET_ZERO_2050)), current };
  });
}

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
function TrajectoryChart({ planReduction, baseEmissions, trajectory, historicalData = [] }: { planReduction: number; baseEmissions: number; trajectory: ReturnType<typeof buildTrajectory>; historicalData?: HistoricalPoint[] }) {
  const { t: tr } = useTranslation();
  const W = 700, H = 260, PAD = { t: 20, r: 20, b: 40, l: 60 };
  const cw = W - PAD.l - PAD.r;
  const ch = H - PAD.t - PAD.b;
  const maxVal = baseEmissions * 1.1;

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
        { label: tr('decarbonation.legendBau'), color: '#ef4444', dash: '6 4', dot: false },
        { label: tr('decarbonation.legendSbtiPath'), color: '#16a34a', dash: '', dot: false },
        { label: tr('decarbonation.legendCurrentPace'), color: '#f59e0b', dash: '4 3', dot: false },
        ...(planReduction > 0 ? [{ label: tr('decarbonation.legendWithPlan'), color: '#3b82f6', dash: '6 3', dot: false }] : []),
        ...(historicalData.some(h => h.has_data) ? [{ label: 'Données réelles', color: '#8b5cf6', dash: '', dot: true }] : []),
      ].map((l, i) => (
        <g key={i} transform={`translate(${PAD.l + i * 145}, ${H - 8})`}>
          {l.dot
            ? <circle cx={12} cy={0} r={4} fill={l.color} />
            : <line x1={0} y1={0} x2={24} y2={0} stroke={l.color} strokeWidth={2} strokeDasharray={l.dash} />
          }
          <text x={l.dot ? 20 : 28} y={4} fontSize={9} fill="#6b7280">{l.label}</text>
        </g>
      ))}

      {/* Real historical data points */}
      {historicalData.filter(h => h.has_data && h.total_tco2e > 0).map((h, i) => (
        <g key={h.year}>
          <circle cx={xScale(h.year)} cy={yScale(h.total_tco2e)} r={5} fill="#8b5cf6" stroke="white" strokeWidth={1.5} />
          <text x={xScale(h.year)} y={yScale(h.total_tco2e) - 8} textAnchor="middle" fontSize={9} fill="#8b5cf6" fontWeight="bold">
            {(h.total_tco2e / 1000).toFixed(1)}k
          </text>
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

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Avancement</span>
          <span className="font-semibold">
            {action.status === 'terminé' ? '100%' : action.status === 'en_cours' ? '50%' : '0%'}
          </span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              action.status === 'terminé' ? 'bg-green-500' :
              action.status === 'en_cours' ? 'bg-blue-400' : 'bg-gray-200'
            }`}
            style={{ width: action.status === 'terminé' ? '100%' : action.status === 'en_cours' ? '50%' : '4%' }}
          />
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

  // ── Real emissions from API ──────────────────────────────────────────────
  const [baseEmissions, setBaseEmissions] = useState(DEFAULT_BASE_EMISSIONS);
  const [scope1, setScope1] = useState(0);
  const [scope2, setScope2] = useState(0);
  const [scope3, setScope3] = useState(0);
  const [hasRealData, setHasRealData] = useState(false);
  const [loadingEmissions, setLoadingEmissions] = useState(true);
  const [historicalData, setHistoricalData] = useState<HistoricalPoint[]>([]);
  const [planLoaded, setPlanLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load real emissions (current year)
  useEffect(() => {
    api.get('/carbon/scope-summary', { params: { year: new Date().getFullYear() } })
      .then(res => {
        const d = res.data;
        const s1 = d.scope1?.total_tco2e || 0;
        const s2 = d.scope2?.total_tco2e || 0;
        const s3 = d.scope3?.total_tco2e || 0;
        const total = s1 + s2 + s3;
        if (total > 0) {
          setScope1(s1); setScope2(s2); setScope3(s3);
          setBaseEmissions(Math.round(total));
          setHasRealData(true);
        } else if (d.has_real_data) {
          setHasRealData(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingEmissions(false));
  }, []);

  // Load historical emissions (last 5 years)
  useEffect(() => {
    api.get('/carbon/history', { params: { years: 5 } })
      .then(res => {
        setHistoricalData(res.data?.history || []);
      })
      .catch(() => {});
  }, []);

  // Load saved plan from API
  useEffect(() => {
    api.get('/carbon/plan')
      .then(res => {
        const savedActions: { id: string; inPlan: boolean; status: ActionStatus }[] = res.data?.actions || [];
        if (savedActions.length > 0) {
          setActions(prev => prev.map(a => {
            const saved = savedActions.find(s => s.id === a.id);
            return saved ? { ...a, inPlan: saved.inPlan, status: saved.status } : a;
          }));
        }
      })
      .catch(() => {})
      .finally(() => setPlanLoaded(true));
  }, []);

  // Auto-save plan (debounced 1.5s) after plan is loaded
  const savePlan = useCallback((currentActions: Action[]) => {
    if (!planLoaded) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setSaving(true);
      const payload = {
        actions: currentActions.map(a => ({ id: a.id, inPlan: a.inPlan, status: a.status })),
        saved_at: new Date().toISOString(),
      };
      api.post('/carbon/plan', payload)
        .catch(() => toast.error('Impossible de sauvegarder le plan'))
        .finally(() => setSaving(false));
    }, 1500);
  }, [planLoaded]);

  useEffect(() => {
    if (planLoaded) savePlan(actions);
  }, [actions, planLoaded, savePlan]);

  const trajectory = useMemo(() => buildTrajectory(baseEmissions), [baseEmissions]);
  const sbtiTarget2030 = Math.round(baseEmissions * 0.58);

  // SBTi commitment tracking state
  type SBTiStatus = 'not_committed' | 'letter_sent' | 'targets_set' | 'validated';
  type SBTiMethod = '1.5C' | 'WB2C' | 'FLAG' | 'SDA';
  const [sbtiStatus, setSbtiStatus] = useState<SBTiStatus>('not_committed');
  const [sbtiMethod, setSbtiMethod] = useState<SBTiMethod>('1.5C');
  const [sbtiNetZeroYear, setSbtiNetZeroYear] = useState<number>(2050);

  // Compute plan stats
  const planActions = useMemo(() => actions.filter(a => a.inPlan), [actions]);
  const planReduction = useMemo(() => planActions.reduce((s, a) => s + a.impact, 0), [planActions]);
  const planCost = useMemo(() => planActions.reduce((s, a) => s + a.cost, 0), [planActions]);
  const planPct = Math.min(Math.round((planReduction / Math.max(baseEmissions - sbtiTarget2030, 1)) * 100), 100);
  const projected2030 = Math.max(baseEmissions - planReduction, sbtiTarget2030);
  const onTrack = projected2030 <= sbtiTarget2030;

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
    <div className="space-y-6">

      {/* ── Hero gradient ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-800 via-emerald-700 to-teal-600 p-8 text-white shadow-xl">
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%"><defs><pattern id="dp" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M12 0 L24 12 L12 24 L0 12 Z" stroke="white" strokeWidth="0.5" fill="none"/></pattern></defs><rect width="100%" height="100%" fill="url(#dp)"/></svg>
        </div>
        <div className="relative flex items-start justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
              <FlameKindling className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{tr('decarbonation.title')}</h1>
              <p className="text-sm text-green-100 mt-0.5">{tr('decarbonation.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saving && (
              <span className="text-xs text-green-200 flex items-center gap-1">
                <RefreshCw className="h-3 w-3 animate-spin" /> Sauvegarde…
              </span>
            )}
            {!saving && planLoaded && planActions.length > 0 && (
              <span className="text-xs text-green-200">✓ Plan sauvegardé</span>
            )}
            <button
              onClick={() => {
                const rows = [
                  ['Catégorie', 'Action', 'Scope', 'Impact (tCO2e/an)', 'Coût (k€)', 'ROI (mois)', 'Difficulté', 'Statut', 'Dans le plan'],
                  ...actions.map(a => [a.category, a.title, a.scope, a.impact, a.cost, a.roi, a.difficulty, a.status, a.inPlan ? 'Oui' : 'Non']),
                ];
                const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `plan-decarbonisation-${new Date().toISOString().slice(0, 10)}.csv`;
                a.click(); URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 border border-white/30 text-white rounded-xl text-sm font-medium transition-colors backdrop-blur-sm"
            >
              <Download className="h-4 w-4" />
              {tr('decarbonation.exportPlan')}
            </button>
          </div>
        </div>
        {/* Tabs */}
        <div className="relative mt-6 flex gap-2">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all ${tab === t.id ? 'bg-white text-green-700 shadow-md' : 'text-white/80 hover:bg-white/20'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-0 py-0">

        {/* ── Overview tab ── */}
        {tab === 'overview' && (
          <div className="space-y-8">
            {/* Source données */}
            {hasRealData && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
                <span>Émissions calculées depuis vos données réelles —
                  Scope 1 : <strong>{scope1.toLocaleString()} tCO₂e</strong> ·
                  Scope 2 : <strong>{scope2.toLocaleString()} tCO₂e</strong>
                  {scope3 > 0 ? <> · Scope 3 : <strong>{scope3.toLocaleString()} tCO₂e</strong></> : null}
                </span>
              </div>
            )}
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: tr('decarbonation.kpiBase2024'), value: `${(baseEmissions / 1000).toFixed(1)}k`, unit: 'tCO₂e', color: 'text-gray-900', bg: 'bg-white border-gray-200' },
                { label: tr('decarbonation.kpiSbtiTarget'), value: `${(sbtiTarget2030 / 1000).toFixed(1)}k`, unit: 'tCO₂e (-42%)', color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
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
                  {onTrack ? `✓ ${tr('decarbonation.onTrack')}` : `${tr('decarbonation.offTrack')} ${(projected2030 - sbtiTarget2030).toLocaleString()} tCO₂e`}
                </span>
              </div>
              <div className="space-y-3">
                {/* SBTi bar */}
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                    <span>{tr('decarbonation.sbtiRequired')}</span>
                    <span className="font-semibold">{(baseEmissions - sbtiTarget2030).toLocaleString()} tCO₂e</span>
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

            {/* ── SBTi Engagement & Validation ───────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <span className="text-xl">🎯</span> Engagement SBTi — Science Based Targets
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">Suivez votre parcours de validation auprès de la Science Based Targets initiative</p>
                </div>
                <a
                  href="https://sciencebasedtargets.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-green-600 hover:underline flex-shrink-0"
                >
                  sbti.org →
                </a>
              </div>

              {/* 4-step commitment tracker */}
              <div className="relative mb-6">
                <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-200" />
                <div className="relative flex justify-between">
                  {([
                    { key: 'not_committed', label: 'Non engagé',       desc: 'Étape initiale',              icon: '○' },
                    { key: 'letter_sent',   label: 'Lettre d\'engagement', desc: 'Envoyée à SBTi',          icon: '📩' },
                    { key: 'targets_set',   label: 'Cibles soumises',  desc: 'En cours de validation',      icon: '📋' },
                    { key: 'validated',     label: 'Cibles validées',  desc: 'Approuvées par SBTi',         icon: '✅' },
                  ] as { key: SBTiStatus; label: string; desc: string; icon: string }[]).map((step, i) => {
                    const statuses: SBTiStatus[] = ['not_committed', 'letter_sent', 'targets_set', 'validated'];
                    const currentIdx = statuses.indexOf(sbtiStatus);
                    const stepIdx = statuses.indexOf(step.key);
                    const done    = stepIdx < currentIdx;
                    const active  = stepIdx === currentIdx;
                    return (
                      <button
                        key={step.key}
                        onClick={() => setSbtiStatus(step.key)}
                        className="flex flex-col items-center gap-1.5 w-24 relative z-10 group"
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm border-2 transition-all ${
                          done    ? 'bg-green-500 border-green-500 text-white' :
                          active  ? 'bg-blue-600 border-blue-600 text-white shadow-md' :
                                    'bg-white border-gray-300 text-gray-400 group-hover:border-blue-300'
                        }`}>
                          {done ? '✓' : step.icon}
                        </div>
                        <span className={`text-xs font-semibold text-center leading-tight ${active ? 'text-blue-700' : done ? 'text-green-700' : 'text-gray-400'}`}>
                          {step.label}
                        </span>
                        <span className="text-[10px] text-gray-400 text-center leading-tight hidden sm:block">{step.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status-specific message */}
              <div className={`mb-5 p-3 rounded-xl text-xs ${
                sbtiStatus === 'validated'     ? 'bg-green-50 border border-green-200 text-green-800' :
                sbtiStatus === 'targets_set'   ? 'bg-blue-50 border border-blue-200 text-blue-800' :
                sbtiStatus === 'letter_sent'   ? 'bg-amber-50 border border-amber-200 text-amber-800' :
                                                 'bg-gray-50 border border-gray-200 text-gray-600'
              }`}>
                {sbtiStatus === 'validated'   && '✅ Félicitations — vos cibles sont validées par SBTi. Publiez-les dans votre rapport CSRD (ESRS E1-1) et sur votre site corporate.'}
                {sbtiStatus === 'targets_set' && '📋 Cibles soumises à SBTi. La validation prend généralement 3 à 6 mois. Assurez-vous que vos plans d\'action couvrent la réduction requise.'}
                {sbtiStatus === 'letter_sent' && '📩 Lettre d\'engagement reçue par SBTi. Vous avez 24 mois pour soumettre vos cibles chiffrées (Scope 1+2 obligatoire, Scope 3 si >40% des émissions).'}
                {sbtiStatus === 'not_committed' && '💡 Votre entreprise n\'a pas encore soumis de lettre d\'engagement SBTi. Cliquez sur une étape pour mettre à jour votre statut.'}
              </div>

              {/* Methodology & targets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Methodology selector */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Méthodologie SBTi</p>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { key: '1.5C',  label: '1,5°C',          desc: 'Trajectoire ambitieuse (recommandée)', badge: 'bg-green-100 text-green-700' },
                      { key: 'WB2C',  label: 'Well-Below 2°C',  desc: 'Trajectoire alignée 2°C',             badge: 'bg-blue-100 text-blue-700' },
                      { key: 'FLAG',  label: 'FLAG',             desc: 'Forêts, terres & agriculture',        badge: 'bg-amber-100 text-amber-700' },
                      { key: 'SDA',   label: 'SDA sectoriel',   desc: 'Allocation sectorielle',              badge: 'bg-purple-100 text-purple-700' },
                    ] as { key: SBTiMethod; label: string; desc: string; badge: string }[]).map(m => (
                      <button
                        key={m.key}
                        onClick={() => setSbtiMethod(m.key)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          sbtiMethod === m.key
                            ? 'border-blue-400 bg-blue-50 shadow-sm'
                            : 'border-gray-200 hover:border-blue-200'
                        }`}
                      >
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold mb-1 ${m.badge}`}>{m.label}</span>
                        <p className="text-[11px] text-gray-500 leading-tight">{m.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Targets summary */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Objectifs cibles</p>
                  <div className="space-y-3">
                    {/* Near-term 2030 */}
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-700">Objectif court terme (2030)</span>
                        <span className="text-xs font-bold text-green-700">
                          {sbtiMethod === '1.5C' ? '−42%' : sbtiMethod === 'WB2C' ? '−35%' : '−30%'} Scope 1+2
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${onTrack ? 'bg-green-500' : 'bg-amber-400'}`}
                          style={{ width: `${Math.min(planPct, 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">{planPct}% de l'objectif couvert par le plan actuel</p>
                    </div>
                    {/* Long-term net-zero */}
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-700">Objectif long terme (Net-Zéro)</span>
                        <div className="flex items-center gap-1">
                          <select
                            value={sbtiNetZeroYear}
                            onChange={e => setSbtiNetZeroYear(parseInt(e.target.value))}
                            className="text-xs border border-gray-300 rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                          >
                            {[2045, 2050, 2055].map(y => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-500">
                        Réduction de {sbtiMethod === '1.5C' ? '≥90%' : '≥90%'} des émissions Scope 1+2+3 + neutralisation du résiduel avec CDR permanent.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* SBTi score vs plan */}
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <span className="text-xs text-gray-400">Cible SBTi 2030</span>
                    <p className="font-bold text-gray-900">{(sbtiTarget2030 / 1000).toFixed(1)}k tCO₂e</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">Projeté 2030 (plan actuel)</span>
                    <p className={`font-bold ${onTrack ? 'text-green-700' : 'text-red-600'}`}>{(projected2030 / 1000).toFixed(1)}k tCO₂e</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">Écart</span>
                    <p className={`font-bold ${onTrack ? 'text-green-700' : 'text-red-600'}`}>
                      {onTrack ? '✓ Dans la cible' : `+${((projected2030 - sbtiTarget2030) / 1000).toFixed(1)}k à réduire`}
                    </p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                  sbtiStatus === 'validated'   ? 'bg-green-100 text-green-700 border border-green-300' :
                  sbtiStatus === 'targets_set' ? 'bg-blue-100 text-blue-700 border border-blue-300' :
                  sbtiStatus === 'letter_sent' ? 'bg-amber-100 text-amber-700 border border-amber-300' :
                                                 'bg-gray-100 text-gray-500 border border-gray-300'
                }`}>
                  {sbtiStatus === 'validated'   ? '✅ SBTi Validé' :
                   sbtiStatus === 'targets_set' ? '📋 En validation' :
                   sbtiStatus === 'letter_sent' ? '📩 Engagé' :
                                                  '○ Non soumis'}
                </span>
              </div>
            </div>

            {/* ── Progression du plan ─────────────────────────────────────── */}
            {planActions.length > 0 && (() => {
              const planCompleted = planActions.filter(a => a.status === 'terminé');
              const planInProgress = planActions.filter(a => a.status === 'en_cours');
              const achievedReduction = planCompleted.reduce((s, a) => s + a.impact, 0);
              const completionPct = Math.round((planCompleted.length / planActions.length) * 100);
              return (
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Progression du plan
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                    <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100">
                      <p className="text-3xl font-bold text-green-700">{completionPct}%</p>
                      <p className="text-xs text-green-600 mt-1 font-medium">Actions terminées</p>
                      <p className="text-xs text-gray-400">{planCompleted.length}/{planActions.length} actions</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-100">
                      <p className="text-3xl font-bold text-emerald-700">{achievedReduction.toLocaleString()}</p>
                      <p className="text-xs text-emerald-600 mt-1 font-medium">tCO₂e économisées</p>
                      <p className="text-xs text-gray-400">réductions réalisées</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
                      <p className="text-3xl font-bold text-blue-700">{(planReduction - achievedReduction).toLocaleString()}</p>
                      <p className="text-xs text-blue-600 mt-1 font-medium">tCO₂e restantes</p>
                      <p className="text-xs text-gray-400">{planInProgress.length} en cours</p>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                      <span>Avancement global du plan</span>
                      <span className="font-bold text-gray-700">{completionPct}%</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
                      <div className="h-full bg-green-500 transition-all duration-700" style={{ width: `${completionPct}%` }} />
                      <div className="h-full bg-blue-300 transition-all duration-700" style={{ width: `${Math.round((planInProgress.length / planActions.length) * 100)}%` }} />
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Terminé</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-300 inline-block" />En cours</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-200 inline-block" />À faire</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Trajectory preview */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">{tr('decarbonation.trajectoryTitle')}</h2>
              <TrajectoryChart planReduction={planReduction} baseEmissions={baseEmissions} trajectory={trajectory} historicalData={historicalData} />
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
                        <div className="flex justify-between"><span className="text-gray-500">{tr('decarbonation.scenarioSbtiCoverage')}</span><span className="font-semibold">{Math.min(Math.round(scImpact / Math.max(baseEmissions - sbtiTarget2030, 1) * 100), 100)}%</span></div>
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
              <TrajectoryChart planReduction={planReduction} baseEmissions={baseEmissions} trajectory={trajectory} historicalData={historicalData} />
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
              <TrajectoryChart planReduction={planReduction} baseEmissions={baseEmissions} trajectory={trajectory} historicalData={historicalData} />
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

            {/* Real historical data table */}
            {historicalData.some(h => h.has_data && h.total_tco2e > 0) && (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <h2 className="text-lg font-bold text-gray-900">Historique réel des émissions</h2>
                  <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Source : vos données</span>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                      <th className="px-6 py-3 text-left">Année</th>
                      <th className="px-6 py-3 text-right">Scope 1</th>
                      <th className="px-6 py-3 text-right">Scope 2</th>
                      <th className="px-6 py-3 text-right">Scope 3</th>
                      <th className="px-6 py-3 text-right font-bold">Total</th>
                      <th className="px-6 py-3 text-right">Évolution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {historicalData.filter(h => h.has_data && h.total_tco2e > 0).map((h, idx, arr) => {
                      const prev = arr[idx - 1];
                      const change = prev && prev.total_tco2e > 0
                        ? ((h.total_tco2e - prev.total_tco2e) / prev.total_tco2e * 100).toFixed(1)
                        : null;
                      const isDown = change !== null && parseFloat(change) < 0;
                      return (
                        <tr key={h.year} className={h.year === new Date().getFullYear() ? 'bg-purple-50' : ''}>
                          <td className="px-6 py-3 font-bold text-gray-900">{h.year}
                            {h.year === new Date().getFullYear() && <span className="ml-2 text-xs bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full">En cours</span>}
                          </td>
                          <td className="px-6 py-3 text-right text-gray-700">{h.scope1 > 0 ? `${h.scope1.toLocaleString()} t` : '—'}</td>
                          <td className="px-6 py-3 text-right text-gray-700">{h.scope2 > 0 ? `${h.scope2.toLocaleString()} t` : '—'}</td>
                          <td className="px-6 py-3 text-right text-gray-700">{h.scope3 > 0 ? `${h.scope3.toLocaleString()} t` : '—'}</td>
                          <td className="px-6 py-3 text-right font-bold text-gray-900">{h.total_tco2e.toLocaleString()} tCO₂e</td>
                          <td className="px-6 py-3 text-right">
                            {change !== null ? (
                              <span className={`text-xs font-bold ${isDown ? 'text-green-600' : 'text-red-500'}`}>
                                {isDown ? '↓' : '↑'} {Math.abs(parseFloat(change))}%
                              </span>
                            ) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Info box */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
              <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                {tr('decarbonation.trajectoryInfoBox')}
                {!historicalData.some(h => h.has_data && h.total_tco2e > 0) && (
                  <span className="block mt-1 text-xs text-blue-500">
                    💡 Aucune donnée historique trouvée. Importez vos données via <strong>Saisie de données</strong> pour voir l'évolution réelle de vos émissions.
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
