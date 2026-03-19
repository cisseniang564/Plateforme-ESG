import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import type { RootState } from '@/store';
import { logout as logoutAction, setUser } from '@/store/slices/authSlice';
import { authService } from '@/services/authService';

export const useAuth = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const auth = useSelector((state: RootState) => state.auth);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      const response = await authService.login({ email, password });
      // Tokens stored in localStorage by authService.login()
      dispatch(setUser(response.user));
      navigate('/app'); // ← MODIFIÉ: redirection vers /app au lieu de /
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
