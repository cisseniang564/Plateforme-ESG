/**
 * SupplierPortal — Public self-service ESG questionnaire for suppliers.
 * Accessible via /supplier-portal/:token (no authentication required).
 */
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Leaf, Users, Shield, CheckCircle, AlertTriangle,
  ChevronRight, ChevronLeft, Loader2, Send, Info,
} from 'lucide-react';
import api from '@/services/api';

interface Question {
  id: string;
  section: string;
  question: string;
  type: 'number' | 'boolean' | 'select';
  unit: string;
  required: boolean;
  help: string;
  options?: string[];
}

interface PortalData {
  supplier_name: string;
  supplier_id: string;
  already_completed: boolean;
  questions: Question[];
  token: string;
}

const SECTION_CONFIG: Record<string, { icon: React.FC<{className?: string}>; color: string; bg: string; description: string }> = {
  Environnement: { icon: Leaf, color: 'text-green-600', bg: 'bg-green-50 border-green-200', description: 'Émissions GES, énergie et ressources naturelles' },
  Social: { icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', description: 'Emploi, sécurité et développement des collaborateurs' },
  Gouvernance: { icon: Shield, color: 'text-violet-600', bg: 'bg-violet-50 border-violet-200', description: 'Éthique, conformité et pratiques de gestion' },
};

const SECTIONS = ['Environnement', 'Social', 'Gouvernance'];

export default function SupplierPortal() {
  const { token } = useParams<{ token: string }>();
  const [portalData, setPortalData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSection, setCurrentSection] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [scores, setScores] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    if (!token) { setError('Lien invalide'); setLoading(false); return; }
    api.get(`/supply-chain/portal/${token}`)
      .then(r => {
        setPortalData(r.data);
        if (r.data.already_completed) setSubmitted(true);
      })
      .catch(e => setError(e.response?.data?.detail || 'Lien invalide ou expiré'))
      .finally(() => setLoading(false));
  }, [token]);

  const currentQuestions = portalData?.questions.filter(q => q.section === SECTIONS[currentSection]) || [];
  const totalAnswered = Object.keys(answers).filter(k => answers[k] !== '' && answers[k] !== null && answers[k] !== undefined).length;
  const totalRequired = portalData?.questions.filter(q => q.required).length || 0;
  const requiredAnswered = portalData?.questions.filter(q => q.required && answers[q.id] !== undefined && answers[q.id] !== '').length || 0;

  const setAnswer = (id: string, value: any) => {
    setAnswers(prev => ({ ...prev, [id]: value }));
  };

  const canSubmit = requiredAnswered >= totalRequired;

  const handleSubmit = async () => {
    if (!canSubmit || !token) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/supply-chain/portal/${token}/submit`, { answers });
      setScores(res.data.scores);
      setSubmitted(true);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Erreur lors de la soumission');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 text-violet-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Chargement du questionnaire…</p>
        </div>
      </div>
    );
  }

  if (error && !portalData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-10 shadow-lg max-w-md w-full text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Lien invalide</h2>
          <p className="text-gray-500">{error}</p>
          <p className="text-sm text-gray-400 mt-4">Veuillez contacter votre partenaire ESGFlow pour obtenir un nouveau lien.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-10 shadow-xl max-w-lg w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {portalData?.already_completed ? 'Déjà soumis' : 'Questionnaire soumis !'}
          </h2>
          <p className="text-gray-500 mb-6">
            {portalData?.already_completed
              ? 'Vous avez déjà complété ce questionnaire ESG.'
              : `Merci ${portalData?.supplier_name} ! Vos données ESG ont été transmises avec succès.`
            }
          </p>
          {scores && (
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: 'Environnement', value: scores.env_score, color: 'text-green-600 bg-green-50' },
                { label: 'Social', value: scores.social_score, color: 'text-blue-600 bg-blue-50' },
                { label: 'Gouvernance', value: scores.gov_score, color: 'text-violet-600 bg-violet-50' },
              ].map(s => (
                <div key={s.label} className={`rounded-xl p-3 ${s.color}`}>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs font-medium mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}
          {scores && (
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-500">Score ESG global</p>
              <p className="text-4xl font-bold text-gray-900">{scores.global_score}<span className="text-xl text-gray-400">/100</span></p>
              <p className={`text-sm font-semibold mt-1 ${scores.global_score >= 70 ? 'text-green-600' : scores.global_score >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                Risque {scores.global_score >= 70 ? 'Faible' : scores.global_score >= 50 ? 'Moyen' : 'Élevé'}
              </p>
            </div>
          )}
          <p className="text-xs text-gray-400">Propulsé par ESGFlow · Plateforme ESG</p>
        </div>
      </div>
    );
  }

  const sectionCfg = SECTION_CONFIG[SECTIONS[currentSection]];
  const SectionIcon = sectionCfg.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg flex items-center justify-center">
            <Leaf className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">ESGFlow</p>
            <p className="text-xs text-gray-400">Questionnaire ESG fournisseur</p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Intro */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
          <h1 className="text-xl font-bold text-gray-900 mb-1">
            Questionnaire ESG — <span className="text-violet-600">{portalData?.supplier_name}</span>
          </h1>
          <p className="text-sm text-gray-500">
            Complétez ce questionnaire pour évaluer votre performance ESG et renforcer votre relation avec votre partenaire.
            Vos réponses restent confidentielles.
          </p>
          {/* Progress */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>{totalAnswered} réponses saisies</span>
              <span>{requiredAnswered}/{totalRequired} obligatoires</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full">
              <div
                className="h-2 bg-violet-500 rounded-full transition-all"
                style={{ width: `${totalRequired > 0 ? (requiredAnswered / totalRequired) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Section tabs */}
        <div className="flex gap-2 mb-6">
          {SECTIONS.map((section, idx) => {
            const cfg = SECTION_CONFIG[section];
            const Icon = cfg.icon;
            const sectionQs = portalData?.questions.filter(q => q.section === section) || [];
            const answered = sectionQs.filter(q => answers[q.id] !== undefined && answers[q.id] !== '').length;
            return (
              <button
                key={section}
                onClick={() => setCurrentSection(idx)}
                className={`flex-1 py-3 px-2 rounded-xl border text-xs font-semibold transition-all ${
                  currentSection === idx ? cfg.bg + ' ' + cfg.color : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <Icon className={`h-4 w-4 mx-auto mb-1 ${currentSection === idx ? cfg.color : 'text-gray-400'}`} />
                {section}
                <span className={`block text-[10px] ${currentSection === idx ? cfg.color : 'text-gray-400'}`}>
                  {answered}/{sectionQs.length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Questions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className={`px-6 py-4 border-b flex items-center gap-3 ${sectionCfg.bg}`}>
            <SectionIcon className={`h-5 w-5 ${sectionCfg.color}`} />
            <div>
              <h2 className={`font-bold text-sm ${sectionCfg.color}`}>{SECTIONS[currentSection]}</h2>
              <p className="text-xs text-gray-500">{sectionCfg.description}</p>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {currentQuestions.map(q => (
              <div key={q.id} className="px-6 py-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <label className="text-sm font-medium text-gray-800">
                    {q.question}
                    {q.required && <span className="text-red-500 ml-1">*</span>}
                    {q.unit && <span className="text-gray-400 text-xs ml-1">({q.unit})</span>}
                  </label>
                </div>
                {q.help && (
                  <p className="text-xs text-gray-400 flex items-center gap-1 mb-3">
                    <Info className="h-3 w-3 flex-shrink-0" /> {q.help}
                  </p>
                )}
                {q.type === 'number' && (
                  <input
                    type="number"
                    min={0}
                    value={answers[q.id] ?? ''}
                    onChange={e => setAnswer(q.id, e.target.value)}
                    placeholder={`Saisir en ${q.unit || 'valeur'}`}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                )}
                {q.type === 'boolean' && (
                  <div className="flex gap-3">
                    {['Oui', 'Non'].map(opt => (
                      <button
                        key={opt}
                        onClick={() => setAnswer(q.id, opt === 'Oui')}
                        className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                          answers[q.id] === (opt === 'Oui')
                            ? 'bg-violet-600 border-violet-600 text-white'
                            : 'border-gray-200 text-gray-600 hover:border-violet-300 hover:bg-violet-50'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
                {q.type === 'select' && (
                  <select
                    value={answers[q.id] ?? ''}
                    onChange={e => setAnswer(q.id, e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="">Sélectionner…</option>
                    {q.options?.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => setCurrentSection(s => Math.max(0, s - 1))}
            disabled={currentSection === 0}
            className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition"
          >
            <ChevronLeft className="h-4 w-4" /> Précédent
          </button>

          {currentSection < SECTIONS.length - 1 ? (
            <button
              onClick={() => setCurrentSection(s => s + 1)}
              className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-medium transition"
            >
              Suivant <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {submitting ? 'Envoi en cours…' : 'Soumettre le questionnaire'}
            </button>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Propulsé par <strong>ESGFlow</strong> · Vos données sont traitées de façon sécurisée et confidentielle
        </p>
      </div>
    </div>
  );
}
