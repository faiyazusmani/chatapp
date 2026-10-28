const User = require('../models/User');
const Room = require('../models/Room');
const Status = require('../models/Status');
const Message = require('../models/Message');
const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { memoryUsers } = require('./authController');
const { isSuperAdminEmail } = require('../middleware/authMiddleware');

const isDBConnected = () => mongoose.connection.readyState === 1;

const getUserId = (req) => (req.user?._id ? req.user._id.toString() : req.user?.id);

/**
 * @desc    Get user profile by ID
 * @route   GET /api/users/:id
 * @access  Public/Private
 */
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let user = null;

    if (isDBConnected() && mongoose.Types.ObjectId.isValid(id)) {
      user = await User.findById(id).select('-password');
    }

    if (!user && memoryUsers) {
      user = memoryUsers.get(String(id));
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User authorization failed' });
    }

    let user = null;
    if (isDBConnected() && mongoose.Types.ObjectId.isValid(userId)) {
      user = await User.findById(userId);
    }

    if (user) {
      // Check if username is changing and available
      if (req.body.username && req.body.username !== user.username) {
        const usernameExists = await User.findOne({ username: { $regex: new RegExp(`^${req.body.username.trim()}$`, 'i') } });
        if (usernameExists && usernameExists._id.toString() !== userId.toString()) {
          return res.status(400).json({ message: 'Username is already taken' });
        }
        user.username = req.body.username.trim();
      }

      user.fullName = req.body.fullName !== undefined ? req.body.fullName : user.fullName;
      user.bio = req.body.bio !== undefined ? req.body.bio : user.bio;
      user.phone = req.body.phone !== undefined ? req.body.phone : user.phone;
      user.location = req.body.location !== undefined ? req.body.location : user.location;
      user.website = req.body.website !== undefined ? req.body.website : user.website;
      user.github = req.body.github !== undefined ? req.body.github : user.github;
      user.linkedin = req.body.linkedin !== undefined ? req.body.linkedin : user.linkedin;

      // Handle birthday safely to avoid CastError for empty strings
      if (req.body.birthday !== undefined) {
        user.birthday = req.body.birthday ? new Date(req.body.birthday) : null;
      }

      if (req.body.avatar) user.avatar = req.body.avatar;
      if (req.body.bannerImage) user.bannerImage = req.body.bannerImage;

      if (req.body.status && ['online', 'offline', 'away', 'busy', 'invisible'].includes(req.body.status)) {
        user.status = req.body.status;
      }
      if (req.body.customStatus && typeof req.body.customStatus === 'object') {
        user.customStatus = {
          text: String(req.body.customStatus.text || '').slice(0, 100),
          emoji: String(req.body.customStatus.emoji || '').slice(0, 10),
          expiresAt: req.body.customStatus.expiresAt ? new Date(req.body.customStatus.expiresAt) : null
        };
      }
      if (req.body.isProfileSetupCompleted !== undefined) {
        user.isProfileSetupCompleted = Boolean(req.body.isProfileSetupCompleted);
      }

      // Privacy settings (Gajim-style account privacy)
      if (req.body.privacy && typeof req.body.privacy === 'object') {
        const allowedKeys = ['showOnline', 'showLastSeen', 'showReadReceipts', 'allowMessagesFrom'];
        for (const key of allowedKeys) {
          if (req.body.privacy[key] !== undefined) {
            user.privacy[key] = req.body.privacy[key];
          }
        }
      }

      // Notification preferences
      if (req.body.notificationPrefs && typeof req.body.notificationPrefs === 'object') {
        const allowedKeys = ['soundEnabled', 'desktopEnabled', 'notifyOnMessage'];
        for (const key of allowedKeys) {
          if (req.body.notificationPrefs[key] !== undefined) {
            user.notificationPrefs[key] = req.body.notificationPrefs[key];
          }
        }
      }

      const updatedUser = await user.save();
      const userObj = updatedUser.toObject();
      delete userObj.password;

      const io = req.app.get('io');
      if (io) {
        if (req.body.customStatus) {
          io.emit('status_updated', { userId: user._id.toString(), customStatus: user.customStatus });
        }
        if (req.body.status) {
          io.emit('presence_update', { userId: user._id.toString(), status: user.status });
        }
        if (req.body.avatar) {
          io.emit('user_avatar_updated', { userId: user._id.toString(), avatar: user.avatar });
        }
      }

      return res.json(userObj);
    }

    // Memory fallback update
    const memUser = (memoryUsers && memoryUsers.get(String(userId))) || req.user;
    if (memUser) {
      if (req.body.username && req.body.username !== memUser.username) {
        if (memoryUsers) {
          for (const [id, u] of memoryUsers.entries()) {
            if (String(id) !== String(userId) && u.username?.toLowerCase() === req.body.username.trim().toLowerCase()) {
              return res.status(400).json({ message: 'Username is already taken' });
            }
          }
        }
        memUser.username = req.body.username.trim();
      }
      if (req.body.fullName !== undefined) memUser.fullName = req.body.fullName;
      if (req.body.bio !== undefined) memUser.bio = req.body.bio;
      if (req.body.phone !== undefined) memUser.phone = req.body.phone;
      if (req.body.location !== undefined) memUser.location = req.body.location;
      if (req.body.website !== undefined) memUser.website = req.body.website;
      if (req.body.github !== undefined) memUser.github = req.body.github;
      if (req.body.linkedin !== undefined) memUser.linkedin = req.body.linkedin;
      if (req.body.birthday !== undefined) memUser.birthday = req.body.birthday || null;
      if (req.body.avatar) memUser.avatar = req.body.avatar;
      if (req.body.bannerImage) memUser.bannerImage = req.body.bannerImage;
      if (req.body.status) memUser.status = req.body.status;
      if (req.body.customStatus) memUser.customStatus = req.body.customStatus;
      if (req.body.isProfileSetupCompleted !== undefined) memUser.isProfileSetupCompleted = Boolean(req.body.isProfileSetupCompleted);

      if (memoryUsers) {
        memoryUsers.set(String(userId), memUser);
      }
      return res.json(memUser);
    }

    return res.status(404).json({ message: 'User not found' });
  } catch (error) {
    logger.error('[updateProfile Error]', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Username is already taken' });
    }
    next(error);
  }
};

