const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const roomRoutes = require('./roomRoutes');
const messageRoutes = require('./messageRoutes');
const uploadRoutes = require('./uploadRoutes');

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

// Room Management routes
router.use('/rooms', roomRoutes);

// Message routes
router.use('/messages', messageRoutes);

// File Upload routes
router.use('/upload', uploadRoutes);

module.exports = router;
