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
      <div className="scrollzone" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            style={{
              padding: '5px 12px',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              border: filterCategory === cat ? '1px solid var(--theme-primary)' : '1px solid #2d3241',
              background: filterCategory === cat ? 'var(--theme-primary)' : '#1a1d25',
              color: filterCategory === cat ? '#fff' : '#9ca3af',
              transition: 'all 0.15s ease',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid of Theme Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
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
