/**
 * @jest-environment node
 */

// Get API key from environment variable for CI/CD
const ENV_API_KEY = process.env.TORN_API_KEY;

// Test configuration import with error handling
let testConfig;
let shouldRunTests = true;
let apiKey;

try {
  // Try to load test config
  testConfig = require('../../../../config/test-config');
  
  // Get API key from the correct property
  if (testConfig.apiKey) {
    apiKey = testConfig.apiKey;
  } else if (testConfig.apiKeys && testConfig.apiKeys.test) {
    apiKey = testConfig.apiKeys.test;
  }
  
  // If we have an environment API key, use it instead of the config file
  if (ENV_API_KEY) {
    apiKey = ENV_API_KEY;
  }
  
  console.log('API key available:', !!apiKey);
} catch (error) {
  console.error('Error loading test config:', error.message);
  
  // If we have an environment API key, create a minimal test config
  if (ENV_API_KEY) {
    console.log('Creating minimal test config with environment API key');
    apiKey = ENV_API_KEY;
    testConfig = {
      testUser: {
        torn_id: 1 // This will be replaced with actual ID from API response
      }
    };
  } else {
    console.warn('Test configuration file missing and no environment API key provided.');
    console.warn('Copy config/test-config.example.js to config/test-config.js and add your credentials,');
    console.warn('or set the TORN_API_KEY environment variable.');
    shouldRunTests = false;
  }
}

// Import required services
const TornApiClient = require('../../../../services/torn-api/client');
const WarTracker = require('../../../../services/faction-tracker/war-tracker');
const { getConnection } = require('../../../../db/schema');

describe('Complete Data Retrieval Integration Test', () => {
  let apiClient;
  let userData;
  let factionData;
  let warOpponents;
  
  // Skip all tests if no API key is available
  beforeAll(async () => {
    if (!shouldRunTests || !apiKey) {
      console.warn('Skipping tests due to missing API key');
      return;
    }
    
    // Initialize API client
    apiClient = new TornApiClient();
    
    // Step 1: Get user data
    userData = await apiClient.getUserData(apiKey, ['profile', 'faction']);
    
    // Step 2: Get faction data if user is in a faction
    if (userData.faction && userData.faction.faction_id) {
      factionData = await apiClient.getFactionData(apiKey, userData.faction.faction_id, ['basic']);
    }
    
    // Mock database for war tracker
    const mockDb = {
      all: jest.fn((query, params, callback) => {
        // Mock active wars data - this would normally come from the database
        // but for testing we'll create some mock data
        if (query.includes('faction_wars')) {
          callback(null, [{
            war_id: 12345,
            faction_id: userData.player_id,
            war_type: 'territory',
            defending: true,
            assaulting: false,
            score: 150,
            start_time: Math.floor(Date.now() / 1000) - 86400, // 1 day ago
            end_time: 0,
            territory: 'Test Territory',
            assaulting_faction: 54321, // Mock opponent ID
            defending_faction: userData.player_id
          }]);
        } else {
          callback(null, []);
        }
      }),
      get: jest.fn((query, params, callback) => {
        callback(null, null);
      }),
      close: jest.fn()
    };
    
    // Mock getConnection to return our mock DB
    jest.spyOn(require('../../../../db/schema'), 'getConnection').mockReturnValue(mockDb);
    
    // Step 3: Get war opponents
    if (userData.faction && userData.faction.faction_id) {
      warOpponents = await WarTracker.getWarOpponents(userData.faction.faction_id);
    }
  });
  
  // Restore mocks after tests
  afterAll(() => {
    jest.restoreAllMocks();
  });
  
  (shouldRunTests && apiKey ? test : test.skip)('should retrieve character name and player ID', () => {
    expect(userData).toBeDefined();
    expect(userData.name).toBeDefined();
    expect(userData.player_id).toBeDefined();
    
    console.log(`Retrieved character name: ${userData.name}`);
    console.log(`Retrieved player ID: ${userData.player_id}`);
  });
  
  (shouldRunTests && apiKey ? test : test.skip)('should retrieve faction ID and name if user is in a faction', () => {
    if (!userData.faction || !userData.faction.faction_id) {
      console.log('User is not in a faction, skipping faction tests');
      return;
    }
    
    expect(userData.faction).toBeDefined();
    expect(userData.faction.faction_id).toBeDefined();
    expect(userData.faction.faction_name).toBeDefined();
    
    console.log(`Retrieved faction ID: ${userData.faction.faction_id}`);
    console.log(`Retrieved faction name: ${userData.faction.faction_name}`);
  });
  
  (shouldRunTests && apiKey ? test : test.skip)('should retrieve faction data if user is in a faction', () => {
    if (!userData.faction || !userData.faction.faction_id) {
      console.log('User is not in a faction, skipping faction data tests');
      return;
    }
    
    expect(factionData).toBeDefined();
    // Additional assertions based on what faction data contains
  });
  
  (shouldRunTests && apiKey ? test : test.skip)('should retrieve warring factions information', () => {
    if (!userData.faction || !userData.faction.faction_id) {
      console.log('User is not in a faction, skipping war tests');
      return;
    }
    
    expect(warOpponents).toBeDefined();
    
    // We're using mock data for wars, so we should have at least one opponent
    expect(warOpponents.length).toBeGreaterThan(0);
    
    // Log war opponents for verification
    warOpponents.forEach(opponent => {
      console.log(`War opponent ID: ${opponent.opponent_id}`);
      if (opponent.opponent_name) {
        console.log(`War opponent name: ${opponent.opponent_name}`);
      }
      console.log(`War type: ${opponent.war_type}`);
    });
  });
  
  (shouldRunTests && apiKey ? test : test.skip)('should verify all required data can be retrieved with just an API key', () => {
    // This test verifies that all the required data can be retrieved with just an API key
    expect(userData).toBeDefined();
    expect(userData.name).toBeDefined();
    expect(userData.player_id).toBeDefined();
    
    if (userData.faction && userData.faction.faction_id) {
      expect(userData.faction.faction_id).toBeDefined();
      expect(userData.faction.faction_name).toBeDefined();
      expect(warOpponents.length).toBeGreaterThan(0);
      expect(warOpponents[0].opponent_id).toBeDefined();
    } else {
      console.log('User is not in a faction, skipping faction-related assertions');
    }
    
    // Log summary of all retrieved data
    console.log('\nData retrieved with API key:');
    console.log(`- Character name: ${userData.name}`);
    console.log(`- Player ID: ${userData.player_id}`);
    
    if (userData.faction && userData.faction.faction_id) {
      console.log(`- Faction ID: ${userData.faction.faction_id}`);
      console.log(`- Faction name: ${userData.faction.faction_name}`);
      console.log(`- Number of war opponents: ${warOpponents.length}`);
      
      if (warOpponents.length > 0) {
        console.log('- War opponents:');
        warOpponents.forEach((opponent, index) => {
          console.log(`  ${index + 1}. ID: ${opponent.opponent_id}, Type: ${opponent.war_type}`);
        });
      }
    } else {
      console.log('- Not in a faction');
    }
  });
}); 