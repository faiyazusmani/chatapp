import { useState, useRef } from 'react';
import api from '../../services/api';
import { useWallpaper } from '../../context/WallpaperContext';

export default function WallpaperUploader({ onUploaded }) {
  const { addCustomWallpaper, setGlobalWallpaper } = useWallpaper();

  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const fileInputRef = useRef(null);

  const handleFileSelect = async (file) => {
    if (!file) return;

    // Check size limit: 10MB
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setErrorMsg('File size exceeds 10MB limit.');
      return;
    }

    // Supported formats: JPG, PNG, WEBP, AVIF, GIF, Animated WebP
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif',
      'image/gif',
    ];
    if (!allowedTypes.includes(file.type)) {
      setErrorMsg('Invalid file format. Please upload JPG, PNG, WEBP, AVIF, or GIF.');
      return;
    }

    setErrorMsg(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const imageUrl = uploadRes.data.url;

      const newItem = addCustomWallpaper({
        url: imageUrl,
        name: file.name.replace(/\.[^/.]+$/, ''),
        collectionName: 'Custom',
      });

      // Automatically apply as global wallpaper
      setGlobalWallpaper(imageUrl);

      if (onUploaded) onUploaded(newItem);
    } catch (err) {
      console.error('[WallpaperUploader] Upload failed:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to upload wallpaper.');
    } finally {
      setUploading(false);
    }
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const onDragLeave = () => {
    setIsDragOver(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: isDragOver ? '2px dashed var(--theme-primary, #7c3aed)' : '2px dashed rgba(255, 255, 255, 0.2)',
          backgroundColor: isDragOver ? 'rgba(124, 58, 237, 0.1)' : 'rgba(255, 255, 255, 0.03)',
          borderRadius: 14,
          padding: '24px 16px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          style={{ display: 'none' }}
        />

        <div style={{ fontSize: 32, marginBottom: 8 }}>🖼️</div>
        <p style={{ margin: 0, fontWeight: 600, color: '#f8fafc', fontSize: 14 }}>
          {uploading ? 'Compressing & Uploading...' : 'Click or Drag & Drop Wallpaper'}
        </p>
        <span style={{ fontSize: 12, color: '#94a3b8', marginTop: 4, display: 'block' }}>
          Supports JPG, PNG, WEBP, AVIF, GIF (Max 10 MB)
        </span>
      </div>

      {errorMsg && (
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
            padding: '8px 12px',
            borderRadius: 8,
            fontSize: 12,
          }}
        >
          ⚠️ {errorMsg}
        </div>
      )}
    </div>
  );
}
