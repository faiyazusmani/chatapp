const express = require('express');
const router = express.Router();
const { updateProfile, getUserById, updateTheme } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.put('/profile', protect, updateProfile);
router.put('/theme', protect, updateTheme);
router.get('/:id', getUserById);

module.exports = router;
