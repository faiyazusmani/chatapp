const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const googleAuthRoutes = require('./googleAuthRoutes');
const userRoutes = require('./userRoutes');
const roomRoutes = require('./roomRoutes');
const messageRoutes = require('./messageRoutes');
const uploadRoutes = require('./uploadRoutes');
const statusRoutes = require('./statusRoutes');

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'ChatRoom Backend API is operational',
    timestamp: new Date().toISOString()
  });
});

// Authentication routes
router.use('/auth', authRoutes);
// Google OAuth route (POST /api/auth/google)
router.use('/auth', googleAuthRoutes);

// User Profile routes
router.use('/users', userRoutes);

// WhatsApp-style User Status Stories routes
router.use('/status', statusRoutes);

// Room Management routes
router.use('/rooms', roomRoutes);

// Message routes
router.use('/messages', messageRoutes);

// File Upload routes
router.use('/upload', uploadRoutes);

module.exports = router;
