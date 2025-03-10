/**
 * Get all factions currently at war with the specified faction
 * @param {number} factionId - Faction ID to check
 * @returns {Promise<Array<Object>>} Array of enemy factions and war details
 */
async function getWarOpponents(factionId) {
  try {
    logger.debug(`Getting war opponents for faction ${factionId}`);
    
    // Get all active wars
    const activeWars = await getActiveWars(factionId);
    
    // Extract opponent information from wars
    const opponents = [];
    
    for (const war of activeWars) {
      let opponentId = null;
      let opponentName = null;
      let warType = war.war_type;
      let userScore = null;
      let opponentScore = null;
      
      // Determine opponent based on war type and which side the faction is on
      if (war.war_type === 'territory') {
        if (war.defending_faction === parseInt(factionId)) {
          opponentId = war.assaulting_faction;
          userScore = war.score;
        } else if (war.assaulting_faction === parseInt(factionId)) {
          opponentId = war.defending_faction;
          userScore = war.score;
        }
      } else if (war.war_type === 'raid') {
        if (war.defending_faction === parseInt(factionId)) {
          opponentId = war.raiding_faction;
          userScore = war.score;
        } else if (war.raiding_faction === parseInt(factionId)) {
          opponentId = war.defending_faction;
          userScore = war.score;
        }
      } else if (war.war_type === 'ranked') {
        // For ranked wars, we need to get the faction details
        const warDetails = await getWarDetails(war.war_id, warType);
        
        if (warDetails && warDetails.factions) {
          for (const factionKey in warDetails.factions) {
            const factionData = warDetails.factions[factionKey];
            const factionIdNum = parseInt(factionKey);
            
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
          opponent_name: opponentName,
          war_type: warType,
          start_time: war.start_time,
          end_time: war.end_time,
          user_score: userScore,
          opponent_score: opponentScore,
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
  getWarOpponents // Add this new function
};
