const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const { memoryUsers } = require('../controllers/authController');
const logger = require('../utils/logger');

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // Dev convenience only — production must always set JWT_SECRET
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET environment variable is required in production');
    }
    return 'dev_only_insecure_secret';
  }
  return secret;
};

/**
 * Authentication Middleware to verify JWT token and attach user to request.
 * Supports both Authorization: Bearer header and HttpOnly cookie.
 */
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Fallback: read from HttpOnly cookie (Socket.io / same-origin requests)
  if (!token && req.headers.cookie) {
    const match = req.headers.cookie.split(';').map((c) => c.trim()).find((c) => c.startsWith('token='));
    if (match) token = match.split('=')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());

    let user = null;

    // 1. Try MongoDB if connected and ID is a valid ObjectId
    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(decoded.id)) {
      user = await User.findById(decoded.id).select('-password');
    }

    // 2. In-memory fallback store (dev mode)
    if (!user) {
      user = memoryUsers.get(decoded.id) || null;
    }

    // 3. In-memory dev fallback: create a session record for memory-mode users
    if (!user && mongoose.connection.readyState !== 1 && decoded.id) {
      user = memoryUsers.get(decoded.id);
      if (!user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }
    }

    if (!user) {
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }

    // Auto-elevate super admin account
    const SUPER_ADMIN_EMAIL = 'faiyazusmani068@gmail.com';
    const isSuperAdmin = (user.email || '').toLowerCase().trim() === SUPER_ADMIN_EMAIL;
    if (isSuperAdmin) {
      user.role = 'superadmin';
    }

    req.user = user;
    return next();
  } catch (error) {
    logger.warn(`[Auth] ${error.message}`);
    return res.status(401).json({ message: 'Not authorized, token failed or expired' });
  }
};

const isSuperAdminEmail = (email) => {
  return (email || '').toLowerCase().trim() === 'faiyazusmani068@gmail.com';
};

const requireSuperAdmin = (req, res, next) => {
  if (req.user?.role === 'superadmin' || isSuperAdminEmail(req.user?.email)) {
    return next();
  }
  return res.status(403).json({ message: 'Super admin authorization required' });
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role === 'admin' || req.user?.role === 'superadmin' || isSuperAdminEmail(req.user?.email)) {
    return next();
  }
  return res.status(403).json({ message: 'Admin authorization required' });
};

module.exports = {
  protect,
  requireSuperAdmin,
  requireAdmin,
  isSuperAdminEmail,
  SUPER_ADMIN_EMAIL: 'faiyazusmani068@gmail.com'
};
