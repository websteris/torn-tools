const db = require('../db/db');
const logger = require('../utils/logger').createLogger('userDetail');

/**
 * Retrieves a user detail record by player ID
 * @param {number} player_id - The player's ID
 * @returns {Promise<Object|null>} User detail object or null if not found
 */
async function getUserDetailById(player_id) {
  try {
    const user = await db('users').where({ player_id }).first();
    return user || null;
  } catch (error) {
    logger.error(`Error getting user detail by player ID ${player_id}: ${error.message}`);
    throw error;
  }
}

/**
 * Creates a new user detail record
 * @param {Object} userData - User data to create
 * @returns {Promise<Object>} Newly created user detail
 */
async function createUserDetail(userData) {
  try {
    // Prepare the user record with required fields
    const userRecord = {
      player_id: userData.player_id,
      name: userData.name,
      level: userData.level || null,
      faction_id: userData.faction_id || null,
      raw_data: JSON.stringify(userData) // Store full API payload as JSON
    };

    // Insert the record and return the newly created user
    const [newUser] = await db('users').insert(userRecord).returning('*');
    
    // Parse JSON fields for return
    if (newUser.raw_data) {
      try {
        newUser.raw_data = JSON.parse(newUser.raw_data);
      } catch (parseError) {
        logger.warn(`Error parsing raw_data JSON for user ${userData.player_id}: ${parseError.message}`);
      }
    }
    
    logger.info(`Created user detail for player ID ${userData.player_id}`);
    return newUser;
  } catch (error) {
    logger.error(`Error creating user detail: ${error.message}`);
    throw error;
  }
}

/**
 * Updates an existing user detail record
 * @param {number} player_id - The player's ID
 * @param {Object} userData - Updated user data
 * @returns {Promise<Object>} Updated user detail
 */
async function updateUserDetail(player_id, userData) {
  try {
    // Prepare the user record with updated fields
    const userRecord = {
      name: userData.name,
      level: userData.level || null,
      faction_id: userData.faction_id || null,
      raw_data: JSON.stringify(userData) // Update full API payload
    };

    // Update the record and return the updated user
    const [updatedUser] = await db('users')
      .where({ player_id })
      .update(userRecord)
      .returning('*');
    
    // Parse JSON fields for return
    if (updatedUser && updatedUser.raw_data) {
      try {
        updatedUser.raw_data = JSON.parse(updatedUser.raw_data);
      } catch (parseError) {
        logger.warn(`Error parsing raw_data JSON for user ${player_id}: ${parseError.message}`);
      }
    }
    
    if (!updatedUser) {
      logger.warn(`User detail not found for player ID ${player_id}`);
      return null;
    }
    
    logger.info(`Updated user detail for player ID ${player_id}`);
    return updatedUser;
  } catch (error) {
    logger.error(`Error updating user detail for player ID ${player_id}: ${error.message}`);
    throw error;
  }
}

/**
 * Upserts a user detail record (updates if exists, creates if not)
 * @param {Object} userData - User data to upsert
 * @returns {Promise<Object>} Created or updated user detail
 */
async function upsertUserDetail(userData) {
  try {
    // Check if user exists
    const existingUser = await getUserDetailById(userData.player_id);
    
    // Update or create based on existence
    if (existingUser) {
      logger.debug(`Updating existing user detail for player ID ${userData.player_id}`);
      return await updateUserDetail(userData.player_id, userData);
    } else {
      logger.debug(`Creating new user detail for player ID ${userData.player_id}`);
      return await createUserDetail(userData);
    }
  } catch (error) {
    logger.error(`Error upserting user detail: ${error.message}`);
    throw error;
  }
}

/**
 * Gets all user details
 * @returns {Promise<Array>} Array of all user details
 */
async function getAllUserDetails() {
  try {
    const users = await db('users').select('*');
    
    // Parse JSON fields for each user
    return users.map(user => {
      if (user.raw_data) {
        try {
          user.raw_data = JSON.parse(user.raw_data);
        } catch (parseError) {
          logger.warn(`Error parsing raw_data JSON for user ${user.player_id}: ${parseError.message}`);
        }
      }
      return user;
    });
  } catch (error) {
    logger.error(`Error getting all user details: ${error.message}`);
    throw error;
  }
}

// Export all functions
module.exports = {
  getUserDetailById,
  createUserDetail,
  updateUserDetail,
  upsertUserDetail,
  getAllUserDetails
};
