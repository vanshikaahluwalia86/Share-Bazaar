/**
 * routes/auth.js
 *
 * Express routes for authentication:
 * - POST /api/auth/register
 * - POST /api/auth/verify-otp
 * - POST /api/auth/resend-otp
 * - POST /api/auth/login
 * - POST /api/auth/logout
 * - GET  /api/auth/me (Protected by authenticateToken)
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Public endpoints
router.post('/register', authController.register);
router.post('/verify-otp', authController.verifyOtp);
router.post('/resend-otp', authController.resendOtp);
router.post('/login', authController.login);
router.post('/logout', authController.logout);

// Protected endpoint
router.get('/me', authenticateToken, authController.getMe);

module.exports = router;
