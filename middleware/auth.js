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
  try {
    // Get session token from cookie
    const sessionToken = req.cookies?.session_token;
    
    if (!sessionToken) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    // Validate the session
    const isValid = await authService.validateSession(sessionToken);
    
    if (!isValid) {
      // Clear the invalid cookie
      res.clearCookie('session_token');
      
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session'
      });
    }
    
    // In a real implementation, you would attach the user object
    // to the request. This is a placeholder.
    req.user = {
      id: 1,
      username: 'TestUser',
      torn_id: 12345
    };
    
    next();
  } catch (error) {
    logger.error(`Authentication error: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

module.exports = {
  authenticate
};
