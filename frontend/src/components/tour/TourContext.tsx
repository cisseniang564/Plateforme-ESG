import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';

// ─── Storage helpers ──────────────────────────────────────────────────────────

const STORAGE_KEY = 'esgflow_tour_v1';
/** Flag set by DemoPage when a prospect lands via /demo — triggers prospect tour auto-start once. */
export const PROSPECT_DEMO_FLAG = 'esgflow_demo_prospect_pending';

export type TourMode = 'standard' | 'prospect';

interface TourStorage {
  completed: boolean;
  dismissed: boolean;
  lastStep: number;
}

function loadStorage(): TourStorage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as TourStorage;
  } catch {
    // ignore
  }
  return { completed: false, dismissed: false, lastStep: 0 };
}

function saveStorage(patch: Partial<TourStorage>): void {
  const current = loadStorage();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...patch }));
}

// ─── Context definition ───────────────────────────────────────────────────────

export interface TourContextValue {
  /** Whether joyride should be running right now */
  run: boolean;
  /** Currently active step index (controlled) */
  stepIndex: number;
  /** Active tour mode — 'standard' (general) or 'prospect' (commercial pitch) */
  mode: TourMode;
  /** True once the user has finished the full tour */
  isCompleted: boolean;
  /** True if the user dismissed via "Je connais" */
  isDismissed: boolean;
  /** (Re)start the standard tour from step 0 */
  startTour: () => void;
  /** Start the standard tour from a specific step index */
  startFromStep: (step: number) => void;
  /** Start the short prospect-focused tour (commercial pitch) */
  startProspectTour: () => void;
  /** Stop without marking as completed */
  stopTour: () => void;
  /** Move to a specific step (called from joyride callback) */
  setStep: (step: number) => void;
  /** Mark tour as finished (last step Next / Terminer) */
  completeTour: () => void;
  /** Mark tour as dismissed ("Je connais" or close) */
  dismissTour: () => void;
}

const TourContext = createContext<TourContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function TourProvider({ children }: { children: ReactNode }) {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [mode, setMode] = useState<TourMode>('standard');
  const [isCompleted, setIsCompleted] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [hasAutoStarted, setHasAutoStarted] = useState(false);

  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const isInitializing = useSelector((state: RootState) => state.auth.isInitializing);

  // ── Auto-start on first login (once DOM is mounted) ──────────────────────
  useEffect(() => {
    if (!isAuthenticated || isInitializing || hasAutoStarted) return;

    const stored = loadStorage();
    setIsCompleted(stored.completed);
    setIsDismissed(stored.dismissed);

    // ── Prospect demo: si un prospect arrive via /demo, on auto-démarre le
    //    tour commercial UNE seule fois (le flag est posé par DemoPage).
    const prospectPending = sessionStorage.getItem(PROSPECT_DEMO_FLAG) === '1';
    if (prospectPending) {
      sessionStorage.removeItem(PROSPECT_DEMO_FLAG);
      // Laisser le sidebar/header se monter avant de cibler ses sélecteurs
      const t = setTimeout(() => {
        setMode('prospect');
        setIsCompleted(false);
        setIsDismissed(false);
        setStepIndex(0);
        setRun(true);
      }, 800);
      setHasAutoStarted(true);
      return () => clearTimeout(t);
    }

    // Auto-démarrer le tour standard pour les nouveaux utilisateurs
    // (ni completed, ni dismissed) — avec un délai pour laisser le DOM se monter.
    if (!stored.completed && !stored.dismissed) {
      const t2 = setTimeout(() => {
        setMode('standard');
        setStepIndex(0);
        setRun(true);
      }, 1200);
      setHasAutoStarted(true);
      return () => clearTimeout(t2);
    }

    setHasAutoStarted(true);
  }, [isAuthenticated, isInitializing, hasAutoStarted]);

  // ─── Public API ───────────────────────────────────────────────────────────

  const startTour = useCallback(() => {
    saveStorage({ completed: false, dismissed: false, lastStep: 0 });
    setMode('standard');
    setIsCompleted(false);
    setIsDismissed(false);
    setStepIndex(0);
    setTimeout(() => setRun(true), 150);
  }, []);

  const startFromStep = useCallback((step: number) => {
    saveStorage({ completed: false, dismissed: false, lastStep: step });
    setMode('standard');
    setIsCompleted(false);
    setIsDismissed(false);
    setStepIndex(step);
    setTimeout(() => setRun(true), 150);
  }, []);

  const startProspectTour = useCallback(() => {
    // Ne persiste pas dans le storage standard — le tour prospect est éphémère.
    setMode('prospect');
    setIsCompleted(false);
    setIsDismissed(false);
    setStepIndex(0);
    setTimeout(() => setRun(true), 150);
  }, []);

  const stopTour = useCallback(() => {
    setRun(false);
  }, []);

  const setStep = useCallback((step: number) => {
    setStepIndex(step);
    // Only persist progression for the standard tour — prospect tour is ephemeral.
    if (mode === 'standard') {
      saveStorage({ lastStep: step });
    }
  }, [mode]);

  const completeTour = useCallback(() => {
    setRun(false);
    setIsCompleted(true);
    if (mode === 'standard') {
      saveStorage({ completed: true, dismissed: false, lastStep: 0 });
    }
  }, [mode]);

  const dismissTour = useCallback(() => {
    setRun(false);
    setIsDismissed(true);
    if (mode === 'standard') {
      saveStorage({ dismissed: true });
    }
  }, [mode]);

  return (
    <TourContext.Provider
      value={{
        run,
        stepIndex,
        mode,
        isCompleted,
        isDismissed,
        startTour,
        startFromStep,
        startProspectTour,
        stopTour,
        setStep,
        completeTour,
        dismissTour,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}

// ─── Consumer hook ────────────────────────────────────────────────────────────

export function useTourContext(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) {
    throw new Error('useTourContext must be used inside <TourProvider>');
  }
  return ctx;
}
