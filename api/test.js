/**
 * @module TestRoutes
 * @description Test routes for development and debugging
 */

const express = require('express');
const router = express.Router();
const TornApiClient = require('../services/torn-api/client');
const { logger } = require('../utils/logger');
const { validationError } = require('../middleware/errors');

const apiClient = new TornApiClient();

/**
 * Test Torn API connectivity with provided key
 * GET /api/test/torn-api
 */
router.get('/torn-api', async (req, res, next) => {
  try {
    const apiKey = req.query.key;

    if (!apiKey) {
      return next(validationError('API key is required'));
    }

    logger.info('Testing Torn API connectivity');
    const userData = await apiClient.getUserData(apiKey, ['profile', 'personalstats']);
    
    res.json({
      success: true,
      message: 'Torn API connection successful',
      user: {
        id: userData.player_id,
        name: userData.name,
        level: userData.level,
        faction: userData.faction,
        lastAction: userData.last_action
      }
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
