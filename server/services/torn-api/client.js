/**
 * @module TornApiClient
 * @description Client for interacting with Torn API with rate limiting, caching, and error handling
 */

// Dependencies
const axios = require('axios');
const NodeCache = require('node-cache');
const { promisify } = require('util');
const { logger } = require('../../utils/logger');
const config = require('../../config/api-config');

/**
 * TornApiClient class to handle all API interactions with rate limiting and caching
 */
class TornApiClient {
  /**
   * Create a new TornApiClient
   * @param {Object} options - Configuration options
   * @param {string} options.baseUrl - Base URL for Torn API
   * @param {number} options.defaultTtl - Default cache TTL in seconds
   * @param {number} options.rateLimit - Maximum requests per minute
   * @param {number} options.timeout - Request timeout in milliseconds
   */
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || config.tornApi.baseUrl || 'https://api.torn.com';
    this.cache = new NodeCache({ 
      stdTTL: options.defaultTtl || config.tornApi.cacheTtl || 60,
      checkperiod: 120
    });
    
    // Rate limiting configuration
    this.rateLimit = options.rateLimit || config.tornApi.rateLimit || 100; // Default 100 requests per minute
    this.rateLimitWindow = 60 * 1000; // 1 minute in milliseconds
    this.requestTimestamps = [];
    
