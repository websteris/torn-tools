/**
 * @module AuthRoutes
 * @description Authentication routes for user registration and login
 */

const express = require('express');
const router = express.Router();
const authService = require('../services/auth/auth-service');
const { logger } = require('../utils/logger');

/**
 * Register a new user with Torn API key
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
  try {
    const { apiKey, keyName } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: 'API key is required'
      });
    }
    
    const result = await authService.registerWithApiKey({
      apiKey,
      keyName: keyName || 'Primary API Key'
    });
    
    // Set session token as a cookie
    res.cookie('session_token', result.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: result.user
    });
  } catch (error) {
    logger.error(`Registration error: ${error.message}`);
    
    res.status(400).json({
      success: false,
      message: error.message || 'Registration failed'
    });
  }
});

/**
 * Login with Torn API key
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { apiKey } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: 'API key is required'
      });
    }
    
    const result = await authService.authenticateWithApiKey(apiKey);
    
    // Set session token as a cookie
    res.cookie('session_token', result.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    res.json({
      success: true,
      message: 'Login successful',
      user: result.user
    });
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    
    res.status(401).json({
      success: false,
      message: error.message || 'Authentication failed'
    });
  }
});

/**
 * Logout current user
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
  // Clear the session cookie
  res.clearCookie('session_token');
  
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

/**
 * Get current user profile
 * GET /api/auth/profile
 */
router.get('/profile', async (req, res) => {
  try {
    // In a real implementation, you would extract the user ID from
    // the authenticated session. This is a placeholder.
    const sessionToken = req.cookies.session_token;
    
    if (!sessionToken) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    // Validate the session
    const isValid = await authService.validateSession(sessionToken);
    
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session'
      });
    }
    
    // For now, return a placeholder profile
    // In a real implementation, you would fetch the user profile
    res.json({
      success: true,
      user: {
        id: 1,
        username: 'TestUser',
        torn_id: 12345,
        faction_id: 9876,
        faction_name: 'Test Faction'
      }
    });
  } catch (error) {
    logger.error(`Profile fetch error: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch profile'
    });
  }
});

module.exports = router;
