const path = require('path');
const knex = require('knex');
const logger = require('../utils/logger');

// Get the environment from NODE_ENV or default to development
const environment = process.env.NODE_ENV || 'development';

// Import the knexfile configuration
const config = require('../knexfile')[environment];

// Add some additional logging for debugging purposes
if (environment === 'development') {
  logger.info(`Using database configuration for ${environment} environment`);
}

// Create and configure the database connection
const db = knex(config);

// Test the connection
db.raw('SELECT 1')
  .then(() => {
    logger.info(`Connected to ${config.client} database in ${environment} environment`);
  })
  .catch(error => {
    logger.error(`Database connection error: ${error.message}`);
    // In production, you might want to exit the process on connection failure
    if (environment === 'production') {
      logger.error('Exiting due to database connection failure in production');
      process.exit(1);
    }
  });

// Properly handle process termination
process.on('SIGINT', async () => {
  logger.info('Received SIGINT signal. Closing database connections...');
  await db.destroy();
  logger.info('Database connections closed.');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM signal. Closing database connections...');
  await db.destroy();
  logger.info('Database connections closed.');
  process.exit(0);
});

// Handle unhandled promise rejections related to database operations
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

// Export the configured knex instance
module.exports = db;
