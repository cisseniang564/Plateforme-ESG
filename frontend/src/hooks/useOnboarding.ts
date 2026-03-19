import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import api from '@/services/api';

interface OnboardingStatus {
  completed: boolean;
  has_organizations: boolean;
  has_indicators: boolean;
  sector: string;
  org_count: number;
  indicator_count: number;
}

export function useOnboarding() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const isInitializing = useSelector((s: RootState) => s.auth.isInitializing);
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Si pas encore auth initialisé, on attend
    if (isInitializing) return;
    // Si pas authentifié ou déjà sur la page setup, on considère comme vérifié
    if (!isAuthenticated || location.pathname === '/app/setup') {
      setChecked(true);
      return;
    }

    const check = async () => {
      try {
        const res = await api.get('/onboarding/status');
        const data: OnboardingStatus = res.data;
        setStatus(data);
        if (!data.completed) {
          navigate('/app/setup', { replace: true });
        }
      } catch {
        // Silencieux — ne pas bloquer si l'endpoint est indisponible
      } finally {
        setChecked(true);
      }
    };

    check();
  }, [isAuthenticated, isInitializing, location.pathname]);

  return { status, checked };
}
