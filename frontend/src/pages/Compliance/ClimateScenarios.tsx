import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  BarChart2, Thermometer, Zap, AlertTriangle,
  TrendingDown, TrendingUp, Shield, Save, FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type ScenarioId = 'nze' | 'aps' | 'steps' | 'ngfs_nz' | 'ngfs_dt' | 'ngfs_hhw' | 'rcp26' | 'rcp45' | 'rcp85';
type TimeHorizon = 'short' | 'medium' | 'long';
type RiskType = 'acute' | 'chronic';
type TransitionType = 'policy' | 'technology' | 'market' | 'reputation' | 'legal';
type Tab = 'scenarios' | 'physical' | 'transition';

interface ClimateScenario {
  id: ScenarioId;
  source: 'IEA' | 'NGFS' | 'IPCC';
  name: string;
  shortName: string;
  tempTarget: number;
  description: string;
  color: string;
  gdpImpact: string;
  carbonPrice2030: string;
}

interface PhysicalRisk {
  id: string;
  type: RiskType;
  name: string;
  likelihood: number;
  severity: number;
  timeHorizon: TimeHorizon;
  affectedAssets: string;
  financialImpact: number;
  adaptationMeasure: string;
  scenarioIds: (ScenarioId | 'all')[];
}

interface TransitionRisk {
  id: string;
  type: TransitionType;
  name: string;
  likelihood: number;
  severity: number;
  timeHorizon: TimeHorizon;
  description: string;
  financialImpact: number;
  opportunityAmount: number;
  mitigationMeasure: string;
}

// ─── Static data ──────────────────────────────────────────────────────────────

function getSCENARIOS(t: TFunction): ClimateScenario[] {
  return [
    { id: 'nze', source: 'IEA', name: 'Net Zero Emissions 2050', shortName: 'IEA NZE', tempTarget: 1.5, description: t('compliance.climateScenarios.scenario.nze.description', "Trajectoire de neutralité carbone mondiale à horizon 2050. Prix carbone atteignant 250 $/tCO2 en 2030 dans les économies avancées. Fin des nouvelles approbations de projets pétroliers et gaziers."), color: '#16a34a', gdpImpact: t('compliance.climateScenarios.scenario.nze.gdpImpact', '+3% PIB (bénéfices santé + évitement dommages)'), carbonPrice2030: '250 $/tCO2' },
    { id: 'aps', source: 'IEA', name: 'Announced Pledges Scenario', shortName: 'IEA APS', tempTarget: 1.7, description: t('compliance.climateScenarios.scenario.aps.description', "Tous les engagements climatiques gouvernementaux (NDCs, net-zero) sont atteints dans les délais prévus. Trajectoire vers 1,7°C."), color: '#2563eb', gdpImpact: t('compliance.climateScenarios.scenario.aps.gdpImpact', 'Neutre à légèrement positif'), carbonPrice2030: '135 $/tCO2' },
    { id: 'steps', source: 'IEA', name: 'Stated Policies Scenario', shortName: 'IEA STEPS', tempTarget: 2.5, description: t('compliance.climateScenarios.scenario.steps.description', "Seules les politiques actuellement en vigueur sont maintenues. Trajectoire vers 2,5°C à l'horizon 2100."), color: '#d97706', gdpImpact: t('compliance.climateScenarios.scenario.steps.gdpImpact', '-3% PIB vs NZE (dommages climatiques)'), carbonPrice2030: '80 $/tCO2' },
    { id: 'ngfs_nz', source: 'NGFS', name: 'Net Zero 2050', shortName: 'NGFS NZ', tempTarget: 1.5, description: t('compliance.climateScenarios.scenario.ngfs_nz.description', "Transition ordonnée et immédiate vers la neutralité carbone. Politiques climatiques ambitieuses, prévisibles et crédibles."), color: '#059669', gdpImpact: t('compliance.climateScenarios.scenario.ngfs_nz.gdpImpact', '-2% PIB (coûts transition)'), carbonPrice2030: '190 $/tCO2' },
    { id: 'ngfs_dt', source: 'NGFS', name: 'Delayed Transition', shortName: 'NGFS DT', tempTarget: 1.8, description: t('compliance.climateScenarios.scenario.ngfs_dt.description', "Transition retardée avec politiques plus abruptes après 2030. Risques de transition élevés sur courte période."), color: '#ea580c', gdpImpact: t('compliance.climateScenarios.scenario.ngfs_dt.gdpImpact', '-4% PIB (transition brutale + dommages)'), carbonPrice2030: '320 $/tCO2 (après 2030)' },
    { id: 'ngfs_hhw', source: 'NGFS', name: 'Hot House World', shortName: 'NGFS HHW', tempTarget: 3.0, description: t('compliance.climateScenarios.scenario.ngfs_hhw.description', "Absence d'action climatique additionnelle. Risques physiques très élevés, impacts irréversibles sur les écosystèmes."), color: '#dc2626', gdpImpact: t('compliance.climateScenarios.scenario.ngfs_hhw.gdpImpact', '-10% PIB (dommages climatiques sévères)'), carbonPrice2030: '10 $/tCO2' },
    { id: 'rcp26', source: 'IPCC', name: t('compliance.climateScenarios.scenario.rcp26.name', 'RCP 2.6 — Scénario ambitieux'), shortName: 'RCP 2.6', tempTarget: 2.0, description: t('compliance.climateScenarios.scenario.rcp26.description', "Forçage radiatif plafonné à 2,6 W/m². Compatible avec l'objectif 2°C de l'Accord de Paris."), color: '#0891b2', gdpImpact: t('compliance.climateScenarios.scenario.rcp26.gdpImpact', 'Légèrement négatif à court terme'), carbonPrice2030: '100 $/tCO2' },
    { id: 'rcp45', source: 'IPCC', name: t('compliance.climateScenarios.scenario.rcp45.name', 'RCP 4.5 — Scénario intermédiaire'), shortName: 'RCP 4.5', tempTarget: 2.4, description: t('compliance.climateScenarios.scenario.rcp45.description', "Forçage radiatif stabilisé à 4,5 W/m². Pic d'émissions vers 2040 puis déclin."), color: '#f59e0b', gdpImpact: t('compliance.climateScenarios.scenario.rcp45.gdpImpact', '-1 à -2% PIB (risques physiques modérés)'), carbonPrice2030: '50 $/tCO2' },
    { id: 'rcp85', source: 'IPCC', name: t('compliance.climateScenarios.scenario.rcp85.name', 'RCP 8.5 — Scénario tendanciel'), shortName: 'RCP 8.5', tempTarget: 4.0, description: t('compliance.climateScenarios.scenario.rcp85.description', "Forçage radiatif de 8,5 W/m² en 2100. Hausse de température de 4°C. Risques physiques catastrophiques."), color: '#7f1d1d', gdpImpact: t('compliance.climateScenarios.scenario.rcp85.gdpImpact', '-15% PIB (dommages climatiques extrêmes)'), carbonPrice2030: '5 $/tCO2' },
  ];
}

