/**
 * authService.js
 *
 * Core business logic for authentication:
 * - Password hashing and comparison using bcryptjs
 * - 6-digit OTP generation and secure SHA-256 hashing
 * - PostgreSQL user and OTP persistence
 * - JWT issuance and verification
 * - Automatic watchlist creation upon verified registration
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'groww-smart-watchlist-default-secret-dev';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const OTP_EXPIRY_MINUTES = 10;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Hash a plaintext password using bcrypt (cost 10) */
async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, 10);
}

/** Compare plaintext password with stored hash */
async function comparePassword(plainPassword, storedHash) {
  if (!storedHash) return false;
  return bcrypt.compare(plainPassword, storedHash);
}

/** Generate a 6-digit numeric OTP */
function generateOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

/** Securely hash OTP before database storage */
function hashOtp(otp) {
  return crypto.createHash('sha256').update(otp.trim()).digest('hex');
}

/** Sign a JWT token for an authenticated user */
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/** Verify a JWT token string */
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// ── Database Operations ───────────────────────────────────────────────────────

/**
 * Register or update an unverified user and store a hashed OTP.
 * Returns { user, otp, isDev: true }
 */
async function registerUser({ username, email, password }) {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedUsername = username.trim();
  const passwordHash = await hashPassword(password);

  // Check if email or username is already taken by a verified user
  const existingVerified = await db.query(
    `SELECT id, email, username, email_verified
     FROM users
     WHERE (LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($2))
     LIMIT 1`,
    [normalizedEmail, normalizedUsername]
  );

  let user;

  if (existingVerified.rows.length > 0) {
    const existing = existingVerified.rows[0];
    if (existing.email_verified) {
      if (existing.email.toLowerCase() === normalizedEmail) {
        throw new Error('Email is already registered.');
      }
      throw new Error('Username is already taken.');
    }

    // Existing user registered previously but not yet verified: update credentials
    const updateResult = await db.query(
      `UPDATE users
       SET username = $1, display_name = $1, password_hash = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING id, username, display_name, email, email_verified, created_at`,
      [normalizedUsername, passwordHash, existing.id]
    );
    user = updateResult.rows[0];
  } else {
    // Brand new user
    const insertResult = await db.query(
      `INSERT INTO users (username, display_name, email, password_hash, email_verified)
       VALUES ($1, $1, $2, $3, FALSE)
       RETURNING id, username, display_name, email, email_verified, created_at`,
      [normalizedUsername, normalizedEmail, passwordHash]
    );
    user = insertResult.rows[0];
  }

  // Invalidate any previously active OTPs for this user
  await db.query(
    `UPDATE user_otps
     SET verified_at = NOW()
     WHERE user_id = $1 AND verified_at IS NULL`,
    [user.id]
  );

  // Generate OTP and store SHA-256 hash
  const otp = generateOtp();
  const otpHash = hashOtp(otp);

  await db.query(
    `INSERT INTO user_otps (user_id, otp_hash, expires_at)
     VALUES ($1, $2, NOW() + ($3 || ' minutes')::INTERVAL)`,
    [user.id, otpHash, OTP_EXPIRY_MINUTES]
  );

  return { user, otp };
}

/**
 * Verify OTP entered by user.
 * Marks user as email_verified, creates default watchlist, returns JWT token.
 */
