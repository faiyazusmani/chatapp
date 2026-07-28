import React, { useState } from 'react';
import { BUILTIN_THEMES } from '../../config/appearanceConfig';
import { useAppearance } from '../../context/AppearanceContext';
import ThemeCard from './ThemeCard';

export default function ThemeGallery() {
  const { appearanceState, setActiveTheme } = useAppearance();
  const [filterCategory, setFilterCategory] = useState('All');

  const categories = ['All', 'Sci-Fi', 'Nature', 'Minimal', 'Tech', 'Cozy', 'Vibrant', 'Seasonal', 'Standard'];

  const filteredThemes = filterCategory === 'All'
    ? BUILTIN_THEMES
    : BUILTIN_THEMES.filter((t) => t.category === filterCategory);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Category Pills */}
      <div className="scrollzone" style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, WebkitOverflowScrolling: 'touch' }}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className="touch-btn"
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: 'var(--font-clamp-small, 11px)',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              border: filterCategory === cat ? '1px solid var(--theme-primary)' : '1px solid #2d3241',
              background: filterCategory === cat ? 'var(--theme-primary)' : '#1a1d25',
              color: filterCategory === cat ? '#fff' : '#9ca3af',
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid of Theme Cards */}
      <div className="responsive-grid-gallery" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
        {filteredThemes.map((themeItem) => (
          <ThemeCard
            key={themeItem.id}
            themeItem={themeItem}
            isActive={appearanceState.activeThemeId === themeItem.id}
            onSelect={setActiveTheme}
          />
        ))}
      </div>
    </div>
  );
}
