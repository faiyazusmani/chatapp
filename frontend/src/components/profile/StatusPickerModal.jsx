import { useState } from 'react';
import { socket } from '../../services/socket';
import { useAuth } from '../../context/useAuth';

const STATUS_PRESETS = [
  { emoji: '😀', text: 'Happy' },
  { emoji: '💻', text: 'Coding' },
  { emoji: '🎮', text: 'Gaming' },
  { emoji: '🍔', text: 'Lunch' },
  { emoji: '😴', text: 'Sleeping' },
  { emoji: '📚', text: 'Studying' },
  { emoji: '✈️', text: 'Traveling' },
];

const DURATIONS = [
  { label: 'Don\'t clear', value: null },
  { label: '1 Hour', value: 60 * 60 * 1000 },
  { label: '4 Hours', value: 4 * 60 * 60 * 1000 },
  { label: 'Today', value: 24 * 60 * 60 * 1000 },
];

export default function StatusPickerModal({ onClose }) {
  const { user, updateLocalUser } = useAuth();
  
  const [selectedEmoji, setSelectedEmoji] = useState(user?.customStatus?.emoji || '💬');
  const [customText, setCustomText] = useState(user?.customStatus?.text || '');
  const [duration, setDuration] = useState(DURATIONS[0].value);

  const handleSave = () => {
    let expiresAt = null;
    if (duration) {
      expiresAt = new Date(Date.now() + duration).toISOString();
    }

    const statusData = {
      emoji: selectedEmoji,
      text: customText.trim(),
      expiresAt
    };

    // Update locally instantly
    updateLocalUser({ ...user, customStatus: statusData });

    // Emit to server
    socket.emit('update_status', statusData);

    onClose();
  };

  const handleClear = () => {
    const statusData = { emoji: '', text: '', expiresAt: null };
    updateLocalUser({ ...user, customStatus: statusData });
    socket.emit('update_status', statusData);
    onClose();
  };

  return (
    <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={modalStyle}>
        <div style={{ padding: 20, borderBottom: '1px solid #282c37' }}>
          <h2 style={{ margin: 0, fontSize: 18, color: '#f3f4f6' }}>Set a custom status</h2>
        </div>
        
        <div style={{ padding: 20 }}>
          {/* Input Area */}
          <div style={{ display: 'flex', gap: 10, background: '#111216', padding: 10, borderRadius: 8, border: '1px solid #282c37' }}>
            <div style={{ fontSize: 24 }}>{selectedEmoji}</div>
            <input 
              type="text" 
              placeholder="What's on your mind?"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', fontSize: 14, outline: 'none' }}
              maxLength={100}
            />
            {customText && (
              <button onClick={() => setCustomText('')} style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>✖</button>
            )}
          </div>

          {/* Presets */}
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', marginBottom: 10 }}>Presets</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {STATUS_PRESETS.map((preset) => (
                <button 
                  key={preset.text}
                  onClick={() => { setSelectedEmoji(preset.emoji); setCustomText(preset.text); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1c1f28', border: 'none', padding: '10px 12px', borderRadius: 6, color: '#e5e7eb', cursor: 'pointer', textAlign: 'left' }}
                >
                  <span style={{ fontSize: 16 }}>{preset.emoji}</span>
                  <span style={{ fontSize: 14 }}>{preset.text}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Duration Picker */}
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', marginBottom: 10 }}>Clear After</div>
            <select 
              value={duration === null ? '' : duration} 
              onChange={(e) => setDuration(e.target.value ? Number(e.target.value) : null)}
              style={{ width: '100%', padding: 10, borderRadius: 6, background: '#111216', border: '1px solid #282c37', color: '#e5e7eb', outline: 'none' }}
            >
              {DURATIONS.map(d => (
                <option key={d.label} value={d.value === null ? '' : d.value}>{d.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ padding: 20, background: '#181a20', borderTop: '1px solid #282c37', display: 'flex', justifyContent: 'space-between', borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
          <button onClick={handleClear} style={{ padding: '8px 16px', borderRadius: 4, background: 'transparent', color: '#f87171', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
            Clear Status
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 4, background: '#374151', color: '#fff', border: 'none', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSave} disabled={!customText.trim()} style={{ padding: '8px 16px', borderRadius: 4, background: '#5865F2', color: '#fff', border: 'none', cursor: 'pointer', opacity: !customText.trim() ? 0.5 : 1 }}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20
};
const modalStyle = {
  width: '100%', maxWidth: 450, background: '#1c1f28', borderRadius: 12, boxShadow: '0 10px 40px rgba(0,0,0,0.5)', position: 'relative'
};
