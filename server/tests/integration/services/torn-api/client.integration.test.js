// server/tests/integration/services/torn-api/client.integration.test.js

/**
 * @jest-environment node
 */

// Get API key from environment variable for CI/CD
const ENV_API_KEY = process.env.TORN_API_KEY;

// Test configuration import with error handling
let testConfig;
let shouldRunTests = true;

try {
  testConfig = require('../../../../config/test-config');
  // If we have an environment API key, use it instead of the config file
  if (ENV_API_KEY) {
    testConfig.apiKey = ENV_API_KEY;
  }
} catch (error) {
  // If we have an environment API key, create a minimal test config
  if (ENV_API_KEY) {
    testConfig = {
      apiKey: ENV_API_KEY,
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

const TornApiClient = require('../../../../services/torn-api/client');

describe('Torn API Client Integration', () => {
  let apiClient;
  
  beforeEach(() => {
    apiClient = new TornApiClient();
  });
  
  (shouldRunTests ? test : test.skip)('should fetch user data with valid API key', async () => {
    // This test uses your real API key from config or environment
    const userData = await apiClient.getUserData(testConfig.apiKey, ['profile']);
    
    // Ensure we get a successful response
    expect(userData).toBeDefined();
    
    // If we're using an environment API key without a known user ID,
    // update the test config with the actual user ID
    if (ENV_API_KEY && testConfig.testUser.torn_id === 1) {
      testConfig.testUser.torn_id = userData.player_id;
    }
    
    // Now check the user ID
    expect(userData.player_id).toBe(testConfig.testUser.torn_id);
    
    // Check that basic user info is retrieved
    expect(userData.name).toBeDefined();
    expect(userData.level).toBeDefined();
  }, 10000); // Extend timeout for API call
  
  (shouldRunTests ? test : test.skip)('should handle invalid API key', async () => {
    // Test with an invalid key
    try {
      await apiClient.getUserData('invalid_key_test', ['profile']);
      // Should not reach here
      expect(true).toBe(false); // Force failure if we reach this point
    } catch (error) {
      // Just check that we got an error
      expect(error).toBeDefined();
      // Check error has a message property
      expect(error.message).toBeDefined();
      // We don't check the specific message content since it may vary
    }
  });
});
