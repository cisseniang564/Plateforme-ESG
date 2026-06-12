import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2, ChevronLeft, ChevronRight, ExternalLink, Printer, Target,
  Shield, AlertCircle, Download, Share2, Home, Calendar, Sparkles,
  ArrowRight, FileText, Clock, BarChart3, Leaf, Zap, Building2,
  Users, TrendingDown, Globe, ThermometerSun, Award, Info,
  type LucideIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/services/api';

const STORAGE_KEY = 'sbti_workflow_state';
const CURRENT_YEAR = new Date().getFullYear();
const LAST_YEAR = CURRENT_YEAR - 1;

const getSectors = (t: TFunction) => [
  { value: 'Manufacturing', label: t('compliance.sbti.sectors.manufacturing', 'Industrie / Manufacturing') },
  { value: 'Finance', label: t('compliance.sbti.sectors.finance', 'Finance / Banque / Assurance') },
  { value: 'Retail', label: t('compliance.sbti.sectors.retail', 'Retail / Distribution') },
  { value: 'Energy', label: t('compliance.sbti.sectors.energy', 'Énergie / Utilities') },
  { value: 'Services', label: t('compliance.sbti.sectors.services', 'Services / Conseil') },
  { value: 'Tech', label: t('compliance.sbti.sectors.tech', 'Tech / SaaS / Digital') },
  { value: 'Transport', label: t('compliance.sbti.sectors.transport', 'Transport / Logistique') },
  { value: 'Construction', label: t('compliance.sbti.sectors.construction', 'Construction / BTP') },
  { value: 'Other', label: t('compliance.sbti.sectors.other', 'Autre') },
];
const STATUSES = ['Non soumis', 'En attente de validation', 'Validé', 'Rejeté'] as const;
const getStatusLabel = (t: TFunction, status: string) => {
  const map: Record<string, string> = {
    'Non soumis': t('compliance.sbti.statuses.notSubmitted', 'Non soumis'),
    'En attente de validation': t('compliance.sbti.statuses.pending', 'En attente de validation'),
    'Validé': t('compliance.sbti.statuses.validated', 'Validé'),
    'Rejeté': t('compliance.sbti.statuses.rejected', 'Rejeté'),
  };
  return map[status] ?? status;
};

interface WorkflowState {
  hasScope12: boolean | null;
  hasScope3: boolean | null;
  revenue: string;
  sector: string;
  employees: string;
  ambition: '1.5' | '2' | null;
  referenceYear: string;
  scope12Emissions: string;
  scope3Emissions: string;
  commitmentText: string;
  submissionDate: string;
  submissionStatus: string;
  validationDate: string;
}

const defaultState: WorkflowState = {
  hasScope12: null,
  hasScope3: null,
  revenue: '',
  sector: '',
  employees: '',
  ambition: null,
  referenceYear: String(LAST_YEAR),
  scope12Emissions: '',
  scope3Emissions: '',
  commitmentText: '',
  submissionDate: '',
  submissionStatus: 'Non soumis',
  validationDate: '',
};

function loadState(): WorkflowState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultState, ...JSON.parse(raw) };
  } catch {}
  return defaultState;
}

