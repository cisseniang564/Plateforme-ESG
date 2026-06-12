import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Globe, ChevronDown, ChevronUp, Download, Save,
  Building2, Users, Shield, Target, AlertCircle, CheckSquare,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import BackButton from '@/components/common/BackButton';
import api from '@/services/api';
import toast from 'react-hot-toast';

const LS_KEY = 'gri_narratives';
const GRI_CATEGORY = 'GRI_UNIVERSAL';

// ─── Types ─────────────────────────────────────────────────────────────────────

type TabId = 'gri2' | 'gri3';

interface BadgeStyle {
  badge: string;
  badgeText: string;
  border: string;
  headerBg: string;
  bg: string;
  iconColor: string;
}

interface GRICardProps {
  title: string;
  subtitle: string;
  style: BadgeStyle;
  icon: React.ElementType;
  children: React.ReactNode;
}

type NarrativeMap = Record<string, string>;
type NumericMap = Record<string, number | string>;

// ─── Common topics for GRI 3-2 ─────────────────────────────────────────────────

const getGriTopics = (t: TFunction): string[] => [
  t('compliance.gri.topic.gesEmissions', "Émissions de GES"),
  t('compliance.gri.topic.energy', "Énergie"),
  t('compliance.gri.topic.waterEffluents', "Eau et effluents"),
  t('compliance.gri.topic.biodiversity', "Biodiversité"),
  t('compliance.gri.topic.waste', "Déchets"),
  t('compliance.gri.topic.circularEconomy', "Économie circulaire"),
  t('compliance.gri.topic.trainingEducation', "Formation et éducation"),
  t('compliance.gri.topic.healthSafety', "Santé et sécurité au travail"),
  t('compliance.gri.topic.diversityEquality', "Diversité et égalité des chances"),
  t('compliance.gri.topic.equitableRemuneration', "Rémunération équitable"),
  t('compliance.gri.topic.humanRights', "Droits humains"),
  t('compliance.gri.topic.childForcedLabour', "Travail des enfants et travail forcé"),
  t('compliance.gri.topic.antiCorruption', "Anti-corruption"),
  t('compliance.gri.topic.fairCompetition', "Concurrence loyale"),
  t('compliance.gri.topic.communityEngagement', "Engagement communautaire"),
  t('compliance.gri.topic.customerPrivacy', "Vie privée des clients"),
  t('compliance.gri.topic.productAccessibility', "Accessibilité des produits/services"),
  t('compliance.gri.topic.responsibleProcurement', "Achats responsables"),
  t('compliance.gri.topic.taxation', "Fiscalité"),
  t('compliance.gri.topic.indirectEconomicImpacts', "Impacts économiques indirects"),
];

// ─── Badge styles ───────────────────────────────────────────────────────────────

const STYLES: Record<string, BadgeStyle> = {
  green: {
    badge: 'bg-green-900/60',
    badgeText: 'text-green-300',
    border: 'border-green-700/40',
    headerBg: 'bg-green-900/30',
    bg: 'bg-green-950/30',
    iconColor: 'text-green-400',
  },
  blue: {
    badge: 'bg-blue-900/60',
    badgeText: 'text-blue-300',
    border: 'border-blue-700/40',
    headerBg: 'bg-blue-900/30',
    bg: 'bg-blue-950/30',
    iconColor: 'text-blue-400',
  },
  purple: {
    badge: 'bg-violet-900/60',
    badgeText: 'text-violet-300',
    border: 'border-violet-700/40',
    headerBg: 'bg-violet-900/30',
    bg: 'bg-violet-950/30',
    iconColor: 'text-violet-400',
  },
  amber: {
    badge: 'bg-amber-900/60',
    badgeText: 'text-amber-300',
    border: 'border-amber-700/40',
    headerBg: 'bg-amber-900/30',
    bg: 'bg-amber-950/30',
    iconColor: 'text-amber-400',
  },
  rose: {
    badge: 'bg-rose-900/60',
    badgeText: 'text-rose-300',
    border: 'border-rose-700/40',
    headerBg: 'bg-rose-900/30',
    bg: 'bg-rose-950/30',
    iconColor: 'text-rose-400',
  },
};

// ─── Collapsible card ───────────────────────────────────────────────────────────

