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
import '../../styles/gajim/gajim-provided.css';

const TABS = [
  { id: 'themes',     label: 'Themes',     icon: '🎨' },
  { id: 'wallpapers', label: 'Wallpapers', icon: '🖼' },
  { id: 'effects',    label: 'Effects',    icon: '✨' },
  { id: 'animations', label: 'Animations', icon: '⚡' },
  { id: 'sounds',     label: 'Sounds',     icon: '🔊' },
  { id: 'saved',      label: 'Saved',      icon: '💾' },
];

export default function AppearanceStudioModal({ isOpen, onClose, targetRoomId, roomName }) {
  const { appearanceState, setActiveEffect, resetAppearance } = useAppearance();
  const [activeTab, setActiveTab] = useState('themes');
  const [showShareModal, setShowShareModal] = useState(false);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2500, padding: 16,
        }}
        onClick={onClose}
      >
        {/* Modal Card */}
        <div
          className="modal-card"
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: 980,
            height: '90vh', maxHeight: 700,
            borderRadius: 16,
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            padding: 0,
          }}
        >
          {/* ── Header ─────────────────────────────────────────────── */}
          <div className="modal-header" style={{ padding: '14px 20px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button className="btn-icon" onClick={onClose} aria-label="Close" title="Close">
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
                </svg>
              </button>
              <span style={{ fontSize: 22 }}>✨</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-main)' }}>Appearance Studio</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Personalize themes, wallpapers, effects &amp; sounds.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => setShowShareModal(true)}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: 12 }}
              >
                📤 Share
              </button>
              <button
                onClick={resetAppearance}
                className="btn btn-secondary"
                title="Reset to Default"
                style={{ padding: '6px 12px', fontSize: 12 }}
              >
                🔄 Reset
              </button>
              <button className="btn-icon modal-close-btn" onClick={onClose} aria-label="Close">
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          {/* ── Tab Strip ──────────────────────────────────────────── */}
          <div
            className="filter-tabs scrollzone"
            style={{ padding: '0 16px 8px', borderBottom: '1px solid var(--border-color)', gap: 4, flexShrink: 0 }}
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
              >
                <span style={{ marginRight: 4 }}>{tab.icon}</span>{tab.label}
              </button>
            ))}
          </div>

          {/* ── Split Content ───────────────────────────────────────── */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden', gap: 0 }}>

            {/* Controls pane */}
            <div
              className="scrollzone"
              style={{ flex: 1.2, overflowY: 'auto', padding: 16, borderRight: '1px solid var(--border-color)' }}
            >
              {activeTab === 'themes'     && <ThemeGallery />}
              {activeTab === 'wallpapers' && <WallpaperEditor />}
              {activeTab === 'effects'    && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
                  {VISUAL_EFFECTS.map((eff) => (
                    <button
                      key={eff.id}
                      onClick={() => setActiveEffect(eff.id)}
                      style={{
                        padding: 14,
                        borderRadius: 10,
                        background: 'var(--bg-input)',
                        border: appearanceState.activeEffectId === eff.id
                          ? '2px solid var(--color-primary)'
                          : '1px solid var(--border-color)',
                        cursor: 'pointer',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        gap: 6, textAlign: 'center', minHeight: 70,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ fontSize: 26 }}>{eff.icon}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-main)' }}>{eff.name}</span>
                    </button>
                  ))}
                </div>
              )}
              {activeTab === 'animations' && <AnimationControls />}
              {activeTab === 'sounds'     && <SoundControls />}
              {activeTab === 'saved'      && <SavedThemesManager />}
            </div>

            {/* Live Preview pane */}
            <AppearanceLivePreview targetRoomId={targetRoomId} roomName={roomName} />
          </div>
        </div>
      </div>

      {/* Share Modal */}
      <ThemeShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} />
    </>
  );
}

AppearanceStudioModal.propTypes = {
  isOpen:       PropTypes.bool.isRequired,
  onClose:      PropTypes.func.isRequired,
  targetRoomId: PropTypes.string,
  roomName:     PropTypes.string,
};
