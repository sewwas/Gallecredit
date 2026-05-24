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
  const [resetStep, setResetStep] = useState(1); // 1 = Request OTP, 2 = Submit OTP & Reset Password
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState('');

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

  // Step 1: Send OTP email request
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
      const response = await axios.post('http://localhost:5000/api/auth/send-otp', {
        username
      });
      
      setSuccess(response.data.message || 'OTP verification code sent!');
      
      // If SMTP is not set up and backend sends devOtp
      if (response.data.devOtp) {
        setDevOtp(response.data.devOtp);
        setOtp(response.data.devOtp); // Autofill for super easy developer flow
      }
      
      // Advance to step 2
      setResetStep(2);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to send recovery code. Please verify your email.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and reset password
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!otp) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

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
        otp,
        newPassword
      });
      
      setSuccess(response.data.message || 'Password reset successfully!');
      // Reset form fields
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setOtp('');
      setDevOtp('');
      
      // Auto switch back to login mode after delay
      setTimeout(() => {
        setIsResetMode(false);
        setResetStep(1);
        setSuccess('');
      }, 3000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to reset password. Please check your verification code.');
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

        {devOtp && (
          <div className="mb-4 p-3 bg-blue-50 text-blue-750 text-xs rounded-lg border border-blue-150 flex flex-col gap-1 text-left">
            <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-blue-800">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <span>🔧 Sandbox Developer Alert</span>
            </div>
            <span>No SMTP server is configured in <code>.env</code>. Recovery code printed to your server console and autofilled below: <b className="text-sm text-blue-900 select-all">{devOtp}</b></span>
          </div>
        )}

        {!isResetMode ? (
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
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
                    setResetStep(1);
                    setError('');
                    setSuccess('');
                    setDevOtp('');
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
        ) : resetStep === 1 ? (
          <form onSubmit={handleRequestOtp} className="space-y-4 text-left">
            <div className="text-center mb-2">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Recover Password</h3>
              <p className="text-xs text-slate-500 mt-1">Enter your username to receive a secure recovery code via email.</p>
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
                  <span>Sending Code...</span>
                </>
              ) : (
                'Send Recovery Code'
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsResetMode(false);
                setError('');
                setSuccess('');
                setDevOtp('');
              }}
              className="w-full text-xs font-bold text-slate-500 hover:text-slate-700 transition py-2 text-center"
            >
              Back to Sign In
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetSubmit} className="space-y-4 text-left">
            <div className="text-center mb-2">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Reset Password</h3>
              <p className="text-xs text-slate-500 mt-1">Enter the 6-digit code sent to your email to verify and update your credentials.</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">6-Digit Verification Code</label>
              <input
                type="text"
                required
                maxLength="6"
                className="premium-input text-center tracking-[10px] text-lg font-bold"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
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
            <div className="flex justify-between items-center px-1">
              <button
                type="button"
                onClick={() => {
                  setResetStep(1);
                  setError('');
                  setSuccess('');
                  setDevOtp('');
                  setOtp('');
                }}
                className="text-xs font-bold text-slate-500 hover:text-slate-700 transition py-2"
              >
                Back to Username
              </button>
              <button
                type="button"
                onClick={handleRequestOtp}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 transition py-2"
              >
                Resend Code
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
