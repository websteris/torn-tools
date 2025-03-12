/**
 * @module PollingService
 * @description Service for polling and caching Torn API data
 */

const TornApiClient = require('../torn-api/client');
const apiKeyModel = require('../../db/models/api-key');
const userModel = require('../../db/models/user');
const { logger } = require('../../utils/logger');
const { getConnection } = require('../../db/schema');

/**
 * Polling Service for Torn API data
 */
class PollingService {
  constructor() {
    this.apiClient = new TornApiClient();
    this.pollingIntervals = {};
    this.isRunning = false;
    
    // Define polling schedules (in milliseconds)
    this.schedules = {
      // User data
      user_basic: 5 * 60 * 1000, // 5 minutes
      user_cooldowns: 30 * 1000, // 30 seconds
      user_bars: 30 * 1000, // 30 seconds
      user_travel: 60 * 1000, // 1 minute
      user_events: 60 * 1000, // 1 minute
      user_money: 5 * 60 * 1000, // 5 minutes
      
      // Faction data
      faction_basic: 10 * 60 * 1000, // 10 minutes
      
      // Torn data
      torn_items: 60 * 60 * 1000, // 1 hour
      torn_stats: 60 * 60 * 1000, // 1 hour
    };
  }

  /**
   * Start the polling service
   */
  start() {
    if (this.isRunning) {
      logger.info('Polling service is already running');
      return;
    }
    
    logger.info('Starting polling service');
    this.isRunning = true;
    
    // Set up polling for each data type
    this._setupPolling();
  }

  /**
   * Stop the polling service
   */
  stop() {
    if (!this.isRunning) {
      logger.info('Polling service is not running');
      return;
    }
    
    logger.info('Stopping polling service');
    
    // Clear all polling intervals
    Object.keys(this.pollingIntervals).forEach(key => {
      clearInterval(this.pollingIntervals[key]);
    });
    
    this.pollingIntervals = {};
    this.isRunning = false;
  }

  /**
   * Setup polling for each data type
   * @private
   */
  _setupPolling() {
    // Setup user data polling
    this.pollingIntervals.user_basic = setInterval(() => {
      this._pollUserData(['profile', 'personalstats']);
    }, this.schedules.user_basic);
    
    this.pollingIntervals.user_cooldowns = setInterval(() => {
      this._pollUserData(['cooldowns']);
    }, this.schedules.user_cooldowns);
    
    this.pollingIntervals.user_bars = setInterval(() => {
      this._pollUserData(['bars']);
    }, this.schedules.user_bars);
    
    this.pollingIntervals.user_travel = setInterval(() => {
      this._pollUserData(['travel']);
    }, this.schedules.user_travel);
    
    this.pollingIntervals.user_events = setInterval(() => {
      this._pollUserData(['events']);
    }, this.schedules.user_events);
    
    // Setup faction data polling
    this.pollingIntervals.faction_basic = setInterval(() => {
      this._pollFactionData(['basic']);
    }, this.schedules.faction_basic);
    
    // Setup Torn data polling
    this.pollingIntervals.torn_items = setInterval(() => {
      this._pollTornData(['items']);
    }, this.schedules.torn_items);
    
    this.pollingIntervals.torn_stats = setInterval(() => {
      this._pollTornData(['stats']);
    }, this.schedules.torn_stats);
    
    // Run initial polling
    this._initialPoll();
  }

  /**
   * Run initial polling for all data types
   * @private
   */
  async _initialPoll() {
    try {
      logger.info('Running initial data poll');
      
      // Poll user data
      await this._pollUserData(['profile', 'personalstats', 'cooldowns', 'bars', 'travel', 'events']);
      
      // Poll faction data
      await this._pollFactionData(['basic']);
      
      // Poll Torn data
      await this._pollTornData(['items', 'stats']);
      
      logger.info('Initial data poll completed');
    } catch (error) {
      logger.error(`Error during initial poll: ${error.message}`);
    }
  }

  /**
   * Poll user data for all active users
   * @param {Array<string>} selections - API selections to fetch
   * @private
   */
  async _pollUserData(selections) {
    try {
      logger.debug(`Polling user data: ${selections.join(', ')}`);
      
      // Get all active API keys
      const activeUsers = await this._getActiveUsers();
      
      if (activeUsers.length === 0) {
        logger.debug('No active users found for polling');
        return;
      }
      
      // Poll data for each user
      for (const user of activeUsers) {
        try {
          const apiKey = user.apiKey;
          const userData = await this.apiClient.getUserData(apiKey, selections);
          
          // Store user data in the database
          await this._storeUserData(user.id, selections, userData);
        } catch (error) {
          logger.error(`Error polling user ${user.id} data: ${error.message}`);
          // Continue with next user
        }
      }
    } catch (error) {
      logger.error(`Error in user data polling: ${error.message}`);
    }
  }

