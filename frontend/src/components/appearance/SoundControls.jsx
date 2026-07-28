import React from 'react';
import { useAppearance } from '../../context/AppearanceContext';
import { themeSoundManager } from '../../utils/themeSoundManager';

export default function SoundControls() {
  const { appearanceState, updateSoundControls } = useAppearance();

  const snd = appearanceState.soundControls || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, background: '#13151c', padding: 14, borderRadius: 12, border: '1px solid #282c37' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#f3f4f6' }}>🔊 Theme Sound Effects</div>

      {/* Main Enable Sounds Toggle */}
      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#e5e7eb', cursor: 'pointer' }}>
        <span style={{ fontWeight: 600 }}>Enable UI Sounds</span>
        <input
          type="checkbox"
          checked={!!snd.enableSounds}
          onChange={(e) => updateSoundControls({ enableSounds: e.target.checked })}
          style={{ width: 16, height: 16, accentColor: 'var(--theme-primary)' }}
        />
      </label>

      {/* Sub-toggles & sound tests */}
      <div style={{ opacity: snd.enableSounds ? 1 : 0.4, pointerEvents: snd.enableSounds ? 'auto' : 'none', display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 8, borderTop: '1px solid #222530' }}>
        {/* Sent Sound */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#9ca3af' }}>
          <span>Message Sent Sound</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => themeSoundManager.playSentSound()}
              style={{ background: '#222530', border: '1px solid #2d3241', color: '#38bdf8', borderRadius: 4, padding: '2px 8px', fontSize: 10, cursor: 'pointer' }}
            >
              ▶ Test
            </button>
            <input
              type="checkbox"
              checked={!!snd.enableSentSound}
              onChange={(e) => updateSoundControls({ enableSentSound: e.target.checked })}
              style={{ width: 15, height: 15 }}
            />
          </div>
        </div>

        {/* Typing Sound */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#9ca3af' }}>
          <span>Typing Tick Sound</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => themeSoundManager.playTypingSound()}
              style={{ background: '#222530', border: '1px solid #2d3241', color: '#38bdf8', borderRadius: 4, padding: '2px 8px', fontSize: 10, cursor: 'pointer' }}
            >
              ▶ Test
            </button>
            <input
              type="checkbox"
              checked={!!snd.enableTypingSound}
              onChange={(e) => updateSoundControls({ enableTypingSound: e.target.checked })}
              style={{ width: 15, height: 15 }}
            />
          </div>
        </div>

        {/* Notification Sound */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#9ca3af' }}>
          <span>Notification Chime</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => themeSoundManager.playNotificationSound()}
              style={{ background: '#222530', border: '1px solid #2d3241', color: '#38bdf8', borderRadius: 4, padding: '2px 8px', fontSize: 10, cursor: 'pointer' }}
            >
              ▶ Test
            </button>
            <input
              type="checkbox"
              checked={!!snd.enableNotificationSound}
              onChange={(e) => updateSoundControls({ enableNotificationSound: e.target.checked })}
              style={{ width: 15, height: 15 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
