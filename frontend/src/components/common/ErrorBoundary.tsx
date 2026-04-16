import { Component, type ComponentType, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** UI de remplacement personnalisée */
  fallback?: ReactNode;
  /** Callback pour reporting externe (ex: Sentry manuel) */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // Callback externe (Sentry, etc.)
    this.props.onError?.(error, errorInfo);
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
          <div className="max-w-lg w-full text-center">
            {/* Big 500 */}
            <div className="relative mb-8">
              <p className="text-[10rem] font-black text-slate-100 leading-none select-none">
                500
              </p>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-white rounded-2xl shadow-xl px-8 py-5 border border-red-100">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">⚠️</span>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-red-400 uppercase tracking-widest">ESGFlow</p>
                      <p className="text-lg font-bold text-slate-800">Erreur inattendue</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <h1 className="text-2xl font-bold text-slate-800 mb-3">
              Quelque chose s'est mal passé
            </h1>
            <p className="text-slate-500 mb-6 leading-relaxed">
              Une erreur inattendue s'est produite. Notre équipe a été notifiée.
              Vous pouvez réessayer ou revenir au tableau de bord.
            </p>

            {/* Error detail (collapsed in prod) */}
            {this.state.error && (
              <details className="mb-6 text-left bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                <summary className="text-sm text-red-600 font-medium cursor-pointer select-none">
                  Détails techniques
                </summary>
                <pre className="mt-2 text-xs text-red-700 overflow-auto whitespace-pre-wrap break-all">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full sm:w-auto px-6 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50 transition-colors"
              >
                Rafraîchir
              </button>
              <button
                onClick={this.handleReset}
                className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors"
              >
                Tableau de bord
              </button>
            </div>

            <p className="mt-10 text-xs text-slate-400">
              Code d'erreur : 500 · Internal Error
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * withErrorBoundary — HOC pour wrapper un composant dans un ErrorBoundary
 *
 * Exemple :
 *   export default withErrorBoundary(MyDashboard);
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: ComponentType<P>,
  fallback?: ReactNode,
) {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  function WithErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  }

  WithErrorBoundaryWrapper.displayName = `withErrorBoundary(${displayName})`;
  return WithErrorBoundaryWrapper;
}

export default ErrorBoundary;
