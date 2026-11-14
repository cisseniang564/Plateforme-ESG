// Import de fichier (CSV / Excel / FEC) en trois étapes : fichier → vérification → résultat.
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle, ArrowRight, Check, CheckCircle2, Download, FileSpreadsheet, FileText, Info, RefreshCw, Upload, X,
} from 'lucide-react';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import toast from 'react-hot-toast';
import CollectHeader, { btnPrimary, btnSecondary, card, field } from './CollectHeader';
import { canImport, errorDetail, importTarget } from './dataEntryHelpers';

// ─── Types ────────────────────────────────────────────────────────────────────
interface PreviewData {
  upload_id: string;
  intent?: string;
  filename: string;
  total_rows: number;
  columns: string[];
  detected_mapping: Record<string, string>;
  preview: Record<string, unknown>[];
  validation: { valid_rows: number; invalid_rows: number };
}
interface ImportResult {
  imported: number;
  indicator_data_created?: number;
  errors: number;
  error_details?: { row: number | string; error: string }[];
  target?: string;
  fec?: boolean;
  scores_recalculated?: number;
  not_converted?: { account: string; label: string; amount_eur: number; advice: string }[];
}
interface Organization { id: string; name: string }

const FIELDS = [
  { key: 'metric_name', label: 'Indicateur', required: true },
  { key: 'value_numeric', label: 'Valeur', required: true },
  { key: 'unit', label: 'Unité', required: false },
  { key: 'pillar', label: 'Pilier ESG', required: false },
  { key: 'category', label: 'Catégorie', required: false },
  { key: 'period_start', label: 'Début de période', required: false },
  { key: 'period_end', label: 'Fin de période', required: false },
  { key: 'data_source', label: 'Source', required: false },
  { key: 'notes', label: 'Notes', required: false },
] as const;
const EMPTY_MAPPING: Record<string, string> = Object.fromEntries(FIELDS.map(f => [f.key, '']));

const ACCEPTED = ['.csv', '.xlsx', '.xls', '.txt'];
const MAX_BYTES = 10 * 1024 * 1024;

// Ce que le serveur sait reconnaître, d'après les colonnes du fichier.
const RECOGNIZED = [
  { title: 'Indicateurs ESG', columns: ['metric_name', 'value_numeric', 'unit', 'period_start'], to: 'Mes données' },
  { title: 'Matérialité', columns: ['name', 'financial_impact', 'esg_impact'], to: 'Matrice de matérialité' },
  { title: 'Risques', columns: ['title', 'probability', 'impact'], to: 'Registre des risques' },
  { title: 'Fournisseurs', columns: ['name', 'global_score', 'annual_spend_eur'], to: 'Supply chain' },
];

// Un FEC (art. A.47 A-1 du LPF) se reconnaît à son nom officiel ou à ses colonnes normalisées.
const FEC_KEYWORDS = ['journalcode', 'ecriturenum', 'ecrituredate', 'comptenum', 'pieceref', 'ecriturelib'];
const FEC_FILENAME = /(^|[\\/])\d{9}fec\d{8}\.(txt|csv)$/i;
async function looksLikeFec(file: File): Promise<boolean> {
  if (FEC_FILENAME.test(file.name)) return true;
  try {
    const head = (await file.slice(0, 4096).text()).split('\n')[0].toLowerCase();
    return FEC_KEYWORDS.filter(k => head.includes(k)).length >= 2;
  } catch { return false; }
}

