import { useState, useEffect, useRef } from 'react';
import { socket } from '../services/socket';
import { useAuth } from '../context/useAuth';
import api from '../services/api';
import VoiceCallModal from './VoiceCallModal';
import VideoCallModal from './VideoCallModal';
import NotificationToast from './NotificationToast';

export default function ChatWindow({ room, onLeaveRoom, onBack }) {
  const { user } = useAuth();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Real-Time Notifications State
  const [notifications, setNotifications] = useState([]);

  // Image Lightbox Preview State
  const [previewImageUrl, setPreviewImageUrl] = useState(null);

  // Voice Calling State
  const [isVoiceCallOpen, setIsVoiceCallOpen] = useState(false);
  const [isVoiceIncoming, setIsVoiceIncoming] = useState(false);
  const [voiceCaller, setVoiceCaller] = useState(null);
  const [voiceOffer, setVoiceOffer] = useState(null);

  // Video Calling & Screen Sharing State
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  const [isVideoIncoming, setIsVideoIncoming] = useState(false);
  const [videoCaller, setVideoCaller] = useState(null);
  const [videoOffer, setVideoOffer] = useState(null);

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

  useEffect(() => {
    if (!roomId) return;

    const loadMessages = async () => {
      try {
        const response = await api.get(`/messages/${roomId}`);
        setMessages(response.data);
        scrollToBottom();
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

    const handleUserJoined = ({ user: joinedUser }) => {
      if (joinedUser?.username && joinedUser.username !== user?.username) {
        addNotification('User Joined', `${joinedUser.username} joined #${room.name}`, 'join');
      }
    };

    const handleUserLeft = ({ user: leftUser }) => {
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
    const handleCallIncoming = ({ offer, caller }) => {
      setVoiceOffer(offer);
      setVoiceCaller(caller);
      setIsVoiceIncoming(true);
      setIsVoiceCallOpen(true);
      addNotification('Incoming Voice Call', `${caller?.username || 'Member'} is calling...`, 'voice_call');
    };

    // Incoming Video Call Socket Event
    const handleVideoCallIncoming = ({ offer, caller }) => {
      setVideoOffer(offer);
      setVideoCaller(caller);
      setIsVideoIncoming(true);
      setIsVideoCallOpen(true);
      addNotification('Incoming Video Call', `${caller?.username || 'Member'} initiated a video call...`, 'video_call');
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('message_edited', handleMessageEdited);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('user_joined', handleUserJoined);
    socket.on('user_left', handleUserLeft);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stop_typing', handleUserStopTyping);
    socket.on('call_incoming', handleCallIncoming);
    socket.on('video_call_incoming', handleVideoCallIncoming);

    return () => {
      socket.emit('leave_room', { roomId, user });
      socket.off('receive_message', handleReceiveMessage);
      socket.off('message_edited', handleMessageEdited);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('user_joined', handleUserJoined);
      socket.off('user_left', handleUserLeft);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stop_typing', handleUserStopTyping);
      socket.off('call_incoming', handleCallIncoming);
      socket.off('video_call_incoming', handleVideoCallIncoming);
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
    e.preventDefault();
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

  // Quick Emoji selection
  const handleAddEmoji = (emoji) => {
    setInputText((prev) => prev + emoji);
  };

  // Start edit mode
  const handleStartEdit = (msg) => {
    setEditingMessage(msg);
    setInputText(msg.content);
    setReplyingTo(null);
  };

  // Delete message
  const handleDeleteMessage = (msgId) => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      socket.emit('delete_message', { messageId: msgId, roomId });
    }
  };

  // Copy room code
  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Start Voice Call
  const handleStartVoiceCall = () => {
    setIsVoiceIncoming(false);
    setVoiceCaller(null);
    setVoiceOffer(null);
    setIsVoiceCallOpen(true);
  };

  // Start Video Call
  const handleStartVideoCall = () => {
    setIsVideoIncoming(false);
    setVideoCaller(null);
    setVideoOffer(null);
    setIsVideoCallOpen(true);
  };

  // Format timestamp helper
  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isOwnMessage = (msg) => {
    const senderId = msg.sender?._id || msg.sender?.id || msg.sender;
    const currentUserId = user?._id || user?.id;
    return senderId === currentUserId;
  };

  const typingArray = Array.from(typingUsers);

  return (
    <div className="chat-window-container">
      {/* Toast Notifications Overlay */}
      <NotificationToast notifications={notifications} onDismiss={handleDismissNotification} />

      {/* Header */}
      <div className="active-room-header" style={{ marginBottom: 0, borderRadius: 'var(--radius) var(--radius) 0 0' }}>
        <div>
          <button
            className="btn-secondary"
            onClick={onBack}
            style={{ marginBottom: '0.5rem', padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
          >
            &larr; Back to Dashboard
          </button>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span>#</span> {room.name}
            {room.code && (
              <span className="room-code-badge">
                Code: {room.code}
                <button
                  onClick={() => handleCopyCode(room.code)}
                  style={{
                    background: 'transparent',
                    color: 'var(--accent)',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    marginLeft: '0.25rem',
                  }}
                >
                  {copiedCode ? '✓ Copied' : '📋 Copy'}
                </button>
              </span>
            )}
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            className="btn-action-primary"
            onClick={handleStartVoiceCall}
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
          >
            📞 Voice
          </button>
          <button
            className="btn-action-primary"
            onClick={handleStartVideoCall}
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem', backgroundColor: 'var(--accent)' }}
          >
            📹 Video
          </button>
          <span className="room-category-pill">{room.category || 'General'}</span>
          <button
            className="btn-secondary"
            onClick={() => onLeaveRoom(roomId)}
            style={{
              backgroundColor: 'var(--error-bg)',
              borderColor: 'var(--error)',
              color: '#fca5a5',
              fontSize: '0.85rem',
              padding: '0.45rem 0.85rem',
            }}
          >
            Leave Room
          </button>
        </div>
      </div>

      {/* Messages Feed Area */}
      <div className="messages-feed-container">
        {messages.length === 0 ? (
          <div className="no-messages-placeholder">
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>💬</div>
            <h4>No messages yet</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Be the first to say hello in <strong>#{room.name}</strong>!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const own = isOwnMessage(msg);
            return (
              <div
                key={msg._id}
                className={`message-bubble-wrapper ${own ? 'own-message' : 'other-message'}`}
              >
                {!own && (
                  <img
                    src={msg.sender?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${msg.sender?.username}`}
                    alt={msg.sender?.username}
                    className="message-sender-avatar"
                  />
                )}

                <div className="message-content-box">
                  <div className="message-meta-header">
                    <span className="message-sender-name">
                      {own ? 'You' : msg.sender?.username || 'Member'}
                    </span>
                    <span className="message-timestamp">{formatTime(msg.createdAt)}</span>
                  </div>

                  {/* Quoted Parent Reply */}
                  {msg.replyTo && (
                    <div className="reply-quote-preview">
                      <div className="reply-quote-author">
                        Replying to {msg.replyTo.sender?.username || 'Member'}
                      </div>
                      <div className="reply-quote-text">{msg.replyTo.content}</div>
                    </div>
                  )}

                  {/* Image Attachment Preview */}
                  {msg.fileUrl && msg.fileType === 'image' && (
                    <div className="message-image-container">
                      <img
                        src={msg.fileUrl}
                        alt={msg.fileName || 'Attached Image'}
                        className="message-attached-img"
                        onClick={() => setPreviewImageUrl(msg.fileUrl)}
                      />
                    </div>
                  )}

                  {/* PDF / Document Attachment Badge */}
                  {msg.fileUrl && msg.fileType !== 'image' && (
                    <div className="message-file-badge">
                      <span className="file-badge-icon">
                        {msg.fileType === 'pdf' ? '📄' : '📁'}
                      </span>
                      <div className="file-badge-info">
                        <div className="file-name-text">{msg.fileName || 'Attachment'}</div>
                        <a
                          href={msg.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="file-download-link"
                        >
                          Download {msg.fileType === 'pdf' ? 'PDF' : 'File'} &rarr;
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Text Content */}
                  {msg.content && (
                    <div className={`message-text ${msg.isDeleted ? 'deleted-text' : ''}`}>
                      {msg.content}
                      {msg.isEdited && !msg.isDeleted && (
                        <span className="edited-badge"> (edited)</span>
                      )}
                    </div>
                  )}

                  {/* Read Receipt */}
                  <div className="message-footer-meta">
                    <span className="read-receipt-check">✓✓</span>
                  </div>

                  {/* Actions Hover Menu */}
                  {!msg.isDeleted && (
                    <div className="message-actions-popover">
                      <button title="Reply" onClick={() => setReplyingTo(msg)}>
                        💬
                      </button>
                      {own && (
                        <>
                          <button title="Edit Message" onClick={() => handleStartEdit(msg)}>
                            ✏️
                          </button>
                          <button title="Delete Message" onClick={() => handleDeleteMessage(msg._id)}>
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Live Typing Indicator Banner */}
        {typingArray.length > 0 && (
          <div className="typing-indicator-banner">
            <div className="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span>
              {typingArray.join(', ')} {typingArray.length === 1 ? 'is' : 'are'} typing...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Reply / Edit Status Banner */}
      {replyingTo && (
        <div className="reply-active-bar">
          <div>
            <span>Replying to <strong>@{replyingTo.sender?.username}</strong>: </span>
            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
              &quot;{replyingTo.content}&quot;
            </span>
          </div>
          <button onClick={() => setReplyingTo(null)} className="close-reply-btn">
            &times;
          </button>
        </div>
      )}

      {editingMessage && (
        <div className="reply-active-bar" style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)', borderColor: 'var(--primary)' }}>
          <div>
            <span>Editing message: </span>
            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
              &quot;{editingMessage.content}&quot;
            </span>
          </div>
          <button onClick={() => { setEditingMessage(null); setInputText(''); }} className="close-reply-btn">
            &times;
          </button>
        </div>
      )}

      {/* Uploading File Indicator */}
      {uploadingFile && (
        <div className="reply-active-bar" style={{ backgroundColor: 'rgba(6, 182, 212, 0.15)', borderColor: 'var(--accent)' }}>
          <span>⏳ Uploading file attachment...</span>
        </div>
      )}

      {/* Emoji Picker Popover */}
      {showEmojiPicker && (
        <div className="emoji-picker-popover">
          {['❤️', '😂', '👍', '🔥', '🎉', '🚀', '💡', '😎', '👏', '✨', '😍', '🙌'].map((emoji) => (
            <button
              key={emoji}
              className="emoji-btn"
              onClick={() => handleAddEmoji(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        style={{ display: 'none' }}
        accept="image/*,.pdf,.doc,.docx,.txt,.zip"
      />

      {/* Message Input Form */}
      <form onSubmit={handleSubmitMessage} className="chat-input-form">
        <button
          type="button"
          className="emoji-toggle-btn"
          onClick={() => fileInputRef.current?.click()}
          title="Attach Image or File"
        >
          📎
        </button>

        <button
          type="button"
          className="emoji-toggle-btn"
          onClick={() => setShowEmojiPicker((prev) => !prev)}
          title="Add Emoji"
        >
          😀
        </button>

        <input
          type="text"
          className="chat-text-input"
          placeholder={
            editingMessage
              ? 'Edit your message...'
              : replyingTo
              ? `Replying to @${replyingTo.sender?.username}...`
              : `Message #${room.name}...`
          }
          value={inputText}
          onChange={handleInputChange}
          autoFocus
        />

        <button type="submit" className="btn-send-message" disabled={!inputText.trim() && !uploadingFile}>
          {editingMessage ? 'Save Edit' : 'Send 🚀'}
        </button>
      </form>

      {/* Image Lightbox Modal */}
      {previewImageUrl && (
        <div className="modal-overlay" onClick={() => setPreviewImageUrl(null)}>
          <div className="image-lightbox-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setPreviewImageUrl(null)} style={{ float: 'right' }}>
              &times;
            </button>
            <img src={previewImageUrl} alt="Full Preview" style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: '8px' }} />
          </div>
        </div>
      )}

      {/* WebRTC Voice Call Modal */}
      <VoiceCallModal
        isOpen={isVoiceCallOpen}
        roomId={roomId}
        roomName={room.name}
        isIncomingCall={isVoiceIncoming}
        incomingCaller={voiceCaller}
        incomingOffer={voiceOffer}
        onCloseCall={() => {
          setIsVoiceCallOpen(false);
          setIsVoiceIncoming(false);
          setVoiceCaller(null);
          setVoiceOffer(null);
        }}
      />

      {/* WebRTC Video Call & Screen Sharing Modal */}
      <VideoCallModal
        isOpen={isVideoCallOpen}
        roomId={roomId}
        roomName={room.name}
        isIncomingCall={isVideoIncoming}
        incomingCaller={videoCaller}
        incomingOffer={videoOffer}
        onCloseCall={() => {
          setIsVideoCallOpen(false);
          setIsVideoIncoming(false);
          setVideoCaller(null);
          setVideoOffer(null);
        }}
      />
    </div>
  );
}
