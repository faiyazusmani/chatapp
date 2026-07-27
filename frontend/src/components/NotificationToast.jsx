export default function NotificationToast({ notifications, onDismiss }) {
  if (!notifications || notifications.length === 0) return null;

  const getToastIcon = (type) => {
    switch (type) {
      case 'join': return '👋';
      case 'leave': return '🚪';
      case 'message': return '💬';
      case 'voice_call': return '📞';
      case 'video_call': return '📹';
      default: return '🔔';
    }
  };

  return (
    <div className="toast-notifications-container">
      {notifications.map((toast) => (
        <div key={toast.id} className={`toast-notification-item toast-type-${toast.type || 'info'}`}>
          <span className="toast-icon">{getToastIcon(toast.type)}</span>
          <div className="toast-content-wrapper">
            <div className="toast-title">{toast.title || 'Notification'}</div>
            <div className="toast-body">{toast.message}</div>
          </div>
          <button className="toast-close-btn" onClick={() => onDismiss(toast.id)}>
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
