import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import api from '../../services/api';
import { socket } from '../../services/socket';
import { useAuth } from '../../context/useAuth';
import CreateStatusModal from './CreateStatusModal';
import StatusViewerModal from './StatusViewerModal';

export default function StatusList({ onOpenProfileSetup }) {
  const { user } = useAuth();
  const [statusGroups, setStatusGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);

  // Fetch active statuses from server
  const fetchStatuses = useCallback(async () => {
    try {
      const res = await api.get('/status');
      setStatusGroups(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('[Fetch Status Error]', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  // Real-time socket listeners
  useEffect(() => {
    const onStatusCreated = () => fetchStatuses();
    const onStatusDeleted = () => fetchStatuses();
    const onStatusViewed = () => fetchStatuses();

    socket.on('status_created', onStatusCreated);
    socket.on('status_deleted', onStatusDeleted);
    socket.on('status_viewed', onStatusViewed);

    return () => {
      socket.off('status_created', onStatusCreated);
      socket.off('status_deleted', onStatusDeleted);
      socket.off('status_viewed', onStatusViewed);
    };
  }, [fetchStatuses]);

  const currentUserId = user?._id || user?.id;

  // Separate my status group from other contacts' statuses
  const myGroup = statusGroups.find(
    (g) => (g.user?._id ? g.user._id.toString() : g.user?.toString()) === currentUserId?.toString()
  );

  const otherGroups = statusGroups.filter(
    (g) => (g.user?._id ? g.user._id.toString() : g.user?.toString()) !== currentUserId?.toString()
  );

  const recentUpdates = otherGroups.filter((g) => g.hasUnviewed);
  const viewedUpdates = otherGroups.filter((g) => !g.hasUnviewed);

  // Format timestamp helper
  const formatTime = (dateStr) => {
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

  return (
    <div
      className="status-list-container"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflowY: 'auto',
        background: 'var(--bg-sidebar, #0e1626)',
        color: '#f8fafc'
      }}
    >
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. MY STATUS SECTION (WhatsApp Style)                          */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div style={{ padding: '16px 14px 10px 14px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            My Status
          </span>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 8px',
              fontSize: 11,
              fontWeight: 700,
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 6,
              cursor: 'pointer'
            }}
          >
            + Add Photo/Video
          </button>
        </div>

        <div
          onClick={() => {
            if (myGroup && myGroup.statuses?.length > 0) {
              setSelectedGroup({ ...myGroup, isMe: true });
            } else {
              setIsCreateOpen(true);
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 12px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 14,
            cursor: 'pointer',
            transition: 'background 0.15s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'; }}
        >
          {/* Avatar with WhatsApp ring or + badge */}
          <div style={{ position: 'relative', width: 46, height: 46, flexShrink: 0 }}>
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                padding: myGroup?.statuses?.length > 0 ? 2 : 0,
                background: myGroup?.statuses?.length > 0 ? '#10b981' : 'transparent',
                boxShadow: myGroup?.statuses?.length > 0 ? '0 0 10px rgba(16, 185, 129, 0.5)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <img
                src={user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.username || 'user'}`}
                alt="My Avatar"
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid var(--bg-sidebar, #0e1626)'
                }}
              />
            </div>

            {/* Plus badge if no status */}
            {(!myGroup || myGroup.statuses?.length === 0) && (
              <div
                style={{
                  position: 'absolute',
                  bottom: -1,
                  right: -1,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: '#10b981',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 900,
                  border: '2px solid var(--bg-sidebar, #0e1626)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                }}
              >
                +
              </div>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              My Status
            </div>
            <div style={{ fontSize: 11.5, color: myGroup?.statuses?.length > 0 ? '#34d399' : '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {myGroup?.statuses?.length > 0
                ? `${myGroup.statuses.length} media story · ${formatTime(myGroup.statuses[myGroup.statuses.length - 1].createdAt)}`
                : 'Tap to add personal photo or video status'}
            </div>
          </div>

          {/* Quick action buttons on My Status */}
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsCreateOpen(true);
              }}
              title="Upload personal photo or video status"
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#f8fafc',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14
              }}
            >
              📸
            </button>
          </div>
        </div>
      </div>

      <div style={{ height: 1, background: 'rgba(255, 255, 255, 0.06)', margin: '4px 14px' }} />

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. RECENT UPDATES SECTION (WhatsApp Style)                     */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            Loading status updates...
          </div>
        ) : otherGroups.length === 0 ? (
          <div
            style={{
              padding: '30px 16px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1.5px dashed rgba(16, 185, 129, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24
              }}
            >
              🟢
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>
                No Status Updates Yet
              </div>
              <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', lineHeight: 1.45 }}>
                Status updates from your room members and contacts will appear here.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              style={{
                marginTop: 4,
                padding: '8px 18px',
                fontSize: 12.5,
                fontWeight: 700,
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
              }}
            >
              Post First Status
            </button>
          </div>
        ) : (
          <>
            {/* Unviewed Recent Updates */}
            {recentUpdates.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  Recent Updates ({recentUpdates.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {recentUpdates.map((group) => {
                    const u = group.user;
                    const latest = group.statuses[group.statuses.length - 1];
                    return (
                      <div
                        key={u?._id || u?.id}
                        onClick={() => setSelectedGroup(group)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '8px 10px',
                          borderRadius: 12,
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'; }}
                      >
                        {/* Avatar with Vibrant Green Ring (Unviewed) */}
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: '50%',
                            padding: 2,
                            background: '#22c55e',
                            boxShadow: '0 0 10px rgba(34, 197, 94, 0.55)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          <img
                            src={u?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${u?.username || 'user'}`}
                            alt={u?.username}
                            style={{
                              width: '100%',
                              height: '100%',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '2px solid var(--bg-sidebar, #0e1626)'
                            }}
                          />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {u?.fullName || u?.username || 'Chat Contact'}
                          </div>
                          <div style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {latest?.type === 'image' ? '📷 Photo' : latest?.content ? `"${latest.content}"` : 'Status update'} · {formatTime(latest?.createdAt)}
                          </div>
                        </div>

                        <span style={{ fontSize: 10, color: '#34d399', fontWeight: 700, background: 'rgba(34, 197, 94, 0.15)', padding: '2px 6px', borderRadius: 10 }}>
                          {group.statuses.length}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Viewed Updates */}
            {viewedUpdates.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, marginTop: recentUpdates.length > 0 ? 8 : 0 }}>
                  Viewed Updates ({viewedUpdates.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {viewedUpdates.map((group) => {
                    const u = group.user;
                    const latest = group.statuses[group.statuses.length - 1];
                    return (
                      <div
                        key={u?._id || u?.id}
                        onClick={() => setSelectedGroup(group)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '8px 10px',
                          borderRadius: 12,
                          background: 'rgba(255, 255, 255, 0.015)',
                          border: '1px solid rgba(255, 255, 255, 0.04)',
                          cursor: 'pointer',
                          opacity: 0.85,
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.015)'; }}
                      >
                        {/* Avatar with Muted Gray Ring (Already Viewed) */}
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: '50%',
                            padding: 2,
                            background: '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          <img
                            src={u?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${u?.username || 'user'}`}
                            alt={u?.username}
                            style={{
                              width: '100%',
                              height: '100%',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '2px solid var(--bg-sidebar, #0e1626)'
                            }}
                          />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {u?.fullName || u?.username || 'Chat Contact'}
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {formatTime(latest?.createdAt)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* WhatsApp Status Modals */}
      <CreateStatusModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onStatusCreated={() => fetchStatuses()}
      />

      <StatusViewerModal
        isOpen={Boolean(selectedGroup)}
        onClose={() => setSelectedGroup(null)}
        statusGroup={selectedGroup}
        onDeleteStatus={() => fetchStatuses()}
      />
    </div>
  );
}

StatusList.propTypes = {
  onOpenProfileSetup: PropTypes.func
};
