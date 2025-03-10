/**
 * @module InitAllDbScript
 * @description Initialize all database tables
 */

const { initializeSchema } = require('../db/schema');
const { initFactionDb } = require('./init-faction-db');
const { logger } = require('../utils/logger');

/**
 * Initialize all database tables
 */
async function initAllDb() {
  try {
    logger.info('Initializing all database tables...');
    
    // Initialize main schema
    await initializeSchema();
    
    // Initialize faction tracking tables
    await initFactionDb();
    
    logger.info('All database tables initialized successfully');
  } catch (error) {
    logger.error(`Failed to initialize all database tables: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run the initialization
if (require.main === module) {
  initAllDb()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { initAllDb };
