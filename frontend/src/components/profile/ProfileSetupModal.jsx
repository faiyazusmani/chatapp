import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import api from '../../services/api';
import { socket } from '../../services/socket';
import { useAuth } from '../../context/useAuth';
import ImageCropperModal from './ImageCropperModal';
import { animateModalEnter } from '../../utils/animations';

// Curated avatar presets from popular DiceBear collections
const AVATAR_PRESETS = [
  { id: 'bot-1', label: 'Bot Neon', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=NeonSpark' },
  { id: 'bot-2', label: 'Bot Cyber', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=CyberByte' },
  { id: 'adv-1', label: 'Adventurer Alex', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Alex' },
  { id: 'adv-2', label: 'Adventurer Jordan', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Jordan' },
  { id: 'fun-1', label: 'Cool Star', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=CoolStar' },
  { id: 'fun-2', label: 'Happy Cloud', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=HappyCloud' },
  { id: 'notion-1', label: 'Minimalist Zoe', url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Zoe' },
  { id: 'lorelei-1', label: 'Anime Breeze', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Breeze' },
];

export default function ProfileSetupModal({ isOpen, onClose, onComplete }) {
  const { user, updateLocalUser } = useAuth();
  const cardRef = useRef(null);
  const fileInputRef = useRef(null);
  const statusFileInputRef = useRef(null);

  // Form State
  const [avatar, setAvatar] = useState(user?.avatar || AVATAR_PRESETS[0].url);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [bio, setBio] = useState(user?.bio || '');

  // Photo / Video Status State (Strictly personal media only)
  const [statusMediaUrl, setStatusMediaUrl] = useState('');
  const [statusMediaType, setStatusMediaType] = useState('image'); // 'image' | 'video'
  const [statusCaption, setStatusCaption] = useState('');
  const [statusUploading, setStatusUploading] = useState(false);
  const [statusPosted, setStatusPosted] = useState(false);

  // Upload & Cropping State
  const [imageToCrop, setImageToCrop] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('photo'); // 'photo' | 'details' | 'status'

  // Initialize values when modal opens or user updates
  useEffect(() => {
    if (user) {
      if (user.avatar) setAvatar(user.avatar);
      if (user.fullName) setFullName(user.fullName);
      if (user.bio) setBio(user.bio);
    }
  }, [user, isOpen]);

  // Modal animation
  useEffect(() => {
    if (isOpen && cardRef.current) {
      animateModalEnter(cardRef.current);
    }
  }, [isOpen]);

  // Lock body scroll and Escape key
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleSkip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Generate random avatar
  const handleRandomAvatar = () => {
    const randomSeed = Math.random().toString(36).substring(2, 9);
    const collections = ['bottts', 'adventurer', 'fun-emoji', 'lorelei', 'notionists'];
    const selectedCollection = collections[Math.floor(Math.random() * collections.length)];
    setAvatar(`https://api.dicebear.com/7.x/${selectedCollection}/svg?seed=${randomSeed}`);
  };

  // Profile avatar upload
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.addEventListener('load', () => setImageToCrop(reader.result));
      reader.readAsDataURL(file);
    }
    e.target.value = null;
  };

  const handleCropComplete = async (croppedBlob) => {
    setImageToCrop(null);
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', croppedBlob, 'avatar.jpg');

      const uploadRes = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (uploadRes.data?.url) {
        setAvatar(uploadRes.data.url);
      }
    } catch (err) {
      console.error('[Upload Error]', err);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  // Status Media Upload (Personal Photo or Video)
  const handleStatusMediaUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|mkv)$/i.test(file.name);
    const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif)$/i.test(file.name);

    if (!isVideo && !isImage) {
      alert('Only personal photos and videos can be uploaded to status.');
      e.target.value = null;
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      alert('File size exceeds 25MB limit. Please choose a smaller photo or video.');
      e.target.value = null;
      return;
    }

    setStatusUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data?.url) {
        setStatusMediaUrl(res.data.url);
        setStatusMediaType(isVideo ? 'video' : 'image');
      }
    } catch (err) {
      console.error('[Status Upload Error]', err);
      alert('Failed to upload status media. Please try again.');
    } finally {
      setStatusUploading(false);
      e.target.value = null;
    }
  };

  // Post the status story right away
  const handlePostStatusStory = async () => {
    if (!statusMediaUrl) {
      alert('Please select a personal photo or video first.');
      return;
    }

    try {
      await api.post('/status', {
        type: statusMediaType,
        mediaUrl: statusMediaUrl,
        content: statusCaption.trim()
      });
      setStatusPosted(true);
    } catch (err) {
      console.error('[Post Status Error]', err);
      alert('Could not post status: ' + (err.response?.data?.message || err.message));
    }
  };

  // Submit profile setup
  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);

    try {
      // If a status media was uploaded and not yet posted, post it now
      if (statusMediaUrl && !statusPosted) {
        try {
          await api.post('/status', {
            type: statusMediaType,
            mediaUrl: statusMediaUrl,
            content: statusCaption.trim()
          });
          setStatusPosted(true);
        } catch (statusErr) {
          console.warn('[Status Post Error in Setup]', statusErr);
        }
      }

      const payload = {
        avatar,
        fullName: fullName.trim(),
        bio: bio.trim(),
        isProfileSetupCompleted: true
      };

      // 1. Save to backend
      const res = await api.put('/users/profile', payload);

      // 2. Update local auth context
      updateLocalUser(res.data);

      // 3. Mark setup as done in localStorage so it doesn't prompt again
      const uid = user?._id || user?.id;
      if (uid) {
        localStorage.setItem(`profile_setup_done_${uid}`, 'true');
        sessionStorage.setItem(`profile_setup_dismissed_${uid}`, 'true');
      }

      if (typeof onComplete === 'function') {
        onComplete(res.data);
      }
      onClose();
    } catch (err) {
      console.error('[Profile Setup Error]', err);
      const msg = err.response?.data?.message || err.message || 'Failed to save profile';
      alert(`Could not save profile: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  // Skip setup for now
  const handleSkip = () => {
    const uid = user?._id || user?.id;
    if (uid) {
      sessionStorage.setItem(`profile_setup_dismissed_${uid}`, 'true');
    }
    onClose();
  };

  return (
    <>
      <div
        className="profile-setup-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) handleSkip();
        }}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5, 9, 18, 0.84)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          animation: 'fade-in 0.25s ease-out'
        }}
      >
        <div
          className="profile-setup-card"
          ref={cardRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: 520,
            background: '#0e1626',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 24,
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.75)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '92vh',
            color: '#f8fafc',
            position: 'relative'
          }}
        >
          {/* Decorative Top Accent Banner */}
          <div
            style={{
              height: 100,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #0284c7 100%)',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 24px',
              flexShrink: 0
            }}
          >
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '3px 10px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(8px)',
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#fff',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: 4
                }}
              >
                <span>✨ Profile & Status</span>
              </div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                Set Up Your Profile
              </h2>
            </div>

            <button
              type="button"
              onClick={handleSkip}
              aria-label="Skip for now"
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: 'rgba(0, 0, 0, 0.25)',
                border: 'none',
                color: '#fff',
                fontSize: 15,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>
          </div>

          {/* Stepper / Tabs */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(0, 0, 0, 0.2)',
              padding: '4px 16px',
              gap: 8
            }}
          >
            {[
              { id: 'photo', label: '1. Photo', icon: '📷' },
              { id: 'details', label: '2. Name & Bio', icon: '👤' },
              { id: 'status', label: '3. Photo / Video Status', icon: '🟢' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  padding: '10px 8px',
                  background: activeTab === tab.id ? 'rgba(16, 185, 129, 0.18)' : 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab.id ? '2px solid #22c55e' : '2px solid transparent',
                  color: activeTab === tab.id ? '#4ade80' : '#94a3b8',
                  fontSize: 12.5,
                  fontWeight: activeTab === tab.id ? 700 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Body Content */}
          <div style={{ padding: 22, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* ───────────────────────────────────────────────────────────── */}
            {/* TAB 1: PROFILE PHOTO                                          */}
            {/* ───────────────────────────────────────────────────────────── */}
            {activeTab === 'photo' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18, animation: 'fade-in 0.2s ease-out' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div
                    style={{
                      position: 'relative',
                      width: 90,
                      height: 90,
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '3px solid #10b981',
                      boxShadow: '0 0 16px rgba(16, 185, 129, 0.35)',
                      padding: 2,
                      flexShrink: 0
                    }}
                  >
                    <img
                      src={avatar}
                      alt="Avatar Preview"
                      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    {uploadingImage && (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: '50%',
                          background: 'rgba(0, 0, 0, 0.65)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          color: '#fff'
                        }}
                      >
                        ⏳
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
                      Profile Photo
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        style={{
                          padding: '7px 14px',
                          fontSize: 12.5,
                          fontWeight: 600,
                          borderRadius: 8,
                          background: '#10b981',
                          color: '#fff',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        📁 Upload Photo
                      </button>
                      <button
                        type="button"
                        onClick={handleRandomAvatar}
                        style={{
                          padding: '7px 14px',
                          fontSize: 12.5,
                          fontWeight: 600,
                          borderRadius: 8,
                          background: 'rgba(255, 255, 255, 0.08)',
                          color: '#f8fafc',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          cursor: 'pointer'
                        }}
                      >
                        🎲 Randomize
                      </button>
                    </div>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                </div>

                {/* Avatar Presets Grid */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
                    Or Choose an Avatar Preset:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                    {AVATAR_PRESETS.map((preset) => {
                      const isSelected = avatar === preset.url;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setAvatar(preset.url)}
                          style={{
                            padding: 6,
                            background: isSelected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                            border: isSelected ? '2px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: 12,
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <img
                            src={preset.url}
                            alt={preset.label}
                            style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }}
                          />
                          <span style={{ fontSize: 10, color: isSelected ? '#4ade80' : '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                            {preset.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('details')}
                    style={{
                      padding: '8px 18px',
                      fontSize: 13,
                      fontWeight: 600,
                      borderRadius: 8,
                      background: '#10b981',
                      color: '#fff',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Next: Name & Bio →
                  </button>
                </div>
              </div>
            )}

            {/* ───────────────────────────────────────────────────────────── */}
            {/* TAB 2: DISPLAY NAME & BIO                                     */}
            {/* ───────────────────────────────────────────────────────────── */}
            {activeTab === 'details' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fade-in 0.2s ease-out' }}>
                <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
                  Add your display name and a short bio so everyone knows who you are.
                </p>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                    Full / Display Name:
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Faiyaz Usmani"
                    className="form-input"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'rgba(0, 0, 0, 0.35)',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      borderRadius: 10,
                      color: '#fff',
                      fontSize: 14,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                    Short Bio (About Yourself):
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Write a little bit about yourself..."
                    rows={3}
                    maxLength={300}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'rgba(0, 0, 0, 0.35)',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      borderRadius: 10,
                      color: '#fff',
                      fontSize: 13.5,
                      fontFamily: 'inherit',
                      resize: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <div style={{ textAlign: 'right', fontSize: 11, color: '#64748b', marginTop: 4 }}>
                    {bio.length} / 300
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('photo')}
                    style={{
                      padding: '8px 16px',
                      fontSize: 13,
                      borderRadius: 8,
                      background: 'rgba(255, 255, 255, 0.08)',
                      color: '#cbd5e1',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    ← Back to Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('status')}
                    style={{
                      padding: '8px 18px',
                      fontSize: 13,
                      fontWeight: 600,
                      borderRadius: 8,
                      background: '#10b981',
                      color: '#fff',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Next: Photo / Video Status →
                  </button>
                </div>
              </div>
            )}

            {/* ───────────────────────────────────────────────────────────── */}
            {/* TAB 3: PHOTO / VIDEO STATUS (Strictly Media Only)            */}
            {/* ───────────────────────────────────────────────────────────── */}
            {activeTab === 'status' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'fade-in 0.2s ease-out' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#4ade80', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>🟢 Personal Photo or Video Status</span>
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#94a3b8' }}>
                    Upload a personal photo or video update. (Only personal photos and videos can be posted as status). Disappears after 24 hours.
                  </p>
                </div>

                {/* Media Upload Area */}
                <div
                  style={{
                    width: '100%',
                    height: 200,
                    borderRadius: 14,
                    background: '#040711',
                    border: statusMediaUrl ? '1px solid #10b981' : '1.5px dashed rgba(255, 255, 255, 0.2)',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden'
                  }}
                >
                  {statusUploading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: '#34d399' }}>
                      <div style={{ width: 28, height: 28, border: '3px solid rgba(255,255,255,0.2)', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      <span style={{ fontSize: 12 }}>Uploading status media...</span>
                    </div>
                  ) : statusMediaUrl ? (
                    <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {statusMediaType === 'video' ? (
                        <video
                          src={statusMediaUrl}
                          controls
                          playsInline
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      ) : (
                        <img
                          src={statusMediaUrl}
                          alt="Status Media"
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      )}

                      <button
                        type="button"
                        onClick={() => statusFileInputRef.current?.click()}
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          padding: '5px 10px',
                          borderRadius: 16,
                          background: 'rgba(0, 0, 0, 0.75)',
                          color: '#fff',
                          border: '1px solid rgba(255,255,255,0.2)',
                          fontSize: 11,
                          cursor: 'pointer'
                        }}
                      >
                        Change Media
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => statusFileInputRef.current?.click()}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        cursor: 'pointer',
                        padding: 16,
                        textAlign: 'center'
                      }}
                    >
                      <span style={{ fontSize: 32 }}>📸</span>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc' }}>
                        Click to select personal Photo or Video
                      </div>
                      <span style={{ fontSize: 11, color: '#64748b' }}>Supports JPG, PNG, WEBP, MP4, WEBM</span>
                    </div>
                  )}

                  <input
                    type="file"
                    ref={statusFileInputRef}
                    onChange={handleStatusMediaUpload}
                    accept="image/*,video/*"
                    style={{ display: 'none' }}
                  />
                </div>

                {/* Optional Status Caption */}
                {statusMediaUrl && (
                  <div>
                    <input
                      type="text"
                      value={statusCaption}
                      onChange={(e) => setStatusCaption(e.target.value)}
                      placeholder="Add a caption for your photo or video..."
                      maxLength={150}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'rgba(0, 0, 0, 0.35)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: 8,
                        color: '#fff',
                        fontSize: 13,
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                )}

                {statusPosted && (
                  <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.4)', color: '#4ade80', fontSize: 12 }}>
                    ✓ Status story posted successfully!
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('details')}
                    style={{
                      padding: '8px 16px',
                      fontSize: 13,
                      borderRadius: 8,
                      background: 'rgba(255, 255, 255, 0.08)',
                      color: '#cbd5e1',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    ← Back to Name & Bio
                  </button>
                  {statusMediaUrl && !statusPosted && (
                    <button
                      type="button"
                      onClick={handlePostStatusStory}
                      style={{
                        padding: '8px 16px',
                        fontSize: 12.5,
                        fontWeight: 600,
                        borderRadius: 8,
                        background: 'rgba(34, 197, 94, 0.25)',
                        color: '#4ade80',
                        border: '1px solid #10b981',
                        cursor: 'pointer'
                      }}
                    >
                      Post Status Now 🟢
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(0, 0, 0, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexShrink: 0
            }}
          >
            <button
              type="button"
              onClick={handleSkip}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              Skip for now
            </button>

            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={saving}
              style={{
                padding: '10px 24px',
                fontSize: 14,
                fontWeight: 700,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                border: 'none',
                cursor: saving ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                opacity: saving ? 0.7 : 1
              }}
            >
              {saving ? 'Saving...' : 'Save & Get Started 🚀'}
            </button>
          </div>
        </div>
      </div>

      {/* Image Cropper Modal if custom avatar file is picked */}
      {imageToCrop && (
        <ImageCropperModal
          imageSrc={imageToCrop}
          aspect={1}
          onCropComplete={handleCropComplete}
          onCancel={() => setImageToCrop(null)}
        />
      )}
    </>
  );
}

ProfileSetupModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onComplete: PropTypes.func
};
