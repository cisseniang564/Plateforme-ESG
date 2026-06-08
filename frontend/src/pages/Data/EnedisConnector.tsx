import { useState, useRef, useEffect } from 'react';
import {
  Zap, Upload, CheckCircle2, Download, ArrowRight, Info,
  Link2, Link2Off, RefreshCw, AlertTriangle, Loader2,
} from 'lucide-react';
import { api } from '@/services/api';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import BackButton from '@/components/common/BackButton';

interface ImportResult {
  readings_parsed: number;
  entries_created: number;
  energy_total_kwh: number;
  co2_total_kgco2e: number;
  periods: string[];
}

interface SyncResult {
  readings_fetched: number;
  entries_created: number;
  energy_total_kwh: number;
  co2_total_kgco2e: number;
  period: { start: string; end: string };
  usage_point_id: string;
}

interface ConnectionStatus {
  connected: boolean;
  oauth_configured: boolean;
  usage_point_id?: string;
  scope?: string;
  connected_at?: string;
  last_sync_at?: string | null;
  last_error?: string | null;
}

// ── OAuth section ──────────────────────────────────────────────────────────────

function OAuthSection() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'fr' ? 'fr-FR' : 'en-US';
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await api.get('/connectors/enedis/status');
      setStatus(res.data);
    } catch {
      setStatus(null);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // If we just returned from OAuth callback, re-check after short delay
    const params = new URLSearchParams(window.location.search);
    if (params.get('enedis') === 'connected') {
      setTimeout(fetchStatus, 1500);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleConnect = () => {
    window.location.href = `${import.meta.env.VITE_API_URL ?? ''}/api/v1/connectors/enedis/authorize`;
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await api.post('/connectors/enedis/sync');
      setSyncResult(res.data);
      toast.success(t('enedis.syncEntriesCreated', { count: res.data.entries_created }));
      fetchStatus();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || t('enedis.syncError'));
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm(t('enedis.disconnectConfirm'))) return;
    setDisconnecting(true);
    try {
      await api.delete('/connectors/enedis/disconnect');
      toast.success(t('enedis.disconnectSuccess'));
      setSyncResult(null);
      fetchStatus();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || t('enedis.disconnectError'));
    } finally {
      setDisconnecting(false);
    }
  };

  if (loadingStatus) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex items-center gap-3 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">{t('enedis.checkingConnection')}</span>
      </div>
    );
  }

  // OAuth not available in this environment
  if (!status || !status.oauth_configured) return null;

  // ── Not connected ──────────────────────────────────────────────────────────
  if (!status.connected) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Link2 className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-800">{t('enedis.directConnection')}</h2>
            <p className="text-sm text-gray-500">
              {t('enedis.directConnectionDesc')}
            </p>
          </div>
        </div>

        {status.last_error && (
          <div className="flex items-start gap-2 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-red-500" />
            <span>{status.last_error}</span>
          </div>
        )}

        <button
          onClick={handleConnect}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Link2 className="h-4 w-4" />
          {t('enedis.connectViaDatahub')}
        </button>
      </div>
    );
  }

  // ── Connected ──────────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-2xl border border-green-200 shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-800">{t('enedis.connectedTitle')}</h2>
            <p className="text-sm text-gray-500">
              {t('enedis.pdl')} <code className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">
                {status.usage_point_id || '—'}
              </code>
              {status.last_sync_at && (
                <> · {t('enedis.lastSync', { date: new Date(status.last_sync_at).toLocaleDateString(dateLocale) })}</>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={handleDisconnect}
          disabled={disconnecting}
          className="inline-flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
        >
          {disconnecting
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Link2Off className="h-3.5 w-3.5" />}
          {t('enedis.disconnect')}
        </button>
      </div>

      {status.last_error && (
        <div className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-500" />
          <span>{status.last_error}</span>
        </div>
      )}

      <button
        onClick={handleSync}
        disabled={syncing}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
      >
        {syncing
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : <RefreshCw className="h-4 w-4" />}
        {syncing ? t('enedis.syncing') : t('enedis.syncNow')}
      </button>

      {syncResult && (
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-xs text-blue-600 font-medium mb-1">{t('enedis.consumption')}</p>
            <p className="text-xl font-bold text-blue-800">
              {syncResult.energy_total_kwh.toLocaleString(dateLocale)}{' '}
              <span className="text-sm font-normal">kWh</span>
            </p>
            <p className="text-xs text-blue-500 mt-1">{t('enedis.readings', { count: syncResult.readings_fetched })}</p>
          </div>
          <div className="bg-orange-50 rounded-xl p-4">
            <p className="text-xs text-orange-600 font-medium mb-1">{t('enedis.scope2co2')}</p>
            <p className="text-xl font-bold text-orange-800">
              {syncResult.co2_total_kgco2e >= 1000
                ? `${(syncResult.co2_total_kgco2e / 1000).toFixed(2)} t`
                : `${syncResult.co2_total_kgco2e.toFixed(1)} kg`}
            </p>
            <p className="text-xs text-orange-500 mt-1">{t('enedis.entriesCreated', { count: syncResult.entries_created })}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function EnedisConnector() {
  const { t, i18n } = useTranslation();
  const numLocale = i18n.language === 'fr' ? 'fr-FR' : 'en-US';
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.name.endsWith('.csv')) {
      setFile(dropped);
      setResult(null);
    } else {
      toast.error(t('enedis.dropCsv'));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/connectors/enedis/import-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
      toast.success(t('enedis.importEntriesCreated', { count: res.data.entries_created }));
    } catch (err: any) {
      toast.error(err.response?.data?.detail || t('enedis.importError'));
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const res = await api.get('/connectors/enedis/template', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'enedis_template.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t('enedis.downloadError'));
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <BackButton to="/app/data/connectors" label={t('enedis.back')} />

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
          <Zap className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('enedis.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('enedis.subtitle')}
          </p>
        </div>
      </div>

      {/* OAuth section — shown only when backend has ENEDIS_CLIENT_ID configured */}
      <OAuthSection />

      {/* CSV import section */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="font-semibold text-gray-700 text-sm">{t('enedis.orImportCsv')}</h2>
        </div>

        <div className="p-6 space-y-4">
          {/* How-to guide */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-800 mb-2">{t('enedis.howToExport')}</p>
                <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                  <li>{t('enedis.step1Before')} <strong>{t('enedis.step1Strong')}</strong></li>
                  <li>{t('enedis.step2')}</li>
                  <li>{t('enedis.step3')}</li>
                  <li>{t('enedis.step4')}</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Upload zone */}
          {!result && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 font-medium">{t('enedis.csvFile')}</span>
                <button
                  onClick={downloadTemplate}
                  className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  {t('enedis.downloadTemplate')}
                </button>
              </div>

              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={[
                  'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
                  dragging
                    ? 'border-blue-400 bg-blue-50'
                    : file
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                ].join(' ')}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle2 className="h-10 w-10 text-green-500" />
                    <p className="font-medium text-gray-800">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024).toFixed(1)} KB — {t('enedis.readyToImport')}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-10 w-10 text-gray-300" />
                    <p className="font-medium text-gray-600">{t('enedis.dropHere')}</p>
                    <p className="text-sm text-gray-400">{t('enedis.orClickSelect')}</p>
                  </div>
                )}
              </div>

              {file && (
                <button
                  onClick={handleImport}
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Zap className="h-5 w-5" />
                      {t('enedis.importAndCalc')}
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{t('enedis.importSuccess')}</p>
                  <p className="text-sm text-gray-500">
                    {t('enedis.importSummary', { readings: result.readings_parsed, entries: result.entries_created })}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-xs text-blue-600 font-medium mb-1">{t('enedis.totalConsumption')}</p>
                  <p className="text-2xl font-bold text-blue-800">
                    {result.energy_total_kwh.toLocaleString(numLocale)}{' '}
                    <span className="text-sm font-normal">kWh</span>
                  </p>
                </div>
                <div className="bg-orange-50 rounded-xl p-4">
                  <p className="text-xs text-orange-600 font-medium mb-1">{t('enedis.scope2emissions')}</p>
                  <p className="text-2xl font-bold text-orange-800">
                    {result.co2_total_kgco2e >= 1000
                      ? `${(result.co2_total_kgco2e / 1000).toFixed(2)} tCO₂e`
                      : `${result.co2_total_kgco2e.toFixed(1)} kgCO₂e`}
                  </p>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                <span className="font-medium">{t('enedis.periodsCovered')}</span>{' '}
                {result.periods.slice(0, 3).join(', ')}
                {result.periods.length > 3 && ` ${t('enedis.andOthers', { count: result.periods.length - 3 })}`}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setFile(null); setResult(null); }}
                  className="flex-1 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {t('enedis.importAnother')}
                </button>
                <a
                  href="/app/data-entry"
                  className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  {t('enedis.viewData')} <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
