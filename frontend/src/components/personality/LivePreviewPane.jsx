
import { useWallpaper } from '../../context/WallpaperContext';

export default function LivePreviewPane() {
  const { activePersonality, personalityState, getActiveWallpaperForRoom } = useWallpaper();
  const theme = activePersonality?.theme || {};
  const wallpaperUrl = getActiveWallpaperForRoom();
  const controls = personalityState.controls || {};

  return (
    <div
      style={{
        position: 'relative',
        height: 280,
        borderRadius: 16,
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        backgroundColor: theme.chatBg || '#181a20',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
      }}
    >
      {/* Dynamic Background Image Layer */}
      {wallpaperUrl && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${wallpaperUrl})`,
            backgroundSize: controls.fitMode === 'contain' ? 'contain' : controls.fitMode === 'fill' ? '100% 100%' : 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: controls.opacity ?? 0.85,
            filter: `blur(${controls.blur || 0}px) brightness(${controls.brightness || 100}%) contrast(${controls.contrast || 100}%) saturate(${controls.saturation || 100}%)`,
            transform: `scale(${ (controls.scale || 100) / 100 })`,
            transformOrigin: 'center center',
            transition: 'all 0.15s ease',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Overlay Layer */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: controls.overlayColor || '#000000',
          opacity: controls.overlayOpacity ?? 0.2,
          pointerEvents: 'none',
        }}
      />

      {/* Header */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          padding: '10px 14px',
          background: theme.headerBg || theme.sidebarBg || 'rgba(15, 23, 42, 0.8)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span style={{ fontSize: 18 }}>{activePersonality?.icon || '💬'}</span>
        <div>
          <div style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{activePersonality?.name || 'Live Preview'}</div>
          <div style={{ color: theme.primaryColor, fontSize: 10, fontWeight: 500 }}>Live Chat Personality Studio</div>
        </div>
      </div>

      {/* Message Stream */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          flex: 1,
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          overflowY: 'auto',
          fontFamily: theme.fontFamily,
        }}
      >
        {/* Incoming Bubble */}
        <div style={{ alignSelf: 'flex-start', maxWidth: '80%' }}>
          <div
            style={{
              background: theme.msgIncomingBg,
              color: theme.msgIncomingText || '#e2e8f0',
              borderRadius: theme.borderRadius,
              padding: '8px 12px',
              fontSize: 12,
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}
          >
            Hey! Check out this new chat personality ✨
          </div>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', marginTop: 2, display: 'block', marginLeft: 4 }}>
            10:42 AM
          </span>
        </div>

        {/* Outgoing Bubble */}
        <div style={{ alignSelf: 'flex-end', maxWidth: '80%' }}>
          <div
            style={{
              background: theme.msgOutgoingBg,
              color: theme.msgOutgoingText || '#ffffff',
              borderRadius: theme.borderRadius,
              padding: '8px 12px',
              fontSize: 12,
              boxShadow: theme.accentGlow ? theme.accentGlow : '0 2px 8px rgba(0,0,0,0.2)',
            }}
          >
            Wow, this looks incredible! Zero refresh instant preview 🔥
          </div>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', marginTop: 2, display: 'block', textAlign: 'right', marginRight: 4 }}>
            10:43 AM ✓✓
          </span>
        </div>
      </div>

      {/* Input Mock */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          padding: 8,
          background: theme.headerBg || theme.sidebarBg || 'rgba(15, 23, 42, 0.8)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          gap: 8,
        }}
      >
        <input
          disabled
          placeholder="Type a message..."
          style={{
            flex: 1,
            background: theme.inputBg || '#222530',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
            padding: '6px 12px',
            borderRadius: theme.borderRadius,
            fontSize: 11,
          }}
        />
        <button
          style={{
            background: theme.primaryColor,
            color: '#fff',
            border: 'none',
            borderRadius: theme.borderRadius,
            padding: '6px 12px',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'default',
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
