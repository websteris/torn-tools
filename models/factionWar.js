/**
 * @module FactionWarModel
 * @description Model for faction war data operations
 */

const db = require('../db');
const logger = require('../utils/logger').logger;

/**
 * Get all faction wars
 * @returns {Promise<Array>} Array of faction war objects
 */
async function getAllFactionWars() {
  try {
    return await db('faction_wars').select('*');
  } catch (error) {
    logger.error(`Error getting all faction wars: ${error.message}`);
    throw error;
  }
}

/**
 * Get faction wars by faction ID
 * @param {number} factionId - Faction ID
 * @returns {Promise<Array>} Array of faction war objects
 */
async function getFactionWarsByFactionId(factionId) {
  try {
    return await db('faction_wars').where({ faction_id: factionId }).select('*');
  } catch (error) {
    logger.error(`Error getting faction wars by faction ID ${factionId}: ${error.message}`);
    throw error;
  }
}

/**
 * Get active faction wars by faction ID
 * @param {number} factionId - Faction ID
 * @returns {Promise<Array>} Array of active faction war objects
 */
async function getActiveFactionWarsByFactionId(factionId) {
  try {
    return await db('faction_wars')
      .where({ faction_id: factionId, status: 'active' })
      .select('*');
  } catch (error) {
    logger.error(`Error getting active faction wars by faction ID ${factionId}: ${error.message}`);
    throw error;
  }
}

/**
 * Get faction war by faction ID and opponent ID
 * @param {number} factionId - Faction ID
 * @param {number} opponentId - Opponent faction ID
 * @returns {Promise<Object|null>} Faction war object or null if not found
 */
async function getFactionWarByOpponent(factionId, opponentId) {
  try {
    const war = await db('faction_wars')
      .where({ faction_id: factionId, opponent_id: opponentId })
      .first();
    return war || null;
  } catch (error) {
    logger.error(`Error getting faction war between ${factionId} and ${opponentId}: ${error.message}`);
    throw error;
  }
}

/**
 * Create a new faction war
 * @param {Object} warData - Faction war data
 * @param {number} warData.faction_id - Faction ID
 * @param {number} warData.opponent_id - Opponent faction ID
 * @param {string} warData.opponent_name - Opponent faction name
 * @param {string|Date} [warData.start_time] - War start time
 * @param {string|Date} [warData.end_time] - War end time
 * @param {number} [warData.faction_score] - Faction score
 * @param {number} [warData.opponent_score] - Opponent faction score
 * @param {string} [warData.status] - War status (active, ended, etc.)
 * @param {Object} [warData.raw_data] - Raw war data from Torn API
 * @returns {Promise<Object>} Created faction war object
 */
async function createFactionWar(warData) {
  try {
    // Prepare data for insertion
    const dataToInsert = {
      faction_id: warData.faction_id,
      opponent_id: warData.opponent_id,
      opponent_name: warData.opponent_name,
      start_time: warData.start_time,
      end_time: warData.end_time,
      faction_score: warData.faction_score || 0,
      opponent_score: warData.opponent_score || 0,
      status: warData.status || 'active'
    };
    
    // Handle raw_data as JSON
    if (warData.raw_data) {
      dataToInsert.raw_data = JSON.stringify(warData.raw_data);
    }
    
    const [war] = await db('faction_wars').insert(dataToInsert).returning('*');
    
    // Parse raw_data for return
    if (war.raw_data) {
      try {
        war.raw_data = JSON.parse(war.raw_data);
      } catch (e) {
        logger.warn(`Failed to parse raw_data for war between ${war.faction_id} and ${war.opponent_id}`);
      }
    }
    
    logger.info(`Created faction war: ${warData.faction_id} vs ${warData.opponent_id}`);
    return war;
  } catch (error) {
    logger.error(`Error creating faction war: ${error.message}`);
    throw error;
  }
}

/**
 * Update a faction war
 * @param {number} factionId - Faction ID
 * @param {number} opponentId - Opponent faction ID
 * @param {Object} warData - Faction war data to update
 * @returns {Promise<Object>} Updated faction war object
 */
async function updateFactionWar(factionId, opponentId, warData) {
  try {
    // Prepare data for update
    const dataToUpdate = { ...warData };
    
    // Handle raw_data as JSON
    if (warData.raw_data) {
      dataToUpdate.raw_data = JSON.stringify(warData.raw_data);
    }
    
    const [war] = await db('faction_wars')
      .where({ faction_id: factionId, opponent_id: opponentId })
      .update(dataToUpdate)
      .returning('*');
    
    if (!war) {
      throw new Error(`Faction war between ${factionId} and ${opponentId} not found`);
    }
    
    // Parse raw_data for return
    if (war.raw_data) {
      try {
        war.raw_data = JSON.parse(war.raw_data);
      } catch (e) {
        logger.warn(`Failed to parse raw_data for war between ${war.faction_id} and ${war.opponent_id}`);
      }
    }
    
    logger.info(`Updated faction war between ${factionId} and ${opponentId}`);
    return war;
  } catch (error) {
    logger.error(`Error updating faction war between ${factionId} and ${opponentId}: ${error.message}`);
    throw error;
  }
}

/**
 * Delete a faction war
 * @param {number} factionId - Faction ID
 * @param {number} opponentId - Opponent faction ID
 * @returns {Promise<boolean>} True if faction war was deleted
 */
async function deleteFactionWar(factionId, opponentId) {
  try {
    const count = await db('faction_wars')
      .where({ faction_id: factionId, opponent_id: opponentId })
      .delete();
    
    if (count === 0) {
      throw new Error(`Faction war between ${factionId} and ${opponentId} not found`);
    }
    
    logger.info(`Deleted faction war between ${factionId} and ${opponentId}`);
    return true;
  } catch (error) {
    logger.error(`Error deleting faction war between ${factionId} and ${opponentId}: ${error.message}`);
    throw error;
  }
}

/**
 * Upsert a faction war (insert if not exists, update if exists)
 * @param {Object} warData - Faction war data
 * @param {number} warData.faction_id - Faction ID
 * @param {number} warData.opponent_id - Opponent faction ID
 * @returns {Promise<Object>} Upserted faction war object
 */
async function upsertFactionWar(warData) {
  try {
    // Check if faction war exists — call siblings via module.exports so tests can spy them.
    const existingWar = await module.exports.getFactionWarByOpponent(warData.faction_id, warData.opponent_id);

    if (existingWar) {
      // Update existing faction war
      return await module.exports.updateFactionWar(warData.faction_id, warData.opponent_id, warData);
    } else {
      // Create new faction war
      return await module.exports.createFactionWar(warData);
    }
  } catch (error) {
    logger.error(`Error upserting faction war: ${error.message}`);
    throw error;
  }
}

module.exports = {
  getAllFactionWars,
  getFactionWarsByFactionId,
  getActiveFactionWarsByFactionId,
  getFactionWarByOpponent,
  createFactionWar,
  updateFactionWar,
  deleteFactionWar,
  upsertFactionWar
}; 