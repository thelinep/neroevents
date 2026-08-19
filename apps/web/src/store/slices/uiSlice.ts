import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number; // in ms, default 5000
}

interface UiState {
  sidebarOpen: boolean;
  modal: string | null; // name of the currently open modal, e.g. 'project-form', 'approval'
  notification: Notification | null;
  isLoading: boolean;
  loadingText: string | null;
}

const initialState: UiState = {
  sidebarOpen: true,
  modal: null,
  notification: null,
  isLoading: false,
  loadingText: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    openModal: (state, action: PayloadAction<string>) => {
      state.modal = action.payload;
    },
    closeModal: (state) => {
      state.modal = null;
    },
    showNotification: (state, action: PayloadAction<Omit<Notification, 'id'>>) => {
      state.notification = {
        id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        ...action.payload,
        duration: action.payload.duration || 5000,
      };
    },
    clearNotification: (state) => {
      state.notification = null;
    },
    setLoading: (state, action: PayloadAction<{ loading: boolean; text?: string }>) => {
      state.isLoading = action.payload.loading;
      state.loadingText = action.payload.text || null;
    },
    // For convenience, you can also add a reset function
    resetUi: () => initialState,
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  openModal,
  closeModal,
  showNotification,
  clearNotification,
  setLoading,
  resetUi,
} = uiSlice.actions;

export default uiSlice.reducer;