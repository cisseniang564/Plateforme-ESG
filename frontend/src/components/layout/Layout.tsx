import { Component, type ReactNode, useState, useEffect } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from './Sidebar';
import Header from './Header';
import { useOnboarding } from '@/hooks/useOnboarding';
import { TourProvider, useTourContext } from '@/components/tour/TourContext';
import GuidedTour from '@/components/tour/GuidedTour';
import QuickActions from '@/components/common/QuickActions';

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

function CrispWidget() {
  useEffect(() => {
    if (!CRISP_WEBSITE_ID) return;
    // @ts-ignore
    window.$crisp = [];
    // @ts-ignore
    window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;
    const s = document.createElement('script');
    s.src = 'https://client.crisp.chat/l.js';
    s.async = true;
    document.head.appendChild(s);
    return () => {
      document.head.removeChild(s);
      // @ts-ignore
      delete window.$crisp;
      // @ts-ignore
      delete window.CRISP_WEBSITE_ID;
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

      <div className="flex h-screen bg-surface-50 overflow-hidden">
        <Sidebar
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
        />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header onMenuToggle={() => setMobileMenuOpen(o => !o)} />

          {/* ── Main content ── */}
          <main className="flex-1 overflow-y-auto">
            <div className="p-6 lg:p-7 max-w-[1600px] mx-auto animate-fade-in">
              <ErrorBoundary>
                <Outlet />
              </ErrorBoundary>
            </div>
          </main>

          <QuickActions />

          {/* ── Footer ── */}
          <footer className="flex-shrink-0 border-t border-[#e8ecf0] bg-white/70 backdrop-blur-sm px-6 py-2.5">
            <div className="flex items-center justify-between text-xs text-gray-400 max-w-[1600px] mx-auto">
              <p>© 2026 GreenConnect — {t('footer.allRightsReserved')}</p>
              <div className="hidden sm:flex gap-5">
                <Link to="/privacy-policy"   className="hover:text-gray-600 transition-colors">Confidentialité</Link>
                <Link to="/terms-of-service" className="hover:text-gray-600 transition-colors">CGU</Link>
                <Link to="/cgv"              className="hover:text-gray-600 transition-colors">CGV</Link>
                <Link to="/legal-notice"     className="hover:text-gray-600 transition-colors">Mentions légales</Link>
                <a href="mailto:support@greenconnect.cloud" className="hover:text-gray-600 transition-colors">Support</a>
              </div>
              <p className="text-primary-500 font-semibold">{t('common.version')} 0.1.0</p>
            </div>
          </footer>
        </div>
      </div>
    </TourProvider>
  );
}
