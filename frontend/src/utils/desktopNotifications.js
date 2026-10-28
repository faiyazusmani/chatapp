/**
 * Desktop Notification helpers (Web Notifications API).
 * Notifications are only shown while the tab is in the background —
 * in-app toasts cover the foreground case.
 */

export const notificationsSupported = () => 'Notification' in window;

/**
 * Request permission (must be called from a user gesture at least once).
 * Silently no-ops if already granted/denied.
 */
export const requestNotificationPermission = () => {
  if (!notificationsSupported()) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }
};

/**
 * Show a desktop notification when the tab is hidden.
 * @param {string} title
 * @param {string} body
 * @param {string} [roomId] — clicking the notification navigates to this room
 * @param {string} [icon]
 */
export const showDesktopNotification = (title, body, roomId, icon) => {
  if (!notificationsSupported()) return;
  if (Notification.permission !== 'granted') return;
  // Only notify when the app is actually in the background
  if (!document.hidden && document.hasFocus()) return;

  try {
    // If ServiceWorker has an active registration with showNotification (standard for Mobile Chrome/Android)
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((reg) => {
        if (reg && typeof reg.showNotification === 'function') {
          reg.showNotification(title, {
            body,
            icon: icon || '/favicon.ico',
            tag: roomId ? `chat-${roomId}` : undefined,
            data: { roomId }
          });
        }
      }).catch(() => {});
    }

    const n = new Notification(title, {
      body,
      icon: icon || undefined,
      tag: roomId ? `chat-${roomId}` : undefined,
    });
    n.onclick = () => {
      window.focus();
      if (roomId) {
        window.dispatchEvent(new CustomEvent('chat-navigate', { detail: { roomId } }));
      }
      n.close();
    };
  } catch (err) {
    // Some browsers throw for oversized icons etc. — never crash chat for a toast
    console.warn('[Notifications] Failed to show desktop notification:', err);
  }
};