async function verifyOtp({ email, otp }) {
  const normalizedEmail = email.trim().toLowerCase();

  const userResult = await db.query(
    `SELECT id, username, display_name, email, email_verified
     FROM users
     WHERE LOWER(email) = LOWER($1)`,
    [normalizedEmail]
  );

  if (userResult.rows.length === 0) {
    throw new Error('Account not found.');
  }

  const user = userResult.rows[0];
  const inputOtpHash = hashOtp(otp);

  // Fetch the latest unverified OTP
  const otpResult = await db.query(
    `SELECT id, otp_hash, expires_at, verified_at
     FROM user_otps
     WHERE user_id = $1 AND verified_at IS NULL
     ORDER BY created_at DESC
     LIMIT 1`,
    [user.id]
  );

  if (otpResult.rows.length === 0) {
    throw new Error('No pending OTP found. Please request a new OTP.');
  }

  const otpRecord = otpResult.rows[0];

  // Check if expired
  if (new Date(otpRecord.expires_at) < new Date()) {
    throw new Error('OTP has expired. Please request a new one.');
  }

  // Compare hashes
  if (otpRecord.otp_hash !== inputOtpHash) {
    throw new Error('Invalid OTP. Please check and try again.');
  }

  // Mark OTP as verified
  await db.query(
    `UPDATE user_otps
     SET verified_at = NOW()
     WHERE id = $1`,
    [otpRecord.id]
  );

  // Mark user verified
  await db.query(
    `UPDATE users
     SET email_verified = TRUE, updated_at = NOW()
     WHERE id = $1`,
    [user.id]
  );

  // Create default watchlist for this user if they don't already have one
  await db.query(
    `INSERT INTO watchlists (user_id, name)
     VALUES ($1, 'My Watchlist')
     ON CONFLICT (user_id, name) DO NOTHING`,
    [user.id]
  );

  user.email_verified = true;
  const token = generateToken(user);

  return {
    user: {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      email: user.email,
      emailVerified: true,
    },
    token,
  };
}

/**
 * Resend a new OTP for an unverified account.
 */
async function resendOtp(email) {
  const normalizedEmail = email.trim().toLowerCase();

  const userResult = await db.query(
    `SELECT id, username, email, email_verified
     FROM users
     WHERE LOWER(email) = LOWER($1)`,
    [normalizedEmail]
  );

  if (userResult.rows.length === 0) {
    throw new Error('Account with this email does not exist.');
  }

  const user = userResult.rows[0];
  if (user.email_verified) {
    throw new Error('Email is already verified. Please login.');
  }

  // Invalidate previous OTPs
  await db.query(
    `UPDATE user_otps
     SET verified_at = NOW()
     WHERE user_id = $1 AND verified_at IS NULL`,
    [user.id]
  );

  const otp = generateOtp();
  const otpHash = hashOtp(otp);

  await db.query(
    `INSERT INTO user_otps (user_id, otp_hash, expires_at)
     VALUES ($1, $2, NOW() + ($3 || ' minutes')::INTERVAL)`,
    [user.id, otpHash, OTP_EXPIRY_MINUTES]
  );

  return { user, otp };
}

/**
 * Authenticate email + password.
 * Rejects invalid credentials or unverified accounts.
 */
async function loginUser({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();

  const result = await db.query(
    `SELECT id, username, display_name, email, password_hash, email_verified
     FROM users
     WHERE LOWER(email) = LOWER($1)`,
    [normalizedEmail]
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid email or password.');
  }

  const user = result.rows[0];

  const isPasswordValid = await comparePassword(password, user.password_hash);
  if (!isPasswordValid) {
    throw new Error('Invalid email or password.');
  }

  if (!user.email_verified) {
    const error = new Error('Email verification required. Please verify your email before logging in.');
    error.code = 'EMAIL_NOT_VERIFIED';
    throw error;
  }

  // Ensure default watchlist exists
  await db.query(
    `INSERT INTO watchlists (user_id, name)
     VALUES ($1, 'My Watchlist')
     ON CONFLICT (user_id, name) DO NOTHING`,
    [user.id]
  );

  const token = generateToken(user);

  return {
    user: {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      email: user.email,
      emailVerified: user.email_verified,
    },
    token,
  };
}

/**
 * Get safe user details by ID (for GET /api/auth/me)
 */
async function getUserById(userId) {
  const result = await db.query(
    `SELECT id, username, display_name, email, email_verified, created_at
     FROM users
     WHERE id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    email: row.email,
    emailVerified: row.email_verified,
    createdAt: row.created_at,
  };
}

module.exports = {
  hashPassword,
  comparePassword,
  generateOtp,
  hashOtp,
  generateToken,
  verifyToken,
  registerUser,
  verifyOtp,
  resendOtp,
  loginUser,
  getUserById,
};
