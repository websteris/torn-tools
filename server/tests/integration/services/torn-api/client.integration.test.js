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

// This test requires a real API key and makes real API calls
// Only run when specifically testing integration
describe('TornApiClient Integration Tests', () => {
  let apiClient;
  
  beforeEach(() => {
    apiClient = new TornApiClient();
  });
  
  test('should fetch user data with valid API key', async () => {
    // This test uses your real API key
    const userData = await apiClient.getUserData(testConfig.apiKeys.test, ['profile']);
    
    // Ensure we get a successful response with player ID matching test config
    expect(userData).toBeDefined();
    expect(userData.player_id).toBe(testConfig.testUser.torn_id);
    
    // Check that basic user info is retrieved
    expect(userData.name).toBeDefined();
    expect(userData.level).toBeDefined();
  }, 10000); // Extend timeout for API call
  
  test('should handle invalid API key', async () => {
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
