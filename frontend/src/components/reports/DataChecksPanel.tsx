/**
 * DataChecksPanel — frontend-only data quality checks for the Reports hub.
 */
import { useMemo } from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle, Calendar, Database, Layers, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

interface DataEntryLike { metric_name?: string; pillar?: string; value_numeric?: number | null; unit?: string | null; period_start?: string | null; period_end?: string | null; created_at?: string; updated_at?: string; category?: string | null; }
interface Check { id: string; severity: 'error' | 'warning' | 'info'; title: string; detail: string; cta?: { label: string; to: string }; }

const SEVERITY_STYLE: Record<Check['severity'], { bg: string; border: string; text: string; icon: any; iconColor: string }> = {
  error:   { bg: 'bg-red-50',   border: 'border-red-200',   text: 'text-red-800',   icon: ShieldAlert,   iconColor: 'text-red-500' },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', icon: AlertTriangle, iconColor: 'text-amber-500' },
  info:    { bg: 'bg-blue-50',  border: 'border-blue-200',  text: 'text-blue-800',  icon: Database,      iconColor: 'text-blue-500' },
};

function runChecks(entries: DataEntryLike[], t: TFunction): Check[] {
  const checks: Check[] = [];
  if (!entries || entries.length === 0) {
    checks.push({
      id: 'no-data', severity: 'error',
      title: t('chks.noDataTitle', 'Aucune donnée disponible'),
      detail: t('chks.noDataDetail', "Vous n'avez encore renseigné aucun indicateur. Le rapport ne contiendra que des sections vides."),
      cta: { label: t('chks.noDataCTA', 'Saisir mes premières données'), to: '/app/data-entry' },
    });
    return checks;
  }

  const byPillar: Record<string, number> = {};
  for (const e of entries) { const p = (e.pillar || '').toLowerCase(); byPillar[p] = (byPillar[p] || 0) + 1; }
  const pillarKeys = ['environmental', 'social', 'governance'];
  const labelByKey: Record<string, string> = {
    environmental: t('chks.pillarE', 'Environnement (E)'),
    social:        t('chks.pillarS', 'Social (S)'),
    governance:    t('chks.pillarG', 'Gouvernance (G)'),
  };
  const missingPillars = pillarKeys.filter(k => (byPillar[k] || 0) === 0);
  if (missingPillars.length) {
    checks.push({
      id: 'missing-pillar',
      severity: missingPillars.length >= 2 ? 'error' : 'warning',
      title: t('chks.missingPillarTitle', 'Pilier{{s}} sans données : {{pillars}}', { s: missingPillars.length > 1 ? 's' : '', pillars: missingPillars.map(k => labelByKey[k]).join(', ') }),
      detail: t('chks.missingPillarDetail', 'Le rapport ESG sera déséquilibré. Recommandation : viser un minimum de 5 indicateurs par pilier.'),
      cta: { label: t('chks.completeCTA', 'Compléter les données'), to: '/app/data-entry' },
    });
  }

  const now = Date.now();
  const NINETY_DAYS = 90 * 24 * 3600 * 1000;
  const newest = entries.reduce<number>((max, e) => {
    const ts = e.updated_at ? new Date(e.updated_at).getTime() : (e.created_at ? new Date(e.created_at).getTime() : 0);
    return Math.max(max, ts);
  }, 0);
  if (newest > 0 && now - newest > NINETY_DAYS) {
    const days = Math.floor((now - newest) / (24 * 3600 * 1000));
    checks.push({
      id: 'stale-data', severity: 'warning',
      title: t('chks.staleTitle', 'Données pas mises à jour depuis {{days}} jours', { days }),
      detail: t('chks.staleDetail', 'Vos données ne reflètent peut-être plus la réalité opérationnelle. Pensez à les rafraîchir avant publication officielle.'),
    });
  }

  const missingValue = entries.filter(e => e.value_numeric == null).length;
  if (missingValue > 0 && missingValue / entries.length > 0.2) {
    checks.push({
      id: 'missing-values', severity: 'warning',
      title: t('chks.missingValTitle', '{{n}} entrée{{s}} sans valeur numérique ({{pct}}%)', { n: missingValue, s: missingValue > 1 ? 's' : '', pct: Math.round(missingValue / entries.length * 100) }),
      detail: t('chks.missingValDetail', 'Ces entrées seront marquées "données non disponibles" dans le rapport (ESRS 1 §34).'),
      cta: { label: t('chks.reviseCTA', 'Réviser les données'), to: '/app/data-quality' },
    });
  }

  const periodMap: Record<string, string[]> = {};
  for (const e of entries) {
    if (!e.metric_name || !e.period_start) continue;
    const key = `${e.metric_name}::${e.period_start}`;
    if (!periodMap[key]) periodMap[key] = [];
    periodMap[key].push(e.metric_name);
  }
  const dupKeys = Object.entries(periodMap).filter(([, v]) => v.length > 1);
  if (dupKeys.length > 0) {
    checks.push({
      id: 'duplicates', severity: 'warning',
      title: t('chks.dupTitle', '{{n}} indicateur{{s}} en doublon sur la même période', { n: dupKeys.length, s: dupKeys.length > 1 ? 's' : '' }),
      detail: t('chks.dupDetail', 'Le rapport peut compter ces valeurs deux fois. Conservez la version vérifiée et supprimez les autres.'),
      cta: { label: t('chks.viewDataCTA', 'Voir mes données'), to: '/app/my-data' },
    });
  }

  const missingUnits = entries.filter(e => e.value_numeric != null && (!e.unit || e.unit === '')).length;
  if (missingUnits > 5) {
    checks.push({
      id: 'missing-units', severity: 'info',
      title: t('chks.missingUnitsTitle', '{{n}} valeurs sans unité de mesure', { n: missingUnits }),
      detail: t('chks.missingUnitsDetail', 'Les unités améliorent la lisibilité du rapport et la comparabilité avec les benchmarks sectoriels.'),
    });
  }

  if (checks.length === 0) {
    checks.push({
      id: 'all-ok', severity: 'info',
      title: t('chks.allOkTitle', 'Vos données passent toutes les vérifications'),
      detail: t('chks.allOkDetail', 'Cohérence, fraîcheur, complétude par pilier — tout est OK pour générer un rapport.'),
    });
  }

  return checks;
}

