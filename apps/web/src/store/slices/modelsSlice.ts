import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api';

export const fetchModels = createAsyncThunk('models/fetch', async () => {
  const res = await api.get('/models');
  return res.data;
});

export const createModel = createAsyncThunk(
  'models/create',
  async (data: any) => {
    const res = await api.post('/models', data);
    return res.data;
  }
);

export const deleteModel = createAsyncThunk('models/delete', async (id: string) => {
  await api.delete(`/models/${id}`);
  return id;
});

export const testModel = createAsyncThunk(
  'models/test',
  async (config: any) => {
    const res = await api.post('/models/test', config);
    return res.data; // { result }
  }
);

const initialState = {
  items: [] as any[],
  isLoading: false,
  error: null as string | null,
};

const modelsSlice = createSlice({
  name: 'models',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchModels.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchModels.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
      })
      .addCase(fetchModels.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch models';
      })
      .addCase(createModel.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(deleteModel.fulfilled, (state, action) => {
        state.items = state.items.filter((m) => m.id !== action.payload);
      });
  },
});

export default modelsSlice.reducer;