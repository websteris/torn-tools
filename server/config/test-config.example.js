/**
 * Example test configuration file
 * 
 * Copy this file to test-config.js and add your API keys
 * This file is gitignored to prevent accidentally committing API keys
 */

module.exports = {
  apiKeys: {
    // A key with "Public Only" access for general testing
    publicOnly: 'your-public-only-key-here',
    
    // Optional: A key with higher access for testing key validation
    // This is used to verify that keys with higher access are rejected
    higherAccess: 'your-higher-access-key-here'
  },
  
  // Optional: Test user ID for specific user tests
  testUser: {
    torn_id: 12345 // Replace with a valid Torn ID
  }
};
