/**
 * auth.js
 *
 * Express authentication middleware using JWT.
 * Validates the Authorization: Bearer <token> header.
 * Attaches authenticated user object to req.user.
 */

const { verifyToken, getUserById } = require('../services/authService');

/**
 * Strict authentication middleware:
 * Requires a valid JWT token. Rejects with 401 if missing or expired.
 */
async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : null;

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required. Please log in to access this resource.',
      });
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Session expired. Please log in again.' });
      }
      return res.status(401).json({ error: 'Invalid authentication token.' });
    }

    // Verify user exists and is active
    const user = await getUserById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists. Please log in again.' });
    }

    if (!user.emailVerified) {
      return res.status(403).json({ error: 'Email verification required.' });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Optional authentication middleware:
 * If a valid token is provided, sets req.user.
 * If not provided, falls back to DEMO_USER_ID (for development/backwards-compatibility).
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : null;

    if (token) {
      try {
        const decoded = verifyToken(token);
        const user = await getUserById(decoded.id);
        if (user && user.emailVerified) {
          req.user = user;
          return next();
        }
      } catch {
        // Token invalid/expired; fall through to demo fallback
      }
    }

    // Fallback to demo user if available
    const demoId = parseInt(process.env.DEMO_USER_ID || '1', 10);
    const demoUser = await getUserById(demoId);
    if (demoUser) {
      req.user = demoUser;
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { authenticateToken, optionalAuth };
