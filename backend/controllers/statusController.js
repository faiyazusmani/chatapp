const mongoose = require('mongoose');
const Status = require('../models/Status');
const User = require('../models/User');
const { isSuperAdminEmail } = require('../middleware/authMiddleware');

const memoryStatuses = new Map();

const isDBConnected = () => mongoose.connection.readyState === 1;

const getUserId = (req) => (req.user?._id ? req.user._id.toString() : req.user?.id);

/**
 * @desc    Create a new status story (WhatsApp style)
 * @route   POST /api/status
 * @access  Private
 */
const createStatus = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { type = 'image', content = '', mediaUrl = '', duration = 0 } = req.body;

    // Strict personal photo or video validation
    if (!mediaUrl || !mediaUrl.trim()) {
      return res.status(400).json({ message: 'Only personal photo and video uploads are allowed for status. Please select a photo or video.' });
    }

    const isVideo = type === 'video' || /\.(mp4|webm|mov|m4v|mkv)(\?.*)?$/i.test(mediaUrl);
    const finalType = isVideo ? 'video' : 'image';

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    if (isDBConnected() && mongoose.Types.ObjectId.isValid(userId)) {
      const statusDoc = await Status.create({
        user: userId,
        type: finalType,
        content: content.trim(),
        mediaUrl: mediaUrl.trim(),
        duration: Number(duration) || 0,
        viewers: [],
        expiresAt
      });

      const populated = await Status.findById(statusDoc._id)
        .populate('user', 'username email avatar fullName status customStatus');

      const io = req.app.get('io');
      if (io) {
        io.emit('status_created', populated);
      }

      return res.status(201).json(populated);
    }

    // Memory fallback
    const id = 'mem_status_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    const memStatus = {
      _id: id,
      user: {
        _id: userId,
        username: req.user.username || 'User',
        email: req.user.email,
        avatar: req.user.avatar,
        status: req.user.status,
        customStatus: req.user.customStatus
      },
      type: finalType,
      content: content.trim(),
      mediaUrl: mediaUrl.trim(),
      duration: Number(duration) || 0,
      viewers: [],
      expiresAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    memoryStatuses.set(id, memStatus);

    const io = req.app.get('io');
    if (io) {
      io.emit('status_created', memStatus);
    }

    return res.status(201).json(memStatus);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all active statuses grouped by user (WhatsApp style)
 * @route   GET /api/status
 * @access  Private
 */
