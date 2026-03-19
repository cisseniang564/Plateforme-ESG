import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Tenant, TenantStats } from '@/types/api';

interface TenantState {
  current: Tenant | null;
  stats: TenantStats | null;
  loading: boolean;
}

const initialState: TenantState = {
  current: null,
  stats: null,
  loading: false,
};

const tenantSlice = createSlice({
  name: 'tenant',
  initialState,
  reducers: {
    setTenant: (state, action: PayloadAction<Tenant>) => {
      state.current = action.payload;
    },
    setStats: (state, action: PayloadAction<TenantStats>) => {
      state.stats = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

export const { setTenant, setStats, setLoading } = tenantSlice.actions;
export default tenantSlice.reducer;
