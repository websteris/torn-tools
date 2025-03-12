// Import required dependencies
const knex = require('knex');
const knexfile = require('./knexfile');
const logger = require('./utils/logger');

// Get the current environment, defaulting to 'development'
const environment = process.env.NODE_ENV || 'development';

// Get the database config for the current environment
const config = knexfile[environment];

// Initialize connection
let db;

try {
  // Create the database connection
  db = knex(config);
  
  // Test the connection
  db.raw('SELECT 1')
    .then(() => {
      logger.info(`Connected to ${config.client} database in ${environment} environment`);
    })
    .catch((error) => {
      logger.error(`Failed to connect to ${config.client} database: ${error.message}`);
      // In production, we might want to exit the process here
      // process.exit(1);
    });
} catch (error) {
  logger.error(`Error initializing database: ${error.message}`);
  // In production, we might want to exit the process here
  // process.exit(1);
}

// Export the database connection
module.exports = db;

