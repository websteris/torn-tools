/**
 * @module Database
 * @description Database connection configuration
 */

const knex = require('knex');
const path = require('path');
const logger = require('../utils/logger').logger;

// Determine environment
const env = process.env.NODE_ENV || 'development';

// Load configuration
let config;
try {
  config = require('../knexfile')[env];
} catch (error) {
  logger.warn(`Could not load knexfile for environment ${env}: ${error.message}`);
  
  // Default configuration for different environments
  const defaultConfigs = {
    development: {
      client: 'sqlite3',
      connection: {
        filename: path.join(__dirname, '../dev.sqlite3')
      },
      useNullAsDefault: true,
      migrations: {
        directory: path.join(__dirname, 'migrations')
      },
      seeds: {
        directory: path.join(__dirname, 'seeds')
      }
    },
    test: {
      client: 'sqlite3',
      connection: {
        filename: ':memory:'
      },
      useNullAsDefault: true,
      migrations: {
        directory: path.join(__dirname, 'migrations')
      },
      seeds: {
        directory: path.join(__dirname, 'seeds')
      }
    },
    production: {
      client: 'pg',
      connection: process.env.DATABASE_URL,
      migrations: {
        directory: path.join(__dirname, 'migrations')
      },
      seeds: {
        directory: path.join(__dirname, 'seeds')
      }
    }
  };
  
  config = defaultConfigs[env] || defaultConfigs.development;
  logger.info(`Using default database configuration for ${env} environment`);
}

// Initialize database connection
const db = knex(config);

// Log database connection
logger.info(`Connected to ${config.client} database in ${env} environment`);

// Export database connection
module.exports = db; 