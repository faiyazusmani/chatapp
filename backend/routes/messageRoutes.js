const express = require('express');
const router = express.Router();
const { getRoomMessages, markMessagesAsRead } = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

router.get('/:roomId', protect, getRoomMessages);
router.post('/:roomId/read', protect, markMessagesAsRead);

module.exports = router;
