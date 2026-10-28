import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useTheme } from '../context/ThemeContext';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { resolvedMode, toggleTheme } = useTheme();
  const isDark = resolvedMode === 'dark';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const displayName = user?.fullName || user?.username || user?.email || 'User';

  return (
    <nav className="navbar" role="navigation" aria-label="Main Navigation">
      <div className="navbar-container">
        {/* Brand Logo */}
        <Link to="/" className="navbar-brand">
          <div className="brand-icon-bubble">
            <span className="brand-spark">✦</span>
          </div>
          <span className="brand-text">
            Chat<span className="brand-accent">Room</span>
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="navbar-links navbar-desktop-links">
          <Link
            to="/"
            className={`nav-link-item ${location.pathname === '/' ? 'active' : ''}`}
          >
            Home
          </Link>
          <Link
            to="/chat"
            className={`nav-link-item ${location.pathname === '/chat' ? 'active' : ''}`}
          >
            Chat
          </Link>

          {isAuthenticated ? (
            <div className="navbar-user-section">
              <div className="user-profile-pill">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={displayName}
                    className="user-pill-avatar"
                  />
                ) : (
                  <span className="user-pill-initials">
                    {(displayName.substring(0, 2)).toUpperCase()}
                  </span>
                )}
                <span className="user-pill-name">{displayName}</span>
                <span className="user-status-dot" title="Online" />
              </div>

              <button
                onClick={handleLogout}
                className="btn-logout-pill"
                type="button"
                title="Log out"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="navbar-auth-buttons">
              <Link to="/login" className="nav-btn-register" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
                <span>Sign In with Google</span>
              </Link>
            </div>
          )}

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="navbar-theme-toggle-btn"
            title={isDark ? "Switch to Cream & Citrus (Light)" : "Switch to Galaxy (Dark)"}
            aria-label={isDark ? "Switch to Cream & Citrus (Light)" : "Switch to Galaxy (Dark)"}
          >
            <span className="theme-toggle-icon-wrap">{isDark ? '☀️' : '🌙'}</span>
            <span className="theme-toggle-label">{isDark ? 'Light' : 'Dark'}</span>
          </button>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          className="navbar-mobile-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle Navigation Menu"
          aria-expanded={mobileMenuOpen}
          type="button"
        >
          {mobileMenuOpen ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="toggle-svg">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="toggle-svg">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Menu Dropdown Drawer */}
      {mobileMenuOpen && (
        <div className="navbar-mobile-drawer" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-drawer-inner" onClick={(e) => e.stopPropagation()}>
            <Link
              to="/"
              className={`mobile-nav-link ${location.pathname === '/' ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="mobile-nav-icon">🏠</span> Home
            </Link>
            <Link
              to="/chat"
              className={`mobile-nav-link ${location.pathname === '/chat' ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="mobile-nav-icon">💬</span> Chat Dashboard
            </Link>

            {/* Mobile Theme Toggle */}
            <button
              type="button"
              onClick={() => {
                toggleTheme();
                setMobileMenuOpen(false);
              }}
              className="mobile-nav-theme-toggle"
            >
              <span className="mobile-nav-icon">{isDark ? '☀️' : '🌙'}</span>
              <span>{isDark ? 'Switch to Light (Cream & Citrus)' : 'Switch to Dark (Galaxy)'}</span>
            </button>

            {isAuthenticated ? (
              <div className="mobile-user-section">
                <div className="mobile-user-card">
                  {user?.avatar ? (
                    <img src={user.avatar} alt={displayName} className="mobile-user-avatar" />
                  ) : (
                    <div className="mobile-user-initials">
                      {(displayName.substring(0, 2)).toUpperCase()}
                    </div>
                  )}
                  <div className="mobile-user-info">
                    <div className="mobile-username">{displayName}</div>
                    <div className="mobile-user-sub">Active Now</div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="mobile-btn-logout"
                  type="button"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="mobile-auth-grid" style={{ gridTemplateColumns: '1fr' }}>
                <Link
                  to="/login"
                  className="mobile-btn-register"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                  <span>Sign In with Google</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
