import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api';

export const fetchProjects = createAsyncThunk('projects/fetch', async () => {
  const res = await api.get('/projects');
  return res.data;
});

export const createProject = createAsyncThunk(
  'projects/create',
  async (data: { name: string; description?: string }) => {
    const res = await api.post('/projects', data);
    return res.data;
  }
);

export const deleteProject = createAsyncThunk('projects/delete', async (id: string) => {
  await api.delete(`/projects/${id}`);
  return id;
});

const initialState = {
  items: [] as any[],
  isLoading: false,
  error: null as string | null,
};

const projectsSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch projects';
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(deleteProject.fulfilled, (state, action) => {
        state.items = state.items.filter((p) => p.id !== action.payload);
      });
  },
});

export default projectsSlice.reducer;