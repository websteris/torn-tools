/**
 * Integration tests for the data puller service
 * 
 * These tests make actual API calls and database operations
 */

// Try to load test config
let testConfig;
try {
  testConfig = require('../../../config/test-config');
  console.log('Loaded API keys from test-config.js');
} catch (error) {
  console.warn('Test configuration file missing. Using environment variables or mock API key.');
  testConfig = {
    apiKeys: {
      publicOnly: process.env.TORN_API_KEY_PUBLIC_ONLY || 'mock-api-key',
    }
  };
}

const db = require('../../../db');
const dataPuller = require('../../../services/data-puller');
const factionModel = require('../../../models/faction');
const userDetailModel = require('../../../models/userDetail');
const factionWarModel = require('../../../models/factionWar');

// Determine if we're using real keys or mock keys
const usingRealKeys = testConfig.apiKeys.publicOnly !== 'mock-api-key';

describe('Data Puller Service Integration Tests', () => {
  // Skip these tests in CI environments unless explicitly enabled
  const runTests = (process.env.CI !== 'true' || process.env.RUN_API_TESTS === 'true') && usingRealKeys;
  
  beforeAll(async () => {
    if (!runTests) {
      console.log('Skipping data puller integration tests - no real API key available or in CI environment');
      return;
    }
    
    // Create tables if they don't exist
    await Promise.all([
      db.schema.hasTable('factions').then(exists => {
        if (!exists) {
          return db.schema.createTable('factions', table => {
            table.integer('id').primary();
            table.string('name');
            table.string('tag');
            table.string('tag_image');
            table.integer('leader');
            table.integer('respect');
            table.integer('age');
            table.json('raw_data');
            table.timestamps(true, true);
          });
        }
      }),
      
      db.schema.hasTable('users').then(exists => {
        if (!exists) {
          return db.schema.createTable('users', table => {
            table.integer('player_id').primary();
            table.string('name');
            table.string('username').unique().nullable();
            table.string('password_hash').nullable();
            table.json('preferences').nullable();
            table.json('raw_data');
            table.timestamps(true, true);
          });
        }
      }),
      
      db.schema.hasTable('faction_wars').then(exists => {
        if (!exists) {
          return db.schema.createTable('faction_wars', table => {
            table.integer('war_id').primary();
            table.dateTime('start');
            table.dateTime('end');
            table.integer('target');
            table.integer('winner');
            table.json('raw_data');
            table.timestamps(true, true);
          });
        }
      })
    ]);
  });
  
  afterAll(async () => {
    if (!runTests) {
      return;
    }
    
    // Stop the data puller if it's running
    dataPuller.stopPulling();
    
    // Close the database connection
    await db.destroy();
  });
  
  it('should pull faction data and store it in the database', async () => {
    if (!runTests) {
      console.log('Skipping test with real API key');
      return;
    }
    
    // Pull faction data
    await dataPuller.pullFactionData();
    
    // Verify data was stored in the database
    const factions = await db('factions').select();
    expect(factions.length).toBeGreaterThan(0);
    
    // Verify the faction has the expected properties
    const faction = factions[0];
    expect(faction).toHaveProperty('id');
    expect(faction).toHaveProperty('name');
    expect(faction).toHaveProperty('tag');
    expect(faction).toHaveProperty('raw_data');
    
    console.log(`Pulled faction data for: ${faction.name} (ID: ${faction.id})`);
  }, 15000); // Longer timeout for API call and database operations
  
  it('should pull user data and store it in the database', async () => {
    if (!runTests) {
      console.log('Skipping test with real API key');
      return;
    }
    
    // Pull user data
    await dataPuller.pullUserData();
    
    // Verify data was stored in the database
    const users = await db('users').select();
    expect(users.length).toBeGreaterThan(0);
    
    // Verify the user has the expected properties
    const user = users[0];
    expect(user).toHaveProperty('player_id');
    expect(user).toHaveProperty('name');
    expect(user).toHaveProperty('raw_data');
    
    console.log(`Pulled user data for: ${user.name} (ID: ${user.player_id})`);
  }, 15000); // Longer timeout for API call and database operations
  
  it('should pull war data and store it in the database', async () => {
    if (!runTests) {
      console.log('Skipping test with real API key');
      return;
    }
    
    // Pull war data
    await dataPuller.pullWarData();
    
    // Verify data was stored in the database
    const wars = await db('faction_wars').select();
    
    // Log the result (wars may or may not exist)
    console.log(`Pulled ${wars.length} faction wars`);
    
    // If wars exist, verify they have the expected properties
    if (wars.length > 0) {
      const war = wars[0];
      expect(war).toHaveProperty('war_id');
      expect(war).toHaveProperty('start');
      expect(war).toHaveProperty('end');
      expect(war).toHaveProperty('target');
      expect(war).toHaveProperty('raw_data');
      
      console.log(`War ID: ${war.war_id}, Target: ${war.target}`);
    }
  }, 15000); // Longer timeout for API call and database operations
  
  it('should start and stop the data puller', async () => {
    if (!runTests) {
      console.log('Skipping test with real API key');
      return;
    }
    
    // Start the data puller
    dataPuller.startPulling();
    
    // Verify it's running
    expect(dataPuller.isRunning).toBe(true);
    
    // Wait a short time to allow some data to be pulled
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Stop the data puller
    dataPuller.stopPulling();
    
    // Verify it's stopped
    expect(dataPuller.isRunning).toBe(false);
    
    // Verify the status
    const status = dataPuller.getStatus();
    expect(status).toHaveProperty('isRunning', false);
    expect(status).toHaveProperty('lastPull');
    expect(status).toHaveProperty('pullCount');
    expect(status).toHaveProperty('errors');
  });
}); 