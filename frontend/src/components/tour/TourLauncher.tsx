import { useEffect, useRef, useState } from 'react';
import {
  Map, X, PlayCircle, RotateCcw, ChevronRight, CheckCircle2,
  Sparkles, BookOpen, Clock, ChevronDown, Keyboard, ArrowRight,
} from 'lucide-react';
import { useTourContext } from './TourContext';
import { TOUR_CHAPTERS, TOUR_STEPS } from './tourSteps';

// Total steps per chapter for progress display
const CHAPTER_STEP_MAP = TOUR_CHAPTERS.reduce<Record<string, number>>((acc, ch) => {
  acc[ch.id] = ch.stepCount;
  return acc;
}, {});

export default function TourLauncher() {
  const { startTour, startFromStep, isCompleted, isDismissed, run, stepIndex } = useTourContext();
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(true);
  const [activeChapter, setActiveChapter] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Stop pulsing after first open
  useEffect(() => { if (open) setPulse(false); }, [open]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        !btnRef.current?.contains(e.target as Node)
      ) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close panel when tour starts / keyboard ESC
  useEffect(() => { if (run) setOpen(false); }, [run]);
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  const totalSteps = TOUR_STEPS.length;
  const totalMinutes = Math.ceil(totalSteps * 0.12);

  // Global progress
  const globalProgress = isCompleted ? 100 : isDismissed
    ? Math.round(((stepIndex + 1) / totalSteps) * 100)
    : 0;

  // Which chapters are "done" (stepStart + stepCount - 1 < current stepIndex)
  const chapterProgress = (ch: typeof TOUR_CHAPTERS[0]) => {
    if (isCompleted) return 'done';
    const last = ch.stepStart + ch.stepCount - 1;
    if (last < stepIndex) return 'done';
    if (ch.stepStart <= stepIndex) return 'active';
    return 'pending';
  };

  return (
    <div className="relative">
      {/* ── Trigger button ─────────────────────────────────────────────────── */}
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Ouvrir le tour guidé"
        className={`relative flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-xl transition-all duration-200 shadow-sm
          ${open
            ? 'bg-emerald-700 text-white shadow-lg shadow-emerald-900/20 ring-2 ring-emerald-400/30'
            : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 hover:shadow-md hover:shadow-emerald-100'
          }`}
      >
        {pulse && !isCompleted && (
          <span className="absolute inset-0 rounded-xl animate-ping bg-emerald-400 opacity-25 pointer-events-none" />
        )}
        <Map className="h-4 w-4 flex-shrink-0" />
        <span className="hidden sm:inline">Tour guidé</span>
        {isCompleted ? (
          <CheckCircle2 className="h-3.5 w-3.5 opacity-90" />
        ) : (
          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {/* ── Floating panel ─────────────────────────────────────────────────── */}
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Tour guidé ESGFlow"
          className="absolute right-0 top-full mt-2 w-[460px] max-w-[calc(100vw-2rem)] origin-top-right rounded-2xl border border-gray-100/80 bg-white shadow-2xl shadow-gray-400/20 z-50 overflow-hidden"
          style={{ animation: 'tourPanelIn 0.2s cubic-bezier(0.16,1,0.3,1) both' }}
        >
          {/* ── Hero header ── */}
          <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 px-5 py-5 text-white overflow-hidden">
            {/* decorative grid */}
            <div className="absolute inset-0 opacity-[0.06]"
              style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

            <div className="relative flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full px-3 py-1">
                    <Sparkles className="h-3 w-3" />
                    Tour interactif
                  </span>
                </div>
                <h3 className="text-xl font-bold tracking-tight">Découvrez ESGFlow</h3>
                <p className="text-sm text-slate-300/80 mt-1 max-w-xs">
                  Toutes les fonctionnalités, étape par étape, en moins de {totalMinutes} minutes.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="flex-shrink-0 p-1.5 rounded-xl hover:bg-white/10 transition-colors text-white/50 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Stats row */}
            <div className="relative mt-4 flex items-center gap-4 text-xs text-white/60">
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-emerald-400" />
                <strong className="text-white">{totalSteps}</strong> étapes
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-emerald-400" />
                ≈ <strong className="text-white">{totalMinutes}</strong> min
              </span>
              <span className="flex items-center gap-1.5">
                <Map className="h-3.5 w-3.5 text-emerald-400" />
                <strong className="text-white">{TOUR_CHAPTERS.length}</strong> chapitres
              </span>
            </div>

            {/* Global progress bar */}
            <div className="relative mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-white/40 uppercase tracking-wider">Progression</span>
                <span className="text-[10px] font-bold text-emerald-300">{globalProgress}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 transition-all duration-700"
                  style={{ width: `${globalProgress}%` }}
                />
              </div>
            </div>
          </div>

          {/* ── Chapter list ── */}
          <div className="max-h-[360px] overflow-y-auto">
            <div className="px-3 pt-3 pb-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-1">
                Chapitres — cliquez pour démarrer
              </p>
            </div>
            <div className="py-1 px-2 space-y-0.5">
              {TOUR_CHAPTERS.map((chapter) => {
                const status = chapterProgress(chapter);
                const isOpen = activeChapter === chapter.id;

                return (
                  <div key={chapter.id}>
                    <button
                      onClick={() => {
                        if (isOpen) { setActiveChapter(null); return; }
                        setActiveChapter(chapter.id);
                      }}
                      className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                        isOpen ? `${chapter.bgColor} border ${chapter.borderColor}` : 'hover:bg-gray-50'
                      }`}
                    >
                      {/* Icon */}
                      <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg ${chapter.bgColor} border ${chapter.borderColor} transition-transform group-hover:scale-105`}>
                        {status === 'done'
                          ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          : chapter.emoji
                        }
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900 truncate">{chapter.title}</p>
                          {status === 'done' && (
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">✓ Complété</span>
                          )}
                          {status === 'active' && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${chapter.bgColor} ${chapter.color} border ${chapter.borderColor}`}>En cours</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{chapter.description}</p>
                      </div>

                      {/* Step badge + chevron */}
                      <div className="flex-shrink-0 flex items-center gap-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${chapter.bgColor} ${chapter.color}`}>
                          {chapter.stepCount} étape{chapter.stepCount > 1 ? 's' : ''}
                        </span>
                        <ChevronRight className={`h-4 w-4 text-gray-300 transition-transform duration-200 ${isOpen ? 'rotate-90 text-gray-500' : 'group-hover:translate-x-0.5'}`} />
                      </div>
                    </button>

                    {/* Expanded: quick-start button */}
                    {isOpen && (
                      <div className="mx-2 mb-1 px-3 py-2.5 bg-white border border-gray-100 rounded-xl shadow-sm">
                        <p className="text-xs text-gray-600 mb-2">{chapter.description}</p>
                        <button
                          onClick={() => {
                            setOpen(false);
                            startFromStep(chapter.stepStart);
                          }}
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${chapter.bgColor} ${chapter.color} border ${chapter.borderColor} hover:shadow-sm active:scale-95`}
                        >
                          <ArrowRight className="h-3.5 w-3.5" />
                          Démarrer ce chapitre
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setOpen(false); startTour(); }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow active:scale-[0.98]"
              >
                <PlayCircle className="h-4 w-4" />
                {isCompleted || isDismissed ? 'Relancer le tour complet' : 'Démarrer le tour complet'}
              </button>
              {(isCompleted || isDismissed) && (
                <button
                  onClick={() => { setOpen(false); startTour(); }}
                  title="Recommencer depuis le début"
                  className="flex items-center justify-center gap-1.5 p-2.5 border border-gray-200 bg-white hover:bg-gray-100 text-gray-600 rounded-xl transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}
            </div>
            {/* Keyboard hint */}
            <p className="mt-2 flex items-center gap-1.5 text-[10px] text-gray-400 justify-center">
              <Keyboard className="h-3 w-3" />
              Appuyez sur <kbd className="px-1 py-0.5 bg-gray-200 rounded text-[10px] font-mono">ESC</kbd> pour fermer
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes tourPanelIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
