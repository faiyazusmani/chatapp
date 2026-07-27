import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

/**
 * Socket.io client instance (autoConnect: false to allow explicit connection after auth)
 */
export const socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
});

// Socket Connection Events
socket.on('connect', () => {
  console.group('%c[Socket] ⚡ Socket Connected', 'color:#06b6d4;font-weight:bold');
  console.log('  id:', socket.id);
  console.groupEnd();
});

socket.on('disconnect', (reason) => {
  console.group('%c[Socket] 🔌 Socket Disconnected', 'color:#ef4444;font-weight:bold');
  console.log('  reason:', reason);
  console.groupEnd();
});

/**
 * Connect socket with optional token auth metadata
 * @param {string} token 
 */
export const connectSocket = (token) => {
  if (token) {
    socket.auth = { token };
  }
  if (!socket.connected) {
    socket.connect();
  }
};

/**
 * Disconnect socket connection
 */
export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};
