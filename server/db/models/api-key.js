/**
 * @module ApiKeyModel
 * @description API key model for database operations
 */

const crypto = require('crypto');
const { getConnection } = require('../schema');
const { logger } = require('../../utils/logger');

// Encryption settings - in production, these should be in a secure config
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-secure-encryption-key-min-32-chars'; // 32 bytes
const ENCRYPTION_IV_LENGTH = 16; // 16 bytes for AES

/**
 * API Key model for database operations
 */
class ApiKeyModel {
  /**
   * Encrypt an API key
   * @private
   * @param {string} apiKey - Plain text API key
   * @returns {string} Encrypted API key as hex string with IV prepended
   */
  _encryptApiKey(apiKey) {
    // Generate a random initialization vector
    const iv = crypto.randomBytes(ENCRYPTION_IV_LENGTH);
    
    // Create cipher with key and iv
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    
    // Encrypt the API key
    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Prepend IV to encrypted data - we'll need it for decryption
    return iv.toString('hex') + ':' + encrypted;
  }
  
  /**
   * Decrypt an API key
   * @private
   * @param {string} encryptedApiKey - Encrypted API key with IV prepended
   * @returns {string} Decrypted API key
   */
  _decryptApiKey(encryptedApiKey) {
    // Split IV and encrypted data
    const parts = encryptedApiKey.split(':');
    
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted API key format');
    }
    
    // Extract IV and encrypted data
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    // Create decipher
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    
    // Decrypt the API key
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
  
  /**
   * Create a new API key
   * @param {Object} keyData - API key data
   * @param {number} keyData.user_id - User ID
   * @param {string} keyData.key_name - Name for the API key
   * @param {string} keyData.key_value - Plain text API key
   * @param {boolean} [keyData.encrypted=true] - Whether to encrypt the key
   * @param {boolean} [keyData.active=true] - Whether the key is active
   * @returns {Promise<Object>} Created API key object
   */
  async create(keyData) {
    const { user_id, key_name, key_value } = keyData;
    const encrypted = keyData.encrypted !== false; // Default to true
    const active = keyData.active !== false; // Default to true
    
    if (!user_id || !key_name || !key_value) {
      throw new Error('User ID, key name, and key value are required');
    }
    
    // Encrypt the API key if requested
    const storedKeyValue = encrypted ? this._encryptApiKey(key_value) : key_value;
    
    return new Promise((resolve, reject) => {
      const db = getConnection();
      
      // Insert new API key
      db.run(
        `INSERT INTO api_keys (user_id, key_name, key_value, encrypted, active)
         VALUES (?, ?, ?, ?, ?)`,
        [user_id, key_name, storedKeyValue, encrypted ? 1 : 0, active ? 1 : 0],
        function(err) {
          if (err) {
            db.close();
            logger.error(`Error creating API key: ${err.message}`);
            reject(err);
            return;
          }
          
          // Get the newly created API key
          db.get(
            `SELECT id, user_id, key_name, encrypted, active, created_at, updated_at
             FROM api_keys WHERE id = ?`,
            [this.lastID],
            (err, apiKey) => {
              db.close();
              
              if (err) {
                logger.error(`Error retrieving created API key: ${err.message}`);
                reject(err);
                return;
              }
              
              resolve(apiKey);
            }
          );
        }
      );
    });
  }
  
  /**
   * Find API keys for a user
   * @param {number} userId - User ID
   * @param {boolean} [includeInactive=false] - Whether to include inactive keys
   * @returns {Promise<Array>} Array of API key objects (without key values)
   */
  async findByUserId(userId, includeInactive = false) {
    return new Promise((resolve, reject) => {
      const db = getConnection();
      
      let query = `
        SELECT id, user_id, key_name, encrypted, active, created_at, updated_at
        FROM api_keys 
        WHERE user_id = ?
      `;
      
      // Only include active keys unless specifically requested
      if (!includeInactive) {
        query += ' AND active = 1';
      }
      
      db.all(query, [userId], (err, apiKeys) => {
        db.close();
        
        if (err) {
          logger.error(`Error finding API keys: ${err.message}`);
          reject(err);
          return;
        }
        
        resolve(apiKeys || []);
      });
    });
  }
  
  /**
   * Get API key value (decrypting if necessary)
   * @param {number} id - API key ID
   * @param {number} userId - User ID (for security verification)
   * @returns {Promise<string>} Decrypted API key value
   */
  async getKeyValue(id, userId) {
    return new Promise((resolve, reject) => {
      const db = getConnection();
      
      db.get(
        `SELECT key_value, encrypted
         FROM api_keys 
         WHERE id = ? AND user_id = ? AND active = 1`,
        [id, userId],
        (err, result) => {
          db.close();
          
          if (err) {
            logger.error(`Error getting API key value: ${err.message}`);
            reject(err);
            return;
          }
          
          if (!result) {
            reject(new Error('API key not found or not active'));
            return;
          }
          
          try {
            // Decrypt if necessary
            const keyValue = result.encrypted 
              ? this._decryptApiKey(result.key_value)
              : result.key_value;
            
            resolve(keyValue);
          } catch (error) {
            logger.error(`Error decrypting API key: ${error.message}`);
            reject(error);
          }
        }
      );
    });
  }
  