const getActiveStatuses = async (req, res, next) => {
  try {
    const currentUserId = getUserId(req);
    const isSuperAdmin = req.user?.role === 'superadmin' || isSuperAdminEmail(req.user?.email);
    const now = new Date();

    if (isDBConnected()) {
      let allowedUserIds = new Set();
      if (!isSuperAdmin && currentUserId && mongoose.Types.ObjectId.isValid(currentUserId)) {
        const currentUser = await User.findById(currentUserId).select('following');
        allowedUserIds = new Set((currentUser?.following || []).map((id) => id.toString()));
        allowedUserIds.add(currentUserId.toString());
      }

      const statuses = await Status.find({ expiresAt: { $gt: now } })
        .populate('user', 'username email avatar fullName status customStatus role')
        .populate('viewers.user', 'username avatar')
        .sort({ createdAt: -1 });

      // Group statuses by user
      const userMap = new Map();

      for (const st of statuses) {
        if (!st.user) continue;
        const uid = st.user._id.toString();

        // Strict Privacy Rule:
        // - Super Admin viewer (faiyazusmani068@gmail.com) sees all active statuses.
        // - Regular users ONLY see their own status and the statuses of users they follow (accepted connection).
        // - Even if target is Super Admin, regular users cannot view without accepted follow request.
        if (!isSuperAdmin && !allowedUserIds.has(uid)) {
          continue;
        }

        const hasViewed = (st.viewers || []).some(
          (v) => (v.user?._id ? v.user._id.toString() : v.user?.toString()) === currentUserId?.toString()
        );

        if (!userMap.has(uid)) {
          userMap.set(uid, {
            user: st.user,
            isMe: uid === currentUserId?.toString(),
            statuses: [],
            hasUnviewed: false,
            latestCreatedAt: st.createdAt
          });
        }

        const entry = userMap.get(uid);
        entry.statuses.push({
          ...st.toObject(),
          hasViewed
        });

        if (!hasViewed && uid !== currentUserId?.toString()) {
          entry.hasUnviewed = true;
        }
      }

      const grouped = Array.from(userMap.values());
      return res.json(grouped);
    }

    // Memory fallback
    const userMap = new Map();
    let allowedUserIds = new Set();
    if (!isSuperAdmin && currentUserId) {
      let memUsers = null;
      try {
        memUsers = require('./authController').memoryUsers;
      } catch (e) {}
      const memUser = memUsers ? memUsers.get(String(currentUserId)) : null;
      allowedUserIds = new Set((memUser?.following || []).map((id) => String(id)));
      allowedUserIds.add(String(currentUserId));
    }

    for (const st of memoryStatuses.values()) {
      if (new Date(st.expiresAt) > now) {
        const uid = String(st.user?._id || st.user);
        if (!isSuperAdmin && !allowedUserIds.has(uid)) {
          continue;
        }

        const hasViewed = (st.viewers || []).some(
          (v) => String(v.user?._id || v.user) === String(currentUserId)
        );

        if (!userMap.has(uid)) {
          userMap.set(uid, {
            user: st.user,
            isMe: uid === String(currentUserId),
            statuses: [],
            hasUnviewed: false,
            latestCreatedAt: st.createdAt
          });
        }

        const entry = userMap.get(uid);
        entry.statuses.push({
          ...st,
          hasViewed
        });

        if (!hasViewed && uid !== String(currentUserId)) {
          entry.hasUnviewed = true;
        }
      }
    }

    return res.json(Array.from(userMap.values()));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current user's active statuses
 * @route   GET /api/status/my
 * @access  Private
 */
const getMyStatuses = async (req, res, next) => {
  try {
    const currentUserId = getUserId(req);
    const now = new Date();

    if (isDBConnected() && mongoose.Types.ObjectId.isValid(currentUserId)) {
      const myStatuses = await Status.find({
        user: currentUserId,
        expiresAt: { $gt: now }
      })
        .populate('viewers.user', 'username email avatar')
        .sort({ createdAt: 1 });

      return res.json(myStatuses);
    }

    const my = Array.from(memoryStatuses.values()).filter(
      (st) => String(st.user?._id || st.user) === String(currentUserId) && new Date(st.expiresAt) > now
    );
    return res.json(my);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get active statuses for a specific user
 * @route   GET /api/status/user/:userId
 * @access  Private
 */
const getUserStatuses = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const currentUserId = getUserId(req);
    const isSuperAdmin = req.user?.role === 'superadmin' || isSuperAdminEmail(req.user?.email);
    const isSelf = String(userId) === String(currentUserId);
    const now = new Date();

    if (isDBConnected() && mongoose.Types.ObjectId.isValid(userId)) {
      // Access control:
      // 1. Super admin viewer (faiyazusmani068@gmail.com) can view all statuses.
      // 2. Self can view own status.
      // 3. Regular users can ONLY view if target user is in their following list (follow request was accepted).
      let canView = isSuperAdmin || isSelf;
      if (!canView && currentUserId && mongoose.Types.ObjectId.isValid(currentUserId)) {
        const currentUser = await User.findById(currentUserId).select('following');
        if (currentUser?.following?.some((id) => id.toString() === userId.toString())) {
          canView = true;
        }
      }

      if (!canView) {
        return res.status(403).json({
          restricted: true,
          message: 'You must send a follow request and have it accepted before viewing this user\'s status.',
          statuses: [],
          hasUnviewed: false
        });
      }

      const statuses = await Status.find({
        user: userId,
        expiresAt: { $gt: now }
      })
        .populate('user', 'username email avatar fullName status customStatus role')
        .populate('viewers.user', 'username avatar')
        .sort({ createdAt: 1 });

      const mapped = statuses.map((st) => {
        const hasViewed = (st.viewers || []).some(
          (v) => (v.user?._id ? v.user._id.toString() : v.user?.toString()) === currentUserId?.toString()
        );
        return {
          ...st.toObject(),
          hasViewed
        };
      });

      const hasUnviewed = mapped.some((st) => !st.hasViewed);

      return res.json({
        userId,
        statuses: mapped,
        hasUnviewed
      });
    }

    // Memory fallback
    let canViewMem = isSuperAdmin || isSelf;
    if (!canViewMem && currentUserId) {
      let memUsers = null;
      try {
        memUsers = require('./authController').memoryUsers;
      } catch (e) {}
      const memUser = memUsers ? memUsers.get(String(currentUserId)) : null;
      if (memUser?.following?.some((id) => String(id) === String(userId))) {
        canViewMem = true;
      }
    }

    if (!canViewMem) {
      return res.status(403).json({
        restricted: true,
        message: 'You must send a follow request and have it accepted before viewing this user\'s status.',
        statuses: [],
        hasUnviewed: false
      });
    }

    const filtered = Array.from(memoryStatuses.values()).filter(
      (st) => String(st.user?._id || st.user) === String(userId) && new Date(st.expiresAt) > now
    );

    const mapped = filtered.map((st) => {
      const hasViewed = (st.viewers || []).some(
        (v) => String(v.user?._id || v.user) === String(currentUserId)
      );
      return {
        ...st,
        hasViewed
      };
    });

    const hasUnviewed = mapped.some((st) => !st.hasViewed);

    return res.json({
      userId,
      statuses: mapped,
      hasUnviewed
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark a status as viewed by the current user
 * @route   POST /api/status/:id/view
 * @access  Private
 */
const viewStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentUserId = getUserId(req);

    if (isDBConnected() && mongoose.Types.ObjectId.isValid(id)) {
      const status = await Status.findById(id);
      if (!status) return res.status(404).json({ message: 'Status not found' });

      const alreadyViewed = status.viewers.some(
        (v) => (v.user?._id ? v.user._id.toString() : v.user?.toString()) === currentUserId?.toString()
      );

      if (!alreadyViewed && currentUserId && currentUserId.toString() !== status.user.toString()) {
        status.viewers.push({ user: currentUserId, viewedAt: new Date() });
        await status.save();

        const io = req.app.get('io');
        if (io) {
          io.emit('status_viewed', {
            statusId: id,
            viewer: {
              _id: currentUserId,
              username: req.user.username,
              avatar: req.user.avatar
            }
          });
        }
      }

      return res.json({ message: 'Status viewed', statusId: id });
    }

    const st = memoryStatuses.get(id);
    if (st) {
      const already = (st.viewers || []).some((v) => String(v.user?._id || v.user) === String(currentUserId));
      if (!already && currentUserId && String(st.user?._id || st.user) !== String(currentUserId)) {
        st.viewers.push({
          user: { _id: currentUserId, username: req.user.username, avatar: req.user.avatar },
          viewedAt: new Date().toISOString()
        });
      }
    }

    return res.json({ message: 'Status viewed', statusId: id });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a status story
 * @route   DELETE /api/status/:id
 * @access  Private (Owner only)
 */
const deleteStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentUserId = getUserId(req);

    if (isDBConnected() && mongoose.Types.ObjectId.isValid(id)) {
      const status = await Status.findById(id);
      if (!status) return res.status(404).json({ message: 'Status not found' });

      const isSuperAdmin = req.user.role === 'superadmin' || isSuperAdminEmail(req.user.email);
      if (status.user.toString() !== currentUserId?.toString() && req.user.role !== 'admin' && !isSuperAdmin) {
        return res.status(403).json({ message: 'Not authorized to delete this status' });
      }

      await Status.findByIdAndDelete(id);

      const io = req.app.get('io');
      if (io) {
        io.emit('status_deleted', { statusId: id, userId: status.user.toString() });
      }

      return res.json({ message: 'Status deleted', statusId: id });
    }

    const st = memoryStatuses.get(id);
    if (st) {
      const isSuperAdmin = req.user?.role === 'superadmin' || isSuperAdminEmail(req.user?.email);
      if (String(st.user?._id || st.user) !== String(currentUserId) && req.user?.role !== 'admin' && !isSuperAdmin) {
        return res.status(403).json({ message: 'Not authorized to delete this status' });
      }
      memoryStatuses.delete(id);
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('status_deleted', { statusId: id, userId: currentUserId });
    }

    return res.json({ message: 'Status deleted', statusId: id });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createStatus,
  getActiveStatuses,
  getMyStatuses,
  getUserStatuses,
  viewStatus,
  deleteStatus,
  memoryStatuses
};
