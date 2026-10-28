const express = require('express');
const router = express.Router();
const {
  createStatus,
  getActiveStatuses,
  getMyStatuses,
  getUserStatuses,
  viewStatus,
  deleteStatus
} = require('../controllers/statusController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createStatus);
router.get('/', protect, getActiveStatuses);
router.get('/my', protect, getMyStatuses);
router.get('/user/:userId', protect, getUserStatuses);
router.post('/:id/view', protect, viewStatus);
router.delete('/:id', protect, deleteStatus);

module.exports = router;
