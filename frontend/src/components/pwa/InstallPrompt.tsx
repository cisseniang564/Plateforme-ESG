/**
 * InstallPrompt — non-intrusive banner offering to install ESGflow as a PWA.
 *
 * Behavior:
 *  - Listens to `beforeinstallprompt` (Chrome/Edge/Samsung) and stashes the event.
 *  - Shows a discreet bottom-right banner ONLY when the browser supports installation
 *    AND the user has dismissed it less than 3 times.
 *  - Detects standalone mode (already installed) and stays hidden.
 *  - Stores dismissal count in localStorage to avoid nagging.
 *  - Detects iOS Safari separately (no beforeinstallprompt) and shows manual
 *    "Add to Home Screen" hint.
 */
import { useEffect, useState } from 'react';
import { X, Smartphone, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const LS_DISMISS_COUNT = 'pwa_install_dismissed_count';
const LS_DISMISSED_AT  = 'pwa_install_dismissed_at';
const MAX_DISMISSALS   = 3;
// Cooldown between displays after a dismissal (7 days)
const COOLDOWN_MS = 7 * 24 * 3600 * 1000;

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true;
  if ((window.navigator as any).standalone) return true; // iOS
  return false;
}

function isIOSSafari(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return iOS && isSafari;
}

export default function InstallPrompt() {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    // Check dismissal cooldown
    const count = parseInt(localStorage.getItem(LS_DISMISS_COUNT) || '0', 10);
    const lastAt = parseInt(localStorage.getItem(LS_DISMISSED_AT) || '0', 10);
    if (count >= MAX_DISMISSALS) return;
    if (lastAt && Date.now() - lastAt < COOLDOWN_MS) return;

    const onBefore = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Give the user a couple seconds to settle in before showing the banner
      setTimeout(() => setVisible(true), 8000);
    };
    window.addEventListener('beforeinstallprompt', onBefore as any);

    const onInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', onInstalled);

    // iOS Safari has no event — show a manual hint after 15s
    if (isIOSSafari()) {
      const timer = setTimeout(() => setIosHint(true), 15000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', onBefore as any);
        window.removeEventListener('appinstalled', onInstalled);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBefore as any);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = () => {
    const count = parseInt(localStorage.getItem(LS_DISMISS_COUNT) || '0', 10);
    localStorage.setItem(LS_DISMISS_COUNT, String(count + 1));
    localStorage.setItem(LS_DISMISSED_AT, String(Date.now()));
    setVisible(false);
    setIosHint(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setVisible(false);
    } else {
      dismiss();
    }
    setDeferredPrompt(null);
  };

  if (!visible && !iosHint) return null;

  return (
    <div
      role="dialog"
      aria-label={t('pwa.ariaDialog', 'Installer ESGflow')}
      className="fixed bottom-4 left-4 z-50 max-w-sm bg-white rounded-2xl shadow-2xl border border-emerald-100 p-4 animate-in slide-in-from-bottom-4"
      style={{ animation: 'slideIn 0.3s ease-out' }}
    >
      <button
        type="button"
        onClick={dismiss}
        className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-700 rounded-lg transition-colors"
        aria-label={t('pwa.close', 'Fermer')}
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3 mb-3 pr-6">
        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <Smartphone className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900">{t('pwa.title', 'Installer ESGflow')}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {iosHint
              ? t('pwa.iosDesc', "Ajoutez ESGflow à votre écran d'accueil pour un accès rapide et un mode hors-ligne.")
              : t('pwa.desc', 'Accédez à ESGflow comme une application : lancement rapide, hors-ligne partiel, raccourcis.')}
          </p>
        </div>
      </div>

      {iosHint ? (
        <div className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3">
          <span className="font-semibold">{t('pwa.iosLabel', 'Sur iPhone/iPad :')}</span>{' '}
          {t('pwa.iosInstructions', "Appuyez sur le bouton « Partager » dans Safari, puis sélectionnez « Sur l'écran d'accueil ».")}
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={dismiss}
            className="flex-1 px-3 h-9 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            {t('pwa.later', 'Plus tard')}
          </button>
          <button
            type="button"
            onClick={install}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 h-9 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            {t('pwa.install', 'Installer')}
          </button>
        </div>
      )}
    </div>
  );
}
