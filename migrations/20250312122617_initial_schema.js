/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // Users table with authentication fields
    .createTable('users', (table) => {
      table.increments('id').primary();
      table.string('username', 100).notNullable().unique();
      table.string('email', 255).notNullable().unique();
      table.string('password_hash', 255).notNullable();
      table.integer('torn_id').unique();
      table.boolean('is_active').defaultTo(true);
      table.datetime('last_login');
      table.string('reset_token', 255);
      table.datetime('reset_token_expires');
      table.json('profile_data');
      table.timestamps(true, true);
      
      // Add indexes for frequently queried fields
      table.index(['username', 'email', 'torn_id']);
    })
    
    // API keys table with encryption and user relations
    .createTable('api_keys', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable();
      table.string('key_name', 100).notNullable();
      table.text('encrypted_key').notNullable();
      table.text('initialization_vector').notNullable();
      table.boolean('is_active').defaultTo(true);
      table.datetime('last_used');
      table.integer('usage_count').defaultTo(0);
      table.string('api_source', 50).defaultTo('torn');
      table.timestamps(true, true);
      
      // Foreign key to users table
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      
      // Composite unique constraint
      table.unique(['user_id', 'key_name']);
      
      // Index for performance
      table.index(['user_id', 'is_active']);
    })
    
    // Settings table for user preferences
    .createTable('settings', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable();
      table.string('setting_key', 100).notNullable();
      table.text('setting_value');
      table.string('setting_type', 50).defaultTo('string');
      table.boolean('is_global').defaultTo(false);
      table.timestamps(true, true);
      
      // Foreign key to users table
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      
      // Composite unique constraint
      table.unique(['user_id', 'setting_key']);
      
      // Index for performance
      table.index(['user_id', 'is_global']);
    })
    
    // Cached data table for API responses
    .createTable('cached_data', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned();
      table.string('data_type', 100).notNullable();
      table.string('data_key', 255).notNullable();
      table.json('data_value').notNullable();
      table.datetime('expires_at').notNullable();
      table.boolean('is_stale').defaultTo(false);
      table.timestamps(true, true);
      
      // Foreign key to users table (optional relationship - can be null for global cache items)
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      
      // Composite unique constraint
      table.unique(['data_type', 'data_key', 'user_id']);
      
      // Indexes for performance
      table.index(['user_id', 'data_type']);
      table.index('expires_at');
    })
    
    // Modules table for core module definitions
    .createTable('modules', (table) => {
      table.increments('id').primary();
      table.string('module_name', 100).notNullable().unique();
      table.string('display_name', 255).notNullable();
      table.text('description');
      table.string('version', 50).notNullable();
      table.boolean('is_enabled').defaultTo(true);
      table.boolean('is_core').defaultTo(false);
      table.json('default_settings');
      table.timestamps(true, true);
      
      // Index for performance
      table.index(['is_enabled', 'is_core']);
    })
    
    // User modules table for per-user module settings
    .createTable('user_modules', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable();
      table.integer('module_id').unsigned().notNullable();
      table.boolean('is_enabled').defaultTo(true);
      table.json('settings');
      table.timestamps(true, true);
      
      // Foreign keys
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.foreign('module_id').references('id').inTable('modules').onDelete('CASCADE');
      
      // Composite unique constraint
      table.unique(['user_id', 'module_id']);
      
      // Index for performance
      table.index(['user_id', 'is_enabled']);
    })
    
    // Notification settings table
    .createTable('notification_settings', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable();
      table.string('notification_type', 100).notNullable();
      table.boolean('email_enabled').defaultTo(false);
      table.boolean('push_enabled').defaultTo(false);
      table.boolean('in_app_enabled').defaultTo(true);
      table.json('advanced_settings');
      table.timestamps(true, true);
      
      // Foreign key to users table
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      
      // Composite unique constraint
      table.unique(['user_id', 'notification_type']);
      
      // Index for performance
      table.index(['user_id', 'notification_type']);
    })
    
    // Flight data table
    .createTable('flight_data', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable();
      table.datetime('departure_time').notNullable();
      table.datetime('arrival_time').notNullable();
      table.string('departure_location', 100);
      table.string('destination', 100);
      table.string('status', 50).defaultTo('scheduled');
      table.integer('torn_flight_id');
      table.json('additional_data');
      table.timestamps(true, true);
      
      // Foreign key to users table
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      
      // Indexes for performance
      table.index(['user_id', 'status']);
      table.index(['departure_time', 'arrival_time']);
      table.index('torn_flight_id');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  // Drop tables in reverse order to avoid foreign key constraints
  return knex.schema
    .dropTableIfExists('flight_data')
    .dropTableIfExists('notification_settings')
    .dropTableIfExists('user_modules')
    .dropTableIfExists('modules')
    .dropTableIfExists('cached_data')
    .dropTableIfExists('settings')
    .dropTableIfExists('api_keys')
    .dropTableIfExists('users');
};
