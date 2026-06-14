import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Leaf, Search, Filter, ChevronRight, ChevronLeft,
  CheckCircle, XCircle, AlertCircle, Download, RefreshCw, Save, Info,
} from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

// ─── Types ────────────────────────────────────────────────────────────────────

type ObjectiveId = 'mitigation' | 'adaptation' | 'water' | 'circular' | 'pollution' | 'biodiversity';
type Tab = 'catalogue' | 'evaluation' | 'kpis' | 'rapport';
type DNSHStatus = 'pass' | 'fail' | 'partial' | 'na';
type AlignmentStatus = 'aligned' | 'eligible_only' | 'not_aligned';

interface RefActivity {
  id: string;
  nace: string;
  name: string;
  sector: string;
  objective: ObjectiveId;
  threshold: string;
  dnsh_summary: string;
  eligible: boolean;
  dnsh_details?: Record<string, { criterion: string; required: boolean }>;
}

interface ActivityAssessment {
  activityId: string;
  eligible: boolean;
  substantialContribution: boolean;
  dnsh: Record<string, { status: DNSHStatus; criterion: string }>;
  mss: boolean;
  notes: string;
}

interface FinancialEntry {
  activityId: string;
  turnoverTotal: number;
  capexTotal: number;
  opexTotal: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

function getObjectiveLabels(t: TFunction): Record<ObjectiveId, string> {
  return {
    mitigation:  t('compliance.taxoAlign.objMitigation',  "Atténuation climat"),
    adaptation:  t('compliance.taxoAlign.objAdaptation',  'Adaptation climat'),
    water:       t('compliance.taxoAlign.objWater',       'Eau & ressources marines'),
    circular:    t('compliance.taxoAlign.objCircular',    "Économie circulaire"),
    pollution:   t('compliance.taxoAlign.objPollution',   'Prévention pollution'),
    biodiversity: t('compliance.taxoAlign.objBiodiversity', "Biodiversité"),
  };
}

// Kept for backward-compat with existing t() call sites that pass both key + fallback
const OBJECTIVE_LABELS: Record<ObjectiveId, string> = {
  mitigation: "Atténuation climat",
  adaptation: 'Adaptation climat',
  water: 'Eau & ressources marines',
  circular: "Économie circulaire",
  pollution: 'Prévention pollution',
  biodiversity: "Biodiversité",
};

const OBJECTIVE_LABEL_KEYS: Record<ObjectiveId, string> = {
  mitigation: 'compliance.taxoAlign.objMitigation',
  adaptation: 'compliance.taxoAlign.objAdaptation',
  water: 'compliance.taxoAlign.objWater',
  circular: 'compliance.taxoAlign.objCircular',
  pollution: 'compliance.taxoAlign.objPollution',
  biodiversity: 'compliance.taxoAlign.objBiodiversity',
};

const OBJECTIVE_COLORS: Record<ObjectiveId, string> = {
  mitigation: '#16a34a',
  adaptation: '#2563eb',
  water: '#0891b2',
  circular: '#d97706',
  pollution: '#ea580c',
  biodiversity: '#059669',
};

const ALL_OBJECTIVES: ObjectiveId[] = [
  'mitigation', 'adaptation', 'water', 'circular', 'pollution', 'biodiversity',
];

const DNSH_STATUS_LABELS: Record<DNSHStatus, string> = {
  pass: 'Conforme',
  partial: 'Partiel',
  fail: 'Non conforme',
  na: 'N/A',
};

// Translation keys for DNSH status labels (French defaults live in DNSH_STATUS_LABELS)
const DNSH_STATUS_LABEL_KEYS: Record<DNSHStatus, string> = {
  pass: 'compliance.taxoAlign.dnshPass',
  partial: 'compliance.taxoAlign.dnshPartial',
  fail: 'compliance.taxoAlign.dnshFail',
  na: 'compliance.taxoAlign.dnshNa',
};

const DNSH_STATUS_CLASSES: Record<DNSHStatus, string> = {
  pass: 'bg-green-600 text-white',
  partial: 'bg-amber-500 text-white',
  fail: 'bg-red-500 text-white',
  na: 'bg-gray-200 text-gray-600',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAlignmentStatus(a: ActivityAssessment): AlignmentStatus {
  if (!a.eligible) return 'not_aligned';
  const dnshPass = Object.values(a.dnsh).every(
    (d) => d.status === 'pass' || d.status === 'na',
  );
  if (a.eligible && a.substantialContribution && dnshPass && a.mss) return 'aligned';
  if (a.eligible) return 'eligible_only';
  return 'not_aligned';
}

function AlignmentBadge({ status }: { status: AlignmentStatus }) {
  const { t } = useTranslation();
  const cfg: Record<AlignmentStatus, { label: string; cls: string; Icon: React.ElementType }> = {
    aligned: { label: t('compliance.taxoAlign.badgeAligned', 'Alignée'), cls: 'bg-green-100 text-green-800 border border-green-200', Icon: CheckCircle },
    eligible_only: { label: t('compliance.taxoAlign.badgeEligibleOnly', 'Éligible uniquement'), cls: 'bg-amber-100 text-amber-800 border border-amber-200', Icon: AlertCircle },
    not_aligned: { label: t('compliance.taxoAlign.badgeNotAligned', 'Non éligible'), cls: 'bg-red-100 text-red-800 border border-red-200', Icon: XCircle },
  };
  const { label, cls, Icon } = cfg[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>
      <Icon size={11} />
      {label}
    </span>
  );
}

function SemiGauge({ value, label }: { value: number; label: string }) {
  const r = 80, cx = 100, cy = 100;
  const circumference = Math.PI * r;
  const dashOffset = circumference * (1 - Math.min(value, 100) / 100);
  return (
    <div className="text-center">
      <svg viewBox="0 0 200 120" className="w-48 h-28 mx-auto">
        <path
          d={`M ${cx - r},${cy} A ${r},${r} 0 0,1 ${cx + r},${cy}`}
          fill="none" stroke="#e5e7eb" strokeWidth="16" strokeLinecap="round"
        />
        <path
          d={`M ${cx - r},${cy} A ${r},${r} 0 0,1 ${cx + r},${cy}`}
          fill="none" stroke="#16a34a" strokeWidth="16" strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={`${dashOffset}`}
        />
        <text x={cx} y={cy - 10} textAnchor="middle"
          style={{ fontSize: '24px', fontWeight: 'bold', fill: '#111' }}>
          {value}%
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle"
          style={{ fontSize: '12px', fill: '#6b7280' }}>
          {label}
        </text>
      </svg>
    </div>
  );
}

// ─── Objective mapping helpers ────────────────────────────────────────────────

const OBJ_FE_TO_BE: Record<string, string> = {
  mitigation: 'climate_mitigation', adaptation: 'climate_adaptation',
  water: 'water_marine', circular: 'circular_economy',
  pollution: 'pollution', biodiversity: 'biodiversity',
};
const OBJ_BE_TO_FE: Record<string, string> = Object.fromEntries(
  Object.entries(OBJ_FE_TO_BE).map(([fe, be]) => [be, fe]),
);

const DNSH_OBJ_TO_FIELD: Record<string, string> = {
  mitigation: 'dnsh_climate_mitigation', adaptation: 'dnsh_climate_adaptation',
  water: 'dnsh_water_marine', circular: 'dnsh_circular_economy',
  pollution: 'dnsh_pollution', biodiversity: 'dnsh_biodiversity',
};

const CURRENT_YEAR = new Date().getFullYear();

// ─── Main component ───────────────────────────────────────────────────────────

export default function TaxonomyAlignment() {
  const { t } = useTranslation();
  const objectiveLabels = useMemo(() => getObjectiveLabels(t), [t]);
  const [tab, setTab] = useState<Tab>('catalogue');
  const [allActivities, setAllActivities] = useState<RefActivity[]>([]);
  const [sectors, setSectors] = useState<{ id: string; name: string }[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [assessments, setAssessments] = useState<Record<string, ActivityAssessment>>({});
  const [financials, setFinancials] = useState<Record<string, FinancialEntry>>({});
  const [totalFinancials, setTotalFinancials] = useState({ turnover: 0, capex: 0, opex: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');
  const [objectiveFilter, setObjectiveFilter] = useState('');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // DB IDs for persist: assessmentId + map refActivityId → DB UUID
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [dbActivityIds, setDbActivityIds] = useState<Record<string, string>>({});

  // ── Load on mount ───────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        // Reference catalog (stays at /taxonomy)
        const [actRes, secRes] = await Promise.all([
          api.get('/taxonomy/activities').catch(() => ({ data: { activities: [] } })),
          api.get('/taxonomy/sectors').catch(() => ({ data: { sectors: [] } })),
        ]);
        const refActivities: RefActivity[] = actRes.data?.activities ?? [];
        setAllActivities(refActivities);
        setSectors(secRes.data?.sectors ?? []);

        // Get-or-create DB assessment for current year
        const assessRes = await api.post('/taxonomy-assess/', { year: CURRENT_YEAR });
        const assess = assessRes.data;
        setAssessmentId(assess.id);
        setTotalFinancials({
          turnover: assess.total_turnover_eur ?? 0,
          capex: assess.total_capex_eur ?? 0,
          opex: assess.total_opex_eur ?? 0,
        });

        // Load saved activities from DB
        const actsRes = await api.get(`/taxonomy-assess/${assess.id}/activities`);
        const dbActs: any[] = actsRes.data ?? [];
        if (dbActs.length === 0) return;

        const newSelected = new Set<string>();
        const newAssessments: Record<string, ActivityAssessment> = {};
        const newFinancials: Record<string, FinancialEntry> = {};
        const newDbMap: Record<string, string> = {};

        for (const dbAct of dbActs) {
          // Match the saved row back to a reference activity by its UNIQUE name
          // first: several activities share a NACE code (e.g. D35.11 is used by
          // solar, wind, hydraulic and geothermal production), so matching by
          // NACE alone collapses them onto the first match and corrupts the
          // reload. NACE stays as a fallback for rows whose label was renamed.
          const ref = refActivities.find(r => r.name === dbAct.label)
                   ?? refActivities.find(r => r.nace === dbAct.activity_code);
          const refId = ref?.id ?? dbAct.activity_code ?? dbAct.id;

          newSelected.add(refId);
          newDbMap[refId] = dbAct.id;

          // Rebuild frontend DNSH format from DB booleans
          const feObj = OBJ_BE_TO_FE[dbAct.objective] ?? 'mitigation';
          const dnsh: Record<string, { status: DNSHStatus; criterion: string }> = {};
          const DNSH_FE_FIELDS: Array<[string, string]> = [
            ['mitigation', 'dnsh_climate_mitigation'], ['adaptation', 'dnsh_climate_adaptation'],
            ['water', 'dnsh_water_marine'], ['circular', 'dnsh_circular_economy'],
            ['pollution', 'dnsh_pollution'], ['biodiversity', 'dnsh_biodiversity'],
          ];
          for (const [feObjId, dbField] of DNSH_FE_FIELDS) {
            if (feObjId !== feObj) {
              dnsh[feObjId] = { status: dbAct[dbField] ? 'pass' : 'fail', criterion: '' };
            }
          }

          newAssessments[refId] = {
            activityId: refId,
            eligible: dbAct.is_eligible ?? true,
            substantialContribution: dbAct.substantial_contribution ?? false,
            dnsh,
            mss: dbAct.minimum_safeguards ?? false,
            notes: dbAct.notes ?? '',
          };
          newFinancials[refId] = {
            activityId: refId,
            turnoverTotal: dbAct.turnover_eur ?? 0,
            capexTotal: dbAct.capex_eur ?? 0,
            opexTotal: dbAct.opex_eur ?? 0,
          };
        }

        setSelectedIds(newSelected);
        setAssessments(newAssessments);
        setFinancials(newFinancials);
        setDbActivityIds(newDbMap);
      } catch (err) {
        console.error('Taxonomy load error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Load DNSH details when switching to evaluation tab ──────────────────────
  useEffect(() => {
    if (tab !== 'evaluation') return;
    const missing = Array.from(selectedIds).filter((id) => {
      const act = allActivities.find((a) => a.id === id);
      return act && !act.dnsh_details;
    });
    if (missing.length === 0) return;
    Promise.all(
      missing.map((id) => api.get(`/taxonomy/activities/${id}/dnsh`).catch(() => null)),
    ).then((results) => {
      setAllActivities((prev) =>
        prev.map((act) => {
          const idx = missing.indexOf(act.id);
          if (idx === -1) return act;
          const res = results[idx];
          if (!res) return act;
          return { ...act, dnsh_details: res.data?.dnsh_criteria ?? {} };
        }),
      );
      setAssessments((prev) => {
        const next = { ...prev };
        missing.forEach((id, idx) => {
          const res = results[idx];
          if (!res) return;
          const dnshCriteria = res.data?.dnsh_criteria ?? {};
          const mainObj = res.data?.main_objective;
          if (!next[id]) {
            next[id] = {
              activityId: id, eligible: true, substantialContribution: false,
              dnsh: {}, mss: false, notes: '',
            };
          }
          const newDnsh: Record<string, { status: DNSHStatus; criterion: string }> = {};
          Object.entries(dnshCriteria).forEach(([objId, data]: [string, any]) => {
            if (objId !== mainObj) {
              newDnsh[objId] = {
                status: next[id].dnsh[objId]?.status ?? 'na',
                criterion: data.criterion,
              };
            }
          });
          next[id] = { ...next[id], dnsh: newDnsh };
        });
        return next;
      });
    });
  }, [tab, selectedIds, allActivities]);

  // ── Save to DB ──────────────────────────────────────────────────────────────
  const save = useCallback(async () => {
    if (!assessmentId) { toast.error(t('compliance.taxoAlign.toastNotLoaded', 'Assessment non chargé')); return; }
    setSaving(true);
    try {
      // 1. Update total financials on the assessment
      await api.patch(`/taxonomy-assess/${assessmentId}`, {
        total_turnover_eur: totalFinancials.turnover || null,
        total_capex_eur: totalFinancials.capex || null,
        total_opex_eur: totalFinancials.opex || null,
      });

      // 2. Upsert each selected activity
      const updatedDbMap = { ...dbActivityIds };
      for (const refId of Array.from(selectedIds)) {
        const refAct = allActivities.find(a => a.id === refId);
        const ass = assessments[refId];
        const fin = financials[refId];

        const dnshPayload: Record<string, boolean> = {};
        if (ass?.dnsh) {
          for (const [feObjId, dbField] of Object.entries(DNSH_OBJ_TO_FIELD)) {
            dnshPayload[dbField] = ass.dnsh[feObjId]?.status === 'pass';
          }
        }

        const payload = {
          activity_code: refAct?.nace ?? refId,
          label: refAct?.name ?? refId,
          objective: OBJ_FE_TO_BE[refAct?.objective ?? 'mitigation'] ?? 'climate_mitigation',
          is_eligible: ass?.eligible ?? true,
          substantial_contribution: ass?.substantialContribution ?? false,
          ...dnshPayload,
          minimum_safeguards: ass?.mss ?? false,
          notes: ass?.notes ?? null,
          turnover_eur: fin?.turnoverTotal || null,
          capex_eur: fin?.capexTotal || null,
          opex_eur: fin?.opexTotal || null,
        };

        if (updatedDbMap[refId]) {
          // Update existing
          await api.patch(`/taxonomy-assess/activities/${updatedDbMap[refId]}`, payload);
        } else {
          // Create new
          const res = await api.post(`/taxonomy-assess/${assessmentId}/activities`, payload);
          updatedDbMap[refId] = res.data.id;
        }
      }

      // 3. Delete DB activities no longer selected
      for (const [refId, dbId] of Object.entries(dbActivityIds)) {
        if (!selectedIds.has(refId)) {
          await api.delete(`/taxonomy-assess/activities/${dbId}`).catch(() => {});
          delete updatedDbMap[refId];
        }
      }

      setDbActivityIds(updatedDbMap);
      toast.success(t('compliance.taxoAlign.toastSaved', 'Plan taxonomique sauvegardé'));
    } catch {
      toast.error(t('compliance.taxoAlign.toastSaveError', 'Erreur lors de la sauvegarde'));
    } finally {
      setSaving(false);
    }
  }, [assessmentId, selectedIds, assessments, financials, totalFinancials, allActivities, dbActivityIds]);

  // ── KPI summary ─────────────────────────────────────────────────────────────
  const kpiSummary = useMemo(() => {
    const selectedArr = Array.from(selectedIds);
    let turnoverEligible = 0, turnoverAligned = 0;
    let capexEligible = 0, capexAligned = 0;
    let opexEligible = 0, opexAligned = 0;
    for (const id of selectedArr) {
      const fin = financials[id];
      const ass = assessments[id];
      if (!fin || !ass) continue;
      const status = getAlignmentStatus(ass);
      if (status === 'eligible_only' || status === 'aligned') {
        turnoverEligible += fin.turnoverTotal;
        capexEligible += fin.capexTotal;
        opexEligible += fin.opexTotal;
      }
      if (status === 'aligned') {
        turnoverAligned += fin.turnoverTotal;
        capexAligned += fin.capexTotal;
        opexAligned += fin.opexTotal;
      }
    }
    const safeDiv = (n: number, d: number) => d > 0 ? Math.round((n / d) * 1000) / 10 : 0;
    return {
      turnoverEligiblePct: safeDiv(turnoverEligible, totalFinancials.turnover),
      turnoverAlignedPct: safeDiv(turnoverAligned, totalFinancials.turnover),
      capexEligiblePct: safeDiv(capexEligible, totalFinancials.capex),
      capexAlignedPct: safeDiv(capexAligned, totalFinancials.capex),
      opexEligiblePct: safeDiv(opexEligible, totalFinancials.opex),
      opexAlignedPct: safeDiv(opexAligned, totalFinancials.opex),
    };
  }, [selectedIds, financials, assessments, totalFinancials]);

  // ── Filtered activities for Catalogue tab ───────────────────────────────────
  const filteredActivities = useMemo(() => {
    return allActivities.filter((act) => {
      const matchQ = !searchQ || act.name.toLowerCase().includes(searchQ.toLowerCase());
      const matchSector = !sectorFilter || act.sector === sectorFilter;
      const matchObj = !objectiveFilter || act.objective === objectiveFilter;
      return matchQ && matchSector && matchObj;
    });
  }, [allActivities, searchQ, sectorFilter, objectiveFilter]);

  // ── Toggle activity selection ────────────────────────────────────────────────
  const toggleActivity = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // ── Update assessment field ──────────────────────────────────────────────────
  const updateAssessment = (id: string, field: keyof ActivityAssessment, value: unknown) => {
    setAssessments((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? { activityId: id, eligible: true, substantialContribution: false, dnsh: {}, mss: false, notes: '' }),
        [field]: value,
      },
    }));
  };

  const updateDNSHStatus = (actId: string, objId: string, status: DNSHStatus) => {
    setAssessments((prev) => {
      const cur = prev[actId] ?? { activityId: actId, eligible: true, substantialContribution: false, dnsh: {}, mss: false, notes: '' };
      return {
        ...prev,
        [actId]: {
          ...cur,
          dnsh: {
            ...cur.dnsh,
            [objId]: { ...cur.dnsh[objId], status },
          },
        },
      };
    });
  };

  const updateFinancial = (id: string, field: keyof FinancialEntry, value: number) => {
    setFinancials((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? { activityId: id, turnoverTotal: 0, capexTotal: 0, opexTotal: 0 }),
        [field]: value,
      },
    }));
  };