/**
 * @desc    Update user theme
 * @route   PUT /api/users/theme
 * @access  Private
 */
const updateTheme = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.user?.id;
    let user = null;

    if (isDBConnected() && mongoose.Types.ObjectId.isValid(userId)) {
      user = await User.findById(userId);
    }

    if (user) {
      if (req.body.theme) {
        user.theme = { ...user.theme, ...req.body.theme };
      }

      const updatedUser = await user.save();
      const userObj = updatedUser.toObject();
      delete userObj.password;

      return res.json(userObj.theme);
    }

    // Memory fallback user update
    const memUser = (memoryUsers && memoryUsers.get(String(userId))) || req.user;
    if (memUser) {
      if (req.body.theme) {
        memUser.theme = { ...(memUser.theme || {}), ...req.body.theme };
      }
      if (memoryUsers) {
        memoryUsers.set(String(userId), memUser);
      }
      return res.json(memUser.theme || req.body.theme);
    }

    return res.status(404).json({ message: 'User not found' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user personality studio settings
 * @route   PUT /api/users/personality
 * @access  Private
 */
const updatePersonality = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.user?.id;
    let user = null;

    if (isDBConnected() && mongoose.Types.ObjectId.isValid(userId)) {
      user = await User.findById(userId);
    }

    if (user) {
      if (req.body.personality) {
        user.personality = { ...user.personality, ...req.body.personality };
      }

      const updatedUser = await user.save();
      const userObj = updatedUser.toObject();
      delete userObj.password;

      return res.json(userObj.personality);
    }

    // Memory fallback update
    const memUser = (memoryUsers && memoryUsers.get(String(userId))) || req.user;
    if (memUser) {
      if (req.body.personality) {
        memUser.personality = { ...(memUser.personality || {}), ...req.body.personality };
      }
      if (memoryUsers) {
        memoryUsers.set(String(userId), memUser);
      }
      return res.json(memUser.personality || req.body.personality);
    }

    return res.status(404).json({ message: 'User not found' });
  } catch (error) {
    logger.error('[updatePersonality Error]', error);
    next(error);
  }
};

