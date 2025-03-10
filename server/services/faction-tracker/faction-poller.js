/**
 * @module FactionPoller
 * @description Handles polling faction data from Torn API
 */

const TornApiClient = require('../torn-api/client');
const dataProcessor = require('./data-processor');
const warTracker = require('./war-tracker');
const { logger } = require('../../utils/logger');

const apiClient = new TornApiClient();

/**
 * Poll faction data from Torn API
 * @param {number} factionId - Faction ID to poll
 * @param {string} apiKey - API key to use
 * @param {Array<string>} [selections] - Specific data selections to fetch
 * @returns {Promise<Object>} Faction data
 */
async function pollFactionData(factionId, apiKey, selections = null) {
  try {
    logger.debug(`Polling faction data for faction ${factionId}`);
    
    // Default selections if not specified
    const dataSelections = selections || ['basic', 'members', 'territory_wars', 'raid_wars', 'ranked_wars'];
    
    // Fetch data from Torn API
    const factionData = await apiClient.getFactionData(apiKey, factionId, dataSelections);
    
    if (!factionData) {
      throw new Error(`No data returned for faction ${factionId}`);
    }
    
    // Process and store the faction data
    await dataProcessor.processFactionData(factionId, factionData);
    
    // Process war data if available
    if (factionData.territory_wars || factionData.raid_wars || factionData.ranked_wars) {
      await warTracker.processWarData(factionId, factionData);
    }
    
    // Process member data if available
    if (factionData.members) {
      await dataProcessor.processMemberData(factionId, factionData.members);
    }
    
    logger.debug(`Successfully polled and processed data for faction ${factionId}`);
    return factionData;
  } catch (error) {
    logger.error(`Error polling faction data for ${factionId}: ${error.message}`);
    throw error;
  }
}

/**
 * Poll specific faction member data
 * @param {number} factionId - Faction ID
 * @param {number} memberId - Member ID to poll
 * @param {string} apiKey - API key to use
 * @returns {Promise<Object>} Member data
 */
async function pollMemberData(factionId, memberId, apiKey) {
  try {
    logger.debug(`Polling member data for member ${memberId} in faction ${factionId}`);
    
    // Fetch member data via user endpoint
    const userData = await apiClient.getUserData(apiKey, ['profile', 'personalstats', 'crimes']);
    
    if (!userData) {
      throw new Error(`No data returned for member ${memberId}`);
    }
    
    // Process and store the member data
    await dataProcessor.processMemberData(factionId, { [memberId]: userData });
    
    logger.debug(`Successfully polled and processed data for member ${memberId}`);
    return userData;
  } catch (error) {
    logger.error(`Error polling member data for ${memberId}: ${error.message}`);
    throw error;
  }
}

/**
 * Poll war-specific data
 * @param {number} factionId - Faction ID
 * @param {number} warId - War ID to poll
 * @param {string} warType - Type of war ('territory', 'raid', 'ranked')
 * @param {string} apiKey - API key to use
 * @returns {Promise<Object>} War data
 */
async function pollWarData(factionId, warId, warType, apiKey) {
  try {
    logger.debug(`Polling ${warType} war data for war ${warId} of faction ${factionId}`);
    
    // Determine which selection to use based on war type
    let selection;
    switch (warType) {
      case 'territory':
        selection = 'territory_wars';
        break;
      case 'raid':
        selection = 'raid_wars';
        break;
      case 'ranked':
        selection = 'ranked_wars';
        break;
      default:
        throw new Error(`Invalid war type: ${warType}`);
    }
    
    // Fetch faction data with specific war focus
    const factionData = await apiClient.getFactionData(apiKey, factionId, [selection]);
    
    if (!factionData || !factionData[selection]) {
      throw new Error(`No ${warType} war data returned for faction ${factionId}`);
    }
    
    // Process war data
    const specificWarData = factionData[selection][warId] || null;
    if (specificWarData) {
      await warTracker.processSpecificWarData(factionId, warId, warType, specificWarData);
    } else {
      logger.warn(`War ${warId} not found in ${warType}_wars data for faction ${factionId}`);
    }
    
    logger.debug(`Successfully polled and processed ${warType} war data for war ${warId}`);
    return specificWarData;
  } catch (error) {
    logger.error(`Error polling war data for ${warId}: ${error.message}`);
    throw error;
  }
}

module.exports = {
  pollFactionData,
  pollMemberData,
  pollWarData
};