  /**
   * Poll faction data for all active factions
   * @param {Array<string>} selections - API selections to fetch
   * @private
   */
  async _pollFactionData(selections) {
    try {
      logger.debug(`Polling faction data: ${selections.join(', ')}`);
      
      // Get unique factions from active users
      const factions = await this._getActiveFactions();
      
      if (factions.length === 0) {
        logger.debug('No active factions found for polling');
        return;
      }
      
      // Poll data for each faction
      for (const faction of factions) {
        try {
          const factionId = faction.faction_id;
          const apiKey = faction.apiKey;
          
          const factionData = await this.apiClient.getFactionData(apiKey, factionId, selections);
          
          // Store faction data in the database
          await this._storeFactionData(factionId, selections, factionData);
        } catch (error) {
          logger.error(`Error polling faction ${faction.faction_id} data: ${error.message}`);
          // Continue with next faction
        }
      }
    } catch (error) {
      logger.error(`Error in faction data polling: ${error.message}`);
    }
  }

  /**
   * Poll Torn data
   * @param {Array<string>} selections - API selections to fetch
   * @private
   */
  async _pollTornData(selections) {
    try {
      logger.debug(`Polling Torn data: ${selections.join(', ')}`);
      
      // Get a valid API key for Torn data
      const apiKey = await this._getAnyValidApiKey();
      
      if (!apiKey) {
        logger.debug('No valid API key found for Torn data polling');
        return;
      }
      
      const tornData = await this.apiClient.getTornData(apiKey, selections);
      
      // Store Torn data in the database
      await this._storeTornData(selections, tornData);
    } catch (error) {
      logger.error(`Error in Torn data polling: ${error.message}`);
    }
  }

  /**
   * Get active users with API keys
   * @returns {Promise<Array<Object>>} Array of active users with API keys
   * @private
   */
  async _getActiveUsers() {
    try {
      // This is a simplified version - in a real implementation, 
      // you would need to fetch users and their API keys from the database
      return new Promise((resolve, reject) => {
        const db = getConnection();
        
        db.all(`
          SELECT u.id, u.username, u.torn_id, k.key_value
          FROM users u
          JOIN api_keys k ON u.id = k.user_id
          WHERE k.active = 1
          LIMIT 100
        `, [], async (err, rows) => {
          db.close();
          
          if (err) {
            logger.error(`Error getting active users: ${err.message}`);
            reject(err);
            return;
          }
          
          // Decrypt API keys
          const activeUsers = [];
          for (const row of rows) {
            try {
              const apiKey = await apiKeyModel.getKeyValue(row.id, row.id);
              activeUsers.push({
                id: row.id,
                username: row.username,
                torn_id: row.torn_id,
                apiKey
              });
            } catch (error) {
              logger.error(`Error decrypting API key for user ${row.id}: ${error.message}`);
              // Skip this user
            }
          }
          
          resolve(activeUsers);
        });
      });
    } catch (error) {
      logger.error(`Error getting active users: ${error.message}`);
      return [];
    }
  }

  /**
   * Get unique active factions
   * @returns {Promise<Array<Object>>} Array of unique factions with API keys
   * @private
   */
  async _getActiveFactions() {
    try {
      // This is a simplified version - in a real implementation,
      // you would need to fetch unique factions from the database
      return new Promise((resolve, reject) => {
        const db = getConnection();
        
        db.all(`
          SELECT DISTINCT u.faction_id, u.faction_name, k.key_value
          FROM users u
          JOIN api_keys k ON u.id = k.user_id
          WHERE u.faction_id IS NOT NULL AND k.active = 1
          LIMIT 100
        `, [], async (err, rows) => {
          db.close();
          
          if (err) {
            logger.error(`Error getting active factions: ${err.message}`);
            reject(err);
            return;
          }
          
          // Decrypt API keys
          const activeFactions = [];
          for (const row of rows) {
            try {
              const apiKey = await apiKeyModel.getKeyValue(row.id, row.id);
              activeFactions.push({
                faction_id: row.faction_id,
                faction_name: row.faction_name,
                apiKey
              });
            } catch (error) {
              logger.error(`Error decrypting API key for faction ${row.faction_id}: ${error.message}`);
              // Skip this faction
            }
          }
          
          resolve(activeFactions);
        });
      });
    } catch (error) {
      logger.error(`Error getting active factions: ${error.message}`);
      return [];
    }
  }

  /**
   * Get any valid API key
   * @returns {Promise<string|null>} A valid API key or null
   * @private
   */
  async _getAnyValidApiKey() {
    try {
      // This is a simplified version - in a real implementation,
      // you would need to fetch a valid API key from the database
      return new Promise((resolve, reject) => {
        const db = getConnection();
        
        db.get(`
          SELECT k.id, k.user_id, k.key_value
          FROM api_keys k
          WHERE k.active = 1
          LIMIT 1
        `, [], async (err, row) => {
          db.close();
          
          if (err) {
            logger.error(`Error getting valid API key: ${err.message}`);
            reject(err);
            return;
          }
          
          if (!row) {
            resolve(null);
            return;
          }
          
          try {
            const apiKey = await apiKeyModel.getKeyValue(row.id, row.user_id);
            resolve(apiKey);
          } catch (error) {
            logger.error(`Error decrypting API key: ${error.message}`);
            resolve(null);
          }
        });
      });
    } catch (error) {
      logger.error(`Error getting valid API key: ${error.message}`);
      return null;
    }
  }

