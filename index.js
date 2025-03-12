/**
 * Torn API Client
 * 
 * Main client class that integrates all the components:
 * - Request handling
 * - Caching
 * - Error handling
 * - API endpoints
 */

const CacheManager = require('./cache-manager');
const RequestHandler = require('./request-handler');
const Endpoints = require('./endpoints');
const { TornApiError, handleError } = require('./error-handler');

class TornApiClient {
  /**
   * Create a new Torn API client instance
   * 
   * @param {Object} options - Configuration options
   * @param {string} options.apiKey - Torn API key
   * @param {string} [options.baseUrl='https://api.torn.com'] - API base URL
   * @param {number} [options.defaultTTL=300] - Default cache TTL in seconds
   * @param {number} [options.maxRetries=3] - Maximum number of retry attempts
   * @param {number} [options.timeout=10000] - Request timeout in milliseconds
   * @param {number} [options.rateLimit=100] - Rate limit per minute
   */
  constructor(options = {}) {
    if (!options.apiKey) {
      throw new TornApiError('API key is required');
    }

    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl || 'https://api.torn.com';
    this.defaultTTL = options.defaultTTL || 300; // 5 minutes default
    
    // Initialize components
    this.cache = new CacheManager({
      defaultTTL: this.defaultTTL
    });
    
    this.requestHandler = new RequestHandler({
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      maxRetries: options.maxRetries || 3,
      timeout: options.timeout || 10000,
      rateLimit: options.rateLimit || 100
    });
    
    this.endpoints = new Endpoints(this.requestHandler, this.cache);
  }

  /**
   * Get user data from the API
   * 
   * @param {Object} options - Request options
   * @param {number|string} options.userId - User ID or 'me' for current user
   * @param {string[]} [options.selections] - Data selections
   * @param {boolean} [options.bypassCache=false] - Bypass cache
   * @returns {Promise<Object>} User data
   */
  async getUserData(options) {
    try {
      return await this.endpoints.user(options);
    } catch (error) {
      throw handleError(error);
    }
  }

  /**
   * Get faction data from the API
   * 
   * @param {Object} options - Request options 
   * @param {number|string} options.factionId - Faction ID or 'me' for user's faction
   * @param {string[]} [options.selections] - Data selections
   * @param {boolean} [options.bypassCache=false] - Bypass cache
   * @returns {Promise<Object>} Faction data
   */
  async getFactionData(options) {
    try {
      return await this.endpoints.faction(options);
    } catch (error) {
      throw handleError(error);
    }
  }

  /**
   * Get war opponents data
   * 
   * @param {Object} options - Request options
   * @param {number|string} [options.factionId='me'] - Faction ID or 'me'
   * @param {boolean} [options.bypassCache=false] - Bypass cache
   * @returns {Promise<Array>} War opponents
   */
  async getWarOpponents(options = {}) {
    try {
      const factionId = options.factionId || 'me';
      const data = await this.endpoints.faction({
        factionId,
        selections: ['basic', 'war'],
        bypassCache: options.bypassCache || false
      });
      
      if (!data.wars) {
        return [];
      }
      
      return Object.values(data.wars)
        .filter(war => war.opponent && war.status === 'active')
        .map(war => ({
          id: war.opponent,
          name: war.opponent_name || 'Unknown Faction',
          score: war.score || 0
        }));
    } catch (error) {
      throw handleError(error);
    }
  }

  /**
   * Get torn data from the API
   * 
   * @param {Object} options - Request options
   * @param {string[]} [options.selections] - Data selections
   * @param {boolean} [options.bypassCache=false] - Bypass cache
   * @returns {Promise<Object>} Torn data
   */
  async getTornData(options = {}) {
    try {
      return await this.endpoints.torn(options);
    } catch (error) {
      throw handleError(error);
    }
  }

  /**
   * Clear all cache entries
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Clear specific cache entry
   * 
   * @param {string} key - Cache key
   */
  clearCacheItem(key) {
    this.cache.del(key);
  }
}

// Export both the class and a factory function
module.exports = TornApiClient;
module.exports.createClient = (options) => new TornApiClient(options);

// Export individual functions for backward compatibility
module.exports.getUserData = async (apiKey, userId, selections, bypassCache) => {
  const client = new TornApiClient({ apiKey });
  return client.getUserData({ userId, selections, bypassCache });
};

module.exports.getFactionData = async (apiKey, factionId, selections, bypassCache) => {
  const client = new TornApiClient({ apiKey });
  return client.getFactionData({ factionId, selections, bypassCache });
};

module.exports.getWarOpponents = async (apiKey, factionId, bypassCache) => {
  const client = new TornApiClient({ apiKey });
  return client.getWarOpponents({ factionId, bypassCache });
};

module.exports.getTornData = async (apiKey, selections, bypassCache) => {
  const client = new TornApiClient({ apiKey });
  return client.getTornData({ selections, bypassCache });
};

