/**
 * @module TestConfig
 * @description Configuration for tests with real credentials
 * This file is not tracked by Git
 */

module.exports = {
  apiKeys: {
    // Using the API key from the environment or a default test key
    publicOnly: process.env.TORN_API_KEY || 'cO8K3VnS4NediwQf',
    
    // We don't have a higher access key for this test, but we can use a different key if needed
    higherAccess: null
  },
  testUser: {
    id: 2748865,  // Your test user ID
    name: 'senatorjack',
    torn_id: 2748865,
    faction_id: 50737,  // Replace with your faction ID or 0 if none
    faction_name: 'Rocky&#039;s Gym' 
	  
  }
};
