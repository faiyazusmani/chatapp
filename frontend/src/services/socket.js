import { io } from 'socket.io-client';

// Production: same-origin by default (Vercel frontend + Render backend behind
// the same domain via rewrites). Override with VITE_SOCKET_URL when split-hosted.
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.PROD ? window.location.origin : 'http://localhost:5000');

/**
 * Socket.io client instance.
 * - autoConnect: false — explicit connection after auth
 * - Bounded reconnection (10 attempts, 1s→8s backoff) so an unreachable
 *   server doesn't hammer the network forever
 */
export const socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 8000,
  timeout: 15000,
});

// ── Connection status listeners (for UI banners) ──────────────────
const statusListeners = new Set();
let isConnected = false;

const emitStatus = (connected) => {
  if (isConnected === connected) return;
  isConnected = connected;
  statusListeners.forEach((cb) => cb(connected));
};

/**
 * Subscribe to connection-status changes (true = connected, false = disconnected).
 * Returns an unsubscribe function.
 */
export const onSocketStatusChange = (cb) => {
  statusListeners.add(cb);
  return () => statusListeners.delete(cb);
};

export const isSocketConnected = () => isConnected;

// ── Active-room registry (used to rejoin after a reconnect) ───────
const activeRoomIds = new Set();

export const registerActiveRoom = (roomId) => {
  activeRoomIds.add(roomId);
};

export const unregisterActiveRoom = (roomId) => {
  activeRoomIds.delete(roomId);
};

// ── Socket Connection Events ──────────────────────────────────────
socket.on('connect', () => {
  // Rejoin every active room — socket.io does NOT preserve server-side
  // rooms across a reconnection, so messages would silently stop arriving.
  activeRoomIds.forEach((roomId) => socket.emit('join_room', { roomId }));
  if (import.meta.env.DEV) {
    console.group('%c[Socket] ⚡ Socket Connected', 'color:#06b6d4;font-weight:bold');
    console.log('  id:', socket.id);
    console.groupEnd();
  }
  emitStatus(true);
});

socket.on('disconnect', (reason) => {
  if (import.meta.env.DEV) {
    console.group('%c[Socket] 🔌 Socket Disconnected', 'color:#ef4444;font-weight:bold');
    console.log('  reason:', reason);
    console.groupEnd();
  }
  emitStatus(false);
});

/**
 * Connect socket with optional token auth metadata
 * @param {string} token
 */
export const connectSocket = (token) => {
  if (token) {
    socket.auth = { token };
  } else {
    // ensure no auth token is set when relying on cookie-based auth
    if (socket.auth) delete socket.auth;
  }
  if (!socket.connected) {
    socket.connect();
  }
};

/**
 * Disconnect socket connection
 */
export const disconnectSocket = () => {
  activeRoomIds.clear();
  if (socket.connected) {
    socket.disconnect();
  }
};
