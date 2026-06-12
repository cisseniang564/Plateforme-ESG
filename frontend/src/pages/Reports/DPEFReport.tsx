/**
 * DPEFReport — Déclaration de Performance Extra-Financière
 * Art. L. 225-102-1 Code de commerce
 *
 * 3 tabs: Social (blue) / Environnemental (green) / Sociétal (purple)
 * Quantitative fields pre-filled from GET /data-entry.
 * Narratives saved to localStorage key `dpef_narratives`.
 * "Exporter PDF" generates a structured PDF via jsPDF + jspdf-autotable.
 */
import { useState, useEffect, useCallback } from "react";
import { Printer } from "lucide-react";
import api from "@/services/api";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = "social" | "environnemental" | "societal";

interface DataEntry {
  id: string;
  metric_name: string;
  value_numeric?: number | null;
  value_text?: string | null;
  unit?: string;
  category?: string;
}

// Quantitative state keys
interface SocialQuant {
  effectifTotal: string;
  effectifCDI: string;
  femmes: string;
  embauches: string;
  departs: string;
  tauxAbsenteisme: string;
  accidentsTravail: string;
  maladiesPro: string;
  heuresSupp: string;
  heuresFormation: string;
  pctSalariesFormes: string;
  budgetFormation: string;
  ecartSalarialHF: string;
  bdesMisAJour: string;
  indexEgapro: string;
  travailleursHandicapes: string;
}

interface EnvQuant {
  certifISO14001: string;
  responsableEnvNomme: string;
  emissionsScope1: string;
  emissionsScope2: string;
  consoEnergie: string;
  partENR: string;
  consoEau: string;
  dechetsDangereux: string;
  dechetsNonDangereux: string;
  tauxRecyclage: string;
  sitesZonesSensibles: string;
  mesuresCompensation: string;
}

interface SocietalQuant {
  achatsLocaux: string;
  emploiLocal: string;
  prestatairesLocaux: string;
  pctFournisseursCode: string;
  auditsRealises: string;
  codeEthique: string;
  formationsAntiCorruption: string;
  incidentsCorruption: string;
  evaluationRealisee: string;
  incidentsIdentifies: string;
}

interface Narratives {
  // Social
  narSocialEmploi: string;
  narSocialConditions: string;
  narSocialFormation: string;
  narSocialEgalite: string;
  // Env
  narEnvPolitique: string;
  narEnvGES: string;
  narEnvEauDechets: string;
  narEnvBiodiversite: string;
  // Societal
  narSocTerrEmploi: string;
  narSocSousTraitance: string;
  narSocLoyaute: string;
  narSocDroitsHomme: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function contains(text: string, ...kws: string[]): boolean {
  const lower = text.toLowerCase();
  return kws.some((k) => lower.includes(k.toLowerCase()));
}

function toStr(v: number | null | undefined): string {
  return v != null ? String(v) : "";
}

function pick(entries: DataEntry[], ...kws: string[]): string {
  const found = entries.find((e) => contains(e.metric_name + " " + (e.category || ""), ...kws));
  return toStr(found?.value_numeric);
}

const STORAGE_KEY = "dpef_narratives";

const EMPTY_NARRATIVES: Narratives = {
  narSocialEmploi: "",
  narSocialConditions: "",
  narSocialFormation: "",
  narSocialEgalite: "",
  narEnvPolitique: "",
  narEnvGES: "",
  narEnvEauDechets: "",
  narEnvBiodiversite: "",
  narSocTerrEmploi: "",
  narSocSousTraitance: "",
  narSocLoyaute: "",
  narSocDroitsHomme: "",
};

function loadNarratives(): Narratives {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...EMPTY_NARRATIVES, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return { ...EMPTY_NARRATIVES };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface FieldRowProps {
  label: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
  type?: "number" | "text";
  focusRing: string;
}

function FieldRow({ label, unit, value, onChange, type = "number", focusRing }: FieldRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm text-slate-300 truncate">{label}</span>
        {unit && (
          <span className="text-xs text-slate-500 bg-slate-700 px-1.5 py-0.5 rounded flex-shrink-0">
            {unit}
          </span>
        )}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-40 flex-shrink-0 bg-slate-700 text-white text-sm rounded px-2 py-1.5 border border-slate-600 ${focusRing} focus:outline-none`}
        min={0}
      />
    </div>
  );
}

interface SelectRowProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  focusRing: string;
}

function SelectRow({ label, value, onChange, options, focusRing }: SelectRowProps) {
  const { t } = useTranslation();
  const labelFor = (o: string): string =>
    ({
      Oui: t('dpef.opt.yes', 'Oui'),
      Non: t('dpef.opt.no', 'Non'),
      'En cours': t('dpef.opt.inProgress', 'En cours'),
      'N/A': t('dpef.opt.na', 'N/A'),
    } as Record<string, string>)[o] ?? o;
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-sm text-slate-300 truncate">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-40 flex-shrink-0 bg-slate-700 text-white text-sm rounded px-2 py-1.5 border border-slate-600 ${focusRing} focus:outline-none`}
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {labelFor(o)}
          </option>
        ))}
      </select>
    </div>
  );
}

