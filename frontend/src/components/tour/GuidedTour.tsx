import Joyride, {
  ACTIONS,
  EVENTS,
  STATUS,
  type CallBackProps,
  type TooltipRenderProps,
} from 'react-joyride';
import { ChevronLeft, ChevronRight, X, SkipForward, CheckCircle2 } from 'lucide-react';
import { TOUR_STEPS, TOUR_CHAPTERS, getChapterForStep } from './tourSteps';
import { useTourContext } from './TourContext';

// ── Custom Tooltip ────────────────────────────────────────────────────────────

function CustomTooltip({
  continuous,
  index,
  isLastStep,
  step,
  backProps,
  closeProps,
  primaryProps,
  skipProps,
  tooltipProps,
}: TooltipRenderProps) {
  const chapter = getChapterForStep(index);
  const stepData = step.data as { stepInChapter?: number; totalInChapter?: number } | undefined;
  const stepInChapter = stepData?.stepInChapter ?? 1;
  const totalInChapter = stepData?.totalInChapter ?? 1;
  const totalSteps = TOUR_STEPS.length;
  const globalProgress = Math.round(((index + 1) / totalSteps) * 100);

  return (
    <div
      {...tooltipProps}
      className="relative w-[340px] overflow-hidden rounded-2xl bg-white shadow-2xl shadow-gray-400/40 border border-gray-100/80 ring-1 ring-black/5"
      style={{ fontFamily: 'inherit' }}
    >
      {/* Chapter header bar */}
      <div className={`flex items-center gap-2.5 px-4 py-3 ${chapter.bgColor} border-b ${chapter.borderColor}`}>
        <span className="text-xl leading-none">{chapter.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-bold uppercase tracking-wider ${chapter.color}`}>
            {chapter.title}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            {Array.from({ length: totalInChapter }).map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all ${
                  i < stepInChapter
                    ? chapter.color.replace('text-', 'bg-')
                    : 'bg-gray-200'
                }`}
                style={{ width: i < stepInChapter ? '14px' : '8px' }}
              />
            ))}
            <span className={`ml-1 text-[10px] font-medium ${chapter.color} opacity-70`}>
              {stepInChapter}/{totalInChapter}
            </span>
          </div>
        </div>
        <button
          {...closeProps}
          className="p-1 rounded-lg hover:bg-black/5 transition-colors text-gray-400 hover:text-gray-600"
          title="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="px-5 py-4">
        {step.title && (
          <h3 className="text-sm font-bold text-gray-900 mb-2 leading-snug">
            {step.title as string}
          </h3>
        )}
        <p className="text-sm text-gray-600 leading-relaxed">
          {step.content as string}
        </p>
      </div>

      {/* Global progress bar */}
      <div className="px-5 pb-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-gray-400">Progression globale</span>
          <span className="text-[10px] font-semibold text-gray-500">{globalProgress}%</span>
        </div>
        <div className="h-1 w-full rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
            style={{ width: `${globalProgress}%` }}
          />
        </div>
      </div>

      {/* Chapter navigation pills */}
      <div className="px-5 py-2 flex gap-1 flex-wrap">
        {TOUR_CHAPTERS.map((ch, i) => {
          const isActive = ch.id === chapter.id;
          const isPast = ch.stepStart + ch.stepCount - 1 < index;
          return (
            <span
              key={ch.id}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                isActive
                  ? `${ch.bgColor} ${ch.color} border ${ch.borderColor}`
                  : isPast
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                  : 'bg-gray-50 text-gray-400 border border-gray-100'
              }`}
            >
              {isPast && <CheckCircle2 className="h-2.5 w-2.5" />}
              {ch.emoji}
            </span>
          );
        })}
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between gap-2 border-t border-gray-100 px-4 py-3 bg-gradient-to-r from-gray-50/80 to-white">
        <button
          {...skipProps}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors px-2 py-1 rounded-lg hover:bg-gray-100"
        >
          <SkipForward className="h-3.5 w-3.5" />
          Ignorer le tour
        </button>

        <div className="flex items-center gap-1.5">
          {index > 0 && (
            <button
              {...backProps}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:bg-gray-50 transition-all active:scale-95"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Préc.
            </button>
          )}

          <button
            {...primaryProps}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-white text-xs font-semibold transition-all shadow-sm active:scale-95 ${
              isLastStep
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-emerald-200'
                : 'bg-gradient-to-r from-emerald-600 to-emerald-600 hover:from-emerald-700 hover:to-emerald-700'
            }`}
          >
            {isLastStep ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Terminer 🎉
              </>
            ) : (
              <>
                Suivant
                <ChevronRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function GuidedTour() {
  const { run, stepIndex, setStep, completeTour, dismissTour } = useTourContext();

  function handleCallback(data: CallBackProps) {
    const { action, index, type, status } = data;

    if (type === EVENTS.STEP_AFTER) {
      if (action === ACTIONS.NEXT) {
        setStep(index + 1);
      } else if (action === ACTIONS.PREV) {
        setStep(Math.max(0, index - 1));
      } else if (action === ACTIONS.SKIP || action === ACTIONS.CLOSE) {
        dismissTour();
        return;
      }
    }

    if (type === EVENTS.TOUR_END) {
      if (status === STATUS.FINISHED) completeTour();
      else if (status === STATUS.SKIPPED) dismissTour();
      return;
    }

    if (type === EVENTS.TARGET_NOT_FOUND) {
      setStep(index + 1);
    }
  }

  // Ne pas rendre Joyride si le tour n'est pas actif
  // (évite l'overlay transparent z-10000 qui bloque les clics)
  if (!run) return null;

  return (
    <Joyride
      steps={TOUR_STEPS}
      run={run}
      stepIndex={stepIndex}
      continuous
      showSkipButton={false}
      disableScrolling={false}
      scrollOffset={120}
      spotlightClicks={true}
      disableOverlayClose={false}
      callback={handleCallback}
      tooltipComponent={CustomTooltip}
      styles={{
        options: {
          overlayColor: 'rgba(15, 23, 42, 0.50)',
          spotlightShadow: '0 0 0 3px #d1fae5, 0 0 0 6px #f0fdf4',
          zIndex: 10000,
          arrowColor: '#ffffff',
        },
        spotlight: {
          borderRadius: '12px',
        },
      }}
      floaterProps={{
        styles: { arrow: { spread: 16, length: 8 } },
        hideArrow: false,
      }}
    />
  );
}