/**
 * @desc    Search users by username / full name / email (Gajim-style roster search)
 * @route   GET /api/users/search?q=term
 * @access  Private
 */
const searchUsers = async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.status(400).json({ message: 'Search query is required' });
    if (q.length < 2) return res.status(400).json({ message: 'Search query must be at least 2 characters' });

    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit) || 10));
    const currentUserId = getUserId(req);

    if (isDBConnected()) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const users = await User.find({
        _id: { $ne: currentUserId },
        $or: [
          { username: { $regex: escaped, $options: 'i' } },
          { fullName: { $regex: escaped, $options: 'i' } },
          { email: { $regex: escaped, $options: 'i' } }
        ]
      })
        .select('username email avatar fullName bio status lastSeen')
        .limit(limit);
      return res.json({ users });
    }

    // Memory fallback
    const users = Array.from(memoryUsers.values())
      .filter((u) => String(u._id) !== String(currentUserId))
      .filter((u) => (u.username || '').toLowerCase().includes(q.toLowerCase()) || (u.email || '').toLowerCase().includes(q.toLowerCase()))
      .slice(0, limit);
    return res.json({ users });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's starred (bookmarked) messages
 * @route   GET /api/users/starred
 * @access  Private
 */
const getStarredMessages = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!isDBConnected()) {
      return res.json({ messages: [] });
    }
    const messages = await Message.find({ starredBy: userId })
      .populate('sender', 'username email avatar')
      .populate('room', 'name code')
      .sort({ createdAt: -1 })
      .limit(100);
    return res.json({ messages });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all users for directory ('All' section) with follow & chat permission states
 * @route   GET /api/users/all
 * @access  Private
 */
const getAllUsers = async (req, res, next) => {
  try {
    const currentUserId = getUserId(req);
    const isSuperAdmin = req.user?.role === 'superadmin' || isSuperAdminEmail(req.user?.email);
    const now = new Date();

    if (isDBConnected()) {
      const users = await User.find({})
        .select('username email fullName avatar bio role status lastSeen followers following followRequests sentRequests')
        .sort({ role: 1, createdAt: -1 });

      const activeStatuses = await Status.find({ expiresAt: { $gt: now } }).select('user');
      const usersWithStatusSet = new Set(
        activeStatuses.map((s) => (s.user ? s.user.toString() : ''))
      );

      const me = users.find((u) => u._id.toString() === currentUserId?.toString());
      const myFollowingSet = new Set((me?.following || []).map((id) => id.toString()));
      const myFollowRequestsFromSet = new Set(
        (me?.followRequests || []).map((r) => (r.from ? r.from.toString() : r.toString()))
      );
      const mySentRequestsToSet = new Set(
        (me?.sentRequests || []).map((r) => (r.to ? r.to.toString() : r.toString()))
      );

      const result = users.map((u) => {
        const uid = u._id.toString();
        const isSelf = uid === currentUserId?.toString();
        const isTargetSuperAdmin = u.role === 'superadmin' || isSuperAdminEmail(u.email);
        const isFollowing = myFollowingSet.has(uid);
        const hasIncomingRequest = myFollowRequestsFromSet.has(uid);
        const hasSentRequest = mySentRequestsToSet.has(uid);

        let connectionStatus = 'none';
        if (isSelf) {
          connectionStatus = 'self';
        } else if (isFollowing) {
          connectionStatus = 'following';
        } else if (hasIncomingRequest) {
          connectionStatus = 'pending_approval';
        } else if (hasSentRequest) {
          connectionStatus = 'requested';
        }

        // Permissions:
        // Super Admin (faiyazusmani068@gmail.com) can view statuses & chat unconditionally.
        // Regular users must have sent a follow request and had it accepted (isFollowing) to chat & view status.
        const canChat = isSelf ? false : (isSuperAdmin || isFollowing);
        const canViewStatus = isSelf ? true : (isSuperAdmin || isFollowing);
        // Only mark hasActiveStatus if the user actually has active statuses AND the viewer is allowed to view them!
        const hasActiveStatus = usersWithStatusSet.has(uid) && canViewStatus;

        return {
          _id: u._id,
          username: u.username,
          fullName: u.fullName || u.username,
          email: isSuperAdmin || isSelf ? u.email : undefined,
          avatar: u.avatar,
          bio: u.bio || '',
          role: isTargetSuperAdmin ? 'superadmin' : (u.role || 'user'),
          status: u.status || 'offline',
          lastSeen: u.lastSeen,
          hasActiveStatus,
          connectionStatus,
          canChat,
          canViewStatus,
          followersCount: (u.followers || []).length,
          followingCount: (u.following || []).length
        };
      });

      return res.json({ users: result });
    }

    // Memory fallback
    const memUsers = Array.from(memoryUsers ? memoryUsers.values() : []);
    const result = memUsers.map((u) => {
      const uid = String(u._id || u.id);
      const isSelf = uid === String(currentUserId);
      const isTargetSuperAdmin = u.role === 'superadmin' || isSuperAdminEmail(u.email);
      const isFollowing = (u.followers || []).some((id) => String(id) === String(currentUserId));
      const canChat = isSelf ? false : (isSuperAdmin || isFollowing);
      const canViewStatus = isSelf ? true : (isSuperAdmin || isFollowing);
      return {
        _id: uid,
        username: u.username,
        fullName: u.fullName || u.username,
        email: isSuperAdmin || isSelf ? u.email : undefined,
        avatar: u.avatar,
        bio: u.bio || '',
        role: isTargetSuperAdmin ? 'superadmin' : (u.role || 'user'),
        status: u.status || 'online',
        lastSeen: u.lastSeen || new Date(),
        hasActiveStatus: false,
        connectionStatus: isSelf ? 'self' : isFollowing ? 'following' : 'none',
        canChat,
        canViewStatus,
        followersCount: 0,
        followingCount: 0
      };
    });

    return res.json({ users: result });
  } catch (error) {
    logger.error('[getAllUsers Error]', error);
    next(error);
  }
};

