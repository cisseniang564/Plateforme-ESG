/**
 * PennylaneConnector — 3-step setup flow for the Pennylane accounting API.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, RefreshCw, AlertCircle, Info, ChevronRight } from "lucide-react";
import api from "@/services/api";
import Spinner from "@/components/common/Spinner";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import i18n from "@/i18n/config";

type Step = "form" | "syncing" | "success" | "error";
interface SyncResult { synced: number; categories: Record<string, number>; year: number; source: "api" | "mock"; }

function getCATEGORY_LABELS(t: TFunction): Record<string, string> {
  return {
    scope3_cat6_travel:  t("penny.cat6",      "Cat. 6 — Déplacements professionnels"),
    scope3_cat1_it:      t("penny.cat1it",    "Cat. 1 — Achats IT / Cloud"),
    scope3_cat1_office:  t("penny.cat1office","Cat. 1 — Fournitures de bureau"),
    scope3_cat3_energy:  t("penny.cat3",      "Cat. 3 — Énergie et combustibles"),
  };
}

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);

function formatEur(value: number): string {
  const locale = i18n.language?.startsWith("en") ? "en-US" : "fr-FR";
  return new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

export default function PennylaneConnector() {
  const { t } = useTranslation();
  const CATEGORY_LABELS = getCATEGORY_LABELS(t);
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("form");
  const [apiKey, setApiKey] = useState("");
  const [year, setYear] = useState(CURRENT_YEAR - 1);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSync = async () => {
    if (!apiKey.trim()) return;
    setStep("syncing"); setErrorMsg("");
    try {
      const res = await api.post<SyncResult>("/connectors/pennylane/sync", { api_key: apiKey.trim(), year });
      setResult(res.data); setStep("success");
    } catch (err: any) {
      const detail = err?.response?.data?.detail || t("penny.errSync","Une erreur est survenue lors de la synchronisation.");
      setErrorMsg(typeof detail === "string" ? detail : JSON.stringify(detail));
      setStep("error");
    }
  };

  const handleRetry = () => { setStep("form"); setResult(null); setErrorMsg(""); };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button type="button" onClick={() => navigate("/app/connectors")}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors">
        <ArrowLeft className="h-4 w-4" />{t("penny.back","Retour au Marketplace")}
      </button>

      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: "#6366f115" }}>🔷</div>
          <div>
            <h1 className="text-xl font-black text-gray-900">{t("penny.title","Connecteur Pennylane")}</h1>
            <p className="text-sm text-gray-500">{t("penny.desc","Synchronisation automatique de vos factures fournisseurs vers les catégories Scope 3")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4">
          {(["form","syncing","success"] as const).map((s, idx) => {
            const labels = [t("penny.stepForm","Connexion"), t("penny.stepSync","Synchronisation"), t("penny.stepResult","Résultat")];
            const active = step === s || (step === "error" && s === "form");
            const done = (s === "form" && (step === "syncing" || step === "success")) || (s === "syncing" && step === "success");
            return (
              <div key={s} className="flex items-center gap-2">
                {idx > 0 && <div className="w-8 h-px bg-gray-200" />}
                <div className="flex items-center gap-1.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${done ? "bg-emerald-500 text-white" : active ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-400"}`}>
                    {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : idx + 1}
                  </div>
                  <span className={`text-xs font-semibold hidden sm:block ${active ? "text-gray-900" : "text-gray-400"}`}>{labels[idx]}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {(step === "form" || step === "error") && (
        <div className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-indigo-900 mb-1">{t("penny.whereTitle","Où trouver votre clé API Pennylane ?")}</p>
                <ol className="text-sm text-indigo-700 space-y-0.5 list-decimal list-inside">
                  <li>{t("penny.step1","Connectez-vous à votre espace Pennylane")}</li>
                  <li>{t("penny.step2A","Allez dans ")} <span className="font-semibold">{t("penny.step2B","Paramètres → Intégrations → Clé API")}</span></li>
                  <li>{t("penny.step3A","Cliquez sur ")} <span className="font-semibold">{t("penny.step3B","Générer une clé")}</span></li>
                  <li>{t("penny.step4","Copiez la clé et collez-la ci-dessous")}</li>
                </ol>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">{t("penny.apiKeyLabel","Clé API Pennylane")}</label>
              <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk_live_xxxxxxxxxxxxxxxxxxxx"
                className="w-full px-3 h-11 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white font-mono" autoComplete="off" />
              <p className="text-xs text-gray-400 mt-1">{t("penny.secureNote","La clé est transmise en HTTPS et jamais stockée.")}</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">{t("penny.yearLabel","Année fiscale à synchroniser")}</label>
              <select value={year} onChange={e => setYear(Number(e.target.value))}
                className="w-full px-3 h-11 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white">
                {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            {step === "error" && errorMsg && (
              <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-xl">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{errorMsg}</p>
              </div>
            )}
            <button type="button" onClick={handleSync} disabled={!apiKey.trim()}
              className="w-full h-11 inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-colors">
              {t("penny.connect","Connecter Pennylane")}<ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {step === "syncing" && (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 flex flex-col items-center gap-5">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center text-3xl">🔷</div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow"><Spinner size="sm" /></div>
          </div>
          <div className="text-center">
            <p className="font-bold text-gray-900">{t("penny.syncing","Synchronisation en cours…")}</p>
            <p className="text-sm text-gray-500 mt-1">{t("penny.syncFor","Récupération des factures Pennylane pour {{year}}",{year})}</p>
          </div>
          <div className="flex gap-1">
            {[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-indigo-300 animate-bounce" style={{animationDelay:`${i*150}ms`}} />)}
          </div>
        </div>
      )}

      {step === "success" && result && (
        <div className="space-y-4">
          <div className="bg-white border border-emerald-200 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><CheckCircle2 className="h-5 w-5 text-emerald-600" /></div>
              <div>
                <p className="font-bold text-gray-900">{t("penny.successTitle","Synchronisation réussie")}</p>
                <p className="text-sm text-gray-500">
                  {t("penny.syncedIndicators","{{n}} indicateur{{s}} Scope 3 importé{{s}} pour {{year}}",{n:result.synced,s:result.synced!==1?"s":"",year:result.year})}
                  {result.source==="mock" && <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-bold uppercase">{t("penny.demoData","Données démo")}</span>}
                </p>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {Object.entries(result.categories).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{CATEGORY_LABELS[key] ?? key}</p>
                    <p className="text-xs text-gray-400 font-mono">{key}</p>
                  </div>
                  <span className="text-sm font-bold text-gray-900 tabular-nums">{formatEur(value)}</span>
                </div>
              ))}
            </div>
            {result.source==="mock" && (
              <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-4">{t("penny.mockWarning","La clé API fournie n'a pas pu être authentifiée. Les données ci-dessus sont représentatives mais simulées. Vérifiez votre clé dans Pennylane et resynchronisez.")}</p>
            )}
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={handleRetry}
              className="inline-flex items-center gap-2 px-4 h-10 text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors">
              <RefreshCw className="h-4 w-4" />{t("penny.retry","Resynchroniser")}
            </button>
            <button type="button" onClick={() => navigate("/app/scope3")}
              className="flex-1 inline-flex items-center justify-center gap-2 h-10 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors">
              {t("penny.viewScope3","Voir le bilan Scope 3")}<ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
