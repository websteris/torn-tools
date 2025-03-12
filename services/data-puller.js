/**
 * @module DataPullerService
 * @description Service for periodically pulling data from Torn API and storing in database
 */

const tornApiClient = require('./torn-api/client');
const userModel = require('../models/user');
const factionModel = require('../models/faction');
const factionWarModel = require('../models/factionWar');
const logger = require('../utils/logger').logger;

// Default intervals in milliseconds
const DEFAULT_INTERVALS = {
  user: 15 * 60 * 1000, // 15 minutes
  faction: 30 * 60 * 1000, // 30 minutes
  war: 5 * 60 * 1000 // 5 minutes
};

// Timers for each data type
let timers = {
  user: null,
  faction: null,
  war: null
};

// Status of the data puller
let status = {
  running: false,
  lastRun: {
    user: null,
    faction: null,
    war: null
  },
  errors: {
    user: null,
    faction: null,
    war: null
  }
};

/**
 * Pull user data from Torn API and store in database
 * @param {string} apiKey - Torn API key
 * @returns {Promise<Array>} Array of updated user objects
 */
async function pullUserData(apiKey) {
  try {
    logger.info('Pulling user data from Torn API');
    status.lastRun.user = new Date();
    
    // Get user data from API
    const userData = await tornApiClient.getUserData(apiKey);
    
    if (!userData || !userData.player_id) {
      throw new Error('Invalid user data received from API');
    }
    
    // Upsert user in database
    const user = await userModel.upsertUser({
      id: userData.player_id,
      name: userData.name,
      raw_data: userData
    });
    
    logger.info(`User data updated for: ${user.name} (ID: ${user.id})`);
    status.errors.user = null;
    return [user];
  } catch (error) {
    logger.error(`Error pulling user data: ${error.message}`);
    status.errors.user = error.message;
    throw error;
  }
}

/**
 * Pull faction data from Torn API and store in database
 * @param {string} apiKey - Torn API key
 * @returns {Promise<Array>} Array of updated faction objects
 */
async function pullFactionData(apiKey) {
  try {
    logger.info('Pulling faction data from Torn API');
    status.lastRun.faction = new Date();
    
    // Get user data first to get faction ID
    const userData = await tornApiClient.getUserData(apiKey);
    
    if (!userData || !userData.faction || !userData.faction.faction_id) {
      throw new Error('User is not in a faction or invalid data received from API');
    }
    
    const factionId = userData.faction.faction_id;
    
    // Get faction data from API
    const factionData = await tornApiClient.getFactionData(apiKey, factionId);
    
    if (!factionData) {
      throw new Error('Invalid faction data received from API');
    }
    
    // Upsert faction in database
    const faction = await factionModel.upsertFaction({
      id: factionId,
      name: factionData.name,
      tag: factionData.tag,
      leader_id: factionData.leader,
      co_leader_id: factionData.co_leader,
      member_count: Object.keys(factionData.members || {}).length,
      respect: factionData.respect,
      raw_data: factionData
    });
    
    logger.info(`Faction data updated for: ${faction.name} (ID: ${faction.id})`);
    status.errors.faction = null;
    return [faction];
  } catch (error) {
    logger.error(`Error pulling faction data: ${error.message}`);
    status.errors.faction = error.message;
    throw error;
  }
}

/**
 * Pull war data from Torn API and store in database
 * @param {string} apiKey - Torn API key
 * @returns {Promise<Array>} Array of updated war objects
 */
