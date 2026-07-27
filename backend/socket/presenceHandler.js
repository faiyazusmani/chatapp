const User = require('../models/User');

// Track online users mapping userId -> Set of socket IDs
const onlineUsers = new Map();

/**
 * Handles presence (Online/Offline/Away) updates.
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
module.exports = (io, socket) => {
  const userId = socket.user?._id || socket.user?.id;

  if (userId) {
    // Add to online map
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // If this is the first connection for the user, update DB and broadcast online
    if (onlineUsers.get(userId).size === 1) {
      updateStatus(userId, 'online');
    }
  }

  // Handle Away
  socket.on('user_away', () => {
    if (userId) {
      updateStatus(userId, 'away');
    }
  });

  // Handle Active (Return from Away)
  socket.on('user_active', () => {
    if (userId) {
      updateStatus(userId, 'online');
    }
  });

  // Handle Disconnect
  socket.on('disconnect', () => {
    if (userId && onlineUsers.has(userId)) {
      const userSockets = onlineUsers.get(userId);
      userSockets.delete(socket.id);

      // If no sockets left, user is offline
      if (userSockets.size === 0) {
        onlineUsers.delete(userId);
        updateStatus(userId, 'offline', Date.now());
      }
    }
  });

  // Helper to update DB and emit
  async function updateStatus(uid, status, lastSeen = null) {
    try {
      const updateData = { status };
      if (lastSeen) {
        updateData.lastSeen = lastSeen;
      }
      
      // We only update if DB is connected (safeguard)
      if (require('mongoose').connection.readyState === 1) {
        await User.findByIdAndUpdate(uid, updateData);
      }
      
      io.emit('user_status_changed', {
        userId: uid,
        status,
        lastSeen: lastSeen || Date.now()
      });
      console.log(`[Presence] User ${uid} is now ${status}`);
    } catch (err) {
      console.error('[Presence] Error updating status:', err);
    }
  }
};
