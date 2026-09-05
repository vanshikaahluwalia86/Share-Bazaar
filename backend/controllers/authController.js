/**
 * authController.js
 *
 * Handles HTTP requests for user registration, OTP verification,
 * login, logout, and current user profile inspection.
 */

const authService = require('../services/authService');

// Basic email regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/auth/register
 * Body: { username, email, password }
 */
async function register(req, res, next) {
  try {
    const { username, email, password } = req.body || {};

    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      return res.status(400).json({
        error: 'Username is required and must be at least 3 characters long.',
      });
    }

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({
        error: 'Please enter a valid email address.',
      });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        error: 'Password is required and must be at least 6 characters long.',
      });
    }

    const { user, otp } = await authService.registerUser({
      username: username.trim(),
      email: email.trim(),
      password,
    });

    console.log(`[AUTH] 📧 [Dev Mode] Registration OTP for ${user.email}: ${otp}`);

    // In production without an active SMTP provider, devOtp is returned for instant demo testing
    return res.status(201).json({
      message: 'Registration initiated. Please enter the 6-digit OTP sent to your email.',
      email: user.email,
      username: user.username,
      devOtp: otp,
      isDevMode: true,
    });
  } catch (err) {
    if (
      err.message.includes('already registered') ||
      err.message.includes('already taken')
    ) {
      return res.status(409).json({ error: err.message });
    }
    next(err);
  }
}

/**
 * POST /api/auth/verify-otp
 * Body: { email, otp }
 */
async function verifyOtp(req, res, next) {
  try {
    const { email, otp } = req.body || {};

    if (!email || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ error: 'Valid email is required.' });
    }

    if (!otp || typeof otp !== 'string' || otp.trim().length !== 6) {
      return res.status(400).json({ error: 'Please enter the 6-digit OTP.' });
    }

    const result = await authService.verifyOtp({
      email: email.trim(),
      otp: otp.trim(),
    });

    console.log(`[AUTH] ✅ User verified and logged in: ${result.user.email}`);

    return res.status(200).json({
      message: 'Email verified successfully! Welcome to Smart Market Watchlist.',
      user: result.user,
      token: result.token,
    });
  } catch (err) {
    if (
      err.message.includes('Invalid OTP') ||
      err.message.includes('expired') ||
      err.message.includes('No pending OTP')
    ) {
      return res.status(400).json({ error: err.message });
    }
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
}

/**
 * POST /api/auth/resend-otp
 * Body: { email }
 */
async function resendOtp(req, res, next) {
  try {
    const { email } = req.body || {};

    if (!email || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ error: 'Valid email is required.' });
    }

    const { user, otp } = await authService.resendOtp(email.trim());

    console.log(`[AUTH] 📧 [Dev Mode] Resent OTP for ${user.email}: ${otp}`);

    return res.status(200).json({
      message: 'A new OTP has been generated.',
      email: user.email,
      devOtp: otp,
      isDevMode: true,
    });
  } catch (err) {
    if (err.message.includes('already verified')) {
      return res.status(400).json({ error: err.message });
    }
    if (err.message.includes('does not exist')) {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
}

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};

    if (!email || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Password is required.' });
    }

    const result = await authService.loginUser({
      email: email.trim(),
      password,
    });

    console.log(`[AUTH] 🔐 User logged in: ${result.user.email}`);

    return res.status(200).json({
      message: 'Login successful.',
      user: result.user,
      token: result.token,
    });
  } catch (err) {
    if (err.code === 'EMAIL_NOT_VERIFIED') {
      return res.status(403).json({
        error: err.message,
        code: 'EMAIL_NOT_VERIFIED',
      });
    }
    if (err.message.includes('Invalid email or password')) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    next(err);
  }
}

/**
 * POST /api/auth/logout
 */
function logout(_req, res) {
  return res.status(200).json({ message: 'Logged out successfully.' });
}

/**
 * GET /api/auth/me
 * Protected by authenticateToken middleware
 */
function getMe(req, res) {
  return res.status(200).json({ user: req.user });
}

module.exports = {
  register,
  verifyOtp,
  resendOtp,
  login,
  logout,
  getMe,
};
