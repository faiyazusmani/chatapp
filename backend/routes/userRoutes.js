const express = require('express');
const router = express.Router();
const {
  updateProfile,
  getUserById,
  updateTheme,
  updatePersonality,
  searchUsers,
  getStarredMessages,
  getAllUsers,
  sendFollowRequest,
  acceptFollowRequest,
  declineFollowRequest,
  unfollowUser,
  getFollowRequests,
  getOrCreateDirectRoom,
  deleteUser
} = require('../controllers/userController');
const { protect, requireSuperAdmin } = require('../middleware/authMiddleware');

router.get('/all', protect, getAllUsers);
router.get('/follow-requests', protect, getFollowRequests);
router.post('/:targetId/follow-request', protect, sendFollowRequest);
router.post('/:targetId/accept-request', protect, acceptFollowRequest);
router.post('/:targetId/decline-request', protect, declineFollowRequest);
router.post('/:targetId/unfollow', protect, unfollowUser);
router.post('/:targetId/direct-room', protect, getOrCreateDirectRoom);
router.delete('/:id', protect, requireSuperAdmin, deleteUser);

router.put('/profile', protect, updateProfile);
router.put('/theme', protect, updateTheme);
router.put('/personality', protect, updatePersonality);
router.get('/search', protect, searchUsers);
router.get('/starred', protect, getStarredMessages);
router.get('/:id', getUserById);

module.exports = router;