async function pullWarData(apiKey) {
  try {
    logger.info('Pulling war data from Torn API');
    status.lastRun.war = new Date();
    
    // Get user data first to get faction ID
    const userData = await tornApiClient.getUserData(apiKey);
    
    if (!userData || !userData.faction || !userData.faction.faction_id) {
      throw new Error('User is not in a faction or invalid data received from API');
    }
    
    const factionId = userData.faction.faction_id;
    
    // Get war opponents data from API
    const warOpponents = await tornApiClient.getWarOpponents(apiKey, factionId);
    
    if (!warOpponents || !Array.isArray(warOpponents)) {
      throw new Error('Invalid war data received from API');
    }
    
    // Upsert each war in database
    const wars = [];
    for (const opponent of warOpponents) {
      if (!opponent.faction_id) continue;
      
      const war = await factionWarModel.upsertFactionWar({
        faction_id: factionId,
        opponent_id: opponent.faction_id,
        opponent_name: opponent.name,
        start_time: opponent.war.started,
        end_time: opponent.war.ends || null,
        faction_score: opponent.war.score[factionId.toString()] || 0,
        opponent_score: opponent.war.score[opponent.faction_id.toString()] || 0,
        status: opponent.war.status || 'active',
        raw_data: opponent
      });
      
      wars.push(war);
    }
    
    logger.info(`War data updated for ${wars.length} wars`);
    status.errors.war = null;
    return wars;
  } catch (error) {
    logger.error(`Error pulling war data: ${error.message}`);
    status.errors.war = error.message;
    throw error;
  }
}

/**
 * Start pulling data periodically
 * @param {string} apiKey - Torn API key
 * @param {Object} [intervals] - Custom intervals for each data type
 * @param {number} [intervals.user] - Interval for user data in milliseconds
 * @param {number} [intervals.faction] - Interval for faction data in milliseconds
 * @param {number} [intervals.war] - Interval for war data in milliseconds
 */
function startPulling(apiKey, intervals = {}) {
  if (!apiKey) {
    throw new Error('API key is required to start data pulling');
  }
  
  // Merge custom intervals with defaults
  const mergedIntervals = {
    user: intervals.user || DEFAULT_INTERVALS.user,
    faction: intervals.faction || DEFAULT_INTERVALS.faction,
    war: intervals.war || DEFAULT_INTERVALS.war
  };
  
  // Stop any existing timers
  stopPulling();
  
  // Set status to running
  status.running = true;
  
  // Start pulling data immediately
  pullUserData(apiKey).catch(err => logger.error(`Initial user data pull failed: ${err.message}`));
  pullFactionData(apiKey).catch(err => logger.error(`Initial faction data pull failed: ${err.message}`));
  pullWarData(apiKey).catch(err => logger.error(`Initial war data pull failed: ${err.message}`));
  
  // Set up timers for periodic pulls
  timers.user = setInterval(() => {
    pullUserData(apiKey).catch(err => logger.error(`User data pull failed: ${err.message}`));
  }, mergedIntervals.user);
  
  timers.faction = setInterval(() => {
    pullFactionData(apiKey).catch(err => logger.error(`Faction data pull failed: ${err.message}`));
  }, mergedIntervals.faction);
  
  timers.war = setInterval(() => {
    pullWarData(apiKey).catch(err => logger.error(`War data pull failed: ${err.message}`));
  }, mergedIntervals.war);
  
  logger.info('Data puller started with intervals:', {
    user: `${mergedIntervals.user / 1000}s`,
    faction: `${mergedIntervals.faction / 1000}s`,
    war: `${mergedIntervals.war / 1000}s`
  });
}

/**
 * Stop pulling data
 */
function stopPulling() {
  // Clear all timers
  Object.values(timers).forEach(timer => {
    if (timer) {
      clearInterval(timer);
    }
  });
  
  // Reset timers
  timers = {
    user: null,
    faction: null,
    war: null
  };
  
  // Set status to not running
  status.running = false;
  
  logger.info('Data puller stopped');
}

/**
 * Get current status of the data puller
 * @returns {Object} Status object
 */
function getStatus() {
  return {
    ...status,
    intervals: {
      user: timers.user ? DEFAULT_INTERVALS.user : null,
      faction: timers.faction ? DEFAULT_INTERVALS.faction : null,
      war: timers.war ? DEFAULT_INTERVALS.war : null
    }
  };
}

module.exports = {
  pullUserData,
  pullFactionData,
  pullWarData,
  startPulling,
  stopPulling,
  getStatus
}; 