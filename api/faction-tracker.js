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
const { validate } = require('../middleware/validate');
const { schemas } = require('./schemas');
const { notFound, validationError, internal } = require('../middleware/errors');

/**
 * Get all tracked factions
 * GET /api/faction-tracker/factions
 */
router.get('/factions', authenticate, async (req, res, next) => {
  try {
    const trackedFactions = factionTrackerService.getTrackedFactions();
    
    res.json({
      success: true,
      factions: trackedFactions
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * Start tracking a faction
 * POST /api/faction-tracker/track
 */
router.post('/track', authenticate, validate({ body: schemas.trackBody }), async (req, res, next) => {
  try {
    const { factionId, targetFactionId, pollingInterval } = req.body;  // validated by schema
    const userId = req.user.id;
    
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
      return next(internal('Failed to track faction'));
    }
  } catch (error) {
    return next(error);
  }
});

/**
 * Stop tracking a faction
 * POST /api/faction-tracker/stop
 */
router.post('/stop', authenticate, validate({ body: schemas.stopBody }), async (req, res, next) => {
  try {
    const { factionId } = req.body;
    const userId = req.user.id;
    
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
      return next(internal('Failed to stop tracking faction'));
    }
  } catch (error) {
    return next(error);
  }
});

/**
 * Get faction data
 * GET /api/faction-tracker/faction/:factionId
 */
router.get('/faction/:factionId', authenticate, validate({ params: schemas.factionIdParam }), async (req, res, next) => {
  try {
    const factionId = req.params.factionId;
    
    const factionData = await dataProcessor.getLatestFactionData(factionId);
    
    if (!factionData) {
      return next(notFound(`No data found for faction ${factionId}`));
    }
    
    res.json({
      success: true,
      faction: factionData
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * Get faction members
 * GET /api/faction-tracker/faction/:factionId/members
 */
router.get('/faction/:factionId/members', authenticate, validate({ params: schemas.factionIdParam }), async (req, res, next) => {
  try {
    const factionId = req.params.factionId;
    
    const members = await dataProcessor.getLatestMembersData(factionId);
    
    res.json({
      success: true,
      members
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * Get active wars for a faction
 * GET /api/faction-tracker/faction/:factionId/wars/active
 */
router.get('/faction/:factionId/wars/active', authenticate, validate({ params: schemas.factionIdParam }), async (req, res, next) => {
  try {
    const factionId = req.params.factionId;
    
    const activeWars = await warTracker.getActiveWars(factionId);
    
    res.json({
      success: true,
      wars: activeWars
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * Get war history for a faction
 * GET /api/faction-tracker/faction/:factionId/wars/history
 */
router.get('/faction/:factionId/wars/history', authenticate, validate({ params: schemas.factionIdParam, query: schemas.historyQuery }), async (req, res, next) => {
  try {
    const factionId = req.params.factionId;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    
    const warHistory = await warTracker.getWarHistory(factionId, limit);
    
    res.json({
      success: true,
      wars: warHistory
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * Get details for a specific war
 * GET /api/faction-tracker/war/:warId/:warType
 */
router.get('/war/:warId/:warType', authenticate, validate({ params: schemas.warIdTypeParams }), async (req, res, next) => {
  try {
    const warId = req.params.warId;
    const warType = req.params.warType;

    const warDetails = await warTracker.getWarDetails(warId, warType);

    if (!warDetails) {
      return next(notFound(`No details found for war ${warId}`));
    }

    res.json({
      success: true,
      war: warDetails
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * Get factions currently at war with a faction
 * GET /api/faction-tracker/faction/:factionId/opponents
 */
router.get('/faction/:factionId/opponents', authenticate, validate({ params: schemas.factionIdParam }), async (req, res, next) => {
  try {
    const factionId = req.params.factionId;

    const opponents = await warTracker.getWarOpponents(factionId);

    res.json({
      success: true,
      opponents
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
