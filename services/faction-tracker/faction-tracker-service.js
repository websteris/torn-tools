/**
 * @module FactionTrackerService
 * @description Coordinates tracking of faction data
 */

const { logger } = require('../../utils/logger');
const factionPoller = require('./faction-poller');
const apiKeyManager = require('./api-key-manager');
const { getConnection } = require('../../db/schema');

class FactionTrackerService {
  constructor() {
    // Map of tracked factions: { factionId: { interval, lastPoll, users: [userId1, userId2] } }
    this.trackedFactions = new Map();
    
    // Default polling interval in milliseconds
    this.defaultPollingInterval = 20 * 1000; // 20 seconds
    
    // Is the service running
    this.isRunning = false;
  }

  /**
   * Start the faction tracker service
   */
  start() {
    if (this.isRunning) {
      logger.info('Faction tracker service is already running');
      return;
    }
    
    logger.info('Starting faction tracker service');
    this.isRunning = true;
    
    // Load active tracking configurations from database
    this._loadTrackedFactions();
    
    // Start tracking interval check
    this._startIntervalCheck();
  }

  /**
   * Stop the faction tracker service
   */
  stop() {
    if (!this.isRunning) {
      logger.info('Faction tracker service is not running');
      return;
    }
    
    logger.info('Stopping faction tracker service');
    
    // Clear check interval
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    // Stop all faction polling
    for (const [factionId, trackedFaction] of this.trackedFactions.entries()) {
      if (trackedFaction.interval) {
        clearInterval(trackedFaction.interval);
        trackedFaction.interval = null;
      }
    }
    
    this.isRunning = false;
  }

