const db = require('../db/db');
const logger = require('../utils/logger');

async function getAllUsers() {
  try {
    const users = await db('user_accounts').select('*');
    return users;
  } catch (error) {
    logger.error(`Error getting all users: ${error.message}`);
    throw error;
  }
}

async function getUserAccountById(player_id) {
  try {
    const user = await db('user_accounts').where({ player_id }).first();
    return user || null;
  } catch (error) {
    logger.error(`Error getting user account by player ID ${player_id}: ${error.message}`);
    throw error;
  }
}

async function getUserAccountByUsername(username) {
  try {
    const user = await db('user_accounts').where({ username }).first();
    return user || null;
  } catch (error) {
    logger.error(`Error getting user account by username ${username}: ${error.message}`);
    throw error;
  }
}

async function createUserAccount(userData) {
  try {
    // Prepare data for insertion
    const dataToInsert = {
      player_id: userData.player_id,
      username: userData.username,
      name: userData.name || null,
      password_hash: userData.password_hash
    };
    
    // Handle JSON fields
    if (userData.preferences) {
      dataToInsert.preferences = JSON.stringify(userData.preferences);
    }
    
    if (userData.raw_data) {
      dataToInsert.raw_data = JSON.stringify(userData.raw_data);
    }
    
    const [user] = await db('user_accounts').insert(dataToInsert).returning('*');
    
    // Parse JSON fields for return
    if (user.preferences) {
      user.preferences = JSON.parse(user.preferences);
    }
    
    if (user.raw_data) {
      user.raw_data = JSON.parse(user.raw_data);
    }
    
    return user;
  } catch (error) {
    logger.error(`Error creating user account: ${error.message}`);
    throw error;
  }
}

async function updateUserAccount(player_id, userData) {
  try {
    // Prepare data for update
    const dataToUpdate = {};
    
    if (userData.username) dataToUpdate.username = userData.username;
    if (userData.name) dataToUpdate.name = userData.name;
    if (userData.password_hash) dataToUpdate.password_hash = userData.password_hash;
    
    // Handle JSON fields
    if (userData.preferences) {
      dataToUpdate.preferences = JSON.stringify(userData.preferences);
    }
    
    if (userData.raw_data) {
      dataToUpdate.raw_data = JSON.stringify(userData.raw_data);
    }
    
    const [user] = await db('user_accounts')
      .where({ player_id })
      .update(dataToUpdate)
      .returning('*');
    
    if (!user) {
      throw new Error(`User account with player ID ${player_id} not found`);
    }
    
    // Parse JSON fields for return
    if (user.preferences) {
      user.preferences = JSON.parse(user.preferences);
    }
    
    if (user.raw_data) {
      user.raw_data = JSON.parse(user.raw_data);
    }
    
    return user;
  } catch (error) {
    logger.error(`Error updating user account with player ID ${player_id}: ${error.message}`);
    throw error;
  }
}

async function upsertUserAccount(userData) {
  try {
    const existingUser = await getUserAccountById(userData.player_id);
    
    if (existingUser) {
      // Update existing user
      return await updateUserAccount(userData.player_id, userData);
    } else {
      // Create new user
      return await createUserAccount(userData);
    }
  } catch (error) {
    logger.error(`Error upserting user account: ${error.message}`);
    throw error;
  }
}

module.exports = {
  getAllUsers,
  getUserAccountById,
  getUserAccountByUsername,
  createUserAccount,
  updateUserAccount,
  upsertUserAccount
};

/**
 * User Account Model
 * 
 * Handles database operations for user accounts.
 */

const db = require('../db/db');
const logger = require('../utils/logger');

// Create component-specific logger
const moduleLogger = logger.createLogger('UserAccountModel');

/**
 * Get all user accounts
 * @returns {Promise<Array>} Array of user accounts
 */
async function getAllUsers() {
  try {
    const users = await db('user_accounts').select('*');
    
    // Parse JSON fields
    return users.map(user => {
      if (user.preferences) {
        try {
          user.preferences = JSON.parse(user.preferences);
        } catch (error) {
          moduleLogger.warn(`Failed to parse preferences for user ${user.player_id}: ${error.message}`);
        }
      }
      
      if (user.raw_data) {
        try {
          user.raw_data = JSON.parse(user.raw_data);
        } catch (error) {
          moduleLogger.warn(`Failed to parse raw_data for user ${user.player_id}: ${error.message}`);
        }
      }
      
      return user;
    });
  } catch (error) {
    moduleLogger.error(`Error getting all users: ${error.message}`);
    throw error;
  }
}

/**
 * Get user account by player ID
 * @param {number} player_id Player ID
 * @returns {Promise<Object|null>} User account or null if not found
 */
async function getUserAccountById(player_id) {
  try {
    const user = await db('user_accounts').where({ player_id }).first();
    
    if (!user) {
      return null;
    }
    
    // Parse JSON fields
    if (user.preferences) {
      try {
        user.preferences = JSON.parse(user.preferences);
      } catch (error) {
        moduleLogger.warn(`Failed to parse preferences for user ${player_id}: ${error.message}`);
      }
    }
    
    if (user.raw_data) {
      try {
        user.raw_data = JSON.parse(user.raw_data);
      } catch (error) {
        moduleLogger.warn(`Failed to parse raw_data for user ${player_id}: ${error.message}`);
      }
    }
    
    return user;
  } catch (error) {
    moduleLogger.error(`Error getting user account by player ID ${player_id}: ${error.message}`);
    throw error;
  }
}

