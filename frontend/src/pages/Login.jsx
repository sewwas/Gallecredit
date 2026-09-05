import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Password Reset state variables
  const [isResetMode, setIsResetMode] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login, user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    return <Navigate to={user.role === 'staff' ? '/payments' : '/'} />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    }
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!username) {
      setError('Please provide your Username (Email).');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(username, {
        redirectTo: window.location.origin + '/reset-password',
      });
      if (error) throw error;
      
      setSuccess('A secure recovery link has been sent to your email address.');
      setUsername('');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to send recovery code. Please verify your email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-blue-50">
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -top-[30%] -right-[10%] w-[70%] h-[70%] rounded-full bg-gradient-to-b from-blue-100 to-blue-50 opacity-50 blur-3xl" />
        <div className="absolute -bottom-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-gradient-to-t from-blue-100 to-blue-50 opacity-50 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md p-8 glass-panel animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-6">
          <img src="/logo.jpg" className="mx-auto h-20 w-20 rounded-2xl shadow-xl border border-slate-200 mb-4 transform transition hover:scale-105 duration-300 object-cover" />
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Galle Credit</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Microfinance Core System</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-655 text-sm rounded-lg border border-red-100 flex items-center gap-2 animate-shake text-left">
            <svg className="w-4 h-4 shrink-0 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="font-medium text-red-600">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-lg border border-green-150 flex items-center gap-2 animate-bounce text-left">
            <svg className="w-4 h-4 shrink-0 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="font-semibold">{success}</span>
          </div>
        )}

        {!isResetMode ? (
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">System Username or Email</label>
              <input
                type="text"
                required
                className="premium-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. Rajith89 or gallecredit@gmail.com"
                autoComplete="username"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-semibold text-slate-700">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setIsResetMode(true);
                    setError('');
                    setSuccess('');
                  }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 transition"
                >
                  Forgot Password?
                </button>
              </div>
              <input
                type="password"
                required
                className="premium-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <button type="submit" className="premium-btn w-full mt-2">
              Sign In
            </button>
          </form>
        ) : (
          <form onSubmit={handleRequestOtp} className="space-y-4 text-left">
            <div className="text-center mb-2">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Recover Password</h3>
              <p className="text-xs text-slate-500 mt-1">Enter your username to receive a secure recovery link via email.</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Username (Email)</label>
              <input
                type="text"
                required
                className="premium-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="gallecredit@gmail.com"
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="premium-btn w-full mt-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  <span>Sending Link...</span>
                </>
              ) : (
                'Send Recovery Link'
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsResetMode(false);
                setError('');
                setSuccess('');
              }}
              className="w-full text-xs font-bold text-slate-500 hover:text-slate-700 transition py-2 text-center"
            >
              Back to Sign In
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
