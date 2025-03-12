/**
 * endpoints.js
 * Defines all Torn API endpoints, their parameters, and response handling
 */

const logger = require('../../utils/logger');
const { TornAPIError } = require('./error-handler');

/**
 * Endpoint parameter validation
 */
const validateParams = {
  /**
   * Validate user ID parameter
   * @param {string|number} id - User ID to validate
   * @returns {number} - Validated user ID
   * @throws {Error} - If ID is invalid
   */
  userId: (id) => {
    const userId = parseInt(id);
    if (isNaN(userId) || userId <= 0) {
      throw new Error('Invalid user ID format');
    }
    return userId;
  },

  /**
   * Validate faction ID parameter
   * @param {string|number} id - Faction ID to validate
   * @returns {number} - Validated faction ID
   * @throws {Error} - If ID is invalid
   */
  factionId: (id) => {
    const factionId = parseInt(id);
    if (isNaN(factionId) || factionId <= 0) {
      throw new Error('Invalid faction ID format');
    }
    return factionId;
  },

  /**
   * Validate company ID parameter
   * @param {string|number} id - Company ID to validate
   * @returns {number} - Validated company ID
   * @throws {Error} - If ID is invalid
   */
  companyId: (id) => {
    const companyId = parseInt(id);
    if (isNaN(companyId) || companyId <= 0) {
      throw new Error('Invalid company ID format');
    }
    return companyId;
  },

  /**
   * Validate item ID parameter
   * @param {string|number} id - Item ID to validate
   * @returns {number} - Validated item ID
   * @throws {Error} - If ID is invalid
   */
  itemId: (id) => {
    const itemId = parseInt(id);
    if (isNaN(itemId) || itemId <= 0) {
      throw new Error('Invalid item ID format');
    }
    return itemId;
  },

  /**
   * Validate timestamp
   * @param {string|number} timestamp - Timestamp to validate
   * @returns {number} - Validated timestamp
   * @throws {Error} - If timestamp is invalid
   */
  timestamp: (timestamp) => {
    const ts = parseInt(timestamp);
    if (isNaN(ts) || ts < 0) {
      throw new Error('Invalid timestamp format');
    }
    return ts;
  },

  /**
   * Validate selections parameter (comma-separated fields)
   * @param {string|array} selections - API selections to validate
   * @returns {string} - Validated selections string
   */
  selections: (selections) => {
    if (Array.isArray(selections)) {
      return selections.join(',');
    }
    return selections || '';
  }
};

/**
 * User-related endpoints
 */