function getDefaultPhysicalRisks(t: TFunction): PhysicalRisk[] {
  return [
    { id: 'pr-01', type: 'acute', name: t('compliance.climateScenarios.physRisk.pr-01.name', 'Inondations et crues soudaines'), likelihood: 4, severity: 4, timeHorizon: 'medium', affectedAssets: t('compliance.climateScenarios.physRisk.pr-01.assets', 'Sites de production, entrepôts, data centers'), financialImpact: 0, adaptationMeasure: '', scenarioIds: ['ngfs_hhw', 'rcp85', 'steps'] },
    { id: 'pr-02', type: 'acute', name: t('compliance.climateScenarios.physRisk.pr-02.name', 'Vagues de chaleur extrêmes'), likelihood: 5, severity: 3, timeHorizon: 'short', affectedAssets: t('compliance.climateScenarios.physRisk.pr-02.assets', 'Chaîne logistique, productivité des salariés'), financialImpact: 0, adaptationMeasure: '', scenarioIds: ['ngfs_hhw', 'rcp85'] },
    { id: 'pr-03', type: 'acute', name: t('compliance.climateScenarios.physRisk.pr-03.name', 'Tempêtes et cyclones intensifiés'), likelihood: 3, severity: 4, timeHorizon: 'medium', affectedAssets: t('compliance.climateScenarios.physRisk.pr-03.assets', 'Infrastructures côtières, transport maritime'), financialImpact: 0, adaptationMeasure: '', scenarioIds: ['ngfs_hhw', 'rcp85', 'steps'] },
    { id: 'pr-04', type: 'chronic', name: t('compliance.climateScenarios.physRisk.pr-04.name', 'Stress hydrique et sécheresse'), likelihood: 4, severity: 4, timeHorizon: 'medium', affectedAssets: t('compliance.climateScenarios.physRisk.pr-04.assets', "Approvisionnement en eau industrielle, agriculture"), financialImpact: 0, adaptationMeasure: '', scenarioIds: ['ngfs_hhw', 'rcp85', 'steps', 'ngfs_dt'] },
    { id: 'pr-05', type: 'chronic', name: t('compliance.climateScenarios.physRisk.pr-05.name', 'Élévation du niveau de la mer'), likelihood: 3, severity: 5, timeHorizon: 'long', affectedAssets: t('compliance.climateScenarios.physRisk.pr-05.assets', 'Sites côtiers, infrastructures portuaires'), financialImpact: 0, adaptationMeasure: '', scenarioIds: ['ngfs_hhw', 'rcp85'] },
    { id: 'pr-06', type: 'chronic', name: t('compliance.climateScenarios.physRisk.pr-06.name', 'Augmentation des températures moyennes'), likelihood: 5, severity: 3, timeHorizon: 'medium', affectedAssets: t('compliance.climateScenarios.physRisk.pr-06.assets', 'Consommation énergétique (climatisation), rendements agricoles'), financialImpact: 0, adaptationMeasure: '', scenarioIds: ['all'] },
    { id: 'pr-07', type: 'acute', name: t('compliance.climateScenarios.physRisk.pr-07.name', "Feux de forêt et fumées"), likelihood: 3, severity: 3, timeHorizon: 'short', affectedAssets: t('compliance.climateScenarios.physRisk.pr-07.assets', "Sites proches de zones forestières, qualité de l'air"), financialImpact: 0, adaptationMeasure: '', scenarioIds: ['ngfs_hhw', 'rcp85'] },
  ];
}

