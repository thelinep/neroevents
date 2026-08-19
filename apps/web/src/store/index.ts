import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import authReducer from './slices/authSlice';
import projectsReducer from './slices/projectsSlice';
import currentProjectReducer from './slices/currentProjectSlice';
import agentsReducer from './slices/agentsSlice';
import modelsReducer from './slices/modelsSlice';
import quantumReducer from './slices/quantumSlice';
import debugReducer from './slices/debugSlice';
import fineTuneReducer from './slices/fineTuneSlice';
import historyReducer from './slices/historySlice';
import playgroundReducer from './slices/playgroundSlice';
import uiReducer from './slices/uiSlice';

// Async localStorage with Promises
const storage = {
  getItem: (key: string): Promise<any> =>
    new Promise((resolve) => {
      const value = localStorage.getItem(key);
      resolve(value ? JSON.parse(value) : null);
    }),
  setItem: (key: string, value: any): Promise<void> =>
    new Promise((resolve) => {
      localStorage.setItem(key, JSON.stringify(value));
      resolve();
    }),
  removeItem: (key: string): Promise<void> =>
    new Promise((resolve) => {
      localStorage.removeItem(key);
      resolve();
    }),
};

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth', 'projects'], // persist auth and projects list
};

const rootReducer = combineReducers({
  auth: authReducer,
  projects: projectsReducer,
  currentProject: currentProjectReducer,
  agents: agentsReducer,
  models: modelsReducer,
  quantum: quantumReducer,
  debug: debugReducer,
  fineTune: fineTuneReducer,
   history: historyReducer,        // <-- add
  playground: playgroundReducer,  // <-- add
  ui: uiReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefault) =>
    getDefault({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;