import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api';

export const fetchTraces = createAsyncThunk('debug/fetchTraces', async (sessionId: string) => {
  const res = await api.get(`/debug/traces/${sessionId}`);
  return res.data;
});

export const pause = createAsyncThunk('debug/pause', async () => {
  await api.post('/debug/pause');
});

export const resume = createAsyncThunk('debug/resume', async () => {
  await api.post('/debug/resume');
});

export const stepOver = createAsyncThunk('debug/step-over', async () => {
  await api.post('/debug/step-over');
});

export const stepInto = createAsyncThunk('debug/step-into', async () => {
  await api.post('/debug/step-into');
});

export const setBreakpoint = createAsyncThunk(
  'debug/setBreakpoint',
  async ({ target }: { target: string }) => {
    await api.post('/debug/breakpoints', { target });
    return target;
  }
);

export const removeBreakpoint = createAsyncThunk('debug/removeBreakpoint', async (target: string) => {
  await api.delete(`/debug/breakpoints/${target}`);
  return target;
});

const initialState = {
  traces: [] as any[],
  breakpoints: [] as string[],
  isPaused: false,
  isLoading: false,
  error: null as string | null,
};

const debugSlice = createSlice({
  name: 'debug',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTraces.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTraces.fulfilled, (state, action) => {
        state.isLoading = false;
        state.traces = action.payload;
      })
      .addCase(fetchTraces.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch traces';
      })
      .addCase(setBreakpoint.fulfilled, (state, action) => {
        state.breakpoints.push(action.payload);
      })
      .addCase(removeBreakpoint.fulfilled, (state, action) => {
        state.breakpoints = state.breakpoints.filter((b) => b !== action.payload);
      });
  },
});

export default debugSlice.reducer;