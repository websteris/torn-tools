/**
 * Integration tests for the Torn API client
 * 
 * These tests make actual API calls to the Torn API
 * They require a valid API key to run
 */

// Try to load test config, fall back to environment variables or mock keys
let testConfig;
try {
  testConfig = require('../../../../config/test-config');
  console.log('Loaded API keys from test-config.js');
} catch (error) {
  console.warn('Test configuration file missing. Using environment variables or mock API key.');
  testConfig = {
    apiKeys: {
      publicOnly: process.env.TORN_API_KEY_PUBLIC_ONLY || 'mock-api-key',
    },
    testUser: {
      torn_id: process.env.TEST_USER_ID || 12345
    }
  };
}

const { getUserData, getWarOpponents } = require('../../../../services/torn-api/client');

// Determine if we're using real keys or mock keys
const usingRealKeys = testConfig.apiKeys.publicOnly !== 'mock-api-key';

describe('Torn API Client Integration Tests', () => {
  // Skip these tests in CI environments unless explicitly enabled
  const runTests = process.env.CI !== 'true' || process.env.RUN_API_TESTS === 'true';
  
  // Only run these tests if we have a real API key
  beforeAll(() => {
    if (!usingRealKeys && runTests) {
      console.warn('Skipping Torn API client integration tests - no real API key available');
    }
  });

  describe('getUserData', () => {
    it('should fetch real user data from the API', async () => {
      if (!runTests || !usingRealKeys) {
        console.log('Skipping test with real API key');
        return;
      }
      
      const result = await getUserData(testConfig.apiKeys.publicOnly);
      
      // Verify we got a valid response
      expect(result).toBeDefined();
      expect(result).toHaveProperty('player_id');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('level');
      
      // Log some info about the response
      console.log(`Retrieved data for user: ${result.name} (ID: ${result.player_id})`);
    }, 10000); // Longer timeout for API call
    
    it('should fetch user data with specific selections', async () => {
      if (!runTests || !usingRealKeys) {
        console.log('Skipping test with real API key');
        return;
      }
      
      const result = await getUserData(testConfig.apiKeys.publicOnly, ['profile', 'basic']);
      
      // Verify we got a valid response with the requested data
      expect(result).toBeDefined();
      expect(result).toHaveProperty('name');
      
      // Log some info about the response
      console.log(`Retrieved profile data for user: ${result.name}`);
    }, 10000); // Longer timeout for API call
  });

  describe('getWarOpponents', () => {
    it('should fetch war opponents from the API', async () => {
      if (!runTests || !usingRealKeys) {
        console.log('Skipping test with real API key');
        return;
      }
      
      const result = await getWarOpponents(testConfig.apiKeys.publicOnly);
      
      // Verify we got a valid response
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      // Log some info about the response
      console.log(`Retrieved ${result.length} war opponents`);
      if (result.length > 0) {
        console.log(`First opponent: ${result[0].name}`);
      }
    }, 10000); // Longer timeout for API call
  });
}); 