    // Set up axios instance with defaults
    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: options.timeout || config.tornApi.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // Setup response interceptor for error handling
    this.http.interceptors.response.use(
      response => response,
      error => this._handleApiError(error)
    );
  }

  /**
   * Make a request to the Torn API
   * @param {Object} options - Request options
   * @param {string} options.endpoint - API endpoint
   * @param {string} options.apiKey - Torn API key
   * @param {string} options.section - API section (user, faction, etc.)
   * @param {string|number} options.id - ID for the request
   * @param {Object} options.selections - Selections to request
   * @param {boolean} options.bypassCache - Whether to bypass cache
   * @param {number} options.cacheTtl - Cache TTL for this request
   * @returns {Promise<Object>} API response data
   * @throws {Error} If API request fails
   */
  async request(options) {
    const {
      endpoint = '',
      apiKey,
      section,
      id = '',
      selections = [],
      bypassCache = false,
      cacheTtl
    } = options;

    if (!apiKey) {
      throw new Error('API key is required');
    }

    if (!section) {
      throw new Error('Section is required');
    }

    // Build request URL
    const url = this._buildUrl(section, id, selections);
    const cacheKey = this._getCacheKey(url, apiKey);

    // Check cache first unless bypass is requested
    if (!bypassCache) {
      const cachedData = this.cache.get(cacheKey);
      if (cachedData) {
        logger.debug(`Cache hit for ${url}`);
        return cachedData;
      }
    }

    // Check rate limits before making request
    await this._checkRateLimit();

    try {
      logger.debug(`Making request to ${url}`);
      
      // Track request timestamp for rate limiting
      this.requestTimestamps.push(Date.now());
      
      // Make the actual request
      const response = await this.http.get(url, {
        params: {
          key: apiKey,
          comment: 'TornDashboard'
        }
      });

      // Cache successful responses
      if (response.data && !response.data.error) {
        this.cache.set(
          cacheKey, 
          response.data, 
          cacheTtl || this.cache.options.stdTTL
        );
      }

      return response.data;
    } catch (error) {
      // All errors should be handled by the interceptor, but just in case
      if (!error.isHandled) {
        logger.error(`Unhandled API error: ${error.message}`);
        throw new Error(`API request failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Clear all cached data
   */
  clearCache() {
    this.cache.flushAll();
    logger.info('API cache cleared');
  }

  /**
   * Clear specific cached item
   * @param {string} section - API section
   * @param {string|number} id - ID for the request
   * @param {Array<string>} selections - Selections requested
   * @param {string} apiKey - API key used
   */
  clearCacheItem(section, id, selections, apiKey) {
    const url = this._buildUrl(section, id, selections);
    const cacheKey = this._getCacheKey(url, apiKey);
    this.cache.del(cacheKey);
    logger.debug(`Cache cleared for ${url}`);
  }

  /**
   * Build a URL for the API request
   * @private
   * @param {string} section - API section
   * @param {string|number} id - ID for the request
   * @param {Array<string>} selections - Selections to include
   * @returns {string} Formatted URL
   */
  _buildUrl(section, id, selections = []) {
    let url = `/${section}/${id}`;
    
    if (selections && selections.length > 0) {
      url += `?selections=${selections.join(',')}`;
    }
    
    return url;
  }

  /**
   * Generate a cache key for a request
   * @private
   * @param {string} url - Request URL
   * @param {string} apiKey - API key
   * @returns {string} Cache key
   */
  _getCacheKey(url, apiKey) {
    // Include part of the API key in the cache key to separate caches by user
    // but don't include the full key for security reasons
    const apiKeyPrefix = apiKey.substring(0, 8);
    return `${apiKeyPrefix}:${url}`;
  }

  /**
   * Check if we're within rate limits and delay if necessary
   * @private
   * @returns {Promise<void>}
   */
  async _checkRateLimit() {
    const now = Date.now();
    
    // Remove timestamps older than our window
    this.requestTimestamps = this.requestTimestamps.filter(
      timestamp => now - timestamp < this.rateLimitWindow
    );
    
    // If we've hit the rate limit, delay the request
    if (this.requestTimestamps.length >= this.rateLimit) {
      const oldestTimestamp = this.requestTimestamps[0];
      const timeToWait = this.rateLimitWindow - (now - oldestTimestamp);
      
      logger.warn(`Rate limit approached, delaying request by ${timeToWait}ms`);
      
      // Wait until we can make another request
      if (timeToWait > 0) {
        await new Promise(resolve => setTimeout(resolve, timeToWait + 100)); // Add buffer
      }
    }
  }

  /**
   * Handle API errors with specific error types
   * @private
   * @param {Error} error - Axios error
   * @returns {Promise<never>} - Rejected promise with typed error
   */
  _handleApiError(error) {
    // Mark error as handled to prevent double-handling
    error.isHandled = true;

    // Handle Axios request errors
    if (error.request && !error.response) {
      logger.error(`Network error: ${error.message}`);
      const networkError = new Error('Network error, please check your connection');
      networkError.code = 'NETWORK_ERROR';
      networkError.originalError = error;
      networkError.isHandled = true;
      return Promise.reject(networkError);
    }

    // Handle Torn API specific errors
    if (error.response && error.response.data && error.response.data.error) {
      const tornError = new Error(error.response.data.error.error);
      tornError.code = error.response.data.error.code;
      tornError.isHandled = true;
      
      // Log different levels based on error type
      if (tornError.code === 5) {
        // Too many requests - rate limit error
        logger.warn(`Torn API rate limit hit: ${tornError.message}`);
      } else if (tornError.code === 2) {
        // Incorrect key
        logger.error(`Invalid API key: ${tornError.message}`);
      } else {
        logger.error(`Torn API error ${tornError.code}: ${tornError.message}`);
      }
      
      return Promise.reject(tornError);
    }

    // Handle HTTP errors
    if (error.response) {
      const statusError = new Error(`HTTP Error: ${error.response.status} ${error.response.statusText}`);
      statusError.status = error.response.status;
      statusError.isHandled = true;
      logger.error(`HTTP error ${error.response.status}: ${error.response.statusText}`);
      return Promise.reject(statusError);
    }
    
    // Handle any other errors
    logger.error(`Unexpected API error: ${error.message}`);
    return Promise.reject(error);
  }

  /**
   * Helper to make user-related requests
   * @param {string} apiKey - Torn API key
   * @param {Array<string>} selections - Data selections
   * @param {Object} options - Additional request options
   * @returns {Promise<Object>} User data
   */
  async getUserData(apiKey, selections = [], options = {}) {
    return this.request({
      section: 'user',
      apiKey,
      selections,
      ...options
    });
  }

  /**
   * Helper to make faction-related requests
   * @param {string} apiKey - Torn API key
   * @param {string|number} factionId - Faction ID (optional)
   * @param {Array<string>} selections - Data selections
   * @param {Object} options - Additional request options
   * @returns {Promise<Object>} Faction data
   */
  async getFactionData(apiKey, factionId = '', selections = [], options = {}) {
    return this.request({
      section: 'faction',
      id: factionId,
      apiKey,
      selections,
      ...options
    });
  }

  /**
   * Helper to make torn-related requests (global data)
   * @param {string} apiKey - Torn API key
   * @param {Array<string>} selections - Data selections
   * @param {Object} options - Additional request options
   * @returns {Promise<Object>} Torn data
   */
  async getTornData(apiKey, selections = [], options = {}) {
    return this.request({
      section: 'torn',
      apiKey,
      selections,
      ...options
    });
  }
}

module.exports = TornApiClient;
