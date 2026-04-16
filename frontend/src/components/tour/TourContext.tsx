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
  /** True once the user has finished the full tour */
  isCompleted: boolean;
  /** True if the user dismissed via "Je connais" */
  isDismissed: boolean;
  /** (Re)start the tour from step 0 */
  startTour: () => void;
  /** Start the tour from a specific step index */
  startFromStep: (step: number) => void;
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

    // Ne jamais auto-démarrer le tour — il bloque les clics sur la page.
    // L'utilisateur peut le lancer manuellement via le bouton "Tour guidé".
    if (!stored.completed && !stored.dismissed) {
      // Marquer comme dismissed pour éviter le blocage des clics
      saveStorage({ dismissed: true });
      setIsDismissed(true);
    }

    setHasAutoStarted(true);
  }, [isAuthenticated, isInitializing, hasAutoStarted]);

  // ─── Public API ───────────────────────────────────────────────────────────

  const startTour = useCallback(() => {
    saveStorage({ completed: false, dismissed: false, lastStep: 0 });
    setIsCompleted(false);
    setIsDismissed(false);
    setStepIndex(0);
    setTimeout(() => setRun(true), 150);
  }, []);

  const startFromStep = useCallback((step: number) => {
    saveStorage({ completed: false, dismissed: false, lastStep: step });
    setIsCompleted(false);
    setIsDismissed(false);
    setStepIndex(step);
    setTimeout(() => setRun(true), 150);
  }, []);

  const stopTour = useCallback(() => {
    setRun(false);
  }, []);

  const setStep = useCallback((step: number) => {
    setStepIndex(step);
    saveStorage({ lastStep: step });
  }, []);

  const completeTour = useCallback(() => {
    setRun(false);
    setIsCompleted(true);
    saveStorage({ completed: true, dismissed: false, lastStep: 0 });
  }, []);

  const dismissTour = useCallback(() => {
    setRun(false);
    setIsDismissed(true);
    saveStorage({ dismissed: true });
  }, []);

  return (
    <TourContext.Provider
      value={{
        run,
        stepIndex,
        isCompleted,
        isDismissed,
        startTour,
        startFromStep,
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