function saveState(s: WorkflowState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

// ── Step definitions (labels injected at runtime) ─────────────────────────────
const STEP_ICONS: LucideIcon[] = [Shield, ThermometerSun, FileText, Download, Award];

// ── StepBar ───────────────────────────────────────────────────────────────────
interface StepDef { label: string; subtitle: string; icon: LucideIcon }
function StepBar({ current, onStepClick, steps }: { current: number; onStepClick: (i: number) => void; steps: StepDef[] }) {
  return (
    <div className="relative mb-10">
      {/* Connector line */}
      <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200" style={{ marginLeft: '10%', marginRight: '10%' }} />
      <div
        className="absolute top-5 left-0 h-0.5 transition-all duration-500"
        style={{
          marginLeft: '10%',
          width: `${(current / (steps.length - 1)) * 80}%`,
          background: 'linear-gradient(90deg, #059669, #10b981)',
        }}
      />
      <div className="relative flex justify-between">
        {steps.map(({ label, subtitle, icon: Icon }, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <button
              key={label}
              onClick={() => onStepClick(i)}
              className="flex flex-col items-center gap-2 group focus:outline-none"
              style={{ width: `${100 / steps.length}%` }}
            >
              <div
                className={`relative w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                  done
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                    : active
                    ? 'bg-white border-2 border-indigo-600 text-indigo-600 shadow-lg shadow-indigo-500/20'
                    : 'bg-white border-2 border-gray-200 text-gray-400 group-hover:border-gray-300'
                }`}
              >
                {done ? <CheckCircle2 size={18} /> : <Icon size={16} />}
              </div>
              <div className="text-center">
                <span
                  className={`text-xs font-bold block transition-colors ${
                    active ? 'text-indigo-600' : done ? 'text-emerald-600' : 'text-gray-400'
                  }`}
                >
                  {label}
                </span>
                {(active || done) && (
                  <span className="text-[10px] text-gray-400 hidden sm:block">{subtitle}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Reusable card shell ───────────────────────────────────────────────────────
function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-5 ${className}`}>
      {children}
    </div>
  );
}

function FieldLabel({ children, icon: Icon }: { children: React.ReactNode; icon?: LucideIcon }) {
  return (
    <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
      {Icon && <Icon size={14} className="text-gray-400" />}
      {children}
    </label>
  );
}

function InputField({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${className}`}
    />
  );
}

function SelectField({ className = '', children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all appearance-none ${className}`}
    >
      {children}
    </select>
  );
}

// ── Étape 1 — Éligibilité ─────────────────────────────────────────────────────
function Step1({ state, onChange }: { state: WorkflowState; onChange: (p: Partial<WorkflowState>) => void }) {
  const { t } = useTranslation();
  const SECTORS = getSectors(t);
  const eligible = state.hasScope12 === true && state.hasScope3 === true;
  const incomplete = state.hasScope12 === null || state.hasScope3 === null;

  const YesNoCard = ({ label, desc, value, field }: { label: string; desc: string; value: boolean | null; field: 'hasScope12' | 'hasScope3' }) => (
    <SectionCard>
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
          <Leaf size={18} className="text-indigo-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 mb-0.5">{label}</p>
          <p className="text-xs text-gray-500 mb-3">{desc}</p>
          <div className="flex gap-2">
            {(['Oui', 'Non'] as const).map((v) => {
              const selected = value === (v === 'Oui');
              return (
                <button
                  key={v}
                  onClick={() => onChange({ [field]: v === 'Oui' })}
                  className={`px-5 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                    selected
                      ? v === 'Oui'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-red-400 bg-red-50 text-red-600'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {v}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </SectionCard>
  );

  return (
    <div className="space-y-4">
      <YesNoCard
        label={t('compliance.sbti.step1.scope12Label', 'Scope 1 & 2 calculé ?')}
        desc={t('compliance.sbti.step1.scope12Desc', "Émissions directes (combustion, procédés) et indirectes liées à l'énergie")}
        value={state.hasScope12}
        field="hasScope12"
      />
      <YesNoCard
        label={t('compliance.sbti.step1.scope3Label', 'Scope 3 significatif calculé ?')}
        desc={t('compliance.sbti.step1.scope3Desc', 'Émissions indirectes : achats, transports, usage des produits vendus, etc.')}
        value={state.hasScope3}
        field="hasScope3"
      />

      <SectionCard>
        <p className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Building2 size={16} className="text-gray-400" />
          {t('compliance.sbti.step1.companyProfile', "Profil de l'entreprise")}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <FieldLabel>{t('compliance.sbti.step1.sectorLabel', "Secteur d'activité")}</FieldLabel>
            <SelectField value={state.sector} onChange={(e) => onChange({ sector: e.target.value })}>
              <option value="">{t('compliance.sbti.step1.selectPlaceholder', 'Sélectionner…')}</option>
              {SECTORS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </SelectField>
          </div>
          <div>
            <FieldLabel icon={Users}>{t('compliance.sbti.step1.employeesLabel', "Nombre d'employés")}</FieldLabel>
            <InputField
              type="number"
              min={0}
              value={state.employees}
              onChange={(e) => onChange({ employees: e.target.value })}
              placeholder="ex : 250"
            />
          </div>
          <div>
            <FieldLabel icon={TrendingDown}>{t('compliance.sbti.step1.revenueLabel', "Chiffre d'affaires (M€)")}</FieldLabel>
            <InputField
              type="number"
              min={0}
              step="0.1"
              value={state.revenue}
              onChange={(e) => onChange({ revenue: e.target.value })}
              placeholder="ex : 45"
            />
          </div>
        </div>
      </SectionCard>

      {!incomplete && (
        <div
          className={`flex items-center gap-3 rounded-2xl px-5 py-4 ${
            eligible
              ? 'bg-gradient-to-r from-emerald-50 to-emerald-100/50 border-2 border-emerald-200'
              : 'bg-gradient-to-r from-amber-50 to-amber-100/50 border-2 border-amber-200'
          }`}
        >
          {eligible ? (
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-500/25">
              <CheckCircle2 size={20} className="text-white" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-amber-500/25">
              <AlertCircle size={20} className="text-white" />
            </div>
          )}
          <div>
            <p className={`text-sm font-bold ${eligible ? 'text-emerald-800' : 'text-amber-800'}`}>
              {eligible ? t('compliance.sbti.step1.eligibleTitle', 'Éligible SBTi') : t('compliance.sbti.step1.missingPrereqs', 'Prérequis manquants')}
            </p>
            <p className={`text-xs ${eligible ? 'text-emerald-600' : 'text-amber-600'}`}>
              {eligible
                ? t('compliance.sbti.step1.eligibleDesc', 'Votre entreprise remplit les conditions pour soumettre des objectifs SBTi.')
                : t('compliance.sbti.step1.missingPrereqsDesc', 'Complétez vos calculs de Scope avant de soumettre votre dossier.')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Étape 2 — Ambition ────────────────────────────────────────────────────────
function Step2({ state, onChange }: { state: WorkflowState; onChange: (p: Partial<WorkflowState>) => void }) {
  const { t } = useTranslation();
  const s12 = parseFloat(state.scope12Emissions) || 0;
  const reductionRate = state.ambition === '1.5' ? 0.042 : 0.025;
  const yearsTo2030 = 2030 - parseInt(state.referenceYear || String(LAST_YEAR));
  const targetReduction = yearsTo2030 > 0 ? s12 * reductionRate * yearsTo2030 : 0;
  const targetLevel = s12 - targetReduction;

  const ambitions = [
    {
      val: '1.5' as const,
      label: '1,5°C',
      badge: t('compliance.sbti.step2.ambition.ambitious.badge', 'Trajectoire la plus ambitieuse'),
      desc: t('compliance.sbti.step2.ambition.ambitious.desc', "Réduction annuelle ≥ 4,2 % sur le Scope 1+2. Aligné avec l'objectif de l'Accord de Paris."),
      icon: Zap,
      gradient: 'from-rose-500 to-orange-500',
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      text: 'text-rose-700',
    },
    {
      val: '2' as const,
      label: 'Well-below 2°C',
      badge: t('compliance.sbti.step2.ambition.standard.badge', 'Trajectoire standard'),
      desc: t('compliance.sbti.step2.ambition.standard.desc', 'Réduction annuelle ≥ 2,5 % sur le Scope 1+2. Minimum accepté par SBTi.'),
      icon: Globe,
      gradient: 'from-blue-500 to-cyan-500',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-bold text-gray-900 mb-1">{t('compliance.sbti.step2.ambitionTitle', "Niveau d'ambition climatique")}</p>
        <p className="text-xs text-gray-500 mb-4">{t('compliance.sbti.step2.ambitionDesc', 'Définit le rythme de réduction annuel de vos émissions.')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ambitions.map(({ val, label, badge, desc, icon: Icon, gradient, bg, border, text }) => {
            const selected = state.ambition === val;
            return (
              <button
                key={val}
                onClick={() => onChange({ ambition: val })}
                className={`relative text-left rounded-2xl border-2 p-5 transition-all ${
                  selected
                    ? `${border} ${bg} shadow-md`
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm bg-white'
                }`}
              >
                {selected && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle2 size={20} className={text} />
                  </div>
                )}
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-3 shadow-md`}>
                  <Icon size={18} className="text-white" />
                </div>
                <p className="text-base font-bold text-gray-900 mb-0.5">{label}</p>
                <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-2 ${selected ? text + ' ' + bg : 'text-gray-500 bg-gray-100'}`}>
                  {badge}
                </span>
                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      <SectionCard>
        <p className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 size={16} className="text-gray-400" />
          {t('compliance.sbti.step2.referenceEmissionsTitle', "Données d'émissions de référence")}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <FieldLabel icon={Calendar}>{t('compliance.sbti.step2.referenceYearLabel', 'Année de référence')}</FieldLabel>
            <InputField
              type="number"
              min={2000}
              max={CURRENT_YEAR}
              value={state.referenceYear}
              onChange={(e) => onChange({ referenceYear: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel>{t('compliance.sbti.step2.scope12EmissionsLabel', 'Émissions Scope 1+2 (tCO2e)')}</FieldLabel>
            <InputField
              type="number"
              min={0}
              value={state.scope12Emissions}
              onChange={(e) => onChange({ scope12Emissions: e.target.value })}
              placeholder="ex : 10 000"
            />
          </div>
          <div>
            <FieldLabel>{t('compliance.sbti.step2.scope3EmissionsLabel', 'Émissions Scope 3 (tCO2e)')}</FieldLabel>
            <InputField
              type="number"
              min={0}
              value={state.scope3Emissions}
              onChange={(e) => onChange({ scope3Emissions: e.target.value })}
              placeholder="ex : 50 000"
            />
          </div>
        </div>
      </SectionCard>

      {s12 > 0 && state.ambition && yearsTo2030 > 0 && (
        <div className="rounded-2xl bg-gradient-to-r from-indigo-50 to-indigo-100/50 border-2 border-indigo-200 p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-600/25">
              <Target size={18} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-indigo-900 mb-1">
                {t('compliance.sbti.step2.targetTitle', 'Objectif {{ambition}} pour 2030', { ambition: state.ambition === '1.5' ? '1,5°C' : 'Well-below 2°C' })}
              </p>
              <p className="text-sm text-indigo-800">
                {t('compliance.sbti.step2.targetDesc', 'Réduire de {{amount}} tCO2e vos émissions Scope 1+2', { amount: Math.round(targetReduction).toLocaleString('fr-FR') })}
              </p>
              <div className="flex items-center gap-3 mt-3">
                <div className="flex-1 h-2 bg-indigo-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, (targetReduction / s12) * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-indigo-700 tabular-nums whitespace-nowrap">
                  {Math.round(s12).toLocaleString('fr-FR')} → {Math.round(targetLevel).toLocaleString('fr-FR')} t
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Étape 3 — Engagements ─────────────────────────────────────────────────────
function Step3({ state, onChange }: { state: WorkflowState; onChange: (p: Partial<WorkflowState>) => void }) {
  const { t } = useTranslation();
  const reductionRate = state.ambition === '1.5' ? 4.2 : 2.5;
  const yearsTo2030 = 2030 - parseInt(state.referenceYear || String(LAST_YEAR));
  const totalReduction = Math.round(reductionRate * yearsTo2030 * 10) / 10;
  const s3Rate = 25;

  const defaultText = t(
    'compliance.sbti.step3.defaultCommitment',
    "[Nom entreprise] s'engage à réduire ses émissions de GES scope 1 et 2 de {{reduction}}% d'ici 2030 par rapport à {{refYear}}, et ses émissions scope 3 de {{s3Rate}}% sur la même période, conformément à la trajectoire SBTi {{trajectory}}.",
    {
      reduction: totalReduction,
      refYear: state.referenceYear || LAST_YEAR,
      s3Rate,
      trajectory: state.ambition === '1.5' ? '1,5°C' : 'Well-below 2°C',
    }
  );

  useEffect(() => {
    if (!state.commitmentText) {
      onChange({ commitmentText: defaultText });
    }
  }, []);

  return (
    <div className="space-y-5">
      <SectionCard>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <FileText size={16} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{t('compliance.sbti.step3.commitmentTitle', "Texte d'engagement officiel")}</p>
            <p className="text-xs text-gray-500">{t('compliance.sbti.step3.commitmentDesc', 'Ce texte sera inclus dans votre dossier de soumission SBTi. Vous pouvez le personnaliser.')}</p>
          </div>
        </div>
        <textarea
          value={state.commitmentText || defaultText}
          onChange={(e) => onChange({ commitmentText: e.target.value })}
          rows={6}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-gray-800 leading-relaxed transition-all"
        />
      </SectionCard>

      <SectionCard>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <Download size={16} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{t('compliance.sbti.step3.managementLetterTitle', 'Document de soutien de la direction')}</p>
            <p className="text-xs text-gray-500">{t('compliance.sbti.step3.managementLetterDesc', 'Lettre signée approuvant les objectifs climatiques (PDF, optionnel).')}</p>
          </div>
        </div>
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors cursor-pointer">
          <input
            type="file"
            accept=".pdf"
            className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-5 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 file:cursor-pointer cursor-pointer transition-colors"
          />
          <p className="mt-2 text-xs text-gray-400">{t('compliance.sbti.step3.acceptedFormats', 'Formats acceptés : PDF, max 10 Mo')}</p>
        </div>
      </SectionCard>

      {/* Summary preview */}
      <div className="rounded-2xl bg-gradient-to-r from-gray-50 to-gray-100/50 border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Info size={14} className="text-gray-400" />
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('compliance.sbti.step3.keyParamsPreview', 'Aperçu des paramètres clés')}</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MiniStat label={t('compliance.sbti.step3.miniStat.trajectory', 'Trajectoire')} value={state.ambition === '1.5' ? '1,5°C' : state.ambition === '2' ? 'WB2C' : '—'} />
          <MiniStat label={t('compliance.sbti.step3.miniStat.reductionS12', 'Réduction S1+2')} value={`${totalReduction}%`} />
          <MiniStat label={t('compliance.sbti.step3.miniStat.reductionS3', 'Réduction S3')} value={`${s3Rate}%`} />
          <MiniStat label={t('compliance.sbti.step3.miniStat.horizon', 'Horizon')} value={`${state.referenceYear || LAST_YEAR}–2030`} />
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-3 py-2.5 text-center">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-bold text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}

// ── Étape 4 — Soumettre ───────────────────────────────────────────────────────
interface BackendValidation {
  is_submission_ready: boolean;
  blockers: number;
  warnings: number;
  issues: Array<{ severity: string; code: string; message_fr: string; field?: string }>;
  summary_fr: string;
}

const getSbtiCriteria = (t: TFunction) => [
  { code: 'C1',    label: t('compliance.sbti.criteria.c1', 'Ancienneté de la baseline (≤ 5 ans)') },
  { code: 'C2',    label: t('compliance.sbti.criteria.c2', 'Horizon cible court terme (5–10 ans)') },
  { code: 'C3',    label: t('compliance.sbti.criteria.c3', 'Taux de réduction annuel (≥ 4,2 %/an pour 1,5°C)') },
  { code: 'C4',    label: t('compliance.sbti.criteria.c4', 'Année net-zéro définie (≤ 2050)') },
  { code: 'C5',    label: t('compliance.sbti.criteria.c5', 'Réduction long terme (≥ 90 %)') },
  { code: 'C7',    label: t('compliance.sbti.criteria.c7', 'Cible Scope 3 si > 40 % des émissions totales') },
  { code: 'C9',    label: t('compliance.sbti.criteria.c9', 'Couverture Scope 1+2 obligatoire') },
  { code: 'ADMIN', label: t('compliance.sbti.criteria.adminName', "Nom de l'organisation renseigné") },
  { code: 'ADMIN', label: t('compliance.sbti.criteria.adminEmail', 'Email de contact renseigné') },
];

function CriteriaBadge({ code, issues }: {
  code: string;
  issues: BackendValidation['issues'] | null;
}) {
  const { t } = useTranslation();
  if (!issues) {
    return <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-400">{t('compliance.sbti.criteriaBadge.pending', 'EN ATTENTE')}</span>;
  }
  const match = issues.find(i => i.code === code);
  if (!match) return <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">{t('compliance.sbti.criteriaBadge.pass', 'PASS ✓')}</span>;
  if (match.severity === 'blocker') return <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">{t('compliance.sbti.criteriaBadge.blocker', 'BLOQUANT ✗')}</span>;
  return <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">{t('compliance.sbti.criteriaBadge.warning', 'AVERT. ⚠')}</span>;
}

function ReadinessGauge({ blockers, warnings }: { blockers: number; warnings: number }) {
  const raw = ((9 - blockers - warnings * 0.5) / 9) * 100;
  const score = Math.max(0, Math.min(100, Math.round(raw)));
  const color = score >= 80 ? '#059669' : score >= 50 ? '#d97706' : '#dc2626';
  const r = 22, cx = 28, cy = 28;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - score / 100);
  return (
    <div className="relative w-14 h-14">
      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth="4" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circumference} strokeDashoffset={dashOffset} strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold" style={{ color }}>
        {score}%
      </span>
    </div>
  );
}

function Step4({ state }: { state: WorkflowState }) {
  const { t } = useTranslation();
  const SECTORS = getSectors(t);
  const SBTI_CRITERIA = getSbtiCriteria(t);
  const [backendBusy, setBackendBusy] = useState(false);
  const [validation, setValidation] = useState<BackendValidation | null>(null);

  const buildPayload = () => {
    const scope12 = parseFloat(state.scope12Emissions) || 0;
    const scope3  = parseFloat(state.scope3Emissions)  || 0;
    const total   = scope12 + scope3;
    const baselineYear = parseInt(state.referenceYear) || LAST_YEAR;
    return {
      method: state.ambition === '1.5' ? '1.5C' : 'WB2C',
      baseline_year: baselineYear,
      baseline_scope1_tco2e: scope12 ? scope12 * 0.55 : null,
      baseline_scope2_tco2e: scope12 ? scope12 * 0.45 : null,
      baseline_scope3_tco2e: scope3 || null,
      baseline_total_tco2e: total || scope12 || 1,
      near_term_target_year: baselineYear + 7,
      near_term_reduction_pct: state.ambition === '1.5' ? 42 : 25,
      near_term_scope_coverage: 'scope1+2',
      net_zero_year: 2050,
      long_term_reduction_pct: 90,
      scope3_pct_of_total: total > 0 ? (scope3 / total) * 100 : 0,
      scope3_screening_completed: !!state.hasScope3,
      scope3_target_pct: state.hasScope3 ? 25 : null,
      sector: state.sector || undefined,
      employees: state.employees ? parseInt(state.employees) : undefined,
      revenue_meur: state.revenue ? parseFloat(state.revenue) : undefined,
      notes: state.commitmentText || undefined,
    };
  };

  const generateBackendDossier = async () => {
    setBackendBusy(true);
    setValidation(null);
    try {
      const res = await api.post('/sbti/commitments', buildPayload());
      const commitmentId = res.data.id;
      const vRes = await api.post<BackendValidation>(`/sbti/commitments/${commitmentId}/validate`);
      setValidation(vRes.data);
      const dossier = await api.get(`/sbti/commitments/${commitmentId}/dossier`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([dossier.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `SBTi_Dossier_Officiel_${CURRENT_YEAR}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t('compliance.sbti.step4.toast.dossierGenerated', 'Dossier officiel généré et engagement persisté'));
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || t('compliance.sbti.step4.toast.generationError', 'Erreur lors de la génération'));
    } finally {
      setBackendBusy(false);
    }
  };

  // Auto-run validation on mount (after generateBackendDossier is defined)
  useEffect(() => {
    generateBackendDossier();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = [
    { label: t('compliance.sbti.step4.rows.scope12', 'Scope 1+2 calculé'), value: state.hasScope12 ? t('compliance.sbti.yes', 'Oui') : t('compliance.sbti.no', 'Non'), ok: !!state.hasScope12 },
    { label: t('compliance.sbti.step4.rows.scope3', 'Scope 3 calculé'), value: state.hasScope3 ? t('compliance.sbti.yes', 'Oui') : t('compliance.sbti.no', 'Non'), ok: !!state.hasScope3 },
    { label: t('compliance.sbti.step4.rows.sector', 'Secteur'), value: state.sector ? SECTORS.find(s => s.value === state.sector)?.label || state.sector : '—', ok: !!state.sector },
    { label: t('compliance.sbti.step4.rows.employees', 'Employés'), value: state.employees || '—', ok: !!state.employees },
    { label: t('compliance.sbti.step4.rows.ambition', 'Ambition'), value: state.ambition === '1.5' ? '1,5°C' : state.ambition === '2' ? 'Well-below 2°C' : '—', ok: !!state.ambition },
    { label: t('compliance.sbti.step4.rows.referenceYear', 'Année de référence'), value: state.referenceYear || '—', ok: !!state.referenceYear },
    { label: t('compliance.sbti.step4.rows.scope12Emissions', 'Émissions Scope 1+2'), value: state.scope12Emissions ? `${parseFloat(state.scope12Emissions).toLocaleString('fr-FR')} tCO2e` : '—', ok: !!state.scope12Emissions },
    { label: t('compliance.sbti.step4.rows.scope3Emissions', 'Émissions Scope 3'), value: state.scope3Emissions ? `${parseFloat(state.scope3Emissions).toLocaleString('fr-FR')} tCO2e` : '—', ok: !!state.scope3Emissions },
  ];

  const filledCount = rows.filter(r => r.ok).length;

  return (
    <div className="space-y-5">

      {/* ── 💰 Savings banner ──────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 px-5 py-4">
        <span className="text-2xl flex-shrink-0">💰</span>
        <div>
          <p className="text-sm font-bold text-emerald-900">{t('compliance.sbti.step4.savingsBanner', "Ce pré-vol vous fait économiser jusqu'à 9 500 $")}</p>
          <p className="text-xs text-emerald-700 mt-0.5 leading-relaxed">
            {t('compliance.sbti.step4.savingsBannerDesc', 'Le SBTi facture ce montant pour la validation officielle — rejetée si les critères ne sont pas respectés. Notre wizard détecte automatiquement les blockers avant soumission.')}
          </p>
        </div>
      </div>

      {/* ── Readiness gauge + header ────────────────────────────────────────── */}
      <div className="flex items-center gap-4 mb-2">
        <ReadinessGauge
          blockers={validation?.blockers ?? 0}
          warnings={validation?.warnings ?? 0}
        />
        <div>
          <p className="text-sm font-bold text-gray-900">
            {backendBusy ? t('compliance.sbti.step4.prevalidating', 'Pré-validation en cours…') : validation
              ? (validation.is_submission_ready ? t('compliance.sbti.step4.dossierReady', 'Dossier prêt pour soumission SBTi ✓') : t('compliance.sbti.step4.blockingCriteria', '{{count}} critère(s) bloquant(s)', { count: validation.blockers }))
              : t('compliance.sbti.step4.dossierSummary', 'Récapitulatif de votre dossier')}
          </p>
          <p className="text-xs text-gray-500">
            {filledCount === rows.length
              ? t('compliance.sbti.step4.allFieldsFilled', 'Tous les champs sont renseignés — votre dossier est complet.')
              : t('compliance.sbti.step4.missingFields', '{{count}} champ(s) manquant(s) — complétez les étapes précédentes.', { count: rows.length - filledCount })}
          </p>
        </div>
      </div>

      {/* Summary table */}
      <div className="rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-100">
            {rows.map(({ label, value, ok }) => (
              <tr key={label} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-3 text-gray-500 font-medium w-56 flex items-center gap-2">
                  {ok ? (
                    <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                  )}
                  {label}
                </td>
                <td className={`px-5 py-3 font-semibold ${ok ? 'text-gray-900' : 'text-gray-400'}`}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {state.commitmentText && (
        <div className="rounded-xl bg-gray-50 border border-gray-200 px-5 py-4 text-sm text-gray-700 italic leading-relaxed">
          "{state.commitmentText}"
        </div>
      )}

      {/* ── SBTi v5.2 Criteria Checklist ───────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
          <Shield size={14} className="text-indigo-600" />
          <span className="text-sm font-bold text-gray-800">{t('compliance.sbti.step4.criteriaTitle', 'Critères SBTi v5.2 — Résultats du pré-vol')}</span>
          {backendBusy && <span className="text-xs text-gray-400 ml-auto">{t('compliance.sbti.step4.analysing', 'Analyse en cours…')}</span>}
        </div>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-100">
            {SBTI_CRITERIA.map((c, i) => (
              <tr key={i} className="hover:bg-gray-50/50">
                <td className="px-5 py-2.5 w-16">
                  <span className="text-[10px] font-bold text-gray-400 font-mono">{c.code}</span>
                </td>
                <td className="px-3 py-2.5 text-gray-700 text-xs">{c.label}</td>
                <td className="px-5 py-2.5 text-right">
                  <CriteriaBadge code={c.code} issues={validation?.issues ?? null} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <a
          href="https://sciencebasedtargets.org/companies-taking-action"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <ExternalLink size={14} />
          {t('compliance.sbti.step4.submitPortal', 'Soumettre sur le portail SBTi')}
        </a>
        <button
          onClick={async () => {
            try {
              const { default: jsPDF } = await import('jspdf');
              const { default: autoTable } = await import('jspdf-autotable');
              const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
              const pageW = 210;

              doc.setFillColor(67, 56, 202);
              doc.rect(0, 0, pageW, 28, 'F');
              doc.setFillColor(99, 102, 241);
              doc.rect(0, 28, pageW, 2, 'F');
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(16);
              doc.setTextColor(255, 255, 255);
              doc.text(t('compliance.sbti.step4.pdf.title', 'Dossier de soumission SBTi'), 12, 12);
              doc.setFontSize(9);
              doc.setFont('helvetica', 'normal');
              doc.text(`Science Based Targets initiative  ·  ${CURRENT_YEAR}`, 12, 22);

              autoTable(doc, {
                startY: 36,
                margin: { left: 12, right: 12 },
                head: [[t('compliance.sbti.step4.pdf.colParam', 'Paramètre'), t('compliance.sbti.step4.pdf.colValue', 'Valeur')]],
                body: rows.map(r => [r.label, r.value]),
                headStyles: { fillColor: [67, 56, 202], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
                bodyStyles: { fontSize: 9 },
                columnStyles: { 0: { cellWidth: 90, fontStyle: 'bold' } },
                alternateRowStyles: { fillColor: [238, 242, 255] },
                theme: 'grid',
              });

              let y = (doc as any).lastAutoTable.finalY + 10;
              if (state.commitmentText) {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(11);
                doc.setTextColor(67, 56, 202);
                doc.text(t('compliance.sbti.step3.commitmentTitle', "Texte d'engagement officiel"), 12, y);
                y += 4;
                autoTable(doc, {
                  startY: y,
                  margin: { left: 12, right: 12 },
                  body: [[state.commitmentText]],
                  bodyStyles: { fontSize: 9, textColor: [30, 30, 30], minCellHeight: 20 },
                  theme: 'plain',
                });
              }

              doc.setFont('helvetica', 'normal');
              doc.setFontSize(7);
              doc.setTextColor(150, 150, 150);
              doc.text(`SBTi Dossier  ·  ESG Flow  ·  ${new Date().toLocaleDateString('fr-FR')}`, pageW / 2, 292, { align: 'center' });
              doc.save(`SBTi_Dossier_${CURRENT_YEAR}.pdf`);
              toast.success(t('compliance.sbti.step4.toast.pdfDownloaded', 'PDF téléchargé'));
            } catch {
              toast.error(t('compliance.sbti.step4.toast.pdfError', 'Erreur lors de la génération du PDF'));
            }
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Printer size={14} />
          {t('compliance.sbti.step4.quickPdf', 'PDF rapide')}
        </button>
        <button
          onClick={generateBackendDossier}
          disabled={backendBusy}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-60 shadow-sm"
        >
          <Shield size={14} />
          {backendBusy ? t('compliance.sbti.step4.generating', 'Génération…') : t('compliance.sbti.step4.officialDossierBtn', 'Dossier officiel + pré-validation')}
        </button>
      </div>

      {/* Validation result */}
      {validation && (
        <div
          className={`rounded-2xl border-2 p-5 ${
            validation.is_submission_ready
              ? 'border-emerald-200 bg-emerald-50'
              : 'border-amber-200 bg-amber-50'
          }`}
        >
          <div className="flex items-start gap-3">
            {validation.is_submission_ready ? (
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={16} className="text-white" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0">
                <AlertCircle size={16} className="text-white" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-bold ${validation.is_submission_ready ? 'text-emerald-900' : 'text-amber-900'}`}>
                {validation.is_submission_ready
                  ? t('compliance.sbti.step4.submissionReady', 'Dossier prêt pour soumission SBTi')
                  : t('compliance.sbti.step4.blockersCount', '{{count}} critère(s) bloquant(s)', { count: validation.blockers })}
                {validation.warnings > 0 && ` · ${t('compliance.sbti.step4.warningsCount', '{{count}} avertissement(s)', { count: validation.warnings })}`}
              </p>
              <p className="text-xs text-gray-700 mt-1">{validation.summary_fr}</p>
              {validation.issues && validation.issues.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {validation.issues.slice(0, 6).map((iss, i) => (
                    <li key={i} className="text-xs text-gray-700 flex items-start gap-2">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0 ${
                          iss.severity === 'blocker'
                            ? 'bg-red-100 text-red-700'
                            : iss.severity === 'warning'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {iss.code}
                      </span>
                      <span>{iss.message_fr}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400">
        {t('compliance.sbti.step4.footerNote', 'La soumission finale se fait sur le portail SBTi. Le dossier officiel contient la pré-validation contre les critères SBTi v5.2.')}
      </p>
    </div>
  );
}

// ── Étape 5 — Suivi ───────────────────────────────────────────────────────────
function Step5({ state, onChange }: { state: WorkflowState; onChange: (p: Partial<WorkflowState>) => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isValidated = state.submissionStatus === 'Validé';
  const isPending = state.submissionStatus === 'En attente de validation';
  const isRejected = state.submissionStatus === 'Rejeté';

  const daysSinceSubmission = state.submissionDate
    ? Math.max(0, Math.floor((Date.now() - new Date(state.submissionDate).getTime()) / 86400000))
    : null;

  const expectedDays = 120;
  const progressPct = daysSinceSubmission !== null ? Math.min(100, (daysSinceSubmission / expectedDays) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Tracking form */}
      <SectionCard>
        <p className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar size={16} className="text-gray-400" />
          {t('compliance.sbti.step5.trackingTitle', 'Suivi de la soumission')}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <FieldLabel icon={Calendar}>{t('compliance.sbti.step5.submissionDateLabel', 'Date de soumission')}</FieldLabel>
            <InputField
              type="date"
              value={state.submissionDate}
              onChange={(e) => onChange({ submissionDate: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel>{t('compliance.sbti.step5.sbtiStatusLabel', 'Statut SBTi')}</FieldLabel>
            <SelectField
              value={state.submissionStatus}
              onChange={(e) => onChange({ submissionStatus: e.target.value })}
            >
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </SelectField>
          </div>
          {isValidated && (
            <div>
              <FieldLabel icon={CheckCircle2}>{t('compliance.sbti.step5.validationDateLabel', 'Date de validation')}</FieldLabel>
              <InputField
                type="date"
                value={state.validationDate}
                onChange={(e) => onChange({ validationDate: e.target.value })}
              />
            </div>
          )}
        </div>
      </SectionCard>

      {/* Status banners */}
      {isValidated && (
        <div className="rounded-2xl border-2 border-emerald-200 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0">
                <Award size={28} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{t('compliance.sbti.step5.validatedTitle', 'Objectifs SBTi validés')}</h3>
                <p className="text-sm text-emerald-100">
                  {t('compliance.sbti.step5.validatedDesc', 'Engagement officiellement reconnu par la Science Based Targets initiative.')}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <SummaryCell label={t('compliance.sbti.step5.summary.method', 'Méthode')} value={state.ambition === '1.5' ? '1,5°C' : state.ambition === '2' ? 'WB2C' : '—'} />
              <SummaryCell label={t('compliance.sbti.step5.summary.base', 'Base')} value={state.referenceYear || '—'} />
              <SummaryCell label="Scope 1+2" value={state.scope12Emissions ? `${parseFloat(state.scope12Emissions).toLocaleString('fr-FR')} t` : '—'} />
              <SummaryCell label="Scope 3" value={state.scope3Emissions ? `${parseFloat(state.scope3Emissions).toLocaleString('fr-FR')} t` : '—'} />
            </div>
            <div className="flex flex-wrap gap-2">
              <ActionButton icon={FileText} label={t('compliance.sbti.step5.addToCsrd', 'Ajouter au rapport CSRD')} onClick={() => navigate('/app/reports')} variant="primary" />
              <ActionButton icon={BarChart3} label={t('compliance.sbti.step5.decarbonatePlan', 'Plan de décarbonation')} onClick={() => navigate('/app/decarbonation')} />
              <ActionButton
                icon={Share2}
                label={t('compliance.sbti.step5.copyAnnouncement', 'Copier annonce publique')}
                onClick={() => {
                  const text = t('compliance.sbti.step5.announcementText', 'Notre entreprise a validé ses cibles climatiques auprès du SBTi ({{method}}, base {{year}})', { method: state.ambition === '1.5' ? '1,5°C' : 'Well-Below 2°C', year: state.referenceYear || '—' });
                  navigator.clipboard.writeText(text).then(() => toast.success(t('compliance.sbti.step5.toast.textCopied', 'Texte copié')));
                }}
              />
              <a
                href="https://sciencebasedtargets.org/companies-taking-action"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-xs font-semibold transition-colors"
              >
                <ExternalLink size={13} />
                {t('compliance.sbti.step5.publicProfile', 'Profil public SBTi')}
              </a>
            </div>
          </div>
        </div>
      )}

      {isPending && (
        <div className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white overflow-hidden">
          <div className="p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-amber-500/25">
                <Clock size={22} className="text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-amber-900 mb-1">{t('compliance.sbti.step5.pendingTitle', 'En attente de validation SBTi')}</h3>
                <p className="text-sm text-amber-800 leading-relaxed mb-3">
                  {t('compliance.sbti.step5.pendingDesc', 'La validation prend en moyenne 3 à 6 mois.')}
                  {daysSinceSubmission !== null && (
                    <> {t('compliance.sbti.step5.submittedDaysAgo', 'Soumis il y a {{count}} jour(s).', { count: daysSinceSubmission })}</>
                  )}
                </p>
                {daysSinceSubmission !== null && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs text-amber-700 mb-1">
                      <span>{t('compliance.sbti.step5.dayCount', 'Jour {{n}}', { n: daysSinceSubmission })}</span>
                      <span>{t('compliance.sbti.step5.estimatedDays', '~{{n}} jours (estimation)', { n: expectedDays })}</span>
                    </div>
                    <div className="h-2 bg-amber-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-700"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                )}
                <ActionButton icon={BarChart3} label={t('compliance.sbti.step5.startDecarbonatePlan', 'Démarrer le plan de décarbonation')} onClick={() => navigate('/app/decarbonation')} variant="amber" />
              </div>
            </div>
          </div>
        </div>
      )}

      {isRejected && (
        <div className="rounded-2xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-white p-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-red-500/25">
              <AlertCircle size={22} className="text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-red-900 mb-1">{t('compliance.sbti.step5.rejectedTitle', 'Soumission rejetée')}</h3>
              <p className="text-sm text-red-800 leading-relaxed mb-3">
                {t('compliance.sbti.step5.rejectedDesc', 'Corrigez les écarts signalés dans le retour SBTi, puis re-soumettez. Notre dossier officiel pré-valide contre les 7 critères v5.2.')}
              </p>
              <ActionButton icon={ArrowRight} label={t('compliance.sbti.step5.regenerateDossier', 'Régénérer le dossier')} onClick={() => navigate('/app/decarbonation')} variant="danger" />
            </div>
          </div>
        </div>
      )}

      {state.submissionStatus === 'Non soumis' && (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gray-200 flex items-center justify-center mx-auto mb-3">
            <Target size={22} className="text-gray-400" />
          </div>
          <p className="text-sm font-semibold text-gray-700 mb-1">{t('compliance.sbti.step5.notYetSubmitted', 'Pas encore soumis')}</p>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            {t('compliance.sbti.step5.notSubmittedDesc', 'Une fois votre dossier soumis sur sciencebasedtargets.org, renseignez la date ci-dessus et mettez le statut à "En attente de validation".')}
          </p>
        </div>
      )}
    </div>
  );
}

function ActionButton({ icon: Icon, label, onClick, variant = 'default' }: { icon: LucideIcon; label: string; onClick: () => void; variant?: 'primary' | 'default' | 'amber' | 'danger' }) {
  const styles = {
    primary: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm',
    default: 'bg-white hover:bg-gray-50 border border-gray-200 text-gray-700',
    amber: 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm',
  };
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${styles[variant]}`}>
      <Icon size={13} />
      {label}
    </button>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-emerald-50 rounded-xl border border-emerald-200 px-3 py-2.5 text-center">
      <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-bold text-gray-900 tabular-nums mt-0.5 truncate">{value}</p>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────────
export default function SBTiWorkflow() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WorkflowState>(loadState);

  const STEPS: StepDef[] = [
    { label: t('compliance.sbti.steps.eligibility', 'Éligibilité'),  subtitle: t('compliance.sbti.steps.eligibilitySub', 'Vérifiez vos prérequis'),       icon: STEP_ICONS[0] },
    { label: t('compliance.sbti.steps.ambition',    'Ambition'),     subtitle: t('compliance.sbti.steps.ambitionSub',    'Choisissez votre trajectoire'),   icon: STEP_ICONS[1] },
    { label: t('compliance.sbti.steps.commitments', 'Engagements'),  subtitle: t('compliance.sbti.steps.commitmentsSub', 'Rédigez votre engagement'),       icon: STEP_ICONS[2] },
    { label: t('compliance.sbti.steps.submit',      'Soumettre'),    subtitle: t('compliance.sbti.steps.submitSub',      'Validez et générez le dossier'),  icon: STEP_ICONS[3] },
    { label: t('compliance.sbti.steps.tracking',    'Suivi'),        subtitle: t('compliance.sbti.steps.trackingSub',    'Suivez la validation SBTi'),      icon: STEP_ICONS[4] },
  ];

  const update = useCallback((patch: Partial<WorkflowState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      saveState(next);
      return next;
    });
  }, []);

  const canGoNext = step < STEPS.length - 1;
  const canGoPrev = step > 0;
  const isLastStep = step === STEPS.length - 1;

  const StepIcon = STEPS[step].icon;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Hero */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-600/25">
              <Target size={24} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                  SBTi · Criteria v5.2
                </span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{t('compliance.sbti.hero.title', 'Workflow SBTi')}</h1>
            </div>
          </div>
          <p className="text-sm text-gray-500 ml-16">
            {t('compliance.sbti.hero.subtitle', "Préparez votre soumission d'objectifs Science Based Targets — pré-validation automatique")}
          </p>
        </div>

        {/* Stepper */}
        <StepBar current={step} onStepClick={setStep} steps={STEPS} />

        {/* Step content */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-7 py-7 mb-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
              <StepIcon size={18} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {t('compliance.sbti.stepHeader', 'Étape {{n}} — {{label}}', { n: step + 1, label: STEPS[step].label })}
              </h2>
              <p className="text-xs text-gray-500">{STEPS[step].subtitle}</p>
            </div>
          </div>

          {step === 0 && <Step1 state={state} onChange={update} />}
          {step === 1 && <Step2 state={state} onChange={update} />}
          {step === 2 && <Step3 state={state} onChange={update} />}
          {step === 3 && <Step4 state={state} />}
          {step === 4 && <Step5 state={state} onChange={update} />}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setStep((s) => s - 1)}
            disabled={!canGoPrev}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={15} />
            {t('compliance.sbti.nav.previous', 'Précédent')}
          </button>

          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i <= step ? 'bg-indigo-600 w-6' : 'bg-gray-200 w-3 hover:bg-gray-300'
                }`}
              />
            ))}
          </div>

          {!isLastStep ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canGoNext}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {t('compliance.sbti.nav.next', 'Suivant')}
              <ChevronRight size={15} />
            </button>
          ) : (
            <button
              onClick={() => navigate('/app')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <Home size={14} />
              {t('compliance.sbti.nav.dashboard', 'Tableau de bord')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
