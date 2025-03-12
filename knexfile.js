const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

/**
 * @file Knex configuration file
 * @description Database configuration for different environments
 */

module.exports = {
  development: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME_DEV || process.env.DB_NAME || 'torn_dashboard_dev',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      charset: 'utf8'
    },
    migrations: {
      directory: path.join(__dirname, 'db/migrations')
    },
    seeds: {
      directory: path.join(__dirname, 'db/seeds')
    },
    pool: {
      min: 2,
      max: 10
    },
    debug: process.env.DB_DEBUG === 'true' || true
  },

  test: {
    client: 'pg',
    connection: {
      host: process.env.TEST_DB_HOST || process.env.DB_HOST || 'localhost',
      port: process.env.TEST_DB_PORT || process.env.DB_PORT || 5432,
      database: process.env.TEST_DB_NAME || process.env.DB_NAME_TEST || 'torn_dashboard_test',
      user: process.env.TEST_DB_USER || process.env.DB_USER || 'postgres',
      password: process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD || 'postgres',
      charset: 'utf8'
    },
    migrations: {
      directory: path.join(__dirname, 'db/migrations')
    },
    seeds: {
      directory: path.join(__dirname, 'db/seeds')
    },
    pool: {
      min: 2,
      max: 10
    },
    debug: false
  },

  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL || {
      host: process.env.PROD_DB_HOST || process.env.DB_HOST,
      port: process.env.PROD_DB_PORT || process.env.DB_PORT || 5432,
      database: process.env.PROD_DB_NAME || process.env.DB_NAME_PROD || 'torn_dashboard_prod',
      user: process.env.PROD_DB_USER || process.env.DB_USER,
      password: process.env.PROD_DB_PASSWORD || process.env.DB_PASSWORD,
      charset: 'utf8',
      ssl: { rejectUnauthorized: false }
    },
    migrations: {
      directory: path.join(__dirname, 'db/migrations')
    },
    seeds: {
      directory: path.join(__dirname, 'db/seeds')
    },
    pool: {
      min: 2,
      max: 20,
      idleTimeoutMillis: 30000, // Automatically close idle connections after 30 seconds
      acquireTimeoutMillis: 60000 // Acquisition timeout after 60 seconds
    },
    debug: false
  }
};
