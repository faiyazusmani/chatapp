import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function Login() {
  const [submitting, setSubmitting] = useState(false);
  const [submittingText, setSubmittingText] = useState('Signing In with Google...');
  const { loginWithGoogle, isAuthenticated, error: serverError, setError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = location.state?.from?.pathname || '/chat';

  // If already authenticated (or just returned from Google redirect), navigate to chat
  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectPath]);

  const handleGoogleSignIn = async (forceRedirect = false) => {
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    setSubmittingText(forceRedirect ? 'Redirecting to Google...' : 'Connecting to Google...');

    try {
      const result = await loginWithGoogle(forceRedirect);
      if (result.pendingRedirect) {
        // The browser is redirecting to Google OAuth accounts page
        setSubmittingText('Opening Google Sign-In...');
        return;
      }
      if (result.success) {
        navigate(redirectPath, { replace: true });
      }
    } catch (err) {
      setError(err?.message || 'Google sign-in could not be completed.');
      setSubmitting(false);
    }
  };

  const isPopupBlockedError = serverError && (
    serverError.toLowerCase().includes('popup') ||
    serverError.toLowerCase().includes('blocked')
  );

  return (
    <div className="auth-container">
      {/* Ambient background glow elements */}
      <div className="auth-ambient-blur-1" aria-hidden="true" />
      <div className="auth-ambient-blur-2" aria-hidden="true" />

      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-brand-badge">
            <span className="auth-spark">✦</span> ChatRoom
          </div>
          <h2>Welcome to ChatRoom</h2>
          <p>Sign in with your Google account to access your rooms, chats, and encrypted calls</p>
        </div>

        {serverError && (
          <div className="auth-error-alert" role="alert" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="alert-icon">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{serverError}</span>
            </div>
            {isPopupBlockedError && (
              <button
                type="button"
                onClick={() => handleGoogleSignIn(true)}
                style={{
                  marginTop: '4px',
                  padding: '6px 12px',
                  background: '#e11d48',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Sign In Directly (Bypass Popup) →
              </button>
            )}
          </div>
        )}

        <div className="google-auth-wrapper" style={{ marginTop: '0.5rem' }}>
          <button
            type="button"
            className="firebase-google-btn"
            onClick={() => handleGoogleSignIn(false)}
            disabled={submitting}
            aria-label="Sign in with Google"
          >
            {submitting ? (
              <span className="btn-loading-state">
                <span className="spinner-ring" style={{ borderColor: 'rgba(66, 133, 244, 0.3)', borderTopColor: '#4285F4' }} />
                <span>{submittingText}</span>
              </span>
            ) : (
              <>
                <svg className="google-icon-svg" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>
        </div>

        {/* Feature & Security Guarantee Highlights */}
        <div className="auth-security-features">
          <div className="auth-feature-item">
            <span className="auth-feature-icon">🔒</span>
            <span>End-to-end encrypted messaging & rooms</span>
          </div>
          <div className="auth-feature-item">
            <span className="auth-feature-icon">⚡</span>
            <span>Real-time presence, typing indicators & reactions</span>
          </div>
          <div className="auth-feature-item">
            <span className="auth-feature-icon">🎥</span>
            <span>High-definition voice & video group calls</span>
          </div>
        </div>

        <div className="auth-trust-note">
          Secured with Google Firebase Authentication. Works with any Google account.
        </div>
      </div>
    </div>
  );
}
