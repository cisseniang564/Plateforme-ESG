import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import * as Sentry from '@sentry/react';
import App from './App';
import { store } from './store';
import { initSentry } from './lib/sentry';
import './index.css';
import './i18n/config';

// Initialize Sentry before everything else
initSentry();

try {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <Sentry.ErrorBoundary
        fallback={({ error, resetError }) => (
          <div style={{ padding: '2rem', fontFamily: 'system-ui', background: '#fff', minHeight: '100vh' }}>
            <div style={{ maxWidth: 520, margin: '10vh auto', textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
              <h2 style={{ color: '#0f172a', marginBottom: 8 }}>Une erreur inattendue s'est produite</h2>
              <p style={{ color: '#64748b', marginBottom: 24, fontSize: 14 }}>
                Notre équipe a été notifiée automatiquement. Veuillez réessayer.
              </p>
              <button
                onClick={resetError}
                style={{ background: '#059669', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
              >
                Réessayer
              </button>
              {import.meta.env.DEV && (
                <pre style={{ marginTop: 24, textAlign: 'left', color: '#7f1d1d', fontSize: 12, background: '#fff1f2', padding: 12, borderRadius: 8 }}>
                  {String(error)}
                </pre>
              )}
            </div>
          </div>
        )}
        onError={(error, info) => {
          console.error('React ErrorBoundary caught:', error, info);
        }}
      >
        <Provider store={store}>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: { borderRadius: '8px', fontSize: '14px' },
              success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
        </Provider>
      </Sentry.ErrorBoundary>
    </React.StrictMode>
  );
} catch (err) {
  // Afficher l'erreur dans la page si React échoue à monter
  const root = document.getElementById('root')!;
  const loading = document.getElementById('app-loading');
  if (loading) loading.style.display = 'none';
  root.innerHTML = `<div style="padding:2rem;font-family:monospace;background:#fff;min-height:100vh">
    <h2 style="color:#dc2626">Erreur au démarrage de l'application</h2>
    <pre style="color:#7f1d1d;white-space:pre-wrap;font-size:13px">${String(err)}</pre>
    <p style="color:#666;font-size:12px">Ouvrez la console (F12) pour plus de détails.</p>
  </div>`;
  console.error('React mount error:', err);
}
