import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Set up axios defaults
  axios.defaults.baseURL = '/api';
  
  // Set up axios interceptor for token
  useEffect(() => {
    const interceptor = axios.interceptors.request.use(
      config => {
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      error => {
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(interceptor);
    };
  }, [token]);

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          const res = await axios.get('/auth/profile');
          setCurrentUser(res.data);
        } catch (error) {
          console.error('Failed to load user:', error);
          localStorage.removeItem('token');
          setToken(null);
          setCurrentUser(null);
        }
      }
      setLoading(false);
    };

    loadUser();
  }, [token]);

  // Login function
  const login = async (username, password) => {
    try {
      const res = await axios.post('/auth/login', { username, password });
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
      setCurrentUser(res.data.user);
      return res.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error.response?.data || { message: 'Login failed' };
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      const res = await axios.post('/auth/register', userData);
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
      setCurrentUser(res.data.user);
      return res.data;
    } catch (error) {
      console.error('Register error:', error);
      throw error.response?.data || { message: 'Registration failed' };
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setCurrentUser(null);
    navigate('/login');
  };

  // Sync with Stremio
  const syncWithStremio = async (stremioCredentials) => {
    try {
      const res = await axios.post('/auth/sync-stremio', stremioCredentials);
      setCurrentUser(res.data.user);
      return res.data;
    } catch (error) {
      console.error('Stremio sync error:', error);
      throw error.response?.data || { message: 'Stremio sync failed' };
    }
  };

  // Register on Stremio
  const registerOnStremio = async (stremioCredentials) => {
    try {
      const res = await axios.post('/auth/register-stremio', stremioCredentials);
      setCurrentUser(res.data.user);
      return res.data;
    } catch (error) {
      console.error('Stremio registration error:', error);
      throw error.response?.data || { message: 'Stremio registration failed' };
    }
  };

  // Update user profile
  const updateProfile = async (userData) => {
    try {
      const res = await axios.put(`/users/${currentUser.id}`, userData);
      setCurrentUser({...currentUser, ...res.data.user});
      return res.data;
    } catch (error) {
      console.error('Profile update error:', error);
      throw error.response?.data || { message: 'Profile update failed' };
    }
  };

  const value = {
    currentUser,
    token,
    loading,
    login,
    register,
    logout,
    syncWithStremio,
    registerOnStremio,
    updateProfile,
    isAdmin: currentUser?.role === 'admin',
    isReseller: currentUser?.role === 'reseller',
    isUser: currentUser?.role === 'user',
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};