function getDefaultTransitionRisks(t: TFunction): TransitionRisk[] {
  return [
    { id: 'tr-01', type: 'policy', name: t('compliance.climateScenarios.transRisk.tr-01.name', 'Hausse du prix du carbone (EU ETS)'), likelihood: 5, severity: 4, timeHorizon: 'short', description: t('compliance.climateScenarios.transRisk.tr-01.desc', 'Extension EU ETS au maritime/routier, hausse des prix de quotas vers 150-200€/t en 2030'), financialImpact: 0, opportunityAmount: 0, mitigationMeasure: '' },
    { id: 'tr-02', type: 'policy', name: t('compliance.climateScenarios.transRisk.tr-02.name', 'Taxe carbone aux frontières (CBAM)'), likelihood: 5, severity: 3, timeHorizon: 'short', description: t('compliance.climateScenarios.transRisk.tr-02.desc', "Carbon Border Adjustment Mechanism (CBAM) applicable aux importations d'acier, ciment, fertilisants, aluminium, hydrogène, électricité"), financialImpact: 0, opportunityAmount: 0, mitigationMeasure: '' },
    { id: 'tr-03', type: 'technology', name: t('compliance.climateScenarios.transRisk.tr-03.name', 'Disruption technologique (cleantech)'), likelihood: 4, severity: 3, timeHorizon: 'medium', description: t('compliance.climateScenarios.transRisk.tr-03.desc', 'Baisse des coûts du stockage énergie, véhicules électriques, pompes à chaleur rendant obsolètes les technologies actuelles'), financialImpact: 0, opportunityAmount: 0, mitigationMeasure: '' },
    { id: 'tr-04', type: 'market', name: t('compliance.climateScenarios.transRisk.tr-04.name', 'Évolution de la demande consommateurs (green premium)'), likelihood: 4, severity: 3, timeHorizon: 'medium', description: t('compliance.climateScenarios.transRisk.tr-04.desc', 'Préférence croissante pour les produits à faible empreinte carbone. Risque de perte de parts de marché.'), financialImpact: 0, opportunityAmount: 0, mitigationMeasure: '' },
    { id: 'tr-05', type: 'reputation', name: t('compliance.climateScenarios.transRisk.tr-05.name', 'Greenwashing et litiges climatiques'), likelihood: 3, severity: 4, timeHorizon: 'short', description: t('compliance.climateScenarios.transRisk.tr-05.desc', 'Risque de poursuites judiciaires pour inaction climatique ou déclarations trompeuses (litigation trend mondial)'), financialImpact: 0, opportunityAmount: 0, mitigationMeasure: '' },
    { id: 'tr-06', type: 'legal', name: t('compliance.climateScenarios.transRisk.tr-06.name', 'Obligations de reporting CSRD/ISSB'), likelihood: 5, severity: 2, timeHorizon: 'short', description: t('compliance.climateScenarios.transRisk.tr-06.desc', 'Coûts de conformité aux nouvelles obligations de reporting ESG (CSRD, ISSB, SEC climate rules)'), financialImpact: 0, opportunityAmount: 0, mitigationMeasure: '' },
    { id: 'tr-07', type: 'market', name: t('compliance.climateScenarios.transRisk.tr-07.name', 'Coût de financement ESG-linked'), likelihood: 4, severity: 3, timeHorizon: 'medium', description: t('compliance.climateScenarios.transRisk.tr-07.desc', 'Primes de risque plus élevées pour les entreprises à forte intensité carbone. Coût de capital plus élevé.'), financialImpact: 0, opportunityAmount: 0, mitigationMeasure: '' },
  ];
}

const LS_KEY = 'climate_scenarios_data';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SOURCE_COLORS: Record<string, string> = {
  IEA: '#2563eb',
  NGFS: '#16a34a',
  IPCC: '#7c3aed',
};

const HORIZON_LABELS: Record<TimeHorizon, string> = {
  short: 'Court terme (0-3 ans)',
  medium: 'Moyen terme (3-10 ans)',
  long: 'Long terme (10 ans+)',
};

const HORIZON_SHORT: Record<TimeHorizon, string> = {
  short: 'Court terme',
  medium: 'Moyen terme',
  long: 'Long terme',
};

// i18n keys for horizon shorts — used via t(`compliance.climateScenarios.horizonShort.${h}`, HORIZON_SHORT[h])
// already referenced in HorizonChip below

const TRANSITION_COLORS: Record<TransitionType, string> = {
  policy: '#2563eb',
  technology: '#7c3aed',
  market: '#f59e0b',
  reputation: '#ea580c',
  legal: '#dc2626',
};

const TRANSITION_LABELS: Record<TransitionType, string> = {
  policy: 'Politique & Réglementaire',
  technology: 'Technologique',
  market: 'Marché',
  reputation: 'Réputation',
  legal: 'Juridique',
};
// i18n keys: compliance.climateScenarios.transitionType.{policy|technology|market|reputation|legal}

function riskCellColor(l: number, s: number): string {
  const score = l + s;
  if (score <= 3) return '#dcfce7';
  if (score <= 5) return '#fef9c3';
  if (score <= 7) return '#fed7aa';
  return '#fecaca';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Slider({ value, onChange, color }: { value: number; onChange: (v: number) => void; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <input
        type="range" min={1} max={5} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: color }}
      />
      <span style={{ fontWeight: 700, color, minWidth: 16, textAlign: 'center' }}>{value}</span>
    </div>
  );
}

function HorizonChip({ horizon }: { horizon: TimeHorizon }) {
  const { t } = useTranslation();
  const colors: Record<TimeHorizon, string> = { short: '#0891b2', medium: '#7c3aed', long: '#16a34a' };
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 99,
      fontSize: 11, fontWeight: 600, background: colors[horizon] + '18', color: colors[horizon],
    }}>
      {t(`compliance.climateScenarios.horizonShort.${horizon}`, HORIZON_SHORT[horizon])}
    </span>
  );
}

// ─── Temperature SVG Chart ────────────────────────────────────────────────────

