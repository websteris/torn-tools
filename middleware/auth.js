/**
 * @module AuthMiddleware
 * @description Authentication middleware to protect routes
 */

const authService = require('../services/auth/auth-service');
const { logger } = require('../utils/logger');

/**
 * Middleware to authenticate requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
async function authenticate(req, res, next) {
  // Session token is the JWT issued by loginUser, carried in an httpOnly cookie.
  const sessionToken = req.cookies?.session_token;

  if (!sessionToken) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  let user;
  try {
    // verifyToken checks the JWT signature/expiry and loads the account; it
    // throws on an invalid/expired token or a missing user.
    user = await authService.verifyToken(sessionToken);
  } catch (error) {
    // An invalid/expired token is a 401, not a server error — clear the stale
    // cookie so the client re-authenticates.
    res.clearCookie('session_token');
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session'
    });
  }

  // Identity comes from the validated token — never hard-coded. Expose both
  // shapes the routes use: req.userId (api-keys) and req.user (data/faction).
  req.userId = user.player_id;
  req.user = {
    ...user,
    id: user.player_id,
    // user_accounts has no torn_id column — player_id IS the Torn player id.
    // Fall back so consumers like api/data.js get a real id, not undefined.
    torn_id: user.torn_id ?? user.player_id,
  };
  next();
}

module.exports = {
  authenticate
};
