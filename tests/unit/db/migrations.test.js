const knex = require('knex');
const path = require('path');
const fs = require('fs');

// Create a test database configuration
const testConfig = {
  client: 'sqlite3',
  connection: {
    filename: ':memory:'
  },
  useNullAsDefault: true,
  migrations: {
    directory: path.join(__dirname, '../../../db/migrations')
  }
};

describe('Database Migrations', () => {
  let db;

  beforeAll(async () => {
    // Create migrations directory if it doesn't exist
    const migrationsDir = path.join(__dirname, '../../../db/migrations');
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
    }

    // Create a sample migration file if none exist
    const migrationFiles = fs.readdirSync(migrationsDir);
    if (migrationFiles.length === 0) {
      const timestamp = new Date().getTime();
      const migrationPath = path.join(migrationsDir, `${timestamp}_initial_schema.js`);
      
      const migrationContent = `
exports.up = function(knex) {
  return knex.schema
    .createTable('factions', table => {
      table.integer('id').primary();
      table.string('name');
      table.string('tag');
      table.string('tag_image');
      table.integer('leader');
      table.integer('respect');
      table.integer('age');
      table.json('raw_data');
      table.timestamps(true, true);
    })
    .createTable('users', table => {
      table.integer('player_id').primary();
      table.string('name');
      table.string('username').unique();
      table.string('password_hash');
      table.json('preferences');
      table.json('raw_data');
      table.timestamps(true, true);
    })
    .createTable('faction_wars', table => {
      table.integer('war_id').primary();
      table.dateTime('start');
      table.dateTime('end');
      table.integer('target');
      table.integer('winner');
      table.json('raw_data');
      table.timestamps(true, true);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTable('faction_wars')
    .dropTable('users')
    .dropTable('factions');
};
      `;
      
      fs.writeFileSync(migrationPath, migrationContent);
    }

    // Initialize the database
    db = knex(testConfig);
  });

  afterAll(async () => {
    await db.destroy();
  });

  it('should apply migrations successfully', async () => {
    // Run migrations
    await db.migrate.latest();
    
    // Check if tables were created
    const hasFactions = await db.schema.hasTable('factions');
    const hasUsers = await db.schema.hasTable('users');
    const hasFactionWars = await db.schema.hasTable('faction_wars');
    
    expect(hasFactions).toBe(true);
    expect(hasUsers).toBe(true);
    expect(hasFactionWars).toBe(true);
  });

  it('should rollback migrations successfully', async () => {
    // Rollback migrations
    await db.migrate.rollback();
    
    // Check if tables were dropped
    const hasFactions = await db.schema.hasTable('factions');
    const hasUsers = await db.schema.hasTable('users');
    const hasFactionWars = await db.schema.hasTable('faction_wars');
    
    expect(hasFactions).toBe(false);
    expect(hasUsers).toBe(false);
    expect(hasFactionWars).toBe(false);
  });
}); 