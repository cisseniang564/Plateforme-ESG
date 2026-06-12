import { Component, type ReactNode, useState, useEffect } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from './Sidebar';
import Header from './Header';
import { useOnboarding } from '@/hooks/useOnboarding';
import { TourProvider, useTourContext } from '@/components/tour/TourContext';
import GuidedTour from '@/components/tour/GuidedTour';
import QuickActions from '@/components/common/QuickActions';
import TrialBanner from '@/components/common/TrialExpiredBanner';
import DemoSessionBanner from '@/components/common/DemoSessionBanner';
import OnboardingChecklist from '@/components/common/OnboardingChecklist';

// Mount Joyride ONLY when the tour is active (run=true)
function ConditionalGuidedTour() {
  const { run } = useTourContext();
  if (!run) return null;
  return <GuidedTour />;
}

// ─── Error boundary ───────────────────────────────────────────────────────────

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-12">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Une erreur est survenue</h2>
          <p className="text-sm text-gray-500 mb-8 max-w-sm">{this.state.message}</p>
          <button
            className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
            onClick={() => {
              this.setState({ hasError: false, message: '' });
              window.location.reload();
            }}
          >
            Recharger la page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Crisp helpdesk widget ───────────────────────────────────────────────────
// Remplacez CRISP_WEBSITE_ID par votre ID Crisp (dashboard.crisp.chat → Settings → Website)
const CRISP_WEBSITE_ID = import.meta.env.VITE_CRISP_WEBSITE_ID || '';

type CrispWindow = Window & { $crisp?: unknown[]; CRISP_WEBSITE_ID?: string };

function CrispWidget() {
  useEffect(() => {
    if (!CRISP_WEBSITE_ID) return;
    const w = window as CrispWindow;
    w.$crisp = [];
    w.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;
    const s = document.createElement('script');
    s.src = 'https://client.crisp.chat/l.js';
    s.async = true;
    document.head.appendChild(s);
    return () => {
      document.head.removeChild(s);
      delete w.$crisp;
      delete w.CRISP_WEBSITE_ID;
    };
  }, []);
  return null;
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function Layout() {
  const { t } = useTranslation();
  const { checked } = useOnboarding();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Prevent flash before onboarding check
  if (!checked) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-[3px] border-primary-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium">Chargement…</p>
        </div>
      </div>
    );
  }

  return (
    <TourProvider>
      <ConditionalGuidedTour />
      <CrispWidget />

      <div className="flex h-screen bg-[#eef0f3] overflow-hidden">
        <a
          href="#app-main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60] focus:px-4 focus:py-2 focus:bg-emerald-600 focus:text-white focus:rounded-lg focus:font-semibold"
        >
          Aller au contenu principal
        </a>
        <Sidebar
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
        />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <DemoSessionBanner />
          <Header onMenuToggle={() => setMobileMenuOpen(o => !o)} />
          <TrialBanner />

          {/* ── Main content ── */}
          <main id="app-main" aria-label="Contenu principal" className="flex-1 overflow-y-auto">
            <div className="p-6 lg:p-7 max-w-[1600px] mx-auto animate-fade-in">
              <ErrorBoundary>
                <Outlet />
              </ErrorBoundary>
            </div>
          </main>

          <QuickActions />
          <OnboardingChecklist />

          {/* ── Footer ── */}
          <footer className="flex-shrink-0 border-t border-gray-100 bg-white px-6 py-2">
            <div className="flex items-center justify-between text-[11px] text-gray-400 max-w-[1600px] mx-auto">
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-gray-400">Tous les services opérationnels</span>
              </div>
              <div className="hidden sm:flex gap-4">
                <Link to="/privacy-policy"   className="hover:text-gray-600 transition-colors">Confidentialité</Link>
                <Link to="/terms-of-service" className="hover:text-gray-600 transition-colors">CGU</Link>
                <Link to="/legal-notice"     className="hover:text-gray-600 transition-colors">Mentions légales</Link>
                <a href="mailto:support@greenconnect.cloud" className="hover:text-gray-600 transition-colors">Support</a>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </TourProvider>
  );
}
