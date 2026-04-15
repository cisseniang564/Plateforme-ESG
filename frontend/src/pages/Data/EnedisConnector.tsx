import { useState, useRef } from 'react';
import { Zap, Upload, CheckCircle2, Download, ArrowRight, Info } from 'lucide-react';
import { api } from '@/services/api';
import toast from 'react-hot-toast';
import BackButton from '@/components/common/BackButton';

interface ImportResult {
  readings_parsed: number;
  entries_created: number;
  energy_total_kwh: number;
  co2_total_kgco2e: number;
  periods: string[];
}

export default function EnedisConnector() {
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
      toast.error('Veuillez déposer un fichier CSV');
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
      toast.success(`${res.data.entries_created} entrées ESG créées !`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Erreur lors de l'import");
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
      toast.error('Erreur lors du téléchargement');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <BackButton to="/app/data/connectors" label="Connecteurs" />
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
          <Zap className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Connecteur Enedis</h1>
          <p className="text-sm text-gray-500 mt-1">
            Importez vos données de consommation électrique depuis votre espace Enedis.
            Les émissions Scope 2 sont calculées automatiquement (facteur RTE 2023 : 23,4 gCO₂e/kWh).
          </p>
        </div>
      </div>

      {/* How to export from Enedis */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex gap-3">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-800 mb-2">Comment exporter depuis Enedis ?</p>
            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
              <li>Connectez-vous sur <strong>monespace.enedis.fr</strong></li>
              <li>Allez dans "Ma consommation" → "Télécharger mes données"</li>
              <li>Sélectionnez la période souhaitée et le format CSV</li>
              <li>Téléchargez et importez ici</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Upload zone */}
      {!result && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Importer un fichier CSV</h2>
            <button
              onClick={downloadTemplate}
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Télécharger le modèle CSV
            </button>
          </div>

          {/* Drop zone */}
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
                  {(file.size / 1024).toFixed(1)} KB — Prêt à importer
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-10 w-10 text-gray-300" />
                <p className="font-medium text-gray-600">Glissez votre fichier CSV Enedis ici</p>
                <p className="text-sm text-gray-400">ou cliquez pour sélectionner</p>
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
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Zap className="h-5 w-5" />
                  Importer et calculer les émissions
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Import réussi !</p>
              <p className="text-sm text-gray-500">
                {result.readings_parsed} lectures importées, {result.entries_created} entrées ESG créées
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-xs text-blue-600 font-medium mb-1">Consommation totale</p>
              <p className="text-2xl font-bold text-blue-800">
                {result.energy_total_kwh.toLocaleString('fr-FR')}{' '}
                <span className="text-sm font-normal">kWh</span>
              </p>
            </div>
            <div className="bg-orange-50 rounded-xl p-4">
              <p className="text-xs text-orange-600 font-medium mb-1">Émissions Scope 2</p>
              <p className="text-2xl font-bold text-orange-800">
                {result.co2_total_kgco2e >= 1000
                  ? `${(result.co2_total_kgco2e / 1000).toFixed(2)} tCO₂e`
                  : `${result.co2_total_kgco2e.toFixed(1)} kgCO₂e`}
              </p>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            <span className="font-medium">Périodes couvertes :</span>{' '}
            {result.periods.slice(0, 3).join(', ')}
            {result.periods.length > 3 && ` et ${result.periods.length - 3} autres`}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { setFile(null); setResult(null); }}
              className="flex-1 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Importer un autre fichier
            </button>
            <a
              href="/app/data-entry"
              className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              Voir les données <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
