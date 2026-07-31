const express = require('express');
const router = express.Router();
const {
  createRoom,
  getAllRooms,
  getRoomByCode,
  joinRoomByCode,
  joinRoomByInvite,
  leaveRoom,
  deleteRoom,
  updateRoom,
  addMember,
  removeMember,
  promoteMember,
  getRoomMembers,
  searchRooms
} = require('../controllers/roomController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createRoom);
router.get('/', protect, getAllRooms);
router.get('/search', protect, searchRooms);
router.get('/code/:code', protect, getRoomByCode);
router.post('/join', protect, joinRoomByCode);
router.post('/invite/:inviteCode', protect, joinRoomByInvite);
router.post('/:id/leave', protect, leaveRoom);
router.get('/:id/members', protect, getRoomMembers);
router.post('/:id/members', protect, addMember);
router.delete('/:id/members/:userId', protect, removeMember);
router.post('/:id/admins', protect, promoteMember);
router.put('/:id', protect, updateRoom);
router.delete('/:id', protect, deleteRoom);

module.exports = router;
