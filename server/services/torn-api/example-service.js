/**
 * @module ApiExampleService
 * @description Example service showing how to use the Torn API client
 */

const TornApiClient = require('./client');
const { logger } = require('../../utils/logger');
const apiConfig = require('../../config/api-config');

// Create instance of logger for this component
const componentLogger = logger.child({ component: 'ApiExampleService' });

/**
 * Example service that demonstrates using the Torn API client
 */
class ApiExampleService {
  constructor() {
    // Initialize API client with configuration
    this.apiClient = new TornApiClient({
      baseUrl: apiConfig.tornApi.baseUrl,
      rateLimit: apiConfig.tornApi.rateLimit,
      defaultTtl: apiConfig.tornApi.cacheTtl
    });
  }

  /**
   * Fetch user profile and stats
   * @param {string} apiKey - User's API key
   * @returns {Promise<Object>} User profile data
   */
  async getUserProfile(apiKey) {
    try {
      componentLogger.info('Fetching user profile');
      const userData = await this.apiClient.getUserData(apiKey, ['profile', 'personalstats']);
      
      // Process and return only what's needed
      return {
        userId: userData.player_id,
        name: userData.name,
        level: userData.level,
        status: userData.status,
        faction: userData.faction,
        stats: userData.personalstats || {}
      };
    } catch (error) {
      componentLogger.error(`Error fetching user profile: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check user's current status (online, offline, etc.)
   * @param {string} apiKey - User's API key
   * @returns {Promise<Object>} User status information
   */
  async getUserStatus(apiKey) {
    try {
      componentLogger.info('Checking user status');
      // For status checks, we want real-time data
      const userData = await this.apiClient.getUserData(apiKey, ['profile'], { bypassCache: true });
      
      return {
        status: userData.status,
        lastAction: userData.last_action
      };
    } catch (error) {
      componentLogger.error(`Error checking user status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user's cooldowns
   * @param {string} apiKey - User's API key
   * @returns {Promise<Object>} Cooldown information
   */
  async getUserCooldowns(apiKey) {
    try {
      componentLogger.info('Fetching user cooldowns');
      // Cooldowns should have a short cache time
      const userData = await this.apiClient.getUserData(apiKey, ['cooldowns'], { cacheTtl: 15 });
      
      return userData.cooldowns || {};
    } catch (error) {
      componentLogger.error(`Error fetching cooldowns: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user's travel information
   * @param {string} apiKey - User's API key
   * @returns {Promise<Object>} Travel information
   */
  async getTravelInfo(apiKey) {
    try {
      componentLogger.info('Fetching travel information');
      const userData = await this.apiClient.getUserData(apiKey, ['travel']);
      
      return userData.travel || {};
    } catch (error) {
      componentLogger.error(`Error fetching travel info: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get basic faction info
   * @param {string} apiKey - User's API key
   * @param {string|number} factionId - Faction ID (optional)
   * @returns {Promise<Object>} Faction information
   */
  async getFactionInfo(apiKey, factionId = '') {
    try {
      componentLogger.info(`Fetching faction info for ID: ${factionId || 'user faction'}`);
      const factionData = await this.apiClient.getFactionData(apiKey, factionId, ['basic']);
      
      return {
        factionId: factionData.ID,
        name: factionData.name,
        tag: factionData.tag,
        leader: factionData.leader,
        respect: factionData.respect,
        age: factionData.age,
        capacity: factionData.capacity,
        memberCount: factionData.members ? Object.keys(factionData.members).length : 0
      };
    } catch (error) {
      componentLogger.error(`Error fetching faction info: ${error.message}`);
      throw error;
    }
  }

  /**
   * Example of handling multiple requests efficiently
   * @param {string} apiKey - User's API key
   * @returns {Promise<Object>} Combined dashboard data
   */
  async getDashboardData(apiKey) {
    try {
      componentLogger.info('Fetching dashboard data');
      
      // Make parallel requests for efficiency
      const [profile, cooldowns, travel] = await Promise.all([
        this.getUserProfile(apiKey),
        this.getUserCooldowns(apiKey),
        this.getTravelInfo(apiKey)
      ]);
      
      // Fetch faction info only if user is in a faction
      let faction = null;
      if (profile && profile.faction && profile.faction.faction_id) {
        faction = await this.getFactionInfo(apiKey, profile.faction.faction_id);
      }
      
      return {
        profile,
        cooldowns,
        travel,
        faction
      };
    } catch (error) {
      componentLogger.error(`Error building dashboard data: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle API errors consistently
   * @param {Error} error - The caught error
   * @returns {Object} Standardized error response
   */
  handleApiError(error) {
    let errorResponse = {
      success: false,
      error: 'Unknown error occurred'
    };
    
    if (error.code === 2) {
      // Invalid API key
      errorResponse = {
        success: false,
        error: 'Invalid API key',
        errorCode: 'INVALID_KEY'
      };
    } else if (error.code === 5) {
      // Rate limited
      errorResponse = {
        success: false,
        error: 'Rate limited. Please try again in a moment.',
        errorCode: 'RATE_LIMITED'
      };
    } else if (error.code === 'NETWORK_ERROR') {
      // Network issues
      errorResponse = {
        success: false,
        error: 'Network error. Please check your connection.',
        errorCode: 'NETWORK_ERROR'
      };
    } else {
      // Generic error with original message
      errorResponse = {
        success: false,
        error: error.message || 'Unknown error occurred',
        errorCode: error.code || 'UNKNOWN_ERROR'
      };
    }
    
    return errorResponse;
  }
}

module.exports = ApiExampleService;
