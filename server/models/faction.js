/**
 * @module FactionModel
 * @description Model for faction data operations
 */

const db = require('../db');
const logger = require('../utils/logger').logger;

/**
 * Get all factions
 * @returns {Promise<Array>} Array of faction objects
 */
async function getAllFactions() {
  try {
    return await db('factions').select('*');
  } catch (error) {
    logger.error(`Error getting all factions: ${error.message}`);
    throw error;
  }
}

/**
 * Get faction by ID
 * @param {number} id - Faction ID
 * @returns {Promise<Object|null>} Faction object or null if not found
 */
async function getFactionById(id) {
  try {
    const faction = await db('factions').where({ id }).first();
    return faction || null;
  } catch (error) {
    logger.error(`Error getting faction by ID ${id}: ${error.message}`);
    throw error;
  }
}

/**
 * Get faction by name
 * @param {string} name - Faction name
 * @returns {Promise<Object|null>} Faction object or null if not found
 */
async function getFactionByName(name) {
  try {
    const faction = await db('factions').where({ name }).first();
    return faction || null;
  } catch (error) {
    logger.error(`Error getting faction by name ${name}: ${error.message}`);
    throw error;
  }
}

/**
 * Create a new faction
 * @param {Object} factionData - Faction data
 * @param {number} factionData.id - Faction ID
 * @param {string} factionData.name - Faction name
 * @param {string} [factionData.tag] - Faction tag
 * @param {number} [factionData.leader_id] - Leader's player ID
 * @param {number} [factionData.co_leader_id] - Co-leader's player ID
 * @param {number} [factionData.member_count] - Number of members
 * @param {number} [factionData.respect] - Faction respect
 * @param {Object} [factionData.raw_data] - Raw faction data from Torn API
 * @returns {Promise<Object>} Created faction object
 */
async function createFaction(factionData) {
  try {
    // Prepare data for insertion
    const dataToInsert = {
      id: factionData.id,
      name: factionData.name,
      tag: factionData.tag,
      leader_id: factionData.leader_id,
      co_leader_id: factionData.co_leader_id,
      member_count: factionData.member_count,
      respect: factionData.respect
    };
    
    // Handle raw_data as JSON
    if (factionData.raw_data) {
      dataToInsert.raw_data = JSON.stringify(factionData.raw_data);
    }
    
    const [faction] = await db('factions').insert(dataToInsert).returning('*');
    
    // Parse raw_data for return
    if (faction.raw_data) {
      try {
        faction.raw_data = JSON.parse(faction.raw_data);
      } catch (e) {
        logger.warn(`Failed to parse raw_data for faction ${faction.id}`);
      }
    }
    
    logger.info(`Created faction: ${factionData.name} (ID: ${factionData.id})`);
    return faction;
  } catch (error) {
    logger.error(`Error creating faction: ${error.message}`);
    throw error;
  }
}

/**
 * Update a faction
 * @param {number} id - Faction ID
 * @param {Object} factionData - Faction data to update
 * @returns {Promise<Object>} Updated faction object
 */
async function updateFaction(id, factionData) {
  try {
    // Prepare data for update
    const dataToUpdate = { ...factionData };
    
    // Handle raw_data as JSON
    if (factionData.raw_data) {
      dataToUpdate.raw_data = JSON.stringify(factionData.raw_data);
    }
    
    const [faction] = await db('factions')
      .where({ id })
      .update(dataToUpdate)
      .returning('*');
    
    if (!faction) {
      throw new Error(`Faction with ID ${id} not found`);
    }
    
    // Parse raw_data for return
    if (faction.raw_data) {
      try {
        faction.raw_data = JSON.parse(faction.raw_data);
      } catch (e) {
        logger.warn(`Failed to parse raw_data for faction ${faction.id}`);
      }
    }
    
    logger.info(`Updated faction with ID: ${id}`);
    return faction;
  } catch (error) {
    logger.error(`Error updating faction with ID ${id}: ${error.message}`);
    throw error;
  }
}

/**
 * Delete a faction
 * @param {number} id - Faction ID
 * @returns {Promise<boolean>} True if faction was deleted
 */
async function deleteFaction(id) {
  try {
    const count = await db('factions').where({ id }).delete();
    
    if (count === 0) {
      throw new Error(`Faction with ID ${id} not found`);
    }
    
    logger.info(`Deleted faction with ID: ${id}`);
    return true;
  } catch (error) {
    logger.error(`Error deleting faction with ID ${id}: ${error.message}`);
    throw error;
  }
}

/**
 * Upsert a faction (insert if not exists, update if exists)
 * @param {Object} factionData - Faction data
 * @param {number} factionData.id - Faction ID
 * @returns {Promise<Object>} Upserted faction object
 */
async function upsertFaction(factionData) {
  try {
    // Check if faction exists
    const existingFaction = await getFactionById(factionData.id);
    
    if (existingFaction) {
      // Update existing faction
      return await updateFaction(factionData.id, factionData);
    } else {
      // Create new faction
      return await createFaction(factionData);
    }
  } catch (error) {
    logger.error(`Error upserting faction: ${error.message}`);
    throw error;
  }
}

module.exports = {
  getAllFactions,
  getFactionById,
  getFactionByName,
  createFaction,
  updateFaction,
  deleteFaction,
  upsertFaction
}; 