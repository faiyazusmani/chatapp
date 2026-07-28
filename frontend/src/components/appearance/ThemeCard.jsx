import React from 'react';
import PropTypes from 'prop-types';

export default function ThemeCard({ themeItem, isActive, onSelect }) {
  const { id, name, icon, category, theme } = themeItem;

  return (
    <div
      onClick={() => onSelect(id)}
      style={{
        background: theme.chatBg,
        border: isActive ? `2px solid ${theme.primaryColor}` : '1px solid #2d3241',
        borderRadius: theme.borderRadius || '12px',
        padding: '12px',
        cursor: 'pointer',
        position: 'relative',
        transition: 'all 0.2s ease',
        boxShadow: isActive ? `0 0 16px ${theme.primaryColor}40` : '0 4px 12px rgba(0,0,0,0.2)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {/* Category Badge & Active Check */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: theme.isLight ? '#475569' : '#9ca3af', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5 }}>
          {category}
        </span>
        {isActive && (
          <span style={{ background: theme.primaryColor, color: '#fff', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>
            ✓
          </span>
        )}
      </div>

      {/* Title & Icon */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: theme.isLight ? '#0f172a' : '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {name}
        </span>
      </div>

      {/* Mini Color Palette Swatches */}
      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
        <span style={{ width: 14, height: 14, borderRadius: '50%', background: theme.primaryColor, border: '1px solid rgba(255,255,255,0.2)' }} title="Primary" />
        <span style={{ width: 14, height: 14, borderRadius: '50%', background: theme.msgIncomingBg, border: '1px solid rgba(255,255,255,0.2)' }} title="Incoming" />
        <span style={{ width: 14, height: 14, borderRadius: '50%', background: theme.msgOutgoingBg, border: '1px solid rgba(255,255,255,0.2)' }} title="Outgoing" />
        <span style={{ width: 14, height: 14, borderRadius: '50%', background: theme.chatBg, border: '1px solid rgba(255,255,255,0.2)' }} title="Background" />
      </div>
    </div>
  );
}

ThemeCard.propTypes = {
  themeItem: PropTypes.object.isRequired,
  isActive: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
};
