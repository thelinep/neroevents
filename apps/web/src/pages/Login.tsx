import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { login } from '../store/slices/authSlice';
import { Link } from 'react-router-dom';
import { AppDispatch, RootState } from '../store';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { token, isLoading, error } = useSelector((state: RootState) => state.auth);

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (token) {
      navigate('/dashboard');
    }
  }, [token, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    dispatch(login({ email, password }));
  };

  return (
    <div className="flex items-center justify-center h-screen bg-[#080c16]">
      <form onSubmit={handleSubmit} className="bg-[#0f172a] p-8 rounded-lg w-96">
        <h1 className="text-2xl font-bold text-center mb-4">Sign In</h1>
        {error && <div className="text-red-400 text-sm mb-2">{error}</div>}
     <label htmlFor="email" className="sr-only">
  Email
</label>
<input
  id="email"
  type="email"
  className="w-full bg-[#1e293b] border border-[#334155] rounded p-2 mb-2"
  placeholder="Email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  required
/>

<label htmlFor="password" className="sr-only">
  Password
</label>
<input
  id="password"
  type="password"
  className="w-full bg-[#1e293b] border border-[#334155] rounded p-2 mb-4"
  placeholder="Password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  required
/>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-500 text-white py-2 rounded disabled:opacity-50"
        >
          {isLoading ? 'Signing in...' : 'Login'}
        </button>
        <p className="text-sm text-gray-400 text-center mt-4">New to Nevo? <Link className="text-blue-400" to="/register">Create an account</Link></p>
      </form>
    </div>
  );
}