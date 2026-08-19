import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api';

export const fetchAgents = createAsyncThunk('agents/fetch', async () => {
  const res = await api.get('/agents');
  return res.data;
});

export const createAgent = createAsyncThunk(
  'agents/create',
  async (data: any) => {
    const res = await api.post('/agents', data);
    return res.data;
  }
);

export const updateAgent = createAsyncThunk(
  'agents/update',
  async ({ id, data }: { id: string; data: any }) => {
    const res = await api.put(`/agents/${id}`, data);
    return res.data;
  }
);

export const deleteAgent = createAsyncThunk('agents/delete', async (id: string) => {
  await api.delete(`/agents/${id}`);
  return id;
});

export const shareAgent = createAsyncThunk('agents/share', async (id: string) => {
  const res = await api.post(`/agents/${id}/share`);
  return res.data; // { shareToken }
});

const initialState = {
  items: [] as any[],
  isLoading: false,
  error: null as string | null,
};

const agentsSlice = createSlice({
  name: 'agents',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAgents.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAgents.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
      })
      .addCase(fetchAgents.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch agents';
      })
      .addCase(createAgent.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(updateAgent.fulfilled, (state, action) => {
        const idx = state.items.findIndex((a) => a.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(deleteAgent.fulfilled, (state, action) => {
        state.items = state.items.filter((a) => a.id !== action.payload);
      });
  },
});

export default agentsSlice.reducer;