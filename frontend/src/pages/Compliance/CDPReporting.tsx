import { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart2, Leaf, Shield, Target, Zap, Database, CheckCircle,
  FileText, Save, Award, ChevronDown, ChevronUp, Info, RefreshCw,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import toast from 'react-hot-toast';
import api from '@/services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type QType = 'text' | 'textarea' | 'select' | 'yesno' | 'number' | 'multiselect';

interface CDPQuestion {
  id: string;
  text: string;
  type: QType;
  options?: string[];
  prefillKey?: string;
  required?: boolean;
  subOf?: string;
}

interface CDPSection {
  id: string;
  code: string;
  title: string;
  description: string;
  questions: CDPQuestion[];
}

type Responses = Record<string, Record<string, string | string[]>>;

// ─── Sections C1-C12 ─────────────────────────────────────────────────────────

const getSECTIONS = (t: TFunction): CDPSection[] => [
  {
    id: 'C1', code: 'C1',
    title: t('compliance.cdp.section.C1.title', 'Gouvernance climatique'),
    description: t('compliance.cdp.section.C1.description', "Supervision du conseil d'administration et attribution des responsabilités"),
    questions: [
      { id: 'C1.1', text: t('compliance.cdp.q.C1.1', "Le conseil d'administration ou un organe équivalent supervise-t-il les questions liées au changement climatique ?"), type: 'yesno' },
      { id: 'C1.1a', text: t('compliance.cdp.q.C1.1a', "Décrivez le mécanisme de supervision du conseil sur les enjeux climatiques."), type: 'textarea', subOf: 'C1.1' },
      { id: 'C1.2', text: t('compliance.cdp.q.C1.2', "À quel niveau la responsabilité climatique est-elle assignée ?"), type: 'select', options: [t('compliance.cdp.opt.C1.2.membrecaDedié', "Membre du CA dédié"), t('compliance.cdp.opt.C1.2.comiteAudit', "Comité d'audit"), t('compliance.cdp.opt.C1.2.comiteRse', "Comité RSE/Durabilité"), t('compliance.cdp.opt.C1.2.directionGenerale', "Direction générale"), t('compliance.cdp.opt.C1.2.pasDeResponsabilite', "Pas de responsabilité spécifique")] },
      { id: 'C1.3', text: t('compliance.cdp.q.C1.3', "Décrivez l'intégration des objectifs climatiques dans la rémunération des dirigeants."), type: 'textarea' },
    ],
  },
  {
    id: 'C2', code: 'C2',
    title: t('compliance.cdp.section.C2.title', 'Risques & Opportunités climatiques'),
    description: t('compliance.cdp.section.C2.description', 'Identification et évaluation des risques physiques et de transition'),
    questions: [
      { id: 'C2.1', text: t('compliance.cdp.q.C2.1', "Avez-vous identifié des risques et opportunités climatiques avec impact potentiel sur votre activité ?"), type: 'yesno' },
      { id: 'C2.2a', text: t('compliance.cdp.q.C2.2a', "Type de risque climatique le plus significatif identifié"), type: 'select', options: [t('compliance.cdp.opt.C2.2a.transitionReglementaire', "Transition — réglementaire"), t('compliance.cdp.opt.C2.2a.transitionTechnologie', "Transition — technologie"), t('compliance.cdp.opt.C2.2a.transitionMarche', "Transition — marché"), t('compliance.cdp.opt.C2.2a.physiqueAigu', "Physique — aigu (événement extrême)"), t('compliance.cdp.opt.C2.2a.physiqueCronique', "Physique — chronique (tendances long terme)"), t('compliance.cdp.opt.C2.2a.reputation', "Réputation")] },
      { id: 'C2.2b', text: t('compliance.cdp.q.C2.2b', "Horizon temporel du risque prioritaire"), type: 'select', options: [t('compliance.cdp.opt.C2.2b.courtTerme', "Court terme (0-1 an)"), t('compliance.cdp.opt.C2.2b.moyenTerme', "Moyen terme (1-5 ans)"), t('compliance.cdp.opt.C2.2b.longTerme', "Long terme (> 5 ans)")] },
      { id: 'C2.3', text: t('compliance.cdp.q.C2.3', "Décrivez les 2 à 3 opportunités climatiques les plus significatives et leur impact financier estimé."), type: 'textarea' },
    ],
  },
  {
    id: 'C3', code: 'C3',
    title: t('compliance.cdp.section.C3.title', 'Stratégie et scénarios climatiques'),
    description: t('compliance.cdp.section.C3.description', 'Intégration du climat dans la stratégie long terme et analyse de scénarios'),
    questions: [
      { id: 'C3.1', text: t('compliance.cdp.q.C3.1', "Votre organisation a-t-elle intégré le changement climatique dans sa stratégie à long terme ?"), type: 'yesno' },
      { id: 'C3.2', text: t('compliance.cdp.q.C3.2', "Avez-vous réalisé une analyse par scénarios climatiques ?"), type: 'yesno' },
      { id: 'C3.2a', text: t('compliance.cdp.q.C3.2a', "Quels scénarios climatiques avez-vous utilisés ?"), type: 'multiselect', options: ["IEA NZE 2050", "IEA APS", "NGFS Net Zero 2050", "NGFS Delayed Transition", t('compliance.cdp.opt.C3.2a.scenario15', "Scénario < 1,5°C"), t('compliance.cdp.opt.C3.2a.scenario2', "Scénario 2°C"), t('compliance.cdp.opt.C3.2a.scenario4', "Scénario 4°C"), t('compliance.cdp.opt.C3.2a.scenarioPropriétaire', "Scénario propriétaire")], subOf: 'C3.2' },
      { id: 'C3.3', text: t('compliance.cdp.q.C3.3', "Comment les résultats de l'analyse par scénarios ont-ils influencé votre stratégie ?"), type: 'textarea' },
    ],
  },
  {
    id: 'C4', code: 'C4',
    title: t('compliance.cdp.section.C4.title', 'Objectifs et suivi de la performance'),
    description: t('compliance.cdp.section.C4.description', "Objectifs de réduction des émissions et état d'avancement"),
    questions: [
      { id: 'C4.1', text: t('compliance.cdp.q.C4.1', "Votre organisation a-t-elle fixé des objectifs de réduction des émissions de GES ?"), type: 'yesno' },
      { id: 'C4.1a', text: t('compliance.cdp.q.C4.1a', "Type d'objectif de réduction"), type: 'select', options: [t('compliance.cdp.opt.C4.1a.absolScope12', "Objectif absolu Scope 1+2"), t('compliance.cdp.opt.C4.1a.absolScope123', "Objectif absolu Scope 1+2+3"), t('compliance.cdp.opt.C4.1a.intensite', "Objectif d'intensité"), t('compliance.cdp.opt.C4.1a.netZeroSbti', "Objectif net zéro (SBTi)"), t('compliance.cdp.opt.C4.1a.aligne15', "Objectif aligné 1,5°C"), t('compliance.cdp.opt.C4.1a.autre', "Autre")] },
      { id: 'C4.1b', text: t('compliance.cdp.q.C4.1b', "Année de référence de l'objectif"), type: 'number', prefillKey: 'base_year' },
      { id: 'C4.1c', text: t('compliance.cdp.q.C4.1c', "Année cible de l'objectif"), type: 'number' },
      { id: 'C4.1d', text: t('compliance.cdp.q.C4.1d', "Pourcentage de réduction cible (%)"), type: 'number' },
      { id: 'C4.2', text: t('compliance.cdp.q.C4.2', "Avez-vous des objectifs de consommation d'énergie renouvelable ?"), type: 'yesno' },
      { id: 'C4.3', text: t('compliance.cdp.q.C4.3', "Statut d'avancement par rapport à vos objectifs climatiques"), type: 'select', options: [t('compliance.cdp.opt.C4.3.enAvance', "En avance sur l'objectif"), t('compliance.cdp.opt.C4.3.dansLesDelais', "Dans les délais"), t('compliance.cdp.opt.C4.3.enRetardAvecPlan', "En retard — actions correctives en cours"), t('compliance.cdp.opt.C4.3.enRetardSansPlan', "En retard — sans plan correctif")] },
    ],
  },
  {
    id: 'C5', code: 'C5',
    title: t('compliance.cdp.section.C5.title', 'Méthodologie de comptabilisation'),
    description: t('compliance.cdp.section.C5.description', 'Standards et approches utilisés pour le calcul des émissions'),
    questions: [
      { id: 'C5.1', text: t('compliance.cdp.q.C5.1', "Standard de comptabilisation des émissions utilisé"), type: 'select', options: ["GHG Protocol Corporate Standard", "ISO 14064-1", t('compliance.cdp.opt.C5.1.beges', "BEGES (France)"), "Bilan Carbone® ADEME", t('compliance.cdp.opt.C5.1.autre', "Autre")] },
      { id: 'C5.2', text: t('compliance.cdp.q.C5.2', "Approche retenue pour le Scope 2"), type: 'select', options: [t('compliance.cdp.opt.C5.2.locationBased', "Location-based uniquement"), t('compliance.cdp.opt.C5.2.marketBased', "Market-based uniquement"), t('compliance.cdp.opt.C5.2.deuxMethodes', "Les deux méthodes (dual reporting)")] },
    ],
  },
  {
    id: 'C6', code: 'C6',
    title: t('compliance.cdp.section.C6.title', "Données d'émissions GES"),
    description: t('compliance.cdp.section.C6.description', "Émissions Scope 1, 2 et 3 déclarées sur l'exercice"),
    questions: [
      { id: 'C6.1', text: t('compliance.cdp.q.C6.1', "Émissions Scope 1 (tCO2e)"), type: 'number', prefillKey: 'scope1_total' },
      { id: 'C6.2', text: t('compliance.cdp.q.C6.2', "Émissions Scope 2 — location-based (tCO2e)"), type: 'number', prefillKey: 'scope2_location' },
      { id: 'C6.2a', text: t('compliance.cdp.q.C6.2a', "Émissions Scope 2 — market-based (tCO2e)"), type: 'number', prefillKey: 'scope2_market' },
      { id: 'C6.3', text: t('compliance.cdp.q.C6.3', "Déclarez-vous les émissions Scope 3 ?"), type: 'yesno' },
      { id: 'C6.3a', text: t('compliance.cdp.q.C6.3a', "Total Scope 3 (tCO2e)"), type: 'number', prefillKey: 'scope3_total', subOf: 'C6.3' },
      { id: 'C6.4', text: t('compliance.cdp.q.C6.4', "Intensité carbone (tCO2e / M€ CA)"), type: 'number' },
      { id: 'C6.5', text: t('compliance.cdp.q.C6.5', "Tendance des émissions totales vs année précédente"), type: 'select', options: [t('compliance.cdp.opt.C6.5.diminution', "Diminution"), t('compliance.cdp.opt.C6.5.stable', "Stable"), t('compliance.cdp.opt.C6.5.augmentation', "Augmentation"), t('compliance.cdp.opt.C6.5.premiereAnnee', "Première année de reporting")] },
    ],
  },
  {
    id: 'C7', code: 'C7',
    title: t('compliance.cdp.section.C7.title', 'Ventilation des émissions'),
    description: t('compliance.cdp.section.C7.description', 'Décomposition par source, pays et activité'),
    questions: [
      { id: 'C7.1', text: t('compliance.cdp.q.C7.1', "Décrivez la décomposition des émissions Scope 1 par source (combustion, procédés, fuites)."), type: 'textarea' },
      { id: 'C7.2', text: t('compliance.cdp.q.C7.2', "Déclarez-vous vos émissions ventilées par pays ou région ?"), type: 'yesno' },
      { id: 'C7.3', text: t('compliance.cdp.q.C7.3', "Déclarez-vous vos émissions ventilées par activité ou division ?"), type: 'yesno' },
    ],
  },
  {
    id: 'C8', code: 'C8',
    title: t('compliance.cdp.section.C8.title', 'Données énergétiques'),
    description: t('compliance.cdp.section.C8.description', "Consommation totale et part des énergies renouvelables"),
    questions: [
      { id: 'C8.1', text: t('compliance.cdp.q.C8.1', "Consommation totale d'énergie (MWh)"), type: 'number' },
      { id: 'C8.2', text: t('compliance.cdp.q.C8.2', "dont énergie renouvelable (MWh)"), type: 'number' },
      { id: 'C8.3', text: t('compliance.cdp.q.C8.3', "Part d'énergie renouvelable (%)"), type: 'number' },
      { id: 'C8.4', text: t('compliance.cdp.q.C8.4', "Mécanisme de couverture EnR utilisé"), type: 'select', options: [t('compliance.cdp.opt.C8.4.certificats', "Certificats d'énergie renouvelable (EAC/GO)"), t('compliance.cdp.opt.C8.4.ppa', "Power Purchase Agreement (PPA)"), t('compliance.cdp.opt.C8.4.productionPropre', "Production propre (autoconsommation)"), t('compliance.cdp.opt.C8.4.reseauCertifie', "Réseau certifié 100 % EnR"), t('compliance.cdp.opt.C8.4.aucun', "Aucun")] },
    ],
  },
  {
    id: 'C9', code: 'C9',
    title: t('compliance.cdp.section.C9.title', 'Autres indicateurs climatiques'),
    description: t('compliance.cdp.section.C9.description', 'Tarification interne du carbone et investissements bas carbone'),
    questions: [
      { id: 'C9.1', text: t('compliance.cdp.q.C9.1', "Coût interne du carbone utilisé (€/tCO2e)"), type: 'number' },
      { id: 'C9.2', text: t('compliance.cdp.q.C9.2', "Avez-vous un mécanisme interne de tarification du carbone ?"), type: 'yesno' },
      { id: 'C9.3', text: t('compliance.cdp.q.C9.3', "Décrivez les investissements prévus en efficacité énergétique et technologies bas carbone (3 ans)."), type: 'textarea' },
    ],
  },
  {
    id: 'C10', code: 'C10',
    title: t('compliance.cdp.section.C10.title', 'Vérification tierce partie'),
    description: t('compliance.cdp.section.C10.description', "Niveau d'assurance externe des données d'émissions"),
    questions: [
      { id: 'C10.1', text: t('compliance.cdp.q.C10.1', "Niveau de vérification externe de vos données d'émissions"), type: 'select', options: [t('compliance.cdp.opt.C10.1.assuranceRaisonnable', "Assurance raisonnable (niveau audit)"), t('compliance.cdp.opt.C10.1.assuranceLimitee', "Assurance limitée"), t('compliance.cdp.opt.C10.1.revueIndependante', "Revue indépendante (sans assurance)"), t('compliance.cdp.opt.C10.1.pasDeVerification', "Pas de vérification externe")] },
      { id: 'C10.2', text: t('compliance.cdp.q.C10.2', "Vérificateur externe"), type: 'select', options: ["EY", "Deloitte", "KPMG", "PwC", "Bureau Veritas", "DNV", "SGS", "LRQA", t('compliance.cdp.opt.C10.2.autreTiers', "Autre tiers indépendant"), t('compliance.cdp.opt.C10.2.nonApplicable', "Non applicable")] },
      { id: 'C10.3', text: t('compliance.cdp.q.C10.3', "Le rapport de vérification est-il accessible publiquement ?"), type: 'yesno' },
    ],
  },
  {
    id: 'C11', code: 'C11',
    title: t('compliance.cdp.section.C11.title', 'Prix et marchés carbone'),
    description: t('compliance.cdp.section.C11.description', 'Systèmes de tarification carbone réglementaires et volontaires'),
    questions: [
      { id: 'C11.1', text: t('compliance.cdp.q.C11.1', "Vos activités sont-elles soumises à un système de tarification carbone réglementaire (EU ETS, taxe carbone) ?"), type: 'yesno' },
      { id: 'C11.2', text: t('compliance.cdp.q.C11.2', "Coûts liés aux quotas carbone réglementaires (k€)"), type: 'number', subOf: 'C11.1' },
      { id: 'C11.3', text: t('compliance.cdp.q.C11.3', "Avez-vous acheté des crédits carbone volontaires (VCU, Gold Standard) ?"), type: 'yesno' },
    ],
  },
  {
    id: 'C12', code: 'C12',
    title: t('compliance.cdp.section.C12.title', 'Engagement et influence'),
    description: t('compliance.cdp.section.C12.description', 'Engagement fournisseurs, clients et associations professionnelles'),
    questions: [
      { id: 'C12.1', text: t('compliance.cdp.q.C12.1', "Engagez-vous vos fournisseurs sur les enjeux climatiques (questionnaires, objectifs requis) ?"), type: 'yesno' },
      { id: 'C12.2', text: t('compliance.cdp.q.C12.2', "Engagez-vous vos clients sur les enjeux climatiques ?"), type: 'yesno' },
      { id: 'C12.3', text: t('compliance.cdp.q.C12.3', "Position dans les associations professionnelles sur le climat"), type: 'select', options: [t('compliance.cdp.opt.C12.3.membreActif', "Membre actif promouvant une politique climatique ambitieuse"), t('compliance.cdp.opt.C12.3.participationSansPosition', "Participation sans prise de position"), t('compliance.cdp.opt.C12.3.pasEngagement', "Pas d'engagement"), t('compliance.cdp.opt.C12.3.positionsNonAccordParis', "Positions ne correspondant pas à l'Accord de Paris")] },
      { id: 'C12.4', text: t('compliance.cdp.q.C12.4', "Décrivez vos initiatives d'engagement clients et chaîne de valeur en matière de décarbonation."), type: 'textarea' },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function CDPReporting() {
  const { t } = useTranslation();
  const SECTIONS = getSECTIONS(t);
  const [responses, setResponses] = useState<Responses>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['C1']));
  const [scoreEstimate, setScoreEstimate] = useState<{ band: string; pct: number } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Helpers ────────────────────────────────────────────────────────────────

  function sectionCompletion(sectionId: string, questions: CDPQuestion[]): number {
    const sRes = responses[sectionId] ?? {};
    const visible = questions.filter(q => !q.subOf || sRes[q.subOf] === 'yes');
    const filled = visible.filter(q => {
      const v = sRes[q.id];
      return v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0);
    });
    return visible.length === 0 ? 0 : Math.round((filled.length / visible.length) * 100);
  }

  const setAnswer = useCallback((sectionId: string, qId: string, value: string | string[]) => {
    setResponses(prev => {
      const updated = {
        ...prev,
        [sectionId]: { ...(prev[sectionId] ?? {}), [qId]: value },
      };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        api.post('/cdp/climate', { responses: updated }).catch(() => {});
        localStorage.setItem('cdp_climate_responses', JSON.stringify(updated));
      }, 2000);
      return updated;
    });
  }, []);

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ── Load ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    const local = localStorage.getItem('cdp_climate_responses');
    if (local) { try { setResponses(JSON.parse(local)); } catch {} }
    api.get('/cdp/climate').then(res => {
      if (res.data?.responses && Object.keys(res.data.responses).length > 0) {
        setResponses(res.data.responses);
      }
    }).catch(() => {}).finally(() => setLoading(false));
    api.get('/cdp/climate/score-estimate').then(res => {
      setScoreEstimate({ band: res.data.estimated_band, pct: res.data.completion_pct });
    }).catch(() => {});
  }, []);

  // ── Save ───────────────────────────────────────────────────────────────────

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await api.post('/cdp/climate', { responses });
      localStorage.setItem('cdp_climate_responses', JSON.stringify(responses));
      toast.success(t('compliance.cdp.toastSaved', 'Questionnaire CDP sauvegardé'));
    } catch {
      toast.error(t('compliance.cdp.toastSaveError', 'Erreur lors de la sauvegarde'));
    } finally {
      setSaving(false);
    }
  }, [responses, t]);

  // ── Question renderer ──────────────────────────────────────────────────────

  function renderQuestion(sec: CDPSection, q: CDPQuestion) {
    const sRes = responses[sec.id] ?? {};
    if (q.subOf && sRes[q.subOf] !== 'yes') return null;

    const val = sRes[q.id];
    const strVal = (val as string) ?? '';
    const arrVal = Array.isArray(val) ? (val as string[]) : [];

    const fieldClass = "w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all";

    return (
      <div key={q.id} className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700">
          {q.id} — {t(`compliance.cdp.q.${q.id}`, q.text)}
          {q.required && <span className="ml-1 text-red-500">*</span>}
        </label>

        {q.prefillKey && (
          <button
            type="button"
            onClick={() => toast(t('compliance.cdp.prefillToast', 'Ouvrez le module Bilan Carbone pour pré-remplir automatiquement'), { icon: 'ℹ️' })}
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 underline underline-offset-2"
          >
            <RefreshCw className="h-3 w-3" />
            {t('compliance.cdp.prefillButton', 'Pré-remplir depuis les données ESG')}
          </button>
        )}

        {q.type === 'yesno' && (
          <div className="flex gap-2">
            {['yes', 'no'].map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => setAnswer(sec.id, q.id, opt)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                  strVal === opt
                    ? opt === 'yes'
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-red-500 text-white border-red-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                {opt === 'yes' ? t('compliance.cdp.yes', 'Oui') : t('compliance.cdp.no', 'Non')}
              </button>
            ))}
          </div>
        )}

        {q.type === 'select' && (
          <select
            className={fieldClass}
            value={strVal}
            onChange={e => setAnswer(sec.id, q.id, e.target.value)}
          >
            <option value="">{t('compliance.cdp.selectPlaceholder', '-- Sélectionner --')}</option>
            {q.options?.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        )}

        {q.type === 'multiselect' && (
          <div className="grid grid-cols-2 gap-2">
            {q.options?.map(o => {
              const checked = arrVal.includes(o);
              return (
                <label key={o} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const next = checked ? arrVal.filter(x => x !== o) : [...arrVal, o];
                      setAnswer(sec.id, q.id, next);
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{o}</span>
                </label>
              );
            })}
          </div>
        )}

        {q.type === 'number' && (
          <input
            type="number"
            className={fieldClass}
            value={strVal}
            onChange={e => setAnswer(sec.id, q.id, e.target.value)}
            placeholder="0"
          />
        )}

        {q.type === 'text' && (
          <input
            type="text"
            className={fieldClass}
            value={strVal}
            onChange={e => setAnswer(sec.id, q.id, e.target.value)}
            placeholder={t('compliance.cdp.textPlaceholder', 'Votre réponse...')}
          />
        )}

        {q.type === 'textarea' && (
          <textarea
            rows={4}
            className={fieldClass}
            value={strVal}
            onChange={e => setAnswer(sec.id, q.id, e.target.value)}
            placeholder={t('compliance.cdp.textareaPlaceholder', 'Votre réponse détaillée...')}
          />
        )}
      </div>
    );
  }

  // ── Derived stats ──────────────────────────────────────────────────────────

  const totalFilled = SECTIONS.filter(s => sectionCompletion(s.id, s.questions) > 0).length;
  const globalPct = Math.round((totalFilled / SECTIONS.length) * 100);

  const bandColor = (band: string) => {
    if (band === 'A' || band === 'A-') return 'bg-green-100 text-green-700 border-green-200';
    if (band === 'B') return 'bg-blue-100 text-blue-700 border-blue-200';
    if (band === 'C') return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-red-100 text-red-700 border-red-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div
        className="relative px-6 py-10 text-white"
        style={{ background: 'linear-gradient(135deg,#0c1445 0%,#1e3a8a 50%,#1d4ed8 100%)' }}
      >
        <div className="mx-auto max-w-6xl flex items-start justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Leaf className="h-5 w-5 text-white" />
              </div>
              <span className="text-blue-200 text-sm font-medium tracking-wide uppercase">CDP Climate Change</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-1">
              {t('compliance.cdp.heroTitle', 'Questionnaire Climat 2024')}
            </h1>
            <p className="text-blue-200 text-sm mb-6">
              {t('compliance.cdp.heroSubtitle', 'Carbon Disclosure Project · Questionnaire Climat C1–C12 · Score A à D')}
            </p>

            {/* Progress */}
            <div className="flex items-center gap-4">
              <div className="flex-1 max-w-xs">
                <div className="flex justify-between text-xs text-blue-200 mb-1">
                  <span>{t('compliance.cdp.sectionsProgress', '{{filled}}/12 sections renseignées', { filled: totalFilled })}</span>
                  <span>{globalPct}%</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-500"
                    style={{ width: `${globalPct}%` }}
                  />
                </div>
              </div>
              {scoreEstimate && (
                <div className={`px-3 py-1.5 rounded-lg border text-sm font-bold ${bandColor(scoreEstimate.band)}`}>
                  {t('compliance.cdp.scoreEstimate', 'Score estimé : {{band}}', { band: scoreEstimate.band })}
                </div>
              )}
            </div>
          </div>

          {/* Save button */}
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-blue-700 rounded-xl font-semibold text-sm shadow hover:bg-blue-50 transition-colors disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? t('compliance.cdp.saving', 'Sauvegarde…') : t('compliance.cdp.save', 'Sauvegarder')}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-6xl px-6 py-8 flex gap-6">
        {/* Sidebar */}
        <aside className="w-52 flex-shrink-0">
          <div className="sticky top-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('compliance.cdp.sidebarSections', 'Sections')}</p>
            <ul className="space-y-1">
              {SECTIONS.map(sec => {
                const pct = sectionCompletion(sec.id, sec.questions);
                return (
                  <li key={sec.id}>
                    <button
                      onClick={() => {
                        toggleSection(sec.id);
                        document.getElementById(`section-${sec.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 text-left transition-colors"
                    >
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          pct === 100 ? 'bg-green-500' : pct > 0 ? 'bg-amber-400' : 'bg-gray-200'
                        }`}
                      />
                      <span className="text-xs font-medium text-gray-700">{sec.code} — {t(`compliance.cdp.section.${sec.id}.title`, sec.title)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 space-y-4">
          {SECTIONS.map(sec => {
            const expanded = expandedSections.has(sec.id);
            const completion = sectionCompletion(sec.id, sec.questions);

            return (
              <div
                key={sec.id}
                id={`section-${sec.id}`}
                className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden"
              >
                {/* Accordion header */}
                <button
                  onClick={() => toggleSection(sec.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {sec.code}
                    </span>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">{t(`compliance.cdp.section.${sec.id}.title`, sec.title)}</p>
                      <p className="text-xs text-gray-500">{t(`compliance.cdp.section.${sec.id}.description`, sec.description)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <span className={`text-sm font-semibold ${
                        completion === 100 ? 'text-green-600' : completion > 0 ? 'text-amber-600' : 'text-gray-400'
                      }`}>
                        {completion}%
                      </span>
                      <div className="w-24 h-1.5 bg-gray-200 rounded-full mt-1">
                        <div
                          className="h-full rounded-full bg-blue-600 transition-all duration-300"
                          style={{ width: `${completion}%` }}
                        />
                      </div>
                    </div>
                    {expanded
                      ? <ChevronUp className="h-5 w-5 text-gray-400" />
                      : <ChevronDown className="h-5 w-5 text-gray-400" />
                    }
                  </div>
                </button>

                {/* Accordion body */}
                {expanded && (
                  <div className="px-6 pb-6 border-t border-gray-100 space-y-5 pt-5">
                    {sec.questions.map(q => renderQuestion(sec, q))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Bottom save */}
          <div className="flex justify-end pt-2 pb-8">
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm shadow hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? t('compliance.cdp.savingLong', 'Sauvegarde en cours…') : t('compliance.cdp.saveQuestionnaire', 'Sauvegarder le questionnaire')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
