import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Scale, Save, RefreshCw, CheckCircle2, ShieldCheck } from 'lucide-react';
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

const getG1Indicators = (t: TFunction): Indicator[] => [
  { code: 'G1-1a', label: t('compliance.esrsGov.ind.G1-1a.label', "Code d'éthique formalisé"), unit: '', type: 'select', options: [t('compliance.esrsGov.opt.ouiPublic', 'Oui — public'), t('compliance.esrsGov.opt.ouiInterne', 'Oui — interne'), t('compliance.esrsGov.opt.non', 'Non'), t('compliance.esrsGov.opt.enCours', 'En cours')], esrs: 'G1-1', desc: t('compliance.esrsGov.ind.G1-1a.desc', "L'entreprise dispose-t-elle d'un code d'éthique ou de conduite des affaires formalisé ?") },
  { code: 'G1-1b', label: t('compliance.esrsGov.ind.G1-1b.label', 'Collaborateurs formés anti-corruption'), unit: '%', type: 'number', esrs: 'G1-1', desc: t('compliance.esrsGov.ind.G1-1b.desc', "Part des collaborateurs ayant suivi une formation anti-corruption sur les 3 dernières années") },
  { code: 'G1-2a', label: t('compliance.esrsGov.ind.G1-2a.label', 'Incidents de corruption confirmés'), unit: 'nb', type: 'number', esrs: 'G1-2', desc: t('compliance.esrsGov.ind.G1-2a.desc', "Nombre d'incidents de corruption ou de fraude avérés sur l'exercice") },
  { code: 'G1-2b', label: t('compliance.esrsGov.ind.G1-2b.label', 'Sanctions liées à la corruption'), unit: 'nb', type: 'number', esrs: 'G1-2', desc: t('compliance.esrsGov.ind.G1-2b.desc', "Nombre de sanctions (amendes, pénalités, poursuites) liées à des faits de corruption") },
  { code: 'G1-2c', label: t('compliance.esrsGov.ind.G1-2c.label', 'Montant des amendes corruption/fraude'), unit: 'k€', type: 'number', esrs: 'G1-2', desc: t('compliance.esrsGov.ind.G1-2c.desc', "Montant total des amendes et pénalités réglées sur l'exercice pour faits de corruption ou fraude") },
  { code: 'G1-3a', label: t('compliance.esrsGov.ind.G1-3a.label', 'Politique de lobbying transparente'), unit: '', type: 'select', options: [t('compliance.esrsGov.opt.ouiPubliee', 'Oui — publiée'), t('compliance.esrsGov.opt.ouiInterne', 'Oui — interne'), t('compliance.esrsGov.opt.non', 'Non'), t('compliance.esrsGov.opt.na', 'N/A')], esrs: 'G1-3', desc: t('compliance.esrsGov.ind.G1-3a.desc', "L'entreprise dispose-t-elle d'une politique transparente sur ses activités de lobbying ?") },
  { code: 'G1-3b', label: t('compliance.esrsGov.ind.G1-3b.label', 'Dépenses de lobbying déclarées'), unit: 'k€', type: 'number', esrs: 'G1-3', desc: t('compliance.esrsGov.ind.G1-3b.desc', "Montant total des dépenses de lobbying et de représentation d'intérêts déclarées") },
  { code: 'G1-4a', label: t('compliance.esrsGov.ind.G1-4a.label', 'Délai moyen de paiement fournisseurs'), unit: 'jours', type: 'number', esrs: 'G1-4', desc: t('compliance.esrsGov.ind.G1-4a.desc', "Délai moyen de paiement des fournisseurs (en jours après émission de la facture)") },
  { code: 'G1-4b', label: t('compliance.esrsGov.ind.G1-4b.label', 'Factures payées dans les délais légaux'), unit: '%', type: 'number', esrs: 'G1-4', desc: t('compliance.esrsGov.ind.G1-4b.desc', "Pourcentage de factures fournisseurs réglées dans les délais légaux (60 jours en France)") },
  { code: 'G1-5a', label: t('compliance.esrsGov.ind.G1-5a.label', "Mécanisme de protection lanceurs d'alerte"), unit: '', type: 'select', options: [t('compliance.esrsGov.opt.ouiConformeSapinII', 'Oui — conforme Sapin II'), t('compliance.esrsGov.opt.ouiPartiel', 'Oui — partiel'), t('compliance.esrsGov.opt.non', 'Non'), t('compliance.esrsGov.opt.enCours', 'En cours')], esrs: 'G1-5', desc: t('compliance.esrsGov.ind.G1-5a.desc', "L'entreprise dispose-t-elle d'un dispositif de protection des lanceurs d'alerte (Loi Sapin II / directive UE) ?") },
  { code: 'G1-5b', label: t('compliance.esrsGov.ind.G1-5b.label', "Signalements via canal d'alerte dédié"), unit: 'nb', type: 'number', esrs: 'G1-5', desc: t('compliance.esrsGov.ind.G1-5b.desc', "Nombre de signalements reçus via le canal d'alerte interne sur l'exercice") },
  { code: 'G1-6a', label: t('compliance.esrsGov.ind.G1-6a.label', "Parité au conseil d'administration"), unit: '%', type: 'number', esrs: 'G1-6', desc: t('compliance.esrsGov.ind.G1-6a.desc', "Part de femmes siégeant au conseil d'administration ou organe de gouvernance équivalent") },
  { code: 'G1-6b', label: t('compliance.esrsGov.ind.G1-6b.label', 'Administrateurs indépendants'), unit: '%', type: 'number', esrs: 'G1-6', desc: t('compliance.esrsGov.ind.G1-6b.desc', "Part d'administrateurs qualifiés d'indépendants selon les critères de gouvernance applicables") },
];

