/**
 * Integration tests for database migrations
 * 
 * These tests verify that migrations can be applied and rolled back correctly
 * on a real database connection
 */

const db = require('../../../db');
const path = require('path');
const fs = require('fs');

describe('Database Migrations Integration Tests', () => {
  // Tables that should be created by our migrations
  const expectedTables = ['factions', 'users', 'faction_wars'];
  
  // Skip these tests in CI environments unless explicitly enabled
  const runTests = process.env.CI !== 'true' || process.env.RUN_DB_TESTS === 'true';
  
  beforeAll(async () => {
    if (!runTests) {
      console.log('Skipping database migration tests in CI environment');
      return;
    }
    
    // Ensure migrations directory exists
    const migrationsDir = path.join(__dirname, '../../../db/migrations');
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
    }
    
    // Check if we have migration files
    const migrationFiles = fs.readdirSync(migrationsDir);
    if (migrationFiles.length === 0) {
      console.warn('No migration files found. Tests may fail.');
    }
    
    // Roll back any existing migrations to start fresh
    await db.migrate.rollback();
  });
  
  afterAll(async () => {
    if (!runTests) {
      return;
    }
    
    // Clean up by rolling back migrations
    await db.migrate.rollback();
    await db.destroy();
  });
  
  it('should apply migrations successfully', async () => {
    if (!runTests) {
      console.log('Skipping test in CI environment');
      return;
    }
    
    // Run migrations
    await db.migrate.latest();
    
    // Check if tables were created
    for (const table of expectedTables) {
      const hasTable = await db.schema.hasTable(table);
      expect(hasTable).toBe(true);
    }
  });
  
  it('should have correct schema for factions table', async () => {
    if (!runTests) {
      console.log('Skipping test in CI environment');
      return;
    }
    
    // Get column info for factions table
    const columnInfo = await db('factions').columnInfo();
    
    // Check required columns
    expect(columnInfo).toHaveProperty('id');
    expect(columnInfo).toHaveProperty('name');
    expect(columnInfo).toHaveProperty('tag');
    expect(columnInfo).toHaveProperty('leader');
    expect(columnInfo).toHaveProperty('raw_data');
    
    // Check column types
    expect(columnInfo.id.type).toMatch(/int/i);
    expect(columnInfo.name.type).toMatch(/varchar|text/i);
    expect(columnInfo.raw_data.type).toMatch(/json|text/i);
  });
  
  it('should have correct schema for users table', async () => {
    if (!runTests) {
      console.log('Skipping test in CI environment');
      return;
    }
    
    // Get column info for users table
    const columnInfo = await db('users').columnInfo();
    
    // Check required columns
    expect(columnInfo).toHaveProperty('player_id');
    expect(columnInfo).toHaveProperty('name');
    expect(columnInfo).toHaveProperty('username');
    expect(columnInfo).toHaveProperty('password_hash');
    expect(columnInfo).toHaveProperty('preferences');
    expect(columnInfo).toHaveProperty('raw_data');
    
    // Check column types
    expect(columnInfo.player_id.type).toMatch(/int/i);
    expect(columnInfo.name.type).toMatch(/varchar|text/i);
    expect(columnInfo.preferences.type).toMatch(/json|text/i);
    expect(columnInfo.raw_data.type).toMatch(/json|text/i);
  });
  
  it('should have correct schema for faction_wars table', async () => {
    if (!runTests) {
      console.log('Skipping test in CI environment');
      return;
    }
    
    // Get column info for faction_wars table
    const columnInfo = await db('faction_wars').columnInfo();
    
    // Check required columns
    expect(columnInfo).toHaveProperty('war_id');
    expect(columnInfo).toHaveProperty('start');
    expect(columnInfo).toHaveProperty('end');
    expect(columnInfo).toHaveProperty('target');
    expect(columnInfo).toHaveProperty('winner');
    expect(columnInfo).toHaveProperty('raw_data');
    
    // Check column types
    expect(columnInfo.war_id.type).toMatch(/int/i);
    expect(columnInfo.start.type).toMatch(/timestamp|datetime/i);
    expect(columnInfo.end.type).toMatch(/timestamp|datetime/i);
    expect(columnInfo.target.type).toMatch(/int/i);
    expect(columnInfo.winner.type).toMatch(/int/i);
    expect(columnInfo.raw_data.type).toMatch(/json|text/i);
  });
  
  it('should rollback migrations successfully', async () => {
    if (!runTests) {
      console.log('Skipping test in CI environment');
      return;
    }
    
    // Rollback migrations
    await db.migrate.rollback();
    
    // Check if tables were dropped
    for (const table of expectedTables) {
      const hasTable = await db.schema.hasTable(table);
      expect(hasTable).toBe(false);
    }
  });
}); 