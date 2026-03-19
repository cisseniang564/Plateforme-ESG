import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@/types/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isInitializing: true,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      const u = action.payload;
      // Derive convenience fields that the backend doesn't always return
      const computedName = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email;
      state.user = {
        ...u,
        full_name: u.full_name ?? computedName,
        is_email_verified: u.is_email_verified ?? (u.email_verified_at != null),
      };
      state.isAuthenticated = true;
      state.isInitializing = false;
      state.error = null;
    },
    setInitialized: (state) => {
      state.isInitializing = false;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isInitializing = false;
      state.error = null;
    },
  },
});

export const { setUser, setInitialized, setLoading, setError, logout } = authSlice.actions;
export default authSlice.reducer;
