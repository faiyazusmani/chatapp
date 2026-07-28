const User = require('../models/User');
const mongoose = require('mongoose');
const { memoryUsers } = require('./authController');

const isDBConnected = () => mongoose.connection.readyState === 1;

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

      const updatedUser = await user.save();
      const userObj = updatedUser.toObject();
      delete userObj.password;

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

      if (memoryUsers) {
        memoryUsers.set(String(userId), memUser);
      }
      return res.json(memUser);
    }

    return res.status(404).json({ message: 'User not found' });
  } catch (error) {
    console.error('[updateProfile Error]', error);
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
    console.error('[updatePersonality Error]', error);
    next(error);
  }
};

module.exports = {
  getUserById,
  updateProfile,
  updateTheme,
  updatePersonality
};
