import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface PlaygroundMessage {
  role: string;
  content: string;
  isSummary?: boolean;
  timestamp?: string;
}

interface PlaygroundState {
  messages: PlaygroundMessage[];
  isRunning: boolean;
  error: string | null;
}

const initialState: PlaygroundState = {
  messages: [],
  isRunning: false,
  error: null,
};

const playgroundSlice = createSlice({
  name: 'playground',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<PlaygroundMessage>) => {
      state.messages.push(action.payload);
    },
    clearMessages: (state) => {
      state.messages = [];
    },
    setIsRunning: (state, action: PayloadAction<boolean>) => {
      state.isRunning = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    // Optionally reset the entire state
    resetPlayground: (state) => {
      state.messages = [];
      state.isRunning = false;
      state.error = null;
    },
  },
});

export const {
  addMessage,
  clearMessages,
  setIsRunning,
  setError,
  resetPlayground,
} = playgroundSlice.actions;

export default playgroundSlice.reducer;