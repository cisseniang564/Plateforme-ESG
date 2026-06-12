/**
 * CSDDD — Corporate Sustainability Due Diligence Directive (2024/1760/UE)
 * 4 tabs: Périmètre · Cartographie des risques · Plans d'action · Rapport de vigilance
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  ShieldAlert, Users, Leaf, AlertTriangle, CheckCircle,
  Plus, FileText, Download, Save, ChevronDown, ChevronUp, Trash2, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type RiskCategory = 'human_rights' | 'environment';
type Priority = 'P1' | 'P2' | 'P3';
type MitigationStatus = 'none' | 'planned' | 'in_progress' | 'completed';
type GrievanceStatus = 'open' | 'investigating' | 'resolved' | 'dismissed';
type Tab = 'scope' | 'risks' | 'actions' | 'report';

interface CatalogRisk {
  id: string; category: RiskCategory; subcategory: string;
  name: string; description: string; reference: string; scope: string;
}

interface RiskAssessment {
  riskId: string; severity: number; likelihood: number; breadth: number;
  identified: boolean; notes: string;
  mitigationStatus: MitigationStatus; mitigationDescription: string;
  owner: string; deadline: string;
}

interface Grievance {
  id: string; title: string; category: string;
  reportedBy: string; reportedDate: string;
  status: GrievanceStatus; description: string; resolution: string;
}

interface CompanyScope {
  companyName: string; reportingYear: string;
  coversOwnOperations: boolean; coversSubsidiaries: boolean;
  coversTier1: boolean; coversTier2: boolean;
  employeeCount: string; turnover: string; countries: string; reviewCycle: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_SCOPE: CompanyScope = {
  companyName: '', reportingYear: '2024',
  coversOwnOperations: true, coversSubsidiaries: false, coversTier1: false, coversTier2: false,
  employeeCount: '', turnover: '', countries: '', reviewCycle: 'annual',
};

const getMitigationLabels = (t: TFunction): Record<MitigationStatus, { label: string; color: string; pct: number }> => ({
  none:        { label: t('compliance.csddd.mitigation.none',        'Aucun plan'), color: '#6b7280', pct: 0 },
  planned:     { label: t('compliance.csddd.mitigation.planned',     'Planifié'),   color: '#2563eb', pct: 25 },
  in_progress: { label: t('compliance.csddd.mitigation.in_progress', 'En cours'),   color: '#d97706', pct: 66 },
  completed:   { label: t('compliance.csddd.mitigation.completed',   'Terminé'),    color: '#16a34a', pct: 100 },
});

const getGrievanceStatusLabels = (t: TFunction): Record<GrievanceStatus, { label: string; color: string }> => ({
  open:          { label: t('compliance.csddd.grievanceStatus.open',          'Ouvert'),   color: '#dc2626' },
  investigating: { label: t('compliance.csddd.grievanceStatus.investigating',  'En cours'), color: '#d97706' },
  resolved:      { label: t('compliance.csddd.grievanceStatus.resolved',       'Résolu'),   color: '#16a34a' },
  dismissed:     { label: t('compliance.csddd.grievanceStatus.dismissed',      'Classé'),   color: '#6b7280' },
});

function calcPriority(a: RiskAssessment): Priority {
  const score = a.severity * a.likelihood * a.breadth;
  if (score >= 40) return 'P1';
  if (score >= 15) return 'P2';
  return 'P3';
}

const getPriorityMeta = (t: TFunction): Record<Priority, { bg: string; text: string; label: string }> => ({
  P1: { bg: '#fee2e2', text: '#b91c1c', label: t('compliance.csddd.priority.p1', 'Critique') },
  P2: { bg: '#fef3c7', text: '#92400e', label: t('compliance.csddd.priority.p2', 'Élevé') },
  P3: { bg: '#dcfce7', text: '#166534', label: t('compliance.csddd.priority.p3', 'Modéré') },
});

const TABS_IDS: { id: Tab; num: number }[] = [
  { id: 'scope',   num: 1 },
  { id: 'risks',   num: 2 },
  { id: 'actions', num: 3 },
  { id: 'report',  num: 4 },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function CSDDD() {
  const { t } = useTranslation();
  const MITIGATION_LABELS = getMitigationLabels(t);
  const GRIEVANCE_STATUS_LABELS = getGrievanceStatusLabels(t);
  const PRIORITY_META = getPriorityMeta(t);
  const TABS: { id: Tab; label: string; num: number }[] = [
    { id: 'scope',   label: t('compliance.csddd.tabs.scope',   'Périmètre'),               num: 1 },
    { id: 'risks',   label: t('compliance.csddd.tabs.risks',   'Cartographie des risques'), num: 2 },
    { id: 'actions', label: t('compliance.csddd.tabs.actions', "Plans d'action"),           num: 3 },
    { id: 'report',  label: t('compliance.csddd.tabs.report',  'Rapport de vigilance'),     num: 4 },
  ];
  const [tab, setTab]                         = useState<Tab>('scope');
  const [catalogRisks, setCatalogRisks]       = useState<CatalogRisk[]>([]);
  const [assessments, setAssessments]         = useState<Record<string, RiskAssessment>>({});
  const [grievances, setGrievances]           = useState<Grievance[]>([]);
  const [scope, setScope]                     = useState<CompanyScope>(DEFAULT_SCOPE);
  const [saving, setSaving]                   = useState(false);
  const [categoryFilter, setCategoryFilter]   = useState<'all' | RiskCategory>('all');
  const [expandedRisks, setExpandedRisks]     = useState<Set<string>>(new Set());
  const [showGrievanceForm, setShowGrievanceForm] = useState(false);
  const [newGrievance, setNewGrievance]       = useState<Partial<Grievance>>({ status: 'open', reportedDate: new Date().toISOString().slice(0, 10) });

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    api.get('/csddd/risk-catalog').then(res => {
      const risks: CatalogRisk[] = res.data?.risks ?? [];
      setCatalogRisks(risks);
      setAssessments(prev => {
        const next = { ...prev };
        risks.forEach(r => {
          if (!next[r.id]) {
            next[r.id] = { riskId: r.id, severity: 1, likelihood: 1, breadth: 1, identified: false, notes: '', mitigationStatus: 'none', mitigationDescription: '', owner: '', deadline: '' };
          }
        });
        return next;
      });
    }).catch(() => {});

    const local = localStorage.getItem('csddd_assessment');
    if (local) {
      try {
        const d = JSON.parse(local);
        if (d.scope) setScope(d.scope);
        if (d.assessments) setAssessments(prev => ({ ...prev, ...d.assessments }));
        if (d.grievances) setGrievances(d.grievances);
      } catch {}
    }
    api.get('/csddd/assessment').then(res => {
      if (res.data?.scope && Object.keys(res.data.scope).length > 0) setScope(res.data.scope);
      if (res.data?.risk_assessments?.length > 0) {
        const fromApi: Record<string, RiskAssessment> = {};
        res.data.risk_assessments.forEach((r: RiskAssessment) => { fromApi[r.riskId] = r; });
        setAssessments(prev => ({ ...prev, ...fromApi }));
      }
      if (res.data?.grievances?.length > 0) setGrievances(res.data.grievances);
    }).catch(() => {});
  }, []);

  // ── Save ──────────────────────────────────────────────────────────────────
  const save = useCallback(async () => {
    setSaving(true);
    const payload = { scope, risk_assessments: Object.values(assessments), grievances, monitoring: {} };
    try {
      await api.post('/csddd/assessment', payload);
      localStorage.setItem('csddd_assessment', JSON.stringify({ scope, assessments, grievances }));
      toast.success(t('compliance.csddd.toast.saved', 'Devoir de vigilance sauvegardé'));
    } catch {
      toast.error(t('compliance.csddd.toast.saveError', 'Erreur lors de la sauvegarde'));
    } finally { setSaving(false); }
  }, [scope, assessments, grievances]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const updateAssessment = useCallback((riskId: string, patch: Partial<RiskAssessment>) => {
    setAssessments(prev => ({ ...prev, [riskId]: { ...prev[riskId], ...patch } }));
  }, []);

  const toggleExpand = (id: string) => setExpandedRisks(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const addGrievance = () => {
    if (!newGrievance.title?.trim()) { toast.error(t('compliance.csddd.toast.titleRequired', 'Le titre est requis')); return; }
    const g: Grievance = {
      id: Date.now().toString(),
      title: newGrievance.title ?? '',
      category: newGrievance.category ?? 'Autre',
      reportedBy: newGrievance.reportedBy ?? 'Anonyme',
      reportedDate: newGrievance.reportedDate ?? new Date().toISOString().slice(0, 10),
      status: 'open',
      description: newGrievance.description ?? '',
      resolution: '',
    };
    setGrievances(prev => [g, ...prev]);
    setNewGrievance({ status: 'open', reportedDate: new Date().toISOString().slice(0, 10) });
    setShowGrievanceForm(false);
    toast.success(t('compliance.csddd.toast.grievanceSaved', 'Réclamation enregistrée'));
  };

  const exportJson = () => {
    const data = { scope, risk_assessments: Object.values(assessments).filter(a => a.identified), grievances };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `csddd-rapport-${scope.reportingYear || '2024'}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const identified = Object.values(assessments).filter(a => a.identified);
    return {
      total: identified.length,
      p1: identified.filter(a => calcPriority(a) === 'P1').length,
      withPlan: identified.filter(a => a.mitigationStatus !== 'none').length,
      openGrievances: grievances.filter(g => g.status === 'open' || g.status === 'investigating').length,
    };
  }, [assessments, grievances]);

  const identifiedRisks = useMemo(() =>
    Object.values(assessments)
      .filter(a => a.identified)
      .sort((a, b) => {
        const pa = calcPriority(a), pb = calcPriority(b);
        if (pa !== pb) return pa < pb ? -1 : 1;
        return (b.severity * b.likelihood * b.breadth) - (a.severity * a.likelihood * a.breadth);
      }),
  [assessments]);

  const actionRisks = useMemo(() =>
    identifiedRisks.filter(a => calcPriority(a) !== 'P3'),
  [identifiedRisks]);

  const filteredCatalog = useMemo(() =>
    categoryFilter === 'all' ? catalogRisks : catalogRisks.filter(r => r.category === categoryFilter),
  [catalogRisks, categoryFilter]);

  // ── Scope helpers ─────────────────────────────────────────────────────────
  const setField = (key: keyof CompanyScope, val: string | boolean) =>
    setScope(prev => ({ ...prev, [key]: val }));

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Hero ── */}
      <div style={{ background: 'linear-gradient(135deg,#1c0a00 0%,#450a0a 40%,#7f1d1d 80%,#b91c1c 100%)' }}
        className="px-8 py-10 text-white">
        <div className="max-w-7xl mx-auto flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <ShieldAlert className="h-8 w-8 text-red-300" />
              <h1 className="text-3xl font-bold">{t('compliance.csddd.hero.title', 'Devoir de Vigilance & CSDDD')}</h1>
            </div>
            <p className="text-red-200 text-base mb-4">
              {t('compliance.csddd.hero.subtitle', 'Corporate Sustainability Due Diligence Directive 2024/1760/UE · Droits humains & Environnement')}
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                t('compliance.csddd.hero.statsRisks', '{{n}} risques identifiés', { n: stats.total }),
                t('compliance.csddd.hero.statsP1', '{{n}} risques P1 (critiques)', { n: stats.p1 }),
                t('compliance.csddd.hero.statsPlans', "{{n}} plans d'action", { n: stats.withPlan }),
                t('compliance.csddd.hero.statsGrievances', '{{n}} réclamations en cours', { n: stats.openGrievances }),
              ].map(txt => (
                <span key={txt} className="px-3 py-1 rounded-full text-xs font-semibold bg-white/15">{txt}</span>
              ))}
            </div>
          </div>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-5 py-2.5 rounded-xl font-semibold shrink-0 transition-colors">
            <Save className="h-4 w-4" />{saving ? t('compliance.csddd.hero.saving', 'Sauvegarde…') : t('compliance.csddd.hero.save', 'Sauvegarder')}
          </button>
        </div>
      </div>

      {/* ── Tab stepper ── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-8 flex gap-1 py-3">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id ? 'bg-red-700 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}>
              <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${
                tab === t.id ? 'bg-white text-red-700' : 'bg-gray-200 text-gray-600'
              }`}>{t.num}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8 space-y-6">

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* TAB 1 — PÉRIMÈTRE                                               */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {tab === 'scope' && (
          <>
            {/* Info banner */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <strong>{t('compliance.csddd.scope.scopeTitle', 'Champ d\'application CSDDD :')}</strong> {t('compliance.csddd.scope.scopeDesc', "La Directive 2024/1760/UE s'applique aux entreprises de l'UE de plus de 1 000 salariés et > 450 M€ de CA (entrée en vigueur progressive 2027–2029). Les entreprises de pays tiers actives sur le marché UE sont également concernées.")}
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  {t('compliance.csddd.scope.companyNameLabel', "Raison sociale de l'entité déclarante")}
                </label>
                <input value={scope.companyName} onChange={e => setField('companyName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder={t('compliance.csddd.scope.companyNamePlaceholder', 'Ex. : Société Générale SA')} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  {t('compliance.csddd.scope.reportingYearLabel', 'Exercice de reporting')}
                </label>
                <select value={scope.reportingYear} onChange={e => setField('reportingYear', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                  {['2022','2023','2024','2025'].map(y => <option key={y}>{y}</option>)}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {t('compliance.csddd.scope.coveredScopeLabel', 'Périmètre couvert')}
                </label>
                <div className="flex flex-wrap gap-4">
                  {([
                    ['coversOwnOperations', t('compliance.csddd.scope.ownOps',  'Opérations propres')],
                    ['coversSubsidiaries',  t('compliance.csddd.scope.subs',    'Filiales')],
                    ['coversTier1',         t('compliance.csddd.scope.tier1',   'Fournisseurs Tier 1')],
                    ['coversTier2',         t('compliance.csddd.scope.tier2',   'Fournisseurs Tier 2+')],
                  ] as [keyof CompanyScope, string][]).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input type="checkbox" checked={!!scope[key]} onChange={e => setField(key, e.target.checked)}
                        className="w-4 h-4 rounded accent-red-600" />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{t('compliance.csddd.scope.employeeCountLabel', 'Effectif total')}</label>
                <select value={scope.employeeCount} onChange={e => setField('employeeCount', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                  <option value="">{t('compliance.csddd.scope.selectPlaceholder', '— Sélectionner —')}</option>
                  {['< 500','500–1 000','1 000–5 000','5 000–10 000','> 10 000'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{t('compliance.csddd.scope.turnoverLabel', "Chiffre d'affaires")}</label>
                <select value={scope.turnover} onChange={e => setField('turnover', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                  <option value="">{t('compliance.csddd.scope.selectPlaceholder', '— Sélectionner —')}</option>
                  {['< 40 M€','40–150 M€','150–450 M€','450–750 M€','> 750 M€'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  {t('compliance.csddd.scope.countriesLabel', "Pays d'implantation principaux")}
                </label>
                <textarea value={scope.countries} onChange={e => setField('countries', e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                  placeholder={t('compliance.csddd.scope.countriesPlaceholder', 'Ex. : France, Allemagne, Maroc, Sénégal, Vietnam…')} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  {t('compliance.csddd.scope.reviewCycleLabel', 'Fréquence de révision du devoir de vigilance')}
                </label>
                <select value={scope.reviewCycle} onChange={e => setField('reviewCycle', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                  <option value="annual">{t('compliance.csddd.scope.reviewAnnual', 'Annuelle')}</option>
                  <option value="biannual">{t('compliance.csddd.scope.reviewBiannual', 'Semestrielle')}</option>
                </select>
              </div>
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* TAB 2 — CARTOGRAPHIE DES RISQUES                                */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {tab === 'risks' && (
          <>
            {/* Filter bar */}
            <div className="flex gap-2">
              {(['all', 'human_rights', 'environment'] as const).map(cat => (
                <button key={cat} onClick={() => setCategoryFilter(cat)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    categoryFilter === cat
                      ? cat === 'human_rights' ? 'bg-red-600 text-white border-red-600'
                        : cat === 'environment' ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-gray-800 text-white border-gray-800'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}>
                  {cat === 'all' ? t('compliance.csddd.risks.filterAll', 'Tous les risques') : cat === 'human_rights' ? t('compliance.csddd.risks.filterHumanRights', '👤 Droits humains') : t('compliance.csddd.risks.filterEnvironment', '🌿 Environnement')}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {filteredCatalog.map(risk => {
                const ass = assessments[risk.id] ?? { riskId: risk.id, severity: 1, likelihood: 1, breadth: 1, identified: false, notes: '', mitigationStatus: 'none', mitigationDescription: '', owner: '', deadline: '' };
                const priority = calcPriority(ass);
                const pm = PRIORITY_META[priority];
                const expanded = expandedRisks.has(risk.id);

                return (
                  <div key={risk.id}
                    className={`rounded-2xl border bg-white shadow-sm overflow-hidden transition-opacity ${!ass.identified ? 'opacity-60' : ''}`}>
                    <div className="px-5 py-4 flex items-center gap-4">
                      {/* Identified checkbox */}
                      <input type="checkbox" checked={ass.identified}
                        onChange={e => updateAssessment(risk.id, { identified: e.target.checked })}
                        className="w-4 h-4 rounded accent-red-600 shrink-0" />

                      {/* Risk info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold text-sm text-gray-900">{risk.name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            risk.category === 'human_rights' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>{risk.subcategory}</span>
                          <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                            {risk.scope === 'own_operations' ? t('compliance.csddd.risks.scopeOwn', 'Opérations propres') : risk.scope === 'value_chain' ? t('compliance.csddd.risks.scopeValueChain', 'Chaîne de valeur') : t('compliance.csddd.risks.scopeAll', 'Tout le périmètre')}
                          </span>
                        </div>
                      </div>

                      {/* Sliders */}
                      {ass.identified && (
                        <div className="flex gap-4 shrink-0">
                          {([
                            ['severity',   t('compliance.csddd.risks.sliderSeverity',    'Sévérité'),   '#dc2626'],
                            ['likelihood', t('compliance.csddd.risks.sliderLikelihood',  'Probabilité'), '#d97706'],
                            ['breadth',    t('compliance.csddd.risks.sliderBreadth',     'Ampleur'),    '#7c3aed'],
                          ] as [keyof RiskAssessment, string, string][]).map(([field, label, color]) => (
                            <div key={field} className="text-center w-20">
                              <p className="text-xs text-gray-500 mb-1">{label}</p>
                              <input type="range" min={1} max={5} value={ass[field] as number}
                                onChange={e => updateAssessment(risk.id, { [field]: Number(e.target.value) })}
                                style={{ accentColor: color }} className="w-full" />
                              <p className="text-xs font-bold mt-0.5" style={{ color }}>{ass[field as keyof RiskAssessment] as number}/5</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Priority badge */}
                      {ass.identified && (
                        <span className="px-3 py-1.5 rounded-lg text-xs font-bold shrink-0"
                          style={{ background: pm.bg, color: pm.text }}>
                          {priority} — {pm.label}
                        </span>
                      )}

                      {/* Expand */}
                      <button onClick={() => toggleExpand(risk.id)} className="text-gray-400 hover:text-gray-600 shrink-0">
                        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>

                    {expanded && (
                      <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-3">
                        <p className="text-sm text-gray-600">{risk.description}</p>
                        <p className="text-xs text-gray-400"><span className="font-semibold">{t('compliance.csddd.risks.referenceLabel', 'Référence :')}</span> {risk.reference}</p>
                        <div>
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">{t('compliance.csddd.risks.notesLabel', "Notes d'analyse")}</label>
                          <textarea value={ass.notes} onChange={e => updateAssessment(risk.id, { notes: e.target.value })}
                            rows={2} placeholder={t('compliance.csddd.risks.notesPlaceholder', 'Contexte spécifique, sources, observations…')}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* TAB 3 — PLANS D'ACTION & RÉCLAMATIONS                           */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {tab === 'actions' && (
          <>
            {/* Plans d'action */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                {t('compliance.csddd.actions.heading', "Plans d'action — Risques P1 & P2")}
              </h2>

              {actionRisks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-gray-400">
                  {t('compliance.csddd.actions.emptyState', "Aucun risque P1 ou P2 identifié. Complétez d'abord la cartographie des risques.")}
                </div>
              ) : (
                <div className="space-y-4">
                  {actionRisks.map(ass => {
                    const risk = catalogRisks.find(r => r.id === ass.riskId);
                    if (!risk) return null;
                    const priority = calcPriority(ass);
                    const pm = PRIORITY_META[priority];
                    const mit = MITIGATION_LABELS[ass.mitigationStatus];

                    return (
                      <div key={ass.riskId} className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
                        <div className="flex items-center gap-3 mb-4">
                          <span className="font-semibold text-gray-900">{risk.name}</span>
                          <span className="px-2 py-0.5 rounded-lg text-xs font-bold" style={{ background: pm.bg, color: pm.text }}>
                            {priority}
                          </span>
                        </div>

                        {/* Status pills */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {(Object.keys(MITIGATION_LABELS) as MitigationStatus[]).map(s => (
                            <button key={s} onClick={() => updateAssessment(ass.riskId, { mitigationStatus: s })}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
                              style={ass.mitigationStatus === s
                                ? { background: MITIGATION_LABELS[s].color, color: '#fff', borderColor: MITIGATION_LABELS[s].color }
                                : { background: '#f9fafb', color: '#6b7280', borderColor: '#e5e7eb' }}>
                              {MITIGATION_LABELS[s].label}
                            </button>
                          ))}
                        </div>

                        {/* Progress bar */}
                        <div className="h-2 bg-gray-100 rounded-full mb-4 overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${mit.pct}%`, background: mit.color }} />
                        </div>

                        {ass.mitigationStatus !== 'none' && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-3">
                              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">{t('compliance.csddd.actions.planDescLabel', "Description du plan d'action")}</label>
                              <textarea value={ass.mitigationDescription}
                                onChange={e => updateAssessment(ass.riskId, { mitigationDescription: e.target.value })}
                                rows={3} placeholder={t('compliance.csddd.actions.planDescPlaceholder', 'Mesures préventives, correctives ou réparatrices envisagées…')}
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">{t('compliance.csddd.actions.ownerLabel', 'Responsable')}</label>
                              <input value={ass.owner} onChange={e => updateAssessment(ass.riskId, { owner: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                                placeholder={t('compliance.csddd.actions.ownerPlaceholder', 'Nom / fonction')} />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">{t('compliance.csddd.actions.deadlineLabel', 'Échéance')}</label>
                              <input type="date" value={ass.deadline} onChange={e => updateAssessment(ass.riskId, { deadline: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Mécanisme de réclamation */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                {t('compliance.csddd.grievance.heading', 'Mécanisme de réclamation')}
              </h2>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 mb-4">
                {t('compliance.csddd.grievance.banner', "La CSDDD (Art. 14) impose la mise en place d'un mécanisme permettant aux personnes affectées ou à leurs représentants de signaler des violations réelles ou potentielles.")}
              </div>

              <div className="flex justify-end mb-3">
                <button onClick={() => setShowGrievanceForm(v => !v)}
                  className="flex items-center gap-2 bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded-xl text-sm font-semibold">
                  <Plus className="h-4 w-4" /> {t('compliance.csddd.grievance.addBtn', 'Ajouter une réclamation')}
                </button>
              </div>

              {showGrievanceForm && (
                <div className="rounded-2xl border border-dashed border-red-300 bg-red-50 p-5 mb-4 space-y-3">
                  <div className="flex justify-between items-center mb-1">
                    <p className="font-semibold text-red-800 text-sm">{t('compliance.csddd.grievance.formTitle', 'Nouvelle réclamation')}</p>
                    <button onClick={() => setShowGrievanceForm(false)}><X className="h-4 w-4 text-red-400" /></button>
                  </div>
                  <input value={newGrievance.title ?? ''} onChange={e => setNewGrievance(p => ({ ...p, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                    placeholder={t('compliance.csddd.grievance.titlePlaceholder', 'Titre de la réclamation *')} />
                  <div className="grid grid-cols-2 gap-3">
                    <select value={newGrievance.category ?? ''} onChange={e => setNewGrievance(p => ({ ...p, category: e.target.value }))}
                      className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
                      <option value="">{t('compliance.csddd.grievance.categoryPlaceholder', '— Catégorie —')}</option>
                      {[
                        t('compliance.csddd.grievance.catHumanRights',  'Droits humains'),
                        t('compliance.csddd.grievance.catEnvironment',  'Environnement'),
                        t('compliance.csddd.grievance.catLabour',       'Conditions de travail'),
                        t('compliance.csddd.grievance.catHealth',       'Santé & Sécurité'),
                        t('compliance.csddd.grievance.catOther',        'Autre'),
                      ].map(v => <option key={v}>{v}</option>)}
                    </select>
                    <input type="date" value={newGrievance.reportedDate ?? ''} onChange={e => setNewGrievance(p => ({ ...p, reportedDate: e.target.value }))}
                      className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                  </div>
                  <input value={newGrievance.reportedBy ?? ''} onChange={e => setNewGrievance(p => ({ ...p, reportedBy: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                    placeholder={t('compliance.csddd.grievance.reportedByPlaceholder', 'Signalé par (nom ou anonyme)')} />
                  <textarea value={newGrievance.description ?? ''} onChange={e => setNewGrievance(p => ({ ...p, description: e.target.value }))}
                    rows={3} placeholder={t('compliance.csddd.grievance.descPlaceholder', 'Description de la violation ou du risque signalé…')}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
                  <div className="flex gap-2">
                    <button onClick={addGrievance} className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded-xl text-sm font-semibold">{t('compliance.csddd.grievance.submitBtn', 'Enregistrer')}</button>
                    <button onClick={() => setShowGrievanceForm(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold">{t('compliance.csddd.grievance.cancelBtn', 'Annuler')}</button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {grievances.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-gray-400 text-sm">
                    {t('compliance.csddd.grievance.emptyState', "Aucune réclamation enregistrée. Le mécanisme est en place mais n'a pas encore été sollicité.")}
                  </div>
                )}
                {grievances.map(g => {
                  const sl = GRIEVANCE_STATUS_LABELS[g.status];
                  return (
                    <div key={g.id} className="rounded-xl border border-gray-100 bg-white p-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900">{g.title}</p>
                        <p className="text-xs text-gray-500">{g.category} · {g.reportedBy} · {g.reportedDate}</p>
                      </div>
                      <span className="px-2 py-1 rounded-lg text-xs font-semibold" style={{ background: sl.color + '20', color: sl.color }}>
                        {sl.label}
                      </span>
                      <select value={g.status} onChange={e => setGrievances(prev => prev.map(x => x.id === g.id ? { ...x, status: e.target.value as GrievanceStatus } : x))}
                        className="px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-red-400">
                        {(Object.keys(GRIEVANCE_STATUS_LABELS) as GrievanceStatus[]).map(s => (
                          <option key={s} value={s}>{GRIEVANCE_STATUS_LABELS[s].label}</option>
                        ))}
                      </select>
                      <button onClick={() => setGrievances(prev => prev.filter(x => x.id !== g.id))}
                        className="text-gray-300 hover:text-red-400">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* TAB 4 — RAPPORT DE VIGILANCE                                     */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {tab === 'report' && (
          <>
            <div className="flex justify-end gap-3 no-print">
              <button onClick={exportJson}
                className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold">
                <Download className="h-4 w-4" /> {t('compliance.csddd.report.exportJsonBtn', 'Exporter JSON')}
              </button>
              <button onClick={() => { window.print(); toast.success(t('compliance.csddd.report.printHint', 'Utilisez Ctrl+P pour sauvegarder en PDF')); }}
                className="flex items-center gap-2 bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded-xl text-sm font-semibold">
                <FileText className="h-4 w-4" /> {t('compliance.csddd.report.downloadPdfBtn', 'Télécharger PDF')}
              </button>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-8 space-y-8 font-serif">
              {/* Header */}
              <div className="text-center border-b border-gray-200 pb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">{t('compliance.csddd.report.docTitle', 'DÉCLARATION DE VIGILANCE')}</h1>
                <p className="text-gray-600">{scope.companyName || t('compliance.csddd.report.companyFallback', '[Raison sociale]')} · {t('compliance.csddd.report.exercise', 'Exercice')} {scope.reportingYear}</p>
                <p className="text-sm text-gray-400 mt-1">{t('compliance.csddd.report.generatedOn', 'Générée le')} {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>

              {/* Art. 1 */}
              <section>
                <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-red-700 text-white text-xs flex items-center justify-center font-bold">1</span>
                  {t('compliance.csddd.report.art1Title', 'Périmètre du devoir de vigilance')}
                </h2>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 ml-3">
                  <li>{t('compliance.csddd.report.art1Entity', 'Entité déclarante :')} <strong>{scope.companyName || t('compliance.csddd.report.art1EntityFallback', 'non renseignée')}</strong></li>
                  <li>{t('compliance.csddd.report.art1ReportingYear', 'Exercice de reporting :')} <strong>{scope.reportingYear}</strong></li>
                  <li>{t('compliance.csddd.report.art1CoveredScope', 'Périmètre couvert :')} {[
                    scope.coversOwnOperations && t('compliance.csddd.report.art1OwnOps', 'opérations propres'),
                    scope.coversSubsidiaries && t('compliance.csddd.report.art1Subs', 'filiales'),
                    scope.coversTier1 && t('compliance.csddd.report.art1Tier1', 'fournisseurs Tier 1'),
                    scope.coversTier2 && t('compliance.csddd.report.art1Tier2', 'fournisseurs Tier 2+'),
                  ].filter(Boolean).join(', ') || t('compliance.csddd.report.art1ScopeFallback', 'non défini')}</li>
                  {scope.employeeCount && <li>{t('compliance.csddd.report.art1Employees', 'Effectif total :')} <strong>{scope.employeeCount}</strong></li>}
                  {scope.turnover && <li>{t('compliance.csddd.report.art1Turnover', "Chiffre d'affaires :")} <strong>{scope.turnover}</strong></li>}
                  {scope.countries && <li>{t('compliance.csddd.report.art1Countries', "Pays d'implantation :")} <strong>{scope.countries}</strong></li>}
                  <li>{t('compliance.csddd.report.art1ReviewFreq', 'Fréquence de révision :')} <strong>{scope.reviewCycle === 'annual' ? t('compliance.csddd.scope.reviewAnnual', 'Annuelle') : t('compliance.csddd.scope.reviewBiannual', 'Semestrielle')}</strong></li>
                </ul>
              </section>

              {/* Art. 2 */}
              <section>
                <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-red-700 text-white text-xs flex items-center justify-center font-bold">2</span>
                  {t('compliance.csddd.report.art2Title', '{{n}} risques identifiés', { n: stats.total })}
                </h2>
                {stats.total === 0 ? (
                  <p className="text-sm text-gray-400 italic">{t('compliance.csddd.report.art2Empty', 'Aucun risque identifié à ce stade.')}</p>
                ) : (
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        {[
                          t('compliance.csddd.report.colRisk',        'Risque'),
                          t('compliance.csddd.report.colCategory',    'Catégorie'),
                          t('compliance.csddd.report.colPriority',    'Priorité'),
                          t('compliance.csddd.report.colSeverity',    'Sévérité'),
                          t('compliance.csddd.report.colLikelihood',  'Probabilité'),
                        ].map(h => (
                          <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-gray-500 border-b border-gray-200">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {identifiedRisks.map(ass => {
                        const risk = catalogRisks.find(r => r.id === ass.riskId);
                        if (!risk) return null;
                        const priority = calcPriority(ass);
                        const pm = PRIORITY_META[priority];
                        return (
                          <tr key={ass.riskId} className="border-b border-gray-100">
                            <td className="px-3 py-2 font-medium text-gray-800">{risk.name}</td>
                            <td className="px-3 py-2 text-gray-600">{risk.subcategory}</td>
                            <td className="px-3 py-2">
                              <span className="px-2 py-0.5 rounded-lg text-xs font-bold" style={{ background: pm.bg, color: pm.text }}>{priority}</span>
                            </td>
                            <td className="px-3 py-2 text-gray-600">{ass.severity}/5</td>
                            <td className="px-3 py-2 text-gray-600">{ass.likelihood}/5</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </section>

              {/* Art. 3 */}
              <section>
                <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-red-700 text-white text-xs flex items-center justify-center font-bold">3</span>
                  {t('compliance.csddd.report.art3Title', "Mesures de prévention et d'atténuation")}
                </h2>
                {actionRisks.filter(a => a.mitigationStatus !== 'none').length === 0 ? (
                  <p className="text-sm text-gray-400 italic">{t('compliance.csddd.report.art3Empty', "Aucun plan d'action défini. Complétez l'onglet \"Plans d'action\".")}</p>
                ) : (
                  <div className="space-y-4">
                    {actionRisks.filter(a => a.mitigationStatus !== 'none').map(ass => {
                      const risk = catalogRisks.find(r => r.id === ass.riskId);
                      if (!risk) return null;
                      const priority = calcPriority(ass);
                      const pm = PRIORITY_META[priority];
                      const mit = MITIGATION_LABELS[ass.mitigationStatus];
                      return (
                        <div key={ass.riskId} className="border-l-4 pl-4" style={{ borderColor: pm.text }}>
                          <p className="font-semibold text-gray-800 text-sm">{risk.name}
                            <span className="ml-2 text-xs font-normal px-1.5 py-0.5 rounded" style={{ background: pm.bg, color: pm.text }}>{priority}</span>
                          </p>
                          <p className="text-sm text-gray-600 mt-1">{ass.mitigationDescription || t('compliance.csddd.report.art3PlanFallback', 'Plan en cours de définition.')}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {t('compliance.csddd.report.art3Status', 'Statut :')} <strong style={{ color: mit.color }}>{mit.label}</strong>
                            {ass.owner && <> · {t('compliance.csddd.report.art3Owner', 'Responsable :')} <strong>{ass.owner}</strong></>}
                            {ass.deadline && <> · {t('compliance.csddd.report.art3Deadline', 'Échéance :')} <strong>{ass.deadline}</strong></>}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Art. 4 */}
              <section>
                <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-red-700 text-white text-xs flex items-center justify-center font-bold">4</span>
                  {t('compliance.csddd.report.art4Title', 'Mécanisme de réclamation')}
                </h2>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 ml-3">
                  <li>{t('compliance.csddd.report.art4Received', 'Réclamations reçues :')} <strong>{grievances.length}</strong></li>
                  <li>{t('compliance.csddd.report.art4Resolved', 'Résolues :')} <strong>{grievances.filter(g => g.status === 'resolved').length}</strong></li>
                  <li>{t('compliance.csddd.report.art4Ongoing', "En cours d'instruction :")} <strong>{stats.openGrievances}</strong></li>
                  <li>{t('compliance.csddd.report.art4Dismissed', 'Classées sans suite :')} <strong>{grievances.filter(g => g.status === 'dismissed').length}</strong></li>
                </ul>
              </section>

              {/* Art. 5 */}
              <section>
                <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-red-700 text-white text-xs flex items-center justify-center font-bold">5</span>
                  {t('compliance.csddd.report.art5Title', "Surveillance de l'efficacité")}
                </h2>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 ml-3">
                  <li>{t('compliance.csddd.report.art5P1P2Plans', "Risques P1+P2 avec plan d'action :")} <strong>{stats.withPlan}</strong> / {actionRisks.length}</li>
                  <li>{t('compliance.csddd.report.art5Completed', "Plans d'action complétés :")} <strong>{Object.values(assessments).filter(a => a.identified && a.mitigationStatus === 'completed').length}</strong></li>
                  <li>{t('compliance.csddd.report.art5NextReview', 'Prochaine révision :')} <strong>{scope.reviewCycle === 'annual' ? t('compliance.csddd.scope.reviewAnnual', 'Annuelle') : t('compliance.csddd.scope.reviewBiannual', 'Semestrielle')} — {Number(scope.reportingYear) + 1}</strong></li>
                </ul>
              </section>

              {/* Footer */}
              <p className="text-xs text-gray-400 italic border-t border-gray-100 pt-4">
                {t('compliance.csddd.report.footer', "Ce rapport a été généré automatiquement via la plateforme ESGFlow conformément à l'article 11 de la Directive CSDDD (2024/1760/UE). Il ne se substitue pas à un avis juridique.")}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
