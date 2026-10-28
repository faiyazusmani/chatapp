import { io } from 'socket.io-client';

// Production: points to your live Render backend by default when split-hosted on Vercel.
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.PROD ? 'https://chatapp-jlfd.onrender.com' : 'http://localhost:5000');

/**
 * Socket.io client instance.
 * - autoConnect: false — explicit connection after auth
 * - transports: ['websocket', 'polling'] — prioritized WebSocket connection for zero latency
 * - dynamic auth function reads current JWT token from localStorage on every handshake/reconnect
 */
export const socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  auth: (cb) => {
    let token = null;
    try {
      token = localStorage.getItem('token');
    } catch {
      // ignore
    }
    cb({ token });
  }
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

export const isSocketConnected = () => Boolean(socket && socket.connected);

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
  // Re-authenticate socket with server to ensure personal user room is joined
  try {
    const token = localStorage.getItem('token');
    if (token) {
      socket.emit('authenticate', { token });
    }
  } catch {
    // ignore
  }

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

socket.on('connect_error', (err) => {
  if (import.meta.env.DEV) {
    console.warn('[Socket] Connection error:', err.message);
  }
  emitStatus(false);

  // If rejected due to missing/expired token, refresh auth from localStorage and retry
  try {
    const token = localStorage.getItem('token');
    if (token && (!socket.auth || socket.auth.token !== token)) {
      socket.auth = { token };
      setTimeout(() => {
        if (!socket.connected) socket.connect();
      }, 1200);
    }
  } catch {
    // ignore
  }
});

/**
 * Connect socket with optional token auth metadata
 * @param {string} token
 */
export const connectSocket = (token) => {
  let authToken = token;
  if (!authToken) {
    try {
      authToken = localStorage.getItem('token');
    } catch {
      authToken = null;
    }
  }

  if (authToken) {
    socket.auth = { token: authToken };
  }

  if (!socket.connected) {
    socket.connect();
  } else if (authToken) {
    // If already connected, immediately identify/authenticate on existing socket
    socket.emit('authenticate', { token: authToken });
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
