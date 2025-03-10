/**
 * @module ApiKeyManager
 * @description Manages API keys for faction tracking to optimize usage
 */

const apiKeyModel = require('../../db/models/api-key');
const { logger } = require('../../utils/logger');
const { getConnection } = require('../../db/schema');

// Cache to reduce database queries
const keyCache = new Map();
const userKeyCache = new Map();

// Last used timestamps to implement key rotation
const keyUsageTimestamps = new Map();

/**
 * Get an API key for a specific user
 * @param {number} userId - User ID
 * @returns {Promise<string|null>} API key or null if not found
 */
async function getApiKeyForUser(userId) {
  try {
    // Check cache first
    if (userKeyCache.has(userId)) {
      const cachedKey = userKeyCache.get(userId);
      if (cachedKey && cachedKey.expires > Date.now()) {
        return cachedKey.apiKey;
      }
      
      // Clear expired cache entry
      userKeyCache.delete(userId);
    }
    
    // Get key from database
    const db = getConnection();
    
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT id, key_value
        FROM api_keys
        WHERE user_id = ? AND active = 1
        LIMIT 1
      `, [userId], async (err, row) => {
        db.close();
        
        if (err) {
          logger.error(`Error getting API key for user ${userId}: ${err.message}`);
          reject(err);
          return;
        }
        
        if (!row) {
          resolve(null);
          return;
        }
        
        try {
          // Decrypt the key
          const apiKey = await apiKeyModel.getKeyValue(row.id, userId);
          
          if (apiKey) {
            // Cache the key for 5 minutes
            userKeyCache.set(userId, {
              apiKey,
              expires: Date.now() + 5 * 60 * 1000
            });
            
            // Record usage timestamp for rotation
            keyUsageTimestamps.set(apiKey, Date.now());
          }
          
          resolve(apiKey);
        } catch (error) {
          logger.error(`Error decrypting API key for user ${userId}: ${error.message}`);
          resolve(null);
        }
      });
    });
  } catch (error) {
    logger.error(`Error in getApiKeyForUser: ${error.message}`);
    return null;
  }
}

/**
 * Get an API key from a group of users, using rotation to balance request load
 * @param {Array<number>} userIds - User IDs to try
 * @param {Array<string>} [excludeKeys=[]] - Keys to exclude
 * @returns {Promise<string|null>} API key or null if none found
 */
async function getApiKeyForUsers(userIds, excludeKeys = []) {
  if (!userIds || userIds.length === 0) {
    return null;
  }
  
  try {
    // First, try to get keys from cache for faster access
    const candidateKeys = [];
    
    for (const userId of userIds) {
      if (userKeyCache.has(userId)) {
        const cachedKey = userKeyCache.get(userId);
        if (cachedKey && cachedKey.expires > Date.now() && !excludeKeys.includes(cachedKey.apiKey)) {
          candidateKeys.push({
            userId,
            apiKey: cachedKey.apiKey,
            lastUsed: keyUsageTimestamps.get(cachedKey.apiKey) || 0
          });
        }
      }
    }
    
    // If we have candidate keys, choose the least recently used one
    if (candidateKeys.length > 0) {
      candidateKeys.sort((a, b) => a.lastUsed - b.lastUsed);
      const selectedKey = candidateKeys[0].apiKey;
      
      // Update usage timestamp
      keyUsageTimestamps.set(selectedKey, Date.now());
      
      return selectedKey;
    }
    
    // If no keys in cache, query database
    const db = getConnection();
    
    return new Promise((resolve, reject) => {
      // Convert array to comma-separated list for SQL IN clause
      const userIdList = userIds.join(',');
      
      db.all(`
        SELECT id, user_id
        FROM api_keys
        WHERE user_id IN (${userIdList}) AND active = 1
      `, [], async (err, rows) => {
        db.close();
        
        if (err) {
          logger.error(`Error getting API keys for users: ${err.message}`);
          reject(err);
          return;
        }
        
        if (!rows || rows.length === 0) {
          resolve(null);
          return;
        }
        
        // Try each key until we find a valid one
        for (const row of rows) {
          try {
            const apiKey = await apiKeyModel.getKeyValue(row.id, row.user_id);
            
            if (apiKey && !excludeKeys.includes(apiKey)) {
              // Cache the key
              userKeyCache.set(row.user_id, {
                apiKey,
                expires: Date.now() + 5 * 60 * 1000
              });
              
              // Record usage timestamp
              keyUsageTimestamps.set(apiKey, Date.now());
              
              resolve(apiKey);
              return;
            }
          } catch (error) {
            logger.error(`Error decrypting API key: ${error.message}`);
            // Continue to next key
          }
        }
        
        // If we get here, no valid keys were found
        resolve(null);
      });
    });
  } catch (error) {
    logger.error(`Error in getApiKeyForUsers: ${error.message}`);
    return null;
  }
}

/**
 * Clear API key cache for a user
 * @param {number} userId - User ID
 */
function clearUserKeyCache(userId) {
  userKeyCache.delete(userId);
}

/**
 * Clear all API key caches
 */
function clearAllKeyCaches() {
  keyCache.clear();
  userKeyCache.clear();
  keyUsageTimestamps.clear();
}

module.exports = {
  getApiKeyForUser,
  getApiKeyForUsers,
  clearUserKeyCache,
  clearAllKeyCaches
};
