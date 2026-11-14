// Export des saisies ESG (Excel ou CSV), avec filtres et nombre de lignes exact.
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, Download, FileSpreadsheet, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/services/api';
import PlanGate from '@/components/common/PlanGate';
import Spinner from '@/components/common/Spinner';
import { usePlan } from '@/hooks/usePlan';
import CollectHeader, { btnPrimary, card, field } from './CollectHeader';

interface ExportStats { total: number; by_period?: Record<string, number> }
type Fmt = 'xlsx' | 'csv';

// Colonnes réellement présentes dans le fichier (voir GET /data-entry/export).
const COLUMNS = [
  'Identifiant', 'Pilier', 'Catégorie', 'Indicateur', 'Valeur numérique', 'Valeur texte', 'Unité',
  'Début de période', 'Fin de période', 'Type de période', 'Source', 'Méthode de collecte',
  'Statut de vérification', 'Notes', 'Date de création',
];

export default function DataExport() {
  const { t } = useTranslation();
  const { can, loading: planLoading } = usePlan();
  const allowed = can('data_export');

  const [stats, setStats] = useState<ExportStats | null>(null);
  const [pillar, setPillar] = useState('');
  const [year, setYear] = useState('');
  const [status, setStatus] = useState('');
  const [format, setFormat] = useState<Fmt>('xlsx');
  const [count, setCount] = useState<number | null>(null);
  const [counting, setCounting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const filters = useCallback(() => {
    const p: Record<string, string> = {};
    if (pillar) p.pillar = pillar;
    if (year) p.year = year;
    if (status) p.verification_status = status;
    return p;
  }, [pillar, year, status]);

  useEffect(() => {
    if (planLoading || !allowed) return;
    api.get('/data-entry/stats').then(r => setStats(r.data)).catch(() => setStats(null));
  }, [planLoading, allowed]);

  // Nombre exact de lignes pour les filtres choisis : lu dans l'en-tête X-Total-Count de la liste.
  useEffect(() => {
    if (planLoading || !allowed) return;
    let cancelled = false;
    setCounting(true);
    api.get('/data-entry/', { params: { ...filters(), limit: 1 } })
      .then(r => {
        if (cancelled) return;
        const h = r.headers?.['x-total-count'];
        setCount(h !== undefined && Number.isFinite(Number(h)) ? Number(h) : null);
      })
      .catch(() => { if (!cancelled) setCount(null); })
      .finally(() => { if (!cancelled) setCounting(false); });
    return () => { cancelled = true; };
  }, [filters, planLoading, allowed]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get('/data-entry/export', { params: { ...filters(), format }, responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url; a.download = `donnees-esg.${format}`; a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t('dexp.errExport', "Erreur lors de l'export"));
    } finally { setExporting(false); }
  };

  if (planLoading) return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>;

  const years = Object.keys(stats?.by_period ?? {}).sort().reverse();
  const formats: { id: Fmt; label: string; desc: string; icon: typeof FileText }[] = [
    { id: 'xlsx', label: 'Excel (.xlsx)', desc: t('dexp.xlsxDesc2', 'En-têtes en français et lignes colorées par pilier.'), icon: FileSpreadsheet },
    { id: 'csv', label: 'CSV (.csv)', desc: t('dexp.csvDesc2', 'Texte brut, lisible par Excel, R, Python ou Power BI.'), icon: FileText },
  ];

  return (
    <div className="space-y-5">
      <CollectHeader
        title={t('dexp.heroTitle', 'Export de données')}
        subtitle={t('dexp.subtitle2', 'Téléchargez vos saisies ESG en Excel ou en CSV.')}
      />

      {!allowed ? <PlanGate feature="data_export" /> : (
        <div className="grid gap-5 lg:grid-cols-3">
          <section className={`${card} space-y-6 p-5 lg:col-span-2`}>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">{t('dexp.filtersTitle2', '1. Que voulez-vous exporter ?')}</h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="dexp-pillar" className="mb-1 block text-xs font-medium text-gray-700">{t('dexp.pillarLabel', 'Pilier')}</label>
                  <select id="dexp-pillar" value={pillar} onChange={e => setPillar(e.target.value)} className={field}>
                    <option value="">{t('dexp.allPillars', 'Tous les piliers')}</option>
                    <option value="environmental">{t('dexp.pillarEnv', 'Environnement')}</option>
                    <option value="social">{t('dexp.pillarSoc', 'Social')}</option>
                    <option value="governance">{t('dexp.pillarGov', 'Gouvernance')}</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="dexp-year" className="mb-1 block text-xs font-medium text-gray-700">{t('dexp.yearLabel', 'Année')}</label>
                  <select id="dexp-year" value={year} onChange={e => setYear(e.target.value)} className={field}>
                    <option value="">{t('dexp.allYears', 'Toutes les années')}</option>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="dexp-status" className="mb-1 block text-xs font-medium text-gray-700">{t('dexp.statusLabel', 'Statut de vérification')}</label>
                  <select id="dexp-status" value={status} onChange={e => setStatus(e.target.value)} className={field}>
                    <option value="">{t('dexp.allStatuses', 'Tous les statuts')}</option>
                    <option value="verified">{t('dexp.stVerified2', 'Vérifiées')}</option>
                    <option value="pending">{t('dexp.stPending2', 'À vérifier')}</option>
                    <option value="flagged">{t('dexp.stFlagged2', 'Signalées')}</option>
                    <option value="rejected">{t('dexp.stRejected2', 'Rejetées')}</option>
                  </select>
                </div>
              </div>
            </div>

            <fieldset>
              <legend className="text-sm font-semibold text-gray-900">{t('dexp.formatTitle', '2. Dans quel format ?')}</legend>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {formats.map(f => {
                  const Icon = f.icon; const active = format === f.id;
                  return (
                    <label key={f.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors focus-within:ring-2 focus-within:ring-emerald-500 ${active ? 'border-emerald-600 bg-emerald-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <input type="radio" name="dexp-format" value={f.id} checked={active} onChange={() => setFormat(f.id)} className="sr-only" />
                      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${active ? 'text-emerald-700' : 'text-gray-400'}`} aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-gray-900">{f.label}</span>
                        <span className="block text-xs text-gray-500">{f.desc}</span>
                      </span>
                      {active && <Check className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="flex flex-wrap items-center gap-4 border-t border-gray-200 pt-5">
              <button type="button" onClick={handleExport} disabled={exporting || count === 0} className={btnPrimary}>
                {exporting ? <Spinner size="sm" /> : <Download className="h-4 w-4" aria-hidden="true" />}
                {exporting ? t('dexp.exporting', 'Export en cours…') : t('dexp.download', 'Télécharger')}
              </button>
              <p className="text-sm text-gray-600" aria-live="polite">
                {counting ? t('dexp.counting', 'Calcul du nombre de lignes…')
                  : count === null ? ''
                  : count === 0 ? t('dexp.noMatch', 'Aucune saisie ne correspond à ces filtres.')
                  : t('dexp.count', '{{n}} ligne(s) seront exportées.', { n: count.toLocaleString('fr-FR') })}
              </p>
            </div>

            {stats?.total === 0 && (
              <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                {t('dexp.noData2', 'Vous n’avez encore aucune saisie à exporter.')}{' '}
                <Link to="/app/data-entry" className="font-semibold text-emerald-700 hover:underline">{t('dexp.enterData', 'Saisir des données')}</Link>
              </p>
            )}
          </section>

          <aside className={`${card} p-5`}>
            <h2 className="text-sm font-semibold text-gray-900">{t('dexp.exportContent', "Contenu de l'export")}</h2>
            <p className="mt-1 text-xs text-gray-500">{t('dexp.contentHint', 'Une ligne par saisie, avec les colonnes suivantes :')}</p>
            <ul className="mt-3 space-y-1.5 text-sm text-gray-700">
              {COLUMNS.map(c => <li key={c} className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-gray-400" aria-hidden="true" />{c}</li>)}
            </ul>
          </aside>
        </div>
      )}
    </div>
  );
}
