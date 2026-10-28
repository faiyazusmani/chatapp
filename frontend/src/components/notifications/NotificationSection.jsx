import { useState, useMemo } from 'react';
import PropTypes from 'prop-types';

export default function NotificationSection({
  notifications = [],
  onClearAll,
  onDismissNotification,
  onOpenRoom,
  onAcceptRequest,
  onDeclineRequest,
  onRequestPermission,
  permissionStatus = 'default'
}) {
  const [filter, setFilter] = useState('All'); // 'All' | 'Messages' | 'Requests'

  const filteredList = useMemo(() => {
    if (filter === 'Messages') return notifications.filter((n) => n.type === 'message');
    if (filter === 'Requests') return notifications.filter((n) => n.type === 'follow_request');
    return notifications;
  }, [notifications, filter]);

  const formatTime = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      const now = new Date();
      const diffSec = Math.floor((now - d) / 1000);
      if (diffSec < 60) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div
      className="notification-section-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        background: 'var(--bg-sidebar, #0e1626)',
        color: '#f8fafc',
        overflow: 'hidden'
      }}
    >
      {/* Header Actions & Filter Chips */}
      <div
        style={{
          padding: '12px 14px 8px 14px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>🔔</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>
              Notifications ({notifications.length})
            </span>
          </div>

          {notifications.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 6,
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
            >
              Clear All
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {['All', 'Messages', 'Requests'].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              style={{
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 14,
                cursor: 'pointer',
                border: 'none',
                background: filter === f ? 'var(--theme-primary, #6366f1)' : 'rgba(255, 255, 255, 0.06)',
                color: filter === f ? '#fff' : '#94a3b8',
                transition: 'all 0.15s ease'
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Browser Permission Prompt Banner (if default/not granted) */}
        {permissionStatus === 'default' && (
          <div
            style={{
              padding: '8px 10px',
              borderRadius: 8,
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.12))',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8
            }}
          >
            <div style={{ fontSize: 11, color: '#cbd5e1' }}>
              Enable system alerts for new messages
            </div>
            <button
              type="button"
              onClick={onRequestPermission}
              style={{
                padding: '3px 8px',
                fontSize: 10,
                fontWeight: 700,
                background: 'var(--theme-primary, #6366f1)',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Enable
            </button>
          </div>
        )}
      </div>

      {/* Notifications Feed */}
      <div
        className="scrollzone"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '10px 12px 24px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8
        }}
      >
        {filteredList.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 16px',
              color: '#64748b',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12
            }}
          >
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24
              }}
            >
              🔔
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8' }}>
                No notifications right now
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
                New incoming messages and follow requests will appear here.
              </div>
            </div>
          </div>
        ) : (
          filteredList.map((notif) => {
            const isMsg = notif.type === 'message';
            const isReq = notif.type === 'follow_request';
            const sender = notif.sender || {};
            const avatar = sender.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=JoyBoy';
            const name = sender.fullName || sender.username || notif.title || 'Someone';

            return (
              <div
                key={notif.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  padding: '10px 12px',
                  background: notif.unread ? 'rgba(99, 102, 241, 0.09)' : 'rgba(255, 255, 255, 0.03)',
                  border: notif.unread
                    ? '1px solid rgba(99, 102, 241, 0.35)'
                    : '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: 10,
                  gap: 10,
                  position: 'relative',
                  cursor: isMsg ? 'pointer' : 'default',
                  transition: 'all 0.15s ease'
                }}
                onClick={() => {
                  if (isMsg && notif.roomId) {
                    onOpenRoom(notif.roomId, notif.id);
                  }
                }}
              >
                {/* Avatar with icon badge */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: '50%',
                      overflow: 'hidden',
                      background: '#1e293b'
                    }}
                  >
                    <img
                      src={avatar}
                      alt={name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <span
                    style={{
                      position: 'absolute',
                      bottom: -2,
                      right: -2,
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      background: isMsg ? '#6366f1' : '#10b981',
                      border: '1.5px solid #0f172a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 8
                    }}
                  >
                    {isMsg ? '💬' : '👥'}
                  </span>
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <span
                      style={{
                        fontSize: 12.5,
                        fontWeight: 700,
                        color: '#f8fafc',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {name}
                    </span>
                    <span style={{ fontSize: 10, color: '#64748b', flexShrink: 0 }}>
                      {formatTime(notif.createdAt)}
                    </span>
                  </div>

                  <p
                    style={{
                      fontSize: 11.5,
                      color: '#cbd5e1',
                      margin: 0,
                      lineHeight: 1.35,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}
                  >
                    {notif.message}
                  </p>

                  {/* Actions depending on type */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    {isMsg && notif.roomId && (
                      <button
                        type="button"
                        onClick={() => onOpenRoom(notif.roomId, notif.id)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '4px 10px',
                          borderRadius: 8,
                          background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                          border: 'none',
                          color: '#fff',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(99, 102, 241, 0.3)'
                        }}
                      >
                        <span>💬</span>
                        <span>Open Chat</span>
                      </button>
                    )}

                    {isReq && notif.targetUserId && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => onAcceptRequest(notif.targetUserId, notif.id)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 8,
                            background: '#10b981',
                            border: 'none',
                            color: '#fff',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeclineRequest(notif.targetUserId, notif.id)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 8,
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#f87171',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Decline
                        </button>
                      </div>
                    )}

                    {/* Dismiss Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDismissNotification(notif.id);
                      }}
                      title="Dismiss notification"
                      style={{
                        marginLeft: 'auto',
                        background: 'transparent',
                        border: 'none',
                        color: '#64748b',
                        fontSize: 13,
                        cursor: 'pointer',
                        padding: '2px 6px',
                        borderRadius: 4
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b'; }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

NotificationSection.propTypes = {
  notifications: PropTypes.array,
  onClearAll: PropTypes.func,
  onDismissNotification: PropTypes.func,
  onOpenRoom: PropTypes.func,
  onAcceptRequest: PropTypes.func,
  onDeclineRequest: PropTypes.func,
  onRequestPermission: PropTypes.func,
  permissionStatus: PropTypes.string
};
