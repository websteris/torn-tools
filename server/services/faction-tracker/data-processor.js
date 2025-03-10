/**
 * @module DataProcessor
 * @description Processes and stores faction data
 */

const { logger } = require('../../utils/logger');
const { getConnection } = require('../../db/schema');

/**
 * Process and store faction data
 * @param {number} factionId - Faction ID
 * @param {Object} factionData - Faction data from API
 * @returns {Promise<void>}
 */
async function processFactionData(factionId, factionData) {
  try {
    logger.debug(`Processing faction data for faction ${factionId}`);
    
    if (!factionData || !factionData.ID) {
      logger.warn(`Invalid faction data for faction ${factionId}`);
      return;
    }
    
    const now = new Date().toISOString();
    
    // Extract basic faction data
    const factionBasicData = {
      id: factionData.ID,
      name: factionData.name,
      tag: factionData.tag,
      tag_image: factionData.tag_image,
      leader: factionData.leader,
      co_leader: factionData['co-leader'],
      respect: factionData.respect,
      age: factionData.age,
      capacity: factionData.capacity,
      best_chain: factionData.best_chain,
      timestamp: now
    };
    
    // Store in database
    await storeFactionData(factionId, factionBasicData);
    
    // Process and store rank data if available
    if (factionData.rank) {
      await processRankData(factionId, factionData.rank);
    }
    
    logger.debug(`Successfully processed faction data for faction ${factionId}`);
  } catch (error) {
    logger.error(`Error processing faction data for ${factionId}: ${error.message}`);
    throw error;
  }
}

/**
 * Process and store member data
 * @param {number} factionId - Faction ID
 * @param {Object} membersData - Members data from API
 * @returns {Promise<void>}
 */
async function processMemberData(factionId, membersData) {
  try {
    logger.debug(`Processing ${Object.keys(membersData).length} members for faction ${factionId}`);
    
    if (!membersData || Object.keys(membersData).length === 0) {
      logger.warn(`No member data for faction ${factionId}`);
      return;
    }
    
    const now = new Date().toISOString();
    
    // Process each member
    for (const [memberId, memberData] of Object.entries(membersData)) {
      try {
        if (!memberData) continue;
        
        // Extract member data
        const memberRecord = {
          id: memberId,
          faction_id: factionId,
          name: memberData.name,
          level: memberData.level,
          days_in_faction: memberData.days_in_faction,
          position: memberData.position,
          last_action_status: memberData.last_action?.status,
          last_action_timestamp: memberData.last_action?.timestamp,
          last_action_relative: memberData.last_action?.relative,
          status_state: memberData.status?.state,
          status_description: memberData.status?.description,
          status_details: memberData.status?.details,
          status_color: memberData.status?.color,
          status_until: memberData.status?.until,
          timestamp: now
        };
        
        // Store in database
        await storeMemberData(factionId, memberId, memberRecord);
      } catch (error) {
        logger.error(`Error processing member ${memberId}: ${error.message}`);
        // Continue with next member
      }
    }
    
    logger.debug(`Successfully processed members for faction ${factionId}`);
  } catch (error) {
    logger.error(`Error processing member data for faction ${factionId}: ${error.message}`);
    throw error;
  }
}

/**
 * Process rank data for a faction
 * @param {number} factionId - Faction ID
 * @param {Object} rankData - Rank data from API
 * @returns {Promise<void>}
 */
async function processRankData(factionId, rankData) {
  try {
    if (!rankData) {
      return;
    }
    
    const now = new Date().toISOString();
    
    // Extract rank data
    const rankRecord = {
      faction_id: factionId,
      level: rankData.level,
      name: rankData.name,
      division: rankData.division,
      position: rankData.position,
      wins: rankData.wins,
      timestamp: now
    };
    
    // Store in database
    await storeRankData(factionId, rankRecord);
  } catch (error) {
    logger.error(`Error processing rank data for faction ${factionId}: ${error.message}`);
  }
}

/**
 * Store faction data in database
 * @param {number} factionId - Faction ID
 * @param {Object} factionData - Processed faction data
 * @returns {Promise<void>}
 */
