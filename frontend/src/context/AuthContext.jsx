import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// SET TO false TO ENABLE THE FULL LOGIN SECURITY SCREEN BACK
const BYPASS_LOGIN_FOR_DEV = false;

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (BYPASS_LOGIN_FOR_DEV) {
      const mockUser = { id: 1, username: 'admin', role: 'admin', name: 'Dev Admin' };
      localStorage.setItem('token', 'dev-bypass-token');
      localStorage.setItem('user', JSON.stringify(mockUser));
      axios.defaults.headers.common['Authorization'] = 'Bearer dev-bypass-token';
      setUser(mockUser);
      setLoading(false);
    } else {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      if (token && token !== 'dev-bypass-token' && storedUser) {
        setUser(JSON.parse(storedUser));
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } else if (token === 'dev-bypass-token') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const response = await axios.post('http://localhost:5000/api/auth/login', { username, password });
    const { token, user: userData } = response.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