  const toggleCardExpand = (id: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  // ── CSV Export ──────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = [
      t('compliance.taxoAlign.csvActivity', 'Activité'),
      'NACE',
      t('compliance.taxoAlign.csvObjective', 'Objectif'),
      t('compliance.taxoAlign.csvEligible', 'Éligible'),
      t('compliance.taxoAlign.csvAligned', 'Alignée'),
      t('compliance.taxoAlign.csvTurnoverM', 'CA M€'),
      t('compliance.taxoAlign.csvTurnoverPct', 'CA %'),
      t('compliance.taxoAlign.csvCapexM', 'Capex M€'),
      t('compliance.taxoAlign.csvCapexPct', 'Capex %'),
      t('compliance.taxoAlign.csvOpexM', 'Opex M€'),
      t('compliance.taxoAlign.csvOpexPct', 'Opex %'),
    ];
    const rows = Array.from(selectedIds).map((id) => {
      const act = allActivities.find((a) => a.id === id);
      const ass = assessments[id];
      const fin = financials[id] ?? { turnoverTotal: 0, capexTotal: 0, opexTotal: 0 };
      const status = ass ? getAlignmentStatus(ass) : 'not_aligned';
      return [
        act?.name ?? id,
        act?.nace ?? '',
        act?.objective
          ? t(OBJECTIVE_LABEL_KEYS[act.objective as ObjectiveId], OBJECTIVE_LABELS[act.objective as ObjectiveId])
          : '',
        status !== 'not_aligned' ? t('compliance.taxoAlign.yes', 'Oui') : t('compliance.taxoAlign.no', 'Non'),
        status === 'aligned' ? t('compliance.taxoAlign.yes', 'Oui') : t('compliance.taxoAlign.no', 'Non'),
        fin.turnoverTotal,
        totalFinancials.turnover > 0 ? ((fin.turnoverTotal / totalFinancials.turnover) * 100).toFixed(1) : '0',
        fin.capexTotal,
        totalFinancials.capex > 0 ? ((fin.capexTotal / totalFinancials.capex) * 100).toFixed(1) : '0',
        fin.opexTotal,
        totalFinancials.opex > 0 ? ((fin.opexTotal / totalFinancials.opex) * 100).toFixed(1) : '0',
      ];
    });
    const csv = [headers, ...rows].map((r) => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'taxonomie-ue-article8.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('compliance.taxoAlign.toastCsvExported', 'Export CSV téléchargé'));
  };