/**
 * @desc    Send follow request to a target user
 * @route   POST /api/users/:targetId/follow-request
 * @access  Private
 */
const sendFollowRequest = async (req, res, next) => {
  try {
    const currentUserId = getUserId(req);
    const { targetId } = req.params;

    if (!targetId || targetId === currentUserId) {
      return res.status(400).json({ message: 'Invalid target user ID' });
    }

    if (isDBConnected()) {
      const [currentUser, targetUser] = await Promise.all([
        User.findById(currentUserId),
        User.findById(targetId)
      ]);

      if (!targetUser) return res.status(404).json({ message: 'User not found' });

      // If already following
      if ((currentUser.following || []).some((id) => id.toString() === targetId.toString())) {
        return res.status(400).json({ message: 'You are already connected with this user' });
      }

      // Check if target user has sent an incoming request to current user -> auto-connect!
      const existingIncomingIndex = (currentUser.followRequests || []).findIndex(
        (r) => (r.from ? r.from.toString() : r.toString()) === targetId.toString()
      );

      if (existingIncomingIndex !== -1) {
        currentUser.followRequests.splice(existingIncomingIndex, 1);
        targetUser.sentRequests = (targetUser.sentRequests || []).filter(
          (r) => (r.to ? r.to.toString() : r.toString()) !== currentUserId.toString()
        );

        if (!currentUser.following.some((id) => id.toString() === targetId.toString())) {
          currentUser.following.push(targetId);
        }
        if (!currentUser.followers.some((id) => id.toString() === targetId.toString())) {
          currentUser.followers.push(targetId);
        }
        if (!targetUser.following.some((id) => id.toString() === currentUserId.toString())) {
          targetUser.following.push(currentUserId);
        }
        if (!targetUser.followers.some((id) => id.toString() === currentUserId.toString())) {
          targetUser.followers.push(currentUserId);
        }

        await Promise.all([currentUser.save(), targetUser.save()]);

        const io = req.app.get('io');
        if (io) {
          io.emit('follow_request_accepted', {
            userId: currentUserId,
            targetId,
            user: { _id: currentUser._id, username: currentUser.username, avatar: currentUser.avatar }
          });
        }

        return res.json({
          message: 'Connected successfully! You can now chat and view each other\'s statuses.',
          connected: true,
          connectionStatus: 'following'
        });
      }

      // Check if already requested
      const alreadySent = (currentUser.sentRequests || []).some(
        (r) => (r.to ? r.to.toString() : r.toString()) === targetId.toString()
      );
      if (alreadySent) {
        return res.status(400).json({ message: 'Follow request already sent' });
      }

      // Add to target's followRequests and current's sentRequests
      targetUser.followRequests.push({ from: currentUserId, requestedAt: new Date() });
      currentUser.sentRequests.push({ to: targetId, requestedAt: new Date() });

      await Promise.all([currentUser.save(), targetUser.save()]);

      const io = req.app.get('io');
      if (io) {
        io.emit('follow_request_received', {
          targetId,
          from: {
            _id: currentUser._id,
            username: currentUser.username,
            fullName: currentUser.fullName,
            avatar: currentUser.avatar
          }
        });
      }

      return res.json({ message: 'Follow request sent successfully', connectionStatus: 'requested' });
    }

    return res.json({ message: 'Follow request sent', connectionStatus: 'requested' });
  } catch (error) {
    logger.error('[sendFollowRequest Error]', error);
    next(error);
  }
};

