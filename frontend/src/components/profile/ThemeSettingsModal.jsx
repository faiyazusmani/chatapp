import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

const THEME_PRESETS = [
  { id: 'default', name: 'Gajim Default', primary: '#7c3aed', chatBg: '#181a20', sidebarBg: '#1a1c23', inBg: '#222530', outBg: '#7c3aed' },
  { id: 'ocean', name: 'Ocean Depth', primary: '#0ea5e9', chatBg: '#0f172a', sidebarBg: '#020617', inBg: '#1e293b', outBg: '#0ea5e9' },
  { id: 'sunset', name: 'Sunset', primary: '#f97316', chatBg: '#2a1a1f', sidebarBg: '#1a0b12', inBg: '#3f2129', outBg: '#f97316' },
  { id: 'amoled', name: 'AMOLED Black', primary: '#10b981', chatBg: '#000000', sidebarBg: '#000000', inBg: '#111111', outBg: '#10b981' },
  { id: 'glassmorphism', name: 'Glassmorphism', primary: '#ec4899', chatBg: 'transparent', sidebarBg: 'transparent', inBg: 'rgba(255,255,255,0.1)', outBg: 'rgba(236,72,153,0.8)' }
];

export default function ThemeSettingsModal({ onClose }) {
  const { theme, updateTheme, resetTheme } = useTheme();
  
  // Local state for instant preview without spamming the backend
  const [localTheme, setLocalTheme] = useState(theme);

  const handleApplyPreset = (preset) => {
    const newTheme = {
      preset: preset.id,
      primaryColor: preset.primary,
      chatBg: preset.chatBg,
      sidebarBg: preset.sidebarBg,
      msgIncomingBg: preset.inBg,
      msgOutgoingBg: preset.outBg
    };
    setLocalTheme({ ...localTheme, ...newTheme });
    updateTheme(newTheme);
  };

  const handleColorChange = (key, val) => {
    const updated = { ...localTheme, [key]: val, preset: 'custom' };
    setLocalTheme(updated);
    updateTheme(updated); // This triggers instant context update for live preview
  };

  return (
    <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" style={modalStyle}>
        
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>🎨 Theme Settings</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#9ca3af', fontSize: 20, cursor: 'pointer' }}>&times;</button>
        </div>

        <div style={{ padding: 20 }}>
          {/* Presets */}
          <h3 style={sectionTitleStyle}>Presets</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10, marginBottom: 24 }}>
            {THEME_PRESETS.map((p) => (
              <div 
                key={p.id}
                onClick={() => handleApplyPreset(p)}
                style={{
                  padding: 10,
                  borderRadius: 8,
                  border: `2px solid ${localTheme.preset === p.id ? 'var(--theme-primary)' : 'var(--border)'}`,
                  background: p.sidebarBg,
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: '0.2s'
                }}
              >
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: p.primary, margin: '0 auto 8px' }} />
                <span style={{ fontSize: 12, color: '#e5e7eb', fontWeight: 600 }}>{p.name}</span>
              </div>
            ))}
          </div>

          {/* Custom Colors */}
          <h3 style={sectionTitleStyle}>Custom Colors</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            <ColorRow label="Primary Accent" value={localTheme.primaryColor} onChange={(v) => handleColorChange('primaryColor', v)} />
            <ColorRow label="Incoming Bubble" value={localTheme.msgIncomingBg} onChange={(v) => handleColorChange('msgIncomingBg', v)} />
            <ColorRow label="Outgoing Bubble" value={localTheme.msgOutgoingBg} onChange={(v) => handleColorChange('msgOutgoingBg', v)} />
            <ColorRow label="Chat Background" value={localTheme.chatBg} onChange={(v) => handleColorChange('chatBg', v)} />
            <ColorRow label="Sidebar Background" value={localTheme.sidebarBg} onChange={(v) => handleColorChange('sidebarBg', v)} />
          </div>

          {/* Shapes & Fonts */}
          <h3 style={sectionTitleStyle}>Shapes & Fonts</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={rowStyle}>
              <span style={{ fontSize: 14 }}>Bubble Radius</span>
              <select 
                value={localTheme.borderRadius} 
                onChange={(e) => handleColorChange('borderRadius', e.target.value)}
                style={selectStyle}
              >
                <option value="4px">Square (4px)</option>
                <option value="12px">Rounded (12px)</option>
                <option value="24px">Pill (24px)</option>
              </select>
            </div>
            <div style={rowStyle}>
              <span style={{ fontSize: 14 }}>Font Family</span>
              <select 
                value={localTheme.fontFamily} 
                onChange={(e) => handleColorChange('fontFamily', e.target.value)}
                style={selectStyle}
              >
                <option value="Inter">Inter (Default)</option>
                <option value="Roboto">Roboto</option>
                <option value="Comic Sans MS">Comic Sans (Fun)</option>
                <option value="monospace">Monospace (Hacker)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={() => { resetTheme(); setLocalTheme(theme); }} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border)', color: '#d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>
            Reset to Default
          </button>
          <button onClick={onClose} style={{ padding: '8px 16px', background: 'var(--theme-primary)', border: 'none', color: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function ColorRow({ label, value, onChange }) {
  return (
    <div style={rowStyle}>
      <span style={{ fontSize: 14 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: '#9ca3af', fontFamily: 'monospace' }}>{value}</span>
        <input 
          type="color" 
          value={value} 
          onChange={(e) => onChange(e.target.value)} 
          style={{ width: 32, height: 32, padding: 0, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'transparent' }} 
        />
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
};
const modalStyle = {
  width: '100%', maxWidth: 440, background: 'var(--theme-chat-bg)', borderRadius: 12, boxShadow: '0 20px 40px rgba(0,0,0,0.6)', border: '1px solid var(--border)', overflow: 'hidden'
};
const sectionTitleStyle = {
  fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.05em'
};
const rowStyle = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--theme-sidebar-bg)', padding: '10px 16px', borderRadius: 8, border: '1px solid var(--border)'
};
const selectStyle = {
  background: 'var(--theme-chat-bg)', color: 'var(--text)', border: '1px solid var(--border)', padding: '6px 10px', borderRadius: 6, outline: 'none', fontSize: 13
};
