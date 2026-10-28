import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useTheme } from '../context/ThemeContext';
import { useSmoothScroll } from '../context/SmoothScroll';
import { animateHeroReveal } from '../utils/animations';

export default function Home() {
  const { isAuthenticated } = useAuth();
  const { resolvedMode, toggleTheme } = useTheme();
  const isDark = resolvedMode === 'dark';
  const { lenis } = useSmoothScroll() || {};
  const containerRef = useRef(null);

  // GSAP Orchestrated Page Entrance
  useEffect(() => {
    if (!containerRef.current) return;
    const tl = animateHeroReveal(containerRef.current);
    return () => {
      if (tl) tl.kill();
    };
  }, []);

  const handleScrollToFeatures = (e) => {
    e.preventDefault();
    if (lenis) {
      lenis.scrollTo('#key-features', { offset: -60, duration: 1.1 });
    } else {
      const el = document.getElementById('key-features');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const coreFeatures = [
    {
      icon: '⚡',
      title: 'Instant Messaging',
      desc: 'Blazing fast real-time chat with delivery receipts, typing indicators, rich reactions, and offline sync.',
      tag: 'Real-Time',
    },
    {
      icon: '📹',
      title: 'HD Video & Audio Calls',
      desc: 'Crystal-clear 1-on-1 and group calling powered by WebRTC with auto-adjusting video presets and screen sharing.',
      tag: 'WebRTC',
    },
    {
      icon: '🎙️',
      title: 'Voice Notes & Media',
      desc: 'Record studio-quality voice memos with interactive waveforms and share images, documents, and archives instantly.',
      tag: 'Rich Media',
    },
    {
      icon: '🔒',
      title: 'Private & Secure Spaces',
      desc: 'Create invite-code protected private rooms or open public channels with custom themes and online presence.',
      tag: 'Encrypted',
    },
  ];

  return (
    <div className="home-page-wrapper" ref={containerRef}>
      {/* Background ambient lighting */}
      <div className="ambient-glow-orb ambient-orb-1" aria-hidden="true" />
      <div className="ambient-glow-orb ambient-orb-2" aria-hidden="true" />
      <div className="home-grid-backdrop" aria-hidden="true" />

      {/* ─── HERO SECTION ────────────────────────────────────────── */}
      <section className="home-hero-section">
        <div className="hero-telemetry-container">
          <div className="hero-telemetry-strip">
            <span className="telemetry-beacon" aria-hidden="true" />
            <span className="telemetry-text">Next-Gen Realtime Communication</span>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className="hero-theme-pill-btn"
            title={isDark ? "Switch to Cream & Citrus (Light)" : "Switch to Galaxy (Dark)"}
            aria-label={isDark ? "Switch to Cream & Citrus (Light)" : "Switch to Galaxy (Dark)"}
          >
            <span>{isDark ? '🌙 Galaxy Dark' : '🍊 Cream & Citrus'}</span>
            <span className="hero-theme-switch-hint">Switch Theme ⇄</span>
          </button>
        </div>

        <h1 className="home-hero-headline">
          Real-time messaging, crystal-clear calls.
        </h1>

        <p className="home-hero-subhead">
          Connect with friends and teams through fast messaging, HD voice &amp; video calling, voice notes, and private spaces — zero lag, pure focus.
        </p>

        <div className="home-hero-actions">
          {isAuthenticated ? (
            <Link to="/chat" className="hero-action-btn primary">
              <span>Open Chat Dashboard →</span>
            </Link>
          ) : (
            <>
              <Link to="/login" className="hero-action-btn primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#ffffff" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                  <path fill="#ffffff" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                  <path fill="#ffffff" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                  <path fill="#ffffff" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
                <span>Continue with Google</span>
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={handleScrollToFeatures}
            className="hero-action-btn tertiary"
          >
            <span>Explore Features ↓</span>
          </button>
        </div>

        {/* ─── CLEAN APP SHOWCASE PREVIEW ──────────────────────────── */}
        <div className="home-showcase-container">
          <div className="home-showcase-card">
            {/* Window title bar */}
            <div className="showcase-header">
              <div className="showcase-dots">
                <span className="dot dot-close" />
                <span className="dot dot-min" />
                <span className="dot dot-expand" />
              </div>
              <div className="showcase-room-badge">
                <span className="showcase-hash">#</span>
                <span className="showcase-room-name">general-discussion</span>
              </div>
              <div className="showcase-status-live">
                <span className="live-dot" />
                <span>Active</span>
              </div>
            </div>

            {/* Showcase feed */}
            <div className="showcase-body">
              {/* Message 1: Incoming */}
              <div className="showcase-msg incoming">
                <div className="showcase-avatar" style={{ background: '#3b82f6' }}>
                  SC
                </div>
                <div className="showcase-bubble-col">
                  <div className="showcase-sender">
                    <span>Sarah Connor</span>
                    <span className="showcase-time">10:42 AM</span>
                  </div>
                  <div className="showcase-bubble in">
                    The new audio and video calling is live! Latency is practically zero 🚀
                  </div>
                  <div className="showcase-reactions">
                    <span className="reaction-tag">🔥 4</span>
                    <span className="reaction-tag">❤️ 2</span>
                  </div>
                </div>
              </div>

              {/* Message 2: Call Event */}
              <div className="showcase-call-event">
                <span className="showcase-call-icon">📹</span>
                <span className="showcase-call-text">Video Call started · 3 participants connected</span>
                <span className="showcase-call-badge">Live HD</span>
              </div>

              {/* Message 3: Outgoing with voice note */}
              <div className="showcase-msg outgoing">
                <div className="showcase-bubble-col align-end">
                  <div className="showcase-sender right">
                    <span className="showcase-time">10:44 AM</span>
                    <span>You</span>
                  </div>
                  <div className="showcase-bubble out">
                    Sounds crystal clear! Here is a quick voice note preview:
                  </div>
                  <div className="showcase-voice-pill">
                    <button type="button" className="showcase-play-btn" aria-label="Play sample voice note">▶</button>
                    <div className="showcase-waveform">
                      <span style={{ height: '35%' }} />
                      <span style={{ height: '70%' }} />
                      <span style={{ height: '100%' }} />
                      <span style={{ height: '45%' }} />
                      <span style={{ height: '85%' }} />
                      <span style={{ height: '60%' }} />
                      <span style={{ height: '90%' }} />
                      <span style={{ height: '40%' }} />
                    </div>
                    <span className="showcase-voice-dur">0:18</span>
                  </div>
                  <div className="showcase-delivered">Delivered ✓✓</div>
                </div>
                <div className="showcase-avatar" style={{ background: '#6366f1' }}>
                  ME
                </div>
              </div>
            </div>

            {/* Showcase quick composer */}
            <div className="showcase-composer">
              <span className="showcase-composer-icon">📎</span>
              <span className="showcase-composer-input">Send a message in #general-discussion...</span>
              <span className="showcase-send-btn">Send</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── KEY FEATURES GRID ─────────────────────────────────────── */}
      <section className="home-features-section" id="key-features">
        <div className="section-head text-center">
          <h2 className="section-title">Everything you need to communicate seamlessly</h2>
          <p className="section-subtitle">
            Thoughtfully built with fast WebSocket messaging, WebRTC calling, and an intuitive modern interface.
          </p>
        </div>

        <div className="features-grid">
          {coreFeatures.map((feat, i) => (
            <div key={i} className="feature-card">
              <div className="feature-card-header">
                <span className="feature-icon">{feat.icon}</span>
                <span className="feature-tag">{feat.tag}</span>
              </div>
              <h3 className="feature-title">{feat.title}</h3>
              <p className="feature-desc">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── DIRECT ACCESS ACTION SECTION ──────────────────────────── */}
      <section className="home-cta-section">
        <div className="home-cta-card">
          <h2 className="cta-heading">Ready to experience frictionless conversation?</h2>
          <p className="cta-subheading">
            Join public channels or launch an encrypted room in seconds. No complex setup or installation required.
          </p>
          <div className="cta-actions">
            <Link to={isAuthenticated ? "/chat" : "/login"} className="hero-action-btn primary large" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              {!isAuthenticated && (
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#ffffff" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                  <path fill="#ffffff" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                  <path fill="#ffffff" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                  <path fill="#ffffff" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
              )}
              <span>{isAuthenticated ? 'Open Chat Dashboard' : 'Sign In with Google'}</span>
            </Link>
            <Link to="/chat" className="hero-action-btn secondary large">
              <span>Browse Public Channels</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ──────────────────────────────────────────────── */}
      <footer className="home-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="footer-logo">
              <span className="logo-spark">✦</span> ChatRoom
            </div>
            <p className="footer-tagline">Real-time messaging and voice/video calling platform.</p>
          </div>

          <div className="footer-status-pill">
            <span className="status-live-dot" />
            <span>Real-time Chat &amp; Calling Active</span>
          </div>

          <div className="footer-links">
            <Link to="/">Home</Link>
            <Link to="/chat">Chat</Link>
            <Link to="/login">Sign In with Google</Link>
          </div>
        </div>
        <div className="footer-copyright">
          © {new Date().getFullYear()} ChatRoom. Built for real-time collaboration.
        </div>
      </footer>
    </div>
  );
}
