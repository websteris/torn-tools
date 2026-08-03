/**
 * @module Server
 * @description Main server entry point for Torn Dashboard
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const { logger } = require('./utils/logger');

// Uncomment services
const pollingService = require('./services/polling/polling-service');
const factionTrackerService = require('./services/faction-tracker/faction-tracker-service');
const { requireParsedBody, bodyParseErrorHandler } = require('./middleware/require-parsed-body');
const { errorHandler } = require('./middleware/errors');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors({ 
  origin: process.env.CORS_ORIGIN || 'http://localhost:8080',
  credentials: true
})); // CORS support with credentials
app.use(compression()); // Response compression
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(cookieParser()); // Parse cookies

// Reject a POST/PUT/PATCH whose body couldn't be parsed. Express 5 leaves
// req.body `undefined` (no matching parser / no body); handlers destructure it
// directly, so this returns a 400 instead of letting them throw a 500. Mounted
// after the parsers, before the routers. See middleware/require-parsed-body.js.
app.use(requireParsedBody);

// Inbound rate limiting (there was none). Strict on the unauthenticated
// credential + Torn-API-proxy endpoints; moderate on the rest of /api (which
// includes the Torn-API-fanout data / keys-verify / faction-tracker routes).
// Mounted before the routers so a flood is rejected without reaching a handler.
const { strictLimiter, generalLimiter } = require('./middleware/rate-limit');
app.use(['/api/auth/login', '/api/auth/register', '/api/test'], strictLimiter);
app.use('/api', generalLimiter);

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// API routes
console.log('Loading API routes...');
try {
  const apiRoutes = require('./api');
  console.log('API routes loaded successfully.');
  app.use('/api', apiRoutes);
} catch (error) {
  console.error('Error loading API routes:', error);
}

// Body-parser failures (e.g. malformed JSON sent with Content-Type:
// application/json throw before requireParsedBody can run) -> uniform 400,
// not a 500 from the generic handler below. See middleware/require-parsed-body.js.
app.use(bodyParseErrorHandler);

// Central error handler (#40): every error — thrown/next()'d from a route or
// middleware, or an unexpected throw — leaves as the single { success:false,
// error:{ code, message } } envelope, with 5xx internals logged not leaked.
// Mounted last, after the routers and bodyParseErrorHandler.
app.use(errorHandler);

// Start the server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Uncomment services
    try {
      console.log('Starting polling service...');
      pollingService.start();
      console.log('Starting faction tracker service...');
      factionTrackerService.start();
    } catch (error) {
      console.error('Error starting services:', error);
    }
  });
}

// Export for testing
module.exports = app;
