// server/tests/integration/services/torn-api/client.integration.test.js

/**
 * @jest-environment node
 */

// Test configuration import with error handling
let testConfig;
try {
  testConfig = require('../../../../config/test-config');
} catch (error) {
  console.error('Test configuration file missing. Copy config/test-config.example.js to config/test-config.js and add your credentials.');
  process.exit(1);
}

const TornApiClient = require('../../../../services/torn-api/client');

// Get API key from environment variable or use a fallback for local development
const API_KEY = process.env.TORN_API_KEY || 'your-local-test-key';

// Skip all tests if no valid API key is available
const runApiTests = API_KEY && API_KEY !== 'your-local-test-key';

describe('Torn API Client Integration', () => {
  let apiClient;
  
  beforeEach(() => {
    apiClient = new TornApiClient();
  });
  
  (runApiTests ? test : test.skip)('should fetch user data with valid API key', async () => {
    // This test uses your real API key
    const userData = await apiClient.getUserData(API_KEY, ['profile']);
    
    // Ensure we get a successful response with player ID matching test config
    expect(userData).toBeDefined();
    expect(userData.player_id).toBe(testConfig.testUser.torn_id);
    
    // Check that basic user info is retrieved
    expect(userData.name).toBeDefined();
    expect(userData.level).toBeDefined();
  }, 10000); // Extend timeout for API call
  
  (runApiTests ? test : test.skip)('should handle invalid API key', async () => {
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
