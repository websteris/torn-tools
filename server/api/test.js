/**
 * @module TestRoutes
 * @description Test routes for development and debugging
 */

const express = require('express');
const router = express.Router();
const TornApiClient = require('../services/torn-api/client');
const { logger } = require('../utils/logger');

const apiClient = new TornApiClient();

/**
 * Test Torn API connectivity with provided key
 * GET /api/test/torn-api
 */
router.get('/torn-api', async (req, res) => {
  try {
    const apiKey = req.query.key;
    
    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: 'API key is required'
      });
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
    logger.error(`Torn API test error: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: error.message || 'Torn API test failed'
    });
  }
});

module.exports = router;
