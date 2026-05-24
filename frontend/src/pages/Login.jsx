import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import axios from 'axios';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Password Reset state variables
  const [isResetMode, setIsResetMode] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    return <Navigate to="/" />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials');
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/api/auth/reset-password', {
        username,
        newPassword,
        recoveryKey
      });
      
      setSuccess(response.data.message || 'Password reset successfully!');
      // Reset form fields
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setRecoveryKey('');
      
      // Auto switch back to login mode after delay
      setTimeout(() => {
        setIsResetMode(false);
        setSuccess('');
      }, 3000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to reset password. Please check your recovery key.');
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
          <div className="mb-4 p-3 bg-red-50 text-red-650 text-sm rounded-lg border border-red-100 flex items-center gap-2 animate-shake">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="font-medium">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-lg border border-green-150 flex items-center gap-2 animate-bounce">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="font-semibold">{success}</span>
          </div>
        )}

        {!isResetMode ? (
          <form onSubmit={handleSubmit} className="space-y-4">
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
          <form onSubmit={handleResetSubmit} className="space-y-4">
            <div className="text-center mb-2">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Reset Password</h3>
              <p className="text-xs text-slate-500 mt-1">Provide the security recovery key to change password.</p>
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
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Security Recovery Key</label>
              <input
                type="password"
                required
                className="premium-input"
                value={recoveryKey}
                onChange={(e) => setRecoveryKey(e.target.value)}
                placeholder="Enter recovery key"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">New Password</label>
              <input
                type="password"
                required
                className="premium-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                className="premium-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
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
                  <span>Resetting...</span>
                </>
              ) : (
                'Reset Password'
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
