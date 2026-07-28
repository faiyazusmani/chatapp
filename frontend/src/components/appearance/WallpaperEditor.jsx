import React, { useState, useRef } from 'react';
import { useAppearance } from '../../context/AppearanceContext';
import api from '../../services/api';

export default function WallpaperEditor() {
  const { appearanceState, setGlobalWallpaper, updateControls, addCustomWallpaper } = useAppearance();
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  const controls = appearanceState.controls || {};

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('File size exceeds 10MB limit!');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg('Only JPG, PNG, WEBP, AVIF, and GIF files are allowed!');
      return;
    }

    setErrorMsg('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const imageUrl = response.data.url || response.data.fileUrl;
      if (imageUrl) {
        addCustomWallpaper({ url: imageUrl, name: file.name });
        setGlobalWallpaper(imageUrl);
      }
    } catch (err) {
      console.error('[WallpaperEditor] Upload failed:', err);
      // Fallback local ObjectURL preview
      const localUrl = URL.createObjectURL(file);
      addCustomWallpaper({ url: localUrl, name: file.name });
      setGlobalWallpaper(localUrl);
    } finally {
      setUploading(false);
    }
  };

  const presetWallpapers = [
    { name: 'Cosmic Nebula', url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=1000' },
    { name: 'Sakura Garden', url: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?q=80&w=1000' },
    { name: 'Rainy Street', url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1000' },
    { name: 'Cyber Neon', url: 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=1000' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Upload Drag & Drop Box */}
      <div
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: '2px dashed #3b82f6',
          borderRadius: 12,
          padding: '16px',
          textAlign: 'center',
          background: 'rgba(59, 130, 246, 0.08)',
          cursor: 'pointer',
        }}
      >
        <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept="image/*" />
        <div style={{ fontSize: 24 }}>🖼️</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#f3f4f6', marginTop: 4 }}>
          {uploading ? '⏳ Uploading Wallpaper...' : 'Click to Upload Custom Wallpaper'}
        </div>
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
          Supports JPG, PNG, WEBP, AVIF (Max 10MB)
        </div>
        {errorMsg && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 6 }}>{errorMsg}</div>}
      </div>

      {/* Preset Curated Wallpapers */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#e5e7eb', marginBottom: 8 }}>Curated Wallpapers</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          <div
            onClick={() => setGlobalWallpaper('')}
            style={{
              height: 50,
              borderRadius: 8,
              background: '#1a1d25',
              border: appearanceState.globalWallpaperUrl === '' ? '2px solid var(--theme-primary)' : '1px solid #2d3241',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              color: '#9ca3af',
              cursor: 'pointer',
            }}
          >
            None
          </div>
          {presetWallpapers.map((wp) => (
            <div
              key={wp.url}
              onClick={() => setGlobalWallpaper(wp.url)}
              style={{
                height: 50,
                borderRadius: 8,
                backgroundImage: `url(${wp.url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                border: appearanceState.globalWallpaperUrl === wp.url ? '2px solid var(--theme-primary)' : '1px solid #2d3241',
                cursor: 'pointer',
              }}
              title={wp.name}
            />
          ))}
        </div>
      </div>

      {/* Controls Sliders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: '#13151c', padding: 12, borderRadius: 12, border: '1px solid #282c37' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#e5e7eb' }}>Wallpaper Adjustments</div>

        {/* Opacity */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af' }}>
          <span>Opacity</span>
          <span>{Math.round((controls.opacity ?? 0.85) * 100)}%</span>
        </div>
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.05"
          value={controls.opacity ?? 0.85}
          onChange={(e) => updateControls({ opacity: parseFloat(e.target.value) })}
        />

        {/* Blur */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af' }}>
          <span>Blur</span>
          <span>{controls.blur ?? 0}px</span>
        </div>
        <input
          type="range"
          min="0"
          max="20"
          step="1"
          value={controls.blur ?? 0}
          onChange={(e) => updateControls({ blur: parseInt(e.target.value, 10) })}
        />

        {/* Brightness */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af' }}>
          <span>Brightness</span>
          <span>{controls.brightness ?? 100}%</span>
        </div>
        <input
          type="range"
          min="30"
          max="150"
          step="5"
          value={controls.brightness ?? 100}
          onChange={(e) => updateControls({ brightness: parseInt(e.target.value, 10) })}
        />

        {/* Scale */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af' }}>
          <span>Zoom / Scale</span>
          <span>{controls.scale ?? 100}%</span>
        </div>
        <input
          type="range"
          min="100"
          max="200"
          step="5"
          value={controls.scale ?? 100}
          onChange={(e) => updateControls({ scale: parseInt(e.target.value, 10) })}
        />

        {/* Fit Mode */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
          <span>Fit Mode</span>
          <select
            value={controls.fitMode ?? 'cover'}
            onChange={(e) => updateControls({ fitMode: e.target.value })}
            style={{ background: '#222530', color: '#fff', border: '1px solid #2d3241', borderRadius: 6, padding: '3px 8px', fontSize: 11 }}
          >
            <option value="cover">Cover</option>
            <option value="contain">Contain</option>
            <option value="fill">Fill Stretch</option>
            <option value="center">Center</option>
          </select>
        </div>
      </div>
    </div>
  );
}
