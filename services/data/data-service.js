/**
 * @module DataService
 * @description Service for accessing cached Torn API data
 */

const TornApiClient = require('../torn-api/client');
const apiKeyModel = require('../../db/models/api-key');
const { logger } = require('../../utils/logger');
const { getConnection } = require('../../db/schema');

/**
 * Data Service for accessing cached Torn API data
 */
class DataService {
  constructor() {
    this.apiClient = new TornApiClient();
  }

  /**
   * Get user data from cache or API
   * @param {number} userId - User ID in our database
   * @param {string} tornId - Torn ID
   * @param {Array<string>} selections - API selections to fetch
   * @param {Object} options - Additional options
   * @param {boolean} [options.bypassCache=false] - Whether to bypass cache
   * @param {number} [options.apiKeyId] - Specific API key ID to use
   * @returns {Promise<Object>} User data
   */
  async getUserData(userId, tornId, selections, options = {}) {
    const { bypassCache = false, apiKeyId } = options;
    
    if (!userId || !tornId || !selections || !selections.length) {
      throw new Error('Missing required parameters');
    }
    
    try {
      // Check cache first unless bypass is requested
      if (!bypassCache) {
        const cachedData = await this._getCachedUserData(userId, selections);
        
        if (cachedData) {
          logger.debug(`Retrieved cached user data for ${userId}: ${selections.join(',')}`);
          return cachedData;
        }
      }
      
      // Get API key for the user
      const apiKey = await this._getUserApiKey(userId, apiKeyId);
      
      if (!apiKey) {
        throw new Error('No valid API key found for user');
      }
      
      // Fetch from API
      logger.debug(`Fetching user data from API for ${userId}: ${selections.join(',')}`);
      const userData = await this.apiClient.getUserData(apiKey, selections);
      
      // Cache the data
      await this._cacheUserData(userId, selections, userData);
      
      return userData;
    } catch (error) {
      logger.error(`Error getting user data: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get faction data from cache or API
   * @param {number} factionId - Faction ID
   * @param {Array<string>} selections - API selections to fetch
   * @param {Object} options - Additional options
   * @param {boolean} [options.bypassCache=false] - Whether to bypass cache
   * @param {number} [options.userId] - User ID to get API key from
   * @returns {Promise<Object>} Faction data
   */
  async getFactionData(factionId, selections, options = {}) {
    const { bypassCache = false, userId } = options;
    
    if (!factionId || !selections || !selections.length) {
      throw new Error('Missing required parameters');
    }
    
    try {
      // Check cache first unless bypass is requested
      if (!bypassCache) {
        const cachedData = await this._getCachedFactionData(factionId, selections);
        
        if (cachedData) {
          logger.debug(`Retrieved cached faction data for ${factionId}: ${selections.join(',')}`);
          return cachedData;
        }
      }
      
      // Get API key
      const apiKey = await this._getApiKey(userId);
      
      if (!apiKey) {
        throw new Error('No valid API key found');
      }
      
      // Fetch from API
      logger.debug(`Fetching faction data from API for ${factionId}: ${selections.join(',')}`);
      const factionData = await this.apiClient.getFactionData(apiKey, factionId, selections);
      
      // Cache the data
      await this._cacheFactionData(factionId, selections, factionData);
      
      return factionData;
    } catch (error) {
      logger.error(`Error getting faction data: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get Torn data from cache or API
   * @param {Array<string>} selections - API selections to fetch
   * @param {Object} options - Additional options
   * @param {boolean} [options.bypassCache=false] - Whether to bypass cache
   * @param {number} [options.userId] - User ID to get API key from
   * @returns {Promise<Object>} Torn data
   */
  async getTornData(selections, options = {}) {
    const { bypassCache = false, userId } = options;
    
    if (!selections || !selections.length) {
      throw new Error('Missing required parameters');
    }
    
    try {
      // Check cache first unless bypass is requested
      if (!bypassCache) {
        const cachedData = await this._getCachedTornData(selections);
        
        if (cachedData) {
          logger.debug(`Retrieved cached Torn data: ${selections.join(',')}`);
          return cachedData;
        }
      }
      
      // Get API key
      const apiKey = await this._getApiKey(userId);
      
      if (!apiKey) {
        throw new Error('No valid API key found');
      }
      
      // Fetch from API
      logger.debug(`Fetching Torn data from API: ${selections.join(',')}`);
      const tornData = await this.apiClient.getTornData(apiKey, selections);
      
      // Cache the data
      await this._cacheTornData(selections, tornData);
      
      return tornData;
    } catch (error) {
      logger.error(`Error getting Torn data: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get cached user data
   * @param {number} userId - User ID
   * @param {Array<string>} selections - API selections
   * @returns {Promise<Object|null>} Cached data or null
   * @private
   */
  async _getCachedUserData(userId, selections) {
    try {
      const dataType = `user_${selections.join('_')}`;
      
      return new Promise((resolve, reject) => {
        const db = getConnection();
        
        db.get(`
          SELECT data
          FROM cached_data
          WHERE user_id = ? AND data_type = ? AND expires_at > datetime('now')
          LIMIT 1
        `, [userId, dataType], (err, row) => {
          db.close();
          
          if (err) {
            logger.error(`Error getting cached user data: ${err.message}`);
            reject(err);
            return;
          }
          
          if (!row) {
            resolve(null);
            return;
          }
          
          try {
            resolve(JSON.parse(row.data));
          } catch (error) {
            logger.error(`Error parsing cached user data: ${error.message}`);
            resolve(null);
          }
        });
      });
    } catch (error) {
      logger.error(`Error in _getCachedUserData: ${error.message}`);
      return null;
    }
  }

  /**
   * Get cached faction data
   * @param {number} factionId - Faction ID
   * @param {Array<string>} selections - API selections
   * @returns {Promise<Object|null>} Cached data or null
   * @private
   */
  async _getCachedFactionData(factionId, selections) {
    try {
      const dataType = `faction_${factionId}_${selections.join('_')}`;
      
      return new Promise((resolve, reject) => {
        const db = getConnection();
        
        db.get(`
          SELECT data
          FROM cached_data
          WHERE user_id = 0 AND data_type = ? AND expires_at > datetime('now')
          LIMIT 1
        `, [dataType], (err, row) => {
          db.close();
          
          if (err) {
            logger.error(`Error getting cached faction data: ${err.message}`);
            reject(err);
            return;
          }
          
          if (!row) {
            resolve(null);
            return;
          }
          
          try {
            resolve(JSON.parse(row.data));
          } catch (error) {
            logger.error(`Error parsing cached faction data: ${error.message}`);
            resolve(null);
          }
        });
      });
    } catch (error) {
      logger.error(`Error in _getCachedFactionData: ${error.message}`);
      return null;
    }
  }

  /**
   * Get cached Torn data
   * @param {Array<string>} selections - API selections
   * @returns {Promise<Object|null>} Cached data or null
   * @private
   */
  async _getCachedTornData(selections) {
    try {
      const dataType = `torn_${selections.join('_')}`;
      
      return new Promise((resolve, reject) => {
        const db = getConnection();
        
        db.get(`
          SELECT data
          FROM cached_data
          WHERE user_id = 0 AND data_type = ? AND expires_at > datetime('now')
          LIMIT 1
        `, [dataType], (err, row) => {
          db.close();
          
          if (err) {
            logger.error(`Error getting cached Torn data: ${err.message}`);
            reject(err);
            return;
          }
          
          if (!row) {
            resolve(null);
            return;
          }
          
          try {
            resolve(JSON.parse(row.data));
          } catch (error) {
            logger.error(`Error parsing cached Torn data: ${error.message}`);
            resolve(null);
          }
        });
      });
    } catch (error) {
      logger.error(`Error in _getCachedTornData: ${error.message}`);
      return null;
    }
  }

  /**
   * Cache user data
   * @param {number} userId - User ID
   * @param {Array<string>} selections - API selections
   * @param {Object} data - Data to cache
   * @returns {Promise<void>}
   * @private
   */
  async _cacheUserData(userId, selections, data) {
    try {
      const dataType = `user_${selections.join('_')}`;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this._getExpirationTime(dataType));
      
      return new Promise((resolve, reject) => {
        const db = getConnection();
        
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
            logger.error(`Error caching user data: ${err.message}`);
            reject(err);
            return;
          }
          
          logger.debug(`Cached user ${userId} data: ${dataType}`);
          resolve();
        });
      });
    } catch (error) {
      logger.error(`Error in _cacheUserData: ${error.message}`);
    }
  }

  /**
   * Cache faction data
   * @param {number} factionId - Faction ID
   * @param {Array<string>} selections - API selections
   * @param {Object} data - Data to cache
   * @returns {Promise<void>}
   * @private
   */
  async _cacheFactionData(factionId, selections, data) {
    try {
      const dataType = `faction_${factionId}_${selections.join('_')}`;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this._getExpirationTime(dataType));
      
      return new Promise((resolve, reject) => {
        const db = getConnection();
        
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
            logger.error(`Error caching faction data: ${err.message}`);
            reject(err);
            return;
          }
          
          logger.debug(`Cached faction ${factionId} data: ${dataType}`);
          resolve();
        });
      });
    } catch (error) {
      logger.error(`Error in _cacheFactionData: ${error.message}`);
    }
  }

  /**
   * Cache Torn data
   * @param {Array<string>} selections - API selections
   * @param {Object} data - Data to cache
   * @returns {Promise<void>}
   * @private
   */
  async _cacheTornData(selections, data) {
    try {
      const dataType = `torn_${selections.join('_')}`;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this._getExpirationTime(dataType));
      
      return new Promise((resolve, reject) => {
        const db = getConnection();
        
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
            logger.error(`Error caching Torn data: ${err.message}`);
            reject(err);
            return;
          }
          
          logger.debug(`Cached Torn data: ${dataType}`);
          resolve();
        });
      });
    } catch (error) {
      logger.error(`Error in _cacheTornData: ${error.message}`);
    }
  }

  /**
   * Get user's API key
   * @param {number} userId - User ID
   * @param {number} [apiKeyId] - Specific API key ID to use
   * @returns {Promise<string|null>} API key or null
   * @private
   */
  async _getUserApiKey(userId, apiKeyId) {
    try {
      // If specific API key ID is provided, use that
      if (apiKeyId) {
        return await apiKeyModel.getKeyValue(apiKeyId, userId);
      }
      
      // Otherwise, get the first active API key for the user
      return new Promise((resolve, reject) => {
        const db = getConnection();
        
        db.get(`
          SELECT id
          FROM api_keys
          WHERE user_id = ? AND active = 1
          LIMIT 1
        `, [userId], async (err, row) => {
          db.close();
          
          if (err) {
            logger.error(`Error getting user API key: ${err.message}`);
            reject(err);
            return;
          }
          
          if (!row) {
            resolve(null);
            return;
          }
          
          try {
            const apiKey = await apiKeyModel.getKeyValue(row.id, userId);
            resolve(apiKey);
          } catch (error) {
            logger.error(`Error decrypting user API key: ${error.message}`);
            resolve(null);
          }
        });
      });
    } catch (error) {
      logger.error(`Error in _getUserApiKey: ${error.message}`);
      return null;
    }
  }

  /**
   * Get any valid API key
   * @param {number} [preferredUserId] - Preferred user ID to get API key from
   * @returns {Promise<string|null>} API key or null
   * @private
   */
  async _getApiKey(preferredUserId) {
    try {
      // If preferred user ID is provided, try to get their API key first
      if (preferredUserId) {
        const userApiKey = await this._getUserApiKey(preferredUserId);
        
        if (userApiKey) {
          return userApiKey;
        }
      }
      
      // Otherwise, get any active API key
      return new Promise((resolve, reject) => {
        const db = getConnection();
        
        db.get(`
          SELECT id, user_id
          FROM api_keys
          WHERE active = 1
          LIMIT 1
        `, [], async (err, row) => {
          db.close();
          
          if (err) {
            logger.error(`Error getting API key: ${err.message}`);
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
      logger.error(`Error in _getApiKey: ${error.message}`);
      return null;
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

module.exports = new DataService();
