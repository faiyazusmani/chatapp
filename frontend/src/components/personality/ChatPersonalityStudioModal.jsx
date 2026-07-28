import React, { useState } from 'react';
import { useWallpaper } from '../../context/WallpaperContext';
import { CHAT_PERSONALITIES } from '../../utils/chatPersonalities';
import WallpaperControls from './WallpaperControls';
import WallpaperUploader from './WallpaperUploader';
import WallpaperGallery from './WallpaperGallery';
import LivePreviewPane from './LivePreviewPane';

export default function ChatPersonalityStudioModal({ isOpen, onClose, targetRoomId, roomName }) {
  const { personalityState, setActivePersonality } = useWallpaper();
  const [activeTab, setActiveTab] = useState('personalities'); // 'personalities' | 'wallpapers' | 'controls'

  if (!isOpen) return null;

  return (
    <div
      style={overlayStyle}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="personality-studio-modal modal-box" style={modalStyle}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, color: '#f8fafc', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              ✨ Chat Personality Studio
            </h3>
            <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: 12 }}>
              {targetRoomId ? `Personalizing wallpaper for "${roomName || 'this chat'}"` : 'Customize your global chat theme & appearance'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              color: '#cbd5e1',
              width: 32,
              height: 32,
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: 16,
            }}
          >
            ✖
          </button>
        </div>

        {/* Modal Layout: Split View (Left Controls, Right Live Preview) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, flex: 1, minHeight: 0 }}>
          {/* Left Panel: Tabs & Settings */}
          <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', paddingRight: 6 }}>
            {/* Primary Studio Tabs */}
            <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 10, marginBottom: 16 }}>
              {[
                { id: 'personalities', label: '🎭 Personalities' },
                { id: 'wallpapers', label: '🖼 Wallpapers' },
                { id: 'controls', label: '🎛 Visual Controls' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    background: activeTab === tab.id ? 'var(--theme-primary, #7c3aed)' : 'rgba(255,255,255,0.05)',
                    color: activeTab === tab.id ? '#fff' : '#94a3b8',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 10,
                    padding: '8px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab 1: Personalities (Presets) */}
            {activeTab === 'personalities' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12 }}>
                {CHAT_PERSONALITIES.map((p) => {
                  const isSelected = personalityState.activePersonalityId === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setActivePersonality(p.id)}
                      style={{
                        background: p.theme.sidebarBg || '#1e293b',
                        border: isSelected ? '2px solid var(--theme-primary, #7c3aed)' : '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 12,
                        padding: 12,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 8,
                        boxShadow: isSelected ? '0 0 14px var(--theme-primary, #7c3aed)' : 'none',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <span style={{ fontSize: 28 }}>{p.icon}</span>
                      <span style={{ color: '#fff', fontSize: 12, fontWeight: 600, textAlign: 'center' }}>{p.name}</span>
                      <span style={{ fontSize: 10, color: '#94a3b8' }}>{p.category}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tab 2: Wallpapers (Gallery + Uploader) */}
            {activeTab === 'wallpapers' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <WallpaperUploader />
                <WallpaperGallery targetRoomId={targetRoomId} />
              </div>
            )}

            {/* Tab 3: Visual Controls */}
            {activeTab === 'controls' && <WallpaperControls />}
          </div>

          {/* Right Panel: Live Preview Pane */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h4 style={{ margin: 0, fontSize: 14, color: '#94a3b8' }}>👁 Live Preview (Zero Refresh)</h4>
            <LivePreviewPane />
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 10, fontSize: 11, color: '#94a3b8', lineHeight: 1.4 }}>
              💡 All changes update instantly on your screen and are saved automatically to your profile in MongoDB.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.75)',
  backdropFilter: 'blur(8px)',
  zIndex: 1100,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
};

const modalStyle = {
  backgroundColor: '#111319',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: 20,
  width: '100%',
  maxWidth: 860,
  maxHeight: '85vh',
  display: 'flex',
  flexDirection: 'column',
  padding: 24,
  boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
};
