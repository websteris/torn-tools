/**
 * @module ResetDbScript
 * @description Reset the database by dropping all tables and reinitializing the schema
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { initializeSchema } = require('../db/schema');
const { logger } = require('../utils/logger');

// Database file path
const dbDir = path.join(process.cwd(), 'data');
const DB_PATH = process.env.DB_PATH || path.join(dbDir, 'torn-dashboard.db');

/**
 * Reset the database by removing and recreating it
 */
async function resetDb() {
  try {
    logger.info('Starting database reset...');
    
    // Check if the database file exists
    if (fs.existsSync(DB_PATH)) {
      logger.info(`Removing existing database at ${DB_PATH}`);
      fs.unlinkSync(DB_PATH);
      logger.info('Database file removed successfully');
    } else {
      logger.info('No existing database found');
    }
    
    // Initialize new database schema
    logger.info('Initializing new database schema...');
    await initializeSchema();
    logger.info('Database schema initialized successfully!');
    
    logger.info('Database reset completed successfully!');
    process.exit(0);
  } catch (error) {
    logger.error(`Failed to reset database: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Check for a --force flag
if (process.argv.includes('--force')) {
  // Run the reset without confirmation
  resetDb();
} else {
  // Give a warning and require confirmation
  console.log('\x1b[31m%s\x1b[0m', 'WARNING: This will delete all data in the database!');
  console.log('To proceed, run this script with the --force flag:');
  console.log('node scripts/reset-db.js --force');
  process.exit(0);
}
