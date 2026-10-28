import { useState, useEffect } from 'react';
import { AuthContext } from './createAuthContext';
import api from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';
import { signInWithFirebaseGoogle, signOutFirebase, handleRedirectResult } from '../services/googleAuth';

// 🔒 Cross-origin deployments (Vercel frontend + Render backend) cannot rely
// on SameSite=Lax HttpOnly cookies — the cookie is not sent cross-site.
// We keep the JWT in localStorage and send it as `Authorization: Bearer`
// (the backend `protect` middleware already supports both).
export const getStoredToken = () => localStorage.getItem('token');

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth state: Check for Firebase redirect sign-in first, then profile
  useEffect(() => {
    const initializeAuth = async () => {
      // 1. Check if returning from a Google redirect login
      try {
        const redirectRes = await handleRedirectResult();
        if (redirectRes && redirectRes.success) {
          const { token, user: userData } = redirectRes;
          if (token) localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(userData));
          setUser(userData);
          connectSocket(token || undefined);
          setLoading(false);
          return;
        } else if (redirectRes && !redirectRes.success) {
          setError(redirectRes.message);
        }
      } catch (e) {
        console.warn('[Auth] Redirect result check:', e);
      }

      // 2. Otherwise restore session from backend profile
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

  // Firebase Google Login (supports popup and redirect modes)
  const loginWithGoogle = async (forceRedirect = false) => {
    setError(null);
    try {
      const result = await signInWithFirebaseGoogle(forceRedirect);
      if (result.pendingRedirect) {
        // Browser is navigating to Google accounts page
        return { success: true, pendingRedirect: true };
      }

      if (!result.success) {
        setError(result.message);
        return { success: false, message: result.message };
      }

      const { token, user: userData } = result;
      if (token) localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      connectSocket(token || undefined);

      return { success: true, user: userData };
    } catch (err) {
      const errorMessage = err?.message || 'Google sign-in failed';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  // Register user (legacy fallback)
  const register = async (username, email, password) => {
    setError(null);
    try {
      const response = await api.post('/auth/register', { username, email, password });
      const { token, ...userData } = response.data;
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

  // Login user (legacy fallback)
  const login = async (email, password) => {
    setError(null);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, ...userData } = response.data;
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
    try {
      api.post('/auth/logout');
    } catch (err) {
      // ignore
    }
    signOutFirebase();
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
        loading,
        error,
        setError,
        loginWithGoogle,
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

