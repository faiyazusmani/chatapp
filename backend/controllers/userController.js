const User = require('../models/User');
const mongoose = require('mongoose');

const isDBConnected = () => mongoose.connection.readyState === 1;

/**
 * @desc    Get user profile by ID
 * @route   GET /api/users/:id
 * @access  Public/Private
 */
const getUserById = async (req, res, next) => {
  try {
    if (!isDBConnected()) {
      return res.status(503).json({ message: 'Database not connected' });
    }

    const user = await User.findById(req.params.id).select('-password');
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
    if (!isDBConnected()) {
      return res.status(503).json({ message: 'Database not connected' });
    }

    // req.user is set by the authMiddleware (protect)
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId);

    if (user) {
      if (req.body.username && req.body.username !== user.username) {
        const usernameExists = await User.findOne({ username: req.body.username });
        if (usernameExists) {
          return res.status(400).json({ message: 'Username is already taken' });
        }
        user.username = req.body.username;
      }

      user.fullName = req.body.fullName !== undefined ? req.body.fullName : user.fullName;
      user.bio = req.body.bio !== undefined ? req.body.bio : user.bio;
      user.phone = req.body.phone !== undefined ? req.body.phone : user.phone;
      user.location = req.body.location !== undefined ? req.body.location : user.location;
      user.website = req.body.website !== undefined ? req.body.website : user.website;
      user.github = req.body.github !== undefined ? req.body.github : user.github;
      user.linkedin = req.body.linkedin !== undefined ? req.body.linkedin : user.linkedin;
      user.birthday = req.body.birthday !== undefined ? req.body.birthday : user.birthday;
      
      if (req.body.avatar) user.avatar = req.body.avatar;
      if (req.body.bannerImage) user.bannerImage = req.body.bannerImage;

      const updatedUser = await user.save();
      
      const userObj = updatedUser.toObject();
      delete userObj.password;
      
      res.json(userObj);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
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
    if (!isDBConnected()) {
      return res.status(503).json({ message: 'Database not connected' });
    }

    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId);

    if (user) {
      if (req.body.theme) {
        user.theme = { ...user.theme, ...req.body.theme };
      }
      
      const updatedUser = await user.save();
      const userObj = updatedUser.toObject();
      delete userObj.password;
      
      res.json(userObj.theme);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserById,
  updateProfile,
  updateTheme
};
