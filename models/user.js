/**
 * @module UserModel
 * @description Model for user data operations
 */

const db = require('../db');
const logger = require('../utils/logger').logger;

/**
 * Get all users
 * @returns {Promise<Array>} Array of user objects
 */
async function getAllUsers() {
  try {
    return await db('users').select('*');
  } catch (error) {
    logger.error(`Error getting all users: ${error.message}`);
    throw error;
  }
}

/**
 * Get user by ID
 * @param {number} id - User ID
 * @returns {Promise<Object|null>} User object or null if not found
 */
async function getUserById(id) {
  try {
    const user = await db('users').where({ id }).first();
    return user || null;
  } catch (error) {
    logger.error(`Error getting user by ID ${id}: ${error.message}`);
    throw error;
  }
}

/**
 * Get user by name
 * @param {string} name - User name
 * @returns {Promise<Object|null>} User object or null if not found
 */
async function getUserByName(name) {
  try {
    const user = await db('users').where({ name }).first();
    return user || null;
  } catch (error) {
    logger.error(`Error getting user by name ${name}: ${error.message}`);
    throw error;
  }
}

/**
 * Create a new user
 * @param {Object} userData - User data
 * @param {number} userData.id - User ID (from Torn API)
 * @param {string} userData.name - User name
 * @param {string} [userData.email] - User email
 * @param {string} [userData.role] - User role
 * @returns {Promise<Object>} Created user object
 */
async function createUser(userData) {
  try {
    const [user] = await db('users').insert(userData).returning('*');
    logger.info(`Created user: ${userData.name} (ID: ${userData.id})`);
    return user;
  } catch (error) {
    logger.error(`Error creating user: ${error.message}`);
    throw error;
  }
}

/**
 * Update a user
 * @param {number} id - User ID
 * @param {Object} userData - User data to update
 * @returns {Promise<Object>} Updated user object
 */
async function updateUser(id, userData) {
  try {
    const [user] = await db('users')
      .where({ id })
      .update(userData)
      .returning('*');
    
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }
    
    logger.info(`Updated user with ID: ${id}`);
    return user;
  } catch (error) {
    logger.error(`Error updating user with ID ${id}: ${error.message}`);
    throw error;
  }
}

/**
 * Delete a user
 * @param {number} id - User ID
 * @returns {Promise<boolean>} True if user was deleted
 */
async function deleteUser(id) {
  try {
    const count = await db('users').where({ id }).delete();
    
    if (count === 0) {
      throw new Error(`User with ID ${id} not found`);
    }
    
    logger.info(`Deleted user with ID: ${id}`);
    return true;
  } catch (error) {
    logger.error(`Error deleting user with ID ${id}: ${error.message}`);
    throw error;
  }
}

/**
 * Upsert a user (insert if not exists, update if exists)
 * @param {Object} userData - User data
 * @param {number} userData.id - User ID
 * @returns {Promise<Object>} Upserted user object
 */
async function upsertUser(userData) {
  try {
    // Check if user exists
    const existingUser = await getUserById(userData.id);
    
    if (existingUser) {
      // Update existing user
      return await updateUser(userData.id, userData);
    } else {
      // Create new user
      return await createUser(userData);
    }
  } catch (error) {
    logger.error(`Error upserting user: ${error.message}`);
    throw error;
  }
}

module.exports = {
  getAllUsers,
  getUserById,
  getUserByName,
  createUser,
  updateUser,
  deleteUser,
  upsertUser
}; 