async function storeFactionData(factionId, factionData) {
  try {
    const db = getConnection();
    
    return new Promise((resolve, reject) => {
      db.run(`
        INSERT OR REPLACE INTO faction_data 
        (faction_id, name, tag, tag_image, leader, co_leader, respect, age, capacity, best_chain, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        factionData.id,
        factionData.name,
        factionData.tag,
        factionData.tag_image,
        factionData.leader,
        factionData.co_leader,
        factionData.respect,
        factionData.age,
        factionData.capacity,
        factionData.best_chain,
        factionData.timestamp
      ], function(err) {
        db.close();
        
        if (err) {
          logger.error(`Error storing faction data: ${err.message}`);
          reject(err);
          return;
        }
        
        resolve();
      });
    });
  } catch (error) {
    logger.error(`Error in storeFactionData: ${error.message}`);
  }
}

/**
 * Store member data in database
 * @param {number} factionId - Faction ID
 * @param {number} memberId - Member ID
 * @param {Object} memberData - Processed member data
 * @returns {Promise<void>}
 */
async function storeMemberData(factionId, memberId, memberData) {
  try {
    const db = getConnection();
    
    return new Promise((resolve, reject) => {
      db.run(`
        INSERT OR REPLACE INTO faction_members 
        (member_id, faction_id, name, level, days_in_faction, position, 
         last_action_status, last_action_timestamp, last_action_relative,
         status_state, status_description, status_details, status_color, status_until,
         timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        memberData.id,
        memberData.faction_id,
        memberData.name,
        memberData.level,
        memberData.days_in_faction,
        memberData.position,
        memberData.last_action_status,
        memberData.last_action_timestamp,
        memberData.last_action_relative,
        memberData.status_state,
        memberData.status_description,
        memberData.status_details,
        memberData.status_color,
        memberData.status_until,
        memberData.timestamp
      ], function(err) {
        db.close();
        
        if (err) {
          logger.error(`Error storing member data: ${err.message}`);
          reject(err);
          return;
        }
        
        resolve();
      });
    });
  } catch (error) {
    logger.error(`Error in storeMemberData: ${error.message}`);
  }
}

/**
 * Store rank data in database
 * @param {number} factionId - Faction ID
 * @param {Object} rankData - Processed rank data
 * @returns {Promise<void>}
 */
async function storeRankData(factionId, rankData) {
  try {
    const db = getConnection();
    
    return new Promise((resolve, reject) => {
      db.run(`
        INSERT OR REPLACE INTO faction_ranks 
        (faction_id, level, name, division, position, wins, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        rankData.faction_id,
        rankData.level,
        rankData.name,
        rankData.division,
        rankData.position,
        rankData.wins,
        rankData.timestamp
      ], function(err) {
        db.close();
        
        if (err) {
          logger.error(`Error storing rank data: ${err.message}`);
          reject(err);
          return;
        }
        
        resolve();
      });
    });
  } catch (error) {
    logger.error(`Error in storeRankData: ${error.message}`);
  }
}

/**
 * Get the latest faction data
 * @param {number} factionId - Faction ID
 * @returns {Promise<Object|null>} Latest faction data or null
 */
async function getLatestFactionData(factionId) {
  try {
    const db = getConnection();
    
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT * FROM faction_data 
        WHERE faction_id = ?
        ORDER BY timestamp DESC
        LIMIT 1
      `, [factionId], (err, row) => {
        db.close();
        
        if (err) {
          logger.error(`Error getting latest faction data: ${err.message}`);
          reject(err);
          return;
        }
        
        resolve(row || null);
      });
    });
  } catch (error) {
    logger.error(`Error in getLatestFactionData: ${error.message}`);
    return null;
  }
}

/**
 * Get the latest members data for a faction
 * @param {number} factionId - Faction ID
 * @returns {Promise<Array<Object>>} Latest member data
 */
async function getLatestMembersData(factionId) {
  try {
    const db = getConnection();
    
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT fm.* 
        FROM faction_members fm
        INNER JOIN (
          SELECT member_id, MAX(timestamp) as max_timestamp
          FROM faction_members
          WHERE faction_id = ?
          GROUP BY member_id
        ) latest ON fm.member_id = latest.member_id AND fm.timestamp = latest.max_timestamp
        WHERE fm.faction_id = ?
      `, [factionId, factionId], (err, rows) => {
        db.close();
        
        if (err) {
          logger.error(`Error getting latest members data: ${err.message}`);
          reject(err);
          return;
        }
        
        resolve(rows || []);
      });
    });
  } catch (error) {
    logger.error(`Error in getLatestMembersData: ${error.message}`);
    return [];
  }
}

module.exports = {
  processFactionData,
  processMemberData,
  processRankData,
  getLatestFactionData,
  getLatestMembersData
};
