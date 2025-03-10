/**
 * @module InitDbScript
 * @description Initialize the database schema
 */

const { initializeSchema } = require('../db/schema');
const { logger } = require('../utils/logger');

// Create database directory and initialize schema
async function initDb() {
  try {
    logger.info('Initializing database schema...');
    await initializeSchema();
    logger.info('Database schema initialized successfully!');
    process.exit(0);
  } catch (error) {
    logger.error(`Failed to initialize database: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run the initialization
initDb();
