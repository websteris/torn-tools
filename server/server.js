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

// Comment out services that might be causing issues
// const pollingService = require('./services/polling/polling-service');
// const factionTrackerService = require('./services/faction-tracker/faction-tracker-service');

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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });
  res.status(500).json({
    status: 'error',
    message: 'An unexpected error occurred'
  });
});

// Start the server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Comment out services that might be causing issues
    // try {
    //   console.log('Starting polling service...');
    //   pollingService.start();
    //   console.log('Starting faction tracker service...');
    //   factionTrackerService.start();
    // } catch (error) {
    //   console.error('Error starting services:', error);
    // }
  });
}

// Export for testing
module.exports = app;
