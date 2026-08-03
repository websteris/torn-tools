/**
 * @module ApiKeysRoutes
 * @description API routes for managing API keys
 */

const express = require('express');
const router = express.Router();
const apiKeyModel = require('../db/models/api-key');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { schemas } = require('./schemas');
const { notFound, validationError } = require('../middleware/errors');

/**
 * Get all API keys for the authenticated user
 * GET /api/keys
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const keys = await apiKeyModel.findByUserId(req.userId);
    res.json({ success: true, keys });
  } catch (error) {
    return next(error);
  }
});

/**
 * Get an API key by ID
 * GET /api/keys/:id
 */
router.get('/:id', authenticate, validate({ params: schemas.idParam }), async (req, res, next) => {
  try {
    const key = await apiKeyModel.findById(req.params.id, req.userId);
    
    if (!key) {
      return next(notFound('API key not found'));
    }
    
    res.json({ success: true, key });
  } catch (error) {
    return next(error);
  }
});

/**
 * Create a new API key
 * POST /api/keys
 */
router.post('/', authenticate, validate({ body: schemas.apiKeyCreateBody }), async (req, res, next) => {
  try {
    const { key_name, key_value, active } = req.body;

    const newKey = await apiKeyModel.create({
      user_id: req.userId,
      key_name,
      key_value,
      active: active !== undefined ? active : true
    });
    
    res.status(201).json({ success: true, key: newKey });
  } catch (error) {
    return next(error);
  }
});

/**
 * Update an API key
 * PUT /api/keys/:id
 */
router.put('/:id', authenticate, validate({ params: schemas.idParam, body: schemas.apiKeyUpdateBody }), async (req, res, next) => {
  try {
    const { key_name, key_value, active } = req.body;
    
    // At least one field must be provided
    if (!key_name && key_value === undefined && active === undefined) {
      return next(validationError('At least one field to update is required'));
    }
    
    const updatedKey = await apiKeyModel.update(
      req.params.id,
      req.userId,
      { key_name, key_value, active }
    );
    
    res.json({ success: true, key: updatedKey });
  } catch (error) {
    // Not-found is signalled by a typed error code from the model, not by
    // matching the message prose (which also names the internal user id).
    if (error.code === 'NOT_FOUND') {
      return next(notFound('API key not found'));
    }
    return next(error);
  }
});

/**
 * Delete an API key
 * DELETE /api/keys/:id
 */
router.delete('/:id', authenticate, validate({ params: schemas.idParam }), async (req, res, next) => {
  try {
    await apiKeyModel.delete(req.params.id, req.userId);
    res.json({ 
      success: true, 
      message: 'API key deleted successfully' 
    });
  } catch (error) {
    if (error.code === 'NOT_FOUND') {
      return next(notFound('API key not found'));
    }
    return next(error);
  }
});

/**
 * Verify an API key (check if it works with Torn API)
 * POST /api/keys/:id/verify
 */
router.post('/:id/verify', authenticate, validate({ params: schemas.idParam }), async (req, res, next) => {
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
    return next(error);
  }
});

module.exports = router;
