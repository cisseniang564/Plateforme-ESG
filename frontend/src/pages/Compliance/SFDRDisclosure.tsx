import { useState, useEffect, useCallback, useRef } from 'react';
import { Printer, Save, FileText, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '@/services/api';
import toast from 'react-hot-toast';

// ── Types ─────────────────────────────────────────────────────────────────────

type ArticleKey = 'article6' | 'article8' | 'article9';
type TabKey = 'classification' | 'pai';

interface FundClassification {
  key: ArticleKey;
  label: string;
  badge: string;
  description: string;
  details: string;
  color: string;
  borderColor: string;
  badgeColor: string;
}

interface PaiIndicator {
  id: number;
  name: string;
  unit: string;
  description: string;
  metricKey: string;
}

interface ExistingEntry {
  id: string;
  metric_name: string;
  value_numeric: number | null;
  value_text: string | null;
}

// ── Fund classifications ───────────────────────────────────────────────────────

const FUND_CLASSIFICATIONS: FundClassification[] = [
  {
    key: 'article6',
    label: 'Fonds standard',
    badge: 'Article 6',
    description:
      'Pas de caracteristiques ESG promues ni d\'objectif d\'investissement durable. Divulgation des risques de durabilite dans la politique d\'investissement.',
    details:
      'Le fonds integre les risques de durabilite dans ses decisions d\'investissement conformement a l\'article 6 du SFDR. Aucune caracteristique environnementale ou sociale n\'est promue.',
    color: 'text-slate-300',
    borderColor: 'border-slate-500',
    badgeColor: 'bg-slate-700 text-slate-300',
  },
  {
    key: 'article8',
    label: 'Fonds ESG',
    badge: 'Article 8',
    description:
      'Promeut des caracteristiques environnementales ou sociales. Peut inclure des entreprises avec de bonnes pratiques de gouvernance.',
    details:
      'Le fonds promeut des caracteristiques environnementales et/ou sociales au sens de l\'article 8 du SFDR. Les entreprises en portefeuille respectent des pratiques de gouvernance satisfaisantes.',
    color: 'text-emerald-300',
    borderColor: 'border-emerald-500',
    badgeColor: 'bg-emerald-900/60 text-emerald-300',
  },
  {
    key: 'article9',
    label: 'Fonds a impact',
    badge: 'Article 9',
    description:
      'Objectif d\'investissement durable. Alignement partiel ou total avec la taxonomie UE.',
    details:
      'Le fonds a pour objectif l\'investissement durable au sens de l\'article 9 du SFDR. Les investissements sont partiellement ou totalement alignes avec la taxonomie europeenne.',
    color: 'text-green-300',
    borderColor: 'border-green-400',
    badgeColor: 'bg-green-900/60 text-green-300',
  },
];

// ── PAI indicators — aligned with RTS Annex I + backend catalog ───────────────

const PAI_INDICATORS: PaiIndicator[] = [
  { id: 1,  metricKey: 'pai_1_ges_scope123',              unit: 'tCO2e',       name: 'Emissions de GES (Scope 1, 2, 3)',                          description: 'Intensite carbone des entreprises en portefeuille' },
  { id: 2,  metricKey: 'pai_2_carbon_footprint',          unit: 'tCO2e/M€',    name: 'Empreinte carbone',                                         description: 'Empreinte carbone totale du portefeuille' },
  { id: 3,  metricKey: 'pai_3_ges_intensity',             unit: 'tCO2e/M€ CA', name: 'Intensite GES des societes investies',                      description: 'GES par unite de CA des investissements' },
  { id: 4,  metricKey: 'pai_4_fossil_exposure',           unit: '%',           name: 'Exposition au secteur des combustibles fossiles',            description: 'Part du portefeuille exposee aux fossiles' },
  { id: 5,  metricKey: 'pai_5_non_renewable',             unit: '%',           name: 'Part d\'energie non renouvelable',                          description: 'Consommation et production d\'energie non renouvelable' },
  { id: 6,  metricKey: 'pai_6_energy_intensity',          unit: 'GWh/M€',      name: 'Intensite energetique (secteurs a fort impact)',             description: 'Consommation energie rapportee au CA' },
  { id: 7,  metricKey: 'pai_7_biodiversity',              unit: '%',           name: 'Activites ayant un impact negatif sur la biodiversite',      description: 'Part des activites impactant des zones protegees' },
  { id: 8,  metricKey: 'pai_8_water_emissions',           unit: 't/M€',        name: 'Emissions dans l\'eau',                                     description: 'Volume de polluants rejetes dans les eaux' },
  { id: 9,  metricKey: 'pai_9_hazardous_waste',           unit: 't/M€',        name: 'Ratio de dechets dangereux',                                description: 'Dechets dangereux generes par unite de CA' },
  { id: 10, metricKey: 'pai_10_un_global_compact',        unit: '%',           name: 'Violations du Pacte mondial des Nations Unies',             description: 'Entreprises du portefeuille en violation des principes UNGC' },
  { id: 11, metricKey: 'pai_11_compliance_mechanism',     unit: '%',           name: 'Absence de mecanismes de conformite au Pacte mondial',      description: 'Part du portefeuille sans processus de conformite UNGC' },
  { id: 12, metricKey: 'pai_12_gender_pay_gap',           unit: '%',           name: 'Ecart de remuneration non corrige entre les sexes',         description: 'Ecart de salaire entre hommes et femmes' },
  { id: 13, metricKey: 'pai_13_board_diversity',          unit: '%',           name: 'Diversite de genre au conseil d\'administration',           description: 'Part de femmes dans les organes de gouvernance' },
  { id: 14, metricKey: 'pai_14_controversial_weapons',    unit: '%',           name: 'Exposition aux armes controversees',                        description: 'Part exposee aux armes antipersonnel, sous-munitions, etc.' },
  { id: 15, metricKey: 'pai_15_ghg_sovereign',            unit: 'tCO2e/M€ PIB', name: 'Intensite de GES des Etats souverains',                  description: 'Intensite carbone des etats en portefeuille' },
  { id: 16, metricKey: 'pai_16_social_violations_sovereign', unit: '%',        name: 'Etats investis enfreignant des dispositions sociales',      description: 'Part des etats du portefeuille violant des normes sociales' },
  { id: 17, metricKey: 'pai_17_accidents',                unit: '/M heures',   name: 'Taux d\'accidents du travail',                              description: 'Frequence des accidents du travail dans les investissements' },
  { id: 18, metricKey: 'pai_18_human_rights_policy',      unit: '%',           name: 'Absence de politique des droits humains',                   description: 'Part du portefeuille sans politique droits de l\'Homme' },
];

// Mapping: api metric_name patterns → PAI indicator metricKey
const API_METRIC_MAP: Array<{ pattern: RegExp; metricKey: string }> = [
  { pattern: /scope1|scope2/i, metricKey: 'pai_1_ges_scope123' },
  { pattern: /G1-6a/i,        metricKey: 'pai_13_board_diversity' },
];

// ── Policy statement placeholders ─────────────────────────────────────────────

const POLICY_PLACEHOLDERS: Record<ArticleKey, string> = {
  article6:
    'Ce fonds integre les risques de durabilite dans son processus de decision d\'investissement conformement a l\'article 6 du Reglement (UE) 2019/2088. Les risques de durabilite sont pris en compte dans l\'analyse financiere des investissements. Le fonds ne promeut pas de caracteristiques environnementales ou sociales specifiques et n\'a pas pour objectif l\'investissement durable. Les principales incidences negatives sur les facteurs de durabilite ne sont pas considerees.',
  article8:
    'Ce fonds promeut des caracteristiques environnementales et sociales au sens de l\'article 8 du Reglement (UE) 2019/2088. Le gestionnaire applique une strategie ESG integrant des criteres environnementaux, sociaux et de gouvernance dans la selection des titres. Les entreprises en portefeuille respectent des pratiques de bonne gouvernance, notamment en matiere de remuneration, de fiscalite, d\'integrite et de diversite au sein des organes de direction. Le fonds s\'engage a publier des informations periodiques sur la realisation des caracteristiques ESG promues.',
  article9:
    'Ce fonds a pour objectif l\'investissement durable au sens de l\'article 9 du Reglement (UE) 2019/2088. L\'ensemble des investissements realises vise a contribuer a un objectif environnemental ou social, tel que defini a l\'article 2(17) du SFDR. Le fonds s\'assure que les investissements respectent le principe consistant a ne pas causer de prejudice important (DNSH) et que les entreprises cibles appliquent des pratiques de bonne gouvernance. Une proportion minimale des investissements est alignee sur la taxonomie europeenne (Reglement (UE) 2020/852).',
};

// ── Fund selector ─────────────────────────────────────────────────────────────

const FUNDS = [
  { value: 'fonds-a', label: 'Fonds A — Infrastructure verte' },
  { value: 'fonds-b', label: 'Fonds B — Transition energetique' },
  { value: 'fonds-c', label: 'Fonds C — Impact social' },
];

// ── Main component ─────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();

export default function SFDRDisclosure() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>('classification');
  const [selectedFund, setSelectedFund] = useState<string>(FUNDS[0].value);
  const [selectedArticle, setSelectedArticle] = useState<ArticleKey>('article8');
  const [policyText, setPolicyText] = useState<string>(POLICY_PLACEHOLDERS.article8);
  const [policyEdited, setPolicyEdited] = useState(false);
  const [paiValues, setPaiValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // debounce ref for report metadata patch
  const savePolicyRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load / create report from API on fund change ──────────────────────────

  const loadReport = useCallback(async (fundId: string) => {
    setLoading(true);
    try {
      // Get-or-create report for this fund + current year
      const fundName = FUNDS.find(f => f.value === fundId)?.label ?? fundId;
      const res = await api.post('/sfdr/reports', {
        year: CURRENT_YEAR,
        fund_id: fundId,
        fund_name: fundName,
        article: 'article8',
      });
      const report = res.data;
      setReportId(report.id);
      setSelectedArticle((report.article as ArticleKey) ?? 'article8');
      setPolicyText(report.policy_text ?? POLICY_PLACEHOLDERS[report.article as ArticleKey] ?? POLICY_PLACEHOLDERS.article8);
      setPolicyEdited(report.policy_edited ?? false);

      // Load PAI values
      const paiRes = await api.get(`/sfdr/reports/${report.id}/pai`);
      const paiList: Array<{ metric_key: string; value: number | null }> = paiRes.data ?? [];
      const map: Record<string, string> = {};
      for (const p of paiList) {
        if (p.value != null) map[p.metric_key] = String(p.value);
      }

      // Pre-fill from data-entry (non-blocking)
      try {
        const deRes = await api.get('/data-entry', { params: { limit: 200 } });
        const entries: ExistingEntry[] = deRes.data?.items ?? deRes.data ?? [];
        for (const entry of entries) {
          const numeric = entry.value_numeric != null ? String(entry.value_numeric) : '';
          if (!numeric) continue;
          for (const mapping of API_METRIC_MAP) {
            if (mapping.pattern.test(entry.metric_name) && !map[mapping.metricKey]) {
              map[mapping.metricKey] = numeric;
            }
          }
        }
      } catch { /* non-blocking */ }

      setPaiValues(map);
    } catch {
      toast.error(t('compliance.sfdr.toastLoadError', 'Erreur chargement rapport SFDR'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadReport(selectedFund);
  }, [selectedFund, loadReport]);

  // ── Article selection — patch report on API ───────────────────────────────

  const handleArticleSelect = (key: ArticleKey) => {
    setSelectedArticle(key);
    if (!policyEdited) {
      setPolicyText(POLICY_PLACEHOLDERS[key]);
    }
    if (reportId) {
      api.patch(`/sfdr/reports/${reportId}`, {
        article: key,
        ...(policyEdited ? {} : { policy_text: POLICY_PLACEHOLDERS[key], policy_edited: false }),
      }).catch(() => {});
    }
  };

  const handlePolicyChange = (val: string) => {
    setPolicyText(val);
    setPolicyEdited(true);
    // Debounced patch
    if (savePolicyRef.current) clearTimeout(savePolicyRef.current);
    savePolicyRef.current = setTimeout(() => {
      if (reportId) {
        api.patch(`/sfdr/reports/${reportId}`, { policy_text: val, policy_edited: true }).catch(() => {});
      }
    }, 1500);
  };

  const resetPolicy = () => {
    const defaultText = POLICY_PLACEHOLDERS[selectedArticle];
    setPolicyText(defaultText);
    setPolicyEdited(false);
    if (reportId) {
      api.patch(`/sfdr/reports/${reportId}`, { policy_text: defaultText, policy_edited: false }).catch(() => {});
    }
  };

  // ── PAI value change ──────────────────────────────────────────────────────

  const handlePaiChange = (metricKey: string, val: string) => {
    setPaiValues((prev) => ({ ...prev, [metricKey]: val }));
  };

  // ── Save PAI to DB ────────────────────────────────────────────────────────

  const handleSavePai = async () => {
    if (!reportId) {
      toast.error(t('compliance.sfdr.toastNotLoaded', 'Rapport non chargé, veuillez patienter.'));
      return;
    }
    setSaving(true);
    try {
      const entries = PAI_INDICATORS
        .filter(ind => paiValues[ind.metricKey] !== undefined && paiValues[ind.metricKey] !== '')
        .map(ind => ({
          metric_key: ind.metricKey,
          value: parseFloat(paiValues[ind.metricKey]),
          unit: ind.unit,
        }));
      await api.put(`/sfdr/reports/${reportId}/pai`, { entries });
      toast.success(t('compliance.sfdr.toastPaiSaved', 'Indicateurs PAI sauvegardés avec succès.'));
    } catch {
      toast.error(t('compliance.sfdr.toastPaiSaveError', 'Erreur lors de la sauvegarde des PAI.'));
    } finally {
      setSaving(false);
    }
  };

  // ── Export PDF (jsPDF structuré, fond blanc) ─────────────────────────────

  const handlePrint = async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = 210;
    const dateStr = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    const article = FUND_CLASSIFICATIONS.find(c => c.key === selectedArticle)!;

    // Header
    doc.setFillColor(4, 120, 87);
    doc.rect(0, 0, pageW, 28, 'F');
    doc.setFillColor(16, 185, 129);
    doc.rect(0, 28, pageW, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(255, 255, 255);
    doc.text('SFDR — Sustainable Finance Disclosure Regulation', 12, 12);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(t('compliance.sfdr.pdfSubtitle', 'Règlement UE 2019/2088  ·  Fonds : {{fund}}  ·  {{date}}', { fund: selectedFund, date: dateStr }), 12, 22);

    let y = 38;
    const EMERALD: [number,number,number] = [4, 120, 87];
    const SLATE: [number,number,number] = [51, 65, 85];

    // Classification
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...EMERALD);
    doc.text(t('compliance.sfdr.pdfClassificationTitle', 'I. Classification du fonds'), 12, y);
    y += 6;
    autoTable(doc, {
      startY: y,
      margin: { left: 12, right: 12 },
      body: [
        [t('compliance.sfdr.pdfRowClassification', 'Classification'), t(`compliance.sfdr.fundLabel.${article.key}`, article.label)],
        [t('compliance.sfdr.pdfRowArticle', 'Article SFDR'), article.key.replace('article', 'Article ')],
        [t('compliance.sfdr.pdfRowPolicy', 'Politique ESG'), policyEdited ? policyText.slice(0, 300) + '…' : t('compliance.sfdr.pdfDefaultPolicy', '(Politique par défaut)')],
      ],
      headStyles: { fillColor: EMERALD },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50, fillColor: [240, 253, 244] } },
      theme: 'grid',
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    // PAI Indicators
    if (y > 230) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...EMERALD);
    doc.text(t('compliance.sfdr.pdfPaiTitle', 'II. Indicateurs PAI obligatoires ({{filled}} / {{total}} renseignés)', { filled: filledPaiCount, total: PAI_INDICATORS.length }), 12, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      margin: { left: 12, right: 12 },
      head: [[t('compliance.sfdr.pdfColIndicator', 'Indicateur'), t('compliance.sfdr.pdfColUnit', 'Unité'), t('compliance.sfdr.pdfColValue', 'Valeur saisie')]],
      body: PAI_INDICATORS.map(ind => [
        t(`compliance.sfdr.paiName.${ind.metricKey}`, ind.name),
        ind.unit,
        paiValues[ind.metricKey] || '—',
      ]),
      headStyles: { fillColor: SLATE, textColor: [255,255,255], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 0: { cellWidth: 105 }, 1: { cellWidth: 30, halign: 'center' }, 2: { cellWidth: 43, halign: 'center', fontStyle: 'bold' } },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      theme: 'grid',
      didParseCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 2 && data.cell.raw !== '—') {
          data.cell.styles.textColor = [4, 120, 87];
        }
      },
    });

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${i} / ${totalPages}  ·  SFDR Disclosure  ·  ESGFlow`, pageW / 2, 292, { align: 'center' });
    }

    doc.save(`SFDR_Disclosure_${selectedFund.replace(/\s+/g, '_')}_${new Date().getFullYear()}.pdf`);
    toast.success(t('compliance.sfdr.toastPdfGenerated', 'PDF SFDR généré et téléchargé'));
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const filledPaiCount = PAI_INDICATORS.filter(
    (ind) => paiValues[ind.metricKey] !== undefined && paiValues[ind.metricKey] !== ''
  ).length;

  const classification =
    FUND_CLASSIFICATIONS.find((c) => c.key === selectedArticle) ?? FUND_CLASSIFICATIONS[1];

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-show-all .tab-panel { display: block !important; }
          body { background: white !important; color: black !important; }
          .print-card { break-inside: avoid; }
        }
      `}</style>

      <div className="min-h-screen bg-slate-900 text-slate-100 print:bg-white print:text-black">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="border-b border-white/[0.06] bg-slate-900/80 backdrop-blur-sm sticky top-0 z-20 no-print">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex-shrink-0 h-10 w-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
                <FileText className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-[17px] font-semibold text-slate-100 leading-tight">
                  SFDR &mdash; Sustainable Finance Disclosure Regulation
                </h1>
                <p className="text-[12px] text-slate-400 mt-0.5 leading-tight">
                  {t('compliance.sfdr.headerSubtitle', "Règlement UE 2019/2088 — Informations relatives à la durabilité")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Fund selector */}
              <select
                value={selectedFund}
                onChange={(e) => { setSelectedFund(e.target.value); setPaiValues({}); }}
                disabled={loading}
                className="rounded-lg bg-white/[0.05] border border-white/[0.08] text-[13px] text-slate-200 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/40 transition-colors disabled:opacity-50"
              >
                {FUNDS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {t(`compliance.sfdr.fund.${f.value}`, f.label)}
                  </option>
                ))}
              </select>

              {/* Loading indicator */}
              {loading && (
                <span className="flex items-center gap-1.5 text-[12px] text-slate-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {t('compliance.sfdr.loading', 'Chargement…')}
                </span>
              )}

              {/* Export PDF */}
              <button
                onClick={handlePrint}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.06] border border-white/[0.1] text-[13px] text-slate-300 hover:bg-white/[0.1] hover:text-slate-100 transition-colors disabled:opacity-50"
              >
                <Printer className="h-4 w-4" />
                {t('compliance.sfdr.exportPdf', 'Exporter PDF')}
              </button>
            </div>
          </div>
        </div>

        {/* Print header (only visible in print) */}
        <div className="hidden print:block px-6 pt-6 pb-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">
            SFDR &mdash; Sustainable Finance Disclosure Regulation
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('compliance.sfdr.headerSubtitle', "Règlement UE 2019/2088 — Informations relatives à la durabilité")}
          </p>
          <p className="text-sm text-gray-700 mt-1 font-medium">
            {t(`compliance.sfdr.fund.${selectedFund}`, FUNDS.find((f) => f.value === selectedFund)?.label ?? selectedFund)}
          </p>
        </div>

        {/* ── Tab navigation ─────────────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-6 pt-6 print-show-all">
          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1 w-fit no-print">
            {(
              [
                { key: 'classification', label: t('compliance.sfdr.tabClassification', 'Classification du fonds') },
                { key: 'pai', label: t('compliance.sfdr.tabPai', "PAI — Indicateurs d'impact négatif") },
              ] as { key: TabKey; label: string }[]
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${
                  activeTab === key
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── Tab 1: Classification du fonds ──────────────────────────── */}
          <div
            className={`tab-panel pb-10 ${activeTab === 'classification' ? 'block' : 'hidden print:block'}`}
          >
            {/* Print tab title */}
            <h2 className="hidden print:block text-lg font-bold text-gray-900 mb-4">
              {t('compliance.sfdr.tabClassification', 'Classification du fonds')}
            </h2>

            {/* Article cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {FUND_CLASSIFICATIONS.map((fc) => {
                const isSelected = selectedArticle === fc.key;
                return (
                  <button
                    key={fc.key}
                    onClick={() => handleArticleSelect(fc.key)}
                    className={`text-left rounded-xl border-2 p-5 transition-all focus:outline-none print-card ${
                      isSelected
                        ? `${fc.borderColor} bg-white/[0.04] shadow-lg`
                        : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.15]'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span
                        className={`inline-block text-[11px] font-bold tracking-wide px-2.5 py-1 rounded-full ${fc.badgeColor}`}
                      >
                        {fc.badge}
                      </span>
                      {isSelected && (
                        <span className="flex-shrink-0 h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center">
                          <svg
                            className="h-3 w-3 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </span>
                      )}
                    </div>

                    <p className={`text-[15px] font-semibold mb-2 ${fc.color}`}>{t(`compliance.sfdr.fundLabel.${fc.key}`, fc.label)}</p>
                    <p className="text-[12px] text-slate-400 leading-relaxed">{t(`compliance.sfdr.fundDescription.${fc.key}`, fc.description)}</p>
                  </button>
                );
              })}
            </div>

            {/* Classification details */}
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 mb-6 print-card">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`inline-block text-[11px] font-bold tracking-wide px-2.5 py-1 rounded-full ${classification.badgeColor}`}
                >
                  {classification.badge}
                </span>
                <span className={`text-[14px] font-semibold ${classification.color}`}>
                  {t(`compliance.sfdr.fundLabel.${classification.key}`, classification.label)}
                </span>
              </div>
              <p className="text-[13px] text-slate-400 leading-relaxed">{t(`compliance.sfdr.fundDetails.${classification.key}`, classification.details)}</p>
            </div>

            {/* Policy textarea */}
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 print-card">
              <div className="flex items-center justify-between mb-3">
                <label className="text-[13px] font-semibold text-slate-200">
                  {t('compliance.sfdr.policyLabel', "Déclaration de politique d'investissement durable")}
                </label>
                {policyEdited && (
                  <button
                    onClick={resetPolicy}
                    className="no-print text-[11px] text-slate-500 hover:text-slate-300 transition-colors underline underline-offset-2"
                  >
                    {t('compliance.sfdr.resetPolicy', 'Réinitialiser le texte par défaut')}
                  </button>
                )}
              </div>
              <textarea
                value={policyText}
                onChange={(e) => handlePolicyChange(e.target.value)}
                rows={8}
                className="w-full rounded-lg bg-white/[0.04] border border-white/[0.08] text-[13px] text-slate-300 leading-relaxed px-4 py-3 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/40 transition-colors resize-y placeholder-slate-600 print:border-gray-300 print:bg-white print:text-black"
              />
              <p className="mt-2 text-[11px] text-slate-600">
                {t('compliance.sfdr.policyHelp', 'Ce texte est pré-rempli en fonction de la classification sélectionnée. Vous pouvez le modifier librement.')}
              </p>
            </div>
          </div>

          {/* ── Tab 2: PAI Indicators ────────────────────────────────────── */}
          <div
            className={`tab-panel pb-10 ${activeTab === 'pai' ? 'block' : 'hidden print:block'}`}
          >
            {/* Print tab title */}
            <h2 className="hidden print:block text-lg font-bold text-gray-900 mb-4 pt-6">
              {t('compliance.sfdr.tabPai', "PAI — Indicateurs d'impact négatif")}
            </h2>

            {/* Header row */}
            <div className="flex items-center justify-between mb-5 no-print">
              <div>
                <p className="text-[14px] font-semibold text-slate-200">
                  {t('compliance.sfdr.paiMandatory', '18 indicateurs obligatoires')}
                </p>
                <p className="text-[12px] text-slate-500 mt-0.5">
                  {t('compliance.sfdr.paiFilledCount', '{{filled}} / {{total}} renseignés', { filled: filledPaiCount, total: PAI_INDICATORS.length })}
                </p>
              </div>

              {/* Progress bar */}
              <div className="flex items-center gap-3">
                <div className="w-36 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${(filledPaiCount / PAI_INDICATORS.length) * 100}%` }}
                  />
                </div>
                <button
                  onClick={handleSavePai}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-[13px] font-medium text-white transition-colors shadow-lg shadow-emerald-900/30"
                >
                  <Save className="h-4 w-4" />
                  {saving ? t('compliance.sfdr.saving', 'Sauvegarde...') : t('compliance.sfdr.save', 'Sauvegarder')}
                </button>
              </div>
            </div>

            {/* PAI grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {PAI_INDICATORS.map((ind) => {
                const val = paiValues[ind.metricKey] ?? '';
                const isFilled = val !== '';
                return (
                  <div
                    key={ind.id}
                    className={`rounded-xl border p-4 transition-all print-card ${
                      isFilled
                        ? 'border-emerald-500/40 bg-emerald-900/10'
                        : 'border-white/[0.08] bg-white/[0.02]'
                    }`}
                  >
                    {/* Indicator header */}
                    <div className="flex items-start gap-3 mb-3">
                      <span
                        className={`flex-shrink-0 h-7 w-7 rounded-lg flex items-center justify-center text-[11px] font-bold ${
                          isFilled
                            ? 'bg-emerald-600/30 text-emerald-300'
                            : 'bg-white/[0.06] text-slate-500'
                        }`}
                      >
                        {ind.id}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-slate-200 leading-snug">
                          {t(`compliance.sfdr.paiName.${ind.metricKey}`, ind.name)}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                          {t(`compliance.sfdr.paiDescription.${ind.metricKey}`, ind.description)}
                        </p>
                      </div>
                    </div>

                    {/* Unit badge + input */}
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={val}
                        onChange={(e) => handlePaiChange(ind.metricKey, e.target.value)}
                        placeholder="—"
                        className="flex-1 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[13px] text-slate-200 px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/40 transition-colors placeholder-slate-600 print:border-gray-300 print:bg-white print:text-black"
                      />
                      <span className="flex-shrink-0 text-[10px] font-mono text-slate-500 bg-white/[0.04] border border-white/[0.06] px-2 py-1 rounded-lg whitespace-nowrap">
                        {ind.unit}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Save button bottom (mobile) */}
            <div className="mt-6 flex justify-end no-print">
              <button
                onClick={handleSavePai}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-[13px] font-semibold text-white transition-colors shadow-lg shadow-emerald-900/30"
              >
                <Save className="h-4 w-4" />
                {saving ? t('compliance.sfdr.saving', 'Sauvegarde...') : t('compliance.sfdr.savePai', 'Sauvegarder les indicateurs PAI')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
