/**
 * FirstTimeSetup — 5-step onboarding wizard.
 *
 * 1. Profile        — Company name, sector, size, revenue, country, SIREN
 * 2. Regulations    — Applicable laws (CSRD, BEGES, CSDDD…) auto-suggested
 * 3. Indicators     — Pre-selection of indicators
 * 4. Import         — Choose initial data source (FEC, CSV, or skip)
 * 5. Invitations    — Invite teammates (optional)
 *
 * State is persisted backend-side via /onboarding/{profile,regulations,…} —
 * the user can leave and resume at the same step.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Leaf, Building2, ChevronRight, ChevronLeft, Check, Loader2,
  ShieldCheck, BarChart3, Upload, UserPlus, X, AlertCircle, Mail,
} from 'lucide-react';
import api from '@/services/api';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

// ─── Types ─────────────────────────────────────────────────────────────────
interface Sector { id: string; label: string; icon: string }
interface Range { value: number; label: string }
interface Regulation { level: string; wave: string | null; label: string }
interface IndicatorSuggestion {
  code: string; name: string; pillar: string; category: string;
  unit: string; framework: string; relevant: boolean;
}
interface OnboardingStatus {
  completed: boolean;
  current_step: number;
  profile: {
    org_name?: string; sector?: string; employee_count?: number;
    revenue_eur?: number; country_code?: string; siren?: string;
    is_listed?: boolean;
  };
  regulations: Record<string, Regulation>;
  selected_indicators: string[];
  import_choice?: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────
const TOTAL_STEPS = 5;

// Step labels (icon/idx fixed; 'Import' identical EN/FR → literal)
const getStepMeta = (t: TFunction) => [
  { idx: 1, label: t('setup.stepProfile', 'Profil'),              icon: Building2 },
  { idx: 2, label: t('setup.stepRegulations', 'Réglementations'), icon: ShieldCheck },
  { idx: 3, label: t('setup.stepIndicators', 'Indicateurs'),      icon: BarChart3 },
  { idx: 4, label: 'Import',                                      icon: Upload },
  { idx: 5, label: t('setup.stepTeam', 'Équipe'),                 icon: UserPlus },
];

// code = stored value (literal); label displayed (France/Portugal/Luxembourg identical → literal)
const getCountries = (t: TFunction) => [
  { code: 'FR', label: 'France' },
  { code: 'DE', label: t('setup.cDE', 'Allemagne') },
  { code: 'ES', label: t('setup.cES', 'Espagne') },
  { code: 'IT', label: t('setup.cIT', 'Italie') },
  { code: 'BE', label: t('setup.cBE', 'Belgique') },
  { code: 'NL', label: t('setup.cNL', 'Pays-Bas') },
  { code: 'PT', label: 'Portugal' },
  { code: 'LU', label: 'Luxembourg' },
  { code: 'CH', label: t('setup.cCH', 'Suisse') },
];

// sfdr description is its official English name → literal
const getRegulationDetails = (t: TFunction): Record<string, { description: string }> => ({
  csrd: { description: t('setup.regCsrd', 'Reporting durabilité harmonisé UE (12 normes ESRS)') },
  beges: { description: t('setup.regBeges', "Bilan d'émissions de GES réglementaire Art. L229-25") },
  csddd: { description: t('setup.regCsddd', 'Devoir de vigilance fournisseurs UE (chaîne de valeur)') },
  sapin_2: { description: t('setup.regSapin2', 'Plan de vigilance Loi 2017-399 (grands groupes FR)') },
  dpef: { description: t('setup.regDpef', 'Déclaration de Performance Extra-Financière (FR, en transition)') },
  taxonomy_eu: { description: t('setup.regTaxonomy', 'Taxonomie européenne — éligibilité + alignement DNSH') },
  sfdr: { description: 'Sustainable Finance Disclosure Regulation (asset managers)' },
});

// ─── Component ─────────────────────────────────────────────────────────────
export default function FirstTimeSetup() {
  const { t } = useTranslation();
  const STEP_META = getStepMeta(t);
  const COUNTRIES = getCountries(t);
  const REGULATION_DETAILS = getRegulationDetails(t);
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [employeeRanges, setEmployeeRanges] = useState<Range[]>([]);
  const [revenueRanges, setRevenueRanges] = useState<Range[]>([]);

  // Form state for each step
  const [profile, setProfile] = useState({
    org_name: '', sector: 'general',
    employee_count: 0, revenue_eur: 0,
    country_code: 'FR', siren: '', is_listed: false,
  });
  const [regulations, setRegulations] = useState<Record<string, Regulation>>({});
  const [selectedRegCodes, setSelectedRegCodes] = useState<Set<string>>(new Set());
  const [indicators, setIndicators] = useState<IndicatorSuggestion[]>([]);
  const [selectedIndCodes, setSelectedIndCodes] = useState<Set<string>>(new Set());
  const [importChoice, setImportChoice] = useState<'template' | 'fec' | 'csv' | 'skip'>('skip');
  const [invites, setInvites] = useState<Array<{ email: string; role: string }>>([]);

  // ── Init: load status + sectors + ranges ─────────────────────────────────
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [statusRes, sectorsRes, rangesRes] = await Promise.all([
          api.get<OnboardingStatus>('/onboarding/status'),
          api.get<Sector[]>('/onboarding/sectors'),
          api.get<{ employees: Range[]; revenues: Range[] }>('/onboarding/ranges'),
        ]);
        if (!mounted) return;
        setSectors(sectorsRes.data);
        setEmployeeRanges(rangesRes.data.employees);
        setRevenueRanges(rangesRes.data.revenues);

        if (statusRes.data.completed) {
          navigate('/app', { replace: true });
          return;
        }

        // Resume at saved step
        setStep(Math.max(1, Math.min(TOTAL_STEPS, statusRes.data.current_step)));
        if (statusRes.data.profile) {
          setProfile(prev => ({ ...prev, ...statusRes.data.profile }));
        }
        if (statusRes.data.regulations) {
          setRegulations(statusRes.data.regulations);
          setSelectedRegCodes(new Set(Object.keys(statusRes.data.regulations)));
        }
        if (statusRes.data.selected_indicators) {
          setSelectedIndCodes(new Set(statusRes.data.selected_indicators));
        }
        if (statusRes.data.import_choice && ['fec', 'csv', 'skip'].includes(statusRes.data.import_choice)) {
          setImportChoice(statusRes.data.import_choice as 'template' | 'fec' | 'csv' | 'skip');
        }
      } catch {
        if (mounted) setStep(1);
      }
    })();
    return () => { mounted = false; };
  }, [navigate]);

  // ── Submit handlers ──────────────────────────────────────────────────────
  const submitStep1 = async () => {
    if (!profile.org_name.trim()) { setError(t('setup.errOrgRequired', "Le nom de l'entreprise est requis.")); return; }
    setLoading(true); setError('');
    try {
      const res = await api.post('/onboarding/profile', profile);
      const suggested: Record<string, Regulation> = res.data.suggested_regulations || {};
      setRegulations(suggested);
      setSelectedRegCodes(new Set(Object.keys(suggested)));
      setStep(2);
    } catch {
      setError(t('setup.errSaveProfile', "Impossible d'enregistrer le profil. Réessayez."));
    } finally { setLoading(false); }
  };

  const submitStep2 = async () => {
    setLoading(true); setError('');
    try {
      await api.post('/onboarding/regulations', { codes: Array.from(selectedRegCodes) });
      const indRes = await api.get<{ indicators: IndicatorSuggestion[] }>('/onboarding/indicators/suggested');
      const list = indRes.data.indicators || [];
      setIndicators(list);
      setSelectedIndCodes(new Set(list.filter(i => i.relevant).map(i => i.code)));
      setStep(3);
    } catch {
      setError(t('setup.errSaveRegs', "Impossible d'enregistrer les réglementations."));
    } finally { setLoading(false); }
  };

  const submitStep3 = async () => {
    setLoading(true); setError('');
    try {
      await api.post('/onboarding/indicators', { codes: Array.from(selectedIndCodes) });
      setStep(4);
    } catch {
      setError(t('setup.errSaveIndicators', 'Impossible de sélectionner les indicateurs.'));
    } finally { setLoading(false); }
  };

  const submitStep4 = async () => {
    setLoading(true); setError('');
    try {
      await api.post('/onboarding/import', { choice: importChoice });
      setStep(5);
    } catch {
      setError(t('setup.errSaveImport', "Impossible d'enregistrer le choix d'import."));
    } finally { setLoading(false); }
  };

  const submitStep5 = async () => {
    setLoading(true); setError('');
    try {
      for (const inv of invites) {
        if (!inv.email) continue;
        try {
          await api.post('/users/invite', { email: inv.email, role: inv.role || 'data_entry' });
        } catch { /* fail-soft */ }
      }
      await api.post('/onboarding/complete');
      // If user chose template at step 4, take them straight to the gallery.
      if (importChoice === 'template') {
        navigate('/app/templates', { replace: true });
      } else {
        navigate('/app?welcome=1', { replace: true });
      }
    } catch {
      setError(t('setup.errComplete', "Impossible de finaliser l'onboarding."));
      setLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 py-10">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-extrabold text-gray-900">ESG Flow</span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-1">{t('setup.title', 'Configurez votre espace')}</h1>
          <p className="text-sm text-gray-500">{t('setup.subtitle', '5 étapes pour démarrer · vous pouvez revenir en arrière à tout moment')}</p>
        </div>

        <div className="flex items-center justify-between mb-8 px-4">
          {STEP_META.map((meta, idx) => {
            const Icon = meta.icon;
            const done = step > meta.idx;
            const current = step === meta.idx;
            return (
              <div key={meta.idx} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    done ? 'bg-emerald-500 text-white' :
                    current ? 'bg-emerald-100 text-emerald-700 ring-4 ring-emerald-100' :
                    'bg-gray-100 text-gray-400'
                  }`}>
                    {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className={`text-xs font-medium ${current ? 'text-emerald-700' : 'text-gray-500'}`}>
                    {meta.label}
                  </span>
                </div>
                {idx < STEP_META.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${done ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && (
            <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Step 1 — Profile */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">{t('setup.s1Title', 'Profil de votre entreprise')}</h2>
                <p className="text-sm text-gray-500">{t('setup.s1Desc', "Ces informations déterminent quelles réglementations s'appliquent.")}</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('setup.lblOrgName', "Nom de l'entreprise *")}</label>
                <input
                  type="text"
                  value={profile.org_name}
                  onChange={e => setProfile({ ...profile, org_name: e.target.value })}
                  placeholder="Acme SAS"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('setup.lblSector', "Secteur d'activité")}</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {sectors.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setProfile({ ...profile, sector: s.id })}
                      className={`p-3 border-2 rounded-lg text-left transition-all ${
                        profile.sector === s.id
                          ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-200'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-xl mb-0.5">{s.icon}</div>
                      <div className="text-xs font-medium text-gray-900">{s.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('setup.lblHeadcount', 'Effectif')}</label>
                  <select
                    value={profile.employee_count}
                    onChange={e => setProfile({ ...profile, employee_count: parseInt(e.target.value, 10) })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value={0}>{t('setup.selectPlaceholder', 'Sélectionner...')}</option>
                    {employeeRanges.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('setup.lblRevenue', "Chiffre d'affaires")}</label>
                  <select
                    value={profile.revenue_eur}
                    onChange={e => setProfile({ ...profile, revenue_eur: parseInt(e.target.value, 10) })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value={0}>{t('setup.selectPlaceholder', 'Sélectionner...')}</option>
                    {revenueRanges.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('setup.lblCountry', 'Pays')}</label>
                  <select
                    value={profile.country_code}
                    onChange={e => setProfile({ ...profile, country_code: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    {COUNTRIES.map(c => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    SIREN <span className="text-gray-400 font-normal">{t('setup.optional', '(optionnel)')}</span>
                  </label>
                  <input
                    type="text"
                    value={profile.siren || ''}
                    onChange={e => setProfile({ ...profile, siren: e.target.value.replace(/\D/g, '').slice(0, 9) })}
                    placeholder="123456789"
                    maxLength={9}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                <input
                  type="checkbox"
                  checked={profile.is_listed}
                  onChange={e => setProfile({ ...profile, is_listed: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-700">{t('setup.listedA', 'Notre entreprise est ')}<strong>{t('setup.listedStrong', 'cotée en bourse')}</strong></span>
              </label>
            </div>
          )}

          {/* Step 2 — Regulations */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">{t('setup.s2Title', 'Réglementations applicables')}</h2>
                <p className="text-sm text-gray-500">
                  {t('setup.s2Desc', "Voici ce qui s'applique selon votre profil. Décochez ce qui ne vous concerne pas.")}
                </p>
              </div>

              {Object.keys(regulations).length === 0 ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                  {t('setup.s2None', 'Aucune obligation majeure détectée — vous pouvez quand même structurer votre démarche ESG volontairement.')}
                </div>
              ) : (
                <div className="space-y-2">
                  {Object.entries(regulations).map(([code, reg]) => {
                    const checked = selectedRegCodes.has(code);
                    const meta = REGULATION_DETAILS[code] || { description: '' };
                    return (
                      <label
                        key={code}
                        className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          checked ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const next = new Set(selectedRegCodes);
                            if (checked) next.delete(code); else next.add(code);
                            setSelectedRegCodes(next);
                          }}
                          className="mt-1 w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900">{reg.label}</span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                              reg.level === 'mandatory' ? 'bg-red-100 text-red-700' :
                              reg.level === 'recommended' ? 'bg-amber-100 text-amber-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {reg.level === 'mandatory' ? t('setup.lvlMandatory', 'Obligatoire') :
                               reg.level === 'recommended' ? t('setup.lvlRecommended', 'Recommandé') : t('setup.lvlOptional', 'Optionnel')}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">{meta.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 3 — Indicators */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">{t('setup.s3Title', 'Indicateurs prioritaires')}</h2>
                <p className="text-sm text-gray-500">
                  {t('setup.s3Desc1', '{{count}} indicateurs suggérés selon votre secteur.', { count: indicators.length })} {t('setup.s3Desc2', '{{count}} sélectionnés.', { count: selectedIndCodes.size })}
                </p>
              </div>

              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setSelectedIndCodes(new Set(indicators.map(i => i.code)))}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 px-2 py-1"
                >
                  {t('setup.selectAll', 'Tout sélectionner')}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIndCodes(new Set())}
                  className="text-xs font-semibold text-gray-500 hover:text-gray-700 px-2 py-1"
                >
                  {t('setup.deselectAll', 'Tout désélectionner')}
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-1.5 pr-2">
                {indicators.map(ind => {
                  const checked = selectedIndCodes.has(ind.code);
                  return (
                    <label
                      key={ind.code}
                      className={`flex items-center gap-3 p-2.5 border rounded-lg cursor-pointer ${
                        checked ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const next = new Set(selectedIndCodes);
                          if (checked) next.delete(ind.code); else next.add(ind.code);
                          setSelectedIndCodes(next);
                        }}
                        className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-gray-400">{ind.code}</span>
                          <span className="text-sm font-medium text-gray-900 truncate">{ind.name}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                            ind.pillar === 'environmental' ? 'bg-green-100 text-green-700' :
                            ind.pillar === 'social' ? 'bg-blue-100 text-blue-700' :
                            'bg-violet-100 text-violet-700'
                          }`}>
                            {ind.pillar === 'environmental' ? 'E' : ind.pillar === 'social' ? 'S' : 'G'}
                          </span>
                          <span className="text-[11px] text-gray-500">{ind.category} · {ind.framework} · {ind.unit}</span>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 4 — Import */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">{t('setup.s4Title', 'Premier import de données')}</h2>
                <p className="text-sm text-gray-500">{t('setup.s4Desc', 'Choisissez comment démarrer. Vous pourrez en ajouter à tout moment.')}</p>
              </div>

              <div className="space-y-2">
                {[
                  { id: 'template', label: t('setup.impTemplateLabel', 'Pré-remplir avec un template sectoriel'), desc: t('setup.impTemplateDesc', 'Démarrez à ~50% de couverture CSRD : 20+ entrées typiques de votre secteur (valeurs à éditer ensuite).'), badge: t('setup.impTemplateBadge', '⚡ Le plus rapide') },
                  { id: 'fec', label: t('setup.impFecLabel', 'Import FEC'), desc: t('setup.impFecDesc', 'Importez votre Fichier des Écritures Comptables (Sage, Cegid, Pennylane…) — calcul Scope 3 automatique.'), badge: t('setup.impFecBadge', 'Killer DAF') },
                  { id: 'csv', label: t('setup.impCsvLabel', 'Import CSV'), desc: t('setup.impCsvDesc', 'Téléchargez le template, remplissez-le, importez-le. Bon pour les indicateurs sociaux.'), badge: null },
                  { id: 'skip', label: t('setup.impSkipLabel', 'Saisie manuelle pour démarrer'), desc: t('setup.impSkipDesc', 'Pas d\'import maintenant — je remplirai mes données indicateur par indicateur.'), badge: null },
                ].map(opt => (
                  <label
                    key={opt.id}
                    className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      importChoice === opt.id
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="import"
                      value={opt.id}
                      checked={importChoice === opt.id}
                      onChange={() => setImportChoice(opt.id as 'template' | 'fec' | 'csv' | 'skip')}
                      className="mt-1 w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{opt.label}</span>
                        {opt.badge && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 5 — Invites */}
          {step === 5 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">{t('setup.s5Title', 'Invitez votre équipe')}</h2>
                <p className="text-sm text-gray-500">{t('setup.s5Desc', "L'ESG, c'est un sport collectif. Invitez les contributeurs (optionnel).")}</p>
              </div>

              <div className="space-y-2">
                {invites.map((inv, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <input
                      type="email"
                      placeholder={t('setup.invitePlaceholder', 'collaborateur@entreprise.fr')}
                      value={inv.email}
                      onChange={e => {
                        const next = [...invites];
                        next[i] = { ...next[i], email: e.target.value };
                        setInvites(next);
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                    />
                    <select
                      value={inv.role}
                      onChange={e => {
                        const next = [...invites];
                        next[i] = { ...next[i], role: e.target.value };
                        setInvites(next);
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="data_entry">{t('setup.roleDataEntry', 'Saisie')}</option>
                      <option value="esg_manager">{t('setup.roleManager', 'Manager ESG')}</option>
                      <option value="esg_admin">{t('setup.roleAdmin', 'Admin ESG')}</option>
                      <option value="viewer">{t('setup.roleViewer', 'Lecture seule')}</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setInvites(invites.filter((_, j) => j !== i))}
                      className="p-1.5 text-gray-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setInvites([...invites, { email: '', role: 'data_entry' }])}
                  className="flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700 px-2 py-1"
                >
                  <UserPlus className="w-4 h-4" /> {t('setup.addColleague', 'Ajouter un collaborateur')}
                </button>
              </div>

              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
                <p className="font-semibold mb-1">{t('setup.readyTitle', 'Prêt à démarrer ?')}</p>
                <p className="text-xs">
                  {t('setup.readyA', 'Cliquez sur ')}<strong>{t('setup.finish', 'Terminer')}</strong>{t('setup.readyB', ' pour accéder à votre dashboard. Vous pourrez inviter plus de collaborateurs et configurer chaque détail depuis les Paramètres.')}
                </p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
            <button
              type="button"
              disabled={step === 1 || loading}
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" /> {t('setup.previous', 'Précédent')}
            </button>

            <span className="text-xs text-gray-400">{t('setup.stepOf', 'Étape {{step}} sur {{total}}', { step, total: TOTAL_STEPS })}</span>

            <button
              type="button"
              disabled={loading}
              onClick={() => {
                if (step === 1) submitStep1();
                else if (step === 2) submitStep2();
                else if (step === 3) submitStep3();
                else if (step === 4) submitStep4();
                else if (step === 5) submitStep5();
              }}
              className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {step === TOTAL_STEPS ? t('setup.finish', 'Terminer') : t('setup.continue', 'Continuer')}
              {step < TOTAL_STEPS && !loading && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
