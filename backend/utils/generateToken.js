const jwt = require('jsonwebtoken');

/**
 * Generate a JWT token containing user ID
 * @param {string} id - User Mongoose ObjectID
 * @returns {string} Signed JWT token
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production', {
    expiresIn: '30d'
  });
};

module.exports = generateToken;
