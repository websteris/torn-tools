/**
 * @module AuthService
 * @description Authentication service for managing users and sessions
 */

const crypto = require('crypto');
const userModel = require('../../db/models/user');
const apiKeyModel = require('../../db/models/api-key');
const TornApiClient = require('../torn-api/client');
const { logger } = require('../../utils/logger');

class AuthService {
  constructor() {
    this.apiClient = new TornApiClient();
  }

  /**
   * Register a new user using their Torn API key
   * @param {Object} userData - User registration data
   * @param {string} userData.apiKey - Torn API key
   * @param {string} [userData.keyName] - Optional name for the API key
   * @returns {Promise<Object>} Registered user data and session token
   */
  async registerWithApiKey(userData) {
    const { apiKey, keyName = 'Primary API Key' } = userData;

    if (!apiKey) {
      throw new Error('API key is required');
    }

    try {
      // Verify API key by fetching user data from Torn API
      logger.info('Verifying API key with Torn API');
      const tornUserData = await this.apiClient.getUserData(apiKey, ['profile', 'personalstats']);
      
      if (!tornUserData || !tornUserData.player_id) {
        throw new Error('Invalid API key or unable to fetch user data from Torn API');
      }

      // Extract relevant user data
      const tornUserId = tornUserData.player_id;
      const tornUserName = tornUserData.name;
      const faction = tornUserData.faction || {};
      const tornFactionId = faction.faction_id;
      const tornFactionName = faction.faction_name;

      // Check if user already exists
      const existingUser = await userModel.findByTornId(tornUserId);
      
      if (existingUser) {
        logger.info(`User with Torn ID ${tornUserId} already exists`);
        
        // Update user information if needed
        if (
          existingUser.username !== tornUserName ||
          existingUser.faction_id !== tornFactionId ||
          existingUser.faction_name !== tornFactionName
        ) {
          await userModel.update(existingUser.id, {
            username: tornUserName,
            faction_id: tornFactionId,
            faction_name: tornFactionName
          });
        }
        
        // Generate a session token
        const sessionToken = this._generateSessionToken();
        
        return {
          user: {
            id: existingUser.id,
            username: tornUserName,
            torn_id: tornUserId,
            faction_id: tornFactionId,
            faction_name: tornFactionName
          },
          sessionToken
        };
      }

      // Create a new user
      logger.info(`Creating new user for Torn ID ${tornUserId}`);
      const password = crypto.randomBytes(16).toString('hex'); // Generate a random password
      
      const newUser = await userModel.create({
        username: tornUserName,
        password,
        torn_id: tornUserId,
        faction_id: tornFactionId,
        faction_name: tornFactionName
      });

      // Store the API key
      await apiKeyModel.create({
        user_id: newUser.id,
        key_name: keyName,
        key_value: apiKey,
        encrypted: true,
        active: true
      });

      // Generate a session token
      const sessionToken = this._generateSessionToken();
      
      return {
        user: {
          id: newUser.id,
          username: newUser.username,
          torn_id: tornUserId,
          faction_id: tornFactionId,
          faction_name: tornFactionName
        },
        sessionToken
      };
    } catch (error) {
      logger.error(`Error registering user with API key: ${error.message}`);
      throw error;
    }
  }

  /**
   * Authenticate a user using their Torn API key
   * @param {string} apiKey - Torn API key
   * @returns {Promise<Object>} User data and session token
   */
  async authenticateWithApiKey(apiKey) {
    if (!apiKey) {
      throw new Error('API key is required');
    }

    try {
      // Verify API key by fetching user data from Torn API
      logger.info('Verifying API key with Torn API');
      const tornUserData = await this.apiClient.getUserData(apiKey, ['profile']);
      
      if (!tornUserData || !tornUserData.player_id) {
        throw new Error('Invalid API key or unable to fetch user data from Torn API');
      }

      // Find user by Torn ID
      const tornUserId = tornUserData.player_id;
      const user = await userModel.findByTornId(tornUserId);
      
      if (!user) {
        logger.info(`User with Torn ID ${tornUserId} not found`);
        throw new Error('User not registered. Please register first.');
      }

      // Generate a session token
      const sessionToken = this._generateSessionToken();
      
      return {
        user: {
          id: user.id,
          username: user.username,
          torn_id: user.torn_id,
          faction_id: user.faction_id,
          faction_name: user.faction_name
        },
        sessionToken
      };
    } catch (error) {
      logger.error(`Error authenticating with API key: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate a session token
   * @param {string} token - Session token
   * @returns {Promise<boolean>} True if token is valid
   */
  async validateSession(token) {
    // In a real implementation, you would validate the token against
    // a database of active sessions. This is a placeholder.
    return true;
  }

  /**
   * Generate a new session token
   * @private
   * @returns {string} Session token
   */
  _generateSessionToken() {
    return crypto.randomBytes(32).toString('hex');
  }
}

module.exports = new AuthService();
