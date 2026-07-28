const mongoose = require('mongoose');
const Message = require('../models/Message');

// In-memory fallback message store
const memoryMessages = new Map();

/**
 * Check if MongoDB connection is active
 */
const isDBConnected = () => mongoose.connection.readyState === 1;

/**
 * Seed initial sample messages for fallback mode
 */
const seedMemoryMessages = (roomId) => {
  const roomMsgs = Array.from(memoryMessages.values()).filter((m) => m.room === roomId);
  if (roomMsgs.length === 0) {
    const defaultMsg = {
      _id: 'msg_welcome_' + roomId,
      room: roomId,
      sender: {
        _id: 'system_user',
        username: 'ChatRoom Bot',
        email: 'bot@chatroom.com',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=ChatBot'
      },
      content: 'Welcome to this room! Send a message to start real-time chatting.',
      replyTo: null,
      readBy: [],
      isEdited: false,
      isDeleted: false,
      createdAt: new Date().toISOString()
    };
    memoryMessages.set(defaultMsg._id, defaultMsg);
  }
};

/**
 * @desc    Get historical messages for a room
 * @route   GET /api/messages/:roomId
 * @access  Private
 */
const getRoomMessages = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    if (isDBConnected()) {
      const messages = await Message.find({ room: roomId })
        .populate('sender', 'username email avatar')
        .populate({
          path: 'replyTo',
          populate: { path: 'sender', select: 'username' }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return res.json(messages.reverse());
    } else {
      seedMemoryMessages(roomId);
      const allMsgs = Array.from(memoryMessages.values())
        .filter((m) => m.room === roomId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      const paginatedMsgs = allMsgs.slice(skip, skip + limit).reverse();
      return res.json(paginatedMsgs);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark messages in a room as read
 * @route   POST /api/messages/:roomId/read
 * @access  Private
 */
const markMessagesAsRead = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id ? req.user._id.toString() : req.user.id;

    if (isDBConnected()) {
      await Message.updateMany(
        { room: roomId, readBy: { $ne: userId } },
        { $addToSet: { readBy: userId } }
      );
      return res.json({ message: 'Messages marked as read' });
    } else {
      for (const msg of memoryMessages.values()) {
        if (msg.room === roomId) {
          if (!msg.readBy.includes(userId)) {
            msg.readBy.push(userId);
          }
        }
      }
      return res.json({ message: 'Messages marked as read' });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRoomMessages,
  markMessagesAsRead,
  memoryMessages
};
