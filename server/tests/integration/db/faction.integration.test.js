const db = require('../../../db');
const factionModel = require('../../../models/faction');

// These tests will use an actual database connection
// Make sure to set up a test database before running

describe('Faction Model Integration Tests', () => {
  // Sample faction data for testing
  const testFaction = {
    id: 99999, // Using a high ID unlikely to exist in real data
    name: 'Test Faction',
    tag: 'TEST',
    tag_image: 'test.png',
    leader: 12345,
    respect: 10000,
    age: 100
  };

  // Clean up before and after tests
  beforeAll(async () => {
    // Create tables if they don't exist
    await db.schema.hasTable('factions').then(exists => {
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
    });
    
    // Clean up any previous test data
    await db('factions').where('id', testFaction.id).delete();
  });

  afterAll(async () => {
    // Clean up test data
    await db('factions').where('id', testFaction.id).delete();
    await db.destroy(); // Close the database connection
  });

  it('should create a new faction', async () => {
    const faction = await factionModel.createFaction(testFaction);
    expect(faction).toHaveProperty('id', testFaction.id);
    expect(faction).toHaveProperty('name', testFaction.name);
  });

  it('should get a faction by id', async () => {
    const faction = await factionModel.getFactionById(testFaction.id);
    expect(faction).toHaveProperty('id', testFaction.id);
    expect(faction).toHaveProperty('name', testFaction.name);
  });

  it('should update a faction', async () => {
    const updatedData = {
      name: 'Updated Test Faction',
      respect: 20000
    };
    
    const faction = await factionModel.updateFaction(testFaction.id, updatedData);
    expect(faction).toHaveProperty('id', testFaction.id);
    expect(faction).toHaveProperty('name', updatedData.name);
    expect(faction).toHaveProperty('respect', updatedData.respect);
    // Other properties should remain unchanged
    expect(faction).toHaveProperty('tag', testFaction.tag);
  });

  it('should upsert an existing faction', async () => {
    const upsertData = {
      id: testFaction.id,
      name: 'Upserted Test Faction',
      tag: 'UPD'
    };
    
    const faction = await factionModel.upsertFaction(upsertData);
    expect(faction).toHaveProperty('id', testFaction.id);
    expect(faction).toHaveProperty('name', upsertData.name);
    expect(faction).toHaveProperty('tag', upsertData.tag);
  });

  it('should upsert a new faction', async () => {
    const newFactionId = 99998; // Different ID for a new faction
    const newFactionData = {
      id: newFactionId,
      name: 'New Test Faction',
      tag: 'NEW',
      leader: 54321,
      respect: 5000,
      age: 50
    };
    
    try {
      const faction = await factionModel.upsertFaction(newFactionData);
      expect(faction).toHaveProperty('id', newFactionId);
      expect(faction).toHaveProperty('name', newFactionData.name);
      
      // Clean up the new faction
      await db('factions').where('id', newFactionId).delete();
    } catch (error) {
      // Clean up even if test fails
      await db('factions').where('id', newFactionId).delete();
      throw error;
    }
  });

  it('should get all factions', async () => {
    const factions = await factionModel.getAllFactions();
    expect(Array.isArray(factions)).toBe(true);
    // Should find at least our test faction
    expect(factions.some(f => f.id === testFaction.id)).toBe(true);
  });
}); 