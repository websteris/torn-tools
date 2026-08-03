/**
 * @module ApiKeysRoutes
 * @description API routes for managing API keys
 */

const express = require('express');
const router = express.Router();
const apiKeyModel = require('../db/models/api-key');
const { logger } = require('../utils/logger');
const { authenticate } = require('../middleware/auth');

/**
 * Get all API keys for the authenticated user
 * GET /api/keys
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const keys = await apiKeyModel.findByUserId(req.userId);
    res.json({ success: true, keys });
  } catch (error) {
    logger.error(`Error getting API keys: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve API keys'
    });
  }
});

/**
 * Get an API key by ID
 * GET /api/keys/:id
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const key = await apiKeyModel.findById(req.params.id, req.userId);
    
    if (!key) {
      return res.status(404).json({
        success: false,
        message: 'API key not found'
      });
    }
    
    res.json({ success: true, key });
  } catch (error) {
    logger.error(`Error getting API key: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve API key'
    });
  }
});

/**
 * Create a new API key
 * POST /api/keys
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { key_name, key_value, active } = req.body;
    
    if (!key_name || !key_value) {
      return res.status(400).json({
        success: false,
        message: 'Key name and value are required'
      });
    }
    
    const newKey = await apiKeyModel.create({
      user_id: req.userId,
      key_name,
      key_value,
      active: active !== undefined ? active : true
    });
    
    res.status(201).json({ success: true, key: newKey });
  } catch (error) {
    logger.error(`Error creating API key: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to create API key'
    });
  }
});

/**
 * Update an API key
 * PUT /api/keys/:id
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { key_name, key_value, active } = req.body;
    
    // At least one field must be provided
    if (!key_name && key_value === undefined && active === undefined) {
      return res.status(400).json({
        success: false,
        message: 'At least one field to update is required'
      });
    }
    
    const updatedKey = await apiKeyModel.update(
      req.params.id,
      req.userId,
      { key_name, key_value, active }
    );
    
    res.json({ success: true, key: updatedKey });
  } catch (error) {
    logger.error(`Error updating API key: ${error.message}`);
    
    // Not-found is signalled by a typed error code from the model, not by
    // matching the message prose (which also names the internal user id).
    if (error.code === 'NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'API key not found'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update API key'
    });
  }
});

/**
 * Delete an API key
 * DELETE /api/keys/:id
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await apiKeyModel.delete(req.params.id, req.userId);
    res.json({ 
      success: true, 
      message: 'API key deleted successfully' 
    });
  } catch (error) {
    logger.error(`Error deleting API key: ${error.message}`);
    
    // Not-found is signalled by a typed error code from the model, not by
    // matching the message prose (which also names the internal user id).
    if (error.code === 'NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'API key not found'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to delete API key'
    });
  }
});

/**
 * Verify an API key (check if it works with Torn API)
 * POST /api/keys/:id/verify
 */
router.post('/:id/verify', authenticate, async (req, res) => {
  try {
    // Get the API key value
    const keyValue = await apiKeyModel.getKeyValue(req.params.id, req.userId);
    
    // Here you would use your Torn API client to verify the key
    // This is a placeholder for the actual verification logic
    const TornApiClient = require('../services/torn-api/client');
    const apiClient = new TornApiClient();
    
    try {
      // Make a simple request to check if the key is valid
      const result = await apiClient.getUserData(keyValue, ['basic']);
      
      // If we get here, the key is valid
      res.json({
        success: true,
        valid: true,
        message: 'API key is valid',
        user_id: result.player_id
      });
    } catch (apiError) {
      // Check if this is an invalid key error
      if (apiError.code === 2) {
        return res.json({
          success: true,
          valid: false,
          message: 'Invalid API key',
          error: apiError.message
        });
      }
      
      // Other API errors
      throw apiError;
    }
  } catch (error) {
    logger.error(`Error verifying API key: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to verify API key'
    });
  }
});

module.exports = router;
