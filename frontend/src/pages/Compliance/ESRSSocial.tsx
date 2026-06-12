import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Users, Heart, ShoppingBag, Save, RefreshCw, CheckCircle2, Link2 } from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';

interface Indicator {
  code: string;
  label: string;
  unit: string;
  type: 'number' | 'select';
  options?: string[];
  esrs: string;
  desc: string;
}

const getS2Indicators = (t: TFunction): Indicator[] => [
  { code: 'S2-1a', label: t('compliance.esrsSocial.ind.S2-1a.label', 'Politique droits humains supply chain'), unit: '', type: 'select', options: [t('compliance.esrsSocial.opt.oui', 'Oui'), t('compliance.esrsSocial.opt.non', 'Non'), t('compliance.esrsSocial.opt.enCours', 'En cours')], esrs: 'S2-1', desc: t('compliance.esrsSocial.ind.S2-1a.desc', "L'entreprise dispose-t-elle d'une politique droits humains couvrant sa chaîne de valeur ?") },
  { code: 'S2-1b', label: t('compliance.esrsSocial.ind.S2-1b.label', 'Fournisseurs évalués droits humains'), unit: '%', type: 'number', esrs: 'S2-1', desc: t('compliance.esrsSocial.ind.S2-1b.desc', "Part des fournisseurs (en valeur d'achat) ayant fait l'objet d'une évaluation droits humains") },
  { code: 'S2-2a', label: t('compliance.esrsSocial.ind.S2-2a.label', 'Audits sociaux fournisseurs réalisés'), unit: 'nb', type: 'number', esrs: 'S2-2', desc: t('compliance.esrsSocial.ind.S2-2a.desc', "Nombre d'audits sociaux menés chez les fournisseurs sur l'exercice") },
  { code: 'S2-2b', label: t('compliance.esrsSocial.ind.S2-2b.label', 'Fournisseurs signataires code de conduite'), unit: '%', type: 'number', esrs: 'S2-2', desc: t('compliance.esrsSocial.ind.S2-2b.desc', "Pourcentage des fournisseurs ayant signé le code de conduite de l'entreprise") },
  { code: 'S2-3a', label: t('compliance.esrsSocial.ind.S2-3a.label', 'Incidents travail forcé/enfants identifiés'), unit: 'nb', type: 'number', esrs: 'S2-3', desc: t('compliance.esrsSocial.ind.S2-3a.desc', "Nombre d'incidents avérés de travail forcé ou travail des enfants détectés dans la chaîne") },
  { code: 'S2-3b', label: t('compliance.esrsSocial.ind.S2-3b.label', 'Incidents résolus après audit'), unit: 'nb', type: 'number', esrs: 'S2-3', desc: t('compliance.esrsSocial.ind.S2-3b.desc', "Nombre d'incidents résolus suite à mise en demeure ou plan d'action corrective") },
  { code: 'S2-4a', label: t('compliance.esrsSocial.ind.S2-4a.label', 'Salaire minimum garanti dans la chaîne'), unit: '', type: 'select', options: [t('compliance.esrsSocial.opt.ouiTousFournisseurs', 'Oui — tous fournisseurs'), t('compliance.esrsSocial.opt.ouiFournisseursCritiques', 'Oui — fournisseurs critiques'), t('compliance.esrsSocial.opt.non', 'Non'), t('compliance.esrsSocial.opt.enCours', 'En cours')], esrs: 'S2-4', desc: t('compliance.esrsSocial.ind.S2-4a.desc', "Le salaire minimum légal est-il garanti chez tous les fournisseurs directs ?") },
  { code: 'S2-4b', label: t('compliance.esrsSocial.ind.S2-4b.label', 'Fournisseurs au-dessus du salaire minimum'), unit: '%', type: 'number', esrs: 'S2-4', desc: t('compliance.esrsSocial.ind.S2-4b.desc', "Part des fournisseurs directs rémunérant au-dessus du salaire minimum légal local") },
];

