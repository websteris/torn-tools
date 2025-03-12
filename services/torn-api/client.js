'use strict';

const axios = require('axios');
const NodeCache = require('node-cache');
const logger = require('../../utils/logger');
const RateLimiter = require('./rate-limiter');

/**
 * TornApiClient - A client for interacting with the Torn API
 * Provides caching, rate limiting, and error handling
 */
class TornApiClient {
  /**
   * Constructor for TornApiClient
   * @param {Object} options - Configuration options
   * @param {string} options.apiKey - Torn API key (optional, can be set later)
   * @param {string} options.baseUrl - API base URL (default: https://api.torn.com)
   * @param {number} options.defaultTtl - Default cache TTL in seconds (default: 60)
   * @param {number} options.rateLimit - Maximum requests per minute (default: 100)
   */
  constructor(options = {}) {
    this.apiKey = options.apiKey || null;
    this.baseUrl = options.baseUrl || 'https://api.torn.com';
    this.defaultTtl = options.defaultTtl || 60;
    
    // Initialize cache
    this.cache = new NodeCache({
      stdTTL: this.defaultTtl,
      checkperiod: Math.min(this.defaultTtl * 0.2, 60), // Check expiration every 20% of TTL or 60s max
      useClones: false
    });
    
    // Initialize rate limiter (default: 100 requests per minute)
    this.rateLimiter = new RateLimiter(options.rateLimit || 100, 60 * 1000);
    
    // Create component logger
    this.logger = logger.child({ component: 'TornApiClient' });
    
    this.logger.info('TornApiClient initialized');
  }
  
  /**
   * Set or update the API key
   * @param {string} apiKey - The Torn API key
   */
  setApiKey(apiKey) {
    if (!apiKey) {
      throw new Error('API key is required');
    }
    this.apiKey = apiKey;
    this.logger.info('API key updated');
  }
  
  /**
   * Clear all cached data
   */
  clearCache() {
    this.cache.flushAll();
    this.logger.debug('Cache cleared');
  }
  
  /**
   * Clear specific cache item by key
   * @param {string} key - Cache key to clear
   */
  clearCacheItem(key) {
    this.cache.del(key);
    this.logger.debug(`Cache item cleared: ${key}`);
  }
  
  /**
   * Build a URL for a Torn API request
   * @param {string} section - API section (user, faction, etc.)
   * @param {string|number} id - ID for the request
   * @param {string|array} selections - Data selections to request
   * @returns {string} Full API URL
   * @private
   */
  _buildUrl(section, id = '', selections = '') {
    let selectionsStr = '';
    
    if (Array.isArray(selections)) {
      selectionsStr = selections.join(',');
    } else if (typeof selections === 'string' && selections.length > 0) {
      selectionsStr = selections;
    }
    
    let url = `${this.baseUrl}/${section}/${id}`;
    
    const params = new URLSearchParams();
    if (this.apiKey) {
      params.append('key', this.apiKey);
    }
    if (selectionsStr) {
      params.append('selections', selectionsStr);
    }
    
    return `${url}?${params.toString()}`;
  }
  