  // ── Selected activities sorted by sector ────────────────────────────────────
  const selectedActivities = useMemo(() => {
    return allActivities
      .filter((a) => selectedIds.has(a.id))
      .sort((a, b) => a.sector.localeCompare(b.sector));
  }, [allActivities, selectedIds]);

  // ── Financial totals ────────────────────────────────────────────────────────
  const financialTotals = useMemo(() => {
    return Array.from(selectedIds).reduce(
      (acc, id) => {
        const fin = financials[id];
        if (!fin) return acc;
        return {
          turnover: acc.turnover + fin.turnoverTotal,
          capex: acc.capex + fin.capexTotal,
          opex: acc.opex + fin.opexTotal,
        };
      },
      { turnover: 0, capex: 0, opex: 0 },
    );
  }, [selectedIds, financials]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <RefreshCw className="h-6 w-6 animate-spin mr-3" />
        {t('compliance.taxoAlign.loadingActivities', 'Chargement des activités de référence…')}
      </div>
    );
  }

  // ── Tab steps config ────────────────────────────────────────────────────────
  const TABS: { id: Tab; label: string; step: number }[] = [
    { id: 'catalogue', label: t('compliance.taxoAlign.tabCatalogue', 'Catalogue NACE'), step: 1 },
    { id: 'evaluation', label: t('compliance.taxoAlign.tabEvaluation', 'Évaluation DNSH'), step: 2 },
    { id: 'kpis', label: t('compliance.taxoAlign.tabKpis', 'KPIs Financiers'), step: 3 },
    { id: 'rapport', label: t('compliance.taxoAlign.tabReport', 'Rapport Article 8'), step: 4 },
  ];
  const currentStep = TABS.find((tabItem) => tabItem.id === tab)?.step ?? 1;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div
        style={{ background: 'linear-gradient(135deg,#052e16 0%,#166534 50%,#15803d 100%)' }}
        className="px-8 py-10 text-white"
      >
        <div className="flex items-start justify-between max-w-7xl mx-auto">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Leaf className="h-8 w-8 text-green-300" />
              <h1 className="text-3xl font-bold">{t('compliance.taxoAlign.heroTitle', "Taxonomie UE — Évaluation d'alignement")}</h1>
            </div>
            <p className="text-green-200 text-lg">
              {t('compliance.taxoAlign.heroSubtitle', 'Règlement (UE) 2020/852 · 6 objectifs environnementaux · {{count}} activités référencées', { count: allActivities.length })}
            </p>
            <div className="flex gap-3 mt-4 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20">
                {t('compliance.taxoAlign.heroBadgeArt8', 'Art. 8 — Obligations de déclaration')}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20">
                {t('compliance.taxoAlign.heroBadgeSelected', '{{count}} activités sélectionnées', { count: selectedIds.size })}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-400/30 text-green-200">
                {t('compliance.taxoAlign.heroBadgeKpi', 'KPI CA aligné : {{pct}}%', { pct: kpiSummary.turnoverAlignedPct })}
              </span>
            </div>
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-5 py-2.5 rounded-xl font-semibold transition-colors disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? t('compliance.taxoAlign.saving', 'Sauvegarde...') : t('compliance.taxoAlign.save', 'Sauvegarder')}
          </button>
        </div>
      </div>

      {/* ── Tab stepper ──────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-8">
          <nav className="flex">
            {TABS.map((tabItem, idx) => {
              const isActive = tabItem.id === tab;
              const isDone = tabItem.step < currentStep;
              return (
                <button
                  key={tabItem.id}
                  onClick={() => setTab(tabItem.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? 'border-green-600 text-green-700'
                      : isDone
                      ? 'border-transparent text-gray-500 hover:text-gray-700'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                      isActive
                        ? 'bg-green-600 text-white'
                        : isDone
                        ? 'bg-gray-400 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {isDone ? <CheckCircle size={14} /> : tabItem.step}
                  </span>
                  {tabItem.label}
                  {idx < TABS.length - 1 && (
                    <ChevronRight className="h-4 w-4 text-gray-300 ml-1" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* ══════════════════════════════════════════════════════════════════════
            TAB 1 — CATALOGUE NACE
        ══════════════════════════════════════════════════════════════════════ */}
        {tab === 'catalogue' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center bg-white p-4 rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 flex-1 min-w-48">
                <Search className="h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('compliance.taxoAlign.searchPh', 'Rechercher une activité…')}
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  className="w-full text-sm outline-none bg-transparent placeholder-gray-400"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  value={sectorFilter}
                  onChange={(e) => setSectorFilter(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white outline-none"
                >
                  <option value="">{t('compliance.taxoAlign.allSectors', 'Tous les secteurs')}</option>
                  {sectors.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <select
                  value={objectiveFilter}
                  onChange={(e) => setObjectiveFilter(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white outline-none"
                >
                  <option value="">{t('compliance.taxoAlign.allObjectives', 'Tous les objectifs')}</option>
                  {ALL_OBJECTIVES.map((obj) => (
                    <option key={obj} value={obj}>{t(OBJECTIVE_LABEL_KEYS[obj], OBJECTIVE_LABELS[obj])}</option>
                  ))}
                </select>
              </div>
              <span className="text-xs text-gray-400">{t('compliance.taxoAlign.resultCount', '{{count}} résultat(s)', { count: filteredActivities.length })}</span>
            </div>

            {/* Activity cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredActivities.map((act) => {
                const isSelected = selectedIds.has(act.id);
                const color = OBJECTIVE_COLORS[act.objective] ?? '#6b7280';
                return (
                  <div
                    key={act.id}
                    className={`bg-white rounded-xl border-2 p-4 transition-all hover:shadow-md ${
                      isSelected ? 'border-l-4 border-green-500 bg-green-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">
                        {act.nace}
                      </span>
                      <span
                        className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                        style={{ background: color }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
                        {t(OBJECTIVE_LABEL_KEYS[act.objective], OBJECTIVE_LABELS[act.objective])}
                      </span>
                    </div>
                    <p className="font-semibold text-sm mt-2 mb-1 text-gray-900">{act.name}</p>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
                        {sectors.find((s) => s.id === act.sector)?.name ?? act.sector}
                      </span>
                    </div>
                    <p
                      className="text-xs text-gray-500 mb-3 line-clamp-2"
                      title={act.threshold}
                    >
                      {act.threshold}
                    </p>
                    <button
                      onClick={() => toggleActivity(act.id)}
                      className={`w-full text-xs font-semibold py-1.5 rounded-lg transition-colors ${
                        isSelected
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {isSelected ? t('compliance.taxoAlign.cardSelected', '✓ Sélectionnée') : t('compliance.taxoAlign.cardAdd', '+ Ajouter')}
                    </button>
                  </div>
                );
              })}
            </div>

            {filteredActivities.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <Leaf className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>{t('compliance.taxoAlign.noMatchFilters', 'Aucune activité ne correspond aux filtres')}</p>
              </div>
            )}

            {/* Sticky bottom bar */}
            {selectedIds.size > 0 && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4 bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-2xl">
                <span className="text-sm font-medium">
                  {t('compliance.taxoAlign.selectedCount', '{{count}} activité(s) sélectionnée(s)', { count: selectedIds.size })}
                </span>
                <button
                  onClick={() => setTab('evaluation')}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-500 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
                >
                  {t('compliance.taxoAlign.goToEvaluation', "Passer à l'évaluation")}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 2 — ÉVALUATION DNSH
        ══════════════════════════════════════════════════════════════════════ */}
        {tab === 'evaluation' && (
          <div className="space-y-4">
            {selectedActivities.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">{t('compliance.taxoAlign.noneSelected', 'Aucune activité sélectionnée')}</p>
                <p className="text-sm mt-1">{t('compliance.taxoAlign.backToCatalogHint', 'Retournez au catalogue pour sélectionner des activités')}</p>
                <button
                  onClick={() => setTab('catalogue')}
                  className="mt-4 inline-flex items-center gap-2 text-green-700 font-semibold text-sm hover:underline"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t('compliance.taxoAlign.goToCatalog', 'Aller au catalogue')}
                </button>
              </div>
            ) : (
              selectedActivities.map((act) => {
                const ass = assessments[act.id] ?? {
                  activityId: act.id, eligible: true, substantialContribution: false,
                  dnsh: {}, mss: false, notes: '',
                };
                const status = getAlignmentStatus(ass);
                const isExpanded = expandedCards.has(act.id);
                const dnshEntries = Object.entries(ass.dnsh);

                return (
                  <div key={act.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {/* Card header */}
                    <div
                      className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => toggleCardExpand(act.id)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded shrink-0">
                          {act.nace}
                        </span>
                        <span className="font-semibold text-sm text-gray-900 truncate">
                          {act.name}
                        </span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full text-white shrink-0"
                          style={{ background: OBJECTIVE_COLORS[act.objective] ?? '#6b7280' }}
                        >
                          {t(OBJECTIVE_LABEL_KEYS[act.objective], OBJECTIVE_LABELS[act.objective])}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <AlignmentBadge status={status} />
                        {isExpanded ? (
                          <ChevronLeft className="h-4 w-4 text-gray-400 rotate-90" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-400 rotate-90" />
                        )}
                      </div>
                    </div>

                    {/* Card body */}
                    {isExpanded && (
                      <div className="px-5 pb-5 space-y-5 border-t border-gray-100">
                        {/* Contribution substantielle */}
                        <div className="bg-gray-50 rounded-lg p-4 mt-4">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                            {t('compliance.taxoAlign.substantialContribution', 'Contribution substantielle')}
                          </p>
                          <p className="text-sm text-gray-700 mb-3">{act.threshold}</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateAssessment(act.id, 'substantialContribution', true)}
                              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                                ass.substantialContribution
                                  ? 'bg-green-600 text-white'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {t('compliance.taxoAlign.criterionMet', '✓ Critère atteint')}
                            </button>
                            <button
                              onClick={() => updateAssessment(act.id, 'substantialContribution', false)}
                              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                                !ass.substantialContribution
                                  ? 'bg-red-500 text-white'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {t('compliance.taxoAlign.criterionNotMet', '✗ Critère non atteint')}
                            </button>
                          </div>
                        </div>

                        {/* DNSH criteria */}
                        {dnshEntries.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                              {t('compliance.taxoAlign.dnshCriteriaTitle', 'Critères DNSH — Do No Significant Harm')}
                            </p>
                            <div className="space-y-3">
                              {dnshEntries.map(([objId, dnshEntry]) => (
                                <div key={objId} className="border border-gray-200 rounded-lg p-3">
                                  <div className="flex items-start justify-between gap-4 mb-2">
                                    <div className="min-w-0">
                                      <p className="text-xs font-semibold text-gray-700">
                                        {OBJECTIVE_LABEL_KEYS[objId as ObjectiveId]
                                          ? t(OBJECTIVE_LABEL_KEYS[objId as ObjectiveId], OBJECTIVE_LABELS[objId as ObjectiveId])
                                          : objId}
                                      </p>
                                      <p className="text-xs text-gray-500 mt-0.5">{dnshEntry.criterion}</p>
                                    </div>
                                  </div>
                                  <div className="flex gap-1.5 flex-wrap">
                                    {(['pass', 'partial', 'fail', 'na'] as DNSHStatus[]).map((s) => (
                                      <button
                                        key={s}
                                        onClick={() => updateDNSHStatus(act.id, objId, s)}
                                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                                          dnshEntry.status === s
                                            ? DNSH_STATUS_CLASSES[s]
                                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                        }`}
                                      >
                                        {t(DNSH_STATUS_LABEL_KEYS[s], DNSH_STATUS_LABELS[s])}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {dnshEntries.length === 0 && (
                          <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
                            <Info className="h-4 w-4 shrink-0" />
                            {t('compliance.taxoAlign.dnshLoading', 'Chargement des critères DNSH en cours…')}
                          </div>
                        )}

                        {/* MSS */}
                        <div className="border border-gray-200 rounded-lg p-4">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            {t('compliance.taxoAlign.mssTitle', 'Garanties minimales sociales (MSS)')}
                          </p>
                          <label className="flex items-start gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={ass.mss}
                              onChange={(e) => updateAssessment(act.id, 'mss', e.target.checked)}
                              className="mt-0.5 accent-green-600"
                            />
                            <span className="text-sm text-gray-700">
                              {t('compliance.taxoAlign.mssDescription', "L'activité respecte les Principes directeurs de l'ONU (UNGP) et les conventions fondamentales de l'OIT")}
                            </span>
                          </label>
                        </div>

                        {/* Notes */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            {t('compliance.taxoAlign.notesLabel', 'Notes internes')}
                          </label>
                          <textarea
                            rows={2}
                            value={ass.notes}
                            onChange={(e) => updateAssessment(act.id, 'notes', e.target.value)}
                            placeholder={t('compliance.taxoAlign.notesPh', 'Observations, preuves documentaires, références…')}
                            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-green-400 resize-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {selectedActivities.length > 0 && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setTab('kpis')}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors"
                >
                  {t('compliance.taxoAlign.goToKpis', 'Passer aux KPIs financiers')}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 3 — KPIs FINANCIERS
        ══════════════════════════════════════════════════════════════════════ */}
        {tab === 'kpis' && (
          <div className="space-y-6">
            {/* Company totals */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm font-semibold text-gray-700 mb-4">
                {t('compliance.taxoAlign.companyTotals', "Totaux financiers de l'entreprise (M€)")}
              </p>
              <div className="grid grid-cols-3 gap-4">
                {(['turnover', 'capex', 'opex'] as const).map((field) => (
                  <div key={field}>
                    <label className="block text-xs font-medium text-gray-500 mb-1 capitalize">
                      {field === 'turnover' ? t('compliance.taxoAlign.turnover', "Chiffre d'affaires") : field.toUpperCase()} (M€)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={totalFinancials[field] || ''}
                      onChange={(e) =>
                        setTotalFinancials((prev) => ({
                          ...prev,
                          [field]: parseFloat(e.target.value) || 0,
                        }))
                      }
                      placeholder="0"
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-green-400"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Activities table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{t('compliance.taxoAlign.thActivity', 'Activité')}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">NACE</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">{t('compliance.taxoAlign.thTurnoverM', 'CA (M€)')}</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">{t('compliance.taxoAlign.thCapexM', 'Capex (M€)')}</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">{t('compliance.taxoAlign.thOpexM', 'Opex (M€)')}</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">{t('compliance.taxoAlign.thStatus', 'Statut')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedActivities.map((act) => {
                      const ass = assessments[act.id];
                      const fin = financials[act.id] ?? { activityId: act.id, turnoverTotal: 0, capexTotal: 0, opexTotal: 0 };
                      const status = ass ? getAlignmentStatus(ass) : 'not_aligned';
                      return (
                        <tr key={act.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-medium text-gray-900 max-w-xs truncate">{act.name}</td>
                          <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{act.nace}</td>
                          {(['turnoverTotal', 'capexTotal', 'opexTotal'] as const).map((field) => (
                            <td key={field} className="px-4 py-2.5">
                              <input
                                type="number"
                                min={0}
                                value={fin[field] || ''}
                                onChange={(e) => updateFinancial(act.id, field, parseFloat(e.target.value) || 0)}
                                placeholder="0"
                                className="w-24 text-right text-sm border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-green-400"
                              />
                            </td>
                          ))}
                          <td className="px-4 py-2.5 text-center">
                            <AlignmentBadge status={status} />
                          </td>
                        </tr>
                      );
                    })}
                    {/* Total row */}
                    <tr className="bg-gray-50 font-semibold border-t-2 border-gray-200">
                      <td className="px-4 py-3 text-gray-700" colSpan={2}>{t('compliance.taxoAlign.totalSelectedActivities', 'Total activités sélectionnées')}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{financialTotals.turnover.toFixed(1)}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{financialTotals.capex.toFixed(1)}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{financialTotals.opex.toFixed(1)}</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* KPI Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  label: t('compliance.taxoAlign.kpiTurnover', "Chiffre d'affaires"),
                  eligible: kpiSummary.turnoverEligiblePct,
                  aligned: kpiSummary.turnoverAlignedPct,
                },
                {
                  label: t('compliance.taxoAlign.kpiCapex', 'CapEx'),
                  eligible: kpiSummary.capexEligiblePct,
                  aligned: kpiSummary.capexAlignedPct,
                },
                {
                  label: t('compliance.taxoAlign.kpiOpex', 'OpEx'),
                  eligible: kpiSummary.opexEligiblePct,
                  aligned: kpiSummary.opexAlignedPct,
                },
              ].map(({ label, eligible, aligned }) => (
                <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
                  <p className="text-sm font-semibold text-gray-700 mb-4">{label}</p>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">{t('compliance.taxoAlign.eligible', 'Éligible')}</span>
                        <span className="font-semibold text-amber-700">{eligible}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-amber-400 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(eligible, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">{t('compliance.taxoAlign.aligned', 'Aligné')}</span>
                        <span className="font-semibold text-green-700">{aligned}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(aligned, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setTab('rapport')}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors"
              >
                {t('compliance.taxoAlign.goToReport', 'Voir le rapport Article 8')}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 4 — RAPPORT ARTICLE 8
        ══════════════════════════════════════════════════════════════════════ */}
        {tab === 'rapport' && (
          <div className="space-y-8">
            {/* Semi-circle gauges */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-800 mb-6">
                {t('compliance.taxoAlign.reportGaugeTitle', "Indicateurs clés d'alignement — Article 8 Règlement Taxonomie")}
              </h2>
              <div className="flex flex-wrap justify-around gap-6">
                <SemiGauge value={kpiSummary.turnoverAlignedPct} label={t('compliance.taxoAlign.gaugeCA', 'CA aligné')} />
                <SemiGauge value={kpiSummary.capexAlignedPct} label={t('compliance.taxoAlign.gaugeCapex', 'Capex aligné')} />
                <SemiGauge value={kpiSummary.opexAlignedPct} label={t('compliance.taxoAlign.gaugeOpex', 'Opex aligné')} />
              </div>
            </div>

            {/* Disclosure table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-800">
                  {t('compliance.taxoAlign.disclosureTableTitle', 'Tableau de divulgation — Format Article 8')}
                </h2>
                <button
                  onClick={exportCSV}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  <Download className="h-4 w-4" />
                  {t('compliance.taxoAlign.exportCsv', 'Exporter CSV')}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-3 text-left font-semibold text-gray-600 uppercase">{t('compliance.taxoAlign.rptThActivity', 'Activité')}</th>
                      <th className="px-3 py-3 text-left font-semibold text-gray-600 uppercase">NACE</th>
                      <th className="px-3 py-3 text-left font-semibold text-gray-600 uppercase">{t('compliance.taxoAlign.rptThObjective', 'Objectif')}</th>
                      <th className="px-3 py-3 text-center font-semibold text-gray-600 uppercase">{t('compliance.taxoAlign.rptThEligible', 'Éligible')}</th>
                      <th className="px-3 py-3 text-center font-semibold text-gray-600 uppercase">{t('compliance.taxoAlign.rptThAligned', 'Alignée')}</th>
                      <th className="px-3 py-3 text-right font-semibold text-gray-600 uppercase">{t('compliance.taxoAlign.rptThCaM', 'CA M€')}</th>
                      <th className="px-3 py-3 text-right font-semibold text-gray-600 uppercase">{t('compliance.taxoAlign.rptThCaPct', 'CA %')}</th>
                      <th className="px-3 py-3 text-right font-semibold text-gray-600 uppercase">{t('compliance.taxoAlign.rptThCapexM', 'Capex M€')}</th>
                      <th className="px-3 py-3 text-right font-semibold text-gray-600 uppercase">{t('compliance.taxoAlign.rptThCapexPct', 'Capex %')}</th>
                      <th className="px-3 py-3 text-right font-semibold text-gray-600 uppercase">{t('compliance.taxoAlign.rptThOpexM', 'Opex M€')}</th>
                      <th className="px-3 py-3 text-right font-semibold text-gray-600 uppercase">{t('compliance.taxoAlign.rptThOpexPct', 'Opex %')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedActivities.map((act) => {
                      const ass = assessments[act.id];
                      const fin = financials[act.id] ?? { turnoverTotal: 0, capexTotal: 0, opexTotal: 0 };
                      const status = ass ? getAlignmentStatus(ass) : 'not_aligned';
                      const isAligned = status === 'aligned';
                      const isEligible = status !== 'not_aligned';
                      const rowCls = isAligned
                        ? 'bg-green-50'
                        : isEligible
                        ? 'bg-amber-50'
                        : '';
                      const safeDiv = (n: number, d: number) =>
                        d > 0 ? ((n / d) * 100).toFixed(1) : '—';
                      return (
                        <tr key={act.id} className={`${rowCls} hover:brightness-95 transition-all`}>
                          <td className="px-3 py-2.5 font-medium text-gray-900 max-w-48 truncate">
                            {act.name}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-gray-500">{act.nace}</td>
                          <td className="px-3 py-2.5">
                            <span
                              className="px-2 py-0.5 rounded-full text-white text-xs font-semibold"
                              style={{ background: OBJECTIVE_COLORS[act.objective] ?? '#6b7280' }}
                            >
                              {t(OBJECTIVE_LABEL_KEYS[act.objective], OBJECTIVE_LABELS[act.objective])}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {isEligible ? (
                              <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-400 mx-auto" />
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {isAligned ? (
                              <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                            ) : (
                              <XCircle className="h-4 w-4 text-gray-300 mx-auto" />
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right text-gray-700">{fin.turnoverTotal.toFixed(1)}</td>
                          <td className="px-3 py-2.5 text-right text-gray-500">
                            {safeDiv(fin.turnoverTotal, totalFinancials.turnover)}%
                          </td>
                          <td className="px-3 py-2.5 text-right text-gray-700">{fin.capexTotal.toFixed(1)}</td>
                          <td className="px-3 py-2.5 text-right text-gray-500">
                            {safeDiv(fin.capexTotal, totalFinancials.capex)}%
                          </td>
                          <td className="px-3 py-2.5 text-right text-gray-700">{fin.opexTotal.toFixed(1)}</td>
                          <td className="px-3 py-2.5 text-right text-gray-500">
                            {safeDiv(fin.opexTotal, totalFinancials.opex)}%
                          </td>
                        </tr>
                      );
                    })}
                    {/* Total row */}
                    <tr className="bg-gray-100 font-semibold border-t-2 border-gray-300">
                      <td className="px-3 py-3 text-gray-800" colSpan={5}>{t('compliance.taxoAlign.total', 'Total')}</td>
                      <td className="px-3 py-3 text-right text-gray-900">
                        {financialTotals.turnover.toFixed(1)}
                      </td>
                      <td className="px-3 py-3 text-right text-gray-600">
                        {totalFinancials.turnover > 0
                          ? ((financialTotals.turnover / totalFinancials.turnover) * 100).toFixed(1)
                          : '—'}%
                      </td>
                      <td className="px-3 py-3 text-right text-gray-900">
                        {financialTotals.capex.toFixed(1)}
                      </td>
                      <td className="px-3 py-3 text-right text-gray-600">
                        {totalFinancials.capex > 0
                          ? ((financialTotals.capex / totalFinancials.capex) * 100).toFixed(1)
                          : '—'}%
                      </td>
                      <td className="px-3 py-3 text-right text-gray-900">
                        {financialTotals.opex.toFixed(1)}
                      </td>
                      <td className="px-3 py-3 text-right text-gray-600">
                        {totalFinancials.opex > 0
                          ? ((financialTotals.opex / totalFinancials.opex) * 100).toFixed(1)
                          : '—'}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {selectedActivities.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <p>{t('compliance.taxoAlign.reportNoActivities', 'Aucune activité sélectionnée — retournez au catalogue')}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
