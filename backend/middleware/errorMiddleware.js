/**
 * Centralized error handler middleware.
 * Maps Mongoose/Multer/JWT errors to proper HTTP status codes
 * so the client never sees a bare 500 or a stack trace.
 */
const logger = require('../utils/logger');

const errorHandler = (err, req, res, _next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || 'Server Error';

  // Mongoose: invalid ObjectId
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // Mongoose: duplicate key (unique index violation)
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} is already taken`;
  }

  // Mongoose: validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
  }

  // Multer: file too large
  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
    message = 'File too large. Maximum allowed size is 25MB.';
  }

  // Multer: unexpected file field / other multer errors
  if (err.name === 'MulterError' || err.status === 400 || (err.message && err.message.startsWith('Unsupported file format'))) {
    statusCode = err.status || 400;
    message = err.message;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = err.name === 'TokenExpiredError' ? 'Session expired. Please log in again.' : 'Invalid authentication token.';
  }

  // CORS errors thrown by the origin callback
  if (err.message && err.message.startsWith('[CORS Error]')) {
    statusCode = 403;
  }

  if (statusCode >= 500) {
    logger.error(`[ErrorHandler] ${err.stack || err.message}`);
  } else {
    logger.warn(`[ErrorHandler] ${statusCode} - ${message}`);
  }

  res.status(statusCode).json({
    message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
};

// 404 handler for unknown API routes
const notFoundHandler = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

module.exports = { errorHandler, notFoundHandler };
