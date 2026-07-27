import { useState } from 'react';

export default function JoinRoomModal({ isOpen, onClose, onJoinRoom }) {
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!roomCode.trim()) {
      setError('Please enter a valid Room Code or ID');
      return;
    }

    onJoinRoom(roomCode.trim());
    setRoomCode('');
    setError('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Join Existing Chat Room</h3>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        {error && <div className="auth-error-alert">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="room-code">Room Code / ID</label>
            <input
              id="room-code"
              type="text"
              className="form-input"
              placeholder="e.g. ROOM-7892 or tech-lounge"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              autoFocus
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0.75rem 1.5rem' }}>
              Join Room
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
