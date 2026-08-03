/**
 * @module AuthRoutes
 * @description Authentication routes for user registration and login
 */

const express = require('express');
const router = express.Router();
const authService = require('../services/auth/auth-service');
const { logger } = require('../utils/logger');
const { authenticate } = require('../middleware/auth');

/**
 * Register a new user with Torn API key
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
  try {
    const { player_id, name, username, password, preferences } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'username and password are required'
      });
    }

    const user = await authService.registerUser({ player_id, name, username, password, preferences });

    // Registration creates the account; the client then logs in for a session.
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user
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
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'username and password are required'
      });
    }

    const { token, user } = await authService.loginUser({ username, password });

    // The JWT is the session token; the auth middleware verifies it on protected
    // routes. httpOnly so client JS can't read it.
    res.cookie('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24h — matches the JWT expiry
    });

    res.json({
      success: true,
      message: 'Login successful',
      user
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
router.get('/profile', authenticate, (req, res) => {
  // `authenticate` has already validated the session token and attached the
  // account as req.user (401s on a missing/invalid token before we get here).
  res.json({ success: true, user: req.user });
});

module.exports = router;
