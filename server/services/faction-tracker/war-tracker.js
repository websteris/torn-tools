/**
 * @module WarTracker
 * @description Tracks war data between factions
 */

const { logger } = require('../../utils/logger');
const { getConnection } = require('../../db/schema');

/**
 * Process war data from faction data
 * @param {number} factionId - Faction ID
 * @param {Object} factionData - Faction data containing war info
 * @returns {Promise<void>}
 */
async function processWarData(factionId, factionData) {
  try {
    logger.debug(`Processing war data for faction ${factionId}`);
    
    const now = new Date().toISOString();
    
    if (factionData.territory_wars && Object.keys(factionData.territory_wars).length > 0) {
      for (const [warId, warData] of Object.entries(factionData.territory_wars)) {
        await processSpecificWarData(factionId, warId, 'territory', warData, now);
      }
    }
    
    if (factionData.raid_wars && Object.keys(factionData.raid_wars).length > 0) {
      for (const [warId, warData] of Object.entries(factionData.raid_wars)) {
        await processSpecificWarData(factionId, warId, 'raid', warData, now);
      }
    }
    
    if (factionData.ranked_wars && Object.keys(factionData.ranked_wars).length > 0) {
      for (const [warId, warData] of Object.entries(factionData.ranked_wars)) {
        await processSpecificWarData(factionId, warId, 'ranked', warData, now);
      }
    }
    
    logger.debug(`Successfully processed war data for faction ${factionId}`);
  } catch (error) {
    logger.error(`Error processing war data for faction ${factionId}: ${error.message}`);
  }
}

/**
 * Process specific war data
 * @param {number} factionId - Faction ID
 * @param {number|string} warId - War ID
 * @param {string} warType - Type of war ('territory', 'raid', 'ranked')
 * @param {Object} warData - War data
 * @param {string} [timestamp] - Timestamp for the data
 * @returns {Promise<void>}
 */
async function processSpecificWarData(factionId, warId, warType, warData, timestamp = null) {
  try {
    if (!warData) return;
    
    const now = timestamp || new Date().toISOString();
    
    const warRecord = {
      war_id: warId,
      faction_id: factionId,
      war_type: warType,
      timestamp: now
    };
    
    if (warType === 'ranked') {
      const warDetails = warData.war || {};
      const factions = warData.factions || {};
      
      warRecord.start_time = warDetails.start || 0;
      warRecord.end_time = warDetails.end || 0;
      warRecord.target = warDetails.target || 0;
      warRecord.winner = warDetails.winner || 0;
      
      await storeWarData(warRecord);
      
      for (const [rivalFactionId, factionData] of Object.entries(factions)) {
        await storeWarFactionData(warId, rivalFactionId, {
          war_id: warId,
          faction_id: rivalFactionId,
          name: factionData.name,
          score: factionData.score,
          chain: factionData.chain,
          timestamp: now
        });
      }
    } else if (warType === 'territory' || warType === 'raid') {
      warRecord.defending = warData.defending || false;
      warRecord.assaulting = warData.assaulting || false;
      warRecord.score = warData.score || 0;
      warRecord.start_time = warData.start || 0;
      warRecord.end_time = warData.end || 0;
      warRecord.territory = warData.territory || '';
      
      if (warType === 'territory') {
        warRecord.assaulting_faction = warData.assaulting_faction || 0;
        warRecord.defending_faction = warData.defending_faction || 0;
        warRecord.winner = warData.winner || 0;
      }
      
      if (warType === 'raid') {
        warRecord.raiding_faction = warData.raiding_faction || 0;
        warRecord.defending_faction = warData.defending_faction || 0;
      }
      
      await storeWarData(warRecord);
    }
  } catch (error) {
    logger.error(`Error processing specific war data for war ${warId}: ${error.message}`);
  }
}

/**
 * Store war data in database
 * @param {Object} warData - Processed war data
 * @returns {Promise<void>}
 */
async function storeWarData(warData) {
  try {
    const db = getConnection();
    
    return new Promise((resolve, reject) => {
      const fields = Object.keys(warData);
      const placeholders = fields.map(() => '?').join(', ');
      const values = fields.map(field => warData[field]);
      
      const query = `
        INSERT OR REPLACE INTO faction_wars 
        (${fields.join(', ')})
        VALUES (${placeholders})
      `;
      
      db.run(query, values, function(err) {
        db.close();
        if (err) {
          logger.error(`Error storing war data: ${err.message}`);
          reject(err);
          return;
        }
        resolve();
      });
    });
  } catch (error) {
    logger.error(`Error in storeWarData: ${error.message}`);
  }
}

/**
 * Store war faction data in database
 * @param {number|string} warId - War ID
 * @param {number} factionId - Faction ID
 * @param {Object} factionData - Processed faction data for the war
 * @returns {Promise<void>}
 */
async function storeWarFactionData(warId, factionId, factionData) {
  try {
    const db = getConnection();
    
    return new Promise((resolve, reject) => {
      const fields = Object.keys(factionData);
      const placeholders = fields.map(() => '?').join(', ');
      const values = fields.map(field => factionData[field]);
      
      const query = `
        INSERT OR REPLACE INTO faction_war_factions 
        (${fields.join(', ')})
        VALUES (${placeholders})
      `;
      
      db.run(query, values, function(err) {
        db.close();
        if (err) {
          logger.error(`Error storing war faction data: ${err.message}`);
          reject(err);
          return;
        }
        resolve();
      });
    });
  } catch (error) {
    logger.error(`Error in storeWarFactionData: ${error.message}`);
  }
}

