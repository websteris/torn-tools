/**
 * @module ApiKeysRoutes
 * @description API routes for managing API keys
 */

const express = require('express');
const router = express.Router();
const apiKeyModel = require('../db/models/api-key');
const { logger } = require('../utils/logger');

// Middleware to check authentication
// This is a placeholder - you'll need to implement proper authentication
const authenticateUser = (req, res, next) => {
  // For now, we'll just set a placeholder user ID
  // In a real application, this would come from your authentication system
  req.userId = 1; // Placeholder user ID
  next();
};

/**
 * Get all API keys for the authenticated user
 * GET /api/keys
 */
router.get('/', authenticateUser, async (req, res) => {
  try {
    const keys = await apiKeyModel.findByUserId(req.userId);
    res.json({ success: true, keys });
  } catch (error) {
    logger.error(`Error getting API keys: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve API keys',
      error: error.message
    });
  }
});

/**
 * Get an API key by ID
 * GET /api/keys/:id
 */
router.get('/:id', authenticateUser, async (req, res) => {
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
      message: 'Failed to retrieve API key',
      error: error.message
    });
  }
});

/**
 * Create a new API key
 * POST /api/keys
 */
router.post('/', authenticateUser, async (req, res) => {
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
      message: 'Failed to create API key',
      error: error.message
    });
  }
});

/**
 * Update an API key
 * PUT /api/keys/:id
 */
router.put('/:id', authenticateUser, async (req, res) => {
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
    
    // Handle not found errors
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update API key',
      error: error.message
    });
  }
});

/**
 * Delete an API key
 * DELETE /api/keys/:id
 */
router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    await apiKeyModel.delete(req.params.id, req.userId);
    res.json({ 
      success: true, 
      message: 'API key deleted successfully' 
    });
  } catch (error) {
    logger.error(`Error deleting API key: ${error.message}`);
    
    // Handle not found errors
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to delete API key',
      error: error.message
    });
  }
});

/**
 * Verify an API key (check if it works with Torn API)
 * POST /api/keys/:id/verify
 */
router.post('/:id/verify', authenticateUser, async (req, res) => {
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
      message: 'Failed to verify API key',
      error: error.message
    });
  }
});

module.exports = router;
