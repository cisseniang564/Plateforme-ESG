/**
 * VigilancePlan — Module Vigilance (Loi 2017-399 + Sapin 2 anti-corruption).
 *
 * Single-page app with 4 tabs:
 *   1. Vue d'ensemble   — completeness + risks heatmap + KPIs
 *   2. Cartographie     — risk list + create/edit
 *   3. Plan d'actions   — mitigation actions
 *   4. Alertes          — internal alert center (Sapin 2 + Vigilance)
 *
 * The fifth piece — public anonymous reporting form — lives at /signalement
 * (no auth, accessible from a QR code on the company's official website).
 */
import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Shield, AlertTriangle, ListChecks, MessageSquare, Loader2, X, Plus,
  Download, ChevronDown, Calendar, Globe, Users, ShieldAlert, FileText,
} from 'lucide-react';
import api from '@/services/api';
import type { TFunction } from 'i18next';

// ─── Types ─────────────────────────────────────────────────────────────────
interface Plan {
  id: string;
  year: number;
  status: string;
  risk_mapping_summary: string | null;
  assessment_procedures: string | null;
  mitigation_actions: string | null;
  alert_mechanism: string | null;
  monitoring_scheme: string | null;
  covers_subsidiaries: boolean;
  covers_suppliers: boolean;
  covers_subcontractors: boolean;
  stakeholders_consulted: string | null;
  published_at: string | null;
  published_url: string | null;
}

interface Risk {
  id: string;
  title: string;
  description: string | null;
  category: string;
  scope: string;
  severity: number;
  likelihood: number;
  gross_score: number;
  residual_severity: number | null;
  residual_likelihood: number | null;
  residual_score: number | null;
  countries: string[];
  source_reference: string | null;
  plan_id: string | null;
}

interface Action {
  id: string;
  risk_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  deadline: string | null;
  completed_at: string | null;
  budget_eur: number | null;
}

interface Alert {
  id: string;
  case_number: string;
  category: string;
  severity: string;
  subject: string;
  description: string;
  country: string | null;
  status: string;
  source: string | null;
  is_anonymous: boolean;
  reporter_name?: string | null;
  reporter_email?: string | null;
  created_at: string;
  closed_at: string | null;
}

interface Summary {
  year: number;
  plan_id: string;
  plan_status: string;
  completeness: {
    score: number;
    components: Record<string, boolean>;
    coverage: Record<string, boolean>;
    stakeholders_consulted: boolean;
  };
  risks: {
    matrix: number[][];
    total: number;
    by_category: Record<string, number>;
    by_scope: Record<string, number>;
    critical_count: number;
    mitigated_count: number;
  };
  actions: {
    total: number;
    by_status: Record<string, number>;
    overdue: number;
  };
  alerts: {
    total: number;
    open: number;
    year_to_date: number;
  };
}

// ─── Labels ────────────────────────────────────────────────────────────────
const getCategoryLabels = (t: TFunction): Record<string, string> => ({
  human_rights: t('compliance.vigilance.category.humanRights', 'Droits humains'),
  freedoms: t('compliance.vigilance.category.freedoms', 'Libertés fondamentales'),
  health_safety: t('compliance.vigilance.category.healthSafety', 'Santé & sécurité'),
  environment: t('compliance.vigilance.category.environment', 'Environnement'),
  labor_rights: t('compliance.vigilance.category.laborRights', 'Droits du travail'),
  corruption: t('compliance.vigilance.category.corruption', 'Corruption (Sapin 2)'),
  data_privacy: t('compliance.vigilance.category.dataPrivacy', 'Vie privée / RGPD'),
  other: t('compliance.vigilance.category.other', 'Autre'),
});

const getScopeLabels = (t: TFunction): Record<string, string> => ({
  own_operations: t('compliance.vigilance.scope.ownOperations', 'Activités propres'),
  subsidiaries: t('compliance.vigilance.scope.subsidiaries', 'Filiales'),
  tier1_suppliers: t('compliance.vigilance.scope.tier1Suppliers', 'Fournisseurs directs'),
  tier2_plus: t('compliance.vigilance.scope.tier2Plus', 'Fournisseurs indirects'),
  subcontractors: t('compliance.vigilance.scope.subcontractors', 'Sous-traitants'),
  clients: t('compliance.vigilance.scope.clients', 'Clients'),
});

