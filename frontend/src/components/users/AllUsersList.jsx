import { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import api from '../../services/api';
import { socket } from '../../services/socket';
import { useAuth } from '../../context/useAuth';
import StatusViewerModal from '../status/StatusViewerModal';
import UserProfileModal from '../profile/UserProfileModal';

export default function AllUsersList({ onSelectRoom, searchQuery = '', onOpenProfileSetup }) {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [statusModalGroup, setStatusModalGroup] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [selectedProfileUserId, setSelectedProfileUserId] = useState(null);

  // Show a temporary toast notification
  const showToast = useCallback((msg, type = 'info') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Fetch all registered users
  const fetchAllUsers = useCallback(async () => {
    try {
      const res = await api.get('/users/all');
      setUsers(Array.isArray(res.data?.users) ? res.data.users : []);
    } catch (err) {
      console.error('[Fetch All Users Error]', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch pending incoming follow requests
  const fetchPendingRequests = useCallback(async () => {
    try {
      const res = await api.get('/users/follow-requests');
      setPendingRequests(Array.isArray(res.data?.requests) ? res.data.requests : []);
    } catch (err) {
      console.error('[Fetch Pending Requests Error]', err);
    }
  }, []);

  useEffect(() => {
    fetchAllUsers();
    fetchPendingRequests();
  }, [fetchAllUsers, fetchPendingRequests]);

  // Real-time socket listeners
  useEffect(() => {
    const handleFollowRequestReceived = () => {
      fetchPendingRequests();
      fetchAllUsers();
    };

    const handleFollowRequestAccepted = () => {
      fetchPendingRequests();
      fetchAllUsers();
    };

    const handleStatusChanged = () => {
      fetchAllUsers();
    };

    const handleUserDeleted = () => {
      fetchAllUsers();
      fetchPendingRequests();
    };

    socket.on('follow_request_received', handleFollowRequestReceived);
    socket.on('follow_request_accepted', handleFollowRequestAccepted);
    socket.on('status_created', handleStatusChanged);
    socket.on('status_deleted', handleStatusChanged);
    socket.on('user_deleted', handleUserDeleted);

    return () => {
      socket.off('follow_request_received', handleFollowRequestReceived);
      socket.off('follow_request_accepted', handleFollowRequestAccepted);
      socket.off('status_created', handleStatusChanged);
      socket.off('status_deleted', handleStatusChanged);
      socket.off('user_deleted', handleUserDeleted);
    };
  }, [fetchAllUsers, fetchPendingRequests]);

  // Send Follow Request
  const handleSendFollow = async (targetUserId, targetUsername) => {
    try {
      setActionLoadingId(targetUserId);
      const res = await api.post(`/users/${targetUserId}/follow-request`);
      showToast(res.data?.message || `Follow request sent to @${targetUsername}`, 'success');
      fetchAllUsers();
      fetchPendingRequests();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to send follow request', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Accept Follow Request
  const handleAcceptRequest = async (targetUserId, targetUsername) => {
    try {
      setActionLoadingId(targetUserId);
      const res = await api.post(`/users/${targetUserId}/accept-request`);
      showToast(res.data?.message || `Connected with @${targetUsername}!`, 'success');
      fetchAllUsers();
      fetchPendingRequests();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to accept follow request', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Decline Follow Request
  const handleDeclineRequest = async (targetUserId) => {
    try {
      setActionLoadingId(targetUserId);
      await api.post(`/users/${targetUserId}/decline-request`);
      showToast('Follow request declined', 'info');
      fetchAllUsers();
      fetchPendingRequests();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to decline follow request', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Start 1-on-1 Chat
  const handleStartChat = async (targetUserId, targetUsername) => {
    try {
      setActionLoadingId(targetUserId);
      const res = await api.post(`/users/${targetUserId}/direct-room`);
      if (res.data && onSelectRoom) {
        onSelectRoom(res.data);
      }
    } catch (err) {
      showToast(err.response?.data?.message || `Cannot start chat with @${targetUsername}`, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // View Status Story
  const handleViewStatus = async (targetUser) => {
    const isTargetMe = String(targetUser._id) === String(currentUser?._id || currentUser?.id);
    if (!targetUser.canViewStatus && !isSuperAdmin && !isTargetMe) {
      showToast('You must send a follow request and have it accepted first to view this status', 'info');
      return;
    }
    try {
      setActionLoadingId(targetUser._id);
      const res = await api.get(`/status/user/${targetUser._id}`);
      if (res.data?.statuses && res.data.statuses.length > 0) {
        setStatusModalGroup({
          user: targetUser,
          isMe: isTargetMe,
          statuses: res.data.statuses
        });
      } else {
        showToast('No active status stories available', 'info');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Cannot view status', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Open Delete User Confirmation Modal
  const handleDeleteUser = (targetUser) => {
    setUserToDelete(targetUser);
  };

  // Confirm and Execute User Deletion (Super Admin only)
  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      setActionLoadingId(userToDelete._id);
      const res = await api.delete(`/users/${userToDelete._id}`);
      showToast(res.data?.message || 'User deleted successfully', 'success');
      setUserToDelete(null);
      fetchAllUsers();
      fetchPendingRequests();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete user', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Copy User ID to Clipboard
  const handleCopyId = (userId) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(userId);
      setCopiedId(userId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Filter users by search query (username, fullName, or _id)
  const filteredUsers = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const username = (u.username || '').toLowerCase();
      const fullName = (u.fullName || '').toLowerCase();
      const id = String(u._id || '').toLowerCase();
      return username.includes(q) || fullName.includes(q) || id.includes(q);
    });
  }, [users, searchQuery]);

  const isSuperAdmin = currentUser?.role === 'superadmin' || (currentUser?.email || '').toLowerCase() === 'faiyazusmani068@gmail.com';

  return (
    <div
      className="all-users-directory"
      data-lenis-prevent
      role="region"
      aria-label="All Users List"
      tabIndex="0"
      onWheel={(e) => {
        e.stopPropagation();
      }}
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y',
        overscrollBehaviorY: 'contain',
        display: 'flex',
        flexDirection: 'column',
        padding: '6px 10px 24px 10px',
        gap: 8,
        outline: 'none'
      }}
    >
      {/* Toast Alert */}
      {toastMessage && (
        <div
          style={{
            padding: '7px 12px',
            borderRadius: 8,
            fontSize: 11,
            fontWeight: 600,
            color: '#fff',
            background:
              toastMessage.type === 'error'
                ? '#ef4444'
                : toastMessage.type === 'success'
                ? '#10b981'
                : '#3b82f6',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          {toastMessage.text}
        </div>
      )}

      {/* Super Admin Status Banner (Clean Compact Glassmorphism) */}
      {isSuperAdmin && (
        <div
          style={{
            padding: '8px 10px',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.14), rgba(217, 119, 6, 0.08))',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <span style={{ fontSize: 16, flexShrink: 0 }}>👑</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#fef3c7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Super Admin Mode
            </div>
            <div style={{ fontSize: 10, color: '#fde68a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Full access to view all user statuses & chat with anyone
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* PENDING FOLLOW REQUESTS BANNER (If Any)                       */}
      {/* ───────────────────────────────────────────────────────────── */}
      {pendingRequests.length > 0 && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.12))',
            border: '1px solid rgba(139, 92, 246, 0.4)',
            borderRadius: 10,
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>
              <span>🔔</span>
              <span>Pending Requests ({pendingRequests.length})</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {pendingRequests.map((req) => {
              const requester = req.from;
              if (!requester) return null;
              const isBusy = actionLoadingId === requester._id;

              return (
                <div
                  key={req._id || requester._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    background: 'rgba(15, 23, 42, 0.65)',
                    borderRadius: 8,
                    gap: 8
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        overflow: 'hidden',
                        background: 'var(--theme-primary, #6366f1)',
                        flexShrink: 0
                      }}
                    >
                      <img
                        src={requester.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=JoyBoy'}
                        alt={requester.username}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: '#f8fafc',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {requester.fullName || requester.username}
                      </div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>
                        @{requester.username}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleAcceptRequest(requester._id, requester.username)}
                      style={{
                        padding: '4px 8px',
                        fontSize: 10,
                        fontWeight: 700,
                        background: '#10b981',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        cursor: isBusy ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {isBusy ? '...' : '✅ Accept'}
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleDeclineRequest(requester._id)}
                      style={{
                        padding: '4px 6px',
                        fontSize: 10,
                        fontWeight: 600,
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: '#f87171',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: 6,
                        cursor: isBusy ? 'not-allowed' : 'pointer'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Directory Section Subtitle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Community Members ({filteredUsers.length})
        </div>
        <div style={{ fontSize: 10, color: '#64748b' }}>
          Tap avatar for status
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* USERS LIST                                                   */}
      {/* ───────────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 4 }}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                height: 56,
                borderRadius: 10,
                background: 'rgba(255,255,255,0.04)',
                animation: 'pulse 1.5s infinite'
              }}
            />
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div
          style={{
            padding: '24px 16px',
            textAlign: 'center',
            color: '#64748b',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6
          }}
        >
          <span style={{ fontSize: 28 }}>🔍</span>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>
            No users found
          </div>
          <div style={{ fontSize: 11 }}>
            {searchQuery ? `No user matches "${searchQuery}"` : 'No registered users available.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filteredUsers.map((target) => {
            const isMe = String(target._id) === String(currentUser?._id || currentUser?.id);
            const isTargetSuperAdmin = target.role === 'superadmin' || (target.email || '').toLowerCase() === 'faiyazusmani068@gmail.com';
            const isBusy = actionLoadingId === target._id;
            const canViewTargetStory = Boolean(target.hasActiveStatus && target.canViewStatus);

            return (
              <div
                key={target._id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '9px 10px',
                  background: isMe ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                  border: isMe
                    ? '1px solid rgba(99, 102, 241, 0.35)'
                    : isTargetSuperAdmin
                    ? '1px solid rgba(245, 158, 11, 0.35)'
                    : '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: 10,
                  gap: 10,
                  transition: 'all 0.18s ease'
                }}
              >
                {/* Left: Avatar with WhatsApp Status Ring */}
                <div
                  style={{
                    position: 'relative',
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                  title={canViewTargetStory ? 'Active Status Story (View in Profile)' : `View @${target.username}'s profile`}
                  onClick={() => {
                    if (isMe) {
                      onOpenProfileSetup?.();
                    } else {
                      setSelectedProfileUserId(target._id);
                    }
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      padding: canViewTargetStory ? 2 : 0,
                      background: canViewTargetStory
                        ? 'linear-gradient(135deg, #10b981, #22c55e)'
                        : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: canViewTargetStory ? '0 0 8px rgba(16, 185, 129, 0.45)' : 'none'
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        background: '#1e293b'
                      }}
                    >
                      <img
                        src={target.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=JoyBoy'}
                        alt={target.username}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  </div>

                  {/* Status Indicator Dot */}
                  {target.hasActiveStatus && (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: -1,
                        right: -1,
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        background: '#10b981',
                        border: '2px solid #0f172a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 7,
                        color: '#fff',
                        fontWeight: 900
                      }}
                      title="Active Status Story"
                    >
                      ●
                    </span>
                  )}
                </div>

                {/* Middle: Name, Badges, Username, ID */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* Row 1: Name and Badges */}
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}
                    onClick={() => {
                      if (isMe) {
                        onOpenProfileSetup?.();
                      } else {
                        setSelectedProfileUserId(target._id);
                      }
                    }}
                    title={`Click to view @${target.username}'s profile`}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: '#f8fafc',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {target.fullName || target.username}
                    </span>

                    {/* Role Badges */}
                    {isTargetSuperAdmin && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 800,
                          padding: '1px 5px',
                          borderRadius: 8,
                          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                          color: '#fff',
                          letterSpacing: 0.3,
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}
                      >
                        👑 Admin
                      </span>
                    )}

                    {target.role === 'admin' && !isTargetSuperAdmin && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: 8,
                          background: '#6366f1',
                          color: '#fff',
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}
                      >
                        🛡️ Mod
                      </span>
                    )}

                    {isMe && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: 8,
                          background: 'rgba(255,255,255,0.12)',
                          color: '#cbd5e1',
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}
                      >
                        You
                      </span>
                    )}
                  </div>

                  {/* Row 2: Delete Option (Only for Super Admin) */}
                  {isSuperAdmin && !isMe && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <button
                        type="button"
                        disabled={actionLoadingId === target._id}
                        onClick={() => handleDeleteUser(target)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                          padding: '2px 7px',
                          borderRadius: 6,
                          background: 'rgba(239, 68, 68, 0.12)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#f87171',
                          fontSize: 10,
                          fontWeight: 600,
                          cursor: actionLoadingId === target._id ? 'not-allowed' : 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        title={`Delete user @${target.username}`}
                      >
                        <span>🗑️</span>
                        <span>Delete</span>
                      </button>
                    </div>
                  )}


                </div>

                {/* Right: Exactly ONE Clean Action Button */}
                <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  {isMe ? (
                    <button
                      type="button"
                      onClick={onOpenProfileSetup}
                      style={{
                        padding: '5px 9px',
                        fontSize: 10,
                        fontWeight: 600,
                        background: 'rgba(255, 255, 255, 0.08)',
                        color: '#e2e8f0',
                        border: 'none',
                        borderRadius: 12,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Edit
                    </button>
                  ) : isSuperAdmin ? (
                    /* Super Admin has full direct chat access */
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleStartChat(target._id, target.username)}
                      style={{
                        padding: '5px 12px',
                        fontSize: 11,
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 14,
                        cursor: isBusy ? 'not-allowed' : 'pointer',
                        boxShadow: '0 2px 6px rgba(245, 158, 11, 0.3)',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {isBusy ? '...' : '💬 Chat'}
                    </button>
                  ) : target.connectionStatus === 'following' ? (
                    /* Connected: Instant 1-on-1 Chat */
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleStartChat(target._id, target.username)}
                      style={{
                        padding: '5px 12px',
                        fontSize: 11,
                        fontWeight: 700,
                        background: 'var(--theme-primary, #6366f1)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 14,
                        cursor: isBusy ? 'not-allowed' : 'pointer',
                        boxShadow: '0 2px 6px rgba(99, 102, 241, 0.3)',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {isBusy ? '...' : '💬 Chat'}
                    </button>
                  ) : target.connectionStatus === 'requested' ? (
                    /* Follow Request Sent */
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '4px 8px',
                        borderRadius: 12,
                        background: 'rgba(245, 158, 11, 0.15)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        color: '#fbbf24',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      ⏳ Sent
                    </span>
                  ) : target.connectionStatus === 'pending_approval' ? (
                    /* Incoming Request Needs Decision */
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleAcceptRequest(target._id, target.username)}
                        style={{
                          padding: '4px 8px',
                          fontSize: 10,
                          fontWeight: 700,
                          background: '#10b981',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 12,
                          cursor: isBusy ? 'not-allowed' : 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {isBusy ? '...' : '✅ Accept'}
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleDeclineRequest(target._id)}
                        style={{
                          padding: '4px 6px',
                          fontSize: 10,
                          fontWeight: 600,
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: '#f87171',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          borderRadius: 12,
                          cursor: isBusy ? 'not-allowed' : 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    /* Not Connected: Send Follow Request */
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleSendFollow(target._id, target.username)}
                      style={{
                        padding: '5px 12px',
                        fontSize: 11,
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 14,
                        cursor: isBusy ? 'not-allowed' : 'pointer',
                        boxShadow: '0 2px 6px rgba(99, 102, 241, 0.3)',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {isBusy ? '...' : '+ Follow'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* WhatsApp-Style Status Story Viewer Modal */}
      {statusModalGroup && (
        <StatusViewerModal
          isOpen={Boolean(statusModalGroup)}
          onClose={() => setStatusModalGroup(null)}
          statusGroup={statusModalGroup}
        />
      )}

      {/* Delete User Confirmation Modal (Super Admin only) */}
      {userToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: 16
          }}
          onClick={() => setUserToDelete(null)}
        >
          <div
            style={{
              background: '#1e293b',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: 14,
              padding: '18px 20px',
              maxWidth: 340,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.6)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  flexShrink: 0
                }}
              >
                🗑️
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>
                  Delete User
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>
                  Super Admin Action
                </div>
              </div>
            </div>

            <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 }}>
              Are you sure you want to permanently delete user{' '}
              <strong style={{ color: '#f87171' }}>
                {userToDelete.fullName || userToDelete.username}
              </strong>{' '}
              (@{userToDelete.username})?
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: '#cbd5e1',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoadingId === userToDelete._id}
                onClick={confirmDeleteUser}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  background: '#ef4444',
                  border: 'none',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: actionLoadingId === userToDelete._id ? 'not-allowed' : 'pointer'
                }}
              >
                {actionLoadingId === userToDelete._id ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Profile Modal (View profile & stories) */}
      {selectedProfileUserId && (
        <UserProfileModal
          targetUserId={selectedProfileUserId}
          isMe={String(selectedProfileUserId) === String(currentUser?._id || currentUser?.id)}
          onClose={() => {
            setSelectedProfileUserId(null);
            fetchAllUsers();
          }}
        />
      )}
    </div>
  );
}

AllUsersList.propTypes = {
  onSelectRoom: PropTypes.func,
  searchQuery: PropTypes.string,
  onOpenProfileSetup: PropTypes.func
};
