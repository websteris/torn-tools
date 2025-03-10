/**
 * @module InitFactionDbScript
 * @description Initialize database tables for faction tracking
 */

const { getConnection } = require('../db/schema');
const { logger } = require('../utils/logger');

/**
 * Initialize faction tracking database tables
 */
async function initFactionDb() {
  try {
    logger.info('Initializing faction tracking database tables...');
    
    const db = getConnection();
    
    await new Promise((resolve, reject) => {
      db.serialize(() => {
        // Table to track which factions are being monitored
        db.run(`
          CREATE TABLE IF NOT EXISTS faction_tracking (
            faction_id INTEGER PRIMARY KEY,
            target_faction_id INTEGER,
            users TEXT,  -- JSON array of user IDs
            polling_interval INTEGER,
            last_poll INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        // Table for basic faction data
        db.run(`
          CREATE TABLE IF NOT EXISTS faction_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            faction_id INTEGER NOT NULL,
            name TEXT,
            tag TEXT,
            tag_image TEXT,
            leader INTEGER,
            co_leader INTEGER,
            respect INTEGER,
            age INTEGER,
            capacity INTEGER,
            best_chain INTEGER,
            timestamp TEXT,
            UNIQUE(faction_id, timestamp)
          )
        `);
        
        // Table for faction members
        db.run(`
          CREATE TABLE IF NOT EXISTS faction_members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            member_id INTEGER NOT NULL,
            faction_id INTEGER NOT NULL,
            name TEXT,
            level INTEGER,
            days_in_faction INTEGER,
            position TEXT,
            last_action_status TEXT,
            last_action_timestamp INTEGER,
            last_action_relative TEXT,
            status_state TEXT,
            status_description TEXT,
            status_details TEXT,
            status_color TEXT,
            status_until INTEGER,
            timestamp TEXT,
            UNIQUE(member_id, faction_id, timestamp)
          )
        `);
        
        // Table for faction ranks
        db.run(`
          CREATE TABLE IF NOT EXISTS faction_ranks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            faction_id INTEGER NOT NULL,
            level INTEGER,
            name TEXT,
            division INTEGER,
            position INTEGER,
            wins INTEGER,
            timestamp TEXT,
            UNIQUE(faction_id, timestamp)
          )
        `);
        
        // Table for wars
        db.run(`
          CREATE TABLE IF NOT EXISTS faction_wars (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            war_id INTEGER NOT NULL,
            faction_id INTEGER NOT NULL,
            war_type TEXT NOT NULL,
            defending INTEGER,
            assaulting INTEGER,
            score INTEGER,
            start_time INTEGER,
            end_time INTEGER,
            territory TEXT,
            assaulting_faction INTEGER,
            defending_faction INTEGER,
            raiding_faction INTEGER,
            target INTEGER,
            winner INTEGER,
            timestamp TEXT,
            UNIQUE(war_id, faction_id, war_type, timestamp)
          )
        `);
        
        // Table for factions involved in wars (for ranked wars)
        db.run(`
          CREATE TABLE IF NOT EXISTS faction_war_factions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            war_id INTEGER NOT NULL,
            faction_id INTEGER NOT NULL,
            name TEXT,
            score INTEGER,
            chain INTEGER,
            timestamp TEXT,
            UNIQUE(war_id, faction_id, timestamp)
          )
        `);
        
        // Table for tracking member activity during wars
        db.run(`
          CREATE TABLE IF NOT EXISTS faction_war_activity (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            war_id INTEGER NOT NULL,
            faction_id INTEGER NOT NULL,
            member_id INTEGER NOT NULL,
            attacks INTEGER,
            wins INTEGER,
            timestamp TEXT,
            UNIQUE(war_id, faction_id, member_id, timestamp)
          )
        `);
      });
      
      db.close((err) => {
        if (err) {
          logger.error(`Error closing database: ${err.message}`);
          reject(err);
        } else {
          logger.info('Faction tracking database tables initialized successfully');
          resolve();
        }
      });
    });
  } catch (error) {
    logger.error(`Failed to initialize faction tracking database: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run the initialization
if (require.main === module) {
  initFactionDb()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { initFactionDb };
