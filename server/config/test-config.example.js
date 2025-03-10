/**
 * @module TestConfig
 * @description Configuration for tests - EXAMPLE FILE
 * Copy this to test-config.js and add your actual credentials
 */

module.exports = {
  apiKeys: {
    // Test API key for Torn API
    test: 'YOUR_TEST_API_KEY_HERE',
    // Alternative test key (for rate limiting tests)
    alternate: 'ALTERNATE_TEST_API_KEY'
  },
  testUser: {
    id: 12345,  // Your test user ID
    name: 'TestUser',
    torn_id: 67890
  }
};
