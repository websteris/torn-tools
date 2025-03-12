/**
 * @module ApiConfig
 * @description Configuration for API interactions
 */

const config = {
  /**
   * Torn API configuration
   */
  tornApi: {
    /**
     * Base URL for Torn API
     */
    baseUrl: 'https://api.torn.com',
    
    /**
     * Default cache TTL in seconds
     * 60 seconds is a good default for most data
     */
    cacheTtl: 60,
    
    /**
     * Cache TTLs for specific endpoints (in seconds)
     */
    cacheTtlBySection: {
      // Static data can be cached longer
      'items': 3600, // 1 hour
      'torn': 1800,  // 30 minutes
      
      // User data should be refreshed more frequently
      'user': {
        'cooldowns': 15,      // 15 seconds
        'bars': 15,           // 15 seconds
        'travel': 30,         // 30 seconds
        'profile': 300,       // 5 minutes
        'inventory': 120      // 2 minutes
      },
      
      // Faction data
      'faction': {
        'basic': 300,         // 5 minutes
        'crimes': 120,        // 2 minutes
        'currency': 120,      // 2 minutes
        'members': 300        // 5 minutes
      }
    },
    
    /**
     * Maximum requests per minute
     * Torn API has a limit of 100 requests per minute per key
     * We set to 95 to have a small buffer
     */
    rateLimit: 100,
    
    /**
     * Request timeout in milliseconds
     */
    timeout: 10000,
    
    /**
     * Default selections to fetch when none specified
     */
    defaultSelections: {
      user: ['profile', 'bars', 'cooldowns'],
      faction: ['basic'],
      torn: ['stats']
    },
    
    /**
     * Error codes from Torn API for reference
     */
    errorCodes: {
      0: 'Unknown error',
      1: 'Key is empty',
      2: 'Incorrect key',
      3: 'Wrong type',
      4: 'Wrong fields',
      5: 'Too many requests',
      6: 'Incorrect ID',
      7: 'Incorrect ID-entity relation',
      8: 'IP block',
      9: 'API disabled',
      10: 'Key owner is in federal jail',
      11: 'Key change error',
      12: 'Key read error'
    }
  }
};

module.exports = config;