  /**
   * Make a request to the Torn API with caching and rate limiting
   * @param {string} section - API section (user, faction, etc.)
   * @param {string|number} id - ID for the request
   * @param {string|array} selections - Data selections to request
   * @param {number} ttl - Cache TTL in seconds (uses default if not specified)
   * @param {boolean} bypassCache - Force a fresh API request
   * @returns {Promise<Object>} API response data
   * @private
   */
  async _makeRequest(section, id = '', selections = '', ttl = this.defaultTtl, bypassCache = false) {
    if (!this.apiKey) {
      throw new Error('API key is required');
    }
    
    // Generate cache key
    const cacheKey = `${section}_${id}_${Array.isArray(selections) ? selections.join(',') : selections}`;
    
    // Check cache first unless bypassing
    if (!bypassCache) {
      const cachedData = this.cache.get(cacheKey);
      if (cachedData) {
        this.logger.debug(`Cache hit for: ${cacheKey}`);
        return cachedData;
      }
    }
    
    try {
      // Apply rate limiting
      await this.rateLimiter.acquire();
      
      const url = this._buildUrl(section, id, selections);
      this.logger.debug(`Making API request: ${url.replace(/key=([^&]{4})([^&]*)/, 'key=$1***')}`);
      
      const response = await axios.get(url);
      const data = response.data;
      
      // Check for API errors
      if (data.error) {
        throw new Error(`API Error: ${data.error.error}`);
      }
      
      // Cache the successful response
      this.cache.set(cacheKey, data, ttl);
      this.logger.debug(`Cached response for: ${cacheKey}`);
      
      return data;
    } catch (error) {
      // Handle axios errors vs API errors
      if (error.response) {
        this.logger.error(`HTTP error: ${error.response.status} - ${error.response.statusText}`);
        throw new Error(`HTTP error: ${error.response.status} - ${error.response.statusText}`);
      } else if (error.request) {
        this.logger.error('Network error: No response received');
        throw new Error('Network error: No response received');
      }
      
      // Re-throw already handled errors
      this.logger.error(`API error: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get user data from the Torn API
   * @param {string|number} userId - User ID to fetch
   * @param {string|array} selections - Data selections to request
   * @param {number} ttl - Cache TTL in seconds
   * @param {boolean} bypassCache - Force a fresh API request
   * @returns {Promise<Object>} User data
   */
  async getUserData(userId, selections = '', ttl = this.defaultTtl, bypassCache = false) {
    this.logger.info(`Getting user data for: ${userId}`);
    return await this._makeRequest('user', userId, selections, ttl, bypassCache);
  }
  
  /**
   * Get faction data from the Torn API
   * @param {string|number} factionId - Faction ID to fetch
   * @param {string|array} selections - Data selections to request
   * @param {number} ttl - Cache TTL in seconds
   * @param {boolean} bypassCache - Force a fresh API request
   * @returns {Promise<Object>} Faction data
   */
  async getFactionData(factionId, selections = '', ttl = this.defaultTtl, bypassCache = false) {
    this.logger.info(`Getting faction data for: ${factionId}`);
    return await this._makeRequest('faction', factionId, selections, ttl, bypassCache);
  }
  
  /**
   * Get war opponents for the current faction
   * @param {string|number} factionId - Faction ID to fetch opponents for
   * @param {number} ttl - Cache TTL in seconds
   * @param {boolean} bypassCache - Force a fresh API request
   * @returns {Promise<Array>} Array of war opponents
   */
  async getWarOpponents(factionId, ttl = 30, bypassCache = false) {
    this.logger.info(`Getting war opponents for faction: ${factionId}`);
    try {
      const data = await this._makeRequest('faction', factionId, 'attacks', ttl, bypassCache);
      
      // Process and format the opponents data
      if (!data.attacks) {
        return [];
      }
      
      // Extract unique opponent factions from attacks
      const opponentMap = new Map();
      
      Object.values(data.attacks).forEach(attack => {
        if (attack.defender_faction && attack.defender_faction !== factionId) {
          if (!opponentMap.has(attack.defender_faction)) {
            opponentMap.set(attack.defender_faction, {
              id: attack.defender_faction,
              name: attack.defender_factionname,
              score: 0
            });
          }
        }
      });
      
      return Array.from(opponentMap.values());
    } catch (error) {
      this.logger.error(`Failed to get war opponents: ${error.message}`);
      // Return empty array instead of throwing to make it easier for consumers
      return [];
    }
  }
  
  /**
   * Get general Torn data from the API
   * @param {string|array} selections - Data selections to request
   * @param {number} ttl - Cache TTL in seconds
   * @param {boolean} bypassCache - Force a fresh API request
   * @returns {Promise<Object>} Torn data
   */
  async getTornData(selections = '', ttl = 3600, bypassCache = false) {
    this.logger.info(`Getting Torn data for selections: ${selections}`);
    return await this._makeRequest('torn', '', selections, ttl, bypassCache);
  }
}

/**
 * Create a rate limiter class for controlling API request frequency
 */
class RateLimiter {
  /**
   * RateLimiter constructor
   * @param {number} limit - Maximum requests allowed in the interval
   * @param {number} interval - Time interval in milliseconds
   */
  constructor(limit, interval) {
    this.limit = limit;
    this.interval = interval;
    this.tokens = limit;
    this.lastRefill = Date.now();
    this.logger = logger.child({ component: 'RateLimiter' });
    this.queue = [];
  }
  
  /**
   * Refill tokens based on time elapsed
   * @private
   */
  _refillTokens() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    
    if (elapsed >= this.interval) {
      // If a full interval has passed, reset to full capacity
      this.tokens = this.limit;
      this.lastRefill = now;
    } else {
      // Otherwise, add proportional number of tokens
      const tokensToAdd = Math.floor((elapsed / this.interval) * this.limit);
      if (tokensToAdd > 0) {
        this.tokens = Math.min(this.limit, this.tokens + tokensToAdd);
        this.lastRefill += Math.floor((tokensToAdd / this.limit) * this.interval);
      }
    }
  }
  
  /**
   * Acquire a token, waiting if necessary
   * @returns {Promise<void>} Resolves when a token is available
   */
  acquire() {
    return new Promise(resolve => {
      this._refillTokens();
      
      if (this.tokens > 0) {
        this.tokens--;
        resolve();
      } else {
        // Calculate wait time until next token is available
        const waitTime = Math.ceil(this.interval / this.limit);
        this.logger.debug(`Rate limit reached, waiting ${waitTime}ms for next token`);
        
        // Queue this request
        this.queue.push(resolve);
        
        // Schedule processing the queue
        setTimeout(() => this._processQueue(), waitTime);
      }
    });
  }
  
  /**
   * Process waiting requests in the queue
   * @private
   */
  _processQueue() {
    this._refillTokens();
    
    // Process as many queued requests as we have tokens for
    while (this.queue.length > 0 && this.tokens > 0) {
      const resolve = this.queue.shift();
      this.tokens--;
      resolve();
    }
    
    // If there are still items in the queue, schedule processing again
    if (this.queue.length > 0) {
      const waitTime = Math.ceil(this.interval / this.limit);
      setTimeout(() => this._processQueue(), waitTime);
    }
  }
}

// Export a singleton instance of TornApiClient
const tornApiClient = new TornApiClient();

// Also export the class for testing and custom instantiation
module.exports = tornApiClient;
module.exports.TornApiClient = TornApiClient;

const axios = require('axios');
const NodeCache = require('node-cache');
const rateLimit = require('axios-rate-limit');
const logger = require('../../utils/logger');

/**
 * TornApiClient - A client for interacting with the Torn API
 * Features:
 * - API key management
 * - Request caching with TTL
 * - Rate limiting
 * - Error handling and retries
 * - Methods for different API endpoints
 */
class TornApiClient {
  /**
   * Create a new TornApiClient
   * @param {Object} config - Configuration options
   * @param {string} [config.apiKey] - Torn API key (can also be set later)
   * @param {string} [config.baseUrl='https://api.torn.com'] - Base URL for the Torn API
   * @param {number} [config.defaultTtl=300] - Default cache TTL in seconds (5 minutes)
   * @param {number} [config.rateLimit=90] - Maximum requests per minute (Torn limit is 100)
   * @param {number} [config.maxRetries=3] - Maximum number of retries for failed requests
   * @param {number} [config.retryDelay=1000] - Delay between retries in milliseconds
   */
  constructor(config = {}) {
    this.apiKey = config.apiKey || null;
    this.baseUrl = config.baseUrl || 'https://api.torn.com';
    this.defaultTtl = config.defaultTtl || 300; // 5 minutes default
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000;
    
    // Initialize cache
    this.cache = new NodeCache({
      stdTTL: this.defaultTtl,
      checkperiod: 60, // Check for expired keys every minute
      useClones: false
    });
    
    // Initialize axios with rate limiting
    this.http = rateLimit(axios.create({
      baseURL: this.baseUrl,
      timeout: 10000
    }), { 
      maxRequests: config.rateLimit || 90, 
      perMilliseconds: 60000 // per minute
    });
    
    this.logger = logger.child({ component: 'TornApiClient' });
    this.logger.info('TornApiClient initialized');
  }
  
  /**
   * Set the API key to use for requests
   * @param {string} apiKey - Torn API key
   */
  setApiKey(apiKey) {
    this.apiKey = apiKey;
    this.logger.info('API key updated');
  }
  
  /**
   * Clear all cached data
   */
  clearCache() {
    this.cache.flushAll();
    this.logger.info('Cache cleared');
  }
  
  /**
   * Clear a specific cache item
   * @param {string} key - Cache key to clear
   */
  clearCacheItem(key) {
    this.cache.del(key);
    this.logger.info(`Cache item cleared: ${key}`);
  }
  
  /**
   * Build a URL for the Torn API
   * @param {string} endpoint - API endpoint (user, faction, etc.)
   * @param {string|number} id - ID for the endpoint
   * @param {string|string[]} selections - Data selections
   * @returns {string} - The constructed URL
   * @private
   */
  _buildUrl(endpoint, id, selections) {
    let selectionsStr = '';
    if (selections) {
      if (Array.isArray(selections)) {
        selectionsStr = selections.join(',');
      } else {
        selectionsStr = selections;
      }
    }
    
    return `/${endpoint}/${id}?selections=${selectionsStr}&key=${this.apiKey}`;
  }
  
  /**
   * Make a request to the Torn API with caching and retry support
   * @param {string} url - API URL to request
   * @param {Object} options - Request options
   * @param {boolean} [options.bypassCache=false] - Whether to bypass the cache
   * @param {number} [options.ttl] - Custom TTL for this request's cache
   * @returns {Promise<Object>} - API response data
   * @private
   */
  async _makeRequest(url, options = {}) {
    const { bypassCache = false, ttl = this.defaultTtl } = options;
    const cacheKey = url;
    
    // Check cache first (unless bypassing)
    if (!bypassCache) {
      const cachedData = this.cache.get(cacheKey);
      if (cachedData) {
        this.logger.debug(`Cache hit for: ${url}`);
        return cachedData;
      }
    }
    
    this.logger.debug(`Making API request: ${url}`);
    
    // Handle retries
    let retries = 0;
    
    while (true) {
      try {
        const response = await this.http.get(url);
        const data = response.data;
        
        // Check for API errors
        if (data.error) {
          throw new Error(`API Error: ${data.error.error}`);
        }
        
        // Cache successful response
        this.cache.set(cacheKey, data, ttl);
        return data;
      } catch (error) {
        // Determine if we should retry
        if (retries < this.maxRetries) {
          retries++;
          this.logger.warn(`Request failed, retrying (${retries}/${this.maxRetries}): ${error.message}`);
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
          continue;
        }
        
        // Max retries reached, throw the error
        this.logger.error(`Request failed after ${this.maxRetries} retries: ${error.message}`);
        throw error;
      }
    }
  }
  
  /**
   * Validate that an API key is set
   * @private
   */
  _validateApiKey() {
    if (!this.apiKey) {
      throw new Error('API key is not set. Call setApiKey() first.');
    }
  }
  
  /**
   * Get user data from the Torn API
   * @param {number|string} userId - User ID (or 'me' for own user)
   * @param {string|string[]} selections - Data selections
   * @param {Object} options - Request options
   * @returns {Promise<Object>} - User data
   */
  async getUserData(userId = 'me', selections = '', options = {}) {
    this._validateApiKey();
    
    const url = this._buildUrl('user', userId, selections);
    return await this._makeRequest(url, options);
  }
  
  /**
   * Get faction data from the Torn API
   * @param {number|string} factionId - Faction ID
   * @param {string|string[]} selections - Data selections
   * @param {Object} options - Request options
   * @returns {Promise<Object>} - Faction data
   */
  async getFactionData(factionId, selections = '', options = {}) {
    this._validateApiKey();
    
    const url = this._buildUrl('faction', factionId, selections);
    return await this._makeRequest(url, options);
  }
  
  /**
   * Get war data and opponents for a faction
   * @param {number|string} factionId - Faction ID
   * @param {Object} options - Request options
   * @returns {Promise<Array>} - War opponents data
   */
  async getWarOpponents(factionId, options = {}) {
    this._validateApiKey();
    
    try {
      const data = await this.getFactionData(factionId, 'wars', options);
      
      if (!data || !data.wars) {
        return [];
      }
      
      const opponents = Object.values(data.wars)
        .filter(war => war.status === 'active')
        .map(war => ({
          id: war.opponent_id,
          name: war.opponent_name,
          score: war.opponent_score
        }));
      
      return opponents;
    } catch (error) {
      this.logger.error(`Error getting war opponents: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get torn data from the Torn API
   * @param {string|string[]} selections - Data selections
   * @param {Object} options - Request options
   * @returns {Promise<Object>} - Torn data
   */
  async getTornData(selections = '', options = {}) {
    this._validateApiKey();
    
    const url = this._buildUrl('torn', '', selections);
    return await this._makeRequest(url, options);
  }
  
  /**
   * Get property data from the Torn API
   * @param {number} propertyId - Property ID
   * @param {string|string[]} selections - Data selections
   * @param {Object} options - Request options
   * @returns {Promise<Object>} - Property data
   */
  async getPropertyData(propertyId, selections = '', options = {}) {
    this._validateApiKey();
    
    const url = this._buildUrl('property', propertyId, selections);
    return await this._makeRequest(url, options);
  }
  
  /**
   * Get company data from the Torn API
   * @param {number} companyId - Company ID
   * @param {string|string[]} selections - Data selections
   * @param {Object} options - Request options
   * @returns {Promise<Object>} - Company data
   */
  async getCompanyData(companyId, selections = '', options = {}) {
    this._validateApiKey();
    
    const url = this._buildUrl('company', companyId, selections);
    return await this._makeRequest(url, options);
  }
  
  /**
   * Get market data from the Torn API
   * @param {number} itemId - Item ID
   * @param {string|string[]} selections - Data selections
   * @param {Object} options - Request options
   * @returns {Promise<Object>} - Market data
   */
  async getMarketData(itemId, selections = '', options = {}) {
    this._validateApiKey();
    
    const url = this._buildUrl('market', itemId, selections);
    return await this._makeRequest(url, options);
  }
}

module.exports = TornApiClient;

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
const fetch = require('node-fetch');

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

// Get API key from environment or config
const getApiKey = () => {
  try {
    const config = require('../../config/test-config');
    return config.apiKeys.test;
  } catch (error) {
    return process.env.TORN_API_KEY || 'mock-api-key-for-tests';
  }
};

/**
 * Get user data from Torn API
 * @param {string} [apiKey] - Optional API key, will use default if not provided
 * @param {Array<string>} [selections] - Optional selections to request
 * @returns {Promise<Object>} User data
 */
async function getUserData(apiKey = getApiKey(), selections = []) {
  const selectionsParam = selections.length > 0 ? `&selections=${selections.join(',')}` : '';
  const url = `https://api.torn.com/user/?key=${apiKey}${selectionsParam}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  // Check for API errors
  if (data.error) {
    throw new Error(`API Error: ${data.error.error}`);
  }
  
  return data;
}

/**
 * Get war opponents from Torn API
 * @param {string} [apiKey] - Optional API key, will use default if not provided
 * @returns {Promise<Array>} War opponents
 */
async function getWarOpponents(apiKey = getApiKey()) {
  const url = `https://api.torn.com/faction/?key=${apiKey}&selections=rankedwars`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  // Check for API errors
  if (data.error) {
    throw new Error(`API Error: ${data.error.error}`);
  }
  
  // Process the response to extract war opponents
  // This is a simplified version for testing
  return data.ranked_wars ? Object.values(data.ranked_wars) : [];
}

module.exports = {
  getUserData,
  getWarOpponents
};