const getComponentLabels = (t: TFunction): Record<string, string> => ({
  risk_mapping_summary: t('compliance.vigilance.component.riskMappingSummary', 'Cartographie des risques'),
  assessment_procedures: t('compliance.vigilance.component.assessmentProcedures', "Procédures d'évaluation"),
  mitigation_actions: t('compliance.vigilance.component.mitigationActions', "Actions d'atténuation"),
  alert_mechanism: t('compliance.vigilance.component.alertMechanism', "Mécanisme d'alerte"),
  monitoring_scheme: t('compliance.vigilance.component.monitoringScheme', 'Dispositif de suivi'),
});

const getActionStatus = (t: TFunction): Record<string, { label: string; color: string }> => ({
  planned: { label: t('compliance.vigilance.actionStatus.planned', 'Planifiée'), color: 'slate' },
  in_progress: { label: t('compliance.vigilance.actionStatus.inProgress', 'En cours'), color: 'amber' },
  done: { label: t('compliance.vigilance.actionStatus.done', 'Terminée'), color: 'emerald' },
  blocked: { label: t('compliance.vigilance.actionStatus.blocked', 'Bloquée'), color: 'red' },
  cancelled: { label: t('compliance.vigilance.actionStatus.cancelled', 'Annulée'), color: 'gray' },
});

const getAlertStatus = (t: TFunction): Record<string, { label: string; color: string }> => ({
  new: { label: t('compliance.vigilance.alertStatus.new', 'Nouvelle'), color: 'blue' },
  under_review: { label: t('compliance.vigilance.alertStatus.underReview', 'En examen'), color: 'amber' },
  investigating: { label: t('compliance.vigilance.alertStatus.investigating', 'Enquête'), color: 'violet' },
  action_taken: { label: t('compliance.vigilance.alertStatus.actionTaken', 'Action prise'), color: 'emerald' },
  closed: { label: t('compliance.vigilance.alertStatus.closed', 'Clôturée'), color: 'gray' },
  dismissed: { label: t('compliance.vigilance.alertStatus.dismissed', 'Écartée'), color: 'gray' },
});

