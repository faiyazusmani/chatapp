const express = require('express');
const router = express.Router();
const {
  createRoom,
  getAllRooms,
  getRoomByCode,
  joinRoomByCode,
  leaveRoom,
  getRoomMembers
} = require('../controllers/roomController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createRoom);
router.get('/', protect, getAllRooms);
router.get('/code/:code', protect, getRoomByCode);
router.post('/join', protect, joinRoomByCode);
router.post('/:id/leave', protect, leaveRoom);
router.get('/:id/members', protect, getRoomMembers);

module.exports = router;