/**
 * @desc    Accept an incoming follow request
 * @route   POST /api/users/:targetId/accept-request
 * @access  Private
 */
const acceptFollowRequest = async (req, res, next) => {
  try {
    const currentUserId = getUserId(req);
    const { targetId } = req.params;

    if (isDBConnected()) {
      const [currentUser, requesterUser] = await Promise.all([
        User.findById(currentUserId),
        User.findById(targetId)
      ]);

      if (!requesterUser) return res.status(404).json({ message: 'User not found' });

      // Remove from followRequests on currentUser and sentRequests on requesterUser
      currentUser.followRequests = (currentUser.followRequests || []).filter(
        (r) => (r.from ? r.from.toString() : r.toString()) !== targetId.toString()
      );
      requesterUser.sentRequests = (requesterUser.sentRequests || []).filter(
        (r) => (r.to ? r.to.toString() : r.toString()) !== currentUserId.toString()
      );

      // Mutual connection: both users follow each other
      if (!currentUser.followers.some((id) => id.toString() === targetId.toString())) {
        currentUser.followers.push(targetId);
      }
      if (!currentUser.following.some((id) => id.toString() === targetId.toString())) {
        currentUser.following.push(targetId);
      }
      if (!requesterUser.followers.some((id) => id.toString() === currentUserId.toString())) {
        requesterUser.followers.push(currentUserId);
      }
      if (!requesterUser.following.some((id) => id.toString() === currentUserId.toString())) {
        requesterUser.following.push(currentUserId);
      }

      await Promise.all([currentUser.save(), requesterUser.save()]);

      const io = req.app.get('io');
      if (io) {
        io.emit('follow_request_accepted', {
          userId: currentUserId,
          targetId,
          user: { _id: currentUser._id, username: currentUser.username, avatar: currentUser.avatar }
        });
      }

      return res.json({
        message: 'Follow request accepted. You can now chat and view each other\'s statuses!',
        connected: true,
        connectionStatus: 'following'
      });
    }

    return res.json({ message: 'Follow request accepted', connected: true, connectionStatus: 'following' });
  } catch (error) {
    logger.error('[acceptFollowRequest Error]', error);
    next(error);
  }
};

/**
 * @desc    Decline an incoming follow request
 * @route   POST /api/users/:targetId/decline-request
 * @access  Private
 */
const declineFollowRequest = async (req, res, next) => {
  try {
    const currentUserId = getUserId(req);
    const { targetId } = req.params;

    if (isDBConnected()) {
      const [currentUser, requesterUser] = await Promise.all([
        User.findById(currentUserId),
        User.findById(targetId)
      ]);

      if (currentUser) {
        currentUser.followRequests = (currentUser.followRequests || []).filter(
          (r) => (r.from ? r.from.toString() : r.toString()) !== targetId.toString()
        );
        await currentUser.save();
      }

      if (requesterUser) {
        requesterUser.sentRequests = (requesterUser.sentRequests || []).filter(
          (r) => (r.to ? r.to.toString() : r.toString()) !== currentUserId.toString()
        );
        await requesterUser.save();
      }

      return res.json({ message: 'Follow request declined', connectionStatus: 'none' });
    }

    return res.json({ message: 'Follow request declined', connectionStatus: 'none' });
  } catch (error) {
    logger.error('[declineFollowRequest Error]', error);
    next(error);
  }
};

