const jwt = require('jsonwebtoken');

/**
 * Generate a JWT token containing user ID
 * @param {string} id - User Mongoose ObjectID or memory-mode id
 * @returns {string} Signed JWT token
 */
const generateToken = (id) => {
  const secret = process.env.JWT_SECRET || 'dev_only_insecure_secret';
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  return jwt.sign({ id }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d'
  });
};

module.exports = generateToken;
