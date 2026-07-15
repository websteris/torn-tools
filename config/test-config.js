/**
 * @module TestConfig
 * @description Test configuration. Contains NO secrets — all real credentials
 * come from environment variables (see .env.example / CI secrets).
 * Never hardcode a real API key in this file.
 */

module.exports = {
  apiKeys: {
    // Provide a real key via the TORN_API_KEY environment variable.
    test: process.env.TORN_API_KEY || null,
    publicOnly: process.env.TORN_API_KEY || null,
    higherAccess: process.env.TORN_API_KEY_HIGHER || null
  },
  testUser: {
    id: Number(process.env.TEST_USER_ID) || 1,
    name: process.env.TEST_USER_NAME || 'test-user',
    torn_id: Number(process.env.TEST_USER_ID) || 1,
    faction_id: Number(process.env.TEST_FACTION_ID) || 0,
    faction_name: process.env.TEST_FACTION_NAME || 'Test Faction'
  }
};