/**
 * @desc    Unfollow or remove connection
 * @route   POST /api/users/:targetId/unfollow
 * @access  Private
 */
const unfollowUser = async (req, res, next) => {
  try {
    const currentUserId = getUserId(req);
    const { targetId } = req.params;

    if (isDBConnected()) {
      const [currentUser, targetUser] = await Promise.all([
        User.findById(currentUserId),
        User.findById(targetId)
      ]);

      if (currentUser) {
        currentUser.following = (currentUser.following || []).filter((id) => id.toString() !== targetId.toString());
        currentUser.followers = (currentUser.followers || []).filter((id) => id.toString() !== targetId.toString());
        await currentUser.save();
      }

      if (targetUser) {
        targetUser.following = (targetUser.following || []).filter((id) => id.toString() !== currentUserId.toString());
        targetUser.followers = (targetUser.followers || []).filter((id) => id.toString() !== currentUserId.toString());
        await targetUser.save();
      }

      return res.json({ message: 'Unfollowed successfully', connectionStatus: 'none' });
    }

    return res.json({ message: 'Unfollowed successfully', connectionStatus: 'none' });
  } catch (error) {
    logger.error('[unfollowUser Error]', error);
    next(error);
  }
};

/**
 * @desc    Get pending follow requests for the current user
 * @route   GET /api/users/follow-requests
 * @access  Private
 */
const getFollowRequests = async (req, res, next) => {
  try {
    const currentUserId = getUserId(req);
    if (isDBConnected()) {
      const user = await User.findById(currentUserId)
        .populate('followRequests.from', 'username fullName avatar email role')
        .select('followRequests');

      const requests = (user?.followRequests || [])
        .filter((r) => r.from)
        .map((r) => ({
          _id: r._id,
          requestedAt: r.requestedAt,
          from: r.from
        }));

      return res.json({ requests });
    }
    return res.json({ requests: [] });
  } catch (error) {
    logger.error('[getFollowRequests Error]', error);
    next(error);
  }
};

/**
 * @desc    Get or create a direct 1-on-1 chat room with a target user
 * @route   POST /api/users/:targetId/direct-room
 * @access  Private
 */
