import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import AppRoutes from './routes';
import { setUser, setInitialized } from './store/slices/authSlice';
import api from './services/api';
import ErrorBoundary from './components/common/ErrorBoundary';
import CookieBanner from './components/common/CookieBanner';

export default function App() {
  const dispatch = useDispatch();

  // Hide the initial loading spinner and reveal the body once React has mounted
  useEffect(() => {
    const spinner = document.getElementById('app-loading');
    if (spinner) {
      spinner.style.transition = 'opacity 0.2s ease-out';
      spinner.style.opacity = '0';
      setTimeout(() => spinner.remove(), 250);
    }
    document.body.classList.add('loaded');
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      dispatch(setInitialized());
      return;
    }

    // Tente de restaurer la session avec retries sur erreurs temporaires (429/500/réseau)
    const restoreSession = async (retriesLeft = 3): Promise<void> => {
      try {
        const response = await api.get('/auth/me');
        dispatch(setUser(response.data));
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 401) {
          // Token invalide ou expiré → nettoyage + initialisation sans session
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          dispatch(setInitialized());
        } else if (retriesLeft > 0) {
          // Erreur temporaire (429, 500, réseau) → retry avec backoff
          const delay = status === 429 ? 2000 : 1000;
          console.warn('Restauration session échouée (status=%s) — retry dans %dms', status ?? 'network', delay);
          await new Promise(r => setTimeout(r, delay));
          return restoreSession(retriesLeft - 1);
        } else {
          // Toutes les tentatives épuisées — on ne laisse pas passer sans vérification
          // Le token sera revalidé au prochain chargement
          console.warn('Restauration session impossible après 3 tentatives — déconnexion par sécurité');
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          dispatch(setInitialized());
        }
      }
    };

    restoreSession();
  }, [dispatch]);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
        <CookieBanner />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
