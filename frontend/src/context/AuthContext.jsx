import { useState, useEffect } from 'react';
import { AuthContext } from './createAuthContext';
import api from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

// 🔒 Cross-origin deployments (Vercel frontend + Render backend) cannot rely
// on SameSite=Lax HttpOnly cookies — the cookie is not sent cross-site.
// We keep the JWT in localStorage and send it as `Authorization: Bearer`
// (the backend `protect` middleware already supports both).
export const getStoredToken = () => localStorage.getItem('token');

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth state from localStorage and verify profile
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const response = await api.get('/auth/profile');
        setUser(response.data);
        localStorage.setItem('user', JSON.stringify(response.data));
        // Connect socket with the stored token (Bearer header auth)
        connectSocket(getStoredToken() || undefined);
      } catch (err) {
        // No active session on server
        setUser(null);
        localStorage.removeItem('user');
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
      const { token, ...userData } = response.data;
      // Keep token in localStorage for Authorization header (works cross-origin)
      if (token) localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      connectSocket(token || undefined);

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
      const { token, ...userData } = response.data;
      // Keep token in localStorage for Authorization header (works cross-origin)
      if (token) localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      connectSocket(token || undefined);

      return { success: true };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Login failed. Invalid credentials.';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  // Logout user
  const logout = () => {
    // Inform server to clear cookie
    try {
      api.post('/auth/logout');
    } catch (err) {
      // ignore
    }
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    disconnectSocket();
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
        // token is stored server-side in an HttpOnly cookie
        loading,
        error,
        setError,
        register,
        login,
        logout,
        updateLocalUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