const TEMPLATE = `pillar,category,metric_name,value_numeric,unit,period_start,period_end,data_source,notes
environmental,emissions,Emissions CO2 Scope 1,1234.5,tCO2e,2025-01-01,2025-12-31,Bilan carbone,
environmental,energy,Consommation electricite,2500,MWh,2025-01-01,2025-12-31,Factures,
social,workforce,Effectif total,500,personnes,2025-01-01,2025-12-31,SIRH,`;

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const { t } = useTranslation();
  const steps = [t('imp.stepFile', 'Fichier'), t('imp.stepCheck', 'Vérification'), t('imp.stepResult', 'Résultat')];
  return (
    <ol className="flex items-center gap-2 text-sm" aria-label={t('imp.steps', "Étapes de l'import")}>
      {steps.map((label, i) => {
        const n = i + 1; const done = step > n; const active = step === n;
        return (
          <li key={label} className="flex items-center gap-2" aria-current={active ? 'step' : undefined}>
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${done ? 'bg-emerald-600 text-white' : active ? 'bg-slate-900 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : n}
            </span>
            <span className={active ? 'font-semibold text-gray-900' : 'text-gray-500'}>{label}</span>
            {n < steps.length && <span className="mx-1 h-px w-8 bg-gray-200" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}

export default function ImportCSV() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const fecRequested = (searchParams.get('type') || '').toLowerCase() === 'fec';

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [isFec, setIsFec] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState<null | 'analyze' | 'import' | 'fec'>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>(EMPTY_MAPPING);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [orgId, setOrgId] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get('/organizations').then(res => {
      const orgs = res.data?.items ?? [];
      setOrganizations(Array.isArray(orgs) ? orgs : []);
    }).catch(() => { /* la liste est facultative */ });
  }, []);

  const pickFile = async (f: File | undefined) => {
    if (!f) return;
    const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase();
    if (!ACCEPTED.includes(ext)) { toast.error(t('imp.badType', 'Format non pris en charge : utilisez un fichier .csv, .xlsx, .xls, ou un FEC (.txt).')); return; }
    if (f.size > MAX_BYTES) { toast.error(t('imp.tooBig', 'Fichier trop volumineux (10 Mo maximum).')); return; }
    const fec = await looksLikeFec(f);
    if (ext === '.txt' && !fec) { toast.error(t('imp.txtNotFec', 'Ce fichier .txt ne ressemble pas à un FEC. Enregistrez vos données en .csv ou .xlsx.')); return; }
    setFile(f); setIsFec(fec);
  };

  const reset = () => {
    setStep(1); setFile(null); setIsFec(false); setPreview(null); setResult(null); setMapping(EMPTY_MAPPING); setOrgId('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const analyze = async () => {
    if (!file) return;
    setBusy('analyze');
    try {
      const body = new FormData(); body.append('file', file);
      const { data } = await api.post('/esg-import/upload-preview', body, { headers: { 'Content-Type': 'multipart/form-data' } });
      setPreview(data);
      setMapping({ ...EMPTY_MAPPING, ...(data.detected_mapping ?? {}) });
      setStep(2);
    } catch (e) {
      toast.error(errorDetail(e, t('imp.analyzeError', "L'analyse du fichier a échoué.")));
    } finally { setBusy(null); }
  };

  const runImport = async () => {
    if (!preview || busy) return;
    setBusy('import');
    try {
      const payload: Record<string, string> = { ...mapping };
      if (orgId) payload.organization_id = orgId;
      const { data } = await api.post(`/esg-import/uploads/${preview.upload_id}/import`, payload);
      setResult(data); setStep(3);
    } catch (e) {
      toast.error(errorDetail(e, t('imp.importError', "L'import a échoué.")));
    } finally { setBusy(null); }
  };

  const runFecImport = async () => {
    if (!file || busy) return;
    setBusy('fec');
    try {
      const body = new FormData(); body.append('file', file);
      if (orgId) body.append('org_id', orgId);
      const { data } = await api.post('/connectors/sage-cegid/sync', body, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResult({
        imported: data.entries_created ?? 0,
        errors: 0, error_details: [], fec: true, not_converted: data.not_converted ?? [],
      });
      setStep(3);
    } catch (e) {
      toast.error(errorDetail(e, t('imp.fecError', "L'import du FEC a échoué.")));
    } finally { setBusy(null); }
  };

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob(['﻿' + TEMPLATE], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'modele-import-esg.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const intent = preview?.intent ?? 'generic';
  const generic = intent === 'generic';
  const target = importTarget(result?.fec ? 'generic' : (result?.target ?? intent));
  const ready = canImport(intent, mapping);
  const rowsToImport = generic ? (preview?.validation.valid_rows ?? 0) : (preview?.total_rows ?? 0);

  const orgSelect = (
    <div>
      <label htmlFor="imp-org" className="mb-1 block text-sm font-medium text-gray-700">{t('imp.org', 'Organisation concernée')}</label>
      <select id="imp-org" value={orgId} onChange={e => setOrgId(e.target.value)} className={field}>
        <option value="">{t('imp.orgDefault', 'Organisation par défaut')}</option>
        {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
      <p className="mt-1 text-xs text-gray-500">{t('imp.orgHint', "Sans choix, les lignes sont rattachées à la première organisation de votre compte.")}</p>
    </div>
  );

  return (
    <div className="space-y-5">
      <CollectHeader
        title={t('imp.title', 'Import de fichier')}
        subtitle={t('imp.subtitle', 'Importez vos données depuis un fichier CSV, Excel ou un FEC comptable.')}
        actions={
          <button type="button" onClick={downloadTemplate} className={btnSecondary}>
            <Download className="h-4 w-4" aria-hidden="true" />{t('imp.template', 'Modèle CSV')}
          </button>
        }
      />

      <Stepper step={step} />

      {/* ─── Étape 1 : fichier ─────────────────────────────────────────── */}
      {step === 1 && (
        <div className="grid gap-5 lg:grid-cols-3">
          <section className={`${card} p-5 lg:col-span-2`}>
            {fecRequested && !file && (
              <p className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {t('imp.fecHint', 'Déposez votre Fichier des Écritures Comptables (export Sage, Cegid, Pennylane…). Il sera reconnu automatiquement.')}
              </p>
            )}
            <input ref={inputRef} id="imp-file" type="file" accept={ACCEPTED.join(',')} className="sr-only"
              onChange={e => pickFile(e.target.files?.[0])} />
            {!file ? (
              <label htmlFor="imp-file"
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files?.[0]); }}
                className={`flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors focus-within:ring-2 focus-within:ring-emerald-500 ${dragging ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 bg-gray-50 hover:border-gray-400'}`}>
                <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
                  <Upload className="h-5 w-5 text-gray-500" aria-hidden="true" />
                </span>
                <span className="text-base font-semibold text-gray-900">{t('imp.drop', 'Déposez un fichier ici')}</span>
                <span className="mt-1 text-sm text-gray-500">{t('imp.browse', 'ou cliquez pour le choisir sur votre ordinateur')}</span>
                <span className="mt-3 text-xs text-gray-400">{t('imp.formats', 'CSV, Excel (.xlsx, .xls) ou FEC (.txt) · 10 Mo maximum')}</span>
              </label>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                    {file.name.toLowerCase().endsWith('.csv') || isFec ? <FileText className="h-5 w-5 text-gray-600" aria-hidden="true" /> : <FileSpreadsheet className="h-5 w-5 text-gray-600" aria-hidden="true" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} Ko
                      {isFec && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800">{t('imp.fecDetected', 'FEC reconnu')}</span>}
                    </p>
                  </div>
                  <button type="button" onClick={reset} aria-label={t('imp.removeFile', 'Retirer le fichier')} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {isFec ? (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      {t('imp.fecExplain3', "Les dépenses de services (assurances, honoraires, entretien, publicité, télécoms, missions) sont converties en émissions avec les ratios monétaires de la Base Carbone ADEME : un ordre de grandeur, incertain à 80 %. Les achats d'énergie, de matières et de transport ne sont pas convertis : ils vous seront listés pour une saisie en données physiques.")}
                    </p>
                    <div className="max-w-sm">
                      <label htmlFor="imp-fec-org" className="mb-1 block text-sm font-medium text-gray-700">{t('imp.orgOptional', 'Organisation (facultatif)')}</label>
                      <select id="imp-fec-org" value={orgId} onChange={e => setOrgId(e.target.value)} className={field}>
                        <option value="">{t('imp.orgNone', 'Aucune')}</option>
                        {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <button type="button" onClick={runFecImport} disabled={busy !== null} className={btnPrimary}>
                        {busy === 'fec' ? <Spinner size="sm" /> : <Upload className="h-4 w-4" aria-hidden="true" />}
                        {busy === 'fec' ? t('imp.fecRunning', 'Import en cours…') : t('imp.fecRun', 'Importer le FEC')}
                      </button>
                      {!file.name.toLowerCase().endsWith('.txt') && (
                        <button type="button" onClick={analyze} disabled={busy !== null} className="text-sm text-gray-500 underline hover:text-gray-800">
                          {t('imp.fecAsCsv', 'Ce n’est pas un FEC : l’importer comme un tableau')}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={analyze} disabled={busy !== null} className={btnPrimary}>
                    {busy === 'analyze' ? <Spinner size="sm" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
                    {busy === 'analyze' ? t('imp.analyzing', 'Analyse en cours…') : t('imp.analyze', 'Analyser le fichier')}
                  </button>
                )}
              </div>
            )}
          </section>

          <aside className={`${card} p-5`}>
            <h2 className="text-sm font-semibold text-gray-900">{t('imp.recognized', 'Fichiers reconnus')}</h2>
            <p className="mt-1 text-xs text-gray-500">{t('imp.recognizedHint', 'La destination est choisie d’après les colonnes du fichier ; vous la validez avant tout enregistrement.')}</p>
            <ul className="mt-4 space-y-4">
              {RECOGNIZED.map(r => (
                <li key={r.title}>
                  <p className="text-sm font-medium text-gray-800">{r.title} <span className="font-normal text-gray-400">→ {r.to}</span></p>
                  <p className="mt-1 flex flex-wrap gap-1">
                    {r.columns.map(c => <code key={c} className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600">{c}</code>)}
                  </p>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      )}

      {/* ─── Étape 2 : vérification ────────────────────────────────────── */}
      {step === 2 && preview && (
        <div className="space-y-5">
          <section className={`${card} grid divide-y divide-gray-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0`}>
            <div className="p-4">
              <p className="text-xs font-medium text-gray-500">{t('imp.file', 'Fichier')}</p>
              <p className="mt-1 truncate text-sm font-semibold text-gray-900" title={preview.filename}>{preview.filename}</p>
              <p className="text-xs text-gray-500">{t('imp.rows', '{{n}} ligne(s)', { n: preview.total_rows })}</p>
            </div>
            <div className="p-4">
              <p className="text-xs font-medium text-gray-500">{t('imp.destination', 'Destination')}</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">{importTarget(intent).label}</p>
              <p className="text-xs text-gray-500">{generic ? t('imp.destGeneric', 'Saisies ESG, à vérifier ensuite') : t('imp.destDedicated', 'Reconnu d’après les colonnes du fichier')}</p>
            </div>
            <div className="p-4">
              <p className="text-xs font-medium text-gray-500">{t('imp.ready', 'Prêtes à importer')}</p>
              <p className="mt-1 text-sm font-semibold text-gray-900 tabular-nums">{rowsToImport}</p>
              {generic && preview.validation.invalid_rows > 0 && (
                <p className="text-xs text-amber-700">{t('imp.ignored', '{{n}} ligne(s) incomplète(s) seront ignorées', { n: preview.validation.invalid_rows })}</p>
              )}
            </div>
          </section>

          {generic && (
            <section className={`${card} p-5`}>
              <h2 className="text-sm font-semibold text-gray-900">{t('imp.mappingTitle', 'Correspondance des colonnes')}</h2>
              <p className="mt-1 text-xs text-gray-500">{t('imp.mappingHint', 'Proposée automatiquement d’après les en-têtes. Corrigez-la si nécessaire avant d’importer.')}</p>
              <div className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                {FIELDS.map(f => (
                  <div key={f.key}>
                    <label htmlFor={`map-${f.key}`} className="mb-1 block text-xs font-medium text-gray-700">
                      {f.label}{f.required && <span className="text-red-600"> *</span>}
                    </label>
                    <select id={`map-${f.key}`} value={mapping[f.key] ?? ''} onChange={e => setMapping(m => ({ ...m, [f.key]: e.target.value }))}
                      aria-invalid={f.required && !mapping[f.key]}
                      className={`${field} ${f.required && !mapping[f.key] ? 'border-red-300' : ''}`}>
                      <option value="">{f.required ? t('imp.choose', 'Choisir une colonne') : t('imp.none', 'Aucune')}</option>
                      {preview.columns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              {!ready && (
                <p className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  {t('imp.required', 'Associez au moins les colonnes « Indicateur » et « Valeur » pour importer.')}
                </p>
              )}
              {ready && !mapping.period_start && (
                <p className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  {t('imp.noPeriod', 'Aucune colonne de période : les lignes seront datées du mois en cours. Associez une colonne de date si vos données portent sur une autre période.')}
                </p>
              )}
              <div className="mt-5 max-w-sm">{orgSelect}</div>
            </section>
          )}

          <section className={`${card} overflow-hidden`}>
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-900">{t('imp.previewTitle', 'Aperçu')}</h2>
              <span className="text-xs text-gray-500">{t('imp.previewCount', '{{n}} première(s) ligne(s) sur {{total}}', { n: preview.preview.length, total: preview.total_rows })}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-600">
                  <tr>
                    {preview.columns.map(c => {
                      const used = generic ? FIELDS.find(f => mapping[f.key] === c) : undefined;
                      return (
                        <th key={c} scope="col" className="whitespace-nowrap px-4 py-2.5">
                          {c}{used && <span className="ml-1.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">{used.label}</span>}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {preview.preview.map((row, i) => (
                    <tr key={i}>
                      {preview.columns.map(c => (
                        <td key={c} className="max-w-xs truncate whitespace-nowrap px-4 py-2 text-gray-700">
                          {row[c] !== null && row[c] !== undefined && row[c] !== '' ? String(row[c]) : <span className="text-gray-300">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <button type="button" onClick={reset} disabled={busy !== null} className={btnSecondary}>{t('imp.cancel', 'Annuler')}</button>
            <button type="button" onClick={runImport} disabled={busy !== null || !ready || rowsToImport === 0} className={btnPrimary}>
              {busy === 'import' && <Spinner size="sm" />}
              {busy === 'import' ? t('imp.importing', 'Import en cours…') : t('imp.importN', 'Importer {{n}} ligne(s)', { n: rowsToImport })}
            </button>
          </div>
        </div>
      )}

      {/* ─── Étape 3 : résultat ────────────────────────────────────────── */}
      {step === 3 && result && (
        <section className={`${card} p-6`}>
          <div className="flex items-start gap-3">
            {result.imported > 0
              ? <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" aria-hidden="true" />
              : <AlertTriangle className="h-6 w-6 shrink-0 text-red-600" aria-hidden="true" />}
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {result.imported > 0
                  ? (result.fec
                      ? t('imp.doneFec', '{{n}} saisie(s) créée(s) à partir du FEC', { n: result.imported })
                      : t('imp.doneTitle', '{{n}} ligne(s) importée(s)', { n: result.imported }))
                  : t('imp.failTitle', "Aucune ligne n'a été importée")}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {result.imported > 0
                  ? (result.fec || (result.target ?? 'generic') === 'generic'
                      ? t('imp.doneGeneric', 'Elles sont enregistrées avec le statut « À vérifier » et restent modifiables tant qu’elles ne sont pas vérifiées.')
                      : t('imp.doneDedicated', 'Elles sont disponibles dans : {{label}}.', { label: target.label }))
                  : t('imp.failHint', 'Corrigez le fichier d’après le détail ci-dessous, puis recommencez.')}
              </p>
            </div>
          </div>

          <dl className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-gray-50 p-3">
              <dt className="text-xs text-gray-500">{t('imp.statImported', 'Lignes importées')}</dt>
              <dd className="text-xl font-semibold text-gray-900 tabular-nums">{result.imported}</dd>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <dt className="text-xs text-gray-500">{t('imp.statErrors', 'Lignes en erreur')}</dt>
              <dd className={`text-xl font-semibold tabular-nums ${result.errors > 0 ? 'text-red-700' : 'text-gray-900'}`}>{result.errors}</dd>
            </div>
            {(result.indicator_data_created ?? 0) > 0 && (
              <div className="rounded-lg bg-gray-50 p-3">
                <dt className="text-xs text-gray-500">{t('imp.statIndicators', 'Valeurs reliées à un indicateur')}</dt>
                <dd className="text-xl font-semibold text-gray-900 tabular-nums">{result.indicator_data_created}</dd>
              </div>
            )}
          </dl>

          {(result.scores_recalculated ?? 0) > 0 && (
            <p className="mt-4 text-sm text-gray-600">{t('imp.scores', 'Scores ESG recalculés pour {{n}} organisation(s).', { n: result.scores_recalculated })}</p>
          )}

          {result.errors > 0 && (result.error_details?.length ?? 0) > 0 && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <p className="font-medium">{t('imp.errorsTitle', 'Détail des erreurs')}</p>
              <ul className="mt-2 space-y-1 text-xs">
                {result.error_details!.slice(0, 8).map((e, i) => <li key={i}>{t('imp.errorRow', 'Ligne {{row}}', { row: e.row })} — {e.error}</li>)}
              </ul>
              {result.error_details!.length > 8 && <p className="mt-2 text-xs">{t('imp.errorsMore', '… et {{n}} autre(s).', { n: result.errors - 8 })}</p>}
            </div>
          )}

          {(result.not_converted?.length ?? 0) > 0 && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-medium">{t('imp.notConvertedTitle', 'Dépenses non converties en CO2e')}</p>
              <p className="mt-1 text-xs">{t('imp.notConvertedHint', 'Aucun ratio publié ne représente correctement ces postes : saisissez vos données physiques.')}</p>
              <ul className="mt-2 space-y-1 text-xs">
                {result.not_converted!.map(n => (
                  <li key={n.account}><span className="font-medium">{n.label}</span> — {n.amount_eur.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} € · {n.advice}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            {result.imported > 0 && (
              <Link to={result.fec ? '/app/my-data?source=fec_import' : target.path} className={btnPrimary}>
                {t('imp.open', 'Ouvrir : {{label}}', { label: target.label })}<ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            )}
            <button type="button" onClick={reset} className={btnSecondary}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />{t('imp.again', 'Importer un autre fichier')}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
