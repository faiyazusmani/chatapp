import React, { useState } from 'react';
import { useAppearance } from '../../context/AppearanceContext';

export default function SavedThemesManager() {
  const { appearanceState, saveCustomTheme, deleteCustomTheme, setActiveTheme, setGlobalWallpaper, updateControls } = useAppearance();
  const [themeName, setThemeName] = useState('');

  const savedList = appearanceState.savedCustomThemes || [];

  const handleSave = (e) => {
    e.preventDefault();
    if (!themeName.trim()) return;
    saveCustomTheme(themeName.trim());
    setThemeName('');
  };

  const handleApplySaved = (savedTheme) => {
    setActiveTheme(savedTheme.activeThemeId);
    if (savedTheme.globalWallpaperUrl) setGlobalWallpaper(savedTheme.globalWallpaperUrl);
    if (savedTheme.controls) updateControls(savedTheme.controls);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Save Active Theme Form */}
      <form onSubmit={handleSave} style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          placeholder="Enter theme name (e.g. My Neon Setup)..."
          value={themeName}
          onChange={(e) => setThemeName(e.target.value)}
          style={{
            flex: 1,
            background: '#1a1d25',
            border: '1px solid #2d3241',
            borderRadius: 8,
            padding: '8px 12px',
            color: '#fff',
            fontSize: 12,
            outline: 'none',
          }}
        />
        <button
          type="submit"
          style={{
            background: 'var(--theme-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '8px 14px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          💾 Save Current
        </button>
      </form>

      {/* Saved Themes List */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#e5e7eb', marginBottom: 8 }}>
          Saved Personal Themes ({savedList.length})
        </div>
        {savedList.length === 0 ? (
          <div style={{ fontSize: 12, color: '#6b7280', padding: '16px 0', textAlign: 'center', background: '#13151c', borderRadius: 8 }}>
            No saved themes yet. Customize your settings above and click "Save Current"!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {savedList.map((t) => (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#13151c',
                  border: '1px solid #282c37',
                  borderRadius: 8,
                  padding: '8px 12px',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#f3f4f6' }}>{t.name}</div>
                  <div style={{ fontSize: 10, color: '#6b7280' }}>Preset: {t.activeThemeId}</div>
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => handleApplySaved(t)}
                    style={{ background: '#222530', border: '1px solid #2d3241', color: '#38bdf8', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => deleteCustomTheme(t.id)}
                    style={{ background: 'rgba(239, 68, 68, 0.15)', border: 'none', color: '#f87171', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer' }}
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
