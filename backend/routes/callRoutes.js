const express = require('express');
const router = express.Router();
const { getCallHistory } = require('../controllers/callController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getCallHistory);

module.exports = router;
