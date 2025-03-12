/**
 * Integration tests for the validateKey module
 * 
 * These tests can run with either:
 * 1. Mock keys (default) - Will test error handling but not actual API validation
 * 2. Real API keys - Will test actual API validation against the Torn API
 * 
 * To use real API keys:
 * - Create a file at server/config/test-config.js with your API keys:
 *   ```
 *   module.exports = {
 *     apiKeys: {
 *       publicOnly: 'your-public-only-key',
 *       higherAccess: 'your-higher-access-key' // Optional
 *     }
 *   };
 *   ```
 * - Or set environment variables:
 *   - TORN_API_KEY_PUBLIC_ONLY: Your Public Only API key
 *   - TORN_API_KEY_HIGHER_ACCESS: Your higher access API key (optional)
 */

const { validateApiKey } = require('../../../../services/torn-api/validateKey');

// Try to load test config, fall back to environment variables or mock keys
let testConfig = {
  apiKeys: {
    publicOnly: process.env.TORN_API_KEY_PUBLIC_ONLY || 'invalid-key-12345',
    higherAccess: process.env.TORN_API_KEY_HIGHER_ACCESS || 'invalid-key-67890'
  }
};

try {
  const loadedConfig = require('../../../../config/test-config');
  testConfig = {
    apiKeys: {
      ...testConfig.apiKeys,
      ...loadedConfig.apiKeys
    }
  };
  console.log('Loaded API keys from test-config.js');
} catch (error) {
  console.log('No test-config.js found, using environment variables or mock keys');
}

// Determine if we're using real keys or mock keys
const usingRealKeys = testConfig.apiKeys.publicOnly !== 'invalid-key-12345';

describe('ValidateKey Integration Tests', () => {
  // Skip these tests in CI environments unless explicitly enabled
  const runTests = process.env.CI !== 'true' || process.env.RUN_API_TESTS === 'true';
  
  // Test with an invalid key
  const invalidKey = 'invalid-key-12345';
  
  // Test with a Public Only key if available
  const publicOnlyKey = testConfig.apiKeys.publicOnly;
  
  // Test with a higher access key if available
  const higherAccessKey = testConfig.apiKeys.higherAccess;

  it('should reject an invalid API key', async () => {
    if (!runTests) {
      console.log('Skipping API call in CI environment');
      return;
    }
    
    await expect(validateApiKey(invalidKey))
      .rejects
      .toThrow(/Error validating API key|API Error/);
  }, 10000); // Longer timeout for API call

  it('should accept a valid Public Only API key', async () => {
    if (!runTests) {
      console.log('Skipping API call in CI environment');
      return;
    }
    
    if (!usingRealKeys) {
      console.log('Skipping test with real Public Only key - none configured');
      return;
    }
    
    const result = await validateApiKey(publicOnlyKey);
    expect(result).toHaveProperty('access_type', 'Public Only');
    expect(result).toHaveProperty('selections');
  }, 10000); // Longer timeout for API call

  it('should reject a key with higher access', async () => {
    if (!runTests) {
      console.log('Skipping API call in CI environment');
      return;
    }
    
    if (!usingRealKeys || higherAccessKey === 'invalid-key-67890') {
      console.log('Skipping test with higher access key - none configured');
      return;
    }
    
    await expect(validateApiKey(higherAccessKey))
      .rejects
      .toThrow(/API key access type .* is not allowed/);
  }, 10000); // Longer timeout for API call
}); 