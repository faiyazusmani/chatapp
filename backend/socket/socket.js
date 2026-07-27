const { Server } = require('socket.io');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const User = require('../models/User');
const { memoryMessages } = require('../controllers/messageController');
const presenceHandler = require('./presenceHandler');

let io;

/**
 * Check if MongoDB connection is active
 */
const isDBConnected = () => mongoose.connection.readyState === 1;

/**
 * Initialize Socket.io server with CORS and event listeners
 * @param {import('http').Server} server 
 * @returns {Server}
 */
const initSocket = (server) => {
  const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((url) => url.trim());

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || (typeof origin === 'string' && origin.endsWith('.vercel.app'))) {
          callback(null, true);
        } else {
          callback(new Error(`[Socket CORS Error] Blocked origin ${origin}`));
        }
      },
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Socket Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        // Allow unauthenticated sockets for now (fallback), but presence won't work
        return next();
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // If DB is connected, fetch user to ensure they exist
      if (isDBConnected()) {
        const user = await User.findById(decoded.id).select('-password');
        if (user) {
          socket.user = user;
        }
      } else {
        socket.user = { id: decoded.id };
      }
      next();
    } catch (err) {
      console.error('[Socket Auth Error]', err.message);
      // We still allow connection, but without user object
      next();
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);
    
    // Initialize Presence System for this socket
    presenceHandler(io, socket);

    // Join room
    socket.on('join_room', ({ roomId, user }) => {
      socket.roomId = roomId;
      socket.user = user;
      socket.join(roomId);
      console.log(`[Socket.io] User ${user?.username || socket.id} joined room: ${roomId}`);
      socket.to(roomId).emit('user_joined', { user, roomId });
    });

    // Leave room
    socket.on('leave_room', ({ roomId, user }) => {
      socket.leave(roomId);
      socket.roomId = null;
      socket.user = null;
      console.log(`[Socket.io] User ${user?.username || socket.id} left room: ${roomId}`);
      socket.to(roomId).emit('user_left', { user, roomId });
    });

    // Typing start
    socket.on('typing_start', ({ roomId, username }) => {
      socket.to(roomId).emit('user_typing', { username, roomId });
    });

    // Typing stop
    socket.on('typing_stop', ({ roomId, username }) => {
      socket.to(roomId).emit('user_stop_typing', { username, roomId });
    });

    // Send Message (Text + File attachments)
    socket.on('send_message', async ({ roomId, content, fileUrl, fileType, fileName, sender, replyToId }) => {
      try {
        let msgObj;

        if (isDBConnected()) {
          const created = await Message.create({
            room: roomId,
            sender: sender._id || sender.id,
            content: content || '',
            fileUrl: fileUrl || null,
            fileType: fileType || null,
            fileName: fileName || null,
            replyTo: replyToId || null,
            readBy: [sender._id || sender.id]
          });

          msgObj = await Message.findById(created._id)
            .populate('sender', 'username email avatar')
            .populate({
              path: 'replyTo',
              populate: { path: 'sender', select: 'username' }
            });
        } else {
          const msgId = 'mem_msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
          let replyObj = null;

          if (replyToId) {
            const parent = memoryMessages.get(replyToId);
            if (parent) {
              replyObj = {
                _id: parent._id,
                content: parent.content,
                sender: { username: parent.sender.username }
              };
            }
          }

          msgObj = {
            _id: msgId,
            room: roomId,
            sender: {
              _id: sender._id || sender.id,
              username: sender.username,
              email: sender.email,
              avatar: sender.avatar
            },
            content: content || '',
            fileUrl: fileUrl || null,
            fileType: fileType || null,
            fileName: fileName || null,
            replyTo: replyObj,
            readBy: [sender._id || sender.id],
            isEdited: false,
            isDeleted: false,
            createdAt: new Date().toISOString()
          };

          memoryMessages.set(msgId, msgObj);
        }

        io.to(roomId).emit('receive_message', msgObj);
      } catch (err) {
        console.error('[Socket Error] Failed to send message:', err.message);
      }
    });

    // Edit Message
    socket.on('edit_message', async ({ messageId, roomId, newContent }) => {
      try {
        if (isDBConnected()) {
          const updated = await Message.findByIdAndUpdate(
            messageId,
            { content: newContent, isEdited: true },
            { new: true }
          ).populate('sender', 'username email avatar');

          io.to(roomId).emit('message_edited', updated);
        } else {
          const msg = memoryMessages.get(messageId);
          if (msg) {
            msg.content = newContent;
            msg.isEdited = true;
            io.to(roomId).emit('message_edited', msg);
          }
        }
      } catch (err) {
        console.error('[Socket Error] Failed to edit message:', err.message);
      }
    });

    // Delete Message
    socket.on('delete_message', async ({ messageId, roomId }) => {
      try {
        if (isDBConnected()) {
          const deleted = await Message.findByIdAndUpdate(
            messageId,
            { content: 'This message was deleted', isDeleted: true, fileUrl: null },
            { new: true }
          ).populate('sender', 'username email avatar');

          io.to(roomId).emit('message_deleted', deleted);
        } else {
          const msg = memoryMessages.get(messageId);
          if (msg) {
            msg.content = 'This message was deleted';
            msg.fileUrl = null;
            msg.isDeleted = true;
            io.to(roomId).emit('message_deleted', msg);
          }
        }
      } catch (err) {
        console.error('[Socket Error] Failed to delete message:', err.message);
      }
    });

    // Mark Read
    socket.on('mark_read', ({ roomId, userId }) => {
      socket.to(roomId).emit('messages_read', { roomId, userId });
    });

    // =========================================================================
    // WebRTC Voice Calling Signaling Events
    // FIX: All P2P signaling events now route to a specific target socket ID
    // instead of broadcasting to the entire room. This prevents SDP/ICE
    // messages from corrupting unrelated peer connections in multi-user rooms.
    // =========================================================================

    socket.on('call_user', ({ toRoom, toSocketId, offer, caller }) => {
      console.log(`[WebRTC Voice] Call from ${caller?.username} (${socket.id}) → room ${toRoom}`);
      if (toSocketId) {
        // Direct peer-to-peer signaling to a specific socket
        socket.to(toSocketId).emit('call_incoming', { offer, caller, fromSocket: socket.id });
      } else {
        // Fallback: broadcast to room (2-person rooms only)
        socket.to(toRoom).emit('call_incoming', { offer, caller, fromSocket: socket.id });
      }
    });

    socket.on('answer_call', ({ toSocketId, toRoom, answer }) => {
      console.log(`[WebRTC Voice] Answer from ${socket.id} → ${toSocketId || toRoom}`);
      if (toSocketId) {
        socket.to(toSocketId).emit('call_answered', { answer, fromSocket: socket.id });
      } else {
        socket.to(toRoom).emit('call_answered', { answer, fromSocket: socket.id });
      }
    });

    socket.on('ice_candidate', ({ toSocketId, toRoom, candidate }) => {
      if (toSocketId) {
        // FIX: Route ICE candidate directly to the specific peer socket
        socket.to(toSocketId).emit('ice_candidate', { candidate });
      } else {
        socket.to(toRoom).emit('ice_candidate', { candidate });
      }
    });

    socket.on('toggle_audio', ({ toRoom, muted, username }) => {
      socket.to(toRoom).emit('audio_toggled', { muted, username });
    });

    socket.on('end_call', ({ toRoom }) => {
      console.log(`[WebRTC Voice] Call ended in room ${toRoom} by ${socket.id}`);
      socket.to(toRoom).emit('call_ended');
    });

    // =========================================================================
    // WebRTC Video Calling & Screen Sharing Signaling Events
    // =========================================================================

    socket.on('video_call_user', ({ toRoom, toSocketId, offer, caller }) => {
      console.log(`[WebRTC Video] Video call from ${caller?.username} (${socket.id}) → room ${toRoom}`);
      if (toSocketId) {
        socket.to(toSocketId).emit('video_call_incoming', { offer, caller, fromSocket: socket.id });
      } else {
        socket.to(toRoom).emit('video_call_incoming', { offer, caller, fromSocket: socket.id });
      }
    });

    socket.on('video_call_answer', ({ toSocketId, toRoom, answer }) => {
      console.log(`[WebRTC Video] Video answer from ${socket.id} → ${toSocketId || toRoom}`);
      if (toSocketId) {
        socket.to(toSocketId).emit('video_call_answered', { answer, fromSocket: socket.id });
      } else {
        socket.to(toRoom).emit('video_call_answered', { answer, fromSocket: socket.id });
      }
    });

    socket.on('toggle_camera', ({ toRoom, cameraOff, username }) => {
      socket.to(toRoom).emit('camera_toggled', { cameraOff, username });
    });

    socket.on('screen_share_start', ({ toRoom, username }) => {
      console.log(`[WebRTC Screen] Screen sharing started in room ${toRoom} by ${username}`);
      socket.to(toRoom).emit('screen_share_started', { username });
    });

    socket.on('screen_share_stop', ({ toRoom, username }) => {
      console.log(`[WebRTC Screen] Screen sharing stopped in room ${toRoom} by ${username}`);
      socket.to(toRoom).emit('screen_share_stopped', { username });
    });

    socket.on('end_video_call', ({ toRoom }) => {
      console.log(`[WebRTC Video] Video call ended in room ${toRoom}`);
      socket.to(toRoom).emit('video_call_ended');
    });

    // Disconnect Cleanup Handling
    socket.on('disconnect', () => {
      if (socket.roomId && socket.user) {
        // Notify peers if this user was in an active call
        socket.to(socket.roomId).emit('call_ended');
        socket.to(socket.roomId).emit('video_call_ended');
        socket.to(socket.roomId).emit('user_left', { user: socket.user, roomId: socket.roomId });
        socket.to(socket.roomId).emit('user_stop_typing', { username: socket.user.username, roomId: socket.roomId });
      }
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

/**
 * Get active Socket.io instance
 * @returns {Server}
 */
const getIO = () => {
  if (!io) {
    throw new Error('Socket.io has not been initialized!');
  }
  return io;
};

module.exports = {
  initSocket,
  getIO
};
