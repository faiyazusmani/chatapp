import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

/**
 * Socket.io client instance (autoConnect: false to allow explicit connection after auth)
 */
export const socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
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
