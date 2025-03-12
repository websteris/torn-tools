const db = require('../../../db');
const factionWarModel = require('../../../models/factionWar');

// These tests will use an actual database connection
describe('FactionWar Model Integration Tests', () => {
  // Sample war data for testing
  const testWar = {
    war_id: 99999, // Using a high ID unlikely to exist in real data
    start: Math.floor(Date.now() / 1000) - 86400, // 1 day ago
    end: Math.floor(Date.now() / 1000) + 86400, // 1 day from now
    target: 2000,
    winner: 50737
  };

  // Clean up before and after tests
  beforeAll(async () => {
    // Create tables if they don't exist
    await db.schema.hasTable('faction_wars').then(exists => {
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
    });
    
    // Clean up any previous test data
    await db('faction_wars').where('war_id', testWar.war_id).delete();
  });

  afterAll(async () => {
    // Clean up test data
    await db('faction_wars').where('war_id', testWar.war_id).delete();
    await db.destroy(); // Close the database connection
  });

  it('should create a new faction war', async () => {
    const war = await factionWarModel.createFactionWar(testWar);
    expect(war).toHaveProperty('war_id', testWar.war_id);
    expect(war).toHaveProperty('target', testWar.target);
    expect(war).toHaveProperty('winner', testWar.winner);
    
    // Verify date conversion
    expect(war.start).toBeInstanceOf(Date);
    expect(war.end).toBeInstanceOf(Date);
  });

  it('should get a faction war by id', async () => {
    const war = await factionWarModel.getFactionWarById(testWar.war_id);
    expect(war).toHaveProperty('war_id', testWar.war_id);
    expect(war).toHaveProperty('target', testWar.target);
  });

  it('should update a faction war', async () => {
    const updatedData = {
      target: 3000,
      winner: 12345
    };
    
    const war = await factionWarModel.updateFactionWar(testWar.war_id, updatedData);
    expect(war).toHaveProperty('war_id', testWar.war_id);
    expect(war).toHaveProperty('target', updatedData.target);
    expect(war).toHaveProperty('winner', updatedData.winner);
    
    // Other properties should remain unchanged
    expect(war.start).toBeInstanceOf(Date);
    expect(war.end).toBeInstanceOf(Date);
  });

  it('should upsert an existing faction war', async () => {
    const upsertData = {
      war_id: testWar.war_id,
      target: 4000,
      start: Math.floor(Date.now() / 1000) - 43200, // 12 hours ago
      end: Math.floor(Date.now() / 1000) + 43200, // 12 hours from now
      winner: 67890
    };
    
    const war = await factionWarModel.upsertFactionWar(upsertData);
    expect(war).toHaveProperty('war_id', testWar.war_id);
    expect(war).toHaveProperty('target', upsertData.target);
    expect(war).toHaveProperty('winner', upsertData.winner);
  });

  it('should upsert a new faction war', async () => {
    const newWarId = 88888; // Different ID for a new war
    const newWarData = {
      war_id: newWarId,
      start: Math.floor(Date.now() / 1000) - 86400, // 1 day ago
      end: Math.floor(Date.now() / 1000) + 86400, // 1 day from now
      target: 5000,
      winner: 12345
    };
    
    try {
      const war = await factionWarModel.upsertFactionWar(newWarData);
      expect(war).toHaveProperty('war_id', newWarId);
      expect(war).toHaveProperty('target', newWarData.target);
      
      // Clean up the new war
      await db('faction_wars').where('war_id', newWarId).delete();
    } catch (error) {
      // Clean up even if test fails
      await db('faction_wars').where('war_id', newWarId).delete();
      throw error;
    }
  });
}); 