/**
 * Get active wars for a faction
 * @param {number} factionId - Faction ID
 * @returns {Promise<Array<Object>>} Active wars
 */
async function getActiveWars(factionId) {
  try {
    const db = getConnection();

    return new Promise((resolve, reject) => {
      db.all(`
        SELECT * FROM faction_wars
        WHERE (faction_id = ? OR assaulting_faction = ? OR defending_faction = ? OR raiding_faction = ?)
        AND (end_time = 0 OR end_time > ?)
        ORDER BY start_time DESC
      `, [factionId, factionId, factionId, factionId, Math.floor(Date.now() / 1000)], (err, rows) => {
        db.close();
        if (err) {
          logger.error(`Error getting active wars: ${err.message}`);
          reject(err);
          return;
        }
        resolve(rows || []);
      });
    });
  } catch (error) {
    logger.error(`Error in getActiveWars: ${error.message}`);
    return [];
  }
}

/**
 * Get war history for a faction
 * @param {number} factionId - Faction ID
 * @param {number} [limit=10] - Maximum number of wars to return
 * @returns {Promise<Array<Object>>} War history
 */
async function getWarHistory(factionId, limit = 10) {
  try {
    const db = getConnection();
    
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT * FROM faction_wars 
        WHERE (faction_id = ? OR assaulting_faction = ? OR defending_faction = ? OR raiding_faction = ?)
        ORDER BY start_time DESC
        LIMIT ?
      `, [factionId, factionId, factionId, factionId, limit], (err, rows) => {
        db.close();
        if (err) {
          logger.error(`Error getting war history: ${err.message}`);
          reject(err);
          return;
        }
        resolve(rows || []);
      });
    });
  } catch (error) {
    logger.error(`Error in getWarHistory: ${error.message}`);
    return [];
  }
}

/**
 * Get detailed information for a specific war
 * @param {number|string} warId - War ID
 * @param {string} warType - Type of war ('territory', 'raid', 'ranked')
 * @returns {Promise<Object|null>} War details
 */
async function getWarDetails(warId, warType) {
  try {
    const db = getConnection();
    
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT * FROM faction_wars 
        WHERE war_id = ? AND war_type = ?
      `, [warId, warType], async (err, warRow) => {
        if (err) {
          db.close();
          logger.error(`Error getting war details: ${err.message}`);
          reject(err);
          return;
        }
        
        if (!warRow) {
          db.close();
          resolve(null);
          return;
        }
        
        if (warType === 'ranked') {
          db.all(`
            SELECT * FROM faction_war_factions
            WHERE war_id = ?
          `, [warId], (err, factionsRows) => {
            db.close();
            if (err) {
              logger.error(`Error getting war faction details: ${err.message}`);
              reject(err);
              return;
            }
            warRow.factions = factionsRows || [];
            resolve(warRow);
          });
        } else {
          db.close();
          resolve(warRow);
        }
      });
    });
  } catch (error) {
    logger.error(`Error in getWarDetails: ${error.message}`);
    return null;
  }
}

async function getWarOpponents(factionId) {
  try {
    logger.debug(`Getting war opponents for faction ${factionId}`);
    const activeWars = await getActiveWars(factionId);
    const opponents = [];

    for (const war of activeWars) {
      let opponentId = null;
      let opponentName = null;
      let warType = war.war_type;
      let userScore = null;
      let opponentScore = null;

      if (warType === 'territory') {
        if (parseInt(war.defending_faction) === parseInt(factionId)) {
          opponentId = war.assaulting_faction;
          userScore = war.score;
        } else if (parseInt(war.assaulting_faction) === parseInt(factionId)) {
          opponentId = war.defending_faction;
          userScore = war.score;
        }
      } else if (warType === 'raid') {
        if (parseInt(war.defending_faction) === parseInt(factionId)) {
          opponentId = war.raiding_faction;
          userScore = war.score;
        } else if (parseInt(war.raiding_faction) === parseInt(factionId)) {
          opponentId = war.defending_faction;
          userScore = war.score;
        }
      } else if (warType === 'ranked') {
        const warDetails = await getWarDetails(war.war_id, warType);
        if (warDetails && warDetails.factions) {
          const factions = Array.isArray(warDetails.factions)
            ? warDetails.factions
            : Object.values(warDetails.factions); // Handle object or array
          for (const factionData of factions) {
            const factionIdNum = parseInt(factionData.faction_id || factionData.id); // Flexible key
            if (factionIdNum === parseInt(factionId)) {
              userScore = factionData.score;
            } else {
              opponentId = factionIdNum;
              opponentName = factionData.name;
              opponentScore = factionData.score;
            }
          }
        }
      }

      if (opponentId) {
        opponents.push({
          war_id: war.war_id,
          opponent_id: opponentId,
          opponent_name: opponentName || null,
          war_type: warType,
          start_time: war.start_time || 0,
          end_time: war.end_time || 0,
          user_score: userScore || 0,
          opponent_score: opponentScore || null,
          target: war.target || null,
          winner: war.winner || null
        });
      }
    }

    logger.debug(`Found ${opponents.length} war opponents for faction ${factionId}`);
    return opponents;
  } catch (error) {
    logger.error(`Error getting war opponents for faction ${factionId}: ${error.message}`);
    return [];
  }
}

module.exports = {
  processWarData,
  processSpecificWarData,
  getActiveWars,
  getWarHistory,
  getWarDetails,
  getWarOpponents
};
