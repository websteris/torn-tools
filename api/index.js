/**
 * @module ApiRoutes
 * @description Main API router that assembles all API routes
 */
const express = require('express');
const router = express.Router();

// Import route modules
const apiKeysRoutes = require('./api-keys');
const authRoutes = require('./auth');
const testRoutes = require('./test');
const dataRoutes = require('./data');
// Uncomment the faction tracker routes
const factionTrackerRoutes = require('./faction-tracker');

// API metadata endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'Torn Dashboard API',
    version: '0.1.0',
    endpoints: [
      '/api/auth/register',
      '/api/auth/login',
      '/api/auth/logout',
      '/api/auth/profile',
      '/api/keys',
      '/api/test/torn-api',
      '/api/data/user',
      '/api/data/faction/:factionId',
      '/api/data/torn',
      // Re-enable faction tracker endpoints
      '/api/faction-tracker/factions',
      '/api/faction-tracker/track',
      '/api/faction-tracker/stop',
      '/api/faction-tracker/faction/:factionId',
      '/api/faction-tracker/faction/:factionId/members',
      '/api/faction-tracker/faction/:factionId/wars/active',
      '/api/faction-tracker/faction/:factionId/wars/history',
      '/api/faction-tracker/war/:warId/:warType',
      '/api/faction-tracker/faction/:factionId/opponents',
      // Add other endpoints as they are implemented
    ]
  });
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/keys', apiKeysRoutes);
router.use('/test', testRoutes);
router.use('/data', dataRoutes);
// Re-enable faction tracker routes
router.use('/faction-tracker', factionTrackerRoutes);

// 404 handler for API routes
router.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`
  });
});

module.exports = router;