// ─── Component ─────────────────────────────────────────────────────────────
export default function VigilancePlanPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'overview' | 'risks' | 'actions' | 'alerts'>('overview');
  const [year, setYear] = useState(new Date().getFullYear());

  const [summary, setSummary] = useState<Summary | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateRisk, setShowCreateRisk] = useState(false);

  const refresh = async () => {
    try {
      const [s, p, r, a, al] = await Promise.all([
        api.get<Summary>(`/vigilance/summary?year=${year}`),
        api.get<Plan>(`/vigilance/plan/${year}`),
        api.get<Risk[]>(`/vigilance/risks`),
        api.get<Action[]>(`/vigilance/actions`),
        api.get<Alert[]>(`/vigilance/alerts`),
      ]);
      setSummary(s.data);
      setPlan(p.data);
      setRisks(r.data);
      setActions(a.data);
      setAlerts(al.data);
    } catch (e) {
      // soft fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setLoading(true); refresh(); }, [year]);

  const downloadPDF = async () => {
    const res = await api.get(`/vigilance/plan/${year}/export.pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `Plan_vigilance_${year}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="rounded-3xl bg-gradient-to-br from-rose-50 via-white to-violet-50 border border-rose-100 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-violet-600 flex items-center justify-center shadow-lg">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">{t('compliance.vigilance.heroTitle', 'Plan de vigilance {{year}}', { year })}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {t('compliance.vigilance.heroSubtitle', 'Article L225-102-4 du Code de commerce — Loi 2017-399 · Sapin 2')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={year}
              onChange={e => setYear(parseInt(e.target.value, 10))}
              className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm font-medium"
            >
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button
              onClick={downloadPDF}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              <Download className="w-4 h-4" />
              PDF
            </button>
          </div>
        </div>

        {summary && (
          <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label={t('compliance.vigilance.statCompleteness', 'Complétude du plan')} value={`${summary.completeness.score}%`}
              color={summary.completeness.score >= 80 ? 'emerald' : summary.completeness.score >= 50 ? 'amber' : 'red'} />
            <Stat label={t('compliance.vigilance.statRisks', 'Risques identifiés')} value={summary.risks.total}
              sub={t('compliance.vigilance.statCriticalCount', '{{count}} critiques', { count: summary.risks.critical_count })} color="red" />
            <Stat label={t('compliance.vigilance.statActions', 'Actions')} value={summary.actions.total}
              sub={t('compliance.vigilance.statOverdueCount', '{{count}} en retard', { count: summary.actions.overdue })} color="violet" />
            <Stat label={t('compliance.vigilance.statAlerts', 'Alertes (cumul)')} value={summary.alerts.total}
              sub={t('compliance.vigilance.statOpenCount', '{{count}} ouvertes', { count: summary.alerts.open })} color="blue" />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {([
          { id: 'overview', label: t('compliance.vigilance.tabOverview', "Vue d'ensemble"), icon: Shield },
          { id: 'risks', label: t('compliance.vigilance.tabRisks', 'Cartographie'), icon: AlertTriangle },
          { id: 'actions', label: t('compliance.vigilance.tabActions', "Plan d'actions"), icon: ListChecks },
          { id: 'alerts', label: t('compliance.vigilance.tabAlerts', 'Alertes'), icon: MessageSquare },
        ] as const).map(tabItem => {
          const Icon = tabItem.icon;
          return (
            <button
              key={tabItem.id}
              onClick={() => setTab(tabItem.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                tab === tabItem.id ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tabItem.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === 'overview' && summary && plan && (
        <OverviewTab summary={summary} plan={plan} onSave={refresh} />
      )}
      {tab === 'risks' && (
        <RisksTab
          risks={risks}
          onCreate={() => setShowCreateRisk(true)}
          onRefresh={refresh}
        />
      )}
      {tab === 'actions' && (
        <ActionsTab actions={actions} risks={risks} onRefresh={refresh} />
      )}
      {tab === 'alerts' && (
        <AlertsTab alerts={alerts} onRefresh={refresh} />
      )}

      {showCreateRisk && (
        <CreateRiskModal
          onClose={() => setShowCreateRisk(false)}
          onCreated={() => { setShowCreateRisk(false); refresh(); }}
        />
      )}
    </div>
  );
}

// ─── Stat card ─────────────────────────────────────────────────────────────
function Stat({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color: string }) {
  const colorMap: Record<string, string> = {
    emerald: 'from-emerald-50 to-white border-emerald-100',
    amber: 'from-amber-50 to-white border-amber-100',
    red: 'from-red-50 to-white border-red-100',
    violet: 'from-violet-50 to-white border-violet-100',
    blue: 'from-blue-50 to-white border-blue-100',
  };
  return (
    <div className={`p-4 bg-gradient-to-br ${colorMap[color] || colorMap.blue} border rounded-2xl`}>
      <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">{label}</div>
      <div className="text-2xl font-extrabold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
    </div>
  );
}

// ─── Overview tab ──────────────────────────────────────────────────────────
function OverviewTab({ summary, plan, onSave }: { summary: Summary; plan: Plan; onSave: () => void }) {
  const { t } = useTranslation();
  const COMPONENT_LABELS = getComponentLabels(t);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Completeness checklist */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h3 className="text-base font-bold text-gray-900 mb-3">{t('compliance.vigilance.mandatoryComponents', '5 composants obligatoires')}</h3>
        <p className="text-xs text-gray-500 mb-3">
          {t('compliance.vigilance.mandatoryComponentsHint', 'Le Plan de vigilance doit inclure ces 5 sections (Art. L225-102-4-I) :')}
        </p>
        <div className="space-y-2">
          {Object.entries(COMPONENT_LABELS).map(([key, label]) => {
            const filled = summary.completeness.components[key];
            return (
              <div key={key} className="flex items-center gap-2 text-sm">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${filled ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                  {filled ? '✓' : '○'}
                </div>
                <span className={filled ? 'text-gray-900 font-medium' : 'text-gray-500'}>{label}</span>
              </div>
            );
          })}
        </div>

        <h3 className="text-base font-bold text-gray-900 mt-5 mb-3">{t('compliance.vigilance.coveredScope', 'Périmètre couvert')}</h3>
        <div className="space-y-2">
          {[
            ['covers_subsidiaries', t('compliance.vigilance.coverSubsidiaries', 'Filiales sous contrôle')],
            ['covers_suppliers', t('compliance.vigilance.coverSuppliers', 'Fournisseurs directs')],
            ['covers_subcontractors', t('compliance.vigilance.coverSubcontractors', 'Sous-traitants')],
          ].map(([k, l]) => {
            const ok = summary.completeness.coverage[k];
            return (
              <div key={k} className="flex items-center gap-2 text-sm">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${ok ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                  {ok ? '✓' : '○'}
                </div>
                <span className={ok ? 'text-gray-900 font-medium' : 'text-gray-500'}>{l}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Risk heatmap */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h3 className="text-base font-bold text-gray-900 mb-3">{t('compliance.vigilance.riskMatrix', 'Matrice des risques')}</h3>
        <p className="text-xs text-gray-500 mb-4">{t('compliance.vigilance.riskMatrixAxes', 'Sévérité (lignes) × Probabilité (colonnes)')}</p>
        <HeatmapMatrix matrix={summary.risks.matrix} />
        <div className="mt-3 flex items-center justify-around text-xs text-gray-500">
          <span>{t('compliance.vigilance.legendLow', '📉 Faible (1-3)')}</span>
          <span>{t('compliance.vigilance.legendModerate', '📊 Modéré (4-7)')}</span>
          <span>{t('compliance.vigilance.legendHigh', '📈 Élevé (8-14)')}</span>
          <span>{t('compliance.vigilance.legendCritical', '🔥 Critique (15-25)')}</span>
        </div>
      </div>

      {/* Plan editor */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 lg:col-span-2">
        <PlanEditor plan={plan} onSave={onSave} />
      </div>
    </div>
  );
}

// ─── Heatmap matrix ────────────────────────────────────────────────────────
function HeatmapMatrix({ matrix }: { matrix: number[][] }) {
  // matrix[sev-1][lik-1] = count
  const cell = (sev: number, lik: number) => {
    const count = matrix[sev - 1]?.[lik - 1] || 0;
    const score = sev * lik;
    const bg = score >= 15 ? 'bg-red-200' : score >= 8 ? 'bg-orange-200' : score >= 4 ? 'bg-yellow-200' : 'bg-emerald-200';
    return (
      <div key={`${sev}-${lik}`} className={`${bg} rounded-md aspect-square flex items-center justify-center text-sm font-bold text-gray-800`}>
        {count > 0 ? count : ''}
      </div>
    );
  };
  return (
    <div className="grid grid-cols-6 gap-1 text-xs">
      <div></div>
      {[1, 2, 3, 4, 5].map(l => (
        <div key={l} className="text-center font-semibold text-gray-500 pb-1">P{l}</div>
      ))}
      {[5, 4, 3, 2, 1].map(sev => (
        <>
          <div key={`label-${sev}`} className="font-semibold text-gray-500 flex items-center justify-end pr-2">S{sev}</div>
          {[1, 2, 3, 4, 5].map(lik => cell(sev, lik))}
        </>
      ))}
    </div>
  );
}

// ─── Plan editor (5 narrative blocks + scope) ──────────────────────────────
function PlanEditor({ plan, onSave }: { plan: Plan; onSave: () => void }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(plan);
  const [saving, setSaving] = useState(false);
  useEffect(() => setDraft(plan), [plan]);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/vigilance/plan/${plan.year}`, {
        risk_mapping_summary: draft.risk_mapping_summary,
        assessment_procedures: draft.assessment_procedures,
        mitigation_actions: draft.mitigation_actions,
        alert_mechanism: draft.alert_mechanism,
        monitoring_scheme: draft.monitoring_scheme,
        covers_subsidiaries: draft.covers_subsidiaries,
        covers_suppliers: draft.covers_suppliers,
        covers_subcontractors: draft.covers_subcontractors,
        stakeholders_consulted: draft.stakeholders_consulted,
      });
      onSave();
    } finally {
      setSaving(false);
    }
  };

  const block = (key: keyof Plan, label: string, hint: string) => (
    <div>
      <label className="block text-xs font-bold text-gray-700 mb-1">{label}</label>
      <textarea
        rows={3}
        value={(draft[key] as string) || ''}
        onChange={e => setDraft({ ...draft, [key]: e.target.value } as Plan)}
        placeholder={hint}
        className="w-full text-sm border border-gray-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500"
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <h3 className="text-base font-bold text-gray-900">{t('compliance.vigilance.writePlan', 'Rédiger le plan')}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {block('risk_mapping_summary', t('compliance.vigilance.block1Label', '1. Cartographie des risques'), t('compliance.vigilance.block1Hint', 'Synthèse de la cartographie...'))}
        {block('assessment_procedures', t('compliance.vigilance.block2Label', "2. Procédures d'évaluation"), t('compliance.vigilance.block2Hint', 'Audits, questionnaires, due diligence...'))}
        {block('mitigation_actions', t('compliance.vigilance.block3Label', "3. Actions d'atténuation"), t('compliance.vigilance.block3Hint', "Plans d'action, formations, audits..."))}
        {block('alert_mechanism', t('compliance.vigilance.block4Label', "4. Mécanisme d'alerte"), t('compliance.vigilance.block4Hint', "Description du dispositif d'alerte..."))}
        {block('monitoring_scheme', t('compliance.vigilance.block5Label', '5. Dispositif de suivi'), t('compliance.vigilance.block5Hint', 'KPIs de suivi, fréquence de revue, audits...'))}
        {block('stakeholders_consulted', t('compliance.vigilance.blockStakeholdersLabel', 'Parties prenantes consultées'), t('compliance.vigilance.blockStakeholdersHint', 'ONG, syndicats, fournisseurs critiques...'))}
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
      >
        {saving ? t('compliance.vigilance.saving', 'Enregistrement…') : t('compliance.vigilance.savePlan', 'Enregistrer le plan')}
      </button>
    </div>
  );
}

// ─── Risks tab ─────────────────────────────────────────────────────────────
function RisksTab({ risks, onCreate, onRefresh }: { risks: Risk[]; onCreate: () => void; onRefresh: () => void }) {
  const { t } = useTranslation();
  const CATEGORY_LABELS = getCategoryLabels(t);
  const SCOPE_LABELS = getScopeLabels(t);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-gray-900">{t('compliance.vigilance.risksIdentified', '{{count}} risque(s) identifié(s)', { count: risks.length })}</h3>
        <button
          onClick={onCreate}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold"
        >
          <Plus className="w-4 h-4" /> {t('compliance.vigilance.newRisk', 'Nouveau risque')}
        </button>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
              <th className="text-left px-4 py-2">{t('compliance.vigilance.thRisk', 'Risque')}</th>
              <th className="text-left px-4 py-2">{t('compliance.vigilance.thCategory', 'Catégorie')}</th>
              <th className="text-left px-4 py-2">{t('compliance.vigilance.thScope', 'Périmètre')}</th>
              <th className="text-center px-4 py-2">{t('compliance.vigilance.thGross', 'Brut')}</th>
              <th className="text-center px-4 py-2">{t('compliance.vigilance.thResidual', 'Résiduel')}</th>
              <th className="text-left px-4 py-2">{t('compliance.vigilance.thCountries', 'Pays')}</th>
            </tr>
          </thead>
          <tbody>
            {risks.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                {t('compliance.vigilance.noRisks', 'Aucun risque enregistré. Commencez votre cartographie.')}
              </td></tr>
            ) : risks.map(r => (
              <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                <td className="px-4 py-2.5 font-medium text-gray-900">{r.title}</td>
                <td className="px-4 py-2.5 text-gray-600">{CATEGORY_LABELS[r.category] || r.category}</td>
                <td className="px-4 py-2.5 text-gray-600">{SCOPE_LABELS[r.scope] || r.scope}</td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded font-bold text-xs ${
                    r.gross_score >= 15 ? 'bg-red-100 text-red-700' :
                    r.gross_score >= 8 ? 'bg-orange-100 text-orange-700' :
                    'bg-emerald-100 text-emerald-700'
                  }`}>{r.gross_score}</span>
                </td>
                <td className="px-4 py-2.5 text-center text-gray-600">
                  {r.residual_score !== null ? r.residual_score : '—'}
                </td>
                <td className="px-4 py-2.5 text-gray-500 text-xs">{(r.countries || []).join(', ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Actions tab ───────────────────────────────────────────────────────────
function ActionsTab({ actions, risks, onRefresh }: { actions: Action[]; risks: Risk[]; onRefresh: () => void }) {
  const { t } = useTranslation();
  const ACTION_STATUS = getActionStatus(t);
  const riskById = useMemo(() => Object.fromEntries(risks.map(r => [r.id, r])), [risks]);

  return (
    <div className="space-y-3">
      <h3 className="text-base font-bold text-gray-900">{t('compliance.vigilance.actionsCount', "{{count}} action(s) d'atténuation", { count: actions.length })}</h3>
      <div className="grid grid-cols-1 gap-3">
        {actions.length === 0 ? (
          <div className="p-8 bg-gray-50 border border-dashed border-gray-200 rounded-2xl text-center">
            <ListChecks className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">{t('compliance.vigilance.noActions', "Aucune action enregistrée. Créez d'abord un risque, puis attachez-y des actions.")}</p>
          </div>
        ) : actions.map(a => {
          const meta = ACTION_STATUS[a.status] || ACTION_STATUS.planned;
          const risk = riskById[a.risk_id];
          const overdue = a.deadline && new Date(a.deadline) < new Date() && !['done', 'cancelled'].includes(a.status);
          return (
            <div key={a.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-${meta.color}-100 text-${meta.color}-700`}>
                      {meta.label}
                    </span>
                    {a.priority && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                        {a.priority === 'critical' ? t('compliance.vigilance.priorityCritical', '⚠ CRITIQUE') : a.priority.toUpperCase()}
                      </span>
                    )}
                    {overdue && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                        {t('compliance.vigilance.overdue', 'En retard')}
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">{a.title}</h4>
                  {risk && (
                    <p className="text-xs text-gray-500">
                      {t('compliance.vigilance.associatedRisk', 'Risque associé :')} <span className="font-medium">{risk.title}</span>
                    </p>
                  )}
                </div>
                <div className="text-right">
                  {a.deadline && (
                    <div className={`flex items-center gap-1 text-xs ${overdue ? 'text-red-600' : 'text-gray-500'}`}>
                      <Calendar className="w-3 h-3" /> {a.deadline}
                    </div>
                  )}
                  {a.budget_eur && (
                    <div className="text-xs text-gray-500 mt-0.5">
                      {a.budget_eur.toLocaleString('fr-FR')} €
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Alerts tab ────────────────────────────────────────────────────────────
function AlertsTab({ alerts, onRefresh }: { alerts: Alert[]; onRefresh: () => void }) {
  const { t } = useTranslation();
  const ALERT_STATUS = getAlertStatus(t);
  const CATEGORY_LABELS = getCategoryLabels(t);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-gray-900">{t('compliance.vigilance.alertsCount', '{{count}} signalement(s)', { count: alerts.length })}</h3>
        <Link
          to="/signalement"
          target="_blank"
          className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold underline"
        >
          {t('compliance.vigilance.publicAnonymousLink', 'Lien public anonyme →')}
        </Link>
      </div>
      {alerts.length === 0 ? (
        <div className="p-8 bg-gray-50 border border-dashed border-gray-200 rounded-2xl text-center">
          <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500">{t('compliance.vigilance.noAlerts', 'Aucune alerte reçue.')}</p>
        </div>
      ) : alerts.map(a => {
        const meta = ALERT_STATUS[a.status] || ALERT_STATUS.new;
        return (
          <div key={a.id} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs text-gray-400">{a.case_number}</span>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-${meta.color}-100 text-${meta.color}-700`}>
                  {meta.label}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  {CATEGORY_LABELS[a.category] || a.category}
                </span>
                {a.is_anonymous && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-violet-100 text-violet-700">
                    {t('compliance.vigilance.anonymous', 'Anonyme')}
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-400">{new Date(a.created_at).toLocaleDateString('fr-FR')}</span>
            </div>
            <h4 className="text-sm font-semibold text-gray-900 mb-1">{a.subject}</h4>
            <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{a.description}</p>
            {!a.is_anonymous && a.reporter_email && (
              <div className="mt-2 text-xs text-gray-500">
                {t('compliance.vigilance.reporter', 'Reporter :')} {a.reporter_name || a.reporter_email}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Create-risk modal ─────────────────────────────────────────────────────
function CreateRiskModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { t } = useTranslation();
  const CATEGORY_LABELS = getCategoryLabels(t);
  const SCOPE_LABELS = getScopeLabels(t);
  const [form, setForm] = useState({
    title: '', description: '',
    category: 'human_rights', scope: 'tier1_suppliers',
    severity: 3, likelihood: 3,
    countries: '',
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await api.post('/vigilance/risks', {
        title: form.title,
        description: form.description || null,
        category: form.category,
        scope: form.scope,
        severity: form.severity,
        likelihood: form.likelihood,
        countries: form.countries ? form.countries.split(',').map(s => s.trim()).filter(Boolean) : null,
      });
      onCreated();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">{t('compliance.vigilance.newRisk', 'Nouveau risque')}</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">{t('compliance.vigilance.fieldTitle', 'Titre *')}</label>
            <input
              required
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              placeholder={t('compliance.vigilance.titlePh', 'Ex : Travail forcé chez fournisseurs textile Asie')}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">{t('compliance.vigilance.fieldCategory', 'Catégorie')}</label>
              <select
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
              >
                {Object.entries(CATEGORY_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">{t('compliance.vigilance.fieldScope', 'Périmètre')}</label>
              <select
                value={form.scope}
                onChange={e => setForm({ ...form, scope: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
              >
                {Object.entries(SCOPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">{t('compliance.vigilance.fieldSeverity', 'Sévérité (1-5)')}</label>
              <input
                type="number" min={1} max={5}
                value={form.severity}
                onChange={e => setForm({ ...form, severity: parseInt(e.target.value, 10) })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">{t('compliance.vigilance.fieldLikelihood', 'Probabilité (1-5)')}</label>
              <input
                type="number" min={1} max={5}
                value={form.likelihood}
                onChange={e => setForm({ ...form, likelihood: parseInt(e.target.value, 10) })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">{t('compliance.vigilance.fieldCountries', 'Pays concernés (ISO 2 lettres, séparés par virgules)')}</label>
            <input
              value={form.countries}
              onChange={e => setForm({ ...form, countries: e.target.value })}
              placeholder={t('compliance.vigilance.countriesPh', 'BD, VN, CN')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">{t('compliance.vigilance.fieldDescription', 'Description')}</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              placeholder={t('compliance.vigilance.descriptionPh', "Contexte, source d'identification, impacts potentiels...")}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600">
              {t('compliance.vigilance.cancel', 'Annuler')}
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
              {saving ? t('compliance.vigilance.creating', 'Création…') : t('compliance.vigilance.createRisk', 'Créer le risque')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