  /**
   * Start tracking a faction
   * @param {Object} options - Tracking options
   * @param {number} options.factionId - Faction ID to track
   * @param {number} options.userId - User ID requesting tracking
   * @param {number} [options.targetFactionId] - Target faction ID (war opponent)
   * @param {number} [options.pollingInterval] - Custom polling interval
   * @returns {Promise<boolean>} Success status
   */
  async trackFaction(options) {
    const { factionId, userId, targetFactionId, pollingInterval } = options;
    
    if (!factionId || !userId) {
      logger.error('Faction ID and User ID are required for tracking');
      return false;
    }
    
    try {
      // Get the API key for this user
      const apiKey = await apiKeyManager.getApiKeyForUser(userId);
      
      if (!apiKey) {
        logger.error(`No valid API key found for user ${userId}`);
        return false;
      }
      
      // Check if faction is already being tracked
      if (this.trackedFactions.has(factionId)) {
        const trackedFaction = this.trackedFactions.get(factionId);
        
        // Add user to tracking list if not already there
        if (!trackedFaction.users.includes(userId)) {
          trackedFaction.users.push(userId);
          
          // Save to database
          await this._saveTrackedFaction(factionId, trackedFaction);
        }
        
        // If target faction specified, add/update it
        if (targetFactionId && targetFactionId !== trackedFaction.targetFactionId) {
          trackedFaction.targetFactionId = targetFactionId;
          
          // Save to database
          await this._saveTrackedFaction(factionId, trackedFaction);
          
          // Start tracking target faction if not already tracked
          await this._trackTargetFaction(targetFactionId, userId);
        }
        
        return true;
      }
      
      // Create new tracking entry
      const interval = pollingInterval || this.defaultPollingInterval;
      const newTrackedFaction = {
        pollingInterval: interval,
        lastPoll: 0,
        users: [userId],
        targetFactionId: targetFactionId || null,
        interval: null
      };
      
      // Add to tracking map
      this.trackedFactions.set(factionId, newTrackedFaction);
      
      // Save to database
      await this._saveTrackedFaction(factionId, newTrackedFaction);
      
      // Start polling this faction
      this._startPollingFaction(factionId);
      
      // If target faction specified, track it too
      if (targetFactionId) {
        await this._trackTargetFaction(targetFactionId, userId);
      }
      
      return true;
    } catch (error) {
      logger.error(`Error tracking faction ${factionId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Stop tracking a faction for a user
   * @param {Object} options - Options
   * @param {number} options.factionId - Faction ID
   * @param {number} options.userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  async stopTracking(options) {
    const { factionId, userId } = options;
    
    if (!factionId || !userId) {
      logger.error('Faction ID and User ID are required to stop tracking');
      return false;
    }
    
    try {
      // Check if faction is being tracked
      if (!this.trackedFactions.has(factionId)) {
        return true; // Already not tracking
      }
      
      const trackedFaction = this.trackedFactions.get(factionId);
      
      // Remove user from tracking list
      const userIndex = trackedFaction.users.indexOf(userId);
      if (userIndex !== -1) {
        trackedFaction.users.splice(userIndex, 1);
      }
      
      // If no users left, stop tracking
      if (trackedFaction.users.length === 0) {
        if (trackedFaction.interval) {
          clearInterval(trackedFaction.interval);
        }
        
        this.trackedFactions.delete(factionId);
        
        // Remove from database
        await this._removeTrackedFaction(factionId);
      } else {
        // Update in database
        await this._saveTrackedFaction(factionId, trackedFaction);
      }
      
      return true;
    } catch (error) {
      logger.error(`Error stopping faction tracking ${factionId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Get all currently tracked factions
   * @returns {Array<Object>} Tracked factions info
   */
  getTrackedFactions() {
    const trackedFactions = [];
    
    for (const [factionId, trackedFaction] of this.trackedFactions.entries()) {
      trackedFactions.push({
        factionId,
        targetFactionId: trackedFaction.targetFactionId,
        userCount: trackedFaction.users.length,
        pollingInterval: trackedFaction.pollingInterval,
        lastPoll: trackedFaction.lastPoll
      });
    }
    
    return trackedFactions;
  }

  /**
   * Load tracked factions from database
   * @private
   */
  async _loadTrackedFactions() {
    try {
      const db = getConnection();
      
      return new Promise((resolve, reject) => {
        db.all(`
          SELECT * FROM faction_tracking
        `, [], async (err, rows) => {
          db.close();
          
          if (err) {
            logger.error(`Error loading tracked factions: ${err.message}`);
            reject(err);
            return;
          }
          
          // Clear existing tracking
          this.trackedFactions.clear();
          
          // Process each tracked faction
          for (const row of rows) {
            try {
              const factionId = row.faction_id;
              const users = JSON.parse(row.users || '[]');
              
              if (users.length === 0) {
                // Skip if no users
                continue;
              }
              
              this.trackedFactions.set(factionId, {
                pollingInterval: row.polling_interval || this.defaultPollingInterval,
                lastPoll: row.last_poll || 0,
                users,
                targetFactionId: row.target_faction_id || null,
                interval: null
              });
            } catch (error) {
              logger.error(`Error processing tracked faction: ${error.message}`);
              // Continue with next faction
            }
          }
          
          // Start polling for each faction
          for (const factionId of this.trackedFactions.keys()) {
            this._startPollingFaction(factionId);
          }
          
          logger.info(`Loaded ${this.trackedFactions.size} tracked factions`);
          resolve();
        });
      });
    } catch (error) {
      logger.error(`Error in _loadTrackedFactions: ${error.message}`);
    }
  }

  /**
   * Save tracked faction to database
   * @param {number} factionId - Faction ID
   * @param {Object} trackedFaction - Tracked faction data
   * @private
   */
  async _saveTrackedFaction(factionId, trackedFaction) {
    try {
      const db = getConnection();
      
      return new Promise((resolve, reject) => {
        db.run(`
          INSERT OR REPLACE INTO faction_tracking 
          (faction_id, target_faction_id, users, polling_interval, last_poll)
          VALUES (?, ?, ?, ?, ?)
        `, [
          factionId,
          trackedFaction.targetFactionId,
          JSON.stringify(trackedFaction.users),
          trackedFaction.pollingInterval,
          trackedFaction.lastPoll
        ], function(err) {
          db.close();
          
          if (err) {
            logger.error(`Error saving tracked faction: ${err.message}`);
            reject(err);
            return;
          }
          
          resolve();
        });
      });
    } catch (error) {
      logger.error(`Error in _saveTrackedFaction: ${error.message}`);
    }
  }

  /**
   * Remove tracked faction from database
   * @param {number} factionId - Faction ID
   * @private
   */
  async _removeTrackedFaction(factionId) {
    try {
      const db = getConnection();
      
      return new Promise((resolve, reject) => {
        db.run(`
          DELETE FROM faction_tracking 
          WHERE faction_id = ?
        `, [factionId], function(err) {
          db.close();
          
          if (err) {
            logger.error(`Error removing tracked faction: ${err.message}`);
            reject(err);
            return;
          }
          
          resolve();
        });
      });
    } catch (error) {
      logger.error(`Error in _removeTrackedFaction: ${error.message}`);
    }
  }

  /**
   * Start interval check for tracked factions
   * @private
   */
  _startIntervalCheck() {
    // Check every minute for changes in tracked factions
    this.checkInterval = setInterval(() => {
      this._checkTrackedFactions();
    }, 60 * 1000);
  }

  /**
   * Check tracked factions for changes
   * @private
   */
  async _checkTrackedFactions() {
    try {
      // Reload tracked factions from database to pick up changes
      await this._loadTrackedFactions();
    } catch (error) {
      logger.error(`Error checking tracked factions: ${error.message}`);
    }
  }

  /**
   * Start polling a specific faction
   * @param {number} factionId - Faction ID to poll
   * @private
   */
  _startPollingFaction(factionId) {
    const trackedFaction = this.trackedFactions.get(factionId);
    
    if (!trackedFaction) {
      return;
    }
    
    // Clear existing interval if any
    if (trackedFaction.interval) {
      clearInterval(trackedFaction.interval);
    }
    
    // Start new polling interval
    trackedFaction.interval = setInterval(async () => {
      await this._pollFaction(factionId);
    }, trackedFaction.pollingInterval);
    
    // Poll immediately
    this._pollFaction(factionId);
  }

  /**
   * Poll faction data
   * @param {number} factionId - Faction ID to poll
   * @private
   */
  async _pollFaction(factionId) {
    try {
      const trackedFaction = this.trackedFactions.get(factionId);
      
      if (!trackedFaction || trackedFaction.users.length === 0) {
        return;
      }
      
      // Get an API key from one of the tracking users
      const apiKey = await apiKeyManager.getApiKeyForUsers(trackedFaction.users);
      
      if (!apiKey) {
        logger.error(`No valid API key found for faction ${factionId}`);
        return;
      }
      
      // Poll faction data
      const factionData = await factionPoller.pollFactionData(factionId, apiKey);
      
      // Update last poll time
      trackedFaction.lastPoll = Date.now();
      await this._saveTrackedFaction(factionId, trackedFaction);
      
      // If we have a target faction, poll that too
      if (trackedFaction.targetFactionId) {
        // Use a different API key if possible to distribute load
        const otherApiKey = await apiKeyManager.getApiKeyForUsers(
          trackedFaction.users, 
          [apiKey] // exclude the key we just used
        );
        
        if (otherApiKey) {
          await factionPoller.pollFactionData(trackedFaction.targetFactionId, otherApiKey);
        }
      }
      
      return factionData;
    } catch (error) {
      logger.error(`Error polling faction ${factionId}: ${error.message}`);
    }
  }

  /**
   * Track a target faction (war opponent)
   * @param {number} targetFactionId - Target faction ID
   * @param {number} userId - User ID requesting tracking
   * @private
   */
  async _trackTargetFaction(targetFactionId, userId) {
    // If target faction is already being tracked, we don't need to do anything
    if (this.trackedFactions.has(targetFactionId)) {
      return;
    }
    
    // Start tracking target faction with same user
    await this.trackFaction({
      factionId: targetFactionId,
      userId
    });
  }
}

module.exports = new FactionTrackerService();