function TempChart({ selected, scenarios }: { selected: Set<ScenarioId>; scenarios: ClimateScenario[] }) {
  const { t } = useTranslation();
  const W = 420, H = 200, PL = 36, PR = 12, PT = 12, PB = 28;
  const CW = W - PL - PR, CH = H - PT - PB;
  const years = [2024, 2050, 2100];
  const yMin = 1.0, yMax = 5.0;

  function xOf(year: number) { return PL + ((year - 2024) / (2100 - 2024)) * CW; }
  function yOf(temp: number) { return PT + CH - ((temp - yMin) / (yMax - yMin)) * CH; }

  // Approximate bezier: grows slowly then faster toward 2100
  function pathFor(s: ClimateScenario) {
    const t0 = 1.2; // approx current temp anomaly
    const tMid = t0 + (s.tempTarget - t0) * 0.55;
    const x0 = xOf(2024), x1 = xOf(2050), x2 = xOf(2100);
    const y0 = yOf(t0), y1 = yOf(tMid), y2 = yOf(s.tempTarget);
    return `M${x0},${y0} C${x0 + (x1 - x0) * 0.5},${y0} ${x1 - (x1 - x0) * 0.3},${y1} ${x1},${y1} C${x1 + (x2 - x1) * 0.3},${y1} ${x2 - (x2 - x1) * 0.4},${y2} ${x2},${y2}`;
  }

  const refLines = [{ temp: 1.5, label: '1.5°C', color: '#16a34a' }, { temp: 2.0, label: '2°C', color: '#f59e0b' }];
  const yTicks = [1, 2, 3, 4, 5];
  const selected_scenarios = scenarios.filter(s => selected.has(s.id));

  return (
    <div style={{ marginTop: 24 }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
        {t('compliance.climateScenarios.tempTrajectories', 'Trajectoires de température (2024–2100)')}
      </p>
      <svg width={W} height={H} style={{ display: 'block' }}>
        {/* Grid lines */}
        {yTicks.map(t => (
          <g key={t}>
            <line x1={PL} x2={W - PR} y1={yOf(t)} y2={yOf(t)} stroke="#e5e7eb" strokeWidth={1} />
            <text x={PL - 4} y={yOf(t) + 4} textAnchor="end" fontSize={9} fill="#9ca3af">{t}°</text>
          </g>
        ))}
        {years.map(y => (
          <g key={y}>
            <line x1={xOf(y)} x2={xOf(y)} y1={PT} y2={H - PB} stroke="#e5e7eb" strokeWidth={1} strokeDasharray="3,3" />
            <text x={xOf(y)} y={H - 4} textAnchor="middle" fontSize={9} fill="#9ca3af">{y}</text>
          </g>
        ))}
        {/* Reference lines */}
        {refLines.map(r => (
          <g key={r.label}>
            <line x1={PL} x2={W - PR} y1={yOf(r.temp)} y2={yOf(r.temp)} stroke={r.color} strokeWidth={1.5} strokeDasharray="6,3" />
            <text x={W - PR + 2} y={yOf(r.temp) + 4} fontSize={9} fill={r.color} fontWeight={700}>{r.label}</text>
          </g>
        ))}
        {/* Scenario lines */}
        {selected_scenarios.map(s => (
          <path key={s.id} d={pathFor(s)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" />
        ))}
        {/* Legend dots at end */}
        {selected_scenarios.map(s => (
          <g key={s.id + '-label'}>
            <circle cx={xOf(2100)} cy={yOf(s.tempTarget)} r={3} fill={s.color} />
          </g>
        ))}
      </svg>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        {selected_scenarios.map(s => (
          <span key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
            <span style={{ display: 'inline-block', width: 16, height: 3, background: s.color, borderRadius: 2 }} />
            <span style={{ color: '#4b5563' }}>{s.shortName}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Risk Matrix ──────────────────────────────────────────────────────────────

function RiskMatrix({ risks }: { risks: PhysicalRisk[] }) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState<string | null>(null);
  return (
    <div style={{ marginBottom: 24 }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
        {t('compliance.climateScenarios.riskMatrixTitle', 'Matrice Probabilité × Sévérité')}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto repeat(5, 1fr)', gap: 2, maxWidth: 420 }}>
        {/* Column headers */}
        <div />
        {[1, 2, 3, 4, 5].map(s => (
          <div key={s} style={{ textAlign: 'center', fontSize: 10, color: '#6b7280', paddingBottom: 2 }}>{t('compliance.climateScenarios.severityAbbr', 'Sév.')} {s}</div>
        ))}
        {[5, 4, 3, 2, 1].map(l => (
          <>
            <div key={'row-' + l} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 4, fontSize: 10, color: '#6b7280' }}>{t('compliance.climateScenarios.probabilityAbbr', 'P')} {l}</div>
            {[1, 2, 3, 4, 5].map(s => {
              const cellRisks = risks.filter(r => r.likelihood === l && r.severity === s);
              return (
                <div key={`${l}-${s}`} style={{
                  background: riskCellColor(l, s), borderRadius: 4,
                  minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexWrap: 'wrap', gap: 2, padding: 2, position: 'relative',
                }}>
                  {cellRisks.map(r => (
                    <span
                      key={r.id}
                      onMouseEnter={() => setHovered(r.id)}
                      onMouseLeave={() => setHovered(null)}
                      style={{
                        display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
                        background: r.type === 'acute' ? '#dc2626' : '#d97706',
                        cursor: 'pointer', position: 'relative',
                      }}
                      title={t(`compliance.climateScenarios.physicalRisk.${r.id}.name`, r.name)}
                    />
                  ))}
                  {cellRisks.map(r => hovered === r.id && (
                    <div key={r.id + '-tt'} style={{
                      position: 'absolute', bottom: '110%', left: '50%', transform: 'translateX(-50%)',
                      background: '#1f2937', color: '#fff', padding: '4px 8px', borderRadius: 6,
                      fontSize: 11, whiteSpace: 'nowrap', zIndex: 10, pointerEvents: 'none',
                    }}>
                      {t(`compliance.climateScenarios.physicalRisk.${r.id}.name`, r.name)}
                    </div>
                  ))}
                </div>
              );
            })}
          </>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} /> {t('compliance.climateScenarios.acute', 'Aigu')}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#d97706', display: 'inline-block' }} /> {t('compliance.climateScenarios.chronic', 'Chronique')}</span>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ClimateScenarios() {
  const { t } = useTranslation();
  const SCENARIOS = getSCENARIOS(t);
  const [tab, setTab] = useState<Tab>('scenarios');
  const [selectedScenarios, setSelectedScenarios] = useState<Set<ScenarioId>>(new Set(['nze', 'steps', 'ngfs_hhw']));
  const [physicalRisks, setPhysicalRisks] = useState<PhysicalRisk[]>(() => getDefaultPhysicalRisks(t));
  const [transitionRisks, setTransitionRisks] = useState<TransitionRisk[]>(() => getDefaultTransitionRisks(t));
  const [reportingYear] = useState(2024);
  const [saving, setSaving] = useState(false);
  const [physTypeFilter, setPhysTypeFilter] = useState<'all' | RiskType>('all');
  const [physHorizonFilter, setPhysHorizonFilter] = useState<'all' | TimeHorizon>('all');
  const [transTypeFilter, setTransTypeFilter] = useState<'all' | TransitionType>('all');

  // Load — API first (durable), then localStorage (cache)
  useEffect(() => {
    const applyData = (d: Record<string, unknown>) => {
      if (d.selectedScenarios) setSelectedScenarios(new Set(d.selectedScenarios as ScenarioId[]));
      if (d.physicalRisks) setPhysicalRisks(d.physicalRisks as PhysicalRisk[]);
      if (d.transitionRisks) setTransitionRisks(d.transitionRisks as TransitionRisk[]);
    };
    api.get('/framework-data/climate_scenarios')
      .then(r => { if (r.data?.data && Object.keys(r.data.data).length > 0) applyData(r.data.data); })
      .catch(() => {
        try {
          const raw = localStorage.getItem(LS_KEY);
          if (raw) applyData(JSON.parse(raw));
        } catch { /* ignore */ }
      });
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    const payload = {
      selectedScenarios: Array.from(selectedScenarios),
      physicalRisks,
      transitionRisks,
    };
    localStorage.setItem(LS_KEY, JSON.stringify(payload));
    try {
      await api.post('/framework-data/climate_scenarios', { data: payload });
    } catch { /* silent — localStorage already saved */ }
    setSaving(false);
    toast.success(t('compliance.climateScenarios.savedToast', 'Analyse climatique sauvegardée'));
  }, [selectedScenarios, physicalRisks, transitionRisks, t]);

  const toggleScenario = useCallback((id: ScenarioId) => {
    setSelectedScenarios(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const updatePhysical = useCallback((id: string, field: keyof PhysicalRisk, value: unknown) => {
    setPhysicalRisks(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  }, []);

  const updateTransition = useCallback((id: string, field: keyof TransitionRisk, value: unknown) => {
    setTransitionRisks(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  }, []);

  // Derived stats
  const totalPhysicalImpact = useMemo(() => physicalRisks.reduce((s, r) => s + (r.financialImpact || 0), 0), [physicalRisks]);
  const totalTransImpact = useMemo(() => transitionRisks.reduce((s, r) => s + (r.financialImpact || 0), 0), [transitionRisks]);
  const totalTransOpportunity = useMemo(() => transitionRisks.reduce((s, r) => s + (r.opportunityAmount || 0), 0), [transitionRisks]);
  const totalImpact = totalPhysicalImpact + totalTransImpact;

  const referenceScenario = useMemo(() => {
    const checked = SCENARIOS.filter(s => selectedScenarios.has(s.id));
    if (!checked.length) return null;
    return checked.reduce((best, s) => Math.abs(s.tempTarget - 1.5) < Math.abs(best.tempTarget - 1.5) ? s : best, checked[0]);
  }, [selectedScenarios]);

  const filteredPhysical = useMemo(() => physicalRisks.filter(r =>
    (physTypeFilter === 'all' || r.type === physTypeFilter) &&
    (physHorizonFilter === 'all' || r.timeHorizon === physHorizonFilter)
  ), [physicalRisks, physTypeFilter, physHorizonFilter]);

  const filteredTransition = useMemo(() => transitionRisks.filter(r =>
    transTypeFilter === 'all' || r.type === transTypeFilter
  ), [transitionRisks, transTypeFilter]);

  // ── styles shortcuts
  const card: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb' };
  const label: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 4, display: 'block' };
  const inputStyle: React.CSSProperties = { width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, outline: 'none', boxSizing: 'border-box' };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* ── Hero ── */}
      <div style={{
        background: 'linear-gradient(135deg,#0c1445 0%,#1e3a8a 40%,#1d4ed8 70%,#0891b2 100%)',
        padding: '32px 32px 28px', color: '#fff',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Thermometer size={24} style={{ opacity: 0.9 }} />
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: -0.3 }}>
                {t('compliance.climateScenarios.heroTitle', 'Analyse par Scénarios Climatiques')}
              </h1>
            </div>
            <p style={{ margin: 0, fontSize: 13, opacity: 0.8, maxWidth: 560 }}>
              {t('compliance.climateScenarios.heroSubtitle', 'TCFD · IFRS S2 · NGFS · IEA — Risques physiques et de transition · Impact financier')}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 11, opacity: 0.6 }}>{t('compliance.climateScenarios.fiscalYear', 'Exercice {{year}}', { year: reportingYear })}</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#fff', color: '#1e3a8a', border: 'none', borderRadius: 8,
              padding: '10px 18px', fontWeight: 700, fontSize: 14, cursor: 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            <Save size={15} /> {saving ? t('compliance.climateScenarios.saving', 'Sauvegarde…') : t('compliance.climateScenarios.save', 'Sauvegarder')}
          </button>
        </div>

        {/* Stat chips */}
        <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
          {[
            { icon: <BarChart2 size={14} />, label: t('compliance.climateScenarios.chipScenariosAnalyzed', 'Scénarios analysés'), value: selectedScenarios.size },
            { icon: <AlertTriangle size={14} />, label: t('compliance.climateScenarios.chipPhysicalRisks', 'Risques physiques'), value: physicalRisks.length },
            { icon: <TrendingDown size={14} />, label: t('compliance.climateScenarios.chipTotalImpact', 'Impact total estimé'), value: `${totalImpact.toFixed(1)} M€` },
          ].map(chip => (
            <div key={chip.label} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 14px',
            }}>
              <span style={{ opacity: 0.85 }}>{chip.icon}</span>
              <div>
                <div style={{ fontSize: 11, opacity: 0.75 }}>{chip.label}</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{chip.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tab stepper ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 32px' }}>
        <div style={{ display: 'flex', gap: 0 }}>
          {([
            { id: 'scenarios', label: t('compliance.climateScenarios.tab1', '1. Scénarios'), icon: <Thermometer size={14} /> },
            { id: 'physical', label: t('compliance.climateScenarios.tab2', '2. Risques physiques'), icon: <AlertTriangle size={14} /> },
            { id: 'transition', label: t('compliance.climateScenarios.tab3', '3. Risques de transition'), icon: <Zap size={14} /> },
          ] as { id: Tab; label: string; icon: React.ReactNode }[]).map(tab_ => (
            <button
              key={tab_.id}
              onClick={() => setTab(tab_.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '14px 20px', border: 'none', background: 'none', cursor: 'pointer',
                fontWeight: tab === tab_.id ? 700 : 400, fontSize: 14,
                color: tab === tab_.id ? '#1e3a8a' : '#6b7280',
                borderBottom: tab === tab_.id ? '3px solid #1e3a8a' : '3px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              {tab_.icon} {tab_.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '28px 32px', maxWidth: 1200 }}>

        {/* ════════════════════════════════════════
            TAB 1 — SCÉNARIOS
        ════════════════════════════════════════ */}
        {tab === 'scenarios' && (
          <>
            {/* Cards grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 28 }}>
              {SCENARIOS.map(s => {
                const isSelected = selectedScenarios.has(s.id);
                const isRef = referenceScenario?.id === s.id;
                return (
                  <div key={s.id} style={{
                    ...card,
                    borderLeft: `4px solid ${s.color}`,
                    boxShadow: isSelected ? `0 0 0 2px ${s.color}40, 0 4px 12px rgba(0,0,0,0.1)` : card.boxShadow,
                    position: 'relative',
                    transition: 'box-shadow 0.2s',
                  }}>
                    {/* Reference star */}
                    {isRef && (
                      <span style={{
                        position: 'absolute', top: 10, left: 12, fontSize: 11, fontWeight: 700,
                        color: s.color, background: s.color + '18', borderRadius: 99, padding: '1px 8px',
                      }}>
                        {t('compliance.climateScenarios.refScenario', 'Scénario de référence')}
                      </span>
                    )}
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleScenario(s.id)}
                      style={{ position: 'absolute', top: 12, right: 12, width: 16, height: 16, cursor: 'pointer', accentColor: s.color }}
                    />

                    <div style={{ marginTop: isRef ? 22 : 0, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{
                        background: SOURCE_COLORS[s.source] + '18', color: SOURCE_COLORS[s.source],
                        fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                      }}>{s.source}</span>
                      <span style={{
                        background: s.color + '18', color: s.color,
                        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                      }}>{s.tempTarget}°C</span>
                    </div>

                    <div style={{ fontWeight: 700, fontSize: 14, color: '#111', marginBottom: 2 }}>{s.shortName}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>{s.name}</div>
                    <p style={{
                      fontSize: 12, color: '#4b5563', margin: '0 0 12px',
                      display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>{s.description}</p>

                    <div style={{ fontSize: 11, color: '#374151', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div><span style={{ color: '#9ca3af' }}>{t('compliance.climateScenarios.gdpImpactLabel', 'Impact PIB :')}</span> {s.gdpImpact}</div>
                      <div><span style={{ color: '#9ca3af' }}>{t('compliance.climateScenarios.carbonPriceLabel', 'Prix carbone 2030 :')}</span> {s.carbonPrice2030}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Comparison table */}
            {selectedScenarios.size > 0 && (
              <div style={{ ...card, marginBottom: 28, overflowX: 'auto' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#111' }}>
                  {t('compliance.climateScenarios.comparisonTitle', 'Comparaison des scénarios sélectionnés')}
                </h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {[
                        t('compliance.climateScenarios.colScenario', 'Scénario'),
                        t('compliance.climateScenarios.colSource', 'Source'),
                        t('compliance.climateScenarios.colTarget', 'Cible °C'),
                        t('compliance.climateScenarios.colCarbonPrice', 'Prix carbone 2030'),
                        t('compliance.climateScenarios.colGdpImpact', 'Impact PIB'),
                        t('compliance.climateScenarios.colDominantRisks', 'Risques dominants'),
                      ].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {SCENARIOS.filter(s => selectedScenarios.has(s.id)).map((s, i) => {
                      const dominant = s.tempTarget >= 2.5 ? t('compliance.climateScenarios.dominantPhysical', 'Physiques') : s.tempTarget <= 1.7 ? t('compliance.climateScenarios.dominantTransition', 'Transition') : t('compliance.climateScenarios.dominantBoth', 'Physiques + Transition');
                      return (
                        <tr key={s.id} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                          <td style={{ padding: '8px 12px', borderBottom: '1px solid #f3f4f6' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
                              <strong>{s.shortName}</strong>
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px', borderBottom: '1px solid #f3f4f6' }}>
                            <span style={{ color: SOURCE_COLORS[s.source], fontWeight: 600, fontSize: 11 }}>{s.source}</span>
                          </td>
                          <td style={{ padding: '8px 12px', borderBottom: '1px solid #f3f4f6', fontWeight: 700, color: s.color }}>{s.tempTarget}°C</td>
                          <td style={{ padding: '8px 12px', borderBottom: '1px solid #f3f4f6' }}>{s.carbonPrice2030}</td>
                          <td style={{ padding: '8px 12px', borderBottom: '1px solid #f3f4f6', fontSize: 12, color: '#4b5563' }}>{s.gdpImpact}</td>
                          <td style={{ padding: '8px 12px', borderBottom: '1px solid #f3f4f6' }}>
                            <span style={{ fontSize: 11, background: '#f3f4f6', padding: '2px 8px', borderRadius: 99 }}>{dominant}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Temperature chart */}
            <div style={card}>
              <TempChart selected={selectedScenarios} scenarios={SCENARIOS} />
            </div>
          </>
        )}

        {/* ════════════════════════════════════════
            TAB 2 — RISQUES PHYSIQUES
        ════════════════════════════════════════ */}
        {tab === 'physical' && (
          <>
            {/* Info banner */}
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10 }}>
              <Shield size={16} style={{ color: '#2563eb', flexShrink: 0, marginTop: 1 }} />
              <p style={{ margin: 0, fontSize: 13, color: '#1e40af' }}>
                <strong>IFRS S2 (§10)</strong> {t('compliance.climateScenarios.physicalBannerText', 'requiert la divulgation des risques physiques climatiques significatifs, classés par type (aigus/chroniques), horizon temporel et impact financier estimé pour au moins 3 scénarios.')}
              </p>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>{t('compliance.climateScenarios.filterType', 'Type :')}</span>
                {(['all', 'acute', 'chronic'] as const).map(f => (
                  <button key={f} onClick={() => setPhysTypeFilter(f)} style={{
                    padding: '4px 12px', borderRadius: 99, border: '1px solid #d1d5db', cursor: 'pointer',
                    fontSize: 12, fontWeight: physTypeFilter === f ? 700 : 400,
                    background: physTypeFilter === f ? '#1e3a8a' : '#fff',
                    color: physTypeFilter === f ? '#fff' : '#374151',
                  }}>
                    {f === 'all' ? t('compliance.climateScenarios.filterAll', 'Tous') : f === 'acute' ? t('compliance.climateScenarios.filterAcute', 'Aigus') : t('compliance.climateScenarios.filterChronic', 'Chroniques')}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>{t('compliance.climateScenarios.filterHorizon', 'Horizon :')}</span>
                {(['all', 'short', 'medium', 'long'] as const).map(f => (
                  <button key={f} onClick={() => setPhysHorizonFilter(f)} style={{
                    padding: '4px 12px', borderRadius: 99, border: '1px solid #d1d5db', cursor: 'pointer',
                    fontSize: 12, fontWeight: physHorizonFilter === f ? 700 : 400,
                    background: physHorizonFilter === f ? '#1e3a8a' : '#fff',
                    color: physHorizonFilter === f ? '#fff' : '#374151',
                  }}>
                    {f === 'all' ? t('compliance.climateScenarios.filterAll', 'Tous') : t(`compliance.climateScenarios.horizonShort.${f}`, HORIZON_SHORT[f])}
                  </button>
                ))}
              </div>
            </div>

            {/* Risk matrix */}
            <div style={card}>
              <RiskMatrix risks={physicalRisks} />
            </div>

            {/* Risk rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              {filteredPhysical.map(risk => (
                <div key={risk.id} style={{ ...card, borderLeft: `3px solid ${risk.type === 'acute' ? '#dc2626' : '#d97706'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 99,
                        background: risk.type === 'acute' ? '#fee2e2' : '#fef3c7',
                        color: risk.type === 'acute' ? '#dc2626' : '#d97706',
                      }}>
                        {risk.type === 'acute' ? t('compliance.climateScenarios.acute', 'Aigu') : t('compliance.climateScenarios.chronic', 'Chronique')}
                      </span>
                      <strong style={{ fontSize: 14, color: '#111' }}>{risk.name}</strong>
                      <HorizonChip horizon={risk.timeHorizon} />
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {risk.scenarioIds.map(sid => {
                        const sc = SCENARIOS.find(s => s.id === sid);
                        return (
                          <span key={sid} style={{
                            fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 4,
                            background: (sc?.color ?? '#6b7280') + '18', color: sc?.color ?? '#6b7280',
                          }}>
                            {sid === 'all' ? t('compliance.climateScenarios.allScenarios', 'Tous scénarios') : sc?.shortName ?? sid}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={label}>{t('compliance.climateScenarios.affectedAssets', 'Actifs affectés')}</label>
                      <input style={inputStyle} value={risk.affectedAssets} onChange={e => updatePhysical(risk.id, 'affectedAssets', e.target.value)} placeholder={t('compliance.climateScenarios.affectedAssetsPlaceholder', 'ex. Sites de production…')} />
                    </div>
                    <div>
                      <label style={label}>{t('compliance.climateScenarios.financialImpactLabel', 'Impact financier estimé (M€)')}</label>
                      <input type="number" style={inputStyle} value={risk.financialImpact} onChange={e => updatePhysical(risk.id, 'financialImpact', parseFloat(e.target.value) || 0)} placeholder="0.0" />
                    </div>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={label}>{t('compliance.climateScenarios.adaptationMeasure', "Mesure d'adaptation")}</label>
                    <input style={inputStyle} value={risk.adaptationMeasure} onChange={e => updatePhysical(risk.id, 'adaptationMeasure', e.target.value)} placeholder={t('compliance.climateScenarios.adaptationMeasurePlaceholder', "Décrire la mesure d'adaptation envisagée…")} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={label}>{t('compliance.climateScenarios.likelihood', 'Probabilité (1-5)')}</label>
                      <Slider value={risk.likelihood} onChange={v => updatePhysical(risk.id, 'likelihood', v)} color="#dc2626" />
                    </div>
                    <div>
                      <label style={label}>{t('compliance.climateScenarios.severity', 'Sévérité (1-5)')}</label>
                      <Slider value={risk.severity} onChange={v => updatePhysical(risk.id, 'severity', v)} color="#ea580c" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary card */}
            <div style={{ ...card, marginTop: 20, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingDown size={18} style={{ color: '#16a34a' }} />
                <span style={{ fontWeight: 700, fontSize: 15, color: '#15803d' }}>
                  {t('compliance.climateScenarios.physicalTotalImpact', 'Impact financier total — Risques physiques :')} {totalPhysicalImpact.toFixed(1)} M€
                </span>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: 12, color: '#166534' }}>
                {physicalRisks.filter(r => r.financialImpact > 0).length} {t('compliance.climateScenarios.physicalRisksWithImpact', 'risque(s) avec impact financier chiffré sur')} {physicalRisks.length} {t('compliance.climateScenarios.physicalRisksIdentified', 'identifiés.')}
              </p>
            </div>
          </>
        )}

        {/* ════════════════════════════════════════
            TAB 3 — RISQUES DE TRANSITION
        ════════════════════════════════════════ */}
        {tab === 'transition' && (
          <>
            {/* Info banner */}
            <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10 }}>
              <Zap size={16} style={{ color: '#7c3aed', flexShrink: 0, marginTop: 1 }} />
              <p style={{ margin: 0, fontSize: 13, color: '#6b21a8' }}>
                {t('compliance.climateScenarios.transitionBannerText', 'Les risques de transition comprennent les risques politiques, technologiques, de marché, de réputation et juridiques liés à la transition vers une économie bas carbone')} <strong>(TCFD · IFRS S2 §9)</strong>.
              </p>
            </div>

            {/* Type filter chips */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {(['all', 'policy', 'technology', 'market', 'reputation', 'legal'] as const).map(f => (
                <button key={f} onClick={() => setTransTypeFilter(f)} style={{
                  padding: '5px 14px', borderRadius: 99, border: '1px solid #d1d5db', cursor: 'pointer',
                  fontSize: 12, fontWeight: transTypeFilter === f ? 700 : 400,
                  background: transTypeFilter === f ? (f === 'all' ? '#1e3a8a' : TRANSITION_COLORS[f]) : '#fff',
                  color: transTypeFilter === f ? '#fff' : '#374151',
                }}>
                  {f === 'all' ? t('compliance.climateScenarios.filterAll', 'Tous') : t(`compliance.climateScenarios.transitionType.${f}`, TRANSITION_LABELS[f] as string)}
                </button>
              ))}
            </div>

            {/* Transition risk cards — 2 columns */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              {filteredTransition.map(risk => {
                const typeColor = TRANSITION_COLORS[risk.type];
                return (
                  <div key={risk.id} style={{ ...card, borderTop: `3px solid ${typeColor}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 99,
                        background: typeColor + '18', color: typeColor,
                      }}>
                        {t(`compliance.climateScenarios.transitionType.${risk.type}`, TRANSITION_LABELS[risk.type] as string)}
                      </span>
                      <HorizonChip horizon={risk.timeHorizon} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#111', marginBottom: 6 }}>{risk.name}</div>
                    <p style={{
                      fontSize: 12, color: '#6b7280', margin: '0 0 14px',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>{risk.description}</p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                      <div>
                        <label style={label}>{t('compliance.climateScenarios.negativeImpact', 'Impact négatif estimé (M€)')}</label>
                        <input type="number" style={inputStyle} value={risk.financialImpact} onChange={e => updateTransition(risk.id, 'financialImpact', parseFloat(e.target.value) || 0)} placeholder="0.0" />
                      </div>
                      <div>
                        <label style={label}>{t('compliance.climateScenarios.opportunity', 'Opportunité associée (M€)')}</label>
                        <input type="number" style={{ ...inputStyle, borderColor: '#a3e635' }} value={risk.opportunityAmount} onChange={e => updateTransition(risk.id, 'opportunityAmount', parseFloat(e.target.value) || 0)} placeholder="0.0" />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                      <div>
                        <label style={label}>{t('compliance.climateScenarios.likelihood', 'Probabilité (1-5)')}</label>
                        <Slider value={risk.likelihood} onChange={v => updateTransition(risk.id, 'likelihood', v)} color={typeColor} />
                      </div>
                      <div>
                        <label style={label}>{t('compliance.climateScenarios.severity', 'Sévérité (1-5)')}</label>
                        <Slider value={risk.severity} onChange={v => updateTransition(risk.id, 'severity', v)} color={typeColor} />
                      </div>
                    </div>

                    <div>
                      <label style={label}>{t('compliance.climateScenarios.mitigationLabel', "Mesure d'atténuation / Opportunité à saisir")}</label>
                      <textarea
                        rows={2}
                        style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                        value={risk.mitigationMeasure}
                        onChange={e => updateTransition(risk.id, 'mitigationMeasure', e.target.value)}
                        placeholder={t('compliance.climateScenarios.mitigationPlaceholder', "Décrire la mesure d'atténuation ou l'opportunité stratégique…")}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Opportunities summary */}
            <div style={{ ...card, background: '#f0f9ff', border: '1px solid #bae6fd', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <TrendingUp size={18} style={{ color: '#0891b2' }} />
                <span style={{ fontWeight: 700, fontSize: 15, color: '#0c4a6e' }}>{t('compliance.climateScenarios.transitionBalance', 'Bilan transition')}</span>
              </div>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{t('compliance.climateScenarios.transitionRisksCosts', 'Risques (coûts)')}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#dc2626' }}>{totalTransImpact.toFixed(1)} M€</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{t('compliance.climateScenarios.opportunities', 'Opportunités')}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#16a34a' }}>+{totalTransOpportunity.toFixed(1)} M€</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{t('compliance.climateScenarios.netBalance', 'Solde net transition')}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: totalTransOpportunity - totalTransImpact >= 0 ? '#16a34a' : '#dc2626' }}>
                    {totalTransOpportunity - totalTransImpact >= 0 ? '+' : ''}{(totalTransOpportunity - totalTransImpact).toFixed(1)} M€
                  </div>
                </div>
              </div>
            </div>

            {/* Export button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  toast.success(t('compliance.climateScenarios.generatingTcfd', 'Génération du rapport TCFD…'));
                  window.print();
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: '#1e3a8a', color: '#fff', border: 'none', borderRadius: 8,
                  padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                }}
              >
                <FileText size={15} /> {t('compliance.climateScenarios.tcfdReport', 'Rapport TCFD')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
