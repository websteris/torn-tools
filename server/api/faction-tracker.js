/**
 * @module FactionTrackerRoutes
 * @description API routes for faction tracking
 */

const express = require('express');
const router = express.Router();
const factionTrackerService = require('../services/faction-tracker/faction-tracker-service');
const warTracker = require('../services/faction-tracker/war-tracker');
const dataProcessor = require('../services/faction-tracker/data-processor');
const { authenticate } = require('../middleware/auth');
const { logger } = require('../utils/logger');

/**
 * Get all tracked factions
 * GET /api/faction-tracker/factions
 */
router.get('/factions', authenticate, async (req, res) => {
  try {
    const trackedFactions = factionTrackerService.getTrackedFactions();
    
    res.json({
      success: true,
      factions: trackedFactions
    });
  } catch (error) {
    logger.error(`Error getting tracked factions: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: error.message || 'Error getting tracked factions'
    });
  }
});

/**
 * Start tracking a faction
 * POST /api/faction-tracker/track
 */
router.post('/track', authenticate, async (req, res) => {
  try {
    const { factionId, targetFactionId, pollingInterval } = req.body;
    const userId = req.user.id;
    
    if (!factionId) {
      return res.status(400).json({
        success: false,
        message: 'Faction ID is required'
      });
    }
    
    const success = await factionTrackerService.trackFaction({
      factionId,
      userId,
      targetFactionId,
      pollingInterval
    });
    
    if (success) {
      res.json({
        success: true,
        message: `Now tracking faction ${factionId}`
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to track faction'
      });
    }
  } catch (error) {
    logger.error(`Error tracking faction: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: error.message || 'Error tracking faction'
    });
  }
});

/**
 * Stop tracking a faction
 * POST /api/faction-tracker/stop
 */
router.post('/stop', authenticate, async (req, res) => {
  try {
    const { factionId } = req.body;
    const userId = req.user.id;
    
    if (!factionId) {
      return res.status(400).json({
        success: false,
        message: 'Faction ID is required'
      });
    }
    
    const success = await factionTrackerService.stopTracking({
      factionId,
      userId
    });
    
    if (success) {
      res.json({
        success: true,
        message: `Stopped tracking faction ${factionId}`
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to stop tracking faction'
      });
    }
  } catch (error) {
    logger.error(`Error stopping faction tracking: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: error.message || 'Error stopping faction tracking'
    });
  }
});

/**
 * Get faction data
 * GET /api/faction-tracker/faction/:factionId
 */
router.get('/faction/:factionId', authenticate, async (req, res) => {
  try {
    const factionId = req.params.factionId;
    
    if (!factionId) {
      return res.status(400).json({
        success: false,
        message: 'Faction ID is required'
      });
    }
    
    const factionData = await dataProcessor.getLatestFactionData(factionId);
    
    if (!factionData) {
      return res.status(404).json({
        success: false,
        message: `No data found for faction ${factionId}`
      });
    }
    
    res.json({
      success: true,
      faction: factionData
    });
  } catch (error) {
    logger.error(`Error getting faction data: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: error.message || 'Error getting faction data'
    });
  }
});

/**
 * Get faction members
 * GET /api/faction-tracker/faction/:factionId/members
 */
router.get('/faction/:factionId/members', authenticate, async (req, res) => {
  try {
    const factionId = req.params.factionId;
    
    if (!factionId) {
      return res.status(400).json({
        success: false,
        message: 'Faction ID is required'
      });
    }
    
    const members = await dataProcessor.getLatestMembersData(factionId);
    
    res.json({
      success: true,
      members
    });
  } catch (error) {
    logger.error(`Error getting faction members: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: error.message || 'Error getting faction members'
    });
  }
});

/**
 * Get active wars for a faction
 * GET /api/faction-tracker/faction/:factionId/wars/active
 */
router.get('/faction/:factionId/wars/active', authenticate, async (req, res) => {
  try {
    const factionId = req.params.factionId;
    
    if (!factionId) {
      return res.status(400).json({
        success: false,
        message: 'Faction ID is required'
      });
    }
    
    const activeWars = await warTracker.getActiveWars(factionId);
    
    res.json({
      success: true,
      wars: activeWars
    });
  } catch (error) {
    logger.error(`Error getting active wars: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: error.message || 'Error getting active wars'
    });
  }
});

/**
 * Get war history for a faction
 * GET /api/faction-tracker/faction/:factionId/wars/history
 */
router.get('/faction/:factionId/wars/history', authenticate, async (req, res) => {
  try {
    const factionId = req.params.factionId;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    
    if (!factionId) {
      return res.status(400).json({
        success: false,
        message: 'Faction ID is required'
      });
    }
    
    const warHistory = await warTracker.getWarHistory(factionId, limit);
    
    res.json({
      success: true,
      wars: warHistory
    });
  } catch (error) {
    logger.error(`Error getting war history: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: error.message || 'Error getting war history'
    });
  }
});

/**
 * Get details for a specific war
 * GET /api/faction-tracker/war/:warId/:warType
 */
router.get('/war/:warId/:warType', authenticate, async (req, res) => {
  try {
    const warId = req.params.warId;
    const warType = req.params.warType;

    if (!warId || !warType) {
      return res.status(400).json({
        success: false,
        message: 'War ID and war type are required'
      });
    }

    const warDetails = await warTracker.getWarDetails(warId, warType);

    if (!warDetails) {
      return res.status(404).json({
        success: false,
        message: `No details found for war ${warId}`
      });
    }

    res.json({
      success: true,
      war: warDetails
    });
  } catch (error) {
    logger.error(`Error getting war details: ${error.message}`);

    res.status(500).json({
      success: false,
      message: error.message || 'Error getting war details'
    });
  }
});

/**
 * Get factions currently at war with a faction
 * GET /api/faction-tracker/faction/:factionId/opponents
 */
router.get('/faction/:factionId/opponents', authenticate, async (req, res) => {
  try {
    const factionId = req.params.factionId;

    if (!factionId) {
      return res.status(400).json({
        success: false,
        message: 'Faction ID is required'
      });
    }

    const opponents = await warTracker.getWarOpponents(factionId);

    res.json({
      success: true,
      opponents
    });
  } catch (error) {
    logger.error(`Error getting war opponents: ${error.message}`);

    res.status(500).json({
      success: false,
      message: error.message || 'Error getting war opponents'
    });
  }
});

module.exports = router;
