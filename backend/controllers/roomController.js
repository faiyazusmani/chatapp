const mongoose = require('mongoose');
const Room = require('../models/Room');

// In-memory rooms fallback store
const memoryRooms = new Map();

/**
 * Check if MongoDB connection is active
 */
const isDBConnected = () => mongoose.connection.readyState === 1;

/**
 * Generate a random 6-character room code (e.g. ROOM-8X2F)
 */
const generateRoomCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let random = '';
  for (let i = 0; i < 4; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ROOM-${random}`;
};

// Seed initial rooms in-memory if empty
const seedDefaultMemoryRooms = () => {
  if (memoryRooms.size === 0) {
    const defaults = [
      {
        _id: 'room_def_1',
        name: 'React Lounge',
        code: 'ROOM-REACT',
        category: 'Tech',
        description: 'Discuss React 18, Vite, Next.js, and frontend design architectures.',
        isPrivate: false,
        owner: 'system',
        members: ['system'],
        createdAt: new Date().toISOString()
      },
      {
        _id: 'room_def_2',
        name: 'JavaScript Ninjas',
        code: 'ROOM-JS99',
        category: 'Tech',
        description: 'Async JS, Node.js backend patterns, Express, and performance tips.',
        isPrivate: false,
        owner: 'system',
        members: ['system'],
        createdAt: new Date().toISOString()
      },
      {
        _id: 'room_def_3',
        name: 'Gaming Hub',
        code: 'ROOM-GAME',
        category: 'Gaming',
        description: 'Find squad mates, discuss PC & console gaming, and share highlights.',
        isPrivate: false,
        owner: 'system',
        members: ['system'],
        createdAt: new Date().toISOString()
      },
      {
        _id: 'room_def_4',
        name: 'General Discussion',
        code: 'ROOM-GEN1',
        category: 'General',
        description: 'Casual conversations, daily check-ins, and community announcements.',
        isPrivate: false,
        owner: 'system',
        members: ['system'],
        createdAt: new Date().toISOString()
      }
    ];

    defaults.forEach((r) => memoryRooms.set(r._id, r));
  }
};

seedDefaultMemoryRooms();

/**
 * @desc    Create a new chat room
 * @route   POST /api/rooms
 * @access  Private
 */
const createRoom = async (req, res, next) => {
  try {
    const { name, category, description, isPrivate } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Room name is required' });
    }

    const roomCode = generateRoomCode();
    const userId = req.user._id ? req.user._id.toString() : req.user.id;

    if (isDBConnected()) {
      const room = await Room.create({
        name: name.trim(),
        code: roomCode,
        category: category || 'General',
        description: description || '',
        isPrivate: !!isPrivate,
        owner: userId,
        members: [userId]
      });

      const populated = await Room.findById(room._id)
        .populate('owner', 'username email avatar')
        .populate('members', 'username email avatar');

      return res.status(201).json(populated);
    } else {
      // In-memory fallback
      const roomId = 'mem_room_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
      const roomObj = {
        _id: roomId,
        name: name.trim(),
        code: roomCode,
        category: category || 'General',
        description: description || '',
        isPrivate: !!isPrivate,
        owner: userId,
        members: [userId],
        createdAt: new Date().toISOString()
      };

      memoryRooms.set(roomId, roomObj);
      return res.status(201).json({
        ...roomObj,
        membersCount: 1
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all available rooms
 * @route   GET /api/rooms
 * @access  Private
 */
const getAllRooms = async (req, res, next) => {
  try {
    if (isDBConnected()) {
      const rooms = await Room.find()
        .populate('owner', 'username email avatar')
        .sort({ createdAt: -1 });

      const formatted = rooms.map((r) => ({
        _id: r._id.toString(),
        id: r._id.toString(),
        name: r.name,
        code: r.code,
        category: r.category,
        description: r.description,
        isPrivate: r.isPrivate,
        owner: r.owner,
        membersCount: r.members ? r.members.length : 0,
        createdAt: r.createdAt
      }));

      return res.json(formatted);
    } else {
      seedDefaultMemoryRooms();
      const rooms = Array.from(memoryRooms.values()).map((r) => ({
        ...r,
        id: r._id,
        membersCount: r.members ? r.members.length : 0
      }));
      return res.json(rooms);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get room by unique room code
 * @route   GET /api/rooms/code/:code
 * @access  Private
 */
const getRoomByCode = async (req, res, next) => {
  try {
    const { code } = req.params;
    const searchCode = code.toUpperCase().trim();

    if (isDBConnected()) {
      const room = await Room.findOne({ code: searchCode })
        .populate('owner', 'username email avatar')
        .populate('members', 'username email avatar');

      if (!room) {
        return res.status(404).json({ message: 'Room not found with that code' });
      }

      return res.json(room);
    } else {
      seedDefaultMemoryRooms();
      let found = null;
      for (const r of memoryRooms.values()) {
        if (r.code.toUpperCase() === searchCode || r._id === code || r.name.toLowerCase() === code.toLowerCase()) {
          found = r;
          break;
        }
      }

      if (!found) {
        return res.status(404).json({ message: 'Room not found with that code' });
      }

      return res.json({
        ...found,
        id: found._id,
        membersCount: found.members.length
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Join a room using room code
 * @route   POST /api/rooms/join
 * @access  Private
 */
const joinRoomByCode = async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ message: 'Room code is required' });
    }

    const searchCode = code.toUpperCase().trim();
    const userId = req.user._id ? req.user._id.toString() : req.user.id;

    if (isDBConnected()) {
      const room = await Room.findOne({ code: searchCode });

      if (!room) {
        return res.status(404).json({ message: 'Invalid room code' });
      }

      // Add user to members if not present
      if (!room.members.includes(userId)) {
        room.members.push(userId);
        await room.save();
      }

      const populated = await Room.findById(room._id)
        .populate('owner', 'username email avatar')
        .populate('members', 'username email avatar');

      return res.json(populated);
    } else {
      seedDefaultMemoryRooms();
      let found = null;
      for (const r of memoryRooms.values()) {
        if (r.code.toUpperCase() === searchCode || r._id === code || r.name.toLowerCase() === code.toLowerCase()) {
          found = r;
          break;
        }
      }

      if (!found) {
        // Create custom room if code doesn't exist yet in fallback mode
        found = {
          _id: 'mem_room_' + Date.now(),
          name: code,
          code: searchCode,
          category: 'Custom',
          description: `Custom channel ${searchCode}`,
          isPrivate: false,
          owner: userId,
          members: [userId],
          createdAt: new Date().toISOString()
        };
        memoryRooms.set(found._id, found);
      } else {
        if (!found.members.includes(userId)) {
          found.members.push(userId);
        }
      }

      return res.json({
        ...found,
        id: found._id,
        membersCount: found.members.length
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Leave a room
 * @route   POST /api/rooms/:id/leave
 * @access  Private
 */
const leaveRoom = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id ? req.user._id.toString() : req.user.id;

    if (isDBConnected()) {
      const room = await Room.findById(id);
      if (!room) {
        return res.status(404).json({ message: 'Room not found' });
      }

      room.members = room.members.filter((m) => m.toString() !== userId);
      await room.save();

      return res.json({ message: 'Successfully left room', roomId: id });
    } else {
      const room = memoryRooms.get(id);
      if (room) {
        room.members = room.members.filter((m) => m !== userId);
      }
      return res.json({ message: 'Successfully left room', roomId: id });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get room members list
 * @route   GET /api/rooms/:id/members
 * @access  Private
 */
const getRoomMembers = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isDBConnected()) {
      const room = await Room.findById(id).populate('members', 'username email avatar createdAt');
      if (!room) {
        return res.status(404).json({ message: 'Room not found' });
      }
      return res.json(room.members);
    } else {
      const room = memoryRooms.get(id);
      if (!room) {
        return res.status(404).json({ message: 'Room not found' });
      }

      const membersList = room.members.map((mId) => {
        return {
          _id: mId,
          username: mId === req.user._id || mId === req.user.id ? req.user.username : 'Chat Member',
          email: mId === req.user._id || mId === req.user.id ? req.user.email : 'member@chatroom.com',
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${mId}`
        };
      });

      return res.json(membersList);
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRoom,
  getAllRooms,
  getRoomByCode,
  joinRoomByCode,
  leaveRoom,
  getRoomMembers,
  memoryRooms
};