const userEndpoints = {
  /**
   * Get user profile data
   * @param {Object} params - Request parameters
   * @param {string|number} [params.id=] - User ID (defaults to API key's user)
   * @param {string|array} [params.selections] - Data fields to return
   * @returns {Object} - Endpoint configuration
   */
  profile: (params = {}) => {
    const id = params.id ? validateParams.userId(params.id) : '';
    const selections = validateParams.selections(params.selections);
    
    return {
      section: 'user',
      id: id,
      selections: selections,
      ttl: 60, // Cache for 1 minute
      parseResponse: (data) => {
        if (data.error) {
          throw new TornAPIError(data.error);
        }
        return data;
      }
    };
  },
  
  /**
   * Get user's inventory
   * @param {Object} params - Request parameters
   * @param {string|number} [params.id=] - User ID (defaults to API key's user)
   * @param {string|array} [params.selections] - Data fields to return
   * @returns {Object} - Endpoint configuration
   */
  inventory: (params = {}) => {
    const id = params.id ? validateParams.userId(params.id) : '';
    const selections = 'inventory' + (params.selections ? `,${validateParams.selections(params.selections)}` : '');
    
    return {
      section: 'user',
      id: id,
      selections: selections,
      ttl: 300, // Cache for 5 minutes
      parseResponse: (data) => {
        if (data.error) {
          throw new TornAPIError(data.error);
        }
        return data.inventory || [];
      }
    };
  },
  
  /**
   * Get user's attacks history
   * @param {Object} params - Request parameters
   * @param {string|number} [params.id=] - User ID (defaults to API key's user)
   * @param {number} [params.from] - Start timestamp
   * @param {number} [params.to] - End timestamp
   * @returns {Object} - Endpoint configuration
   */
  attacks: (params = {}) => {
    const id = params.id ? validateParams.userId(params.id) : '';
    const selections = 'attacks';
    let queryParams = {};
    
    if (params.from) {
      queryParams.from = validateParams.timestamp(params.from);
    }
    
    if (params.to) {
      queryParams.to = validateParams.timestamp(params.to);
    }
    
    return {
      section: 'user',
      id: id,
      selections: selections,
      queryParams: queryParams,
      ttl: 300, // Cache for 5 minutes
      parseResponse: (data) => {
        if (data.error) {
          throw new TornAPIError(data.error);
        }
        return data.attacks || {};
      }
    };
  },
  
  /**
   * Get user's money and points balances
   * @param {Object} params - Request parameters
   * @param {string|number} [params.id=] - User ID (defaults to API key's user)
   * @returns {Object} - Endpoint configuration
   */
  money: (params = {}) => {
    const id = params.id ? validateParams.userId(params.id) : '';
    const selections = 'money,points';
    
    return {
      section: 'user',
      id: id,
      selections: selections,
      ttl: 60, // Cache for 1 minute
      parseResponse: (data) => {
        if (data.error) {
          throw new TornAPIError(data.error);
        }
        return {
          money: data.money || 0,
          points: data.points || 0
        };
      }
    };
  },
  
  /**
   * Get user's notifications
   * @returns {Object} - Endpoint configuration
   */
  notifications: () => {
    return {
      section: 'user',
      selections: 'notifications',
      ttl: 30, // Cache for 30 seconds
      parseResponse: (data) => {
        if (data.error) {
          throw new TornAPIError(data.error);
        }
        return data.notifications || {};
      }
    };
  },
  
  /**
   * Get user's events
   * @param {Object} params - Request parameters
   * @param {number} [params.from] - Start timestamp
   * @param {number} [params.to] - End timestamp
   * @returns {Object} - Endpoint configuration
   */
  events: (params = {}) => {
    const selections = 'events';
    let queryParams = {};
    
    if (params.from) {
      queryParams.from = validateParams.timestamp(params.from);
    }
    
    if (params.to) {
      queryParams.to = validateParams.timestamp(params.to);
    }
    
    return {
      section: 'user',
      selections: selections,
      queryParams: queryParams,
      ttl: 60, // Cache for 1 minute
      parseResponse: (data) => {
        if (data.error) {
          throw new TornAPIError(data.error);
        }
        return data.events || [];
      }
    };
  }
};

/**
 * Faction-related endpoints
 */