  /**
   * Get API key by ID
   * @param {number} id - API key ID
   * @param {number} userId - User ID (for security verification)
   * @returns {Promise<Object>} API key object (without key value)
   */
  async findById(id, userId) {
    return new Promise((resolve, reject) => {
      const db = getConnection();
      
      db.get(
        `SELECT id, user_id, key_name, encrypted, active, created_at, updated_at
         FROM api_keys 
         WHERE id = ? AND user_id = ?`,
        [id, userId],
        (err, apiKey) => {
          db.close();
          
          if (err) {
            logger.error(`Error finding API key by ID: ${err.message}`);
            reject(err);
            return;
          }
          
          resolve(apiKey || null);
        }
      );
    });
  }
  
  /**
   * Update API key information
   * @param {number} id - API key ID
   * @param {number} userId - User ID (for security verification)
   * @param {Object} keyData - API key data to update
   * @param {string} [keyData.key_name] - Name for the API key
   * @param {string} [keyData.key_value] - Plain text API key
   * @param {boolean} [keyData.active] - Whether the key is active
   * @returns {Promise<Object>} Updated API key object
   */
  async update(id, userId, keyData) {
    const { key_name, key_value, active } = keyData;
    
    // Ensure at least one field is being updated
    if (!key_name && key_value === undefined && active === undefined) {
      throw new Error('No update fields provided');
    }
    
    return new Promise((resolve, reject) => {
      const db = getConnection();
      
      // Start a transaction
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // First, check if this key exists and belongs to the user
        db.get(
          `SELECT id, key_value, encrypted 
           FROM api_keys 
           WHERE id = ? AND user_id = ?`,
          [id, userId],
          (err, existingKey) => {
            if (err) {
              db.run('ROLLBACK');
              db.close();
              logger.error(`Error finding API key for update: ${err.message}`);
              reject(err);
              return;
            }
            
            if (!existingKey) {
              db.run('ROLLBACK');
              db.close();
              const error = new Error(`API key with ID ${id} not found for user ${userId}`);
              logger.error(error.message);
              reject(error);
              return;
            }
            
            // Prepare update query parts
            const updateParts = [];
            const params = [];
            
            if (key_name) {
              updateParts.push('key_name = ?');
              params.push(key_name);
            }
            
            if (key_value !== undefined) {
              updateParts.push('key_value = ?');
              // Encrypt if necessary
              const storedKeyValue = existingKey.encrypted 
                ? this._encryptApiKey(key_value)
                : key_value;
              params.push(storedKeyValue);
            }
            
            if (active !== undefined) {
              updateParts.push('active = ?');
              params.push(active ? 1 : 0);
            }
            
            // Add updated_at timestamp
            updateParts.push('updated_at = CURRENT_TIMESTAMP');
            
            // Add where clause params
            params.push(id);
            params.push(userId);
            
            // Build and execute update query
            const updateQuery = `
              UPDATE api_keys
              SET ${updateParts.join(', ')}
              WHERE id = ? AND user_id = ?
            `;
            
            db.run(updateQuery, params, function(err) {
              if (err) {
                db.run('ROLLBACK');
                db.close();
                logger.error(`Error updating API key: ${err.message}`);
                reject(err);
                return;
              }
              
              // Get the updated API key
              db.get(
                `SELECT id, user_id, key_name, encrypted, active, created_at, updated_at
                 FROM api_keys WHERE id = ?`,
                [id],
                (err, apiKey) => {
                  if (err) {
                    db.run('ROLLBACK');
                    db.close();
                    logger.error(`Error retrieving updated API key: ${err.message}`);
                    reject(err);
                    return;
                  }
                  
                  db.run('COMMIT');
                  db.close();
                  resolve(apiKey);
                }
              );
            });
          }
        );
      });
    });
  }
  
  /**
   * Delete an API key
   * @param {number} id - API key ID
   * @param {number} userId - User ID (for security verification)
   * @returns {Promise<boolean>} True if API key was deleted successfully
   */
  async delete(id, userId) {
    return new Promise((resolve, reject) => {
      const db = getConnection();
      
      db.run(
        `DELETE FROM api_keys 
         WHERE id = ? AND user_id = ?`,
        [id, userId],
        function(err) {
          db.close();
          
          if (err) {
            logger.error(`Error deleting API key: ${err.message}`);
            reject(err);
            return;
          }
          
          if (this.changes === 0) {
            const error = new Error(`API key with ID ${id} not found for user ${userId}`);
            logger.error(error.message);
            reject(error);
            return;
          }
          
          resolve(true);
        }
      );
    });
  }
  
  /**
   * Delete all API keys for a user
   * @param {number} userId - User ID
   * @returns {Promise<number>} Number of deleted API keys
   */
  async deleteAllForUser(userId) {
    return new Promise((resolve, reject) => {
      const db = getConnection();
      
      db.run(
        `DELETE FROM api_keys WHERE user_id = ?`,
        [userId],
        function(err) {
          db.close();
          
          if (err) {
            logger.error(`Error deleting API keys for user: ${err.message}`);
            reject(err);
            return;
          }
          
          resolve(this.changes);
        }
      );
    });
  }
}

module.exports = new ApiKeyModel();
