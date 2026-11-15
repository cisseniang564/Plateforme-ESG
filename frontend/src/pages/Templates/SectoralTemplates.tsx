/**
 * SectoralTemplates — galerie de templates ESG par secteur.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Loader2, ArrowRight, CheckCircle2, AlertCircle, X, Wand2, Eraser } from 'lucide-react';
import api from '@/services/api';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

interface TemplateSummary { sector_id: string; label: string; icon: string; description: string; entry_count: number; by_pillar: Record<string, number>; }
interface PreviewEntry { metric_name: string; pillar: string; category: string; unit: string; framework: string; notes: string; }
interface Preview { sector_id: string; label: string; icon: string; description: string; entry_count: number; entries: PreviewEntry[]; }
interface ApplyResult { indicators_created: number; indicators_existing: number; entries_total: number; sector_label: string; }

export default function SectoralTemplates() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<ApplyResult | null>(null);
  const [error, setError] = useState('');
  const [cleaning, setCleaning] = useState(false);

  useEffect(() => {
    (async () => {
      try { const res = await api.get<TemplateSummary[]>('/templates/sectoral'); setTemplates(res.data); }
      catch { setError(t('tmpl.errLoad', 'Impossible de charger les templates.')); }
      finally { setLoading(false); }
    })();
  }, []);

  const openPreview = async (sectorId: string) => {
    try { const res = await api.get<Preview>(`/templates/sectoral/${sectorId}`); setPreview(res.data); }
    catch { setError(t('tmpl.errPreview', "Impossible de charger l'aperçu.")); }
  };

  const apply = async () => {
    if (!preview) return;
    setApplying(true); setError('');
    try {
      const res = await api.post<ApplyResult>('/templates/sectoral/apply', { sector_id: preview.sector_id });
      setResult(res.data); setPreview(null);
    } catch (e: any) { setError(e?.response?.data?.detail || t('tmpl.errApply', "Échec de l'application.")); }
    finally { setApplying(false); }
  };

  // Retire les valeurs indicatives créées par les anciennes versions des templates.
  const cleanLegacyValues = async () => {
    setCleaning(true);
    try {
      const { data } = await api.post('/templates/sectoral/revert', {});
      const n = (data?.deleted ?? 0) + (data?.indicator_data_deleted ?? 0);
      toast.success(n > 0
        ? t('tmpl2.cleaned', { count: n, defaultValue: '{{count}} valeur(s) de template supprimée(s).' })
        : t('tmpl2.nothingToClean', 'Aucune valeur de template à supprimer.'));
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || t('tmpl2.cleanError', 'Suppression impossible.'));
    } finally {
      setCleaning(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>;

  if (result) {
    return (
      <div className="max-w-2xl mx-auto py-10">
        <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4"><CheckCircle2 className="w-10 h-10 text-emerald-600" /></div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">{t('tmpl2.successTitle', 'Indicateurs ajoutés')}</h1>
          <p className="text-gray-600 mb-6"><strong>{result.sector_label}</strong></p>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <Stat n={result.indicators_created} label={t('tmpl2.statCreated', 'Indicateurs créés')} color="emerald" />
            <Stat n={result.indicators_existing} label={t('tmpl2.statExisting', 'Déjà présents')} color="blue" />
          </div>
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-left mb-6">
            <h3 className="text-sm font-bold text-emerald-900 mb-2 flex items-center gap-2"><Wand2 className="w-4 h-4" /> {t('tmpl.nextTitle', 'Et maintenant ?')}</h3>
            <p className="text-sm text-emerald-800">{t('tmpl2.next', "Aucune valeur n'a été saisie à votre place : renseignez chaque indicateur avec vos données réelles, par saisie ou import.")}</p>
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate('/app/data-entry')} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold">
              {t('tmpl2.enterData', 'Saisir mes données')} <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => navigate('/app/indicators')} className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50">
              {t('tmpl2.viewIndicators', 'Voir les indicateurs')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-br from-violet-50 via-white to-emerald-50 border border-violet-100 p-8">
        <div className="flex flex-wrap items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-emerald-600 flex items-center justify-center shadow-lg"><Sparkles className="w-6 h-6 text-white" /></div>
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold text-gray-900 mb-1">{t('tmpl.heroTitle','Templates sectoriels')}</h1>
            <p className="text-sm text-gray-600 max-w-xl">
              {t('tmpl2.heroDesc', "Ajoutez en un clic les indicateurs habituels de votre secteur (nom, unité, méthode de calcul). Aucune valeur n'est créée : vous les renseignez avec vos propres données.")}
            </p>
          </div>
          <button onClick={cleanLegacyValues} disabled={cleaning}
            title={t('tmpl2.cleanTitle', "Supprime les valeurs indicatives qu'une ancienne version des templates avait ajoutées. Vos propres saisies ne sont pas touchées.")}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 bg-white text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
            {cleaning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eraser className="w-4 h-4" />}
            {t('tmpl2.clean', 'Retirer les anciennes valeurs de template')}
          </button>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {templates.map(tpl => {
          const E = tpl.by_pillar.environmental || 0;
          const S = tpl.by_pillar.social || 0;
          const G = tpl.by_pillar.governance || 0;
          return (
            <button key={tpl.sector_id} onClick={() => openPreview(tpl.sector_id)}
              className="text-left bg-white rounded-2xl border-2 border-gray-200 hover:border-emerald-300 hover:shadow-lg transition-all p-5 group">
              <div className="text-4xl mb-2">{tpl.icon}</div>
              <h3 className="text-base font-bold text-gray-900 mb-1">{tpl.label}</h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-4 line-clamp-3 min-h-[3rem]">{tpl.description}</p>
              <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-emerald-700 font-bold">{E} E</span>
                  <span className="text-blue-700 font-bold">{S} S</span>
                  <span className="text-violet-700 font-bold">{G} G</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-emerald-700 font-semibold group-hover:translate-x-1 transition-transform">
                  {t('tmpl2.nIndicators', { count: tpl.entry_count, defaultValue: '{{count}} indicateurs' })} <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {preview && <PreviewModal preview={preview} applying={applying} onClose={() => setPreview(null)} onApply={apply} />}
    </div>
  );
}

function PreviewModal({ preview, applying, onClose, onApply }: { preview: Preview; applying: boolean; onClose: () => void; onApply: () => void; }) {
  const { t } = useTranslation();
  const byPillar = (p: string) => preview.entries.filter(e => e.pillar === p);
  const pillarMeta = {
    environmental: { label: t('tmpl.pillarEnv','Environnement (E)'), color: 'emerald' },
    social:        { label: t('tmpl.pillarSoc','Social (S)'),        color: 'blue' },
    governance:    { label: t('tmpl.pillarGov','Gouvernance (G)'),   color: 'violet' },
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={applying ? undefined : onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{preview.icon}</span>
            <div>
              <h2 className="text-base font-bold text-gray-900">{preview.label}</h2>
              <p className="text-xs text-gray-500">{t('tmpl2.nIndicators', { count: preview.entry_count, defaultValue: '{{count}} indicateurs' })}</p>
            </div>
          </div>
          <button onClick={onClose} disabled={applying} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-40"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-4 overflow-y-auto flex-1">
          <p className="text-sm text-gray-600 mb-4">{preview.description}</p>
          {(['environmental','social','governance'] as const).map(pillar => {
            const entries = byPillar(pillar);
            if (entries.length === 0) return null;
            const meta = pillarMeta[pillar];
            return (
              <div key={pillar} className="mb-4">
                <h3 className={`text-xs font-bold uppercase tracking-wider text-${meta.color}-700 mb-2`}>
                  {meta.label} — {t('tmpl2.nIndicators', { count: entries.length, defaultValue: '{{count}} indicateurs' })}
                </h3>
                <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                  {entries.map((e, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-white rounded-md px-2.5 py-1.5">
                      <span className="text-gray-900 font-medium truncate flex-1">{e.metric_name}</span>
                      <span className="text-gray-500 ml-3 flex-shrink-0">{e.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between flex-shrink-0">
          <p className="text-xs text-gray-500 max-w-md">
            {t('tmpl2.previewNote', "Seuls les indicateurs sont ajoutés, sans valeur. Ceux qui existent déjà ne sont pas dupliqués.")}
          </p>
          <button onClick={onApply} disabled={applying}
            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold disabled:opacity-50">
            {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {t('tmpl2.apply', 'Ajouter ces indicateurs')}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <div className={`p-3 bg-${color}-50 border border-${color}-100 rounded-xl`}>
      <div className={`text-3xl font-extrabold text-${color}-700`}>{n}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}
