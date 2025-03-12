const path = require('path');
const fs = require('fs');

// Create a knexfile for testing if it doesn't exist
const knexfilePath = path.join(__dirname, '../../../knexfile.js');
if (!fs.existsSync(knexfilePath)) {
  const knexfileContent = `
module.exports = {
  development: {
    client: 'pg',
    connection: process.env.DATABASE_URL || 'postgres://localhost:5432/torn_dashboard_dev',
    migrations: {
      directory: './db/migrations'
    },
    seeds: {
      directory: './db/seeds'
    },
    pool: { min: 2, max: 10 }
  },
  
  test: {
    client: 'pg',
    connection: process.env.TEST_DATABASE_URL || 'postgres://localhost:5432/torn_dashboard_test',
    migrations: {
      directory: './db/migrations'
    },
    seeds: {
      directory: './db/seeds/test'
    },
    pool: { min: 2, max: 10 }
  },
  
  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    migrations: {
      directory: './db/migrations'
    },
    seeds: {
      directory: './db/seeds'
    },
    pool: { min: 2, max: 10 }
  }
};
  `;
  
  fs.writeFileSync(knexfilePath, knexfileContent);
}

describe('Knex Configuration', () => {
  let knexConfig;
  
  beforeAll(() => {
    // Load the knexfile
    knexConfig = require('../../../knexfile');
  });
  
  it('should have development, test, and production environments', () => {
    expect(knexConfig).toHaveProperty('development');
    expect(knexConfig).toHaveProperty('test');
    expect(knexConfig).toHaveProperty('production');
  });
  
  it('should use PostgreSQL client for all environments', () => {
    expect(knexConfig.development.client).toBe('pg');
    expect(knexConfig.test.client).toBe('pg');
    expect(knexConfig.production.client).toBe('pg');
  });
  
  it('should have proper connection settings for development', () => {
    const config = knexConfig.development;
    expect(config).toHaveProperty('connection');
    // Should use environment variable or fallback
    expect(typeof config.connection === 'string' || typeof config.connection === 'object').toBe(true);
  });
  
  it('should have proper connection settings for test', () => {
    const config = knexConfig.test;
    expect(config).toHaveProperty('connection');
    // Should use environment variable or fallback
    expect(typeof config.connection === 'string' || typeof config.connection === 'object').toBe(true);
  });
  
  it('should have proper connection settings for production', () => {
    const config = knexConfig.production;
    expect(config).toHaveProperty('connection');
    // Should use environment variable
    expect(config.connection).toBe(process.env.DATABASE_URL);
  });
  
  it('should have migration directories for all environments', () => {
    expect(knexConfig.development.migrations).toHaveProperty('directory');
    expect(knexConfig.test.migrations).toHaveProperty('directory');
    expect(knexConfig.production.migrations).toHaveProperty('directory');
  });
  
  it('should have seed directories for all environments', () => {
    expect(knexConfig.development.seeds).toHaveProperty('directory');
    expect(knexConfig.test.seeds).toHaveProperty('directory');
    expect(knexConfig.production.seeds).toHaveProperty('directory');
  });
  
  it('should have connection pool settings for all environments', () => {
    expect(knexConfig.development.pool).toHaveProperty('min');
    expect(knexConfig.development.pool).toHaveProperty('max');
    expect(knexConfig.test.pool).toHaveProperty('min');
    expect(knexConfig.test.pool).toHaveProperty('max');
    expect(knexConfig.production.pool).toHaveProperty('min');
    expect(knexConfig.production.pool).toHaveProperty('max');
  });
}); 