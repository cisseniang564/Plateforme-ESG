import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Score } from '@/types/esg';

interface ScoresState {
  data: Score[];
  loading: boolean;
  selectedPeriod: string | null;
}

const initialState: ScoresState = {
  data: [],
  loading: false,
  selectedPeriod: null,
};

const scoresSlice = createSlice({
  name: 'scores',
  initialState,
  reducers: {
    setScores: (state, action: PayloadAction<Score[]>) => {
      state.data = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setSelectedPeriod: (state, action: PayloadAction<string>) => {
      state.selectedPeriod = action.payload;
    },
  },
});

export const { setScores, setLoading, setSelectedPeriod } = scoresSlice.actions;
export default scoresSlice.reducer;
