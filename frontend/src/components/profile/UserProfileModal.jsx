import { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import api from '../../services/api';
import { useAuth } from '../../context/useAuth';
import ImageCropperModal from './ImageCropperModal';
import CreateStatusModal from '../status/CreateStatusModal';
import StatusViewerModal from '../status/StatusViewerModal';
import { socket } from '../../services/socket';
import { animateModalEnter } from '../../utils/animations';

export default function UserProfileModal({ targetUserId, onClose }) {
  const { user: currentUser, updateLocalUser } = useAuth();
  const modalCardRef = useRef(null);
  
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  // Image Upload States
  const [cropTarget, setCropTarget] = useState(null); // 'avatar' or 'bannerImage'
  const [imageToCrop, setImageToCrop] = useState(null);
  const [cropAspect, setCropAspect] = useState(1);

  // WhatsApp Status States
  const [userStatuses, setUserStatuses] = useState([]);
  const [isViewingStatus, setIsViewingStatus] = useState(false);
  const [isCreatingStatus, setIsCreatingStatus] = useState(false);

  const fileInputRef = useRef(null);

  const isMe = currentUser && (targetUserId === currentUser._id || targetUserId === currentUser.id);

  // Fetch profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (isMe) {
          setProfileData(currentUser);
          setEditForm(currentUser);
          setLoading(false);
        } else {
          const response = await api.get(`/users/${targetUserId}`);
          setProfileData(response.data);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch profile', err);
        setLoading(false);
      }
    };
    if (targetUserId) fetchProfile();
  }, [targetUserId, isMe, currentUser]);

  // Fetch active WhatsApp status stories for this user
  const fetchUserStatuses = useCallback(async () => {
    if (!targetUserId) return;
    try {
      const res = await api.get(`/status/user/${targetUserId}`);
      setUserStatuses(res.data?.statuses || []);
    } catch (err) {
      setUserStatuses([]);
      console.warn('Failed to fetch user WhatsApp statuses', err);
    }
  }, [targetUserId]);

  useEffect(() => {
    fetchUserStatuses();
  }, [fetchUserStatuses]);

  // Real-time socket updates for WhatsApp status
  useEffect(() => {
    const onStatusCreated = (status) => {
      const statusUserId = status.user?._id || status.user?.id || status.user;
      if (String(statusUserId) === String(targetUserId)) {
        fetchUserStatuses();
      }
    };

    const onStatusDeleted = ({ statusId, userId }) => {
      if (String(userId) === String(targetUserId)) {
        setUserStatuses((prev) => prev.filter((s) => s._id !== statusId));
      }
    };

    socket.on('status_created', onStatusCreated);
    socket.on('status_deleted', onStatusDeleted);
    return () => {
      socket.off('status_created', onStatusCreated);
      socket.off('status_deleted', onStatusDeleted);
    };
  }, [targetUserId, fetchUserStatuses]);

  const hasStatuses = userStatuses.length > 0;

  // Lock body scroll and listen for Escape key
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    if (!loading && modalCardRef.current) {
      animateModalEnter(modalCardRef.current);
    }
  }, [loading]);

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const payload = {
        ...editForm,
        birthday: editForm.birthday ? editForm.birthday : null
      };
      const response = await api.put('/users/profile', payload);
      setProfileData(response.data);
      updateLocalUser(response.data);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save profile', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to save profile';
      alert(`Failed to save profile: ${errMsg}`);
    } finally {
      setSaving(false);
    }
  };

  // Image Upload Logic
  const handleImageSelect = (type) => {
    setCropTarget(type);
    setCropAspect(type === 'avatar' ? 1 : 16 / 9);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const onFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.addEventListener('load', () => setImageToCrop(reader.result));
      reader.readAsDataURL(file);
    }
    e.target.value = null; // reset input
  };

  const handleCropComplete = async (croppedBlob) => {
    setImageToCrop(null);
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('file', croppedBlob, 'cropped.jpg');
      
      const uploadRes = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const fileUrl = uploadRes.data.url;
      
      // Instantly update the backend
      const updatePayload = { [cropTarget]: fileUrl };
      const res = await api.put('/users/profile', updatePayload);
      
      setProfileData(res.data);
      updateLocalUser(res.data);
      setEditForm((prev) => ({ ...prev, [cropTarget]: fileUrl }));
    } catch (err) {
      console.error('Failed to upload image', err);
      const errMsg = err.response?.data?.message || err.message || 'Upload failed';
      alert(`Upload failed: ${errMsg}`);
    } finally {
      setSaving(false);
      setCropTarget(null);
    }
  };

  // Helper for initials
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="user-profile-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="user-profile-modal">
          <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#818cf8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span>Loading Profile...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="user-profile-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="user-profile-modal">
          <div style={{ padding: 40, textAlign: 'center', color: '#f8fafc' }}>
            <p style={{ fontSize: 16, marginBottom: 16 }}>Profile not found</p>
            <button onClick={onClose} className="btn-profile-secondary">Close</button>
          </div>
        </div>
      </div>
    );
  }

  const avatarSrc = isEditing ? editForm.avatar : profileData.avatar;
  const bannerSrc = (isEditing ? editForm.bannerImage : profileData.bannerImage) || 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=1200&auto=format&fit=crop';
  const displayName = profileData.fullName || profileData.username;

  return (
    <div className="user-profile-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="user-profile-modal" ref={modalCardRef} onClick={(e) => e.stopPropagation()}>
        {/* Mobile Drag Handle Indicator */}
        <div className="user-profile-drag-handle" aria-hidden="true" />

        <div className="user-profile-scroll-area" data-lenis-prevent>
          {/* Banner Section */}
          <div className="profile-banner-container">
            <img src={bannerSrc} alt="Profile Banner" className="profile-banner-img" />
            
            {/* Banner Change Button */}
            {isEditing && isMe && (
              <button 
                type="button"
                className="profile-banner-edit-btn"
                onClick={() => handleImageSelect('bannerImage')}
                title="Change Banner Image"
              >
                ✏️ Change Banner
              </button>
            )}

            {/* Circular Close Button */}
            <button
              onClick={onClose}
              aria-label="Close Profile"
              type="button"
              className="profile-close-btn"
            >
              ✕
            </button>
          </div>

          {/* Header Row: Avatar + Action Buttons */}
          <div className="profile-header-row">
            <div 
              className={`profile-avatar-wrapper ${hasStatuses ? 'has-whatsapp-status' : ''}`}
              onClick={() => {
                if (hasStatuses && !isEditing) {
                  setIsViewingStatus(true);
                }
              }}
              style={{
                cursor: hasStatuses && !isEditing ? 'pointer' : 'default',
                position: 'relative'
              }}
              title={hasStatuses ? 'Click avatar to view WhatsApp Status' : ''}
            >
              <div className="profile-avatar-inner">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  getInitials(displayName)
                )}
              </div>
              {hasStatuses && !isEditing && (
                <div 
                  className="profile-avatar-status-badge"
                  title="Click to view WhatsApp Status"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsViewingStatus(true);
                  }}
                >
                  🟢
                </div>
              )}
              {isEditing && isMe && (
                <div 
                  onClick={() => handleImageSelect('avatar')} 
                  className="profile-avatar-edit-overlay"
                  title="Change Avatar Photo"
                  role="button"
                  tabIndex="0"
                >
                  📷
                </div>
              )}
            </div>

            {/* Header Action Buttons (Edit / Save / Cancel & View Story) */}
            <div className="profile-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {!isEditing && hasStatuses && (
                <button
                  type="button"
                  onClick={() => setIsViewingStatus(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 14px',
                    borderRadius: 20,
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    border: 'none',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
                    transition: 'all 0.15s ease'
                  }}
                  title="View Photo/Video Status Story"
                >
                  <span>🟢</span>
                  <span>View Story ({userStatuses.length})</span>
                </button>
              )}

              {isMe && (
                <>
                  {isEditing ? (
                    <>
                      <button 
                        type="button"
                        onClick={() => { setIsEditing(false); setEditForm(profileData); }} 
                        className="btn-profile-secondary"
                      >
                        Cancel
                      </button>
                      <button 
                        type="button"
                        onClick={handleSaveProfile} 
                        disabled={saving} 
                        className="btn-profile-primary"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                    </>
                  ) : (
                    <button 
                      type="button"
                      onClick={() => setIsEditing(true)} 
                      className="btn-profile-secondary"
                    >
                      Edit Profile
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Profile Body / Form */}
          <div className="profile-info-content">
            {isEditing ? (
              <div className="profile-edit-container">
                <div className="profile-form-row">
                  <div className="profile-field-group">
                    <label className="profile-field-label">Username</label>
                    <input 
                      type="text" 
                      name="username" 
                      value={editForm.username || ''} 
                      onChange={handleEditChange} 
                      className="profile-field-input" 
                      autoComplete="username"
                    />
                  </div>
                  <div className="profile-field-group">
                    <label className="profile-field-label">Full Name</label>
                    <input 
                      type="text" 
                      name="fullName" 
                      value={editForm.fullName || ''} 
                      onChange={handleEditChange} 
                      className="profile-field-input" 
                      autoComplete="name"
                    />
                  </div>
                </div>

                <div className="profile-field-group">
                  <label className="profile-field-label">Custom Status</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      placeholder="Emoji"
                      value={editForm.customStatus?.emoji || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, customStatus: { ...(prev.customStatus || {}), emoji: e.target.value } }))}
                      style={{ width: 64, textAlign: 'center', fontSize: 16 }}
                      className="profile-field-input"
                    />
                    <input
                      type="text"
                      placeholder="What's on your mind? (e.g. Ready to chat!)"
                      value={editForm.customStatus?.text || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, customStatus: { ...(prev.customStatus || {}), text: e.target.value } }))}
                      className="profile-field-input"
                    />
                  </div>
                </div>

                <div className="profile-field-group">
                  <label className="profile-field-label">Bio</label>
                  <textarea 
                    name="bio" 
                    value={editForm.bio || ''} 
                    onChange={handleEditChange} 
                    className="profile-field-input profile-field-textarea" 
                    placeholder="Tell everyone a little bit about yourself..." 
                  />
                </div>

                {/* Additional Mobile-Friendly Bottom Save Bar */}
                <div className="profile-edit-bottom-actions">
                  <button 
                    type="button"
                    onClick={() => { setIsEditing(false); setEditForm(profileData); }} 
                    className="btn-profile-secondary"
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button"
                    onClick={handleSaveProfile} 
                    disabled={saving} 
                    className="btn-profile-primary"
                    style={{ flex: 2 }}
                  >
                    {saving ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h2 className="profile-identity-title" style={{ margin: 0 }}>{displayName}</h2>
                  {(profileData.role === 'superadmin' || (profileData.email || '').toLowerCase() === 'faiyazusmani068@gmail.com') && (
                    <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 12, background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', letterSpacing: 0.3, boxShadow: '0 0 10px rgba(245, 158, 11, 0.4)' }}>
                      👑 Super Admin
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <div className="profile-identity-handle">@{profileData.username}</div>
                  <span style={{ color: '#475569', fontSize: 11 }}>•</span>
                  <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 4 }}>
                    ID: {profileData._id || targetUserId}
                  </div>
                </div>

                {/* WhatsApp Status Story Display */}
                {hasStatuses ? (
                  <div 
                    className="whatsapp-status-profile-banner"
                    onClick={() => setIsViewingStatus(true)}
                    title="Click to view WhatsApp status story"
                  >
                    <div className="whatsapp-status-banner-left">
                      <div className="whatsapp-status-live-icon">
                        🟢
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div className="whatsapp-status-banner-title">
                          <span>WhatsApp Status Story</span>
                          <span className="whatsapp-status-count-badge">
                            {userStatuses.length} {userStatuses.length === 1 ? 'update' : 'updates'}
                          </span>
                        </div>
                        <div className="whatsapp-status-banner-subtitle">
                          {userStatuses[userStatuses.length - 1]?.type === 'video'
                            ? '🎥 Video Story'
                            : '📷 Photo Story'}{' '}
                          • Active for 24h • Tap to view
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button 
                        type="button" 
                        className="whatsapp-status-view-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsViewingStatus(true);
                        }}
                      >
                        View Status ▶
                      </button>
                      {isMe && (
                        <button
                          type="button"
                          className="btn-post-status-profile"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsCreatingStatus(true);
                          }}
                          title="Add another photo/video story"
                        >
                          + Add
                        </button>
                      )}
                    </div>
                  </div>
                ) : isMe ? (
                  <div style={{ 
                    margin: '12px 0', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: '10px 14px', 
                    borderRadius: 12, 
                    background: 'rgba(255,255,255,0.03)', 
                    border: '1px dashed rgba(255,255,255,0.15)' 
                  }}>
                    <div style={{ fontSize: 13, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>📸</span>
                      <span>No active photo or video status</span>
                    </div>
                    <button
                      type="button"
                      className="btn-post-status-profile"
                      onClick={() => setIsCreatingStatus(true)}
                    >
                      + Post Photo / Video Status
                    </button>
                  </div>
                ) : null}
                
                {profileData.customStatus?.text && (
                  <div className="profile-status-pill">
                    <span>{profileData.customStatus.emoji}</span>
                    <span>{profileData.customStatus.text}</span>
                  </div>
                )}
                
                <div className="profile-bio-box">
                  {profileData.bio || <span style={{ color: '#64748b', fontStyle: 'italic' }}>No bio provided yet.</span>}
                </div>

                {profileData.createdAt && (
                  <div className="profile-member-date">
                    Member since {new Date(profileData.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden File Input */}
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        onChange={onFileChange} 
        style={{ display: 'none' }} 
      />

      {/* Cropper Modal Overlay */}
      {imageToCrop && (
        <ImageCropperModal 
          imageSrc={imageToCrop} 
          aspect={cropAspect} 
          onCancel={() => setImageToCrop(null)}
          onCropComplete={handleCropComplete} 
        />
      )}

      {/* WhatsApp Status Viewer Modal */}
      {isViewingStatus && hasStatuses && (
        <StatusViewerModal
          isOpen={isViewingStatus}
          onClose={() => setIsViewingStatus(false)}
          statusGroup={{
            user: profileData,
            statuses: userStatuses,
            isMe
          }}
          onDeleteStatus={(statusId) => {
            setUserStatuses((prev) => prev.filter((s) => s._id !== statusId));
            if (userStatuses.length <= 1) {
              setIsViewingStatus(false);
            }
          }}
        />
      )}

      {/* WhatsApp Status Creator Modal */}
      {isCreatingStatus && (
        <CreateStatusModal
          isOpen={isCreatingStatus}
          onClose={() => setIsCreatingStatus(false)}
          onStatusCreated={() => {
            setIsCreatingStatus(false);
            fetchUserStatuses();
          }}
        />
      )}
    </div>
  );
}

UserProfileModal.propTypes = {
  targetUserId: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};
