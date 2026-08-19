import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../store/slices/authSlice';
import type { AppDispatch, RootState } from '../store';

export default function Register() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { token, isLoading, error } = useSelector((state: RootState) => state.auth);

  useEffect(() => { if (token) navigate('/dashboard', { replace: true }); }, [token, navigate]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    dispatch(register({ email, password, displayName: displayName || undefined }));
  };

  return (
    <div className="flex items-center justify-center h-screen bg-[#080c16] text-white">
      <form onSubmit={submit} className="bg-[#0f172a] p-8 rounded-lg w-96 border border-[#1e293b]">
        <h1 className="text-2xl font-bold text-center mb-2">Create your Nevo account</h1>
        <p className="text-gray-400 text-sm text-center mb-6">Start building with Nevo.</p>
        {error && <div role="alert" className="text-red-400 text-sm mb-3">{error}</div>}
        <input className="w-full bg-[#1e293b] border border-[#334155] rounded p-2 mb-2" placeholder="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        <input className="w-full bg-[#1e293b] border border-[#334155] rounded p-2 mb-2" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="w-full bg-[#1e293b] border border-[#334155] rounded p-2 mb-1" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={12} required />
        <p className="text-xs text-gray-500 mb-4">12+ characters with upper/lowercase, number and symbol.</p>
        <button type="submit" disabled={isLoading} className="w-full bg-blue-500 text-white py-2 rounded disabled:opacity-50">{isLoading ? 'Creating...' : 'Create account'}</button>
        <p className="text-sm text-gray-400 text-center mt-4">Already have an account? <Link className="text-blue-400" to="/login">Sign in</Link></p>
      </form>
    </div>
  );
}
