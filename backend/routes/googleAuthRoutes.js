/**
 * Routes for Google OAuth authentication
 * Endpoint: POST /api/auth/google
 * Note: This file only defines the route; mounting is not modified here.
 */
const express = require('express');
const router = express.Router();
const { googleLogin } = require('../controllers/googleAuthController');

router.post('/google', googleLogin);

module.exports = router;