const getS3Indicators = (t: TFunction): Indicator[] => [
  { code: 'S3-1a', label: t('compliance.esrsSocial.ind.S3-1a.label', "Évaluation d'impact communautaire réalisée"), unit: '', type: 'select', options: [t('compliance.esrsSocial.opt.oui', 'Oui'), t('compliance.esrsSocial.opt.non', 'Non'), t('compliance.esrsSocial.opt.enCours', 'En cours')], esrs: 'S3-1', desc: t('compliance.esrsSocial.ind.S3-1a.desc', "L'entreprise a-t-elle réalisé une évaluation d'impact sur les communautés locales ?") },
  { code: 'S3-1b', label: t('compliance.esrsSocial.ind.S3-1b.label', 'Communautés directement affectées'), unit: 'nb', type: 'number', esrs: 'S3-1', desc: t('compliance.esrsSocial.ind.S3-1b.desc', "Nombre de communautés locales directement affectées par les activités de l'entreprise") },
  { code: 'S3-2a', label: t('compliance.esrsSocial.ind.S3-2a.label', 'Mécanisme de réclamation accessible'), unit: '', type: 'select', options: [t('compliance.esrsSocial.opt.ouiPublic', 'Oui — public'), t('compliance.esrsSocial.opt.ouiSurDemande', 'Oui — sur demande'), t('compliance.esrsSocial.opt.non', 'Non'), t('compliance.esrsSocial.opt.enCours', 'En cours')], esrs: 'S3-2', desc: t('compliance.esrsSocial.ind.S3-2a.desc', "L'entreprise dispose-t-elle d'un mécanisme de réclamation accessible aux communautés affectées ?") },
  { code: 'S3-2b', label: t('compliance.esrsSocial.ind.S3-2b.label', 'Réclamations communautaires reçues'), unit: 'nb', type: 'number', esrs: 'S3-2', desc: t('compliance.esrsSocial.ind.S3-2b.desc', "Nombre de réclamations reçues de communautés locales sur l'exercice") },
  { code: 'S3-2c', label: t('compliance.esrsSocial.ind.S3-2c.label', 'Réclamations communautaires résolues'), unit: 'nb', type: 'number', esrs: 'S3-2', desc: t('compliance.esrsSocial.ind.S3-2c.desc', "Nombre de réclamations communautaires clôturées avec réponse satisfaisante") },
  { code: 'S3-3a', label: t('compliance.esrsSocial.ind.S3-3a.label', 'Investissement social local'), unit: 'k€', type: 'number', esrs: 'S3-3', desc: t('compliance.esrsSocial.ind.S3-3a.desc', "Montant total investi dans des projets de développement ou d'aide aux communautés locales") },
  { code: 'S3-3b', label: t('compliance.esrsSocial.ind.S3-3b.label', 'Projets de développement communautaire'), unit: 'nb', type: 'number', esrs: 'S3-3', desc: t('compliance.esrsSocial.ind.S3-3b.desc', "Nombre de projets actifs de développement communautaire soutenus ou co-portés par l'entreprise") },
];

const getS4Indicators = (t: TFunction): Indicator[] => [
  { code: 'S4-1a', label: t('compliance.esrsSocial.ind.S4-1a.label', 'Incidents sécurité produits signalés'), unit: 'nb', type: 'number', esrs: 'S4-1', desc: t('compliance.esrsSocial.ind.S4-1a.desc', "Nombre d'incidents de sécurité produit signalés aux autorités sur l'exercice") },
  { code: 'S4-1b', label: t('compliance.esrsSocial.ind.S4-1b.label', 'Rappels de produits'), unit: 'nb', type: 'number', esrs: 'S4-1', desc: t('compliance.esrsSocial.ind.S4-1b.desc', "Nombre de campagnes de rappel produit initiées sur l'exercice") },
  { code: 'S4-2a', label: t('compliance.esrsSocial.ind.S4-2a.label', 'Politique de protection des données clients'), unit: '', type: 'select', options: [t('compliance.esrsSocial.opt.ouiConformeRGPD', 'Oui — conforme RGPD'), t('compliance.esrsSocial.opt.ouiPartielle', 'Oui — partielle'), t('compliance.esrsSocial.opt.non', 'Non'), t('compliance.esrsSocial.opt.enCours', 'En cours')], esrs: 'S4-2', desc: t('compliance.esrsSocial.ind.S4-2a.desc', "L'entreprise dispose-t-elle d'une politique formelle de protection des données clients ?") },
  { code: 'S4-2b', label: t('compliance.esrsSocial.ind.S4-2b.label', 'Violations de données clients notifiées'), unit: 'nb', type: 'number', esrs: 'S4-2', desc: t('compliance.esrsSocial.ind.S4-2b.desc', "Nombre d'incidents de violation de données clients notifiés à la CNIL ou autorité compétente") },
  { code: 'S4-3a', label: t('compliance.esrsSocial.ind.S4-3a.label', 'Score de satisfaction client (NPS)'), unit: 'pts', type: 'number', esrs: 'S4-3', desc: t('compliance.esrsSocial.ind.S4-3a.desc', "Net Promoter Score ou indice de satisfaction équivalent (sur 100)") },
  { code: 'S4-3b', label: t('compliance.esrsSocial.ind.S4-3b.label', 'Réclamations clients reçues'), unit: 'nb', type: 'number', esrs: 'S4-3', desc: t('compliance.esrsSocial.ind.S4-3b.desc', "Nombre total de réclamations formelles reçues des clients sur l'exercice") },
  { code: 'S4-3c', label: t('compliance.esrsSocial.ind.S4-3c.label', 'Réclamations clients résolues'), unit: '%', type: 'number', esrs: 'S4-3', desc: t('compliance.esrsSocial.ind.S4-3c.desc', "Pourcentage de réclamations clients clôturées dans le délai cible de l'entreprise") },
  { code: 'S4-4a', label: t('compliance.esrsSocial.ind.S4-4a.label', 'Formation pratiques commerciales responsables'), unit: '', type: 'select', options: [t('compliance.esrsSocial.opt.ouiTousCommerciaux', 'Oui — tous commerciaux'), t('compliance.esrsSocial.opt.ouiPartielle', 'Oui — partielle'), t('compliance.esrsSocial.opt.non', 'Non'), t('compliance.esrsSocial.opt.prevue', 'Prévue')], esrs: 'S4-4', desc: t('compliance.esrsSocial.ind.S4-4a.desc', "Les équipes commerciales ont-elles reçu une formation sur les pratiques commerciales responsables ?") },
];

