/**
 * @module DBSchema
 * @description SQLite database schema for Torn Dashboard
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { logger } = require('../utils/logger');

// Ensure the database directory exists
const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Database file path
const DB_PATH = process.env.DB_PATH || path.join(dbDir, 'torn-dashboard.db');

/**
 * Create a new database connection
 * @returns {sqlite3.Database} Database connection
 */
function createConnection() {
  return new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      logger.error(`Error connecting to SQLite database: ${err.message}`);
      throw err;
    }
    logger.info(`Connected to SQLite database at ${DB_PATH}`);
  });
}

/**
 * Initialize the database schema
 * @returns {Promise<void>}
 */
async function initializeSchema() {
  return new Promise((resolve, reject) => {
    const db = createConnection();
    
    db.serialize(() => {
      // Enable foreign keys
      db.run('PRAGMA foreign_keys = ON;');
      
      // Create users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          email TEXT UNIQUE,
          torn_id INTEGER UNIQUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Create api_keys table
      db.run(`
        CREATE TABLE IF NOT EXISTS api_keys (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          key_name TEXT NOT NULL,
          key_value TEXT NOT NULL,
          encrypted INTEGER DEFAULT 1,
          active INTEGER DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `);
      
      // Create settings table
      db.run(`
        CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          category TEXT NOT NULL,
          setting_key TEXT NOT NULL,
          setting_value TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
          UNIQUE(user_id, category, setting_key)
        )
      `);
      
      // Create cached_data table for storing API responses
      db.run(`
        CREATE TABLE IF NOT EXISTS cached_data (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          data_type TEXT NOT NULL,
          data JSON NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `);
      
      // Create modules table for tracking enabled modules
      db.run(`
        CREATE TABLE IF NOT EXISTS modules (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          module_name TEXT NOT NULL UNIQUE,
          display_name TEXT NOT NULL,
          description TEXT,
          version TEXT NOT NULL,
          enabled INTEGER DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Create user_modules table for user-specific module settings
      db.run(`
        CREATE TABLE IF NOT EXISTS user_modules (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          module_id INTEGER NOT NULL,
          enabled INTEGER DEFAULT 1,
          settings JSON,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
          FOREIGN KEY (module_id) REFERENCES modules (id) ON DELETE CASCADE,
          UNIQUE(user_id, module_id)
        )
      `);
      
      // Create notification_settings table
      db.run(`
        CREATE TABLE IF NOT EXISTS notification_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          notification_type TEXT NOT NULL,
          enabled INTEGER DEFAULT 1,
          settings JSON,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
          UNIQUE(user_id, notification_type)
        )
      `);
      
      // Create flight_data table specifically for the flight tracker module
      db.run(`
        CREATE TABLE IF NOT EXISTS flight_data (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          departure TEXT NOT NULL,
          destination TEXT NOT NULL,
          departure_time TIMESTAMP NOT NULL,
          arrival_time TIMESTAMP NOT NULL,
          flight_time INTEGER NOT NULL,
          status TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `);

      // Faction wars — written/read by services/faction-tracker/war-tracker.js
      // via getConnection(). storeWarData does a dynamic `INSERT OR REPLACE INTO
      // faction_wars` whose column subset varies by war type, so every column is
      // nullable and war_id is the PRIMARY KEY the upsert replaces on. Columns are
      // the union of every field warRecord can carry (ranked/territory/raid).
      db.run(`
        CREATE TABLE IF NOT EXISTS faction_wars (
          war_id INTEGER PRIMARY KEY,
          faction_id INTEGER,
          war_type TEXT,
          timestamp TEXT,
          start_time INTEGER,
          end_time INTEGER,
          target INTEGER,
          winner INTEGER,
          defending INTEGER,
          assaulting INTEGER,
          score INTEGER,
          territory TEXT,
          assaulting_faction INTEGER,
          defending_faction INTEGER,
          raiding_faction INTEGER
        )
      `);

      // Per-rival-faction rows for a ranked war — storeWarFactionData does
      // `INSERT OR REPLACE INTO faction_war_factions` keyed on (war_id, faction_id).
      db.run(`
        CREATE TABLE IF NOT EXISTS faction_war_factions (
          war_id INTEGER,
          faction_id INTEGER,
          name TEXT,
          score INTEGER,
          chain INTEGER,
          timestamp TEXT,
          PRIMARY KEY (war_id, faction_id)
        )
      `);
    });
    
    // Close the database connection
    db.close((err) => {
      if (err) {
        logger.error(`Error closing database: ${err.message}`);
        reject(err);
      } else {
        logger.info('Database schema initialized successfully');
        resolve();
      }
    });
  });
}

/**
 * Get a database connection
 * @returns {sqlite3.Database} Database connection
 */
function getConnection() {
  return createConnection();
}

// Export database functions
module.exports = {
  initializeSchema,
  getConnection
};
