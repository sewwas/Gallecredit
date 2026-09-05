import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { supabase } from '../supabaseClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const handleSession = async (session) => {
    const token = session.access_token;
    localStorage.setItem('token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    try {
      const response = await axios.get(`${API_URL}/api/users/me`);
      if (typeof response.data === 'string') {
        throw new Error("Backend connection failed: Received HTML instead of user data.");
      }
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      setUser(null);
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          const response = await axios.get(`${API_URL}/api/users/me`);
          if (isMounted && response.data && typeof response.data !== 'string') {
            setUser(response.data);
            setLoading(false);
            return;
          }
        } catch (err) {
          console.warn('Session expired or invalid, clearing token:', err.message);
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
        }
      }

      // Check if there is an active Supabase session
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && isMounted) {
          await handleSession(session);
          return;
        }
      } catch (e) {}

      if (isMounted) {
        setUser(null);
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes from Supabase (e.g. password recovery redirects)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        await handleSession(session);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const login = async (username, password) => {
    try {
      const res = await axios.post(`${API_URL}/api/auth/login`, {
        username: username.toString().trim(),
        password
      });

      const { token, user: userData } = res.data;
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(userData);
      return userData;
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Invalid username or password';
      throw new Error(message);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {}
    setUser(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