const getOrCreateDirectRoom = async (req, res, next) => {
  try {
    const currentUserId = getUserId(req);
    const { targetId } = req.params;

    if (!targetId || targetId === currentUserId) {
      return res.status(400).json({ message: 'Invalid target user' });
    }

    const isSuperAdmin = req.user?.role === 'superadmin' || isSuperAdminEmail(req.user?.email);

    if (isDBConnected()) {
      const [currentUser, targetUser] = await Promise.all([
        User.findById(currentUserId),
        User.findById(targetId)
      ]);

      if (!targetUser) return res.status(404).json({ message: 'Target user not found' });

      const isTargetSuperAdmin = targetUser.role === 'superadmin' || isSuperAdminEmail(targetUser.email);
      const isConnected = (currentUser.following || []).some((id) => id.toString() === targetId.toString());

      // Permission check: super admin can chat with anyone; regular users can chat only if connected (request accepted)
      if (!isSuperAdmin && !isConnected) {
        return res.status(403).json({
          message: 'You need to send a follow request and have it accepted before chatting with this user.'
        });
      }

      // Consistent room code for direct 1-on-1 (deterministic sorted short IDs)
      const sortedIds = [currentUserId.toString(), targetId.toString()].sort();
      const dmCode = `DM-${sortedIds[0].slice(-6)}-${sortedIds[1].slice(-6)}`.toUpperCase();

      let room = await Room.findOne({
        code: dmCode,
        isDeleted: { $ne: true }
      })
        .populate('owner', 'username email avatar')
        .populate('members', 'username email avatar');

      if (!room) {
        const roomName = `${targetUser.fullName || targetUser.username}`;
        room = await Room.create({
          name: roomName,
          code: dmCode,
          category: 'Custom',
          description: `Direct conversation with ${targetUser.username}`,
          isPrivate: true,
          owner: currentUserId,
          admins: [currentUserId, targetId],
          members: [currentUserId, targetId]
        });

        room = await Room.findById(room._id)
          .populate('owner', 'username email avatar')
          .populate('members', 'username email avatar');

        const io = req.app.get('io');
        if (io) {
          io.emit('room_created', room);
        }
      } else {
        // Ensure both users are members
        let changed = false;
        if (!room.members.some((m) => m._id.toString() === currentUserId.toString())) {
          room.members.push(currentUserId);
          changed = true;
        }
        if (!room.members.some((m) => m._id.toString() === targetId.toString())) {
          room.members.push(targetId);
          changed = true;
        }
        if (changed) {
          await room.save();
        }
      }

      return res.json(room);
    }

    // Memory fallback
    const dmCode = `DM-MEM-${currentUserId}-${targetId}`;
    let memRoom = {
      _id: dmCode,
      name: `Direct Chat`,
      code: dmCode,
      category: 'Custom',
      description: 'Direct Chat',
      isPrivate: true,
      owner: currentUserId,
      admins: [currentUserId, targetId],
      members: [currentUserId, targetId]
    };
    return res.json(memRoom);
  } catch (error) {
    logger.error('[getOrCreateDirectRoom Error]', error);
    next(error);
  }
};

/**
 * @desc    Delete a user account (Super Admin only)
 * @route   DELETE /api/users/:id
 * @access  Private (Super Admin)
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id: targetUserId } = req.params;
    const currentUserId = getUserId(req);
    const isSuperAdmin = req.user?.role === 'superadmin' || isSuperAdminEmail(req.user?.email);

    if (!isSuperAdmin) {
      return res.status(403).json({ message: 'Only Super Admin can delete users' });
    }

    if (String(targetUserId) === String(currentUserId)) {
      return res.status(400).json({ message: 'Super Admin cannot delete their own account' });
    }

    if (isDBConnected() && mongoose.Types.ObjectId.isValid(targetUserId)) {
      const targetUser = await User.findById(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (isSuperAdminEmail(targetUser.email) || targetUser.role === 'superadmin') {
        return res.status(403).json({ message: 'Cannot delete the Super Admin account' });
      }

      // 1. Delete user
      await User.findByIdAndDelete(targetUserId);

      // 2. Remove user references from followers, following, followRequests, sentRequests
      await User.updateMany(
        {},
        {
          $pull: {
            followers: targetUserId,
            following: targetUserId,
            followRequests: { from: targetUserId },
            sentRequests: { to: targetUserId }
          }
        }
      );

      // 3. Delete user's active statuses
      await Status.deleteMany({ user: targetUserId });

      // 4. Soft-delete rooms owned by user
      await Room.updateMany({ owner: targetUserId }, { isDeleted: true, deletedAt: new Date() });

      // 5. Emit real-time socket event
      const io = req.app.get('io');
      if (io) {
        io.emit('user_deleted', { userId: targetUserId, username: targetUser.username });
      }

      return res.json({ message: `User @${targetUser.username} deleted successfully`, userId: targetUserId });
    }

    // Memory fallback
    if (memoryUsers) {
      memoryUsers.delete(String(targetUserId));
    }
    const io = req.app.get('io');
    if (io) {
      io.emit('user_deleted', { userId: targetUserId });
    }

    return res.json({ message: 'User deleted successfully', userId: targetUserId });
  } catch (error) {
    logger.error('[deleteUser Error]', error);
    next(error);
  }
};

module.exports = {
  getUserById,
  updateProfile,
  updateTheme,
  updatePersonality,
  searchUsers,
  getStarredMessages,
  getAllUsers,
  sendFollowRequest,
  acceptFollowRequest,
  declineFollowRequest,
  unfollowUser,
  getFollowRequests,
  getOrCreateDirectRoom,
  deleteUser
};