const getSectionTitles = (t: TFunction): Record<string, string> => ({
  'S2-1': t('compliance.esrsSocial.section.S2-1', 'Droits humains'),
  'S2-2': t('compliance.esrsSocial.section.S2-2', 'Audits et conformité'),
  'S2-3': t('compliance.esrsSocial.section.S2-3', 'Travail forcé et enfants'),
  'S2-4': t('compliance.esrsSocial.section.S2-4', 'Rémunération équitable'),
  'S3-1': t('compliance.esrsSocial.section.S3-1', 'Impact communautaire'),
  'S3-2': t('compliance.esrsSocial.section.S3-2', 'Mécanismes de réclamation'),
  'S3-3': t('compliance.esrsSocial.section.S3-3', 'Investissement social'),
  'S4-1': t('compliance.esrsSocial.section.S4-1', 'Sécurité des produits'),
  'S4-2': t('compliance.esrsSocial.section.S4-2', 'Protection des données'),
  'S4-3': t('compliance.esrsSocial.section.S4-3', 'Satisfaction et réclamations'),
  'S4-4': t('compliance.esrsSocial.section.S4-4', 'Pratiques commerciales'),
});

type TabKey = 'S2' | 'S3' | 'S4';
type FormValues = Record<string, string>;

interface ExistingEntry {
  id: string;
  metric_name: string;
  value_numeric: number | null;
  value_text: string | null;
}

const getTabs = (t: TFunction): { key: TabKey; label: string; icon: typeof Users; indicators: Indicator[]; category: string; accent: string; ring: string; badgeBg: string; badgeText: string; heroBg: string }[] => [
  {
    key: 'S2', label: t('compliance.esrsSocial.tab.S2', 'S2 — Chaîne de valeur'), icon: Users, indicators: getS2Indicators(t), category: 'ESRS_S2',
    accent: '#3b82f6', ring: 'focus:ring-blue-500', badgeBg: 'rgba(59,130,246,0.18)', badgeText: '#93c5fd',
    heroBg: 'linear-gradient(135deg,#05132e 0%,#0f2d6b 45%,#1d4ed8 80%,#3b82f6 100%)',
  },
  {
    key: 'S3', label: t('compliance.esrsSocial.tab.S3', 'S3 — Communautés'), icon: Heart, indicators: getS3Indicators(t), category: 'ESRS_S3',
    accent: '#f43f5e', ring: 'focus:ring-rose-500', badgeBg: 'rgba(244,63,94,0.18)', badgeText: '#fda4af',
    heroBg: 'linear-gradient(135deg,#1a0610 0%,#6b0f2e 45%,#be123c 80%,#f43f5e 100%)',
  },
  {
    key: 'S4', label: t('compliance.esrsSocial.tab.S4', 'S4 — Consommateurs'), icon: ShoppingBag, indicators: getS4Indicators(t), category: 'ESRS_S4',
    accent: '#f59e0b', ring: 'focus:ring-amber-500', badgeBg: 'rgba(245,158,11,0.18)', badgeText: '#fcd34d',
    heroBg: 'linear-gradient(135deg,#160e00 0%,#6b3800 45%,#b45309 80%,#f59e0b 100%)',
  },
];