interface SectionCardProps {
  title: string;
  accent: string;
  narrativeKey: keyof Narratives;
  narratives: Narratives;
  setNarratives: React.Dispatch<React.SetStateAction<Narratives>>;
  children: React.ReactNode;
  focusRing: string;
}

function SectionCard({
  title,
  accent,
  narrativeKey,
  narratives,
  setNarratives,
  children,
  focusRing,
}: SectionCardProps) {
  const { t } = useTranslation();
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden print-section">
      <div className={`px-4 py-3 border-b border-slate-700`} style={{ borderLeftWidth: 4, borderLeftColor: accent }}>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <div className="p-4 space-y-1 grid grid-cols-1 md:grid-cols-2 gap-x-8">{children}</div>
      <div className="px-4 pb-4">
        <label className="block text-xs text-slate-400 mb-1 font-medium">
          {t('dpef.sectionCard.comments', 'Commentaires et politiques')}
        </label>
        <textarea
          value={narratives[narrativeKey]}
          onChange={(e) =>
            setNarratives((prev) => ({ ...prev, [narrativeKey]: e.target.value }))
          }
          rows={4}
          placeholder={t('dpef.sectionCard.placeholder', 'Décrivez la politique, les actions mises en place et les objectifs...')}
          className={`w-full bg-slate-700 text-white text-sm rounded px-3 py-2 border border-slate-600 ${focusRing} focus:outline-none resize-y`}
        />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DPEFReport() {
  const { t, i18n } = useTranslation();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));
  const [activeTab, setActiveTab] = useState<TabId>("social");
  const [loading, setLoading] = useState(true);

  // Quantitative state
  const [social, setSocial] = useState<SocialQuant>({
    effectifTotal: "",
    effectifCDI: "",
    femmes: "",
    embauches: "",
    departs: "",
    tauxAbsenteisme: "",
    accidentsTravail: "",
    maladiesPro: "",
    heuresSupp: "",
    heuresFormation: "",
    pctSalariesFormes: "",
    budgetFormation: "",
    ecartSalarialHF: "",
    bdesMisAJour: "",
    indexEgapro: "",
    travailleursHandicapes: "",
  });

  const [env, setEnv] = useState<EnvQuant>({
    certifISO14001: "",
    responsableEnvNomme: "",
    emissionsScope1: "",
    emissionsScope2: "",
    consoEnergie: "",
    partENR: "",
    consoEau: "",
    dechetsDangereux: "",
    dechetsNonDangereux: "",
    tauxRecyclage: "",
    sitesZonesSensibles: "",
    mesuresCompensation: "",
  });

  const [societal, setSocietal] = useState<SocietalQuant>({
    achatsLocaux: "",
    emploiLocal: "",
    prestatairesLocaux: "",
    pctFournisseursCode: "",
    auditsRealises: "",
    codeEthique: "",
    formationsAntiCorruption: "",
    incidentsCorruption: "",
    evaluationRealisee: "",
    incidentsIdentifies: "",
  });

  const [narratives, setNarratives] = useState<Narratives>(loadNarratives);

  // ─── Fetch data entries ──────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      [
        "effectif", "femmes", "accident", "formation",
        "scope_1", "scope_2", "S1-1", "S1-2", "S1-5", "S1-7",
        "E1-6", "E1-7", "E3-1a", "E5-2a", "E5-2b",
      ].forEach((c) => params.append("category", c));

      const res = await api.get<DataEntry[]>("/data-entry/", { params });
      const entries: DataEntry[] = Array.isArray(res.data) ? res.data : [];

      setSocial((prev) => ({
        ...prev,
        effectifTotal: pick(entries, "effectif", "S1-1") || prev.effectifTotal,
        femmes: pick(entries, "femmes", "S1-2") || prev.femmes,
        accidentsTravail: pick(entries, "accident", "S1-7") || prev.accidentsTravail,
        heuresFormation: pick(entries, "formation", "S1-5") || prev.heuresFormation,
      }));

      setEnv((prev) => ({
        ...prev,
        emissionsScope1: pick(entries, "scope_1", "E1-6") || prev.emissionsScope1,
        emissionsScope2: pick(entries, "scope_2", "E1-7") || prev.emissionsScope2,
        consoEau: pick(entries, "E3-1a") || prev.consoEau,
        dechetsDangereux: pick(entries, "E5-2a") || prev.dechetsDangereux,
        dechetsNonDangereux: pick(entries, "E5-2b") || prev.dechetsNonDangereux,
      }));
    } catch {
      // Silently ignore — user can fill manually
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Save narratives ─────────────────────────────────────────────────────────

  function handleSave() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(narratives));
      toast.success(t('dpef.toast.saved', "Narratifs sauvegardés localement"));
    } catch {
      toast.error(t('dpef.toast.saveError', "Erreur lors de la sauvegarde"));
    }
  }

  // ─── Export PDF — try backend ReportLab first, fallback to jsPDF ────────────

  async function handlePrint() {
    // Attempt professional backend-generated PDF via ReportLab
    try {
      const res = await api.post(
        '/reports/generate',
        { report_type: 'dpef', year, format: 'pdf' },
        { responseType: 'blob', timeout: 30000 },
      );
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DPEF-${year}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t('dpef.toast.exportedPro', 'DPEF exportée (PDF professionnel)'));
      return;
    } catch (err) {
      console.warn('Backend DPEF PDF unavailable, falling back to client-side generation', err);
    }

    // Fallback: client-side jsPDF (lighter but less polished)
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = 210;
    const dateStr = new Date().toLocaleDateString(i18n.language.startsWith('en') ? 'en-US' : 'fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

    // ── Header ──
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageW, 28, 'F');
    doc.setFillColor(22, 163, 74);
    doc.rect(0, 28, pageW, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text(t('dpef.pdf.title', 'Déclaration de Performance Extra-Financière (DPEF)'), 12, 12);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(t('dpef.pdf.subtitle', 'Exercice {{year}}  ·  Art. L.225-102-1 Code de commerce  ·  Généré le {{date}}', { year, date: dateStr }), 12, 20);
    doc.text('ESGFlow', pageW - 12, 20, { align: 'right' });

    let y = 38;

    const addSection = (title: string, color: [number,number,number], rows: [string, string][]) => {
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...color);
      doc.text(title, 12, y);
      y += 4;
      autoTable(doc, {
        startY: y,
        margin: { left: 12, right: 12 },
        head: [[t('dpef.pdf.colIndicator', 'Indicateur'), t('dpef.pdf.colValue', 'Valeur saisie')]],
        body: rows.map(([label, val]) => [label, val || '—']),
        headStyles: { fillColor: color, textColor: [255,255,255], fontSize: 9, fontStyle: 'bold' },
        bodyStyles: { fontSize: 9 },
        columnStyles: { 0: { cellWidth: 110 }, 1: { cellWidth: 60, halign: 'center' } },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        theme: 'grid',
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    };

    // Social
    addSection(t('dpef.pdf.social.title', 'I. Informations Sociales'), [59, 130, 246], [
      [t('dpef.pdf.social.effectifTotal', "Effectif total (ETP)"), social.effectifTotal],
      [t('dpef.pdf.social.cdi', "dont CDI"), social.effectifCDI],
      [t('dpef.pdf.social.femmes', "Part femmes (%)"), social.femmes],
      [t('dpef.pdf.social.embauches', "Embauches (nb)"), social.embauches],
      [t('dpef.pdf.social.departs', "Départs (nb)"), social.departs],
      [t('dpef.pdf.social.absenteisme', "Taux d'absentéisme (%)"), social.tauxAbsenteisme],
      [t('dpef.pdf.social.accidents', "Accidents du travail (nb)"), social.accidentsTravail],
      [t('dpef.pdf.social.maladies', "Maladies professionnelles (nb)"), social.maladiesPro],
      [t('dpef.pdf.social.formation', "Heures de formation (total)"), social.heuresFormation],
      [t('dpef.pdf.social.pctFormes', "% salariés formés"), social.pctSalariesFormes],
      [t('dpef.pdf.social.budget', "Budget formation (k€)"), social.budgetFormation],
      [t('dpef.pdf.social.ecart', "Écart salarial H/F (%)"), social.ecartSalarialHF],
      [t('dpef.pdf.social.egapro', "Index Egapro (/100)"), social.indexEgapro],
      [t('dpef.pdf.social.handicapes', "Travailleurs handicapés (nb)"), social.travailleursHandicapes],
    ]);

    // Environnemental
    addSection(t('dpef.pdf.env.title', 'II. Informations Environnementales'), [34, 197, 94], [
      [t('dpef.pdf.env.iso', "Certif. ISO 14001"), env.certifISO14001],
      [t('dpef.pdf.env.scope1', "Émissions Scope 1 (tCO₂e)"), env.emissionsScope1],
      [t('dpef.pdf.env.scope2', "Émissions Scope 2 (tCO₂e)"), env.emissionsScope2],
      [t('dpef.pdf.env.energie', "Consommation énergie (MWh)"), env.consoEau],
      [t('dpef.pdf.env.enr', "Part ENR (%)"), env.partENR],
      [t('dpef.pdf.env.eau', "Consommation eau (m³)"), env.consoEau],
      [t('dpef.pdf.env.dechetsD', "Déchets dangereux (t)"), env.dechetsDangereux],
      [t('dpef.pdf.env.dechetsND', "Déchets non dangereux (t)"), env.dechetsNonDangereux],
      [t('dpef.pdf.env.recyclage', "Taux recyclage (%)"), env.tauxRecyclage],
    ]);

    // Sociétal
    addSection(t('dpef.pdf.soc.title', 'III. Informations Sociétales'), [167, 139, 250], [
      [t('dpef.pdf.soc.achats', "Achats locaux (%)"), societal.achatsLocaux],
      [t('dpef.pdf.soc.emploi', "Emploi local (%)"), societal.emploiLocal],
      [t('dpef.pdf.soc.fournisseurs', "% fournisseurs avec code conduite"), societal.pctFournisseursCode],
      [t('dpef.pdf.soc.audits', "Audits fournisseurs réalisés (nb)"), societal.auditsRealises],
      [t('dpef.pdf.soc.ethique', "Code éthique en place"), societal.codeEthique],
      [t('dpef.pdf.soc.antiCorruption', "Formations anti-corruption (nb)"), societal.formationsAntiCorruption],
      [t('dpef.pdf.soc.incidents', "Incidents corruption confirmés (nb)"), societal.incidentsCorruption],
    ]);

    // Narratifs
    const narratifRows: [string, string][] = Object.entries(narratives)
      .filter(([, v]) => v.trim())
      .map(([k, v]) => [k.replace(/_/g, ' '), v.slice(0, 200) + (v.length > 200 ? '…' : '')]);
    if (narratifRows.length > 0) {
      addSection(t('dpef.pdf.narratives', 'IV. Éléments narratifs'), [100, 116, 139], narratifRows);
    }

    // Footer
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${i} / ${totalPages}  ·  DPEF ${year}  ·  ESGFlow`, pageW / 2, 292, { align: 'center' });
    }

    doc.save(`DPEF_${year}.pdf`);
    toast.success(t('dpef.toast.generated', 'PDF DPEF généré et téléchargé'));
  }

  // ─── Theme helpers ───────────────────────────────────────────────────────────

  const TAB_CONFIG: Record<TabId, { label: string; accent: string; activeBg: string; activeText: string; focusRing: string }> = {
    social: {
      label: "Social",
      accent: "#3b82f6",
      activeBg: "bg-blue-600",
      activeText: "text-white",
      focusRing: "focus:ring-2 focus:ring-blue-500",
    },
    environnemental: {
      label: t('dpef.tab.environmental', 'Environnemental'),
      accent: "#22c55e",
      activeBg: "bg-green-600",
      activeText: "text-white",
      focusRing: "focus:ring-2 focus:ring-green-500",
    },
    societal: {
      label: "Societal",
      accent: "#a855f7",
      activeBg: "bg-purple-600",
      activeText: "text-white",
      focusRing: "focus:ring-2 focus:ring-purple-500",
    },
  };

  const { accent, focusRing } = TAB_CONFIG[activeTab];

  const tabLabelSocietal = t('dpef.tab.societal', 'Sociétal');

  // ─── Year options ─────────────────────────────────────────────────────────────

  const yearOptions = Array.from({ length: 6 }, (_, i) => String(currentYear - i));

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-section { page-break-inside: avoid; }
          body { background: white !important; color: black !important; }
          .bg-slate-900, .bg-slate-800, .bg-slate-700 {
            background: white !important;
            color: black !important;
          }
          .text-white, .text-slate-300, .text-slate-400 { color: black !important; }
          .border-slate-700, .border-slate-600 { border-color: #ccc !important; }
          .all-tabs-content > * { display: block !important; }
          .tab-panel { display: block !important; }
        }
      `}</style>

      <div className="min-h-screen bg-slate-900 text-white p-4 md:p-6 space-y-6">

        {/* ── Header ──────────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {t('dpef.header.title', 'DPEF — Déclaration de Performance Extra-Financière')}
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">{t('dpef.header.legal', 'Art. L. 225-102-1 Code de commerce')}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap no-print">
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="bg-slate-700 text-white text-sm rounded px-3 py-2 border border-slate-600 focus:ring-2 focus:ring-slate-400 focus:outline-none"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium px-4 py-2 rounded-lg border border-slate-600 transition-colors"
            >
              {t('dpef.btn.save', 'Sauvegarder')}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Printer className="w-4 h-4" />
              {t('dpef.btn.export', 'Exporter PDF')}
            </button>
          </div>
        </div>

        {/* ── Info banner ─────────────────────────────────────────────────────── */}
        <div className="bg-blue-950 border border-blue-800 rounded-lg px-4 py-3 text-sm text-blue-200">
          {t('dpef.banner', 'Obligatoire pour les sociétés > 500 salariés et CA > 100 M€ ou total bilan > 100 M€')}
        </div>

        {loading && (
          <p className="text-slate-400 text-sm">{t('dpef.loading', 'Chargement des données…')}</p>
        )}

        {/* ── Tabs nav ────────────────────────────────────────────────────────── */}
        <div className="flex gap-2 no-print">
          {(["social", "environnemental", "societal"] as TabId[]).map((tab) => {
            const cfg = TAB_CONFIG[tab];
            const isActive = activeTab === tab;
            const displayLabel = tab === "societal" ? tabLabelSocietal : cfg.label;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? `${cfg.activeBg} ${cfg.activeText}`
                    : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
                }`}
              >
                {displayLabel}
              </button>
            );
          })}
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            TAB: SOCIAL
        ════════════════════════════════════════════════════════════════════ */}
        <div className={`tab-panel space-y-4 ${activeTab === "social" ? "" : "hidden"}`}>

          {/* S1 — Emploi */}
          <SectionCard
            title={t('dpef.sec.s1', '1. Emploi')}
            accent={TAB_CONFIG.social.accent}
            narrativeKey="narSocialEmploi"
            narratives={narratives}
            setNarratives={setNarratives}
            focusRing={TAB_CONFIG.social.focusRing}
          >
            <FieldRow
              label={t('dpef.f.effectifTotal', 'Effectif total')}
              unit="nb"
              value={social.effectifTotal}
              onChange={(v) => setSocial((p) => ({ ...p, effectifTotal: v }))}
              focusRing={TAB_CONFIG.social.focusRing}
            />
            <FieldRow
              label={t('dpef.f.effectifCDI', 'Effectif CDI')}
              unit="nb"
              value={social.effectifCDI}
              onChange={(v) => setSocial((p) => ({ ...p, effectifCDI: v }))}
              focusRing={TAB_CONFIG.social.focusRing}
            />
            <FieldRow
              label={t('dpef.f.femmes', 'Femmes')}
              unit="%"
              value={social.femmes}
              onChange={(v) => setSocial((p) => ({ ...p, femmes: v }))}
              focusRing={TAB_CONFIG.social.focusRing}
            />
            <FieldRow
              label={t('dpef.f.embauches', 'Embauches')}
              unit="nb"
              value={social.embauches}
              onChange={(v) => setSocial((p) => ({ ...p, embauches: v }))}
              focusRing={TAB_CONFIG.social.focusRing}
            />
            <FieldRow
              label={t('dpef.f.departs', 'Departs')}
              unit="nb"
              value={social.departs}
              onChange={(v) => setSocial((p) => ({ ...p, departs: v }))}
              focusRing={TAB_CONFIG.social.focusRing}
            />
          </SectionCard>

          {/* S2 — Conditions de travail */}
          <SectionCard
            title={t('dpef.sec.s2', '2. Conditions de travail')}
            accent={TAB_CONFIG.social.accent}
            narrativeKey="narSocialConditions"
            narratives={narratives}
            setNarratives={setNarratives}
            focusRing={TAB_CONFIG.social.focusRing}
          >
            <FieldRow
              label={t('dpef.f.absenteisme', "Taux d'absenteisme")}
              unit="%"
              value={social.tauxAbsenteisme}
              onChange={(v) => setSocial((p) => ({ ...p, tauxAbsenteisme: v }))}
              focusRing={TAB_CONFIG.social.focusRing}
            />
            <FieldRow
              label={t('dpef.f.accidents', 'Accidents du travail')}
              unit="nb"
              value={social.accidentsTravail}
              onChange={(v) => setSocial((p) => ({ ...p, accidentsTravail: v }))}
              focusRing={TAB_CONFIG.social.focusRing}
            />
            <FieldRow
              label={t('dpef.f.maladies', 'Maladies professionnelles')}
              unit="nb"
              value={social.maladiesPro}
              onChange={(v) => setSocial((p) => ({ ...p, maladiesPro: v }))}
              focusRing={TAB_CONFIG.social.focusRing}
            />
            <FieldRow
              label={t('dpef.f.heuresSupp', 'Heures supplementaires')}
              unit="h"
              value={social.heuresSupp}
              onChange={(v) => setSocial((p) => ({ ...p, heuresSupp: v }))}
              focusRing={TAB_CONFIG.social.focusRing}
            />
          </SectionCard>

          {/* S3 — Formation */}
          <SectionCard
            title={t('dpef.sec.s3', '3. Formation')}
            accent={TAB_CONFIG.social.accent}
            narrativeKey="narSocialFormation"
            narratives={narratives}
            setNarratives={setNarratives}
            focusRing={TAB_CONFIG.social.focusRing}
          >
            <FieldRow
              label={t('dpef.f.heuresFormation', 'Heures de formation')}
              unit="h"
              value={social.heuresFormation}
              onChange={(v) => setSocial((p) => ({ ...p, heuresFormation: v }))}
              focusRing={TAB_CONFIG.social.focusRing}
            />
            <FieldRow
              label={t('dpef.f.pctFormes', '% salaries formes')}
              unit="%"
              value={social.pctSalariesFormes}
              onChange={(v) => setSocial((p) => ({ ...p, pctSalariesFormes: v }))}
              focusRing={TAB_CONFIG.social.focusRing}
            />
            <FieldRow
              label={t('dpef.f.budgetFormation', 'Budget formation')}
              unit="k€"
              value={social.budgetFormation}
              onChange={(v) => setSocial((p) => ({ ...p, budgetFormation: v }))}
              focusRing={TAB_CONFIG.social.focusRing}
            />
          </SectionCard>

          {/* S4 — Egalite & Diversite */}
          <SectionCard
            title={t('dpef.sec.s4', '4. Egalite et Diversite')}
            accent={TAB_CONFIG.social.accent}
            narrativeKey="narSocialEgalite"
            narratives={narratives}
            setNarratives={setNarratives}
            focusRing={TAB_CONFIG.social.focusRing}
          >
            <FieldRow
              label={t('dpef.f.ecartSalarial', 'Ecart salarial H/F')}
              unit="%"
              value={social.ecartSalarialHF}
              onChange={(v) => setSocial((p) => ({ ...p, ecartSalarialHF: v }))}
              focusRing={TAB_CONFIG.social.focusRing}
            />
            <div className="flex items-center justify-between gap-3 py-1">
              <span className="text-sm text-slate-300 truncate">{t('dpef.f.bdes', 'BDES mise a jour')}</span>
              <select
                value={social.bdesMisAJour}
                onChange={(e) => setSocial((p) => ({ ...p, bdesMisAJour: e.target.value }))}
                className={`w-40 flex-shrink-0 bg-slate-700 text-white text-sm rounded px-2 py-1.5 border border-slate-600 ${TAB_CONFIG.social.focusRing} focus:outline-none`}
              >
                <option value="">—</option>
                <option value="Oui">{t('dpef.opt.yes', 'Oui')}</option>
                <option value="Non">{t('dpef.opt.no', 'Non')}</option>
              </select>
            </div>
            <FieldRow
              label={t('dpef.f.egapro', 'Index Egapro')}
              unit="pts"
              value={social.indexEgapro}
              onChange={(v) => setSocial((p) => ({ ...p, indexEgapro: v }))}
              focusRing={TAB_CONFIG.social.focusRing}
            />
            <FieldRow
              label={t('dpef.f.handicapes', 'Travailleurs handicapes')}
              unit="%"
              value={social.travailleursHandicapes}
              onChange={(v) => setSocial((p) => ({ ...p, travailleursHandicapes: v }))}
              focusRing={TAB_CONFIG.social.focusRing}
            />
          </SectionCard>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            TAB: ENVIRONNEMENTAL
        ════════════════════════════════════════════════════════════════════ */}
        <div className={`tab-panel space-y-4 ${activeTab === "environnemental" ? "" : "hidden"}`}>

          {/* E0 — Politique environnementale */}
          <SectionCard
            title={t('dpef.sec.e1', '1. Politique environnementale')}
            accent={TAB_CONFIG.environnemental.accent}
            narrativeKey="narEnvPolitique"
            narratives={narratives}
            setNarratives={setNarratives}
            focusRing={TAB_CONFIG.environnemental.focusRing}
          >
            <SelectRow
              label={t('dpef.f.iso14001', 'Certification ISO 14001')}
              value={env.certifISO14001}
              onChange={(v) => setEnv((p) => ({ ...p, certifISO14001: v }))}
              options={["Oui", "Non", "En cours"]}
              focusRing={TAB_CONFIG.environnemental.focusRing}
            />
            <SelectRow
              label={t('dpef.f.respEnv', 'Responsable env. nomme')}
              value={env.responsableEnvNomme}
              onChange={(v) => setEnv((p) => ({ ...p, responsableEnvNomme: v }))}
              options={["Oui", "Non"]}
              focusRing={TAB_CONFIG.environnemental.focusRing}
            />
          </SectionCard>

          {/* E1 — GES & Energie */}
          <SectionCard
            title={t('dpef.sec.e2', '2. GES et Energie')}
            accent={TAB_CONFIG.environnemental.accent}
            narrativeKey="narEnvGES"
            narratives={narratives}
            setNarratives={setNarratives}
            focusRing={TAB_CONFIG.environnemental.focusRing}
          >
            <FieldRow
              label={t('dpef.f.scope1', 'Emissions scope 1')}
              unit="tCO2e"
              value={env.emissionsScope1}
              onChange={(v) => setEnv((p) => ({ ...p, emissionsScope1: v }))}
              focusRing={TAB_CONFIG.environnemental.focusRing}
            />
            <FieldRow
              label={t('dpef.f.scope2', 'Emissions scope 2')}
              unit="tCO2e"
              value={env.emissionsScope2}
              onChange={(v) => setEnv((p) => ({ ...p, emissionsScope2: v }))}
              focusRing={TAB_CONFIG.environnemental.focusRing}
            />
            <FieldRow
              label={t('dpef.f.consoEnergie', 'Conso. energie totale')}
              unit="MWh"
              value={env.consoEnergie}
              onChange={(v) => setEnv((p) => ({ ...p, consoEnergie: v }))}
              focusRing={TAB_CONFIG.environnemental.focusRing}
            />
            <FieldRow
              label={t('dpef.f.partENR', 'Part ENR')}
              unit="%"
              value={env.partENR}
              onChange={(v) => setEnv((p) => ({ ...p, partENR: v }))}
              focusRing={TAB_CONFIG.environnemental.focusRing}
            />
          </SectionCard>

          {/* E3/E5 — Eau & Dechets */}
          <SectionCard
            title={t('dpef.sec.e3', '3. Eau et Dechets')}
            accent={TAB_CONFIG.environnemental.accent}
            narrativeKey="narEnvEauDechets"
            narratives={narratives}
            setNarratives={setNarratives}
            focusRing={TAB_CONFIG.environnemental.focusRing}
          >
            <FieldRow
              label={t('dpef.f.consoEau', 'Conso. eau')}
              unit="m3"
              value={env.consoEau}
              onChange={(v) => setEnv((p) => ({ ...p, consoEau: v }))}
              focusRing={TAB_CONFIG.environnemental.focusRing}
            />
            <FieldRow
              label={t('dpef.f.dechetsD', 'Dechets dangereux')}
              unit="t"
              value={env.dechetsDangereux}
              onChange={(v) => setEnv((p) => ({ ...p, dechetsDangereux: v }))}
              focusRing={TAB_CONFIG.environnemental.focusRing}
            />
            <FieldRow
              label={t('dpef.f.dechetsND', 'Dechets non dangereux')}
              unit="t"
              value={env.dechetsNonDangereux}
              onChange={(v) => setEnv((p) => ({ ...p, dechetsNonDangereux: v }))}
              focusRing={TAB_CONFIG.environnemental.focusRing}
            />
            <FieldRow
              label={t('dpef.f.recyclage', 'Taux recyclage')}
              unit="%"
              value={env.tauxRecyclage}
              onChange={(v) => setEnv((p) => ({ ...p, tauxRecyclage: v }))}
              focusRing={TAB_CONFIG.environnemental.focusRing}
            />
          </SectionCard>

          {/* E4 — Biodiversite */}
          <SectionCard
            title={t('dpef.sec.e4', '4. Biodiversite')}
            accent={TAB_CONFIG.environnemental.accent}
            narrativeKey="narEnvBiodiversite"
            narratives={narratives}
            setNarratives={setNarratives}
            focusRing={TAB_CONFIG.environnemental.focusRing}
          >
            <FieldRow
              label={t('dpef.f.sites', 'Sites en zones sensibles')}
              unit="nb"
              value={env.sitesZonesSensibles}
              onChange={(v) => setEnv((p) => ({ ...p, sitesZonesSensibles: v }))}
              focusRing={TAB_CONFIG.environnemental.focusRing}
            />
            <SelectRow
              label={t('dpef.f.compensation', 'Mesures de compensation')}
              value={env.mesuresCompensation}
              onChange={(v) => setEnv((p) => ({ ...p, mesuresCompensation: v }))}
              options={["Oui", "Non", "N/A"]}
              focusRing={TAB_CONFIG.environnemental.focusRing}
            />
          </SectionCard>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            TAB: SOCIETAL
        ════════════════════════════════════════════════════════════════════ */}
        <div className={`tab-panel space-y-4 ${activeTab === "societal" ? "" : "hidden"}`}>

          {/* G1 — Territoire & Emploi local */}
          <SectionCard
            title={t('dpef.sec.g1', '1. Territoire et Emploi local')}
            accent={TAB_CONFIG.societal.accent}
            narrativeKey="narSocTerrEmploi"
            narratives={narratives}
            setNarratives={setNarratives}
            focusRing={TAB_CONFIG.societal.focusRing}
          >
            <FieldRow
              label={t('dpef.f.achatsLocaux', 'Achats locaux')}
              unit="%"
              value={societal.achatsLocaux}
              onChange={(v) => setSocietal((p) => ({ ...p, achatsLocaux: v }))}
              focusRing={TAB_CONFIG.societal.focusRing}
            />
            <FieldRow
              label={t('dpef.f.emploiLocal', 'Emploi local')}
              unit="%"
              value={societal.emploiLocal}
              onChange={(v) => setSocietal((p) => ({ ...p, emploiLocal: v }))}
              focusRing={TAB_CONFIG.societal.focusRing}
            />
            <FieldRow
              label={t('dpef.f.prestataires', 'Prestataires locaux')}
              unit="nb"
              value={societal.prestatairesLocaux}
              onChange={(v) => setSocietal((p) => ({ ...p, prestatairesLocaux: v }))}
              focusRing={TAB_CONFIG.societal.focusRing}
            />
          </SectionCard>

          {/* G2 — Sous-traitance */}
          <SectionCard
            title={t('dpef.sec.g2', '2. Sous-traitance')}
            accent={TAB_CONFIG.societal.accent}
            narrativeKey="narSocSousTraitance"
            narratives={narratives}
            setNarratives={setNarratives}
            focusRing={TAB_CONFIG.societal.focusRing}
          >
            <FieldRow
              label={t('dpef.f.fournisseursCode', 'Fournisseurs avec code de conduite')}
              unit="%"
              value={societal.pctFournisseursCode}
              onChange={(v) => setSocietal((p) => ({ ...p, pctFournisseursCode: v }))}
              focusRing={TAB_CONFIG.societal.focusRing}
            />
            <FieldRow
              label={t('dpef.f.auditsRealises', 'Audits realises')}
              unit="nb"
              value={societal.auditsRealises}
              onChange={(v) => setSocietal((p) => ({ ...p, auditsRealises: v }))}
              focusRing={TAB_CONFIG.societal.focusRing}
            />
          </SectionCard>

          {/* G3 — Loyaute des pratiques */}
          <SectionCard
            title={t('dpef.sec.g3', '3. Loyaute des pratiques')}
            accent={TAB_CONFIG.societal.accent}
            narrativeKey="narSocLoyaute"
            narratives={narratives}
            setNarratives={setNarratives}
            focusRing={TAB_CONFIG.societal.focusRing}
          >
            <SelectRow
              label={t('dpef.f.codeEthique', 'Code ethique')}
              value={societal.codeEthique}
              onChange={(v) => setSocietal((p) => ({ ...p, codeEthique: v }))}
              options={["Oui", "Non", "En cours"]}
              focusRing={TAB_CONFIG.societal.focusRing}
            />
            <FieldRow
              label={t('dpef.f.formationsAnti', 'Formations anti-corruption')}
              unit="%"
              value={societal.formationsAntiCorruption}
              onChange={(v) => setSocietal((p) => ({ ...p, formationsAntiCorruption: v }))}
              focusRing={TAB_CONFIG.societal.focusRing}
            />
            <FieldRow
              label={t('dpef.f.incidents', 'Incidents')}
              unit="nb"
              value={societal.incidentsCorruption}
              onChange={(v) => setSocietal((p) => ({ ...p, incidentsCorruption: v }))}
              focusRing={TAB_CONFIG.societal.focusRing}
            />
          </SectionCard>

          {/* G4 — Droits de l'homme */}
          <SectionCard
            title={t('dpef.sec.g4', "4. Droits de l'homme")}
            accent={TAB_CONFIG.societal.accent}
            narrativeKey="narSocDroitsHomme"
            narratives={narratives}
            setNarratives={setNarratives}
            focusRing={TAB_CONFIG.societal.focusRing}
          >
            <SelectRow
              label={t('dpef.f.evaluationRealisee', 'Evaluation realisee')}
              value={societal.evaluationRealisee}
              onChange={(v) => setSocietal((p) => ({ ...p, evaluationRealisee: v }))}
              options={["Oui", "Non", "En cours"]}
              focusRing={TAB_CONFIG.societal.focusRing}
            />
            <FieldRow
              label={t('dpef.f.incidentsIdentifies', 'Incidents identifies')}
              unit="nb"
              value={societal.incidentsIdentifies}
              onChange={(v) => setSocietal((p) => ({ ...p, incidentsIdentifies: v }))}
              focusRing={TAB_CONFIG.societal.focusRing}
            />
          </SectionCard>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────────── */}
        <p className="text-xs text-slate-500 text-center pb-4">
          ESGFlow &bull; DPEF {year} &bull; {t('dpef.footer.savedLocally', 'Données sauvegardées localement')}
        </p>
      </div>
    </>
  );
}
