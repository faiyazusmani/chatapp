import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import api from '../../services/api';
import { animateModalEnter } from '../../utils/animations';

export default function CreateStatusModal({ isOpen, onClose, onStatusCreated }) {
  const cardRef = useRef(null);
  const fileInputRef = useRef(null);

  const [mediaType, setMediaType] = useState('image'); // 'image' | 'video'
  const [mediaUrl, setMediaUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen && cardRef.current) {
      animateModalEnter(cardRef.current);
    }
    if (!isOpen) {
      setMediaUrl('');
      setCaption('');
      setErrorMsg('');
      setUploading(false);
      setSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');
    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|mkv)$/i.test(file.name);
    const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif)$/i.test(file.name);

    if (!isVideo && !isImage) {
      setErrorMsg('Only personal photos and videos can be uploaded as status.');
      e.target.value = null;
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setErrorMsg('File size exceeds 25MB limit. Please choose a smaller photo or video.');
      e.target.value = null;
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data?.url) {
        setMediaUrl(res.data.url);
        setMediaType(isVideo ? 'video' : 'image');
      }
    } catch (err) {
      console.error('[Upload Status Error]', err);
      const msg = err.response?.data?.message || 'Failed to upload photo/video. Please try again.';
      setErrorMsg(msg);
    } finally {
      setUploading(false);
      e.target.value = null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mediaUrl) {
      setErrorMsg('Please select a photo or video to share on your status.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const payload = {
        type: mediaType,
        mediaUrl,
        content: caption.trim()
      };

      const res = await api.post('/status', payload);
      if (typeof onStatusCreated === 'function') {
        onStatusCreated(res.data);
      }
      onClose();
    } catch (err) {
      console.error('[Create Status Error]', err);
      const msg = err.response?.data?.message || 'Could not post status';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 9, 18, 0.88)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
    >
      <div
        className="modal-card"
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 460,
          background: '#0e1626',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 22,
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.75)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
          color: '#f8fafc'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(0, 0, 0, 0.25)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>🟢</span>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fff' }}>
                Post Photo or Video Status
              </h3>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                Personal media visible to contacts for 24 hours
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.06)',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: 20, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {errorMsg && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#fca5a5',
                  fontSize: 12.5
                }}
              >
                ⚠️ {errorMsg}
              </div>
            )}

            {/* Media Canvas & Upload Area */}
            <div
              style={{
                width: '100%',
                height: 270,
                borderRadius: 16,
                background: '#040711',
                border: mediaUrl ? '1px solid rgba(34, 197, 94, 0.4)' : '1.5px dashed rgba(255, 255, 255, 0.2)',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}
            >
              {uploading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: '#34d399' }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      border: '3px solid rgba(255,255,255,0.2)',
                      borderTopColor: '#10b981',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite'
                    }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Uploading your media...</span>
                </div>
              ) : mediaUrl ? (
                <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {mediaType === 'video' ? (
                    <video
                      src={mediaUrl}
                      controls
                      playsInline
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <img
                      src={mediaUrl}
                      alt="Status Media Preview"
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  )}

                  {/* Media Type Badge */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 10,
                      left: 10,
                      padding: '4px 10px',
                      borderRadius: 14,
                      background: 'rgba(0, 0, 0, 0.7)',
                      backdropFilter: 'blur(6px)',
                      color: '#4ade80',
                      fontSize: 11,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <span>{mediaType === 'video' ? '🎥 Video' : '📷 Photo'}</span>
                  </div>

                  {/* Change Media Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      padding: '6px 12px',
                      borderRadius: 20,
                      background: 'rgba(0, 0, 0, 0.75)',
                      backdropFilter: 'blur(6px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: '#fff',
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Change Media 🔄
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                    cursor: 'pointer',
                    padding: 24,
                    textAlign: 'center',
                    width: '100%',
                    height: '100%'
                  }}
                >
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: '50%',
                      background: 'rgba(34, 197, 94, 0.14)',
                      border: '1px solid rgba(34, 197, 94, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 28
                    }}
                  >
                    📸
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>
                      Upload Personal Photo or Video
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                      Select an image (JPG, PNG, WEBP) or video (MP4, WEBM)
                    </div>
                  </div>
                  <button
                    type="button"
                    style={{
                      marginTop: 4,
                      padding: '8px 18px',
                      borderRadius: 10,
                      background: 'rgba(34, 197, 94, 0.2)',
                      color: '#4ade80',
                      border: '1px solid rgba(34, 197, 94, 0.4)',
                      fontSize: 12.5,
                      fontWeight: 600,
                      pointerEvents: 'none'
                    }}
                  >
                    + Choose from Device
                  </button>
                </div>
              )}

              {/* Hidden file input supporting both images and videos */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*,video/*"
                style={{ display: 'none' }}
              />
            </div>

            {/* Caption Input */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: 6
                }}
              >
                Add Caption (Optional):
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a caption for your photo or video..."
                rows={2}
                maxLength={300}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'rgba(0, 0, 0, 0.35)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 10,
                  color: '#fff',
                  fontSize: 13.5,
                  resize: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div
            style={{
              padding: '14px 20px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(0, 0, 0, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                fontSize: 13,
                color: '#94a3b8',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting || uploading || !mediaUrl}
              style={{
                padding: '10px 22px',
                fontSize: 13.5,
                fontWeight: 700,
                color: '#fff',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                borderRadius: 10,
                cursor: submitting || uploading || !mediaUrl ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                opacity: submitting || uploading || !mediaUrl ? 0.6 : 1
              }}
            >
              {submitting ? 'Sharing...' : 'Share to Status 🚀'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

CreateStatusModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onStatusCreated: PropTypes.func
};
