const db = require('../../../db');
const userModel = require('../../../models/user');

// These tests will use an actual database connection
describe('User Model Integration Tests', () => {
  // Sample user data for testing
  const testUser = {
    id: 99999, // Using a high ID unlikely to exist in real data
    name: 'Test User',
    email: 'test@example.com',
    role: 'user'
  };

  // Clean up before and after tests
  beforeAll(async () => {
    // Create tables if they don't exist
    await db.schema.hasTable('users').then(exists => {
      if (!exists) {
        return db.schema.createTable('users', table => {
          table.integer('id').primary();
          table.string('name');
          table.string('email').unique();
          table.string('role');
          table.timestamps(true, true);
        });
      }
    });
    
    // Clean up any previous test data
    await db('users').where('id', testUser.id).delete();
  });

  afterAll(async () => {
    // Clean up test data
    await db('users').where('id', testUser.id).delete();
    await db.destroy(); // Close the database connection
  });

  it('should create a new user', async () => {
    const user = await userModel.createUser(testUser);
    expect(user).toHaveProperty('id', testUser.id);
    expect(user).toHaveProperty('name', testUser.name);
    expect(user).toHaveProperty('email', testUser.email);
  });

  it('should get a user by id', async () => {
    const user = await userModel.getUserById(testUser.id);
    expect(user).toHaveProperty('id', testUser.id);
    expect(user).toHaveProperty('name', testUser.name);
  });

  it('should get all users', async () => {
    const users = await userModel.getAllUsers();
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBeGreaterThan(0);
    expect(users.some(u => u.id === testUser.id)).toBe(true);
  });

  it('should update a user', async () => {
    const updatedData = {
      name: 'Updated Test User',
      role: 'admin'
    };
    
    const user = await userModel.updateUser(testUser.id, updatedData);
    expect(user).toHaveProperty('id', testUser.id);
    expect(user).toHaveProperty('name', updatedData.name);
    expect(user).toHaveProperty('role', updatedData.role);
    
    // Email should remain unchanged
    expect(user).toHaveProperty('email', testUser.email);
  });

  it('should upsert an existing user', async () => {
    const upsertData = {
      id: testUser.id,
      name: 'Upserted Test User',
      email: 'upserted@example.com'
    };
    
    const user = await userModel.upsertUser(upsertData);
    expect(user).toHaveProperty('id', testUser.id);
    expect(user).toHaveProperty('name', upsertData.name);
    expect(user).toHaveProperty('email', upsertData.email);
  });

  it('should upsert a new user', async () => {
    const newUserId = 88888; // Different ID for a new user
    const newUserData = {
      id: newUserId,
      name: 'New Test User',
      email: 'new@example.com',
      role: 'user'
    };
    
    try {
      const user = await userModel.upsertUser(newUserData);
      expect(user).toHaveProperty('id', newUserId);
      expect(user).toHaveProperty('name', newUserData.name);
      
      // Clean up the new user
      await db('users').where('id', newUserId).delete();
    } catch (error) {
      // Clean up even if test fails
      await db('users').where('id', newUserId).delete();
      throw error;
    }
  });
}); 