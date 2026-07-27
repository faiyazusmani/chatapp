import { useState } from 'react';

export default function CreateRoomModal({ isOpen, onClose, onCreateRoom }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('General');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Room name is required');
      return;
    }

    onCreateRoom({
      name: name.trim(),
      category,
      description: description.trim(),
      isPrivate
    });

    // Reset fields & close
    setName('');
    setCategory('General');
    setDescription('');
    setIsPrivate(false);
    setError('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create New Chat Room</h3>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        {error && <div className="auth-error-alert">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="room-name">Room Name</label>
            <input
              id="room-name"
              type="text"
              className="form-input"
              placeholder="e.g. React Developers Hangout"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="room-category">Category</label>
            <select
              id="room-category"
              className="form-input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="General">💬 General</option>
              <option value="Tech">💻 Tech & Code</option>
              <option value="Gaming">🎮 Gaming</option>
              <option value="Music">🎵 Music & Arts</option>
              <option value="Random">✨ Random</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="room-desc">Description (Optional)</label>
            <textarea
              id="room-desc"
              className="form-input"
              rows="3"
              placeholder="What is this room about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              id="room-private"
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <label htmlFor="room-private" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>
              Private Room (Requires Room Code to join)
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0.75rem 1.5rem' }}>
              Create Room
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
