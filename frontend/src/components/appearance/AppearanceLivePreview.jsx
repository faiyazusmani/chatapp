import React from 'react';
import PropTypes from 'prop-types';
import { useAppearance } from '../../context/AppearanceContext';
import WallpaperEffectsLayer from './WallpaperEffectsLayer';

export default function AppearanceLivePreview({ targetRoomId, roomName }) {
  const { appearanceState, getActiveWallpaperForRoom } = useAppearance();

  const activeWallpaper = getActiveWallpaperForRoom(targetRoomId);
  const controls = appearanceState.controls || {};

  return (
    <div
      style={{
        flex: 1,
        minWidth: 280,
        height: '100%',
        minHeight: 400,
        background: 'var(--theme-chat-bg)',
        borderRadius: 'var(--theme-radius)',
        border: '1px solid #2d3241',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
      }}
    >
      {/* Dynamic Wallpaper Background Layer */}
      {activeWallpaper && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${activeWallpaper})`,
            backgroundSize: controls.fitMode === 'contain' ? 'contain' : controls.fitMode === 'fill' ? '100% 100%' : 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: controls.opacity ?? 0.85,
            filter: `blur(${controls.blur || 0}px) brightness(${controls.brightness || 100}%) contrast(${controls.contrast || 100}%) saturate(${controls.saturation || 100}%)`,
            transform: `scale(${(controls.scale || 100) / 100})`,
            transformOrigin: 'center center',
            transition: 'all 0.15s ease',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      )}

      {/* Dynamic Overlay */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: controls.overlayColor || '#000000',
          opacity: controls.overlayOpacity ?? 0.2,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* GPU Animated Visual Effects Layer */}
      <WallpaperEffectsLayer />

      {/* Mock Header */}
      <div
        style={{
          height: 48,
          padding: '0 12px',
          background: 'var(--theme-header-bg)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          position: 'relative',
          zIndex: 2,
        }}
      >
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--theme-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>
          {roomName ? roomName.substring(0, 2).toUpperCase() : 'AS'}
        </div>
        <div style={{ flex: 1, fontSize: 12, fontWeight: 700, color: 'var(--theme-header-text, #f3f4f6)' }}>
          {roomName || 'Live Appearance Preview'}
        </div>
      </div>

      {/* Mock Messages Feed */}
      <div
        className="scrollzone"
        style={{
          flex: 1,
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          position: 'relative',
          zIndex: 2,
          overflowY: 'auto',
        }}
      >
        {/* Incoming Message */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#2563eb', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            AL
          </div>
          <div>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--theme-sender-color, #60a5fa)', marginRight: 6 }}>Alex</span>
            <span style={{ fontSize: 9, color: 'var(--theme-text-muted, #9ca3af)' }}>10:42 AM</span>
            <div
              className="msg-bubble msg-bubble-in"
              style={{
                fontSize: 12,
                marginTop: 2,
                padding: '8px 12px',
                borderRadius: 'var(--theme-radius)',
                color: 'var(--theme-msg-in-text, var(--theme-text-color))',
              }}
            >
              Hey! Check out this new custom theme setup 🎨✨
            </div>
          </div>
        </div>

        {/* Outgoing Message */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ fontSize: 9, color: 'var(--theme-text-muted, #9ca3af)', marginBottom: 2 }}>10:43 AM</span>
          <div
            className="msg-bubble msg-bubble-out"
            style={{
              fontSize: 12,
              padding: '8px 12px',
              borderRadius: 'var(--theme-radius)',
              color: 'var(--theme-msg-out-text, #ffffff)',
            }}
          >
            Looks super clean and 60 FPS smooth! 🔥
          </div>
        </div>
      </div>

      {/* Mock Input Bar */}
      <div style={{ padding: 8, background: 'var(--theme-sidebar-bg)', borderTop: '1px solid rgba(255,255,255,0.08)', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--theme-input-bg)', borderRadius: 'var(--theme-radius)', border: '1px solid rgba(255,255,255,0.1)', padding: '4px 10px' }}>
          <span style={{ fontSize: 12 }}>😃</span>
          <input
            readOnly
            value="Type a message..."
            style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--theme-text-muted, #9ca3af)', fontSize: 11, outline: 'none' }}
          />
          <span style={{ fontSize: 12 }}>🚀</span>
        </div>
      </div>
    </div>
  );
}

AppearanceLivePreview.propTypes = {
  targetRoomId: PropTypes.string,
  roomName: PropTypes.string,
};
