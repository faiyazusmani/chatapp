const express = require('express');
const router = express.Router();
const { updateProfile, getUserById } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.put('/profile', protect, updateProfile);
router.get('/:id', getUserById);

module.exports = router;