/**
 * Create a new user account
 * @param {Object} userData User data
 * @returns {Promise<Object>} Created user account
 */
async function createUserAccount(userData) {
  try {
    const dataToInsert = {
      player_id: userData.player_id,
      username: userData.username,
      name: userData.name,
      password_hash: userData.password_hash
    };
    
    // Handle JSON fields
    if (userData.preferences) {
      dataToInsert.preferences = JSON.stringify(userData.preferences);
    }
    
    if (userData.raw_data) {
      dataToInsert.raw_data = JSON.stringify(userData.raw_data);
    }
    
    const [user] = await db('user_accounts').insert(dataToInsert).returning('*');
    
    // Parse JSON fields for return
    if (user.preferences) {
      try {
        user.preferences = JSON.parse(user.preferences);
      } catch (error) {
        moduleLogger.warn(`Failed to parse preferences for user ${user.player_id}: ${error.message}`);
      }
    }
    
    if (user.raw_data) {
      try {
        user.raw_data = JSON.parse(user.raw_data);
      } catch (error) {
        moduleLogger.warn(`Failed to parse raw_data for user ${user.player_id}: ${error.message}`);
      }
    }
    
    moduleLogger.info(`Created user account for player ID ${user.player_id}`);
    return user;
  } catch (error) {
    moduleLogger.error(`Error creating user account: ${error.message}`);
    throw error;
  }
}

/**
 * Update an existing user account
 * @param {number} player_id Player ID
 * @param {Object} userData Updated user data
 * @returns {Promise<Object>} Updated user account
 */
async function updateUserAccount(player_id, userData) {
  try {
    const dataToUpdate = {};
    
    // Only update provided fields
    if (userData.username !== undefined) dataToUpdate.username = userData.username;
    if (userData.name !== undefined) dataToUpdate.name = userData.name;
    if (userData.password_hash !== undefined) dataToUpdate.password_hash = userData.password_hash;
    
    // Handle JSON fields
    if (userData.preferences !== undefined) {
      dataToUpdate.preferences = JSON.stringify(userData.preferences);
    }
    
    if (userData.raw_data !== undefined) {
      dataToUpdate.raw_data = JSON.stringify(userData.raw_data);
    }
    
    const [user] = await db('user_accounts')
      .where({ player_id })
      .update(dataToUpdate)
      .returning('*');
    
    if (!user) {
      throw new Error(`User account with player ID ${player_id} not found`);
    }
    
    // Parse JSON fields for return
    if (user.preferences) {
      try {
        user.preferences = JSON.parse(user.preferences);
      } catch (error) {
        moduleLogger.warn(`Failed to parse preferences for user ${user.player_id}: ${error.message}`);
      }
    }
    
    if (user.raw_data) {
      try {
        user.raw_data = JSON.parse(user.raw_data);
      } catch (error) {
        moduleLogger.warn(`Failed to parse raw_data for user ${user.player_id}: ${error.message}`);
      }
    }
    
    moduleLogger.info(`Updated user account for player ID ${player_id}`);
    return user;
  } catch (error) {
    moduleLogger.error(`Error updating user account with player ID ${player_id}: ${error.message}`);
    throw error;
  }
}

/**
 * Upsert a user account (create if not exists, update if exists)
 * @param {Object} userData User data
 * @returns {Promise<Object>} Created or updated user account
 */
async function upsertUserAccount(userData) {
  try {
    const existingUser = await getUserAccountById(userData.player_id);
    
    if (existingUser) {
      moduleLogger.info(`Updating existing user account for player ID ${userData.player_id}`);
      return await updateUserAccount(userData.player_id, userData);
    } else {
      moduleLogger.info(`Creating new user account for player ID ${userData.player_id}`);
      return await createUserAccount(userData);
    }
  } catch (error) {
    moduleLogger.error(`Error upserting user account: ${error.message}`);
    throw error;
  }
}

module.exports = {
  getAllUsers,
  getUserAccountById,
  createUserAccount,
  updateUserAccount,
  upsertUserAccount
};

/**
 * @module UserAccountModel
 * @description Model for user account data operations (authentication-related)
 */

const db = require('../db/db');
const logger = require('../utils/logger').logger;

/**
 * Get all user accounts
 * @returns {Promise<Array>} Array of user account objects
 */
async function getAllUsers() {
  try {
    return await db('user_accounts').select('*');
  } catch (error) {
    logger.error(`Error getting all user accounts: ${error.message}`);
    throw error;
  }
}

/**
 * Get user account by player ID
 * @param {number} player_id - Torn player ID
 * @returns {Promise<Object|null>} User account object or null if not found
 */
async function getUserAccountById(player_id) {
  try {
    const user = await db('user_accounts').where({ player_id }).first();
    return user || null;
  } catch (error) {
    logger.error(`Error getting user account by player ID ${player_id}: ${error.message}`);
    throw error;
  }
}

