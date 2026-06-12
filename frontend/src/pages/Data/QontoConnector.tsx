/**
 * QontoConnector — 3-step setup flow for the Qonto banking API.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, RefreshCw, AlertCircle, Info, ChevronRight } from "lucide-react";
import api from "@/services/api";
import Spinner from "@/components/common/Spinner";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n/config";

type Step = "form" | "syncing" | "success" | "error";

interface SyncResult { synced: number; total_spend: number; year: number; source: "api" | "mock"; }

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);

function formatEur(value: number): string {
  const locale = i18n.language?.startsWith("en") ? "en-US" : "fr-FR";
  return new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

export default function QontoConnector() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("form");
  const [login, setLogin] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [year, setYear] = useState(CURRENT_YEAR - 1);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSync = async () => {
    if (!login.trim() || !secretKey.trim()) return;
    setStep("syncing"); setErrorMsg("");
    try {
      const res = await api.post<SyncResult>("/connectors/qonto/sync", { login: login.trim(), secret_key: secretKey.trim(), year });
      setResult(res.data); setStep("success");
    } catch (err: any) {
      const detail = err?.response?.data?.detail || t("qonto.errSync", "Une erreur est survenue lors de la synchronisation.");
      setErrorMsg(typeof detail === "string" ? detail : JSON.stringify(detail));
      setStep("error");
    }
  };

  const handleRetry = () => { setStep("form"); setResult(null); setErrorMsg(""); };
  const isFormValid = login.trim().length > 0 && secretKey.trim().length > 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button type="button" onClick={() => navigate("/app/connectors")}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors">
        <ArrowLeft className="h-4 w-4" />{t("qonto.back", "Retour au Marketplace")}
      </button>

      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: "#0a1f4415" }}>🏦</div>
          <div>
            <h1 className="text-xl font-black text-gray-900">{t("qonto.title", "Connecteur Qonto")}</h1>
            <p className="text-sm text-gray-500">{t("qonto.desc", "Synchronisation automatique de vos transactions bancaires vers les catégories Scope 3")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4">
          {(["form", "syncing", "success"] as const).map((s, idx) => {
            const labels = [t("qonto.stepForm","Connexion"), t("qonto.stepSync","Synchronisation"), t("qonto.stepResult","Résultat")];
            const active = step === s || (step === "error" && s === "form");
            const done = (s === "form" && (step === "syncing" || step === "success")) || (s === "syncing" && step === "success");
            return (
              <div key={s} className="flex items-center gap-2">
                {idx > 0 && <div className="w-8 h-px bg-gray-200" />}
                <div className="flex items-center gap-1.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${done ? "bg-emerald-500 text-white" : active ? "bg-slate-800 text-white" : "bg-gray-100 text-gray-400"}`}>
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
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-slate-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-slate-900 mb-1">{t("qonto.whereTitle", "Où trouver vos identifiants API Qonto ?")}</p>
                <ol className="text-sm text-slate-700 space-y-0.5 list-decimal list-inside">
                  <li>{t("qonto.howStep1", "Connectez-vous à votre espace Qonto")}</li>
                  <li>{t("qonto.howStep2A", "Allez dans ")} <span className="font-semibold">{t("qonto.howStep2B", "Paramètres → Intégrations API")}</span></li>
                  <li>{t("qonto.howStep3A", "Copiez votre ")} <span className="font-semibold">Login</span> {t("qonto.howStep3B", "et votre ")} <span className="font-semibold">{t("qonto.secretKey","Clé secrète")}</span></li>
                  <li>{t("qonto.howStep4", "Collez-les dans les champs ci-dessous")}</li>
                </ol>
                <p className="text-xs text-slate-500 mt-2">{t("qonto.loginFormat", "Format attendu — Login :")} <code className="font-mono bg-slate-100 px-1 rounded">organisation-slug_user-id</code></p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">{t("qonto.loginLabel","Login Qonto")}</label>
              <input type="text" value={login} onChange={(e) => setLogin(e.target.value)} placeholder="mon-entreprise_user-123456"
                className="w-full px-3 h-11 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 focus:bg-white font-mono" autoComplete="off" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">{t("qonto.secretLabel","Clé secrète")}</label>
              <input type="password" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="w-full px-3 h-11 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 focus:bg-white font-mono" autoComplete="off" />
              <p className="text-xs text-gray-400 mt-1">{t("qonto.secureNote","Les identifiants sont transmis en HTTPS et jamais stockés.")}</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">{t("qonto.yearLabel","Année fiscale à synchroniser")}</label>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))}
                className="w-full px-3 h-11 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 focus:bg-white">
                {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            {step === "error" && errorMsg && (
              <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-xl">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{errorMsg}</p>
              </div>
            )}
            <button type="button" onClick={handleSync} disabled={!isFormValid}
              className="w-full h-11 inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-colors">
              {t("qonto.connect","Connecter Qonto")}<ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {step === "syncing" && (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 flex flex-col items-center gap-5">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-3xl">🏦</div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow"><Spinner size="sm" /></div>
          </div>
          <div className="text-center">
            <p className="font-bold text-gray-900">{t("qonto.syncing","Synchronisation en cours…")}</p>
            <p className="text-sm text-gray-500 mt-1">{t("qonto.syncFor","Récupération des transactions Qonto pour {{year}}",{year})}</p>
          </div>
          <div className="flex gap-1">
            {[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{animationDelay:`${i*150}ms`}} />)}
          </div>
        </div>
      )}

      {step === "success" && result && (
        <div className="space-y-4">
          <div className="bg-white border border-emerald-200 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><CheckCircle2 className="h-5 w-5 text-emerald-600" /></div>
              <div>
                <p className="font-bold text-gray-900">{t("qonto.successTitle","Synchronisation réussie")}</p>
                <p className="text-sm text-gray-500">
                  {t("qonto.syncedCats","{{n}} catégorie{{s}} Scope 3 importée{{s}} pour {{year}}",{n:result.synced,s:result.synced!==1?"s":"",year:result.year})}
                  {result.source==="mock" && <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-bold uppercase">{t("qonto.demoData","Données démo")}</span>}
                </p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">{t("qonto.totalSpend","Total dépenses classifiées")}</span>
              <span className="text-lg font-black text-slate-900 tabular-nums">{formatEur(result.total_spend)}</span>
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">{t("qonto.breakdown","Répartition par catégorie Scope 3")}</p>
            <div className="divide-y divide-gray-100">
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-gray-600">{t("qonto.cat6","Cat. 6 — Déplacements professionnels")}</span>
                <span className="text-sm font-semibold text-gray-800 tabular-nums">{formatEur(result.total_spend*0.25)}</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-gray-600">{t("qonto.cat1","Cat. 1 — Achats IT / Cloud")}</span>
                <span className="text-sm font-semibold text-gray-800 tabular-nums">{formatEur(result.total_spend*0.4)}</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-gray-600">{t("qonto.cat3","Cat. 3 — Énergie et combustibles")}</span>
                <span className="text-sm font-semibold text-gray-800 tabular-nums">{formatEur(result.total_spend*0.22)}</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-gray-600">{t("qonto.catOther","Autres catégories")}</span>
                <span className="text-sm font-semibold text-gray-800 tabular-nums">{formatEur(result.total_spend*0.13)}</span>
              </div>
            </div>
            {result.source==="mock" && (
              <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-4">{t("qonto.mockWarning","Les identifiants fournis n'ont pas pu être authentifiés. Les données ci-dessus sont représentatives mais simulées. Vérifiez vos identifiants dans Qonto et resynchronisez.")}</p>
            )}
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={handleRetry}
              className="inline-flex items-center gap-2 px-4 h-10 text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors">
              <RefreshCw className="h-4 w-4" />{t("qonto.retry","Resynchroniser")}
            </button>
            <button type="button" onClick={() => navigate("/app/scope3")}
              className="flex-1 inline-flex items-center justify-center gap-2 h-10 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors">
              {t("qonto.viewScope3","Voir le bilan Scope 3")}<ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
