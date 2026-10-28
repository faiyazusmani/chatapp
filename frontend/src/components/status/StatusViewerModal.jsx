import { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import api from '../../services/api';

const IMAGE_DURATION_MS = 5000; // 5 seconds for photo status (WhatsApp standard)

export default function StatusViewerModal({ isOpen, onClose, statusGroup, onDeleteStatus }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0); // 0 to 100
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const progressIntervalRef = useRef(null);
  const videoRef = useRef(null);

  const statuses = statusGroup?.statuses || [];
  const currentStatus = statuses[currentIndex];
  const user = statusGroup?.user;
  const isMe = statusGroup?.isMe;

  const isVideo = currentStatus?.type === 'video' || /\.(mp4|webm|mov|m4v|mkv)(\?.*)?$/i.test(currentStatus?.mediaUrl || '');

  // Reset index when a new status group opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setProgress(0);
      setIsPaused(false);
    }
  }, [isOpen, statusGroup]);

  // Mark status as viewed when displayed
  useEffect(() => {
    if (isOpen && currentStatus?._id && !isMe) {
      api.post(`/status/${currentStatus._id}/view`).catch((err) => {
        console.warn('[Status View Error]', err);
      });
    }
  }, [isOpen, currentStatus, isMe]);

  // Handle next status
  const handleNext = useCallback(() => {
    if (currentIndex < statuses.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentIndex, statuses.length, onClose]);

  // Handle previous status
  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
    } else {
      setProgress(0);
    }
  }, [currentIndex]);

  // Video pause/play sync with hold-to-pause
  useEffect(() => {
    if (!videoRef.current) return;
    if (isPaused) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
  }, [isPaused, currentIndex]);

  // Progress Bar Timer for Images (Videos use onTimeUpdate)
  useEffect(() => {
    if (!isOpen || isPaused || !currentStatus || isVideo) return;

    const stepMs = 50;
    const increment = (stepMs / IMAGE_DURATION_MS) * 100;

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressIntervalRef.current);
          handleNext();
          return 0;
        }
        return prev + increment;
      });
    }, stepMs);

    return () => clearInterval(progressIntervalRef.current);
  }, [isOpen, isPaused, currentStatus, isVideo, handleNext]);

  // Keyboard navigation & Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' || e.key === ' ') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'm' || e.key === 'M') setIsMuted((m) => !m);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handlePrev, onClose]);

  if (!isOpen || !currentStatus) return null;

  // Format timestamp
  const formatStatusTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMinutes = Math.floor((now - date) / 60000);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this status update?')) return;
    try {
      await api.delete(`/status/${currentStatus._id}`);
      if (typeof onDeleteStatus === 'function') {
        onDeleteStatus(currentStatus._id);
      }
      if (statuses.length <= 1) {
        onClose();
      } else {
        handleNext();
      }
    } catch (err) {
      console.error('[Delete Status Error]', err);
      alert('Could not delete status');
    }
  };

  return (
    <div
      className="status-viewer-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(3, 7, 18, 0.96)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        zIndex: 10050,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
    >
      <div
        className="status-viewer-card"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
        style={{
          width: '100%',
          maxWidth: 430,
          height: '88vh',
          maxHeight: 760,
          borderRadius: 24,
          background: '#000',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85), 0 0 1px rgba(255, 255, 255, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          userSelect: 'none'
        }}
      >
        {/* Top Progress Bars (One segment per status story) */}
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 14,
            right: 14,
            display: 'flex',
            gap: 4,
            zIndex: 20
          }}
        >
          {statuses.map((st, idx) => {
            let segProgress = 0;
            if (idx < currentIndex) segProgress = 100;
            else if (idx === currentIndex) segProgress = progress;

            return (
              <div
                key={st._id || idx}
                style={{
                  flex: 1,
                  height: 3,
                  background: 'rgba(255, 255, 255, 0.28)',
                  borderRadius: 3,
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${segProgress}%`,
                    background: '#22c55e',
                    transition: idx === currentIndex && !isPaused && !isVideo ? 'width 50ms linear' : 'none'
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Top User Info Bar */}
        <div
          style={{
            position: 'absolute',
            top: 24,
            left: 14,
            right: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 20,
            padding: '4px 0'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* User Avatar with WhatsApp Green Ring */}
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                padding: 2,
                background: '#22c55e',
                boxShadow: '0 0 8px rgba(34, 197, 94, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <img
                src={user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.username || 'user'}`}
                alt={user?.username}
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
              />
            </div>

            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                {isMe ? 'My Status' : (user?.fullName || user?.username || 'Contact')}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.85)', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                {formatStatusTime(currentStatus.createdAt)} • {isVideo ? '🎥 Video' : '📷 Photo'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Audio Toggle for Video Status */}
            {isVideo && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMuted((m) => !m);
                }}
                title={isMuted ? 'Unmute' : 'Mute'}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: 'rgba(0, 0, 0, 0.5)',
                  backdropFilter: 'blur(6px)',
                  border: 'none',
                  color: '#fff',
                  fontSize: 15,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {isMuted ? '🔇' : '🔊'}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: 'rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(6px)',
                border: 'none',
                color: '#fff',
                fontSize: 16,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Media Content (Photo or Video Only) */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            background: '#000'
          }}
        >
          {isVideo ? (
            <video
              ref={videoRef}
              src={currentStatus.mediaUrl}
              autoPlay
              playsInline
              muted={isMuted}
              onTimeUpdate={(e) => {
                if (e.target.duration && !isPaused) {
                  setProgress((e.target.currentTime / e.target.duration) * 100);
                }
              }}
              onEnded={() => {
                setProgress(100);
                handleNext();
              }}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
            />
          ) : (
            <img
              src={currentStatus.mediaUrl}
              alt="Status Photo"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
            />
          )}

          {/* Optional Caption Display */}
          {currentStatus.content && (
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '24px 20px 28px 20px',
                background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
                color: '#fff',
                fontSize: 14.5,
                fontWeight: 500,
                textAlign: 'center',
                wordBreak: 'break-word',
                zIndex: 10
              }}
            >
              {currentStatus.content}
            </div>
          )}

          {/* Left/Right Tap Navigation Zones */}
          <div
            onClick={handlePrev}
            style={{
              position: 'absolute',
              top: 70,
              bottom: 60,
              left: 0,
              width: '35%',
              cursor: 'pointer',
              zIndex: 5
            }}
            title="Previous status"
          />
          <div
            onClick={handleNext}
            style={{
              position: 'absolute',
              top: 70,
              bottom: 60,
              right: 0,
              width: '65%',
              cursor: 'pointer',
              zIndex: 5
            }}
            title="Next status"
          />
        </div>

        {/* Bottom Bar: Owner View Count or Info */}
        <div
          style={{
            padding: '12px 18px',
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 15
          }}
        >
          {isMe ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#f8fafc' }}>
                <span style={{ fontSize: 15 }}>👁️</span>
                <span>
                  {currentStatus.viewers?.length || 0}{' '}
                  {currentStatus.viewers?.length === 1 ? 'view' : 'views'}
                </span>
              </div>

              <button
                type="button"
                onClick={handleDelete}
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#f87171',
                  borderRadius: 8,
                  padding: '5px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <span>🗑️</span> Delete
              </button>
            </>
          ) : (
            <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', width: '100%' }}>
              Tap left/right to navigate • Hold to pause
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

StatusViewerModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  statusGroup: PropTypes.shape({
    user: PropTypes.object,
    statuses: PropTypes.array,
    isMe: PropTypes.bool
  }),
  onDeleteStatus: PropTypes.func
};
