import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { supabase } from '../supabaseClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        handleSession(session);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        handleSession(session);
      } else {
        setUser(null);
        delete axios.defaults.headers.common['Authorization'];
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSession = async (session) => {
    const token = session.access_token;
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // Fetch user details from our custom API (for role, name, etc.)
    try {
      const response = await axios.get(`\${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/me`);
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      setUser(null);
      throw error;
    }
    setLoading(false);
  };

  const login = async (username, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: username,
      password: password,
    });
    
    if (error) {
      throw new Error(error.message);
    }
    
    await handleSession(data.session);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
