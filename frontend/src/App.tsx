import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import AppRoutes from './routes';
import { setUser, setInitialized } from './store/slices/authSlice';
import api from './services/api';
import ErrorBoundary from './components/common/ErrorBoundary';
import CookieBanner from './components/common/CookieBanner';
import RobotsMeta from './components/seo/RobotsMeta';

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
    // Tokens live in httpOnly cookies — there is no client-side flag to read.
    // We just call /auth/me: if the access_token cookie is valid, the response
    // returns the user; otherwise the response interceptor will silently try
    // /auth/refresh (using the refresh_token cookie) and either renew or 401.
    const restoreSession = async (retriesLeft = 3): Promise<void> => {
      try {
        const response = await api.get('/auth/me');
        dispatch(setUser(response.data));
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 401) {
          // No valid session — proceed as guest
          dispatch(setInitialized());
        } else if (retriesLeft > 0) {
          // Transient error (429 / 5xx / network) — back off and retry
          const delay = status === 429 ? 2000 : 1000;
          if (import.meta.env.DEV) console.warn('Session restore failed (status=%s) — retrying in %dms', status ?? 'network', delay);
          await new Promise(r => setTimeout(r, delay));
          return restoreSession(retriesLeft - 1);
        } else {
          if (import.meta.env.DEV) console.warn('Session restore impossible after 3 attempts — proceeding as guest');
          dispatch(setInitialized());
        }
      }
    };

    restoreSession();
  }, [dispatch]);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <RobotsMeta />
        <AppRoutes />
        <CookieBanner />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
