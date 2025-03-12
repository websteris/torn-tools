const db = require('../../../db');
const userAccountModel = require('../../../models/userAccount');

// These tests will use an actual database connection
// Make sure to set up a test database before running

describe('UserAccount Model Integration Tests', () => {
  // Sample user account data for testing
  const testUser = {
    player_id: 88888, // Using a high ID unlikely to exist in real data
    name: 'Test User',
    username: 'testuser',
    password_hash: 'hashedpassword123',
    preferences: { theme: 'dark', notifications: true },
    raw_data: { player_id: 88888, name: 'Test User', level: 15 }
  };

  // Clean up before and after tests
  beforeAll(async () => {
    // Create tables if they don't exist
    await db.schema.hasTable('users').then(exists => {
      if (!exists) {
        return db.schema.createTable('users', table => {
          table.integer('player_id').primary();
          table.string('name');
          table.string('username').unique();
          table.string('password_hash');
          table.json('preferences');
          table.json('raw_data');
          table.timestamps(true, true);
        });
      }
    });
    
    // Clean up any previous test data
    await db('users').where('player_id', testUser.player_id).delete();
  });

  afterAll(async () => {
    // Clean up test data
    await db('users').where('player_id', testUser.player_id).delete();
    await db.destroy(); // Close the database connection
  });

  it('should create a new user account', async () => {
    const user = await userAccountModel.createUserAccount(testUser);
    expect(user).toHaveProperty('player_id', testUser.player_id);
    expect(user).toHaveProperty('name', testUser.name);
    expect(user).toHaveProperty('username', testUser.username);
    
    // Verify JSON fields are properly stored and retrieved
    const preferences = JSON.parse(user.preferences);
    expect(preferences).toEqual(testUser.preferences);
  });

  it('should get a user account by id', async () => {
    const user = await userAccountModel.getUserAccountById(testUser.player_id);
    expect(user).toHaveProperty('player_id', testUser.player_id);
    expect(user).toHaveProperty('name', testUser.name);
  });

  it('should update a user account', async () => {
    const updatedData = {
      name: 'Updated Test User',
      preferences: { theme: 'light', notifications: false }
    };
    
    const user = await userAccountModel.updateUserAccount(testUser.player_id, updatedData);
    expect(user).toHaveProperty('player_id', testUser.player_id);
    expect(user).toHaveProperty('name', updatedData.name);
    
    // Verify JSON fields are properly updated
    const preferences = JSON.parse(user.preferences);
    expect(preferences).toEqual(updatedData.preferences);
    
    // Other properties should remain unchanged
    expect(user).toHaveProperty('username', testUser.username);
  });

  it('should update only specified fields', async () => {
    const partialUpdate = {
      name: 'Partially Updated User'
    };
    
    const user = await userAccountModel.updateUserAccount(testUser.player_id, partialUpdate);
    expect(user).toHaveProperty('name', partialUpdate.name);
    
    // Preferences should remain from previous test
    const preferences = JSON.parse(user.preferences);
    expect(preferences).toHaveProperty('theme', 'light');
  });

  it('should upsert an existing user account', async () => {
    const upsertData = {
      player_id: testUser.player_id,
      name: 'Upserted Test User',
      username: 'upserteduser'
    };
    
    const user = await userAccountModel.upsertUserAccount(upsertData);
    expect(user).toHaveProperty('player_id', testUser.player_id);
    expect(user).toHaveProperty('name', upsertData.name);
    expect(user).toHaveProperty('username', upsertData.username);
  });

  it('should upsert a new user account', async () => {
    const newUserId = 77777; // Different ID for a new user
    const newUserData = {
      player_id: newUserId,
      name: 'New Test User',
      username: 'newuser',
      password_hash: 'newhash123',
      preferences: { theme: 'system', fontSize: 'large' }
    };
    
    try {
      const user = await userAccountModel.upsertUserAccount(newUserData);
      expect(user).toHaveProperty('player_id', newUserId);
      expect(user).toHaveProperty('name', newUserData.name);
      
      // Clean up the new user
      await db('users').where('player_id', newUserId).delete();
    } catch (error) {
      // Clean up even if test fails
      await db('users').where('player_id', newUserId).delete();
      throw error;
    }
  });
}); 