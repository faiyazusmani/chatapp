const express = require('express');
const router = express.Router();
const { updateProfile, getUserById, updateTheme, updatePersonality } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.put('/profile', protect, updateProfile);
router.put('/theme', protect, updateTheme);
router.put('/personality', protect, updatePersonality);
router.get('/:id', getUserById);

module.exports = router;
