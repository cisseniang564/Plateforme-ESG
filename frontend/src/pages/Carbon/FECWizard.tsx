/**
 * FECWizard — 3-step Scope 3 calculation from a French FEC accounting file.
 *
 * Step 1: Upload .txt FEC (drag & drop or browse)
 * Step 2: Preview parsed + aggregated results (with category toggles)
 * Step 3: Commit → creates DataEntries + Indicators + IndicatorData
 *
 * The killer feature for CFOs: 200-400 hours/year saved on Scope 3.
 */
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, FileText, Loader2, CheckCircle2, ArrowRight, ArrowLeft,
  AlertCircle, Sparkles, Flame, X, Trash2, ChevronDown, ChevronUp,
  Building2, Calendar, Wand2, Info, Calculator, Leaf, Database,
} from 'lucide-react';
import api from '@/services/api';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n/config';

const numLocale = () => (i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR');

// ─── Types ─────────────────────────────────────────────────────────────────
interface EnvCategory {
  category: string;
  metric_name: string;
  amount_eur: number;
  co2e_kg: number;
  co2e_t?: number;
  entry_count: number;
}

interface OtherCategory {
  category: string;
  pillar: string;
  metric_name: string;
  amount_eur: number;
  entry_count: number;
}

interface Preview {
  preview_id: string;
  filename: string;
  year: number;
  stats: {
    lines: number;
    unique_accounts: number;
    total_amount_eur: number;
    total_co2e_t: number;
    env_categories_count: number;
    other_categories_count: number;
  };
  top_10_env: EnvCategory[];
  all_env_categories: EnvCategory[];
  all_other_categories: OtherCategory[];
}

interface CommitResult {
  year: number;
  data_entries_created: number;
  indicators_created: number;
  indicator_data_created: number;
  skipped_existing: number;
  skipped_excluded: number;
  total_aggregated: number;
}

// ─── Component ─────────────────────────────────────────────────────────────
export default function FECWizard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [uploading, setUploading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<Preview | null>(null);
  const [year, setYear] = useState<number>(new Date().getFullYear() - 1);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [showAllOther, setShowAllOther] = useState(false);
  const [result, setResult] = useState<CommitResult | null>(null);

  useEffect(() => {
    if (preview) setYear(preview.year);
  }, [preview]);

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.txt') && !file.name.toLowerCase().endsWith('.csv')) {
      setError(t('fec.errFormat', 'Format attendu : .txt (FEC officiel) ou .csv'));
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      setError(t('fec.errSize', 'Fichier > 30 MB. Découpez par exercice fiscal.'));
      return;
    }
    setUploading(true); setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post<Preview>('/carbon/fec-wizard/preview', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreview(res.data);
      setStep(2);
    } catch (e: any) {
      setError(e?.response?.data?.detail || t('fec.errParse', 'Échec du parsing FEC.'));
    } finally {
      setUploading(false);
    }
  };

  const commit = async () => {
    if (!preview) return;
    setCommitting(true); setError('');
    try {
      const res = await api.post<CommitResult>('/carbon/fec-wizard/commit', {
        preview_id: preview.preview_id,
        year,
        exclude_categories: Array.from(excluded),
      });
      setResult(res.data);
      setStep(3);
    } catch (e: any) {
      setError(e?.response?.data?.detail || t('fec.errCommit', 'Échec du commit.'));
    } finally {
      setCommitting(false);
    }
  };

  const cancel = async () => {
    if (preview) {
      try { await api.delete(`/carbon/fec-wizard/preview/${preview.preview_id}`); } catch { /* ignore */ }
    }
    setPreview(null);
    setExcluded(new Set());
    setStep(1);
  };

  // ── Stepper header ────────────────────────────────────────────────────
  const Stepper = () => (
    <div className="flex items-center justify-between mb-6 max-w-2xl mx-auto">
      {[
        { idx: 1, label: t('fec.step1', 'Téléverser'), icon: Upload },
        { idx: 2, label: t('fec.step2', 'Vérifier'), icon: Calculator },
        { idx: 3, label: t('fec.step3', 'Confirmer'), icon: CheckCircle2 },
      ].map((s, i) => {
        const Icon = s.icon;
        const done = step > s.idx;
        const current = step === s.idx;
        return (
          <div key={s.idx} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                done ? 'bg-emerald-500 text-white' :
                current ? 'bg-emerald-100 text-emerald-700 ring-4 ring-emerald-100' :
                'bg-gray-100 text-gray-400'
              }`}>
                {done ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className={`text-xs font-semibold ${current ? 'text-emerald-700' : 'text-gray-500'}`}>
                {s.label}
              </span>
            </div>
            {i < 2 && (
              <div className={`flex-1 h-0.5 mx-2 ${done ? 'bg-emerald-500' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );

  // ── Result view (step 3) ─────────────────────────────────────────────
  if (step === 3 && result) {
    return (
      <div className="max-w-2xl mx-auto py-10">
        <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">{t('fec.successTitle', 'FEC importé avec succès')}</h1>
          <p className="text-gray-600 mb-6">
            {t('fec.successDesc', 'Exercice {{year}} · Vos données Scope 3 sont prêtes à être éditées', { year: result.year })}
          </p>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <Stat n={result.data_entries_created} label={t('fec.statPosts', 'Postes créés')} color="emerald" />
            <Stat n={result.indicators_created} label={t('fec.statIndicators', 'Indicateurs')} color="blue" />
            <Stat n={result.indicator_data_created} label={t('fec.statESGData', 'Données ESG')} color="violet" />
          </div>

          {(result.skipped_existing > 0 || result.skipped_excluded > 0) && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 mb-6 text-left">
              <p>
                {result.skipped_existing > 0 && t('fec.skippedExisting', '{{n}} postes ignorés (déjà existants). ', { n: result.skipped_existing })}
                {result.skipped_excluded > 0 && t('fec.skippedExcluded', '{{n}} catégories décochées.', { n: result.skipped_excluded })}
              </p>
            </div>
          )}

          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-left mb-6">
            <h3 className="text-sm font-bold text-emerald-900 mb-2 flex items-center gap-2">
              <Wand2 className="w-4 h-4" /> {t('fec.nextStepsTitle', 'Et maintenant ?')}
            </h3>
            <ul className="text-sm text-emerald-800 space-y-1 list-disc list-inside">
              <li>{t('fec.next1A', 'Les valeurs CO2e sont des ')}<strong>estimations monétaires ADEME</strong>{t('fec.next1B', ' — éditables')}</li>
              <li>{t('fec.next2A', 'Consultez votre ')}<strong>Bilan Carbone</strong>{t('fec.next2B', ' mis à jour')}</li>
              <li>{t('fec.next3A', 'Votre dashboard ')}<strong>CSRD Progress</strong>{t('fec.next3B', " reflète l'import")}</li>
            </ul>
          </div>

          <div className="flex gap-3 justify-center flex-wrap">
            <button
              onClick={() => navigate('/app/carbon')}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold"
            >
              <Flame className="w-4 h-4" /> {t('fec.btnCarbon', 'Voir le Bilan Carbone')}
            </button>
            <button
              onClick={() => navigate('/app/csrd-progress')}
              className="px-5 py-2.5 border-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-xl text-sm font-semibold"
            >
              {t('fec.btnCSRD', 'Dashboard CSRD')}
            </button>
            <button
              onClick={() => { setResult(null); setPreview(null); setStep(1); }}
              className="px-5 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-sm font-semibold"
            >
              {t('fec.btnImportAnother', 'Importer un autre FEC')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 1 — Upload ──────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-blue-50 border border-emerald-100 p-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            {t('fec.badge', 'Killer feature DAF')}
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{t('fec.heroTitle', 'Calcul Scope 3 depuis votre FEC')}</h1>
          <p className="text-gray-600 max-w-xl mx-auto">
            {t('fec.heroDescA', 'Téléversez votre Fichier des Écritures Comptables (FEC), nous calculons votre Scope 3 en ')}
            <strong>30 secondes</strong>
            {t('fec.heroDescB', " via le mapping PCG × facteurs d'émission ADEME.")}
            <span className="block mt-1 text-xs text-emerald-700 font-semibold">
              {t('fec.heroDescEco', 'Économie typique : 200-400h/an de saisie manuelle.')}
            </span>
          </p>
        </div>

        <Stepper />

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault(); setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`relative bg-white rounded-3xl border-2 border-dashed p-12 text-center cursor-pointer transition-all ${
            dragOver ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 hover:border-emerald-300 hover:bg-emerald-50/30'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.csv,text/plain,text/csv"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            className="hidden"
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
              <p className="text-sm font-semibold text-gray-700">{t('fec.parsing', 'Parsing du FEC en cours…')}</p>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center shadow-lg">
                <Upload className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">{t('fec.dropTitle', 'Glissez votre FEC ici')}</h3>
              <p className="text-sm text-gray-500 mb-4">{t('fec.dropSub', 'ou cliquez pour parcourir')}</p>
              <p className="text-xs text-gray-400">
                {t('fec.dropFormats', 'Formats : .txt (FEC officiel) ou .csv · Max 30 MB')}
              </p>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: FileText, label: 'Sage / Cegid', desc: t('fec.cardSageCegidDesc', 'Export FEC standard') },
            { icon: Database, label: 'Pennylane / Qonto', desc: t('fec.cardPennylaneDesc', 'Export comptable') },
            { icon: Leaf, label: 'ADEME × PCG', desc: t('fec.cardADEMEDesc', 'Mapping automatique') },
          ].map(card => (
            <div key={card.label} className="p-4 bg-white border border-gray-200 rounded-xl text-center">
              <card.icon className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
              <div className="text-sm font-bold text-gray-900">{card.label}</div>
              <div className="text-xs text-gray-500">{card.desc}</div>
            </div>
          ))}
        </div>

        <details className="rounded-xl bg-gray-50 border border-gray-200 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Info className="w-4 h-4 text-gray-500" /> {t('fec.howExport', 'Comment exporter le FEC depuis votre logiciel ?')}
          </summary>
          <div className="mt-3 space-y-2 text-xs text-gray-600">
            <p><strong>Sage 100c :</strong> {t('fec.sagePath', 'Comptabilité → Outils → Export FEC → Période → Exporter au format .txt')}</p>
            <p><strong>Cegid :</strong> {t('fec.cegidPath', 'Menu Fichiers → Génération FEC → Exercice → Validation')}</p>
            <p><strong>Pennylane :</strong> {t('fec.pennylane', 'Comptabilité → Exports → Fichier FEC officiel')}</p>
            <p><strong>QuickBooks :</strong> {t('fec.quickbooks', 'Préparation FEC requise (plug-in ou retraitement)')}</p>
            <p className="text-amber-700 mt-2">
              {t('fec.fecNorm', '⚠ Le FEC doit respecter la norme française : 18 colonnes avec séparateur | ou ; ou tab.')}
            </p>
          </div>
        </details>
      </div>
    );
  }

  // ── Step 2 — Preview ──────────────────────────────────────────────────
  if (step === 2 && preview) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Stepper />

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {/* File summary */}
        <div className="bg-white rounded-3xl border border-gray-200 p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <div className="text-base font-bold text-gray-900">{preview.filename}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {t('fec.fileSummary', '{{lines}} écritures · {{accounts}} comptes uniques', {
                    lines: preview.stats.lines.toLocaleString(numLocale()),
                    accounts: preview.stats.unique_accounts,
                  })}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <select
                value={year}
                onChange={e => setYear(parseInt(e.target.value, 10))}
                className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm font-semibold"
              >
                {[year - 2, year - 1, year, year + 1].map(y => (
                  <option key={y} value={y}>{t('fec.exercice', 'Exercice {{y}}', { y })}</option>
                ))}
              </select>
              <button
                onClick={cancel}
                className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                title={t('fec.cancelTitle', 'Annuler et reprendre')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat
            n={`${(preview.stats.total_amount_eur / 1_000_000).toFixed(1)} M€`}
            label={t('fec.labelTotalEntries', 'Total écritures')}
            color="blue"
          />
          <Stat
            n={`${preview.stats.total_co2e_t.toLocaleString(numLocale())} tCO2e`}
            label={t('fec.labelScope3', 'Scope 3 estimé')}
            color="emerald"
          />
          <Stat
            n={preview.stats.env_categories_count}
            label={t('fec.labelCarbonCats', 'Catégories carbone')}
            color="violet"
          />
          <Stat
            n={preview.stats.other_categories_count}
            label={t('fec.labelSocialCats', 'Catégories sociales')}
            color="amber"
          />
        </div>

        {/* Top 10 by impact */}
        <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 bg-gradient-to-r from-emerald-50 to-white border-b border-gray-100 flex items-center gap-2">
            <Flame className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-gray-900">{t('fec.top10Title', 'Top 10 par impact carbone')}</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 bg-gray-50/50">
                <th className="text-left px-5 py-2 font-semibold">{t('fec.thCategory', 'Catégorie')}</th>
                <th className="text-right px-5 py-2 font-semibold">{t('fec.thEntries', 'Écritures')}</th>
                <th className="text-right px-5 py-2 font-semibold">{t('fec.thAmount', 'Montant')}</th>
                <th className="text-right px-5 py-2 font-semibold">tCO2e</th>
              </tr>
            </thead>
            <tbody>
              {preview.top_10_env.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400">
                  {t('fec.noEnvCategories', 'Aucune catégorie environnementale détectée dans ce FEC.')}
                </td></tr>
              ) : preview.top_10_env.map(c => (
                <tr key={c.metric_name} className="border-t border-gray-100 hover:bg-emerald-50/30">
                  <td className="px-5 py-2.5 font-medium text-gray-900">{c.metric_name}</td>
                  <td className="px-5 py-2.5 text-right text-gray-500 text-xs">{c.entry_count}</td>
                  <td className="px-5 py-2.5 text-right text-gray-700 font-mono text-xs">
                    {c.amount_eur.toLocaleString(numLocale(), { maximumFractionDigits: 0 })} €
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    <span className="font-bold text-emerald-700">{(c.co2e_kg / 1000).toFixed(2)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* All environmental categories (toggleable) */}
        <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">
              {t('fec.allCarbonCats', 'Toutes les {{n}} catégories carbone', { n: preview.all_env_categories.length })}
            </h2>
            <p className="text-xs text-gray-500">{t('fec.uncheckHint', 'Décochez celles à ne pas importer')}</p>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {preview.all_env_categories.map(c => {
              const isExcluded = excluded.has(c.category.toLowerCase());
              return (
                <label
                  key={c.metric_name}
                  className="flex items-center gap-3 px-5 py-2 border-b border-gray-100 hover:bg-gray-50/50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={!isExcluded}
                    onChange={() => {
                      const next = new Set(excluded);
                      if (isExcluded) next.delete(c.category.toLowerCase());
                      else next.add(c.category.toLowerCase());
                      setExcluded(next);
                    }}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${isExcluded ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                      {c.metric_name}
                    </div>
                    <div className="text-xs text-gray-500">{t('fec.entryCount', '{{n}} écritures', { n: c.entry_count })}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">{c.amount_eur.toLocaleString(numLocale(), { maximumFractionDigits: 0 })} €</div>
                    <div className="text-sm font-bold text-emerald-700">{(c.co2e_kg / 1000).toFixed(2)} t</div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Other (social/governance) */}
        {preview.all_other_categories.length > 0 && (
          <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => setShowAllOther(!showAllOther)}
              className="w-full px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between"
            >
              <h2 className="text-sm font-bold text-gray-900">
                {t('fec.otherIndicators', '{{n}} indicateurs sociaux / gouvernance détectés', { n: preview.all_other_categories.length })}
              </h2>
              {showAllOther ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
            </button>
            {showAllOther && (
              <div className="max-h-60 overflow-y-auto">
                {preview.all_other_categories.map(c => (
                  <div key={c.metric_name} className="flex items-center gap-3 px-5 py-2 border-b border-gray-100">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      c.pillar === 'social' ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700'
                    }`}>
                      {c.pillar === 'social' ? 'S' : 'G'}
                    </span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{c.metric_name}</div>
                      <div className="text-xs text-gray-500">{t('fec.entryCount', '{{n}} écritures', { n: c.entry_count })}</div>
                    </div>
                    <div className="text-sm font-bold text-gray-700">
                      {(c.amount_eur / 1000).toFixed(1)} k€
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer actions */}
        <div className="sticky bottom-4 bg-white rounded-2xl border border-gray-200 shadow-lg p-4 flex items-center justify-between">
          <button
            onClick={cancel}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" /> {t('fec.restart', 'Recommencer')}
          </button>
          <div className="text-xs text-gray-500 hidden md:block">
            {t('fec.selectedCats', '{{n}} catégories carbone sélectionnées', { n: preview.all_env_categories.length - excluded.size })}
          </div>
          <button
            onClick={commit}
            disabled={committing}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold disabled:opacity-50"
          >
            {committing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {t('fec.btnConfirm', "Confirmer l'import")} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// ─── Stat card ────────────────────────────────────────────────────────────
function Stat({ n, label, color }: { n: number | string; label: string; color: string }) {
  const colorMap: Record<string, string> = {
    emerald: 'from-emerald-50 to-white border-emerald-100',
    blue: 'from-blue-50 to-white border-blue-100',
    violet: 'from-violet-50 to-white border-violet-100',
    amber: 'from-amber-50 to-white border-amber-100',
  };
  return (
    <div className={`p-4 bg-gradient-to-br ${colorMap[color] || colorMap.blue} border rounded-2xl text-center`}>
      <div className="text-2xl font-extrabold text-gray-900">{n}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}
