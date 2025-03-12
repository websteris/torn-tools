/**
 * Cache Manager for Torn API Client
 * 
 * Handles caching of API responses with TTL and provides
 * methods for cache invalidation and management.
 */

const NodeCache = require('node-cache');

class CacheManager {
  /**
   * Create a new cache manager
   * 
   * @param {Object} options - Cache options
   * @param {number} [options.defaultTTL=300] - Default TTL in seconds
   * @param {boolean} [options.checkperiod=60] - Period in seconds to check for expired keys
   * @param {boolean} [options.useClones=false] - Whether to clone objects stored in cache
   */
  constructor(options = {}) {
    this.defaultTTL = options.defaultTTL || 300; // 5 minutes default
    
    this.cache = new NodeCache({
      stdTTL: this.defaultTTL,
      checkperiod: options.checkperiod || 60,
      useClones: options.useClones !== undefined ? options.useClones : false
    });
  }

  /**
   * Generate a cache key from components
   * 
   * @param {string} endpoint - API endpoint
   * @param {string|number} id - Resource ID
   * @param {Array} [selections] - Data selections
   * @returns {string} Unique cache key
   */
  generateKey(endpoint, id, selections = []) {
    const selectionsStr = selections.length ? `:${selections.sort().join(',')}` : '';
    return `${endpoint}:${id}${selectionsStr}`;
  }

  /**
   * Store data in cache
   * 
   * @param {string} key - Cache key
   * @param {*} data - Data to cache
   * @param {number} [ttl] - Custom TTL in seconds
   * @returns {boolean} Success status
   */
  set(key, data, ttl) {
    return this.cache.set(key, data, ttl || this.defaultTTL);
  }

  /**
   * Retrieve data from cache
   * 
   * @param {string} key - Cache key
   * @returns {*} Cached data or undefined if not found
   */
  get(key) {
    return this.cache.get(key);
  }

  /**
   * Check if key exists in cache
   * 
   * @param {string} key - Cache key
   * @returns {boolean} True if key exists
   */
  has(key) {
    return this.cache.has(key);
  }

  /**
   * Delete specific cache entry
   * 
   * @param {string} key - Cache key
   * @returns {number} Number of deleted entries
   */
  del(key) {
    return this.cache.del(key);
  }

  /**
   * Delete multiple cache entries by pattern
   * 
   * @param {string} pattern - Key pattern (e.g. 'user:*')
   * @returns {number} Number of deleted entries
   */
  delByPattern(pattern) {
    const regex = new RegExp(pattern.replace('*', '.*'));
    const keys = this.cache.keys().filter(key => regex.test(key));
    return keys.length ? this.cache.del(keys) : 0;
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.flushAll();
  }

  /**
   * Get cache statistics
   * 
   * @returns {Object} Cache stats
   */
  getStats() {
    return this.cache.getStats();
  }

  /**
   * Get all cached keys
   * 
   * @returns {string[]} Array of keys
   */
  getKeys() {
    return this.cache.keys();
  }
}

module.exports = CacheManager;

