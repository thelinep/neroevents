import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api';

// ---------- Types ----------
export interface FineTuneJob {
  id: string;
  name?: string;
  base_model: string;
  dataset_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  job_id?: string;          // external job ID
  result_model_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Dataset {
  id: string;
  name: string;
  description?: string;
  file_path: string;
  format: string;
  created_at: string;
}

// ---------- Thunks ----------
// Fetch all datasets
export const fetchDatasets = createAsyncThunk<Dataset[]>(
  'fineTune/fetchDatasets',
  async () => {
    const res = await api.get('/fine-tune/datasets');
    return res.data;
  }
);

// Fetch all fine‑tune jobs
export const fetchFineTuneJobs = createAsyncThunk<FineTuneJob[]>(
  'fineTune/fetchJobs',
  async () => {
    const res = await api.get('/fine-tune/jobs');
    return res.data;
  }
);

// Start a new fine‑tuning job
export const startFineTune = createAsyncThunk<
  FineTuneJob,
  { baseModel: string; datasetId: string; name?: string }
>(
  'fineTune/start',
  async ({ baseModel, datasetId, name }) => {
    const res = await api.post('/fine-tune/start', {
      base_model: baseModel,
      dataset_id: datasetId,
      name,
    });
    return res.data;
  }
);

// ---------- Slice ----------
interface FineTuneState {
  jobs: FineTuneJob[];
  datasets: Dataset[];
  isLoading: boolean;
  error: string | null;
}

const initialState: FineTuneState = {
  jobs: [],
  datasets: [],
  isLoading: false,
  error: null,
};

const fineTuneSlice = createSlice({
  name: 'fineTune',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    // Optionally, update a job's status (e.g., from WebSocket)
    updateJobStatus: (state, action) => {
      const { id, status } = action.payload;
      const job = state.jobs.find((j) => j.id === id);
      if (job) job.status = status;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchDatasets
      .addCase(fetchDatasets.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDatasets.fulfilled, (state, action) => {
        state.isLoading = false;
        state.datasets = action.payload;
      })
      .addCase(fetchDatasets.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch datasets';
      })
      // fetchFineTuneJobs
      .addCase(fetchFineTuneJobs.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchFineTuneJobs.fulfilled, (state, action) => {
        state.isLoading = false;
        state.jobs = action.payload;
      })
      .addCase(fetchFineTuneJobs.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch jobs';
      })
      // startFineTune
      .addCase(startFineTune.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(startFineTune.fulfilled, (state, action) => {
        state.isLoading = false;
        state.jobs.unshift(action.payload); // add new job to top
      })
      .addCase(startFineTune.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to start fine‑tuning job';
      });
  },
});

export const { clearError, updateJobStatus } = fineTuneSlice.actions;
export default fineTuneSlice.reducer;