const getSectionTitles = (t: TFunction): Record<string, string> => ({
  'G1-1': t('compliance.esrsGov.section.G1-1', "Code d'éthique et formation anti-corruption"),
  'G1-2': t('compliance.esrsGov.section.G1-2', 'Incidents et sanctions'),
  'G1-3': t('compliance.esrsGov.section.G1-3', "Lobbying et représentation d'intérêts"),
  'G1-4': t('compliance.esrsGov.section.G1-4', 'Délais de paiement fournisseurs'),
  'G1-5': t('compliance.esrsGov.section.G1-5', "Protection des lanceurs d'alerte"),
  'G1-6': t('compliance.esrsGov.section.G1-6', 'Parité et indépendance'),
});

type FormValues = Record<string, string>;

interface ExistingEntry {
  id: string;
  metric_name: string;
  value_numeric: number | null;
  value_text: string | null;
}

const ACCENT = '#8b5cf6';
const HERO_BG = 'linear-gradient(135deg,#0d0520 0%,#2e1065 45%,#5b21b6 80%,#7c3aed 100%)';
const BADGE_BG = 'rgba(139,92,246,0.18)';
const BADGE_TEXT = '#c4b5fd';
const RING = 'focus:ring-violet-500';

export default function ESRSGovernance() {
  const { t } = useTranslation();
  const [values, setValues] = useState<FormValues>({});
  const [existingIds, setExistingIds] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const G1_INDICATORS = getG1Indicators(t);
  const SECTION_TITLES = getSectionTitles(t);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/data-entry/', { params: { category: 'ESRS_G1', limit: 200 } });
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
      toast.error(t('compliance.esrsGov.toast.loadError', 'Impossible de charger les données'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all(G1_INDICATORS.map(async ind => {
        const raw = values[ind.code];
        if (raw === undefined || raw === '') return;
        const year = new Date().getFullYear();
        const payload = {
          metric_name: ind.code,
          pillar: 'governance',
          category: 'ESRS_G1',
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
      toast.success(t('compliance.esrsGov.toast.saved', 'Données G1 sauvegardées'));
    } catch {
      toast.error(t('compliance.esrsGov.toast.saveError', 'Erreur lors de la sauvegarde'));
    } finally {
      setSaving(false);
    }
  };

  const grouped = useMemo(() => {
    const g: Record<string, Indicator[]> = {};
    G1_INDICATORS.forEach(ind => {
      if (!g[ind.esrs]) g[ind.esrs] = [];
      g[ind.esrs].push(ind);
    });
    return g;
  }, []);

  const filledCount = G1_INDICATORS.filter(ind => values[ind.code] !== undefined && values[ind.code] !== '').length;
  const totalCount = G1_INDICATORS.length;
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
        <div className="absolute inset-0 pointer-events-none" style={{ background: HERO_BG }} />
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="dots-g" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="12" cy="12" r="1.2" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots-g)" />
          </svg>
        </div>
        <div className="relative px-8 py-6 flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="h-5 w-5 text-white/60" />
              <span className="text-xs font-bold text-white/60 tracking-widest uppercase">{t('compliance.esrsGov.eyebrow', 'ESRS Gouvernance')}</span>
            </div>
            <h1 className="text-2xl font-bold text-white">{t('compliance.esrsGov.title', 'G1 — Conduite des affaires')}</h1>
            <p className="text-sm text-white/60 mt-0.5">{t('compliance.esrsGov.subtitle', "Anti-corruption · Lobbying · Délais de paiement · Lanceurs d'alerte · Gouvernance")}</p>
            <div className="mt-4 flex items-center gap-3">
              <div className="h-1.5 w-48 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <div
                  className="h-1.5 rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: 'rgba(255,255,255,0.85)' }}
                />
              </div>
              <span className="text-xs text-white/50">{t('compliance.esrsGov.filledCount', '{{filled}} / {{total}} renseignés', { filled: filledCount, total: totalCount })}</span>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-50 border border-white/20 hover:bg-white/10"
            style={{ background: 'rgba(255,255,255,0.12)' }}
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t('compliance.esrsGov.save', 'Enregistrer')}
          </button>
        </div>
      </div>

      {/* ── Info banner ──────────────────────────────────────────────────────── */}
      <div
        className="flex items-start gap-3 rounded-xl px-5 py-3.5 border"
        style={{ background: BADGE_BG, borderColor: `${ACCENT}30` }}
      >
        <Scale className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: BADGE_TEXT }} />
        <p className="text-sm" style={{ color: BADGE_TEXT }}>
          <Trans i18nKey="compliance.esrsGov.infoBanner">
            <span className="font-semibold">ESRS G1</span> couvre la conduite des affaires : anti-corruption, lobbying,
            pratiques commerciales responsables, protection des lanceurs d'alerte et relations fournisseurs.
          </Trans>
        </p>
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
                    style={{ background: BADGE_BG, color: BADGE_TEXT, borderColor: `${ACCENT}30` }}
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
                          borderColor: filled ? `${ACCENT}40` : 'rgba(255,255,255,0.08)',
                        }}
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span
                                className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
                                style={{ background: BADGE_BG, color: BADGE_TEXT }}
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
                                className={`w-full rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 transition-all ${RING}`}
                                style={{
                                  background: 'rgba(255,255,255,0.07)',
                                  border: `1px solid ${filled ? ACCENT + '55' : 'rgba(255,255,255,0.12)'}`,
                                }}
                              >
                                <option value="">{t('compliance.esrsGov.choose', '— Choisir')}</option>
                                {ind.options?.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>
                            ) : (
                              <input
                                type="number"
                                value={values[ind.code] ?? ''}
                                onChange={e => setValues(prev => ({ ...prev, [ind.code]: e.target.value }))}
                                placeholder="0"
                                className={`w-full rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 transition-all ${RING}`}
                                style={{
                                  background: 'rgba(255,255,255,0.07)',
                                  border: `1px solid ${filled ? ACCENT + '55' : 'rgba(255,255,255,0.12)'}`,
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
            style={{ background: ACCENT, boxShadow: `0 8px 24px ${ACCENT}50` }}
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? t('compliance.esrsGov.saving', 'Enregistrement…') : t('compliance.esrsGov.saveBottom', 'Sauvegarder')}
          </button>
        </div>
      )}
    </div>
  );
}
