import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { socket } from '../services/socket';
import { useAuth } from '../context/useAuth';
import { useWallpaper } from '../context/WallpaperContext';
import { useAppearance } from '../context/AppearanceContext';
import { themeSoundManager } from '../utils/themeSoundManager';
import api from '../services/api';
import VoiceCallModal from './VoiceCallModal';
import VideoCallModal from './VideoCallModal';
import NotificationToast from './NotificationToast';
import PresenceBadge from './common/PresenceBadge';
import VoiceRecorder from './VoiceRecorder';
import AudioPlayer from './AudioPlayer';
import UserProfileModal from './profile/UserProfileModal';
import ChatPersonalityStudioModal from './personality/ChatPersonalityStudioModal';
import AnimatedBackgroundLayer from './personality/AnimatedBackgroundLayer';
import AppearanceStudioModal from './appearance/AppearanceStudioModal';
import WallpaperEffectsLayer from './appearance/WallpaperEffectsLayer';

export default function ChatWindow({ room, onLeaveRoom, onBack, onToggleMobileSidebar }) {
  const { user } = useAuth();
  const { getActiveWallpaperForRoom: getOldWp, personalityState } = useWallpaper();
  const { getActiveWallpaperForRoom, appearanceState } = useAppearance();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Pagination State
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Mobile More Dropdown State
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);

  // Real-Time Notifications State
  const [notifications, setNotifications] = useState([]);

  // Hover state for reactions
  const [hoveredMessageId, setHoveredMessageId] = useState(null);

  // Voice Notes State
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);

  // Image Lightbox Preview State
  const [previewImageUrl, setPreviewImageUrl] = useState(null);

  // Voice Calling State
  const [isVoiceCallOpen, setIsVoiceCallOpen] = useState(false);
  const [isVoiceIncoming, setIsVoiceIncoming] = useState(false);
  const [voiceCaller, setVoiceCaller] = useState(null);
  const [voiceOffer, setVoiceOffer] = useState(null);
  // FIX: Store caller's socket ID so ICE/answer routes directly to them (not room-broadcast)
  const [voiceCallerSocketId, setVoiceCallerSocketId] = useState(null);

  // Video Calling & Screen Sharing State
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  const [isVideoIncoming, setIsVideoIncoming] = useState(false);
  const [videoCaller, setVideoCaller] = useState(null);
  const [videoOffer, setVideoOffer] = useState(null);
  const [videoCallerSocketId, setVideoCallerSocketId] = useState(null);

  // Profile Modal State
  const [targetProfileId, setTargetProfileId] = useState(null);

  // Chat Personality Studio State
  const [isStudioOpen, setIsStudioOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  const roomId = room._id || room.id;

  // Add Toast Notification
  const addNotification = (title, message, type = 'info') => {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    setNotifications((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const handleDismissNotification = (id) => {
    setNotifications((prev) => prev.filter((t) => t.id !== id));
  };

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchOlderMessages = async () => {
    const nextPage = page + 1;
    try {
      const response = await api.get(`/messages/${roomId}?page=${nextPage}&limit=50`);
      const newMsgs = response.data;
      if (newMsgs.length < 50) {
        setHasMore(false);
      }
      setMessages((prev) => [...newMsgs, ...prev]);
      setPage(nextPage);
    } catch (err) {
      console.error('[Messages Error] Failed to fetch older messages:', err);
    }
  };

  useEffect(() => {
    if (!roomId) return;

    // Reset page and hasMore on room change
    setPage(1);
    setHasMore(true);

    const loadMessages = async () => {
      try {
        const response = await api.get(`/messages/${roomId}?page=1&limit=50`);
        const newMsgs = response.data;
        if (newMsgs.length < 50) setHasMore(false);
        setMessages(newMsgs);
        setTimeout(scrollToBottom, 100);
      } catch (err) {
        console.error('[Messages Error] Failed to fetch messages:', err);
      }
    };

    loadMessages();

    // Socket Room Join
    socket.emit('join_room', { roomId, user });

    // Socket Event Listeners
    const handleReceiveMessage = (newMsg) => {
      if (newMsg.room === roomId) {
        setMessages((prev) => [...prev, newMsg]);
        scrollToBottom();

        const senderId = newMsg.sender?._id || newMsg.sender?.id;
        const currentUserId = user?._id || user?.id;
        if (senderId !== currentUserId) {
          addNotification('New Message', `${newMsg.sender?.username || 'Someone'}: "${newMsg.content || 'Sent a file'}"`, 'message');
        }
      }
    };

    const handleMessageEdited = (editedMsg) => {
      if (editedMsg.room === roomId) {
        setMessages((prev) =>
          prev.map((msg) => (msg._id === editedMsg._id ? editedMsg : msg))
        );
      }
    };

    const handleMessageDeleted = (deletedMsg) => {
      if (deletedMsg.room === roomId) {
        setMessages((prev) =>
          prev.map((msg) => (msg._id === deletedMsg._id ? deletedMsg : msg))
        );
      }
    };

    const handleMessageReactionUpdated = (updatedMsg) => {
      if (updatedMsg.room === roomId) {
        setMessages((prev) =>
          prev.map((msg) => (msg._id === updatedMsg._id ? updatedMsg : msg))
        );
      }
    };

    const handleUserJoined = ({ user: joinedUser }) => {
      console.group('%c[Socket] 🟢 User Joined', 'color:#10b981;font-weight:bold');
      console.log('  username:', joinedUser?.username);
      console.log('  room:', room.name);
      console.groupEnd();

      if (joinedUser?.username && joinedUser.username !== user?.username) {
        addNotification('User Joined', `${joinedUser.username} joined #${room.name}`, 'join');
      }
    };

    const handleUserLeft = ({ user: leftUser }) => {
      console.group('%c[Socket] 🔴 User Left', 'color:#ef4444;font-weight:bold');
      console.log('  username:', leftUser?.username);
      console.log('  room:', room.name);
      console.groupEnd();

      if (leftUser?.username && leftUser.username !== user?.username) {
        addNotification('User Left', `${leftUser.username} left the room`, 'leave');
      }
    };

    const handleUserTyping = ({ username }) => {
      if (username !== user?.username) {
        setTypingUsers((prev) => new Set(prev).add(username));
      }
    };

    const handleUserStopTyping = ({ username }) => {
      setTypingUsers((prev) => {
        const updated = new Set(prev);
        updated.delete(username);
        return updated;
      });
    };

    // Incoming Voice Call Socket Event
    // FIX: Extract fromSocket and store it — this is the caller's socket ID
    // that we must use to route our SDP answer and ICE candidates directly
    // back to them instead of broadcasting to the whole room.
    const handleCallIncoming = ({ offer, caller, fromSocket }) => {
      console.log('[Voice] Incoming call from socket:', fromSocket, 'user:', caller?.username);
      setVoiceOffer(offer);
      setVoiceCaller(caller);
      setVoiceCallerSocketId(fromSocket || null);  // <-- KEY FIX
      setIsVoiceIncoming(true);
      setIsVoiceCallOpen(true);
      addNotification('Incoming Voice Call', `${caller?.username || 'Member'} is calling...`, 'voice_call');
    };

    // Incoming Video Call Socket Event
    // FIX: Same fix for video — extract fromSocket for targeted signaling.
    const handleVideoCallIncoming = ({ offer, caller, fromSocket }) => {
      console.log('[Video] Incoming call from socket:', fromSocket, 'user:', caller?.username);
      setVideoOffer(offer);
      setVideoCaller(caller);
      setVideoCallerSocketId(fromSocket || null);  // <-- KEY FIX
      setIsVideoIncoming(true);
      setIsVideoCallOpen(true);
      addNotification('Incoming Video Call', `${caller?.username || 'Member'} initiated a video call...`, 'video_call');
    };

    const handleStatusUpdated = ({ userId, customStatus }) => {
      setMessages((prev) => 
        prev.map(msg => {
          if ((msg.sender?._id || msg.sender?.id) === userId) {
            return {
              ...msg,
              sender: { ...msg.sender, customStatus }
            };
          }
          return msg;
        })
      );
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('message_edited', handleMessageEdited);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('message_reaction_updated', handleMessageReactionUpdated);
    socket.on('user_joined', handleUserJoined);
    socket.on('user_left', handleUserLeft);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stop_typing', handleUserStopTyping);
    socket.on('call_incoming', handleCallIncoming);
    socket.on('video_call_incoming', handleVideoCallIncoming);
    socket.on('status_updated', handleStatusUpdated);

    return () => {
      socket.emit('leave_room', { roomId, user });
      socket.off('receive_message', handleReceiveMessage);
      socket.off('message_edited', handleMessageEdited);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('message_reaction_updated', handleMessageReactionUpdated);
      socket.off('user_joined', handleUserJoined);
      socket.off('user_left', handleUserLeft);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stop_typing', handleUserStopTyping);
      socket.off('call_incoming', handleCallIncoming);
      socket.off('video_call_incoming', handleVideoCallIncoming);
      socket.off('status_updated', handleStatusUpdated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle typing indicator trigger
  const handleInputChange = (e) => {
    setInputText(e.target.value);

    if (appearanceState?.soundControls?.enableSounds && appearanceState?.soundControls?.enableTypingSound) {
      themeSoundManager.playTypingSound();
    }

    socket.emit('typing_start', { roomId, username: user?.username });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing_stop', { roomId, username: user?.username });
    }, 1500);
  };

  // Submit text or file message
  const handleSubmitMessage = (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    if (appearanceState?.soundControls?.enableSounds && appearanceState?.soundControls?.enableSentSound) {
      themeSoundManager.playSentSound();
    }

    if (editingMessage) {
      socket.emit('edit_message', {
        messageId: editingMessage._id,
        roomId,
        newContent: inputText.trim(),
      });
      setEditingMessage(null);
    } else {
      socket.emit('send_message', {
        roomId,
        content: inputText.trim(),
        sender: user,
        replyToId: replyingTo ? replyingTo._id : null,
      });
      setReplyingTo(null);
    }

    setInputText('');
    setShowEmojiPicker(false);
    socket.emit('typing_stop', { roomId, username: user?.username });
  };

  const handleToggleReaction = (messageId, emoji) => {
    socket.emit('toggle_reaction', { messageId, roomId, emoji });
  };

  // File Upload Handler (Multer + Cloudinary)
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploadingFile(true);

    try {
      const response = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { url, fileType, fileName } = response.data;

      socket.emit('send_message', {
        roomId,
        content: inputText.trim(),
        fileUrl: url,
        fileType,
        fileName,
        sender: user,
        replyToId: replyingTo ? replyingTo._id : null,
      });

      setUploadingFile(false);
      setInputText('');
      setReplyingTo(null);
    } catch (err) {
      console.error('[Upload Error] Failed to upload file:', err);
      alert('File upload failed. Please try again.');
      setUploadingFile(false);
    }
  };

  const handleSendVoiceNote = async (blob) => {
    try {
      setIsRecordingVoice(false);
      setUploadingFile(true);

      const formData = new FormData();
      formData.append('file', blob, 'voice-note.webm');

      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const { url, fileType, fileName } = res.data;

      socket.emit('send_message', {
        roomId,
        content: '',
        fileUrl: url,
        fileType: 'audio',
        fileName: 'Voice Note',
        sender: user,
        replyToId: replyingTo ? replyingTo._id : null,
      });

      setUploadingFile(false);
      setReplyingTo(null);
    } catch (err) {
      console.error('[Upload Error] Failed to upload voice note:', err);
      alert('Voice note upload failed.');
      setUploadingFile(false);
    }
  };

  const handleAddEmoji = (emoji) => {
    setInputText((prev) => prev + emoji);
  };

  const handleStartEdit = (msg) => {
    setEditingMessage(msg);
    setInputText(msg.content);
    setReplyingTo(null);
  };

  const handleDeleteMessage = (msgId) => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      socket.emit('delete_message', { messageId: msgId, roomId });
    }
  };

  const handleStartVoiceCall = () => {
    setIsVoiceIncoming(false);
    setVoiceCaller(null);
    setVoiceOffer(null);
    setIsVoiceCallOpen(true);
  };

  const handleStartVideoCall = () => {
    setIsVideoIncoming(false);
    setVideoCaller(null);
    setVideoOffer(null);
    setIsVideoCallOpen(true);
  };

  const formatTime = (isoString) => {
    if (!isoString) return '16:01';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const getUserInitials = (name) => {
    if (!name) return 'M';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const typingArray = Array.from(typingUsers);

  return (
    <div style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--theme-chat-bg)', minWidth: 0, fontFamily: 'var(--theme-font)', position: 'relative', overflow: 'hidden' }}>
      {/* Layer 0: Wallpaper Background Layer (position: absolute; inset: 0; z-index: 0;) */}
      {getActiveWallpaperForRoom(roomId) && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            backgroundImage: `url(${getActiveWallpaperForRoom(roomId)})`,
            backgroundSize: appearanceState?.controls?.fitMode === 'contain' ? 'contain' : appearanceState?.controls?.fitMode === 'fill' ? '100% 100%' : 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: appearanceState?.controls?.opacity ?? 0.85,
            filter: `blur(${appearanceState?.controls?.blur || 0}px) brightness(${appearanceState?.controls?.brightness || 100}%) contrast(${appearanceState?.controls?.contrast || 100}%) saturate(${appearanceState?.controls?.saturation || 100}%)`,
            transform: `scale(${(appearanceState?.controls?.scale || 100) / 100})`,
            transformOrigin: 'center center',
            transition: 'all 0.15s ease',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      )}

      {/* Layer 1: GPU Animated Visual Effects Layer (position: absolute; inset: 0; z-index: 1;) */}
      <WallpaperEffectsLayer />

      {/* Layer 2: Overlay Layer (position: absolute; inset: 0; z-index: 2;) */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          backgroundColor: appearanceState?.controls?.overlayColor || '#000000',
          opacity: appearanceState?.controls?.overlayOpacity ?? 0.2,
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />

      {/* Notifications Toast */}
      <NotificationToast notifications={notifications} onDismiss={handleDismissNotification} />

      {/* Layer 4: Top Header Bar (Dedicated Multi-Header Architecture) */}
      <header className="chat-header" id="chat-header" style={{ position: 'relative', zIndex: 4, flexShrink: 0 }}>
          <div className="header-left">
              <button className="btn-icon back-to-list-btn" onClick={onToggleMobileSidebar} title="Menu" aria-label="Menu" style={{ display: 'md-none' }}>
                  <span style={{ fontSize: 18 }}>☰</span>
              </button>
              <button className="btn-icon back-to-list-btn" onClick={onBack} title="Back to Chat List" aria-label="Back to Chat List">
                  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              </button>

              <div className="avatar-container">
                  <div className="avatar" style={{ background: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="avatar-text" style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>{getUserInitials(room.name)}</span>
                  </div>
                  <span className="status-indicator status-online" id="header-status-dot"></span>
              </div>
              <div className="contact-details">
                  <div className="contact-name-row">
                      <h2 className="contact-name" id="header-contact-name">{room.name || 'Note to myself'}</h2>
                      <span className="encryption-badge verified" id="header-encryption-badge" title="OMEMO End-to-End Encrypted">
                          <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                          <span>OMEMO</span>
                      </span>
                  </div>
                  <p className="contact-status-text" id="header-status-text">
                    {room.code ? `Code: #${room.code}` : 'Encrypted XMPP Session'}
                  </p>
              </div>
          </div>

          <div className="header-right-actions">
              <button className="btn-icon" onClick={() => setIsStudioOpen(true)} title="Chat Personality Studio" aria-label="Studio">
                  <span>✨</span>
              </button>
              <button className="btn-icon" onClick={handleStartVoiceCall} title="Start Audio Call" aria-label="Audio Call">
                  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              </button>
              <button className="btn-icon" onClick={handleStartVideoCall} title="Start Video Call" aria-label="Video Call">
                  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
              </button>
              <button className="btn-icon" onClick={() => setIsMobileMoreOpen(!isMobileMoreOpen)} title="Search in Conversation" aria-label="Search Messages">
                  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </button>
              <div className="action-divider"></div>
              <button className="btn-icon" onClick={() => onLeaveRoom(roomId)} title="Leave Room" aria-label="Leave Room">
                  <span style={{ color: '#ef4444' }}>🚪</span>
              </button>
          </div>

          {/* Mobile ⋮ More Dropdown Menu */}
          {isMobileMoreOpen && (
            <div className="mobile-more-dropdown" onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', right: 10, top: 50, background: 'var(--theme-sidebar-bg)', border: '1px solid #2d3241', borderRadius: 8, padding: 8, zIndex: 100 }}>
              <button className="mobile-more-dropdown-item" onClick={() => { setIsStudioOpen(true); setIsMobileMoreOpen(false); }} style={{ width: '100%', padding: '8px', background: 'transparent', border: 'none', color: '#d1d5db', textAlign: 'left', cursor: 'pointer' }}>
                <span>✨</span> Appearance Studio
              </button>
              <button className="mobile-more-dropdown-item" onClick={() => { onLeaveRoom(roomId); setIsMobileMoreOpen(false); }} style={{ width: '100%', padding: '8px', background: 'transparent', border: 'none', color: '#ef4444', textAlign: 'left', cursor: 'pointer' }}>
                <span>🚪</span> Leave Room
              </button>
            </div>
          )}
      </header>

      {/* ─── Messages Feed Area ──────────────────────────────────────── */}
      <div
        className="messages-history-container scrollzone"
        id="messages-container"
        role="log"
        aria-live="polite"
        aria-label="Message Stream"
        style={{ position: 'relative', zIndex: 3 }}
      >
        {/* Security notice banner */}
        <div className="system-message security-notice">
          <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <span>Messages and calls in this conversation are end-to-end encrypted.</span>
        </div>

        {/* Load More Button */}
        {hasMore && messages.length > 0 && (
          <div className="day-divider">
            <button
              onClick={fetchOlderMessages}
              className="day-divider-label"
              style={{ cursor: 'pointer', border: '1px solid var(--border-color)', background: 'var(--bg-badge)' }}
            >
              Load Older Messages
            </button>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="empty-roster-state" style={{ flex: 1 }}>
            <svg className="icon icon-empty" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <p className="empty-title">No messages yet</p>
            <p className="empty-subtitle">Be the first to say something in <strong>{room.name}</strong>!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender?._id === user?._id || msg.sender?.id === user?.id || msg.sender?.username === user?.username;
            const senderName = msg.sender?.username || 'Me';
            const initials = getUserInitials(senderName);

            return (
              <div
                key={msg._id}
                className={`message-row ${isMe ? 'message-row--me' : ''}`}
                onClick={() => setHoveredMessageId(hoveredMessageId === msg._id ? null : msg._id)}
                onMouseLeave={() => setHoveredMessageId(null)}
                style={{ display: 'flex', gap: 10, alignItems: 'flex-start', position: 'relative', animation: 'message-appear 150ms ease-out' }}
              >
                {/* Avatar */}
                <div style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => setTargetProfileId(msg.sender?._id || msg.sender?.id)}>
                  <PresenceBadge userId={msg.sender?._id || msg.sender?.id}>
                    <div style={{ width: 34, height: 34, borderRadius: 6, background: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700, overflow: 'hidden' }}>
                      {msg.sender?.avatar ? (
                        <img src={msg.sender.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : initials}
                    </div>
                  </PresenceBadge>
                </div>

                {/* Message Content */}
                <div className="msg-content-wrap" style={{ flex: 1, minWidth: 0 }}>
                  {/* Sender row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--theme-sender-color, #60a5fa)' }}>{senderName}</span>
                    {msg.sender?.customStatus?.emoji && (
                      <span style={{ fontSize: 11 }} title={msg.sender?.customStatus?.text}>{msg.sender.customStatus.emoji}</span>
                    )}
                    <span className="chat-timestamp">{formatTime(msg.createdAt)}</span>
                  </div>

                  {/* Image Attachment */}
                  {msg.fileUrl && msg.fileType === 'image' && (
                    <div className="msg-image-container" style={{ marginTop: 4, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                      <img src={msg.fileUrl} alt="Attachment" style={{ width: '100%', maxWidth: 320, display: 'block', cursor: 'pointer' }} onClick={() => setPreviewImageUrl(msg.fileUrl)} />
                    </div>
                  )}

                  {/* Audio Attachment */}
                  {msg.fileUrl && msg.fileType === 'audio' && (
                    <AudioPlayer src={msg.fileUrl} />
                  )}

                  {/* Generic File Attachment */}
                  {msg.fileUrl && msg.fileType !== 'image' && msg.fileType !== 'audio' && (
                    <div className="attachment-item" style={{ marginTop: 4, width: 'fit-content', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-input)' }}>
                      <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                      <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', fontSize: 13, textDecoration: 'none' }}>
                        {msg.fileName || 'Download File'}
                      </a>
                    </div>
                  )}

                  {/* Message Text */}
                  {msg.content && msg.fileType !== 'call' && (
                    <div
                      className={isMe ? 'msg-bubble msg-bubble-out' : 'msg-bubble msg-bubble-in'}
                      style={{ marginTop: 4, lineHeight: 1.45, wordBreak: 'break-word', fontSize: 13 }}
                    >
                      {msg.content}
                    </div>
                  )}

                  {/* Call History Message */}
                  {msg.fileType === 'call' && (
                    <div className="system-message" style={{ justifyContent: 'flex-start', maxWidth: 'fit-content', marginLeft: 0 }}>
                      {(() => {
                        try {
                          const callData = JSON.parse(msg.content);
                          const isMissed = callData.status === 'missed';
                          const icon = callData.type === 'video' ? '📹' : '📞';
                          const durationStr = callData.duration ? `${Math.floor(callData.duration/60)}m ${callData.duration%60}s` : '';
                          return (
                            <>
                              <span style={{ fontSize: 18, color: isMissed ? '#ef4444' : '#22c55e' }}>{icon}</span>
                              <span>
                                <strong>{callData.type === 'video' ? 'Video Call' : 'Voice Call'}</strong> {isMissed ? 'Missed' : 'Ended'}
                                {callData.duration > 0 && ` · ${durationStr}`}
                              </span>
                            </>
                          );
                        } catch (e) { return null; }
                      })()}
                    </div>
                  )}

                  {/* Action buttons (Reply / Edit / Delete) */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 3 }}>
                    <button onClick={() => setReplyingTo(msg)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', padding: 0 }}>Reply</button>
                    {user?.username === senderName && (
                      <>
                        <button onClick={() => handleStartEdit(msg)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', padding: 0 }}>Edit</button>
                        <button onClick={() => handleDeleteMessage(msg._id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: 11, cursor: 'pointer', padding: 0 }}>Delete</button>
                      </>
                    )}
                  </div>

                  {/* Reactions */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                      {msg.reactions.map((reaction, i) => {
                        const hasReacted = reaction.users.includes(user?._id || user?.id);
                        return (
                          <button
                            key={i}
                            onClick={() => handleToggleReaction(msg._id, reaction.emoji)}
                            style={{
                              background: hasReacted ? 'rgba(88,101,242,0.2)' : 'var(--bg-input)',
                              border: `1px solid ${hasReacted ? '#5865F2' : 'var(--border-color)'}`,
                              borderRadius: 8,
                              padding: '2px 8px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              cursor: 'pointer',
                              color: hasReacted ? '#a5b4fc' : 'var(--text-muted)',
                              fontSize: 12
                            }}
                          >
                            <span>{reaction.emoji}</span>
                            <span>{reaction.users.length}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Reaction Picker floating toolbar */}
                  {hoveredMessageId === msg._id && (
                    <div style={{ position: 'absolute', top: -12, right: 12, background: 'var(--bg-popover)', border: '1px solid var(--border-color)', borderRadius: 8, display: 'flex', gap: 2, padding: '4px 6px', boxShadow: 'var(--shadow-lg)', zIndex: 10 }}>
                      {['👍', '❤️', '😂', '🔥', '😮', '😢', '👏'].map(emoji => (
                        <button
                          key={emoji}
                          onClick={(e) => { e.stopPropagation(); handleToggleReaction(msg._id, emoji); setHoveredMessageId(null); }}
                          className="emoji-btn"
                          style={{ fontSize: 15 }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Uploading indicator */}
        {uploadingFile && (
          <div className="typing-indicator-inline">
            <div className="dots-pulse">
              <span className="dot"></span><span className="dot"></span><span className="dot"></span>
            </div>
            <span>Uploading attachment...</span>
          </div>
        )}

        {/* Typing Banner */}
        {typingArray.length > 0 && (
          <div className="typing-indicator-inline">
            <div className="dots-pulse">
              <span className="dot"></span><span className="dot"></span><span className="dot"></span>
            </div>
            <span>{typingArray.join(', ')} is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Hidden File Input */}
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} accept="image/*,.pdf,.doc,.docx,.txt,.zip" />

      {/* ─── Composer ──────────────────────────────────────────────── */}
      <footer className="chat-composer-container" style={{ position: 'relative', zIndex: 4 }}>

        {/* Emoji Picker Popover */}
        {showEmojiPicker && (
          <div className="emoji-picker-popover" id="emoji-picker" role="dialog" aria-label="Emoji Picker">
            <div className="emoji-picker-header">
              <input type="text" placeholder="Search emojis..." aria-label="Search emojis" style={{ color: 'var(--text-main)' }} />
            </div>
            <div className="emoji-grid" id="emoji-grid">
              {['👍','❤️','🔥','🚀','🎉','😊','😂','😎','💻','🔒','✅','✨','😮','😢','👏','🎨'].map(emoji => (
                <button key={emoji} type="button" className="emoji-btn" onClick={() => { handleAddEmoji(emoji); setShowEmojiPicker(false); }}>{emoji}</button>
              ))}
            </div>
          </div>
        )}

        {/* Reply Banner */}
        {replyingTo && (
          <div style={{ padding: '4px 8px', background: 'var(--bg-input)', borderRadius: 6, border: '1px solid var(--border-color)', fontSize: 11, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Replying to <strong style={{ color: 'var(--color-primary)' }}>@{replyingTo.sender?.username}</strong>: &quot;{replyingTo.content}&quot;
            </span>
            <button onClick={() => setReplyingTo(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}>&times;</button>
          </div>
        )}

        {/* Editing Banner */}
        {editingMessage && (
          <div style={{ padding: '4px 8px', background: 'rgba(147,51,234,0.15)', borderRadius: 6, border: '1px solid #9333ea', fontSize: 11, color: '#a855f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              ✏️ Editing: &quot;{editingMessage.content}&quot;
            </span>
            <button onClick={() => { setEditingMessage(null); setInputText(''); }} style={{ background: 'transparent', border: 'none', color: '#a855f7', cursor: 'pointer', flexShrink: 0 }}>&times;</button>
          </div>
        )}

        {/* Main Composer Form */}
        {isRecordingVoice ? (
          <VoiceRecorder onCancel={() => setIsRecordingVoice(false)} onSend={handleSendVoiceNote} />
        ) : (
          <form className="composer-form" id="composer-form" onSubmit={handleSubmitMessage} autoComplete="off">
            <div className="composer-toolbar-left">
              <button type="button" className="btn-icon" onClick={() => fileInputRef.current?.click()} title="Add Attachment" aria-label="Add Attachment">
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
              </button>
              <button type="button" className="btn-icon encryption-toggle-btn active" title="OMEMO Encryption: Enabled" aria-label="Toggle OMEMO Encryption">
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </button>
            </div>

            <div className="composer-input-wrapper">
              <textarea
                id="composer-textarea"
                className="composer-textarea"
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitMessage(); } }}
                placeholder={
                  editingMessage ? 'Edit message... (Enter to save)' :
                  replyingTo ? `Replying to @${replyingTo.sender?.username}... (Enter to send)` :
                  `Send a message... (Enter to send, Shift+Enter for new line)`
                }
                rows={1}
                maxLength={2000}
                aria-label="Message text composer"
              />
            </div>

            <div className="composer-toolbar-right">
              <button type="button" className="btn-icon" title="Voice Note" aria-label="Voice Note" onMouseDown={() => setIsRecordingVoice(true)}>
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
              </button>
              <button type="button" className="btn-icon" id="emoji-trigger-btn" onClick={() => setShowEmojiPicker(!showEmojiPicker)} title="Insert Emoji" aria-label="Insert Emoji">
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
              </button>
              <button type="submit" className="btn-send" id="btn-send-message" title="Send Message (Enter)" aria-label="Send Message">
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
          </form>
        )}

        {/* Composer Bottom Info Bar */}
        <div className="composer-footer-bar">
          <div className="typing-status-indicator" id="remote-typing-status">
            {typingArray.length > 0 && `${typingArray.join(', ')} is typing...`}
          </div>
          <div className="composer-meta">
            <span className="keyboard-shortcut-hint">Press <strong>Enter</strong> to send</span>
            <span className="char-counter" id="char-counter">{inputText.length} / 2000</span>
          </div>
        </div>
      </footer>

      {/* Lightbox Modal */}
      {previewImageUrl && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={() => setPreviewImageUrl(null)}>
          <img src={previewImageUrl} alt="Preview" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8 }} />
        </div>
      )}

      {/* Voice & Video Call Modals */}
      {/* FIX: Pass callerSocketId so modal routes answer/ICE directly to caller socket */}
      <VoiceCallModal
        isOpen={isVoiceCallOpen}
        roomId={roomId}
        roomName={room.name}
        isIncomingCall={isVoiceIncoming}
        incomingCaller={voiceCaller}
        incomingOffer={voiceOffer}
        callerSocketId={voiceCallerSocketId}
        onCloseCall={() => { setIsVoiceCallOpen(false); setIsVoiceIncoming(false); setVoiceCallerSocketId(null); }}
      />
      {/* Video Call Modal */}
      <VideoCallModal
        isOpen={isVideoCallOpen}
        roomId={roomId}
        roomName={room.name}
        isIncomingCall={isVideoIncoming}
        incomingCaller={videoCaller}
        incomingOffer={videoOffer}
        onCloseCall={() => { setIsVideoCallOpen(false); setIsVideoIncoming(false); setVideoCallerSocketId(null); }}
        callerSocketId={videoCallerSocketId}
      />

      {/* User Profile Modal */}
      {targetProfileId && (
        <UserProfileModal 
          targetUserId={targetProfileId} 
          onClose={() => setTargetProfileId(null)} 
        />
      )}

      {/* Appearance Studio Modal */}
      <AppearanceStudioModal
        isOpen={isStudioOpen}
        onClose={() => setIsStudioOpen(false)}
        targetRoomId={roomId}
        roomName={room.name}
      />
    </div>
  );
}

ChatWindow.propTypes = {
  room: PropTypes.object.isRequired,
  onLeaveRoom: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired
};
