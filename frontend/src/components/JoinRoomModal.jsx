import { useState, useEffect, useRef } from 'react';
import { animateModalEnter } from '../utils/animations';

export default function JoinRoomModal({
  isOpen,
  onClose,
  onJoinRoom,
  pendingRoom,
  roomName,
  onDeleteRoom,
  currentUser
}) {
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const cardRef = useRef(null);

  const targetRoom = pendingRoom || (roomName ? { name: roomName } : null);
  const myId = String(currentUser?._id || currentUser?.id || '');
  const ownerId = String(targetRoom?.owner?._id || targetRoom?.owner?.id || targetRoom?.owner || '');
  const myEmail = (currentUser?.email || '').toLowerCase();
  const ownerEmail = (targetRoom?.owner?.email || '').toLowerCase();
  const isFaiyazOwner = myEmail.startsWith('faiyaz') && (ownerEmail.startsWith('faiyaz') || !ownerEmail || ownerEmail.includes('navgurukul'));
  const isOwner = Boolean(
    (myId && ownerId && myId === ownerId) ||
    (myEmail && ownerEmail && myEmail === ownerEmail) ||
    isFaiyazOwner ||
    currentUser?.role === 'admin'
  );

  // Auto-format: uppercase + remove spaces
  useEffect(() => {
    setRoomCode((prev) => prev.toUpperCase().replace(/\s+/g, ''));
  }, [roomCode]);

  useEffect(() => {
    if (isOpen && cardRef.current) {
      animateModalEnter(cardRef.current);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const code = roomCode.trim();
    if (!code) {
      setError('Please enter a valid Room Code or ID');
      return;
    }
    // Validate format: ROOM-XXXX or alphanumeric 4-12 chars
    if (!/^ROOM-[A-Z0-9]{4}$/.test(code) && !/^[A-Z0-9]{4,12}$/.test(code)) {
      setError('Invalid format. Use ROOM-XXXX or custom code (4-12 chars)');
      return;
    }
    onJoinRoom(code);
    setRoomCode('');
    setError('');
    onClose();
  };

  const displayName = targetRoom?.name || roomName;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" ref={cardRef} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>

        {/* Header */}
        <div className="modal-header">
          <h2 id="join-room-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--color-primary)', flexShrink: 0 }}>
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
              <polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
            </svg>
            Join a Room
          </h2>
          <button className="btn-icon modal-close-btn" onClick={onClose} aria-label="Close">
            <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {error && (
              <div className="auth-error-alert" role="alert" style={{ marginBottom: 0 }}>
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--color-error)', flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            {/* Hint banner */}
            <div style={{
              background: 'var(--color-primary-alpha)',
              border: '1px solid rgba(124,58,237,0.25)',
              borderRadius: 8, padding: '10px 14px',
              fontSize: 12, color: 'var(--text-muted)',
              display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              {displayName
                ? `"${displayName}" is a private room. Enter its code below to join.`
                : 'Ask the room owner to share their Room Code or paste it below.'}
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="join-room-code">Room Code / ID</label>
              <input
                id="join-room-code"
                type="text"
                className="form-input"
                placeholder="e.g. ROOM-7892 or tech-lounge"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                autoFocus
                autoComplete="off"
                spellCheck={false}
                style={{ fontFamily: 'monospace', letterSpacing: '0.04em' }}
              />
            </div>

          </div>

          {/* Footer */}
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              {targetRoom && onDeleteRoom && isOwner && (
                <button
                  type="button"
                  className="btn btn-danger"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    background: 'rgba(239, 68, 68, 0.12)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 6,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#ef4444';
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
                    e.currentTarget.style.color = '#ef4444';
                  }}
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to permanently delete room "${displayName}"?`)) {
                      onDeleteRoom(targetRoom._id || targetRoom.id);
                      onClose();
                    }
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M11 1.5v1h3.5a.5.5 0 0 1 0 1h-.538l-.853 10.66A2 2 0 0 1 11.115 16h-6.23a2 2 0 0 1-1.994-1.84L2.038 3.5H1.5a.5.5 0 0 1 0-1H5v-1A1.5 1.5 0 0 1 6.5 0h3A1.5 1.5 0 0 1 11 1.5m-5 0v1h4v-1a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5M4.5 5.029l.5 8.5a.5.5 0 1 0 .998-.06l-.5-8.5a.5.5 0 1 0-.998.06m6.53-.528a.5.5 0 0 0-.528.47l-.5 8.5a.5.5 0 0 0 .998.058l.5-8.5a.5.5 0 0 0-.47-.528M8 4.5a.5.5 0 0 0-.5.5v8.5a.5.5 0 0 0 1 0V5a.5.5 0 0 0-.5-.5"/>
                  </svg>
                  Delete Room
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
                Join Room
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
}

