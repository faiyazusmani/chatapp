import React from 'react';
import { useAppearance } from '../../context/AppearanceContext';

export default function AnimationControls() {
  const { appearanceState, updateAnimationControls } = useAppearance();

  const anim = appearanceState.animationControls || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, background: '#13151c', padding: 14, borderRadius: 12, border: '1px solid #282c37' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#f3f4f6' }}>⚡ Animation & Performance Controls</div>

      {/* Speed Slider */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af' }}>
          <span>Animation Speed</span>
          <span>{anim.speed ?? 1}x</span>
        </div>
        <input
          type="range"
          min="0.2"
          max="3"
          step="0.2"
          value={anim.speed ?? 1}
          onChange={(e) => updateAnimationControls({ speed: parseFloat(e.target.value) })}
        />
      </div>

      {/* Density Slider */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af' }}>
          <span>Particle Density</span>
          <span>{Math.round((anim.density ?? 1) * 100)}%</span>
        </div>
        <input
          type="range"
          min="0.2"
          max="2"
          step="0.1"
          value={anim.density ?? 1}
          onChange={(e) => updateAnimationControls({ density: parseFloat(e.target.value) })}
        />
      </div>

      {/* Battery Saver Toggle */}
      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#e5e7eb', cursor: 'pointer', paddingTop: 6, borderTop: '1px solid #222530' }}>
        <span>🔋 Battery Saver Mode</span>
        <input
          type="checkbox"
          checked={!!anim.batterySaver}
          onChange={(e) => updateAnimationControls({ batterySaver: e.target.checked })}
          style={{ width: 16, height: 16, accentColor: 'var(--theme-primary)' }}
        />
      </label>
      <div style={{ fontSize: 11, color: '#6b7280', marginTop: -8 }}>
        Reduces particle refresh rate and limits canvas draw calls.
      </div>

      {/* Reduce Motion Toggle */}
      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#e5e7eb', cursor: 'pointer', paddingTop: 6, borderTop: '1px solid #222530' }}>
        <span>♿ Reduce Motion Mode</span>
        <input
          type="checkbox"
          checked={!!anim.reduceMotion}
          onChange={(e) => updateAnimationControls({ reduceMotion: e.target.checked })}
          style={{ width: 16, height: 16, accentColor: 'var(--theme-primary)' }}
        />
      </label>
      <div style={{ fontSize: 11, color: '#6b7280', marginTop: -8 }}>
        Disables ambient canvas particles for accessibility compliance.
      </div>
    </div>
  );
}
