/**
 * User model
 * @module UserModel
 */

const { getConnection } = require('../schema');
const { logger } = require('../../utils/logger');

/**
 * User model for database operations
 */
class UserModel {
  /**
   * Find a user by Torn ID
   * @param {number} tornId - Torn ID
   * @returns {Promise<Object|null>} User object or null if not found
   */
  async findByTornId(tornId) {
    return new Promise((resolve, reject) => {
      const db = getConnection();
      db.get(
        `SELECT id, username, email, torn_id, created_at, updated_at
         FROM users WHERE torn_id = ?`,
        [tornId],
        (err, user) => {
          db.close();
          if (err) {
            logger.error(`Error finding user by Torn ID: ${err.message}`);
            reject(err);
            return;
          }
          resolve(user || null);
        }
      );
    });
  }
  
  /**
   * Find a user by username
   * @param {string} username - Username
   * @returns {Promise<Object|null>} User object or null if not found
   */
  async findByUsername(username) {
    return new Promise((resolve, reject) => {
      const db = getConnection();
      db.get(
        `SELECT id, username, email, torn_id, created_at, updated_at
         FROM users WHERE username = ?`,
        [username],
        (err, user) => {
          db.close();
          if (err) {
            logger.error(`Error finding user by username: ${err.message}`);
            reject(err);
            return;
          }
          resolve(user || null);
        }
      );
    });
  }
  
  /**
   * Find a user by ID
   * @param {number} id - User ID
   * @returns {Promise<Object|null>} User object or null if not found
   */
  async findById(id) {
    return new Promise((resolve, reject) => {
      const db = getConnection();
      db.get(
        `SELECT id, username, email, torn_id, created_at, updated_at
         FROM users WHERE id = ?`,
        [id],
        (err, user) => {
          db.close();
          if (err) {
            logger.error(`Error finding user by ID: ${err.message}`);
            reject(err);
            return;
          }
          resolve(user || null);
        }
      );
    });
  }
  
  /**
   * Create a new user
   * @param {Object} userData - User data
   * @returns {Promise<Object>} Created user object
   */
  async create(userData) {
    return new Promise((resolve, reject) => {
      const db = getConnection();
      
      // Insert user into database
      db.run(
        `INSERT INTO users (username, password_hash, email, torn_id)
         VALUES (?, ?, ?, ?)`,
        [userData.username, userData.password_hash, userData.email, userData.torn_id],
        function(err) {
          if (err) {
            db.close();
            logger.error(`Error creating user: ${err.message}`);
            reject(err);
            return;
          }
          
          // Get the newly created user
          db.get(
            `SELECT id, username, email, torn_id, created_at, updated_at
             FROM users WHERE id = ?`,
            [this.lastID],
            (err, user) => {
              db.close();
              
              if (err) {
                logger.error(`Error retrieving created user: ${err.message}`);
                reject(err);
                return;
              }
              
              resolve(user);
            }
          );
        }
      );
    });
  }
  
  /**
   * Update user information
   * @param {number} id - User ID
   * @param {Object} userData - User data to update
   * @returns {Promise<Object>} Updated user object
   */
  async update(id, userData) {
    return new Promise((resolve, reject) => {
      const db = getConnection();
      
      // Prepare update query parts
      const updateParts = [];
      const params = [];
      
      if (userData.username) {
        updateParts.push('username = ?');
        params.push(userData.username);
      }
      
      if (userData.email) {
        updateParts.push('email = ?');
        params.push(userData.email);
      }
      
      if (userData.password_hash) {
        updateParts.push('password_hash = ?');
        params.push(userData.password_hash);
      }
      
      if (userData.torn_id) {
        updateParts.push('torn_id = ?');
        params.push(userData.torn_id);
      }
      
      // Add updated_at timestamp
      updateParts.push('updated_at = CURRENT_TIMESTAMP');
      
      // Add where clause params
      params.push(id);
      
      // Build and execute update query
      const updateQuery = `
        UPDATE users
        SET ${updateParts.join(', ')}
        WHERE id = ?
      `;
      
      db.run(updateQuery, params, function(err) {
        if (err) {
          db.close();
          logger.error(`Error updating user: ${err.message}`);
          reject(err);
          return;
        }
        
        // Get the updated user
        db.get(
          `SELECT id, username, email, torn_id, created_at, updated_at
           FROM users WHERE id = ?`,
          [id],
          (err, user) => {
            db.close();
            
            if (err) {
              logger.error(`Error retrieving updated user: ${err.message}`);
              reject(err);
              return;
            }
            
            resolve(user);
          }
        );
      });
    });
  }
  
  /**
   * Delete a user
   * @param {number} id - User ID
   * @returns {Promise<boolean>} True if user was deleted successfully
   */
  async delete(id) {
    return new Promise((resolve, reject) => {
      const db = getConnection();
      
      db.run(
        `DELETE FROM users WHERE id = ?`,
        [id],
        function(err) {
          db.close();
          
          if (err) {
            logger.error(`Error deleting user: ${err.message}`);
            reject(err);
            return;
          }
          
          resolve(this.changes > 0);
        }
      );
    });
  }
}

module.exports = new UserModel();
