import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useAppearance } from '../../context/AppearanceContext';
import { exportThemeToJSON, parseThemeJSON, generateThemeShareLink, drawQRCodeOnCanvas } from '../../utils/themeShareUtils';

export default function ThemeShareModal({ isOpen, onClose }) {
  const { appearanceState, setActiveTheme, setActiveEffect, setGlobalWallpaper, updateControls } = useAppearance();
  const [importJson, setImportJson] = useState('');
  const [copied, setCopied] = useState(false);
  const [importError, setImportError] = useState('');
  const qrCanvasRef = useRef(null);

  const themeJson = exportThemeToJSON(appearanceState);
  const shareLink = generateThemeShareLink(appearanceState);

  useEffect(() => {
    if (isOpen && qrCanvasRef.current) {
      drawQRCodeOnCanvas(qrCanvasRef.current, shareLink);
    }
  }, [isOpen, shareLink]);

  if (!isOpen) return null;

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(themeJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImport = (e) => {
    e.preventDefault();
    setImportError('');
    const parsed = parseThemeJSON(importJson);
    if (!parsed) {
      setImportError('Invalid Theme JSON string!');
      return;
    }

    setActiveTheme(parsed.activeThemeId);
    if (parsed.activeEffectId) setActiveEffect(parsed.activeEffectId);
    if (parsed.globalWallpaperUrl) setGlobalWallpaper(parsed.globalWallpaperUrl);
    if (parsed.controls) updateControls(parsed.controls);

    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3000,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
          background: '#161921',
          border: '1px solid #2d3241',
          borderRadius: 16,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>📤</span> Export & Import Theme
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#9ca3af', fontSize: 18, cursor: 'pointer' }}>
            &times;
          </button>
        </div>

        {/* QR Code Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#101218', padding: 12, borderRadius: 12, border: '1px solid #222530' }}>
          <canvas ref={qrCanvasRef} style={{ width: 100, height: 100, borderRadius: 8, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f3f4f6' }}>Scan QR Code</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
              Share this theme visually with another mobile or desktop user.
            </div>
            <button
              onClick={handleCopyJSON}
              style={{
                marginTop: 8,
                background: 'var(--theme-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {copied ? '✓ Copied Theme JSON!' : 'Copy Theme JSON'}
            </button>
          </div>
        </div>

        {/* Import Section */}
        <form onSubmit={handleImport} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#e5e7eb' }}>Import Theme JSON</div>
          <textarea
            rows={3}
            placeholder="Paste theme JSON payload string here..."
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
            style={{
              width: '100%',
              background: '#0d0e11',
              border: '1px solid #2d3241',
              borderRadius: 8,
              padding: 8,
              color: '#4ade80',
              fontFamily: 'monospace',
              fontSize: 11,
              outline: 'none',
            }}
          />
          {importError && <div style={{ fontSize: 11, color: '#ef4444' }}>{importError}</div>}

          <button
            type="submit"
            style={{
              background: '#22c55e',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            📥 Import & Apply Theme
          </button>
        </form>
      </div>
    </div>
  );
}

ThemeShareModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};
