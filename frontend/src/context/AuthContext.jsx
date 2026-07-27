import { useState, useEffect } from 'react';
import { AuthContext } from './createAuthContext';
import api from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth state from localStorage and verify profile
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        connectSocket(storedToken);

        // Verify token with profile endpoint
        try {
          const response = await api.get('/auth/profile');
          setUser(response.data);
          localStorage.setItem('user', JSON.stringify(response.data));
        } catch (err) {
          console.warn('[AuthContext] Stored session invalid or expired');
          logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  // Register user
  const register = async (username, email, password) => {
    setError(null);
    try {
      const response = await api.post('/auth/register', { username, email, password });
      const { token: newToken, ...userData } = response.data;

      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));

      setToken(newToken);
      setUser(userData);
      connectSocket(newToken);

      return { success: true };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Registration failed. Please try again.';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  // Login user
  const login = async (email, password) => {
    setError(null);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token: newToken, ...userData } = response.data;

      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));

      setToken(newToken);
      setUser(userData);
      connectSocket(newToken);

      return { success: true };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Login failed. Invalid credentials.';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  // Logout user
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    disconnectSocket();
    setToken(null);
    setUser(null);
    setError(null);
  };

  // Update local user state instantly
  const updateLocalUser = (updatedData) => {
    setUser(updatedData);
    localStorage.setItem('user', JSON.stringify(updatedData));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        setError,
        register,
        login,
        logout,
        updateLocalUser,
        isAuthenticated: !!user && !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