export default function DataChecksPanel({ entries }: { entries: DataEntryLike[] }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const checks   = useMemo(() => runChecks(entries, t), [entries, t]);
  const errors   = checks.filter(c => c.severity === 'error').length;
  const warnings = checks.filter(c => c.severity === 'warning').length;
  const allOk    = errors === 0 && warnings === 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
        <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800">
          {allOk ? <ShieldCheck className="h-4 w-4 text-emerald-600" /> : <ShieldAlert className="h-4 w-4 text-amber-600" />}
          {t('chks.panelTitle', 'Vérifications avant génération')}
        </h3>
        <div className="flex items-center gap-2">
          {errors > 0 && <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[11px] font-bold">{t('chks.errors','{{n}} erreur{{s}}',{n:errors,s:errors>1?'s':''})}</span>}
          {warnings > 0 && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold">{t('chks.warnings','{{n}} avertissement{{s}}',{n:warnings,s:warnings>1?'s':''})}</span>}
          {allOk && <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold">{t('chks.allOk','Tout est OK')}</span>}
        </div>
      </div>
      <div className="divide-y divide-gray-100">
        {checks.map(c => {
          const s = SEVERITY_STYLE[c.severity];
          const Icon = s.icon;
          return (
            <div key={c.id} className={`flex items-start gap-3 px-5 py-3.5 ${s.bg}`}>
              <Icon className={`h-5 w-5 ${s.iconColor} flex-shrink-0 mt-0.5`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold ${s.text}`}>{c.title}</p>
                <p className={`text-xs mt-0.5 ${s.text} opacity-80`}>{c.detail}</p>
              </div>
              {c.cta && (
                <button type="button" onClick={() => navigate(c.cta!.to)}
                  className={`inline-flex items-center gap-1 px-3 h-8 text-xs font-semibold rounded-lg border bg-white hover:bg-gray-50 transition-colors flex-shrink-0 ${s.text}`}>
                  {c.cta.label}<ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
