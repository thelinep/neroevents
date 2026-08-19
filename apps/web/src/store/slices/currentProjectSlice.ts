import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api';

export const fetchProjectDetail = createAsyncThunk(
  'currentProject/fetch',
  async (id: string) => {
    const [projectRes, tasksRes, historyRes] = await Promise.all([
      api.get(`/projects/${id}`),
      api.get(`/projects/${id}/tasks`),
      api.get(`/projects/${id}/history`),
    ]);
    return {
      project: projectRes.data,
      tasks: tasksRes.data,
      history: historyRes.data,
    };
  }
);

const initialState = {
  project: null as any,
  tasks: [] as any[],
  history: [] as any[],
  context: {} as any,
  isLoading: false,
  error: null as string | null,
};

const currentProjectSlice = createSlice({
  name: 'currentProject',
  initialState,
  reducers: {
    updateTask: (state, action) => {
      const idx = state.tasks.findIndex((t) => t.id === action.payload.id);
      if (idx !== -1) state.tasks[idx] = action.payload;
    },
    addTask: (state, action) => {
      state.tasks.push(action.payload);
    },
    updateContext: (state, action) => {
      state.context = { ...state.context, ...action.payload };
    },
    addHistory: (state, action) => {
      state.history.unshift(action.payload);
    },
    clearProject: (state) => {
      state.project = null;
      state.tasks = [];
      state.history = [];
      state.context = {};
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjectDetail.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProjectDetail.fulfilled, (state, action) => {
        state.isLoading = false;
        state.project = action.payload.project;
        state.tasks = action.payload.tasks;
        state.history = action.payload.history;
      })
      .addCase(fetchProjectDetail.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to load project';
      });
  },
});

export const { updateTask, addTask, updateContext, addHistory, clearProject } =
  currentProjectSlice.actions;
export default currentProjectSlice.reducer;