/**
 * Get user account by username
 * @param {string} username - Username
 * @returns {Promise<Object|null>} User account object or null if not found
 */
async function getUserAccountByUsername(username) {
  try {
    const user = await db('user_accounts').where({ username }).first();
    return user || null;
  } catch (error) {
    logger.error(`Error getting user account by username ${username}: ${error.message}`);
    throw error;
  }
}

/**
 * Create a new user account
 * @param {Object} userData - User account data
 * @param {number} userData.player_id - Torn player ID
 * @param {string} userData.name - User's name
 * @param {string} userData.username - Username for login
 * @param {string} userData.password_hash - Hashed password
 * @param {Object} [userData.preferences] - User preferences (will be JSON stringified)
 * @param {Object} [userData.raw_data] - Raw user data from Torn API (will be JSON stringified)
 * @returns {Promise<Object>} Created user account object
 */
async function createUserAccount(userData) {
  try {
    // Prepare data for insertion
    const dataToInsert = {
      player_id: userData.player_id,
      name: userData.name,
      username: userData.username,
      password_hash: userData.password_hash
    };
    
    // Handle JSON fields
    if (userData.preferences) {
      dataToInsert.preferences = JSON.stringify(userData.preferences);
    }
    
    if (userData.raw_data) {
      dataToInsert.raw_data = JSON.stringify(userData.raw_data);
    }
    
    const [user] = await db('user_accounts').insert(dataToInsert).returning('*');
    
    // Parse JSON fields for return
    if (user.preferences) {
      try {
        user.preferences = JSON.parse(user.preferences);
      } catch (e) {
        logger.warn(`Failed to parse preferences for user ${user.player_id}`);
      }
    }
    
    if (user.raw_data) {
      try {
        user.raw_data = JSON.parse(user.raw_data);
      } catch (e) {
        logger.warn(`Failed to parse raw_data for user ${user.player_id}`);
      }
    }
    
    logger.info(`Created user account: ${userData.username} (ID: ${userData.player_id})`);
    return user;
  } catch (error) {
    logger.error(`Error creating user account: ${error.message}`);
    throw error;
  }
}

/**
 * Update a user account
 * @param {number} player_id - Torn player ID
 * @param {Object} userData - User account data to update
 * @returns {Promise<Object>} Updated user account object
 */
async function updateUserAccount(player_id, userData) {
  try {
    // Prepare data for update
    const dataToUpdate = { ...userData };
    
    // Handle JSON fields
    if (userData.preferences) {
      dataToUpdate.preferences = JSON.stringify(userData.preferences);
    }
    
    if (userData.raw_data) {
      dataToUpdate.raw_data = JSON.stringify(userData.raw_data);
    }
    
    const [user] = await db('user_accounts')
      .where({ player_id })
      .update(dataToUpdate)
      .returning('*');
    
    if (!user) {
      throw new Error(`User account with player ID ${player_id} not found`);
    }
    
    // Parse JSON fields for return
    if (user.preferences) {
      try {
        user.preferences = JSON.parse(user.preferences);
      } catch (e) {
        logger.warn(`Failed to parse preferences for user ${user.player_id}`);
      }
    }
    
    if (user.raw_data) {
      try {
        user.raw_data = JSON.parse(user.raw_data);
      } catch (e) {
        logger.warn(`Failed to parse raw_data for user ${user.player_id}`);
      }
    }
    
    logger.info(`Updated user account with player ID: ${player_id}`);
    return user;
  } catch (error) {
    logger.error(`Error updating user account with player ID ${player_id}: ${error.message}`);
    throw error;
  }
}

/**
 * Delete a user account
 * @param {number} player_id - Torn player ID
 * @returns {Promise<boolean>} True if user account was deleted
 */
async function deleteUserAccount(player_id) {
  try {
    const count = await db('user_accounts').where({ player_id }).delete();
    
    if (count === 0) {
      throw new Error(`User account with player ID ${player_id} not found`);
    }
    
    logger.info(`Deleted user account with player ID: ${player_id}`);
    return true;
  } catch (error) {
    logger.error(`Error deleting user account with player ID ${player_id}: ${error.message}`);
    throw error;
  }
}

/**
 * Upsert a user account (insert if not exists, update if exists)
 * @param {Object} userData - User account data
 * @param {number} userData.player_id - Torn player ID
 * @returns {Promise<Object>} Upserted user account object
 */
async function upsertUserAccount(userData) {
  try {
    // Check if user account exists
    const existingUser = await getUserAccountById(userData.player_id);
    
    if (existingUser) {
      // Update existing user account
      return await updateUserAccount(userData.player_id, userData);
    } else {
      // Create new user account
      return await createUserAccount(userData);
    }
  } catch (error) {
    logger.error(`Error upserting user account: ${error.message}`);
    throw error;
  }
}

module.exports = {
  getAllUsers,
  getUserAccountById,
  getUserAccountByUsername,
  createUserAccount,
  updateUserAccount,
  deleteUserAccount,
  upsertUserAccount
}; 