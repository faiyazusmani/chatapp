import { useState, useEffect } from 'react';
import { AuthContext } from './createAuthContext';
import api from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

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
        // connect socket relying on cookie-based auth
        connectSocket();
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
      const userData = { ...response.data };
      delete userData.token; // token lives in HttpOnly cookie

      // Keep localStorage user for quick reads; token is stored HttpOnly in cookie
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      connectSocket();

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
      const userData = { ...response.data };
      delete userData.token; // token lives in HttpOnly cookie

      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      connectSocket();

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
