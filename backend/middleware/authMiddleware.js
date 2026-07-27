const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const { memoryUsers } = require('../controllers/authController');

/**
 * Authentication Middleware to verify JWT token and attach user to request
 */
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production');

      let user = null;

      // 1. Try finding user in MongoDB if DB is connected and ID is a valid ObjectId
      if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(decoded.id)) {
        user = await User.findById(decoded.id).select('-password');
      }

      // 2. Try finding user in memoryUsers fallback store
      if (!user) {
        user = memoryUsers.get(decoded.id);
      }

      // 3. Graceful fallback for valid JWT token after dev server restarts
      if (!user && decoded.id) {
        user = {
          _id: decoded.id,
          id: decoded.id,
          username: 'Chatter',
          email: 'user@chatroom.com',
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${decoded.id}`,
          createdAt: new Date().toISOString()
        };
        memoryUsers.set(decoded.id, user);
      }

      if (!user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      req.user = user;
      return next();
    } catch (error) {
      console.error('[Auth Error]', error.message);
      return res.status(401).json({ message: 'Not authorized, token failed or expired' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

module.exports = { protect };
