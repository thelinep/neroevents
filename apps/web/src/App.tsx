import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {  useEffect } from 'react';
import { RootState } from './store';
import Login from './pages/Login';
import Register from './pages/Register';
import { restoreSession } from './store/slices/authSlice';
import type { AppDispatch } from './store';
import Dashboard from './pages/Dashboard';
import Agents from './pages/Agents';
import Playground from './pages/Playground';
import ModelStudio from './pages/ModelStudio';
import FineTune from './pages/FineTune';
import QuantumDashboard from './pages/QuantumDashboard';
import DebugConsole from './pages/DebugConsole';
import HistoryView from './pages/HistoryView';
import ProjectView from './pages/ProjectView';
import Layout from './components/Layout';


function SessionBootstrap() {
  const dispatch = useDispatch<AppDispatch>();
  const { token, isRestoring } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
  if (token) {
    void dispatch(restoreSession());
  }
  // Session restoration is an application bootstrap operation.
  // Do not rerun it when login/register changes the token.
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
  if (token && isRestoring) return <div className="flex h-screen items-center justify-center bg-[#080c16] text-white">Restoring session…</div>;
  return null;
}

function ProtectedLayout() {
  const token = useSelector((state: RootState) => state.auth.token);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (

      <Layout />

  );
}

function Placeholder({ title }: { title: string }) {
  return <div className="space-y-2"><h2 className="text-2xl font-bold">{title}</h2><p className="text-gray-400">This workspace is reserved for the next Nevo milestone.</p></div>;
}

export default function App() {
  const token = useSelector((state: RootState) => state.auth.token);

  return (
    <BrowserRouter>
      <SessionBootstrap />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/playground" element={<Playground />} />
          <Route path="/model-studio" element={<ModelStudio />} />
          <Route path="/fine-tune" element={<FineTune />} />
          <Route path="/quantum" element={<QuantumDashboard />} />
          <Route path="/debug" element={<DebugConsole />} />
          <Route path="/history" element={<HistoryView />} />
          <Route path="/project/:id" element={<ProjectView />} />
          <Route path="/settings" element={<Placeholder title="Settings" />} />
          <Route path="/profile" element={<Placeholder title="Profile" />} />
        </Route>
        <Route path="/" element={<Navigate to={token ? '/dashboard' : '/login'} replace />} />
        <Route path="*" element={<Navigate to={token ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
