import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useAppearance } from '../../context/AppearanceContext';
import { VISUAL_EFFECTS } from '../../config/appearanceConfig';
import ThemeGallery from './ThemeGallery';
import WallpaperEditor from './WallpaperEditor';
import AnimationControls from './AnimationControls';
import SoundControls from './SoundControls';
import SavedThemesManager from './SavedThemesManager';
import ThemeShareModal from './ThemeShareModal';
import AppearanceLivePreview from './AppearanceLivePreview';

export default function AppearanceStudioModal({ isOpen, onClose, targetRoomId, roomName }) {
  const { appearanceState, setActiveEffect, resetAppearance } = useAppearance();
  const [activeTab, setActiveTab] = useState('themes');
  const [showShareModal, setShowShareModal] = useState(false);

  if (!isOpen) return null;

  const tabs = [
    { id: 'themes', label: '🎨 Themes' },
    { id: 'wallpapers', label: '🖼 Wallpapers' },
    { id: 'effects', label: '✨ Effects' },
    { id: 'animations', label: '⚡ Animations' },
    { id: 'sounds', label: '🔊 Sounds' },
    { id: 'saved', label: '💾 Saved' },
  ];

  return (
    <>
      <div
        className="appearance-studio-backdrop"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2500,
          padding: 16,
        }}
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="appearance-studio-modal"
          style={{
            width: '100%',
            maxWidth: 960,
            height: '90vh',
            maxHeight: 680,
            background: '#161921',
            border: '1px solid #2d3241',
            borderRadius: 20,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
          }}
        >
          {/* Header Bar */}
          <div
            className="studio-header"
            style={{
              padding: '14px 20px',
              borderBottom: '1px solid #282c37',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#13151c',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={onClose}
                className="touch-btn"
                title="Back"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#38bdf8',
                  fontSize: 18,
                  cursor: 'pointer',
                  fontWeight: 700,
                  padding: '0 8px',
                }}
              >
                ❮
              </button>
              <span style={{ fontSize: 20 }}>✨</span>
              <div>
                <div style={{ fontSize: 'var(--font-clamp-title, 16px)', fontWeight: 800, color: '#fff', letterSpacing: 0.3 }}>
                  Appearance Studio
                </div>
                <div style={{ fontSize: 'var(--font-clamp-small, 11px)', color: '#9ca3af' }}>
                  Personalize themes, wallpapers, 60 FPS effects & sounds for your UI only.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => setShowShareModal(true)}
                className="touch-btn"
                style={{
                  background: '#222530',
                  border: '1px solid #2d3241',
                  color: '#38bdf8',
                  borderRadius: 8,
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                📤 Share
              </button>
              <button
                onClick={resetAppearance}
                className="touch-btn"
                title="Reset to Default Appearance"
                style={{
                  background: 'transparent',
                  border: '1px solid #3f4657',
                  color: '#9ca3af',
                  borderRadius: 8,
                  padding: '6px 12px',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                🔄 Reset
              </button>
              <button
                onClick={onClose}
                className="touch-btn"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#9ca3af',
                  fontSize: 22,
                  cursor: 'pointer',
                  padding: '0 8px',
                }}
              >
                &times;
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div
            className="scrollzone studio-tabs"
            style={{
              display: 'flex',
              gap: 6,
              padding: '8px 16px',
              background: '#101218',
              borderBottom: '1px solid #282c37',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="touch-btn"
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontSize: 'var(--font-clamp-body, 12px)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  background: activeTab === tab.id ? 'var(--theme-primary)' : 'transparent',
                  color: activeTab === tab.id ? '#fff' : '#9ca3af',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Main Content Area (Split View / Mobile Stacked) */}
          <div className="studio-content-layout" style={{ flex: 1, display: 'flex', overflow: 'hidden', padding: 16, gap: 16 }}>
            {/* Controls Pane */}
            <div className="scrollzone" style={{ flex: 1.2, overflowY: 'auto', paddingRight: 4 }}>
              {activeTab === 'themes' && <ThemeGallery />}
              {activeTab === 'wallpapers' && <WallpaperEditor />}
              {activeTab === 'effects' && (
                <div className="responsive-grid-gallery" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
                  {VISUAL_EFFECTS.map((eff) => (
                    <div
                      key={eff.id}
                      onClick={() => setActiveEffect(eff.id)}
                      className="touch-btn"
                      style={{
                        padding: 12,
                        borderRadius: 10,
                        background: '#13151c',
                        border: appearanceState.activeEffectId === eff.id ? '2px solid var(--theme-primary)' : '1px solid #282c37',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        textAlign: 'center',
                        minHeight: 64,
                      }}
                    >
                      <span style={{ fontSize: 24 }}>{eff.icon}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#f3f4f6' }}>{eff.name}</span>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 'animations' && <AnimationControls />}
              {activeTab === 'sounds' && <SoundControls />}
              {activeTab === 'saved' && <SavedThemesManager />}
            </div>

            {/* Right Live Preview Pane */}
            <AppearanceLivePreview targetRoomId={targetRoomId} roomName={roomName} />
          </div>
        </div>
      </div>

      {/* Share / QR Modal */}
      <ThemeShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} />
    </>
  );
}

AppearanceStudioModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  targetRoomId: PropTypes.string,
  roomName: PropTypes.string,
};