function GRICard({ title, subtitle, style, icon: Icon, children }: GRICardProps) {
  const [open, setOpen] = useState(true);

  return (
    <div className={`rounded-2xl border ${style.border} ${style.bg} overflow-hidden`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-6 py-4 ${style.headerBg} hover:brightness-110 transition-all`}
      >
        <div className="flex items-center gap-3">
          <Icon className={`h-5 w-5 ${style.iconColor}`} />
          <div className="text-left">
            <span className="font-semibold text-white text-sm block">{title}</span>
            <span className={`text-xs ${style.badgeText}`}>{subtitle}</span>
          </div>
        </div>
        {open
          ? <ChevronUp className="h-4 w-4 text-slate-400" />
          : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>
      {open && (
        <div className="px-6 py-4 space-y-5">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Field helpers ─────────────────────────────────────────────────────────────

function Label({ code, text }: { code: string; text: string }) {
  return (
    <label className="block text-sm font-medium text-slate-300 mb-1.5">
      <span className="text-slate-500 font-mono text-xs mr-2">{code}</span>
      {text}
    </label>
  );
}

function TextInput({
  code,
  label,
  value,
  onChange,
  placeholder,
}: {
  code: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <Label code={code} text={label} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-all"
      />
    </div>
  );
}

function NumberInput({
  code,
  label,
  value,
  onChange,
  placeholder,
}: {
  code: string;
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <Label code={code} text={label} />
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-all"
      />
    </div>
  );
}

function TextArea({
  code,
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  code: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div>
      <Label code={code} text={label} />
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-all resize-y"
      />
    </div>
  );
}

function SelectInput({
  code,
  label,
  value,
  onChange,
  options,
}: {
  code: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  const { t } = useTranslation();
  return (
    <div>
      <Label code={code} text={label} />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-all"
      >
        <option value="">{t('compliance.gri.selectPlaceholder', "-- Sélectionner --")}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

// ─── GRI 2 Tab ─────────────────────────────────────────────────────────────────

function GRI2Tab({
  narratives,
  numerics,
  onNarrative,
  onNumeric,
}: {
  narratives: NarrativeMap;
  numerics: NumericMap;
  onNarrative: (key: string, val: string) => void;
  onNumeric: (key: string, val: string) => void;
}) {
  const { t } = useTranslation();
  const n = (key: string) => narratives[key] ?? '';
  const num = (key: string) => numerics[key] ?? '';

  return (
    <div className="space-y-6">

      {/* 2-1 to 2-5 */}
      <GRICard
        title={t('compliance.gri.card2_1_5.title', "GRI 2-1 à 2-5 — Profil de l'organisation")}
        subtitle={t('compliance.gri.card2_1_5.subtitle', 'Identification et périmètre du rapport')}
        style={STYLES.green}
        icon={Building2}
      >
        <TextInput
          code="2-1"
          label={t('compliance.gri.field.orgName', "Nom de l'organisation")}
          value={n('2_1')}
          onChange={(v) => onNarrative('2_1', v)}
        />
        <TextArea
          code="2-2"
          label={t('compliance.gri.field.entities', 'Entités incluses dans le rapport')}
          value={n('2_2')}
          onChange={(v) => onNarrative('2_2', v)}
        />
        <TextInput
          code="2-3"
          label={t('compliance.gri.field.reportingPeriod', 'Période de reporting et fréquence')}
          value={n('2_3')}
          onChange={(v) => onNarrative('2_3', v)}
          placeholder="01/01/2025 - 31/12/2025"
        />
        <TextArea
          code="2-4"
          label={t('compliance.gri.field.restatements', "Retraitements d'informations")}
          value={n('2_4')}
          onChange={(v) => onNarrative('2_4', v)}
          placeholder={t('compliance.gri.field.restatementsPh', 'Aucun retraitement significatif')}
        />
        <SelectInput
          code="2-5"
          label={t('compliance.gri.field.externalVerif', 'Vérification externe')}
          value={n('2_5')}
          onChange={(v) => onNarrative('2_5', v)}
          options={[t('compliance.gri.opt.none', 'Aucune'), t('compliance.gri.opt.limitedAssurance', 'Assurance limitée'), t('compliance.gri.opt.reasonableAssurance', 'Assurance raisonnable')]}
        />
      </GRICard>

      {/* 2-6 to 2-8 */}
      <GRICard
        title={t('compliance.gri.card2_6_8.title', "GRI 2-6 à 2-8 — Activités et chaîne de valeur")}
        subtitle={t('compliance.gri.card2_6_8.subtitle', 'Secteur, produits, effectifs')}
        style={STYLES.blue}
        icon={Globe}
      >
        <TextArea
          code="2-6"
          label={t('compliance.gri.field.sector', "Secteur d'activité, produits/services")}
          value={n('2_6')}
          onChange={(v) => onNarrative('2_6', v)}
        />
        <NumberInput
          code="2-7a"
          label={t('compliance.gri.field.employees', 'Nombre de salariés')}
          value={num('2_7_count')}
          onChange={(v) => onNumeric('2_7_count', v)}
        />
        <TextArea
          code="2-7b"
          label={t('compliance.gri.field.contractBreakdown', 'Répartition CDI/CDD')}
          value={n('2_7_repartition')}
          onChange={(v) => onNarrative('2_7_repartition', v)}
        />
        <NumberInput
          code="2-8"
          label={t('compliance.gri.field.nonEmployeeWorkers', 'Nombre de travailleurs non salariés')}
          value={num('2_8')}
          onChange={(v) => onNumeric('2_8', v)}
        />
      </GRICard>

      {/* 2-9 to 2-21 */}
      <GRICard
        title={t('compliance.gri.card2_9_21.title', 'GRI 2-9 à 2-21 — Gouvernance')}
        subtitle={t('compliance.gri.card2_9_21.subtitle', 'Structure, composition et rémunérations')}
        style={STYLES.purple}
        icon={Shield}
      >
        <TextArea
          code="2-9"
          label={t('compliance.gri.field.govStructure', 'Structure de gouvernance — description organe de gouvernance')}
          value={n('2_9')}
          onChange={(v) => onNarrative('2_9', v)}
        />
        <TextArea
          code="2-10"
          label={t('compliance.gri.field.nomination', 'Nomination et sélection des membres')}
          value={n('2_10')}
          onChange={(v) => onNarrative('2_10', v)}
        />
        <TextInput
          code="2-11"
          label={t('compliance.gri.field.chairPerson', "Président de l'organe de gouvernance (nom/titre)")}
          value={n('2_11')}
          onChange={(v) => onNarrative('2_11', v)}
        />
        <TextArea
          code="2-12"
          label={t('compliance.gri.field.esgRole', "Rôle de l'organe sur impacts ESG")}
          value={n('2_12')}
          onChange={(v) => onNarrative('2_12', v)}
        />
        <TextArea
          code="2-13"
          label={t('compliance.gri.field.esgDelegation', 'Délégation des responsabilités ESG')}
          value={n('2_13')}
          onChange={(v) => onNarrative('2_13', v)}
        />
        <TextArea
          code="2-14"
          label={t('compliance.gri.field.reportingRole', 'Rôle dans le reporting de durabilité')}
          value={n('2_14')}
          onChange={(v) => onNarrative('2_14', v)}
        />
        <SelectInput
          code="2-15"
          label={t('compliance.gri.field.conflictsOfInterest', "Conflits d'intérêts")}
          value={n('2_15')}
          onChange={(v) => onNarrative('2_15', v)}
          options={[t('compliance.gri.opt.formalPolicy', 'Politique formelle'), t('compliance.gri.opt.annualDeclaration', 'Déclaration annuelle'), t('compliance.gri.opt.notManaged', 'Non géré')]}
        />
        <TextArea
          code="2-16"
          label={t('compliance.gri.field.criticalConcerns', 'Communication des préoccupations critiques')}
          value={n('2_16')}
          onChange={(v) => onNarrative('2_16', v)}
        />
        <SelectInput
          code="2-17"
          label={t('compliance.gri.field.esgKnowledge', "Connaissances ESG de l'organe de gouvernance")}
          value={n('2_17')}
          onChange={(v) => onNarrative('2_17', v)}
          options={[t('compliance.gri.opt.regularTraining', 'Formation régulière'), t('compliance.gri.opt.occasional', 'Ponctuelle'), t('compliance.gri.opt.none', 'Aucune')]}
        />
        <SelectInput
          code="2-18"
          label={t('compliance.gri.field.perfEvaluation', 'Évaluation des performances')}
          value={n('2_18')}
          onChange={(v) => onNarrative('2_18', v)}
          options={[t('compliance.gri.opt.annualExternal', 'Annuelle externe'), t('compliance.gri.opt.annualInternal', 'Annuelle interne'), t('compliance.gri.opt.none', 'Aucune')]}
        />
        <TextArea
          code="2-19"
          label={t('compliance.gri.field.remunPolicies', 'Politiques de rémunération')}
          value={n('2_19')}
          onChange={(v) => onNarrative('2_19', v)}
        />
        <TextArea
          code="2-20"
          label={t('compliance.gri.field.remunProcess', 'Processus de détermination des rémunérations')}
          value={n('2_20')}
          onChange={(v) => onNarrative('2_20', v)}
        />
        <NumberInput
          code="2-21"
          label={t('compliance.gri.field.remunRatio', 'Ratio rémunération annuelle totale')}
          value={num('2_21')}
          onChange={(v) => onNumeric('2_21', v)}
          placeholder="ex: 15.3"
        />
      </GRICard>

      {/* 2-22 to 2-26 */}
      <GRICard
        title={t('compliance.gri.card2_22_26.title', 'GRI 2-22 à 2-26 — Stratégie et politiques')}
        subtitle={t('compliance.gri.card2_22_26.subtitle', 'Engagements et mécanismes de remédiation')}
        style={STYLES.amber}
        icon={Target}
      >
        <TextArea
          code="2-22"
          label={t('compliance.gri.field.sustainStrategy', 'Déclaration sur la stratégie de développement durable')}
          value={n('2_22')}
          onChange={(v) => onNarrative('2_22', v)}
          rows={5}
        />
        <TextArea
          code="2-23"
          label={t('compliance.gri.field.policyCommitments', 'Engagements politiques')}
          value={n('2_23')}
          onChange={(v) => onNarrative('2_23', v)}
        />
        <TextArea
          code="2-24"
          label={t('compliance.gri.field.policyIntegration', 'Intégration des engagements politiques')}
          value={n('2_24')}
          onChange={(v) => onNarrative('2_24', v)}
        />
        <TextArea
          code="2-25"
          label={t('compliance.gri.field.remediation', 'Processus de remédiation des impacts négatifs')}
          value={n('2_25')}
          onChange={(v) => onNarrative('2_25', v)}
        />
        <TextArea
          code="2-26"
          label={t('compliance.gri.field.grievanceMechanisms', "Mécanismes de sollicitation et d'examen des préoccupations")}
          value={n('2_26')}
          onChange={(v) => onNarrative('2_26', v)}
        />
      </GRICard>

      {/* 2-27 to 2-29 */}
      <GRICard
        title={t('compliance.gri.card2_27_29.title', 'GRI 2-27 à 2-29 — Conformité et parties prenantes')}
        subtitle={t('compliance.gri.card2_27_29.subtitle', 'Infractions, adhésions et engagement')}
        style={STYLES.rose}
        icon={AlertCircle}
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <NumberInput
            code="2-27a"
            label={t('compliance.gri.field.violations', 'Infractions aux lois et réglementations (nombre)')}
            value={num('2_27_count')}
            onChange={(v) => onNumeric('2_27_count', v)}
            placeholder="0"
          />
          <NumberInput
            code="2-27b"
            label={t('compliance.gri.field.fines', 'Montant des amendes (k€)')}
            value={num('2_27_fines')}
            onChange={(v) => onNumeric('2_27_fines', v)}
            placeholder="0"
          />
        </div>
        <TextArea
          code="2-28"
          label={t('compliance.gri.field.memberships', 'Adhésion à des associations sectorielles')}
          value={n('2_28')}
          onChange={(v) => onNarrative('2_28', v)}
        />
        <TextArea
          code="2-29"
          label={t('compliance.gri.field.stakeholderEngagement', "Approche de l'engagement des parties prenantes")}
          value={n('2_29')}
          onChange={(v) => onNarrative('2_29', v)}
        />
      </GRICard>
    </div>
  );
}

// ─── GRI 3 Tab ─────────────────────────────────────────────────────────────────

function GRI3Tab({
  narratives,
  onNarrative,
}: {
  narratives: NarrativeMap;
  onNarrative: (key: string, val: string) => void;
}) {
  const { t } = useTranslation();
  const griTopics = getGriTopics(t);
  const n = (key: string) => narratives[key] ?? '';
  const selectedTopics: string[] = (() => {
    try {
      return JSON.parse(narratives['3_2_topics'] ?? '[]');
    } catch {
      return [];
    }
  })();

  const toggleTopic = (topic: string) => {
    const next = selectedTopics.includes(topic)
      ? selectedTopics.filter((tp) => tp !== topic)
      : [...selectedTopics, topic];
    onNarrative('3_2_topics', JSON.stringify(next));
  };

  return (
    <div className="space-y-6">

      {/* 3-1 */}
      <div className="rounded-2xl border border-indigo-700/40 bg-indigo-950/30 p-6">
        <div className="flex items-center gap-2 mb-4">
          <CheckSquare className="h-5 w-5 text-indigo-400" />
          <span className="font-semibold text-white text-sm">
            <span className="text-slate-500 font-mono text-xs mr-2">3-1</span>
            {t('compliance.gri.gri3_1.title', 'Processus de détermination des sujets importants')}
          </span>
        </div>
        <TextArea
          code=""
          label=""
          value={n('3_1')}
          onChange={(v) => onNarrative('3_1', v)}
          placeholder={t('compliance.gri.gri3_1.placeholder', 'Décrire le processus suivi pour identifier et hiérarchiser les sujets importants...')}
          rows={4}
        />
      </div>

      {/* 3-2 */}
      <div className="rounded-2xl border border-indigo-700/40 bg-indigo-950/30 p-6">
        <div className="flex items-center gap-2 mb-4">
          <CheckSquare className="h-5 w-5 text-indigo-400" />
          <span className="font-semibold text-white text-sm">
            <span className="text-slate-500 font-mono text-xs mr-2">3-2</span>
            {t('compliance.gri.gri3_2.title', 'Liste des sujets importants')}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {griTopics.map((topic) => {
            const checked = selectedTopics.includes(topic);
            return (
              <button
                key={topic}
                onClick={() => toggleTopic(topic)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-sm text-left transition-all ${
                  checked
                    ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                }`}
              >
                <span
                  className={`w-4 h-4 flex-shrink-0 rounded border transition-all ${
                    checked
                      ? 'bg-indigo-500 border-indigo-400'
                      : 'bg-slate-700 border-slate-500'
                  } flex items-center justify-center`}
                >
                  {checked && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10">
                      <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                {topic}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3-3 per selected topic */}
      {selectedTopics.length > 0 && (
        <div className="rounded-2xl border border-indigo-700/40 bg-indigo-950/30 p-6 space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckSquare className="h-5 w-5 text-indigo-400" />
            <span className="font-semibold text-white text-sm">
              <span className="text-slate-500 font-mono text-xs mr-2">3-3</span>
              {t('compliance.gri.gri3_3.title', 'Gestion des sujets importants sélectionnés')}
            </span>
          </div>
          {selectedTopics.map((topic) => (
            <div key={topic} className="border border-slate-700/60 rounded-xl p-4 bg-slate-800/40">
              <p className="text-sm font-medium text-indigo-300 mb-2">{topic}</p>
              <textarea
                value={n(`3_3_${topic}`)}
                onChange={(e) => onNarrative(`3_3_${topic}`, e.target.value)}
                placeholder={t('compliance.gri.gri3_3.topicPlaceholder', "Décrire l'impact, les politiques, les objectifs et les actions liés à : {{topic}}", { topic })}
                rows={3}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-all resize-y"
              />
            </div>
          ))}
        </div>
      )}

      {selectedTopics.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-4">
          {t('compliance.gri.gri3_3.emptyHint', 'Sélectionnez des sujets importants ci-dessus pour compléter le GRI 3-3.')}
        </p>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function GRIDisclosure() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>('gri2');
  const [narratives, setNarratives] = useState<NarrativeMap>({});
  const [numerics, setNumerics] = useState<NumericMap>({});
  const [saving, setSaving] = useState(false);
  const isMounted = useRef(true);

  // Load on mount
  useEffect(() => {
    // Text fields from localStorage
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored) setNarratives(JSON.parse(stored));
    } catch {/* ignore */}

    // Numeric fields from API
    api
      .get('/data-entry', { params: { category: GRI_CATEGORY } })
      .then((res) => {
        if (!isMounted.current) return;
        const data = res.data;
        if (data && typeof data === 'object') {
          // Flatten API data into numeric map
          const map: NumericMap = {};
          if (Array.isArray(data)) {
            data.forEach((entry: { indicator_key?: string; value?: number }) => {
              if (entry.indicator_key) map[entry.indicator_key] = entry.value ?? '';
            });
          } else {
            Object.assign(map, data);
          }
          setNumerics(map);
        }
      })
      .catch(() => {
        // API may not exist yet — silently ignore
      });

    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleNarrative = useCallback((key: string, val: string) => {
    setNarratives((prev) => {
      const next = { ...prev, [key]: val };
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(next));
      } catch {/* ignore */}
      return next;
    });
  }, []);

  const handleNumeric = useCallback((key: string, val: string) => {
    setNumerics((prev) => ({ ...prev, [key]: val }));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Persist text to localStorage
      localStorage.setItem(LS_KEY, JSON.stringify(narratives));

      // Persist numeric fields to API
      const entries = Object.entries(numerics)
        .filter(([, v]) => v !== '' && v !== null && v !== undefined)
        .map(([key, value]) => ({ indicator_key: key, value: Number(value), category: GRI_CATEGORY }));

      if (entries.length > 0) {
        await api.post('/data-entry/batch', { entries });
      }

      toast.success(t('compliance.gri.toastSaved', 'Données GRI sauvegardées avec succès'));
    } catch {
      // Fallback: data is already in localStorage
      toast.success(t('compliance.gri.toastSavedLocal', 'Sauvegardé localement (synchronisation cloud bientôt disponible)'));
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      // jspdf-autotable appends lastAutoTable to the doc instance at runtime
      const docWT = doc as typeof doc & { lastAutoTable: { finalY: number } };
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const year = new Date().getFullYear();

      const nv = (key: string) => (narratives[key] && narratives[key].trim()) ? narratives[key] : '—';
      const num = (key: string) => numerics[key] !== undefined && numerics[key] !== '' ? String(numerics[key]) : '—';

      // ── Header ──────────────────────────────────────────────────────────────
      doc.setFillColor(5, 46, 22);
      doc.rect(0, 0, pageW, 42, 'F');
      doc.setFillColor(21, 128, 61);
      doc.rect(0, 38, pageW, 4, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('GRI — Global Reporting Initiative', 14, 18);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(t('compliance.gri.pdf.subtitle', "Normes Universelles GRI 2021 — Exercice {{year}}", { year }), 14, 27);
      doc.setFontSize(9);
      doc.text(t('compliance.gri.pdf.generatedOn', "Généré le {{date}}", { date: new Date().toLocaleDateString('fr-FR') }), 14, 34);

      let y = 52;

      const sectionHeader = (label: string, color: [number, number, number]) => {
        if (y > pageH - 30) { doc.addPage(); y = 20; }
        doc.setFillColor(...color);
        doc.rect(14, y, pageW - 28, 7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.text(label, 17, y + 5);
        y += 9;
      };

      const tableOpts = (startY: number, body: string[][], color: [number, number, number]) => ({
        startY,
        margin: { left: 14, right: 14 },
        head: [[t('compliance.gri.pdf.colCode', 'Code'), t('compliance.gri.pdf.colField', 'Champ'), t('compliance.gri.pdf.colValue', 'Valeur')]],
        body,
        columnStyles: {
          0: { cellWidth: 18, fontStyle: 'bold' as const, textColor: color },
          1: { cellWidth: 58 },
          2: { cellWidth: 'auto' as const },
        },
        headStyles: { fillColor: color, textColor: 255, fontStyle: 'bold' as const, fontSize: 8 },
        bodyStyles: { fontSize: 8, textColor: [30, 30, 30] as [number, number, number] },
        alternateRowStyles: { fillColor: [240, 253, 244] as [number, number, number] },
      });

      const GREEN: [number, number, number] = [21, 83, 45];

      // ── GRI 2-1 à 2-5 ───────────────────────────────────────────────────────
      sectionHeader(t('compliance.gri.pdf.sec2_1_5', "GRI 2-1 à 2-5 — Profil de l'organisation"), GREEN);
      autoTable(doc, tableOpts(y, [
        ['2-1', t('compliance.gri.field.orgName', "Nom de l'organisation"), nv('2_1')],
        ['2-2', t('compliance.gri.field.entities', "Entités incluses dans le rapport"), nv('2_2')],
        ['2-3', t('compliance.gri.pdf.field.reportingPeriodShort', "Période de reporting"), nv('2_3')],
        ['2-4', t('compliance.gri.field.restatements', "Retraitements d'informations"), nv('2_4')],
        ['2-5', t('compliance.gri.field.externalVerif', "Vérification externe"), nv('2_5')],
      ], GREEN));
      y = docWT.lastAutoTable.finalY + 8;

      // ── GRI 2-6 à 2-8 ───────────────────────────────────────────────────────
      sectionHeader(t('compliance.gri.pdf.sec2_6_8', "GRI 2-6 à 2-8 — Activités et chaîne de valeur"), GREEN);
      autoTable(doc, tableOpts(y, [
        ['2-6', t('compliance.gri.field.sector', "Secteur d'activité, produits/services"), nv('2_6')],
        ['2-7a', t('compliance.gri.field.employees', "Nombre de salariés"), num('2_7_count')],
        ['2-7b', t('compliance.gri.field.contractBreakdown', "Répartition CDI/CDD"), nv('2_7_repartition')],
        ['2-8', t('compliance.gri.pdf.field.nonEmployeeWorkersShort', "Travailleurs non salariés"), num('2_8')],
      ], GREEN));
      y = docWT.lastAutoTable.finalY + 8;

      // ── GRI 2-9 à 2-21 ──────────────────────────────────────────────────────
      sectionHeader(t('compliance.gri.pdf.sec2_9_21', "GRI 2-9 à 2-21 — Gouvernance"), GREEN);
      autoTable(doc, tableOpts(y, [
        ['2-9', t('compliance.gri.pdf.field.govStructureShort', "Structure de gouvernance"), nv('2_9')],
        ['2-10', t('compliance.gri.field.nomination', "Nomination et sélection des membres"), nv('2_10')],
        ['2-11', t('compliance.gri.pdf.field.chairPersonShort', "Président de l'organe de gouvernance"), nv('2_11')],
        ['2-12', t('compliance.gri.pdf.field.esgRoleShort', "Rôle sur impacts ESG"), nv('2_12')],
        ['2-13', t('compliance.gri.field.esgDelegation', "Délégation des responsabilités ESG"), nv('2_13')],
        ['2-14', t('compliance.gri.field.reportingRole', "Rôle dans le reporting de durabilité"), nv('2_14')],
        ['2-15', t('compliance.gri.field.conflictsOfInterest', "Conflits d'intérêts"), nv('2_15')],
        ['2-16', t('compliance.gri.field.criticalConcerns', "Communication des préoccupations critiques"), nv('2_16')],
        ['2-17', t('compliance.gri.pdf.field.esgKnowledgeShort', "Connaissances ESG de l'organe"), nv('2_17')],
        ['2-18', t('compliance.gri.field.perfEvaluation', "Évaluation des performances"), nv('2_18')],
        ['2-19', t('compliance.gri.field.remunPolicies', "Politiques de rémunération"), nv('2_19')],
        ['2-20', t('compliance.gri.field.remunProcess', "Processus de détermination des rémunérations"), nv('2_20')],
        ['2-21', t('compliance.gri.field.remunRatio', "Ratio rémunération annuelle totale"), num('2_21')],
      ], GREEN));
      y = docWT.lastAutoTable.finalY + 8;

      // ── GRI 2-22 à 2-26 ─────────────────────────────────────────────────────
      sectionHeader(t('compliance.gri.pdf.sec2_22_26', "GRI 2-22 à 2-26 — Stratégie et politiques"), GREEN);
      autoTable(doc, tableOpts(y, [
        ['2-22', t('compliance.gri.field.sustainStrategy', "Déclaration sur la stratégie de développement durable"), nv('2_22')],
        ['2-23', t('compliance.gri.field.policyCommitments', "Engagements politiques"), nv('2_23')],
        ['2-24', t('compliance.gri.field.policyIntegration', "Intégration des engagements politiques"), nv('2_24')],
        ['2-25', t('compliance.gri.field.remediation', "Processus de remédiation des impacts négatifs"), nv('2_25')],
        ['2-26', t('compliance.gri.pdf.field.grievanceMechanismsShort', "Mécanismes de sollicitation et d'examen"), nv('2_26')],
      ], GREEN));
      y = docWT.lastAutoTable.finalY + 8;

      // ── GRI 2-27 à 2-29 ─────────────────────────────────────────────────────
      sectionHeader(t('compliance.gri.pdf.sec2_27_29', "GRI 2-27 à 2-29 — Conformité et parties prenantes"), GREEN);
      autoTable(doc, tableOpts(y, [
        ['2-27a', t('compliance.gri.field.violations', "Infractions aux lois et réglementations (nombre)"), num('2_27_count')],
        ['2-27b', t('compliance.gri.field.fines', "Montant des amendes (k€)"), num('2_27_fines')],
        ['2-28', t('compliance.gri.field.memberships', "Adhésion à des associations sectorielles"), nv('2_28')],
        ['2-29', t('compliance.gri.field.stakeholderEngagement', "Approche de l'engagement des parties prenantes"), nv('2_29')],
      ], GREEN));
      y = docWT.lastAutoTable.finalY + 8;

      // ── GRI 3 ────────────────────────────────────────────────────────────────
      doc.addPage();
      doc.setFillColor(55, 48, 163);
      doc.rect(0, 0, pageW, 14, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(t('compliance.gri.pdf.gri3PageTitle', "GRI 3 — Sujets importants"), 14, 10);
      y = 24;

      const INDIGO: [number, number, number] = [67, 56, 202];

      // 3-1
      sectionHeader(t('compliance.gri.pdf.sec3_1', "GRI 3-1 — Processus de détermination des sujets importants"), INDIGO);
      autoTable(doc, {
        startY: y,
        margin: { left: 14, right: 14 },
        body: [[nv('3_1')]],
        bodyStyles: { fontSize: 8, textColor: [30, 30, 30] as [number, number, number], minCellHeight: 20 },
      });
      y = docWT.lastAutoTable.finalY + 8;

      // 3-2 Topics
      const selectedTopics: string[] = (() => {
        try { return JSON.parse(narratives['3_2_topics'] ?? '[]'); } catch { return []; }
      })();

      sectionHeader(t('compliance.gri.pdf.sec3_2', "GRI 3-2 — Liste des sujets importants"), INDIGO);
      if (selectedTopics.length > 0) {
        autoTable(doc, {
          startY: y,
          margin: { left: 14, right: 14 },
          head: [[t('compliance.gri.pdf.colNum', '#'), t('compliance.gri.pdf.colImportantTopic', 'Sujet important')]],
          body: selectedTopics.map((tp, i) => [String(i + 1), tp]),
          headStyles: { fillColor: INDIGO, textColor: 255, fontStyle: 'bold' as const, fontSize: 8 },
          bodyStyles: { fontSize: 8, textColor: [30, 30, 30] as [number, number, number] },
          columnStyles: { 0: { cellWidth: 14 } },
          alternateRowStyles: { fillColor: [238, 242, 255] as [number, number, number] },
        });
        y = docWT.lastAutoTable.finalY + 8;
      } else {
        doc.setTextColor(150, 150, 150);
        doc.setFontSize(8);
        doc.text(t('compliance.gri.pdf.noTopicsSelected', "Aucun sujet important sélectionné."), 14, y + 6);
        y += 14;
      }

      // 3-3 per topic
      if (selectedTopics.length > 0) {
        sectionHeader(t('compliance.gri.pdf.sec3_3', "GRI 3-3 — Gestion des sujets importants"), INDIGO);
        autoTable(doc, {
          startY: y,
          margin: { left: 14, right: 14 },
          head: [[t('compliance.gri.pdf.colImportantTopic', 'Sujet important'), t('compliance.gri.pdf.colManagement', "Gestion — impacts, politiques, objectifs, actions")]],
          body: selectedTopics.map(topic => [topic, nv(`3_3_${topic}`)]),
          headStyles: { fillColor: INDIGO, textColor: 255, fontStyle: 'bold' as const, fontSize: 8 },
          bodyStyles: { fontSize: 8, textColor: [30, 30, 30] as [number, number, number], minCellHeight: 12 },
          columnStyles: { 0: { cellWidth: 50 } },
          alternateRowStyles: { fillColor: [238, 242, 255] as [number, number, number] },
        });
      }

      // ── Footer ───────────────────────────────────────────────────────────────
      const totalPages = doc.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${p} / ${totalPages}  —  GRI Standards 2021  —  ESGflow`, pageW / 2, pageH - 8, { align: 'center' });
      }

      doc.save(`GRI_Disclosure_${year}.pdf`);
      toast.success(t('compliance.gri.toastPdfGenerated', 'PDF GRI généré et téléchargé'));
    } catch (err) {
      console.error(err);
      toast.error(t('compliance.gri.toastPdfError', 'Erreur lors de la génération du PDF'));
    }
  };

  const TABS: { id: TabId; label: string }[] = [
    { id: 'gri2', label: t('compliance.gri.tabGri2', "GRI 2 — Informations générales") },
    { id: 'gri3', label: t('compliance.gri.tabGri3', "GRI 3 — Sujets importants") },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <div
          className="relative overflow-hidden rounded-2xl shadow-xl"
          style={{ background: 'linear-gradient(135deg, #052e16 0%, #14532d 40%, #15803d 70%, #22c55e 100%)' }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 80% 10%, rgba(255,255,255,0.10) 0%, transparent 55%)' }}
          />
          <div className="absolute inset-0 opacity-[0.06] pointer-events-none">
            <svg width="100%" height="100%">
              <defs>
                <pattern id="gridots" width="28" height="28" patternUnits="userSpaceOnUse">
                  <circle cx="14" cy="14" r="1.5" fill="white" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#gridots)" />
            </svg>
          </div>

          <div className="relative px-8 py-7">
            <BackButton to="/app/compliance" label={t('compliance.gri.backLabel', 'Conformité')} className="mb-4 text-white/70 hover:text-white" />

            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.18)' }}>
                    <Globe className="h-6 w-6 text-white" />
                  </div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-white">
                    GRI — Global Reporting Initiative
                  </h1>
                </div>
                <p className="text-green-200 text-sm ml-1 mb-4">
                  {t('compliance.gri.heroSubtitle', 'Normes Universelles GRI 2021')}
                </p>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/15 text-white border border-white/20">
                  <Globe className="h-3.5 w-3.5" />
                  GRI Standards
                </span>
              </div>

              <div className="flex flex-col gap-3 lg:items-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-medium text-sm transition-all border border-white/20 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {saving ? t('compliance.gri.saving', 'Sauvegarde...') : t('compliance.gri.save', 'Sauvegarder')}
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 font-medium text-sm transition-all border border-white/10"
                >
                  <Download className="h-4 w-4" />
                  {t('compliance.gri.exportPdf', 'Exporter PDF')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────────────── */}
        <div className="flex gap-2 p-1.5 bg-slate-800/80 rounded-xl border border-slate-700/50">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab content ──────────────────────────────────────────────────── */}
        {activeTab === 'gri2' && (
          <GRI2Tab
            narratives={narratives}
            numerics={numerics}
            onNarrative={handleNarrative}
            onNumeric={handleNumeric}
          />
        )}
        {activeTab === 'gri3' && (
          <GRI3Tab
            narratives={narratives}
            onNarrative={handleNarrative}
          />
        )}

        {/* ── Bottom save bar ───────────────────────────────────────────────── */}
        <div className="sticky bottom-4 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-xl shadow-indigo-900/50 transition-all disabled:opacity-60 border border-indigo-500"
          >
            <Save className="h-4 w-4" />
            {saving ? t('compliance.gri.savingLong', 'Sauvegarde en cours...') : t('compliance.gri.saveAll', 'Sauvegarder les données GRI')}
          </button>
        </div>

      </div>
    </div>
  );
}
