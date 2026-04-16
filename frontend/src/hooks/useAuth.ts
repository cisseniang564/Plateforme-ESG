import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import type { RootState } from '@/store';
import { logout as logoutAction, setUser } from '@/store/slices/authSlice';
import { authService } from '@/services/authService';

export const useAuth = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const auth = useSelector((state: RootState) => state.auth);

  const login = async (email: string, password: string): Promise<{ requires_2fa?: boolean; temp_token?: string }> => {
    try {
      const response = await authService.login({ email, password });

      // 2FA required — return info to the caller (Login page handles it)
      if (response.requires_2fa) {
        return { requires_2fa: true, temp_token: response.temp_token };
      }

      // Normal login — tokens are stored by authService.login()
      dispatch(setUser(response.user));

      // Onboarding guard: redirect to setup wizard on first login
      if (response.user?.needs_onboarding) {
        navigate('/app/setup', { replace: true });
      } else {
        navigate('/app', { replace: true });
      }
      return {};
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
            ?? 'Login failed';
      throw new Error(message);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
    } catch {
      // Ignore network errors — always clear client state
    } finally {
      dispatch(logoutAction());
      navigate('/login');
    }
  };

  return {
    user: auth.user,
    isAuthenticated: auth.isAuthenticated,
    isInitializing: auth.isInitializing,
    loading: auth.loading,
    error: auth.error,
    login,
    logout,
  };
};
