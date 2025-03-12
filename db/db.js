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

/**
 * Database connection module
 * 
 * This module sets up and exports a configured Knex instance
 * with proper connection pooling and error handling.
 */

const knex = require('knex');
const logger = require('../utils/logger');
const config = require('../knexfile');
const { EventEmitter } = require('events');

// Get environment from environment variable or default to development
const environment = process.env.NODE_ENV || 'development';

// Create event emitter for connection lifecycle events
const connectionEvents = new EventEmitter();

// Configure Knex with environment-specific settings
const knexConfig = config[environment];

if (!knexConfig) {
  logger.error(`No configuration found for environment: ${environment}`);
  throw new Error(`No configuration found for environment: ${environment}`);
}

// Initialize database connection
const db = knex(knexConfig);

// Log successful connection
logger.info(`Connected to ${knexConfig.client} database in ${environment} environment`);

// Connection error handling
db.on('error', (err) => {
  logger.error(`Database connection error: ${err.message}`);
  connectionEvents.emit('error', err);
});

// Handle connection pool events
db.on('pool:created', (pool) => {
  logger.info(`Connection pool created with min=${pool.min} max=${pool.max} connections`);
  connectionEvents.emit('pool:created', pool);
});

/**
 * Test the database connection
 * @returns {Promise<boolean>} True if connection successful
 */
async function testConnection() {
  try {
    // Attempt a simple query to verify connection
    await db.raw('SELECT 1');
    logger.info('Database connection test successful');
    connectionEvents.emit('connected');
    return true;
  } catch (error) {
    logger.error(`Database connection test failed: ${error.message}`);
    connectionEvents.emit('connection:failed', error);
    return false;
  }
}

/**
 * Gracefully close the database connection
 */
async function closeConnection() {
  try {
    logger.info('Closing database connection...');
    await db.destroy();
    logger.info('Database connection closed successfully');
    connectionEvents.emit('closed');
  } catch (error) {
    logger.error(`Error closing database connection: ${error.message}`);
    throw error;
  }
}

// Register shutdown handlers to ensure proper cleanup
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing database connections');
  await closeConnection();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing database connections');
  await closeConnection();
  process.exit(0);
});

// Add utility methods to the db object
db.testConnection = testConnection;
db.closeConnection = closeConnection;
db.events = connectionEvents;

// Export the configured database instance
module.exports = db;

