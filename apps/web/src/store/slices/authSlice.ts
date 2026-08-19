import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../../api';

export interface AuthUser {
  id: string;
  email: string;
  displayName?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  expiresAt: string | null;
  isLoading: boolean;
  isRestoring: boolean;
  error: string | null;
}

const getError = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { error?: string } } }).response;
    return response?.data?.error || fallback;
  }
  return error instanceof Error ? error.message : fallback;
};

export const login = createAsyncThunk('auth/login', async (creds: { email: string; password: string }, { rejectWithValue }) => {
  try {
    const res = await api.post('/auth/login', creds);
    return res.data as { user: AuthUser; token: string; expiresAt: string };
  } catch (error) {
    return rejectWithValue(getError(error, 'Login failed'));
  }
});

export const register = createAsyncThunk('auth/register', async (userData: { email: string; password: string; displayName?: string }, { rejectWithValue }) => {
  try {
    const res = await api.post('/auth/register', userData);
    return res.data as { user: AuthUser; token: string; expiresAt: string };
  } catch (error) {
    return rejectWithValue(getError(error, 'Registration failed'));
  }
});

export const restoreSession = createAsyncThunk('auth/restoreSession', async (_, { getState, dispatch, rejectWithValue }) => {
  const token = (getState() as RootState).auth.token;
  if (!token) return rejectWithValue('No session');
  try {
    const me = await api.get('/auth/me');
    return { user: me.data.user as AuthUser, token, expiresAt: (getState() as RootState).auth.expiresAt };
  } catch {
    try {
      const refreshed = await api.post('/auth/refresh');
      return refreshed.data as { user: AuthUser; token: string; expiresAt: string };
    } catch {
      dispatch(clearSession());
      return rejectWithValue('Session expired');
    }
  }
});

export const logout = createAsyncThunk('auth/logout', async () => {
  await api.post('/auth/logout');
});

const initialState: AuthState = {
  user: null,
  token: null,
  expiresAt: null,
  isLoading: false,
  isRestoring: true,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => { state.error = null; },
    clearSession: (state) => {
      state.user = null;
      state.token = null;
      state.expiresAt = null;
      state.isRestoring = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.expiresAt = action.payload.expiresAt;
        state.isRestoring = false;
      })
      .addCase(login.rejected, (state, action) => { state.isLoading = false; state.error = String(action.payload || action.error.message || 'Login failed'); state.isRestoring = false; })
      .addCase(register.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.expiresAt = action.payload.expiresAt;
        state.isRestoring = false;
      })
      .addCase(register.rejected, (state, action) => { state.isLoading = false; state.error = String(action.payload || action.error.message || 'Registration failed'); state.isRestoring = false; })
      .addCase(restoreSession.pending, (state) => { state.isRestoring = true; })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.isRestoring = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.expiresAt = action.payload.expiresAt;
      })
      .addCase(restoreSession.rejected, (state) => { state.isRestoring = false; })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.expiresAt = null;
        state.error = null;
      });
  },
});

export const { clearError, clearSession } = authSlice.actions;
export default authSlice.reducer;

type RootState = { auth: AuthState };
