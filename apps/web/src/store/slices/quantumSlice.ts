import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api';

export const fetchPerformance = createAsyncThunk('quantum/performance', async () => {
  const res = await api.get('/quantum/performance');
  return res.data;
});

export const fetchGraph = createAsyncThunk('quantum/graph', async () => {
  const res = await api.get('/quantum/graph');
  return res.data;
});

export const processGoal = createAsyncThunk(
  'quantum/process',
  async ({ prompt, autonomy }: { prompt: string; autonomy: string }) => {
    const res = await api.post('/quantum/process', { prompt, autonomy });
    return res.data;
  }
);

const initialState = {
  performance: [] as any[],
  graph: { nodes: [] as any[], edges: [] as any[] },
  lastResult: null as any,
  isLoading: false,
  error: null as string | null,
};

const quantumSlice = createSlice({
  name: 'quantum',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPerformance.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPerformance.fulfilled, (state, action) => {
        state.isLoading = false;
        state.performance = action.payload;
      })
      .addCase(fetchPerformance.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch performance';
      })
      .addCase(fetchGraph.fulfilled, (state, action) => {
        state.graph = action.payload;
      })
      .addCase(processGoal.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(processGoal.fulfilled, (state, action) => {
        state.isLoading = false;
        state.lastResult = action.payload;
      })
      .addCase(processGoal.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to process goal';
      });
  },
});

export default quantumSlice.reducer;