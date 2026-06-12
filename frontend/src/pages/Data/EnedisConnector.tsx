import { useState, useRef, useEffect } from 'react';
import { Zap, Upload, CheckCircle2, Download, ArrowRight, Info, Link2, Link2Off, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';
import { api } from '@/services/api';
import toast from 'react-hot-toast';
import BackButton from '@/components/common/BackButton';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n/config';

const numLocale = () => (i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR');

interface ImportResult { readings_parsed: number; entries_created: number; energy_total_kwh: number; co2_total_kgco2e: number; periods: string[]; }
interface SyncResult { readings_fetched: number; entries_created: number; energy_total_kwh: number; co2_total_kgco2e: number; period: { start: string; end: string }; usage_point_id: string; }
interface ConnectionStatus { connected: boolean; oauth_configured: boolean; usage_point_id?: string; scope?: string; connected_at?: string; last_sync_at?: string | null; last_error?: string | null; }

function OAuthSection() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  const fetchStatus = async () => {
    try { const res = await api.get('/connectors/enedis/status'); setStatus(res.data); }
    catch { setStatus(null); }
    finally { setLoadingStatus(false); }
  };

  useEffect(() => {
    fetchStatus();
    const params = new URLSearchParams(window.location.search);
    if (params.get('enedis') === 'connected') { setTimeout(fetchStatus, 1500); window.history.replaceState({}, '', window.location.pathname); }
  }, []);

  const handleConnect = () => { window.location.href = `${import.meta.env.VITE_API_URL ?? ''}/api/v1/connectors/enedis/authorize`; };

  const handleSync = async () => {
    setSyncing(true); setSyncResult(null);
    try {
      const res = await api.post('/connectors/enedis/sync');
      setSyncResult(res.data);
      toast.success(t('enedis.toastSyncOk', '{{n}} entrées ESG créées depuis le Datahub !', { n: res.data.entries_created }));
      fetchStatus();
    } catch (err: any) { toast.error(err.response?.data?.detail || t('enedis.errSync', 'Erreur de synchronisation')); }
    finally { setSyncing(false); }
  };

  const handleDisconnect = async () => {
    if (!confirm(t('enedis.confirmDisconnect', "Déconnecter Enedis ? Les données déjà importées ne seront pas supprimées."))) return;
    setDisconnecting(true);
    try { await api.delete('/connectors/enedis/disconnect'); toast.success(t('enedis.disconnected', 'Connexion Enedis supprimée')); setSyncResult(null); fetchStatus(); }
    catch (err: any) { toast.error(err.response?.data?.detail || t('enedis.errDisconnect', 'Erreur lors de la déconnexion')); }
    finally { setDisconnecting(false); }
  };

  if (loadingStatus) return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex items-center gap-3 text-gray-500">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">{t('enedis.checking', 'Vérification de la connexion Enedis…')}</span>
    </div>
  );

  if (!status || !status.oauth_configured) return null;

  if (!status.connected) return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"><Link2 className="h-5 w-5 text-blue-500" /></div>
        <div>
          <h2 className="font-semibold text-gray-800">{t('enedis.oauthTitle', 'Connexion directe Enedis Datahub')}</h2>
          <p className="text-sm text-gray-500">{t('enedis.oauthDesc', "Autorisez l'accès à votre PDL pour une synchronisation automatique des consommations.")}</p>
        </div>
      </div>
      {status.last_error && <div className="flex items-start gap-2 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5"><AlertTriangle size={15} className="mt-0.5 shrink-0 text-red-500" /><span>{status.last_error}</span></div>}
      <button onClick={handleConnect} className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors">
        <Link2 className="h-4 w-4" />{t('enedis.connectOAuth', 'Connecter via Enedis Datahub')}
      </button>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-green-200 shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center"><CheckCircle2 className="h-5 w-5 text-green-600" /></div>
          <div>
            <h2 className="font-semibold text-gray-800">{t('enedis.connected', 'Enedis Datahub connecté')}</h2>
            <p className="text-sm text-gray-500">PDL : <code className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">{status.usage_point_id || '—'}</code>
              {status.last_sync_at && <> · {t('enedis.lastSync', 'dernière sync {{date}}', { date: new Date(status.last_sync_at).toLocaleDateString(numLocale()) })}</>}
            </p>
          </div>
        </div>
        <button onClick={handleDisconnect} disabled={disconnecting}
          className="inline-flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
          {disconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2Off className="h-3.5 w-3.5" />}
          {t('enedis.disconnect', 'Déconnecter')}
        </button>
      </div>
      {status.last_error && <div className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5"><AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-500" /><span>{status.last_error}</span></div>}
      <button onClick={handleSync} disabled={syncing} className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
        {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        {syncing ? t('enedis.syncing', 'Synchronisation…') : t('enedis.syncNow', 'Synchroniser maintenant')}
      </button>
      {syncResult && (
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-xs text-blue-600 font-medium mb-1">{t('enedis.consumption', 'Consommation')}</p>
            <p className="text-xl font-bold text-blue-800">{syncResult.energy_total_kwh.toLocaleString(numLocale())} <span className="text-sm font-normal">kWh</span></p>
            <p className="text-xs text-blue-500 mt-1">{t('enedis.readings', '{{n}} relevés', { n: syncResult.readings_fetched })}</p>
          </div>
          <div className="bg-orange-50 rounded-xl p-4">
            <p className="text-xs text-orange-600 font-medium mb-1">Scope 2 CO₂e</p>
            <p className="text-xl font-bold text-orange-800">{syncResult.co2_total_kgco2e >= 1000 ? `${(syncResult.co2_total_kgco2e/1000).toFixed(2)} t` : `${syncResult.co2_total_kgco2e.toFixed(1)} kg`}</p>
            <p className="text-xs text-orange-500 mt-1">{t('enedis.entriesCreated', '{{n}} entrées créées', { n: syncResult.entries_created })}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EnedisConnector() {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.name.endsWith('.csv')) { setFile(dropped); setResult(null); }
    else { toast.error(t('enedis.errNotCSV', 'Veuillez déposer un fichier CSV')); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) { setFile(f); setResult(null); } };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData(); formData.append('file', file);
      const res = await api.post('/connectors/enedis/import-csv', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResult(res.data);
      toast.success(t('enedis.toastImportOk', '{{n}} entrées ESG créées !', { n: res.data.entries_created }));
    } catch (err: any) { toast.error(err.response?.data?.detail || t('enedis.errImport', "Erreur lors de l'import")); }
    finally { setLoading(false); }
  };

  const downloadTemplate = async () => {
    try {
      const res = await api.get('/connectors/enedis/template', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url; a.download = 'enedis_template.csv'; a.click(); URL.revokeObjectURL(url);
    } catch { toast.error(t('enedis.errDownload', 'Erreur lors du téléchargement')); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="relative overflow-hidden rounded-2xl p-8 text-white shadow-xl" style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 60%, #4f46e5 100%)' }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />
        <div className="relative">
          <BackButton to="/app/data/connectors" label={t('enedis.backLabel', 'Connecteurs')} className="mb-4 text-white/70 hover:text-white" />
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-lg"><Zap className="h-6 w-6 text-white" /></div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{t('enedis.title', 'Connecteur Enedis')}</h1>
              <p className="text-sm text-white/70">{t('enedis.badge', 'Import consommation électrique · Scope 2 auto')}</p>
            </div>
          </div>
          <p className="text-sm text-white/80 leading-relaxed mt-3 max-w-xl">{t('enedis.heroDesc', "Importez vos données de consommation électrique depuis votre espace Enedis. Les émissions Scope 2 sont calculées automatiquement (facteur RTE 2023 : 23,4 gCO₂e/kWh).")}</p>
        </div>
      </div>

      <OAuthSection />

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="font-semibold text-gray-700 text-sm">{t('enedis.csvTitle', 'Ou importez un fichier CSV manuellement')}</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-800 mb-2">{t('enedis.howTitle', 'Comment exporter depuis Enedis ?')}</p>
                <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                  <li>{t('enedis.step1', 'Connectez-vous sur')} <strong>monespace.enedis.fr</strong></li>
                  <li>{t('enedis.step2', 'Allez dans "Ma consommation" → "Télécharger mes données"')}</li>
                  <li>{t('enedis.step3', 'Sélectionnez la période souhaitée et le format CSV')}</li>
                  <li>{t('enedis.step4', 'Téléchargez et importez ici')}</li>
                </ol>
              </div>
            </div>
          </div>

          {!result && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 font-medium">{t('enedis.fileLabel', 'Fichier CSV')}</span>
                <button onClick={downloadTemplate} className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                  <Download className="h-3.5 w-3.5" />{t('enedis.downloadTemplate', 'Télécharger le modèle CSV')}
                </button>
              </div>
              <div onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}
                className={['border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors', dragging ? 'border-blue-400 bg-blue-50' : file ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'].join(' ')}>
                <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle2 className="h-10 w-10 text-green-500" />
                    <p className="font-medium text-gray-800">{file.name}</p>
                    <p className="text-sm text-gray-500">{t('enedis.fileReady', '{{n}} KB — Prêt à importer', { n: (file.size/1024).toFixed(1) })}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-10 w-10 text-gray-300" />
                    <p className="font-medium text-gray-600">{t('enedis.dropTitle', 'Glissez votre fichier CSV Enedis ici')}</p>
                    <p className="text-sm text-gray-400">{t('enedis.dropSub', 'ou cliquez pour sélectionner')}</p>
                  </div>
                )}
              </div>
              {file && (
                <button onClick={handleImport} disabled={loading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Zap className="h-5 w-5" />{t('enedis.importBtn', 'Importer et calculer les émissions')}</>}
                </button>
              )}
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center"><CheckCircle2 className="h-5 w-5 text-green-600" /></div>
                <div>
                  <p className="font-semibold text-gray-900">{t('enedis.importOk', 'Import réussi !')}</p>
                  <p className="text-sm text-gray-500">{t('enedis.importSummary', '{{n}} lectures importées, {{m}} entrées ESG créées', { n: result.readings_parsed, m: result.entries_created })}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-xs text-blue-600 font-medium mb-1">{t('enedis.totalConsumption', 'Consommation totale')}</p>
                  <p className="text-2xl font-bold text-blue-800">{result.energy_total_kwh.toLocaleString(numLocale())} <span className="text-sm font-normal">kWh</span></p>
                </div>
                <div className="bg-orange-50 rounded-xl p-4">
                  <p className="text-xs text-orange-600 font-medium mb-1">{t('enedis.scope2Emissions', 'Émissions Scope 2')}</p>
                  <p className="text-2xl font-bold text-orange-800">{result.co2_total_kgco2e >= 1000 ? `${(result.co2_total_kgco2e/1000).toFixed(2)} tCO₂e` : `${result.co2_total_kgco2e.toFixed(1)} kgCO₂e`}</p>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">{t('enedis.periods', 'Périodes couvertes :')}</span>{' '}
                {result.periods.slice(0, 3).join(', ')}
                {result.periods.length > 3 && ` ${t('enedis.andOthers', 'et {{n}} autres', { n: result.periods.length - 3 })}`}
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setFile(null); setResult(null); }} className="flex-1 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
                  {t('enedis.importAnother', 'Importer un autre fichier')}
                </button>
                <a href="/app/data-entry" className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5">
                  {t('enedis.viewData', 'Voir les données')} <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