export default function ESRSSocial() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>('S2');
  const [values, setValues] = useState<FormValues>({});
  const [existingIds, setExistingIds] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const TABS = getTabs(t);
  const SECTION_TITLES = getSectionTitles(t);
  const tab = TABS.find(tb => tb.key === activeTab)!;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/data-entry/', { params: { category: tab.category, limit: 200 } });
      const entries: ExistingEntry[] = res.data?.items ?? res.data ?? [];
      const newVals: FormValues = {};
      const newIds: Record<string, string> = {};
      entries.forEach(e => {
        newVals[e.metric_name] = e.value_text ?? (e.value_numeric != null ? String(e.value_numeric) : '');
        newIds[e.metric_name] = e.id;
      });
      setValues(newVals);
      setExistingIds(newIds);
    } catch {
      toast.error(t('compliance.esrsSocial.toast.loadError', 'Impossible de charger les données'));
    } finally {
      setLoading(false);
    }
  }, [tab.category, t]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all(tab.indicators.map(async ind => {
        const raw = values[ind.code];
        if (raw === undefined || raw === '') return;
        const year = new Date().getFullYear();
        const payload = {
          metric_name: ind.code,
          pillar: 'social',
          category: tab.category,
          period_start: `${year}-01-01`,
          period_end: `${year}-12-31`,
          period_type: 'annual',
          ...(ind.type === 'select' ? { value_text: raw } : { value_numeric: parseFloat(raw) }),
          unit: ind.unit,
          data_source: 'manual',
          collection_method: 'manual',
          notes: ind.label,
        };
        if (existingIds[ind.code]) {
          await api.put(`/data-entry/${existingIds[ind.code]}`, { value_numeric: (payload as Record<string, unknown>).value_numeric, value_text: (payload as Record<string, unknown>).value_text, unit: payload.unit, notes: payload.notes });
        } else {
          const res = await api.post('/data-entry/', payload);
          setExistingIds(prev => ({ ...prev, [ind.code]: res.data.id }));
        }
      }));
      toast.success(t('compliance.esrsSocial.toast.saved', 'Données sauvegardées'));
    } catch {
      toast.error(t('compliance.esrsSocial.toast.saveError', 'Erreur lors de la sauvegarde'));
    } finally {
      setSaving(false);
    }
  };

  const grouped = useMemo(() => {
    const g: Record<string, Indicator[]> = {};
    tab.indicators.forEach(ind => {
      if (!g[ind.esrs]) g[ind.esrs] = [];
      g[ind.esrs].push(ind);
    });
    return g;
  }, [tab.indicators]);

  const filledCount = tab.indicators.filter(ind => values[ind.code] !== undefined && values[ind.code] !== '').length;
  const totalCount = tab.indicators.length;
  const pct = totalCount > 0 ? Math.round((filledCount / totalCount) * 100) : 0;

  return (
    <div
      className="rounded-2xl p-6 max-w-6xl mx-auto space-y-5 shadow-xl"
      style={{
        background: 'linear-gradient(180deg, #0f172a 0%, #0b1220 100%)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl shadow-xl">
        <div className="absolute inset-0 pointer-events-none" style={{ background: tab.heroBg }} />
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="dots-s" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="12" cy="12" r="1.2" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots-s)" />
          </svg>
        </div>
        <div className="relative px-8 py-6 flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link2 className="h-5 w-5 text-white/70" />
              <span className="text-xs font-bold text-white/60 tracking-widest uppercase">{t('compliance.esrsSocial.eyebrow', 'ESRS Social')}</span>
            </div>
            <h1 className="text-2xl font-bold text-white">{t('compliance.esrsSocial.title', 'S2 / S3 / S4 — Social')}</h1>
            <p className="text-sm text-white/60 mt-0.5">{t('compliance.esrsSocial.subtitle', 'Travailleurs chaîne de valeur · Communautés affectées · Consommateurs')}</p>
            <div className="mt-4 flex items-center gap-3">
              <div className="h-1.5 w-48 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <div
                  className="h-1.5 rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: 'rgba(255,255,255,0.85)' }}
                />
              </div>
              <span className="text-xs text-white/50">{t('compliance.esrsSocial.filledCount', '{{filled}} / {{total}} renseignés', { filled: filledCount, total: totalCount })}</span>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-50 border border-white/20 hover:bg-white/10"
            style={{ background: 'rgba(255,255,255,0.12)' }}
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t('compliance.esrsSocial.save', 'Enregistrer')}
          </button>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <div className="flex gap-1.5 p-1.5 bg-slate-800/70 rounded-xl border border-white/8">
        {TABS.map(tb => {
          const Icon = tb.icon;
          const tFilled = tb.indicators.filter(ind => values[ind.code] !== undefined && values[ind.code] !== '').length;
          const isActive = activeTab === tb.key;
          return (
            <button
              key={tb.key}
              onClick={() => setActiveTab(tb.key)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all"
              style={isActive ? { background: 'rgba(255,255,255,0.1)', color: '#fff', boxShadow: `0 0 0 1px ${tb.accent}40` } : { color: '#94a3b8' }}
            >
              <Icon className="h-4 w-4" style={isActive ? { color: tb.accent } : {}} />
              <span>{tb.label}</span>
              {tFilled > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ background: `${tb.accent}25`, color: tb.badgeText }}>
                  {tFilled}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-[76px] rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([esrsCode, indicators]) => {
            const sectionFilled = indicators.filter(ind => values[ind.code] !== undefined && values[ind.code] !== '').length;
            const sectionComplete = sectionFilled === indicators.length && indicators.length > 0;

            return (
              <div key={esrsCode} className="space-y-2">
                {/* Section header */}
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg border"
                    style={{ background: tab.badgeBg, color: tab.badgeText, borderColor: `${tab.accent}30` }}
                  >
                    {esrsCode}
                  </span>
                  <span className="text-sm font-semibold text-slate-300">{SECTION_TITLES[esrsCode] ?? esrsCode}</span>
                  <div className="flex-1 h-px bg-white/8" />
                  <div className="flex items-center gap-1.5">
                    {sectionComplete
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      : <span className="text-xs text-slate-500">{sectionFilled}/{indicators.length}</span>
                    }
                  </div>
                </div>

                {/* Indicator rows */}
                <div className="space-y-2">
                  {indicators.map(ind => {
                    const filled = values[ind.code] !== undefined && values[ind.code] !== '';
                    return (
                      <div
                        key={ind.code}
                        className="rounded-xl border px-5 py-3.5 transition-all"
                        style={{
                          background: filled ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
                          borderColor: filled ? `${tab.accent}35` : 'rgba(255,255,255,0.08)',
                        }}
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span
                                className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
                                style={{ background: tab.badgeBg, color: tab.badgeText }}
                              >
                                {ind.code}
                              </span>
                              <span className="text-sm font-semibold text-white">{ind.label}</span>
                              {ind.unit && (
                                <span className="text-[10px] text-slate-500 bg-white/5 px-1.5 py-0.5 rounded font-mono">{ind.unit}</span>
                              )}
                              {filled && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 ml-auto" />}
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed">{ind.desc}</p>
                          </div>
                          <div className="w-44 flex-shrink-0">
                            {ind.type === 'select' ? (
                              <select
                                value={values[ind.code] ?? ''}
                                onChange={e => setValues(prev => ({ ...prev, [ind.code]: e.target.value }))}
                                className={`w-full rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 transition-all ${tab.ring}`}
                                style={{
                                  background: 'rgba(255,255,255,0.07)',
                                  border: `1px solid ${filled ? tab.accent + '50' : 'rgba(255,255,255,0.12)'}`,
                                }}
                              >
                                <option value="">{t('compliance.esrsSocial.choose', '— Choisir')}</option>
                                {ind.options?.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>
                            ) : (
                              <input
                                type="number"
                                value={values[ind.code] ?? ''}
                                onChange={e => setValues(prev => ({ ...prev, [ind.code]: e.target.value }))}
                                placeholder="0"
                                className={`w-full rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 transition-all ${tab.ring}`}
                                style={{
                                  background: 'rgba(255,255,255,0.07)',
                                  border: `1px solid ${filled ? tab.accent + '50' : 'rgba(255,255,255,0.12)'}`,
                                }}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Bottom save bar ───────────────────────────────────────────────────── */}
      {!loading && (
        <div className="sticky bottom-4 flex justify-end pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold text-sm shadow-xl transition-all disabled:opacity-60 border border-white/20"
            style={{ background: tab.accent, boxShadow: `0 8px 24px ${tab.accent}40` }}
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? t('compliance.esrsSocial.saving', 'Enregistrement…') : t('compliance.esrsSocial.saveBottom', 'Sauvegarder')}
          </button>
        </div>
      )}
    </div>
  );
}
