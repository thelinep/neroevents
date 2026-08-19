import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api';

// Fetch global history across all projects
export const fetchGlobalHistory = createAsyncThunk(
  'history/fetchGlobal',
  async () => {
    const res = await api.get('/history');
    return res.data; // expects array of history entries
  }
);

// Add a single history entry (used by components)
export const addHistoryEntry = createAsyncThunk(
  'history/addEntry',
  async (entry: { action: string; details?: any; projectId?: string }) => {
    const res = await api.post('/history', entry);
    return res.data;
  }
);

interface HistoryState {
  items: any[];
  isLoading: boolean;
  error: string | null;
}

const initialState: HistoryState = {
  items: [],
  isLoading: false,
  error: null,
};

const historySlice = createSlice({
  name: 'history',
  initialState,
  reducers: {
    // For optimistic updates (if you don't want to wait for API)
    optimisticAdd: (state, action) => {
      state.items.unshift(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGlobalHistory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchGlobalHistory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
      })
      .addCase(fetchGlobalHistory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch history';
      })
      .addCase(addHistoryEntry.fulfilled, (state, action) => {
        // Add the new entry to the front
        state.items.unshift(action.payload);
      });
  },
});

export const { optimisticAdd } = historySlice.actions;
export default historySlice.reducer;