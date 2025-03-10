/**
 * @module DataRoutes
 * @description API routes for accessing Torn data
 */

const express = require('express');
const router = express.Router();
const dataService = require('../services/data/data-service');
const { authenticate } = require('../middleware/auth');
const { logger } = require('../utils/logger');

/**
 * Get user data
 * GET /api/data/user
 */
router.get('/user', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const tornId = req.user.torn_id;
    const selections = req.query.selections 
      ? req.query.selections.split(',') 
      : ['profile', 'bars', 'cooldowns'];
    
    const bypassCache = req.query.bypass === 'true';
    
    const userData = await dataService.getUserData(userId, tornId, selections, { bypassCache });
    
    res.json({
      success: true,
      data: userData
    });
  } catch (error) {
    logger.error(`Error fetching user data: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching user data'
    });
  }
});

/**
 * Get faction data
 * GET /api/data/faction/:factionId
 */
router.get('/faction/:factionId', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const factionId = req.params.factionId;
    const selections = req.query.selections 
      ? req.query.selections.split(',') 
      : ['basic'];
    
    const bypassCache = req.query.bypass === 'true';
    
    const factionData = await dataService.getFactionData(factionId, selections, { 
      bypassCache,
      userId 
    });
    
    res.json({
      success: true,
      data: factionData
    });
  } catch (error) {
    logger.error(`Error fetching faction data: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching faction data'
    });
  }
});

/**
 * Get Torn data
 * GET /api/data/torn
 */
router.get('/torn', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const selections = req.query.selections 
      ? req.query.selections.split(',') 
      : ['items', 'stats'];
    
    const bypassCache = req.query.bypass === 'true';
    
    const tornData = await dataService.getTornData(selections, { 
      bypassCache,
      userId 
    });
    
    res.json({
      success: true,
      data: tornData
    });
  } catch (error) {
    logger.error(`Error fetching Torn data: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching Torn data'
    });
  }
});

module.exports = router;
