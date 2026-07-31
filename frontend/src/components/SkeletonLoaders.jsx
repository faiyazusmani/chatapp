import '../styles/gajim/gajim-provided.css';

/**
 * SkeletonChatItem — shimmering placeholder for a chat list row
 */
export function SkeletonChatItem() {
  return (
    <div className="chat-item skeleton" style={{ pointerEvents: 'none' }}>
      <div className="avatar-circle skeleton-avatar" style={{ width: 36, height: 36, borderRadius: '50%' }} />
      <div className="chat-item-content" style={{ flex: 1 }}>
        <div className="chat-item-top">
          <div className="skeleton-text" style={{ width: '60%', height: 14, borderRadius: 4 }} />
          <div className="skeleton-text" style={{ width: '30%', height: 12, borderRadius: 4, marginLeft: 'auto' }} />
        </div>
        <div className="chat-item-bottom">
          <div className="skeleton-text" style={{ width: '80%', height: 12, borderRadius: 4 }} />
        </div>
      </div>
    </div>
  );
}

/**
 * SkeletonMessage — shimmering placeholder for a message row
 */
export function SkeletonMessage({ isMe = false }) {
  return (
    <div className={`message-row skeleton ${isMe ? 'message-row--me' : ''}`} style={{ pointerEvents: 'none', animation: 'message-appear 150ms ease-out' }}>
      {!isMe && <div className="avatar-circle skeleton-avatar" style={{ width: 34, height: 34, borderRadius: 6 }} />}
      <div className="msg-content-wrap skeleton" style={{ flex: 1 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
          <div className="skeleton-text" style={{ width: '30%', height: 13, borderRadius: 4 }} />
          <div className="skeleton-text" style={{ width: '20%', height: 11, borderRadius: 4 }} />
        </div>
        <div className="skeleton-text" style={{ width: '70%', height: 16, borderRadius: 4 }} />
        <div className="skeleton-text" style={{ width: '45%', height: 16, borderRadius: 4, marginTop: 6 }} />
      </div>
    </div>
  );
}

/**
 * SkeletonMessageList — multiple skeleton messages for initial load
 */
export function SkeletonMessageList({ count = 5 }) {
  const items = Array.from({ length: count }, (_, i) => (
    <SkeletonMessage key={i} isMe={i % 3 === 0} />
  ));
  return (
    <div className="messages-loading-skeleton" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12 }}>
      {items}
    </div>
  );
}

/**
 * SkeletonRoomCard — for room grid/list in explore view
 */
export function SkeletonRoomCard() {
  return (
    <div className="room-card skeleton" style={{ pointerEvents: 'none' }}>
      <div className="room-card-image skeleton-avatar" style={{ aspectRatio: '16/9', borderRadius: 'var(--radius-md)  var(--radius-md) 0 0' }} />
      <div className="room-card-body" style={{ padding: 12 }}>
        <div className="skeleton-text" style={{ width: '70%', height: 16, borderRadius: 4, marginBottom: 8 }} />
        <div className="skeleton-text" style={{ width: '90%', height: 12, borderRadius: 4, marginBottom: 4 }} />
        <div className="skeleton-text" style={{ width: '50%', height: 12, borderRadius: 4 }} />
      </div>
    </div>
  );
}

/**
 * SkeletonProfile — for user profile loading
 */
export function SkeletonProfile() {
  return (
    <div className="profile-skeleton" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 24 }}>
      <div className="avatar-circle skeleton-avatar" style={{ width: 80, height: 80, borderRadius: '50%' }} />
      <div className="skeleton-text" style={{ width: '50%', height: 20, borderRadius: 4 }} />
      <div className="skeleton-text" style={{ width: '70%', height: 14, borderRadius: 4, color: 'var(--text-muted)' }} />
      <div className="skeleton-text" style={{ width: '60%', height: 12, borderRadius: 4, marginTop: 16 }} />
      <div className="skeleton-text" style={{ width: '80%', height: 12, borderRadius: 4, marginTop: 8 }} />
    </div>
  );
}

/**
 * SkeletonNotification — for notification list loading
 */
export function SkeletonNotification() {
  return (
    <div className="notification-item skeleton" style={{ pointerEvents: 'none', padding: '12 16', borderBottom: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div className="avatar-circle skeleton-avatar" style={{ width: 40, height: 40, borderRadius: '50%' }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton-text" style={{ width: '60%', height: 14, borderRadius: 4, marginBottom: 4 }} />
          <div className="skeleton-text" style={{ width: '90%', height: 12, borderRadius: 4 }} />
        </div>
      </div>
    </div>
  );
}

/**
 * SkeletonCallHistory — for call history loading
 */
export function SkeletonCallHistory() {
  return (
    <div className="call-history-skeleton" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12 }}>
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="call-history-item skeleton" style={{ pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: 8 }}>
          <div className="avatar-circle skeleton-avatar" style={{ width: 44, height: 44, borderRadius: '50%' }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton-text" style={{ width: '50%', height: 14, borderRadius: 4, marginBottom: 4 }} />
            <div className="skeleton-text" style={{ width: '40%', height: 11, borderRadius: 4 }} />
          </div>
          <div className="skeleton-text" style={{ width: 60, height: 14, borderRadius: 4 }} />
        </div>
      ))}
    </div>
  );
}

/**
 * Global shimmer keyframes — add to index.css if not present
 * (Already defined in gajim-provided.css via @keyframes shimmer)
 */
export const shimmerKeyframes = `
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.skeleton {
  background: linear-gradient(
    90deg,
    var(--bg-elevated) 25%,
    var(--bg-hover) 50%,
    var(--bg-elevated) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
.skeleton-avatar {
  border-radius: inherit;
}
.skeleton-text {
  border-radius: 4px;
}
`;