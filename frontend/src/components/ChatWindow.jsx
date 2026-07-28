import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { socket } from '../services/socket';
import { useAuth } from '../context/useAuth';
import { useWallpaper } from '../context/WallpaperContext';
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

export default function ChatWindow({ room, onLeaveRoom, onBack, onToggleMobileSidebar }) {
  const { user } = useAuth();
  const { getActiveWallpaperForRoom, personalityState } = useWallpaper();

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
    <div style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--theme-chat-bg)', minWidth: 0, fontFamily: 'var(--theme-font)' }}>
      {/* Notifications Toast */}
      <NotificationToast notifications={notifications} onDismiss={handleDismissNotification} />

      {/* Top Header Bar */}
      <div style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', borderBottom: '1px solid var(--border)', background: 'var(--theme-sidebar-bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          {/* Hamburger Menu (visible only on mobile via CSS class in index.css) */}
          <button className="mobile-hamburger" onClick={onToggleMobileSidebar} title="Menu" style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 18, display: 'none' }}>
            ☰
          </button>
          <button onClick={onBack} title="Back" style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 14 }}>
            ❮
          </button>
          {/* Avatar Icon */}
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700, position: 'relative' }}>
            {getUserInitials(room.name)}
            <span style={{ position: 'absolute', bottom: 0, right: 0, width: 8, height: 8, borderRadius: '50%', background: '#22c55e', border: '1.5px solid #1c1f28' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--theme-header-text, #f3f4f6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{room.name || 'Note to myself'}</div>
            {room.code && <div style={{ fontSize: 10, color: 'var(--theme-text-muted, #6b7280)' }}>Code: #{room.code}</div>}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => setIsStudioOpen(true)}
            title="Chat Personality Studio"
            style={{
              background: 'rgba(124, 58, 237, 0.2)',
              border: '1px solid #7c3aed',
              borderRadius: 6,
              color: '#c084fc',
              padding: '5px 10px',
              fontSize: 12,
              cursor: 'pointer',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            ✨ Studio
          </button>
          <button onClick={handleStartVoiceCall} title="Voice Call" style={{ background: '#222530', border: '1px solid #2d3241', borderRadius: 6, color: '#d1d5db', padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}>
            📞 Voice
          </button>
          <button onClick={handleStartVideoCall} title="Video Call" style={{ background: '#9333ea', border: 'none', borderRadius: 6, color: '#fff', padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}>
            📹 Video
          </button>
          <button title="Share Link" style={{ background: 'transparent', border: 'none', color: '#9ca3af', fontSize: 14, cursor: 'pointer', padding: 6 }}>
            🔗
          </button>
          <button title="Search Chat" style={{ background: 'transparent', border: 'none', color: '#9ca3af', fontSize: 14, cursor: 'pointer', padding: 6 }}>
            🔍
          </button>
          <button onClick={() => onLeaveRoom(roomId)} title="Leave Room" style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: 14, cursor: 'pointer', padding: 6 }}>
            🚪
          </button>
        </div>
      </div>

      {/* Messages Feed Area */}
      <div className="scrollzone" style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12, position: 'relative' }}>
        {/* Dynamic Wallpaper Background Layer */}
        {getActiveWallpaperForRoom(roomId) && (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${getActiveWallpaperForRoom(roomId)})`,
              backgroundSize: personalityState?.controls?.fitMode === 'contain' ? 'contain' : personalityState?.controls?.fitMode === 'fill' ? '100% 100%' : 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              opacity: personalityState?.controls?.opacity ?? 0.85,
              filter: `blur(${personalityState?.controls?.blur || 0}px) brightness(${personalityState?.controls?.brightness || 100}%) contrast(${personalityState?.controls?.contrast || 100}%) saturate(${personalityState?.controls?.saturation || 100}%)`,
              transform: `scale(${(personalityState?.controls?.scale || 100) / 100})`,
              transformOrigin: 'center center',
              transition: 'all 0.15s ease',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
        )}

        {/* Overlay Layer */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: personalityState?.controls?.overlayColor || '#000000',
            opacity: personalityState?.controls?.overlayOpacity ?? 0.2,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        {/* GPU Animated Particles Layer */}
        <AnimatedBackgroundLayer />
        {/* History Banner */}
        <div style={{ textAlign: 'center', color: '#6b7280', fontSize: 11, margin: '8px 0 4px' }}>
          There is no more history
        </div>

        {/* Load More Button */}
        {hasMore && messages.length > 0 && (
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <button 
              onClick={fetchOlderMessages}
              style={{ background: '#2e3342', color: '#9ca3af', border: '1px solid #3f4657', borderRadius: 20, padding: '6px 16px', fontSize: 12, cursor: 'pointer' }}
            >
              Load Older Messages
            </button>
          </div>
        )}

        {/* Date Separator */}
        <div style={{ textAlign: 'center', color: '#6b7280', fontSize: 11, margin: '4px 0 12px' }}>
          Fri 2025-08-01
        </div>

        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#6b7280', padding: '30px 0', fontSize: 13 }}>
            No history in <strong>{room.name}</strong> yet. Send a message!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender?._id === user?._id || msg.sender?.id === user?.id || msg.sender?.username === user?.username;
            const senderName = msg.sender?.username || 'Me';
            const initials = getUserInitials(senderName);

            return (
              <div 
                key={msg._id} 
                onClick={() => setHoveredMessageId(hoveredMessageId === msg._id ? null : msg._id)}
                onMouseLeave={() => setHoveredMessageId(null)}
                style={{ display: 'flex', gap: 10, alignItems: 'flex-start', position: 'relative' }}
              >
                <div style={{ cursor: 'pointer' }} onClick={() => setTargetProfileId(msg.sender?._id || msg.sender?.id)}>
                  <PresenceBadge userId={msg.sender?._id || msg.sender?.id}>
                    <div style={{ width: 32, height: 32, borderRadius: '4px', background: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0, overflow: 'hidden' }}>
                      {msg.sender?.avatar ? (
                        <img src={msg.sender.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        initials
                      )}
                    </div>
                  </PresenceBadge>
                </div>
                <div className="msg-content-wrap" style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--theme-sender-color, #60a5fa)', textShadow: 'var(--theme-text-shadow, none)' }}>{senderName}</span>
                    {msg.sender?.customStatus?.emoji && (
                      <span style={{ fontSize: 11 }} title={msg.sender?.customStatus?.text}>{msg.sender.customStatus.emoji}</span>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--theme-text-muted, #9ca3af)', textShadow: 'var(--theme-text-shadow, none)' }}>{formatTime(msg.createdAt)}</span>
                  </div>

                  {/* Image Attachment */}
                  {msg.fileUrl && msg.fileType === 'image' && (
                    <div className="msg-image-container" style={{ marginTop: 6, borderRadius: 8, overflow: 'hidden', border: '1px solid #2d3241' }}>
                      <img src={msg.fileUrl} alt="Attachment" style={{ width: '100%', maxWidth: 300, display: 'block', cursor: 'pointer' }} onClick={() => setPreviewImageUrl(msg.fileUrl)} />
                    </div>
                  )}

                  {/* Audio Attachment */}
                  {msg.fileUrl && msg.fileType === 'audio' && (
                    <AudioPlayer src={msg.fileUrl} />
                  )}

                  {msg.fileUrl && msg.fileType !== 'image' && msg.fileType !== 'audio' && (
                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--theme-msg-in-bg)', borderRadius: 'var(--theme-radius)', border: '1px solid var(--border)', width: 'fit-content' }}>
                      <span style={{ fontSize: 20 }}>📄</span>
                      <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--theme-sender-color, #60a5fa)', fontSize: 13, textDecoration: 'none' }}>
                        {msg.fileName || 'Download File'}
                      </a>
                    </div>
                  )}

                  {/* Message Text */}
                  {msg.content && msg.fileType !== 'call' && (
                    <div className={isMe ? 'msg-bubble msg-bubble-out' : 'msg-bubble msg-bubble-in'} style={{ fontSize: 13, color: isMe ? 'var(--theme-msg-out-text, #ffffff)' : 'var(--theme-msg-in-text, var(--theme-text-color))', marginTop: 4, lineHeight: '1.4', wordBreak: 'break-word' }}>
                      {msg.content}
                    </div>
                  )}

                  {/* Call History Message */}
                  {msg.fileType === 'call' && (
                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--theme-msg-in-bg)', borderRadius: 'var(--theme-radius)', border: '1px solid var(--border)', width: 'fit-content' }}>
                      {(() => {
                        try {
                          const callData = JSON.parse(msg.content);
                          const isMissed = callData.status === 'missed';
                          const icon = callData.type === 'video' ? '📹' : '📞';
                          const durationStr = callData.duration ? `${Math.floor(callData.duration/60)}m ${callData.duration%60}s` : '';
                          return (
                            <>
                              <div style={{ fontSize: 24, color: isMissed ? '#ef4444' : '#10b981' }}>{icon}</div>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: isMissed ? '#ef4444' : '#e5e7eb' }}>
                                  {callData.type === 'video' ? 'Video Call' : 'Voice Call'} {isMissed ? 'Missed' : 'Ended'}
                                </div>
                                {callData.duration > 0 && <div style={{ fontSize: 11, color: '#9ca3af' }}>Duration: {durationStr}</div>}
                              </div>
                            </>
                          );
                        } catch (e) {
                          return null;
                        }
                      })()}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    <button onClick={() => setReplyingTo(msg)} style={{ background: 'transparent', border: 'none', color: '#6b7280', fontSize: 11, cursor: 'pointer' }}>Reply</button>
                    {user?.username === senderName && (
                      <>
                        <button onClick={() => handleStartEdit(msg)} style={{ background: 'transparent', border: 'none', color: '#6b7280', fontSize: 11, cursor: 'pointer' }}>Edit</button>
                        <button onClick={() => handleDeleteMessage(msg._id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: 11, cursor: 'pointer' }}>Delete</button>
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
                              background: hasReacted ? 'rgba(88, 101, 242, 0.2)' : 'var(--theme-msg-in-bg)',
                              border: `1px solid ${hasReacted ? '#5865F2' : '#2d3241'}`,
                              borderRadius: 8,
                              padding: '2px 6px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              cursor: 'pointer',
                              color: hasReacted ? '#a5b4fc' : '#9ca3af',
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

                  {/* Reaction Picker */}
                  {hoveredMessageId === msg._id && (
                    <div style={{ position: 'absolute', top: -10, right: 10, background: 'var(--theme-chat-bg)', border: '1px solid var(--border)', borderRadius: 6, display: 'flex', gap: 2, padding: 4, boxShadow: '0 4px 10px rgba(0,0,0,0.5)', zIndex: 10 }}>
                      {['👍', '❤️', '😂', '🔥', '😮', '😢', '👏'].map(emoji => (
                        <button 
                          key={emoji}
                          onClick={(e) => { e.stopPropagation(); handleToggleReaction(msg._id, emoji); setHoveredMessageId(null); }}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 16, padding: '2px 4px', borderRadius: 4, transition: 'background 0.2s' }}
                          onMouseOver={(e) => e.currentTarget.style.background = '#2e3342'}
                          onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
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
          <div style={{ fontSize: 11, color: '#a855f7', fontStyle: 'italic' }}>
            ⏳ Uploading attachment...
          </div>
        )}

        {/* Typing Banner */}
        {typingArray.length > 0 && (
          <div style={{ fontSize: 11, color: '#a855f7', fontStyle: 'italic' }}>
            {typingArray.join(', ')} is typing...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Reply Banner */}
      {replyingTo && (
        <div style={{ padding: '6px 16px', background: 'var(--theme-msg-in-bg)', borderTop: '1px solid var(--border)', fontSize: 11, color: '#9ca3af', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Replying to <strong>@{replyingTo.sender?.username}</strong>: &quot;{replyingTo.content}&quot;</span>
          <button onClick={() => setReplyingTo(null)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>&times;</button>
        </div>
      )}

      {/* Editing Banner */}
      {editingMessage && (
        <div style={{ padding: '6px 16px', background: 'rgba(147, 51, 234, 0.2)', borderTop: '1px solid #9333ea', fontSize: 11, color: '#a855f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Editing message: &quot;{editingMessage.content}&quot;</span>
          <button onClick={() => { setEditingMessage(null); setInputText(''); }} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>&times;</button>
        </div>
      )}

      {/* Hidden File Input */}
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} accept="image/*,.pdf,.doc,.docx,.txt,.zip" />

      {/* Gajim Input Toolbar & Textarea */}
      <div style={{ padding: '10px 16px 14px', borderTop: '1px solid var(--border)', background: 'var(--theme-sidebar-bg)' }}>
        {isRecordingVoice ? (
          <VoiceRecorder onCancel={() => setIsRecordingVoice(false)} onSend={handleSendVoiceNote} />
        ) : (
          <form onSubmit={handleSubmitMessage} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--theme-msg-in-bg)', borderRadius: 'var(--theme-radius)', border: '1px solid var(--border)', padding: '6px 12px' }}>
            {/* Emoji */}
            <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} title="Emoji" style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 15 }}>
              😃
            </button>
            {/* Text Input Box */}
            <input
              type="text"
              value={inputText}
              onChange={handleInputChange}
              placeholder={editingMessage ? 'Edit message...' : replyingTo ? `Replying to @${replyingTo.sender?.username}...` : `Message #${room.name || 'room'}...`}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#f3f4f6', fontSize: 13, fontFamily: 'Inter, sans-serif' }}
            />

            {/* Mic */}
            <button type="button" onMouseDown={() => setIsRecordingVoice(true)} title="Voice Note" style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 14 }}>
              🎙️
            </button>
            {/* Paperclip */}
            <button type="button" onClick={() => fileInputRef.current?.click()} title="Attach File" style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 14 }}>
              📎
            </button>
          </form>
        )}
      </div>

      {/* Emoji Picker Popover */}
      {showEmojiPicker && (
        <div style={{ position: 'absolute', bottom: 65, left: 20, background: '#222530', border: '1px solid #2d3241', borderRadius: 8, padding: 8, display: 'flex', gap: 6, zIndex: 100 }}>
          {['❤️', '😂', '👍', '🔥', '🎉', '🚀', '😎', '👏'].map((emoji) => (
            <button key={emoji} onClick={() => handleAddEmoji(emoji)} style={{ background: 'transparent', border: 'none', fontSize: 16, cursor: 'pointer' }}>
              {emoji}
            </button>
          ))}
        </div>
      )}

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

      {/* Chat Personality Studio Modal */}
      <ChatPersonalityStudioModal
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
