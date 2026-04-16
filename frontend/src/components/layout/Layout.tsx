import { Component, type ReactNode, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from './Sidebar';
import Header from './Header';
import { useOnboarding } from '@/hooks/useOnboarding';
import { TourProvider, useTourContext } from '@/components/tour/TourContext';
import GuidedTour from '@/components/tour/GuidedTour';
import QuickActions from '@/components/common/QuickActions';

// Monte Joyride UNIQUEMENT quand le tour est actif (run=true)
// Évite que l'overlay Joyride (z-index:9999) bloque les clics sur toutes les pages
function ConditionalGuidedTour() {
  const { run } = useTourContext();
  if (!run) return null;
  return <GuidedTour />;
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; message: string }> {
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
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Une erreur est survenue</h2>
          <p className="text-gray-500 text-sm mb-6">{this.state.message}</p>
          <button
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            onClick={() => { this.setState({ hasError: false, message: '' }); window.location.reload(); }}
          >
            Recharger la page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Layout() {
  const { t } = useTranslation();
  const { checked } = useOnboarding(); // Redirige vers /app/setup si l'onboarding n'est pas terminé
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Empêcher le flash du dashboard avant que le check onboarding soit terminé
  if (!checked) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <TourProvider>
      {/* Joyride monté uniquement si le tour est actif — évite l'overlay bloquant */}
      <ConditionalGuidedTour />

      <div className="flex h-screen bg-[#f4f6f9] overflow-hidden">
        <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header onMenuToggle={() => setMobileMenuOpen(o => !o)} />
          <main className="flex-1 overflow-y-auto">
            <div className="p-6 max-w-[1600px] mx-auto">
              <ErrorBoundary>
                <Outlet />
              </ErrorBoundary>
            </div>
          </main>
          <QuickActions />
          <footer className="bg-white/80 border-t border-gray-100 px-6 py-3 flex-shrink-0">
            <div className="flex items-center justify-between text-xs text-gray-400 max-w-[1600px] mx-auto">
              <p>© 2026 {t('footer.allRightsReserved')}</p>
              <div className="flex gap-4">
                <a href="#" className="hover:text-gray-600 transition-colors">{t('footer.privacy')}</a>
                <a href="#" className="hover:text-gray-600 transition-colors">{t('footer.terms')}</a>
                <a href="#" className="hover:text-gray-600 transition-colors">{t('footer.support')}</a>
              </div>
              <p className="text-primary-500 font-medium">{t('common.version')} 0.1.0</p>
            </div>
          </footer>
        </div>
      </div>
    </TourProvider>
  );
}
