import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { GoogleLogin } from '@react-oauth/google';
import api from '../services/api';
import { connectSocket } from '../services/socket';




export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login, error: serverError, setError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = location.state?.from?.pathname || '/chat';

  const validateForm = () => {
    if (!email.trim()) {
      return 'Email address is required';
    }
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    if (!password) {
      return 'Password is required';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');
    setError(null);

    const errorMsg = validateForm();
    if (errorMsg) {
      setValidationError(errorMsg);
      return;
    }

    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);

    if (result.success) {
      navigate(redirectPath, { replace: true });
    }
  };

  // Google OAuth flow
  const googleSuccessHandler = async (credentialResponse) => {
    const idToken = credentialResponse?.credential;
    if (!idToken) {
      setError('Google sign-in failed. No credential returned.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await api.post('/auth/google', { idToken });
      const userData = { ...response.data };
      delete userData.token; // token lives in HttpOnly cookie

      // Server stores JWT in an HttpOnly cookie. Keep a lightweight local user cache.
      localStorage.setItem('user', JSON.stringify(userData));

      // Connect socket (server will authenticate via cookie) and redirect
      connectSocket();
      window.location.href = redirectPath;
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Google login failed.';
      setError(errorMessage);
      } finally {
        setSubmitting(false);
      }
  };

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';



  const activeError = validationError || serverError;

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Welcome Back</h2>
          <p>Sign in to continue to ChatRoom</p>
        </div>

        {activeError && (
          <div className="auth-error-alert" role="alert">
            {activeError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={submitting}
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <GoogleLogin
              onSuccess={(credentialResponse) => {
                setValidationError('');
                setError(null);
                googleSuccessHandler(credentialResponse);
              }}
              onError={() => setError('Google Sign-In failed. Likely causes: wrong or missing VITE_GOOGLE_CLIENT_ID, or the OAuth Client does not list this origin (http://localhost:5175) in Authorized JavaScript origins. Update Google Cloud Console and restart Vite.')}
            />
            {!import.meta.env.PROD && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                Client ID: {clientId ? `${clientId.slice(0, 20)}...` : '(not set)'}
              </div>
            )}
          </div>
        </div>

        <div className="auth-footer">
          Don&apos;t have an account? <Link to="/register">Create Account</Link>
        </div>
      </div>
    </div>
  );
}
