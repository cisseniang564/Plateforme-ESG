import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Leaf, Building2, ChevronRight, ChevronLeft, Check, Loader2 } from 'lucide-react';
import api from '@/services/api';

const SECTORS = [
  { id: 'technology', label: 'Technologie & Digital', icon: '💻', color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { id: 'finance', label: 'Finance & Assurance', icon: '🏦', color: 'bg-green-50 border-green-200 text-green-700' },
  { id: 'industry', label: 'Industrie & Fabrication', icon: '🏭', color: 'bg-orange-50 border-orange-200 text-orange-700' },
  { id: 'services', label: 'Services & Conseil', icon: '🤝', color: 'bg-purple-50 border-purple-200 text-purple-700' },
  { id: 'retail', label: 'Commerce & Distribution', icon: '🛒', color: 'bg-pink-50 border-pink-200 text-pink-700' },
  { id: 'general', label: 'Autre / Général', icon: '🌍', color: 'bg-gray-50 border-gray-200 text-gray-700' },
];

export default function FirstTimeSetup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [sector, setSector] = useState('');
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!orgName.trim()) return;
    setLoading(true);
    setError('');
    try {
      await api.post('/onboarding/setup', { org_name: orgName.trim(), sector });
      navigate('/app', { replace: true });
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-primary-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Bienvenue sur ESGFlow</h1>
            <p className="text-sm text-gray-500">Configuration initiale — {step + 1}/3</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex gap-2 mb-8">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-primary-500' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Step 0 — Sector */}
        {step === 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Votre secteur d'activité</h2>
            <p className="text-sm text-gray-500 mb-6">
              Nous pré-configurons vos indicateurs ESG selon votre secteur.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {SECTORS.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSector(s.id)}
                  className={`border-2 rounded-xl p-4 text-left transition-all ${
                    sector === s.id
                      ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl mb-2 block">{s.icon}</span>
                  <span className="text-sm font-medium text-gray-800">{s.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep(1)}
              disabled={!sector}
              className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-xl font-medium disabled:opacity-50 hover:bg-primary-700 transition-colors"
            >
              Continuer <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 1 — Org name */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Nom de votre organisation</h2>
            <p className="text-sm text-gray-500 mb-6">
              Cette organisation sera votre entité principale de suivi ESG.
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Building2 className="inline w-4 h-4 mr-1" />
                Nom de l'organisation
              </label>
              <input
                type="text"
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && orgName.trim() && setStep(2)}
                placeholder="Ex: Acme Corporation"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(0)}
                className="flex items-center gap-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Retour
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!orgName.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-xl font-medium disabled:opacity-50 hover:bg-primary-700 transition-colors"
              >
                Continuer <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Confirmation */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Confirmation</h2>
            <p className="text-sm text-gray-500 mb-6">
              Votre espace ESGFlow va être configuré avec ces paramètres.
            </p>
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <span className="text-xl">{SECTORS.find(s => s.id === sector)?.icon}</span>
                <div>
                  <p className="text-xs text-gray-500">Secteur</p>
                  <p className="text-sm font-medium text-gray-900">{SECTORS.find(s => s.id === sector)?.label}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Building2 className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Organisation</p>
                  <p className="text-sm font-medium text-gray-900">{orgName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                <Check className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-xs text-gray-500">Indicateurs ESG</p>
                  <p className="text-sm font-medium text-gray-900">
                    {sector === 'general' ? 14 : 18} indicateurs pré-configurés (ESRS / GRI)
                  </p>
                </div>
              </div>
            </div>
            {error && (
              <p className="text-sm text-red-600 mb-4 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                disabled={loading}
                className="flex items-center gap-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Retour
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Configuration…</>
                ) : (
                  <><Check className="w-4 h-4" /> Lancer ESGFlow</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