const factionEndpoints = {
  /**
   * Get basic faction data
   * @param {Object} params - Request parameters
   * @param {string|number} params.id - Faction ID
   * @param {string|array} [params.selections] - Data fields to return
   * @returns {Object} - Endpoint configuration
   */
  basic: (params = {}) => {
    const id = validateParams.factionId(params.id);
    const selections = validateParams.selections(params.selections);
    
    return {
      section: 'faction',
      id: id,
      selections: selections,
      ttl: 300, // Cache for 5 minutes
      parseResponse: (data) => {
        if (data.error) {
          throw new TornAPIError(data.error);
        }
        return data;
      }
    };
  },
  
  /**
   * Get faction's attacks history
   * @param {Object} params - Request parameters
   * @param {string|number} params.id - Faction ID
   * @param {number} [params.from] - Start timestamp
   * @param {number} [params.to] - End timestamp
   * @returns {Object} - Endpoint configuration
   */
  attacks: (params = {}) => {
    const id = validateParams.factionId(params.id);
    const selections = 'attacks';
    let queryParams = {};
    
    if (params.from) {
      queryParams.from = validateParams.timestamp(params.from);
    }
    
    if (params.to) {
      queryParams.to = validateParams.timestamp(params.to);
    }
    
    return {
      section: 'faction',
      id: id,
      selections: selections,
      queryParams: queryParams,
      ttl: 300, // Cache for 5 minutes
      parseResponse: (data) => {
        if (data.error) {
          throw new TornAPIError(data.error);
        }
        return data.attacks || {};
      }
    };
  },
  
  /**
   * Get faction's chain information
   * @param {Object} params - Request parameters
   * @param {string|number} params.id - Faction ID
   * @returns {Object} - Endpoint configuration
   */
  chain: (params = {}) => {
    const id = validateParams.factionId(params.id);
    const selections = 'chain';
    
    return {
      section: 'faction',
      id: id,
      selections: selections,
      ttl: 60, // Cache for 1 minute
      parseResponse: (data) => {
        if (data.error) {
          throw new TornAPIError(data.error);
        }
        return data.chain || {};
      }
    };
  },
  
  /**
   * Get faction's members
   * @param {Object} params - Request parameters
   * @param {string|number} params.id - Faction ID
   * @returns {Object} - Endpoint configuration
   */
  members: (params = {}) => {
    const id = validateParams.factionId(params.id);
    const selections = 'basic,members';
    
    return {
      section: 'faction',
      id: id,
      selections: selections,
      ttl: 300, // Cache for 5 minutes
      parseResponse: (data) => {
        if (data.error) {
          throw new TornAPIError(data.error);
        }
        return {
          basic: data.basic || {},
          members: data.members || {}
        };
      }
    };
  },
  
  /**
   * Get faction's crimes
   * @param {Object} params - Request parameters
   * @param {string|number} params.id - Faction ID
   * @returns {Object} - Endpoint configuration
   */
  crimes: (params = {}) => {
    const id = validateParams.factionId(params.id);
    const selections = 'crimes';
    
    return {
      section: 'faction',
      id: id,
      selections: selections,
      ttl: 300, // Cache for 5 minutes
      parseResponse: (data) => {
        if (data.error) {
          throw new TornAPIError(data.error);
        }
        return data.crimes || [];
      }
    };
  },
  
  /**
   * Get faction's wars data
   * @param {Object} params - Request parameters
   * @param {string|number} params.id - Faction ID
   * @returns {Object} - Endpoint configuration
   */
  wars: (params = {}) => {
    const id = validateParams.factionId(params.id);
    const selections = 'attacks,wars';
    
    return {
      section: 'faction',
      id: id,
      selections: selections,
      ttl: 120, // Cache for 2 minutes
      parseResponse: (data) => {
        if (data.error) {
          throw new TornAPIError(data.error);
        }
        return {
          wars: data.wars || {},
          attacks: data.attacks || {}
        };
      }
    };
  }
};

/**
 * Company-related endpoints
 */
const companyEndpoints = {
  /**
   * Get company profile
   * @param {Object} params - Request parameters
   * @param {string|number} params.id - Company ID
   * @param {string|array} [params.selections] - Data fields to return
   * @returns {Object} - Endpoint configuration
   */
  profile: (params = {}) => {
    const id = validateParams.companyId(params.id);
    const selections = validateParams.selections(params.selections);
    
    return {
      section: 'company',
      id: id,
      selections: selections,
      ttl: 300, // Cache for 5 minutes
      parseResponse: (data) => {
        if (data.error) {
          throw new TornAPIError(data.error);
        }
        return data;
      }
    };
  },
  
  /**
   * Get company employees
   * @param {Object} params - Request parameters
   * @param {string|number} params.id - Company ID
   * @returns {Object} - Endpoint configuration
   */
  employees: (params = {}) => {
    const id = validateParams.companyId(params.id);
    const selections = 'employees';
    
    return {
      section: 'company',
      id: id,
      selections: selections,
      ttl: 300, // Cache for 5 minutes
      parseResponse: (data) => {
        if (data.error) {
          throw new TornAPIError(data.error);
        }
        return data.employees || {};
      }
    };
  },
  
  /**
   * Get company detailed data
   * @param {Object} params - Request parameters
   * @param {string|number} params.id - Company ID
   * @returns {Object} - Endpoint configuration
   */
  detailed: (params = {}) => {
    const id = validateParams.companyId(params.id);
    const selections = 'detailed';
    
    return {
      section

