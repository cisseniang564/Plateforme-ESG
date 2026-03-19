import { Component, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from './Sidebar';
import Header from './Header';
import { useOnboarding } from '@/hooks/useOnboarding';

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

  // Empêcher le flash du dashboard avant que le check onboarding soit terminé
  if (!checked) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
        <footer className="bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <p>© 2026 {t('footer.allRightsReserved')}</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-gray-900">{t('footer.privacy')}</a>
              <a href="#" className="hover:text-gray-900">{t('footer.terms')}</a>
              <a href="#" className="hover:text-gray-900">{t('footer.support')}</a>
            </div>
            <p className="text-primary-600">{t('common.version')} 0.1.0</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
