/**
 * OnboardingChecklist — Persistent floating in-product checklist.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Circle, ChevronDown, ChevronUp, X, Sparkles, ArrowRight } from 'lucide-react';
import api from '@/services/api';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

interface ChecklistStep { id: string; label: string; description: string; href?: string; apiCheck?: boolean; }

function getSTEPS(t: TFunction): ChecklistStep[] {
  return [
    { id: 'account',    label: t('onb.l1','Créer votre compte'),                description: t('onb.d1','Compte créé et email vérifié'),                            apiCheck: false },
    { id: 'org',        label: t('onb.l2','Configurer votre organisation'),      description: t('onb.d2','Renseignez le profil de votre entreprise'),                href: '/app/organizations', apiCheck: true },
    { id: 'indicator',  label: t('onb.l3','Ajouter un indicateur ESG'),          description: t('onb.d3','Créez votre premier indicateur de suivi'),                 href: '/app/indicators',   apiCheck: true },
    { id: 'carbon',     label: t('onb.l4','Compléter le Bilan Carbone'),         description: t('onb.d4','Saisir Scope 1, 2 & 3 dans le bilan GES'),                href: '/app/carbon' },
    { id: 'materiality',label: t('onb.l5',"Lancer l'analyse de matérialité"),    description: t('onb.d5','Identifier vos enjeux ESG prioritaires (CSRD)'),          href: '/app/materiality' },
    { id: 'connector',  label: t('onb.l6','Connecter une source de données'),    description: t('onb.d6','ENEDIS, API, import CSV...'),                             href: '/app/data/connectors' },
    { id: 'report',     label: t('onb.l7','Exporter votre premier rapport'),     description: t('onb.d7','Générez un rapport CSRD ou GRI'),                         href: '/app/reports' },
  ];
}

const LS_KEY = 'esgflow_onboarding_checklist_v2';
const LS_DISMISSED = 'esgflow_onboarding_dismissed';
const LS_COLLAPSED = 'esgflow_onboarding_collapsed';

interface ChecklistState { completed: Record<string, boolean>; lastCompletedAll?: string; }

export default function OnboardingChecklist() {
  const { t } = useTranslation();
  const STEPS = getSTEPS(t);
  const navigate = useNavigate();
  const [state, setState] = useState<ChecklistState>({ completed: {} });
  const [collapsed, setCollapsed] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setState(JSON.parse(raw));
      setCollapsed(localStorage.getItem(LS_COLLAPSED) !== 'open');
      setDismissed(localStorage.getItem(LS_DISMISSED) === '1');
    } catch {/* ignore */}
    setLoaded(true);
  }, []);

  useEffect(() => {
    api.get('/onboarding/status')
      .then(res => {
        const d = res.data;
        setState(prev => {
          const updated: ChecklistState = { ...prev, completed: { ...prev.completed, account: true, org: d.has_organizations ?? false, indicator: d.has_indicators ?? false } };
          try { localStorage.setItem(LS_KEY, JSON.stringify(updated)); } catch {/* ignore */}
          return updated;
        });
      })
      .catch(() => {
        setState(prev => {
          const updated = { ...prev, completed: { ...prev.completed, account: true } };
          try { localStorage.setItem(LS_KEY, JSON.stringify(updated)); } catch {/* ignore */}
          return updated;
        });
      });
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed(c => { const next = !c; try { localStorage.setItem(LS_COLLAPSED, next ? 'closed' : 'open'); } catch {/* ignore */} return next; });
  }, []);

  const markDone = useCallback((id: string) => {
    setState(prev => {
      const updated: ChecklistState = { ...prev, completed: { ...prev.completed, [id]: true } };
      try { localStorage.setItem(LS_KEY, JSON.stringify(updated)); } catch {/* ignore */}
      return updated;
    });
  }, []);

  const dismiss = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); setDismissed(true);
    try { localStorage.setItem(LS_DISMISSED, '1'); } catch {/* ignore */}
  }, []);

  if (!loaded || dismissed) return null;

  const doneCount = STEPS.filter(s => state.completed[s.id]).length;
  const totalCount = STEPS.length;
  const pct = Math.round((doneCount / totalCount) * 100);
  const allDone = doneCount === totalCount;

  if (allDone && state.lastCompletedAll) {
    const diff = Date.now() - new Date(state.lastCompletedAll).getTime();
    if (diff > 7 * 24 * 3600 * 1000) return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 w-80 rounded-2xl shadow-2xl overflow-hidden" style={{ background: 'white', border: '1px solid #e5e7eb', boxShadow: '0 20px 60px -10px rgba(0,0,0,0.2), 0 4px 16px -4px rgba(0,0,0,0.1)' }}>
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none" style={{ background: allDone ? 'linear-gradient(135deg, #059669, #10b981)' : 'linear-gradient(135deg, #0ea5e9, #6366f1)' }} onClick={toggleCollapsed}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}><Sparkles className="h-4 w-4 text-white" /></div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white leading-tight">{allDone ? t('onb.allDone','Configuration terminée') : t('onb.title','Démarrez avec ESG Flow')}</p>
          <p className="text-xs text-white/75 mt-0.5">{t('onb.progress','{{done}}/{{total}} étapes · {{pct}}%',{done:doneCount,total:totalCount,pct})}</p>
        </div>
        <div className="flex-shrink-0 relative w-8 h-8">
          <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
            <circle cx="16" cy="16" r="12" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
            <circle cx="16" cy="16" r="12" fill="none" stroke="white" strokeWidth="3" strokeDasharray={`${(pct/100)*75.4} 75.4`} strokeLinecap="round" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white">{pct}</span>
        </div>
        {collapsed ? <ChevronUp className="h-4 w-4 text-white/80 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-white/80 flex-shrink-0" />}
        <button className="p-1 rounded-lg hover:bg-white/20 transition-colors flex-shrink-0" onClick={dismiss} title={t('onb.dismiss','Masquer définitivement')}>
          <X className="h-3.5 w-3.5 text-white/80" />
        </button>
      </div>

      {!collapsed && (
        <div className="max-h-96 overflow-y-auto">
          <div className="px-4 pt-3 pb-1">
            <div className="h-1.5 rounded-full bg-gray-100">
              <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: allDone ? 'linear-gradient(90deg, #059669, #10b981)' : 'linear-gradient(90deg, #0ea5e9, #6366f1)' }} />
            </div>
          </div>
          <div className="px-3 py-2 space-y-0.5">
            {STEPS.map(step => {
              const done = !!state.completed[step.id];
              return (
                <div key={step.id} className="flex items-center gap-3 px-2 py-2.5 rounded-xl transition-colors group" style={{ cursor: (step.href || !done) ? 'pointer' : 'default' }}
                  onClick={() => { if (!done) markDone(step.id); if (step.href) navigate(step.href); }}>
                  {done ? <CheckCircle className="h-5 w-5 flex-shrink-0" style={{ color: '#059669' }} /> : <Circle className="h-5 w-5 flex-shrink-0 text-gray-300 group-hover:text-gray-400 transition-colors" />}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium leading-tight ${done ? 'line-through text-gray-400' : 'text-gray-800'}`}>{step.label}</p>
                    {!done && <p className="text-xs text-gray-400 mt-0.5 leading-tight">{step.description}</p>}
                  </div>
                  {!done && step.href && <ArrowRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-500 flex-shrink-0 transition-colors" />}
                </div>
              );
            })}
          </div>
          {allDone ? (
            <div className="px-4 pb-4 pt-1 text-center">
              <p className="text-xs text-gray-400">{t('onb.allComplete','Toutes les étapes sont complètes 🎉')}</p>
              <button onClick={dismiss} className="mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
                {t('onb.hide','Masquer ce panneau')}
              </button>
            </div>
          ) : (
            <div className="px-4 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center">{t('onb.hint','Cliquez sur une étape pour la marquer et y accéder')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
