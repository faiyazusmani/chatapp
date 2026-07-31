import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '1rem 2rem',
      backgroundColor: 'var(--bg-card)',
      borderBottom: '1px solid var(--border)'
    }}>
      <div style={{ fontWeight: 'bold', fontSize: '1.25rem', color: 'var(--primary)' }}>
        <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>ChatRoom</Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <Link to="/">Home</Link>
        <Link to="/chat">Chat</Link>

        {isAuthenticated ? (
          (() => {
            const isGoogle = user?.provider === 'google' || user?.googleId;
            const displayName = user?.fullName || user?.username || user?.email || 'User';

            if (isGoogle) {
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {user?.avatar && (
                      <img
                        src={user.avatar}
                        alt={displayName}
                        style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-slate)' }}
                      />
                    )}
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{displayName}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    style={{
                      backgroundColor: 'transparent',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border)',
                      padding: '0.4rem 0.8rem',
                      borderRadius: 'var(--radius-xs)',
                      fontSize: '0.85rem'
                    }}
                    onMouseEnter={(e) => e.target.style.color = 'var(--error)'}
                    onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
                  >
                    Logout
                  </button>
                </div>
              );
            }

            // Default (normal login) UI — preserve existing layout
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {user?.avatar && (
                    <img
                      src={user.avatar}
                      alt={user.username}
                      style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-slate)' }}
                    />
                  )}
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user?.username}</span>
                </div>
                <button
                  onClick={handleLogout}
                  style={{
                    backgroundColor: 'transparent',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border)',
                    padding: '0.4rem 0.8rem',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: '0.85rem'
                  }}
                  onMouseEnter={(e) => e.target.style.color = 'var(--error)'}
                  onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
                >
                  Logout
                </button>
              </div>
            );
          })()
        ) : (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Link to="/login">Login</Link>
            <Link to="/register" style={{
              backgroundColor: 'var(--primary)',
              color: 'var(--color-white)',
              padding: '0.4rem 0.9rem',
              borderRadius: 'var(--radius-xs)',
              textDecoration: 'none',
              fontWeight: 500
            }}>
              Register
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
