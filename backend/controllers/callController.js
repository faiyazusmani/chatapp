const CallHistory = require('../models/CallHistory');
const CallSession = require('../models/CallSession');
const Room = require('../models/Room');
const mongoose = require('mongoose');

// @desc    Get user's call history
// @route   GET /api/calls
// @access  Private
const getCallHistory = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;

    if (mongoose.connection.readyState !== 1) {
      return res.json([]);
    }

    // 1. Fetch CallHistory and CallSession records concurrently
    const [callHistoryRecords, sessionRecords] = await Promise.all([
      CallHistory.find({
        $or: [{ caller: userId }, { receiver: userId }]
      })
        .populate('caller', 'username avatar email')
        .populate('receiver', 'username avatar email')
        .populate('room', 'name')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      CallSession.find({
        $or: [{ creator: userId }, { 'participants.user': userId }]
      })
        .populate('creator', 'username avatar email')
        .populate('participants.user', 'username avatar email')
        .populate({
          path: 'conversationId',
          select: 'name members',
          populate: { path: 'members', select: 'username avatar email' }
        })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean()
    ]);

    // Map sessionRecords into standard CallHistory shape
    const mappedSessions = sessionRecords.map((s) => {
      const isCreator = String(s.creator?._id || s.creator) === String(userId);
      const otherPart = (s.participants || []).find((p) => String(p.user?._id || p.user) !== String(userId));
      const roomMembers = s.conversationId?.members || [];
      const otherMember = roomMembers.find((m) => String(m._id || m) !== String(userId));

      const receiver = isCreator
        ? (otherPart?.user?._id ? otherPart.user : (otherMember || null))
        : s.creator;
      const caller = isCreator ? s.creator : (otherPart?.user?._id ? otherPart.user : s.creator);

      let status = 'missed';
      if (s.duration > 0 || s.endedReason === 'completed' || s.status === 'active' || s.endedReason === 'host_ended') {
        status = 'completed';
      } else if (s.endedReason === 'declined' || s.status === 'declined') {
        status = 'rejected';
      }

      return {
        _id: s._id.toString(),
        caller,
        receiver,
        room: {
          _id: s.conversationId?._id || s.conversationId,
          name: s.conversationId?.name || 'Private Call'
        },
        type: s.callType || 'video',
        status,
        startTime: s.startedAt || s.createdAt,
        endTime: s.endedAt,
        duration: s.duration || 0,
        createdAt: s.createdAt
      };
    });

    // Merge & deduplicate by room and near timestamp (within 60 seconds)
    const combined = [...callHistoryRecords, ...mappedSessions];
    const unique = [];
    const seen = new Set();

    combined.sort((a, b) => new Date(b.startTime || b.createdAt) - new Date(a.startTime || a.createdAt));

    for (const item of combined) {
      const timeBucket = Math.floor(new Date(item.startTime || item.createdAt).getTime() / 60000);
      const roomId = item.room?._id || item.room?.name || item.room;
      const key = `${roomId}_${item.type}_${timeBucket}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }

    res.json(unique.slice(0, 50));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCallHistory
};