  /**
   * Store user data in the database
   * @param {number} userId - User ID
   * @param {Array<string>} selections - API selections fetched
   * @param {Object} data - User data to store
   * @returns {Promise<void>}
   * @private
   */
  async _storeUserData(userId, selections, data) {
    try {
      const db = getConnection();
      const dataType = `user_${selections.join('_')}`;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this._getExpirationTime(dataType));
      
      // Store data in cached_data table
      return new Promise((resolve, reject) => {
        db.run(`
          INSERT OR REPLACE INTO cached_data (user_id, data_type, data, expires_at, created_at)
          VALUES (?, ?, ?, ?, ?)
        `, [
          userId,
          dataType,
          JSON.stringify(data),
          expiresAt.toISOString(),
          now.toISOString()
        ], function(err) {
          db.close();
          
          if (err) {
            logger.error(`Error storing user data: ${err.message}`);
            reject(err);
            return;
          }
          
          logger.debug(`Stored user ${userId} data: ${dataType}`);
          resolve();
        });
      });
    } catch (error) {
      logger.error(`Error storing user data: ${error.message}`);
    }
  }

  /**
   * Store faction data in the database
   * @param {number} factionId - Faction ID
   * @param {Array<string>} selections - API selections fetched
   * @param {Object} data - Faction data to store
   * @returns {Promise<void>}
   * @private
   */
  async _storeFactionData(factionId, selections, data) {
    try {
      const db = getConnection();
      const dataType = `faction_${factionId}_${selections.join('_')}`;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this._getExpirationTime(dataType));
      
      // Store data in cached_data table
      // Note: we use a special user_id of 0 for global faction data
      return new Promise((resolve, reject) => {
        db.run(`
          INSERT OR REPLACE INTO cached_data (user_id, data_type, data, expires_at, created_at)
          VALUES (?, ?, ?, ?, ?)
        `, [
          0, // Special user_id for global data
          dataType,
          JSON.stringify(data),
          expiresAt.toISOString(),
          now.toISOString()
        ], function(err) {
          db.close();
          
          if (err) {
            logger.error(`Error storing faction data: ${err.message}`);
            reject(err);
            return;
          }
          
          logger.debug(`Stored faction ${factionId} data: ${dataType}`);
          resolve();
        });
      });
    } catch (error) {
      logger.error(`Error storing faction data: ${error.message}`);
    }
  }

  /**
   * Store Torn data in the database
   * @param {Array<string>} selections - API selections fetched
   * @param {Object} data - Torn data to store
   * @returns {Promise<void>}
   * @private
   */
  async _storeTornData(selections, data) {
    try {
      const db = getConnection();
      const dataType = `torn_${selections.join('_')}`;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this._getExpirationTime(dataType));
      
      // Store data in cached_data table
      // Note: we use a special user_id of 0 for global Torn data
      return new Promise((resolve, reject) => {
        db.run(`
          INSERT OR REPLACE INTO cached_data (user_id, data_type, data, expires_at, created_at)
          VALUES (?, ?, ?, ?, ?)
        `, [
          0, // Special user_id for global data
          dataType,
          JSON.stringify(data),
          expiresAt.toISOString(),
          now.toISOString()
        ], function(err) {
          db.close();
          
          if (err) {
            logger.error(`Error storing Torn data: ${err.message}`);
            reject(err);
            return;
          }
          
          logger.debug(`Stored Torn data: ${dataType}`);
          resolve();
        });
      });
    } catch (error) {
      logger.error(`Error storing Torn data: ${error.message}`);
    }
  }

  /**
   * Get expiration time for a data type
   * @param {string} dataType - Type of data
   * @returns {number} Expiration time in milliseconds
   * @private
   */
  _getExpirationTime(dataType) {
    // Default to 5 minutes
    const defaultExpiration = 5 * 60 * 1000;
    
    if (dataType.startsWith('user_cooldowns') || dataType.startsWith('user_bars')) {
      return 30 * 1000; // 30 seconds
    }
    
    if (dataType.startsWith('user_travel') || dataType.startsWith('user_events')) {
      return 60 * 1000; // 1 minute
    }
    
    if (dataType.startsWith('user_')) {
      return 5 * 60 * 1000; // 5 minutes
    }
    
    if (dataType.startsWith('faction_')) {
      return 10 * 60 * 1000; // 10 minutes
    }
    
    if (dataType.startsWith('torn_')) {
      return 60 * 60 * 1000; // 1 hour
    }
    
    return defaultExpiration;
  }
}

module.exports = new PollingService();
