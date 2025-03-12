/**
 * @file Initial database migration
 * @description Creates the initial tables for the Torn Dashboard
 */

/**
 * @param {import('knex')} knex - Knex instance
 * @returns {Promise} Promise resolving when migration is complete
 */
exports.up = function(knex) {
  return Promise.all([
    // Users table
    knex.schema.createTable('users', table => {
      table.integer('id').primary(); // Torn player ID
      table.string('name').notNullable();
      table.string('email').unique();
      table.string('role').defaultTo('user');
      table.jsonb('raw_data'); // Raw data from Torn API
      table.timestamps(true, true);
    }),
    
    // User accounts table (for authentication)
    knex.schema.createTable('user_accounts', table => {
      table.integer('player_id').primary(); // Torn player ID
      table.string('name').notNullable();
      table.string('username').unique().notNullable();
      table.string('password_hash').notNullable();
      table.jsonb('preferences').defaultTo('{}');
      table.jsonb('raw_data'); // Raw data from Torn API
      table.timestamps(true, true);
    }),
    
    // Factions table
    knex.schema.createTable('factions', table => {
      table.integer('id').primary(); // Torn faction ID
      table.string('name').notNullable();
      table.string('tag');
      table.integer('leader_id');
      table.integer('co_leader_id');
      table.integer('member_count');
      table.bigInteger('respect');
      table.jsonb('raw_data'); // Raw data from Torn API
      table.timestamps(true, true);
    }),
    
    // Faction wars table
    knex.schema.createTable('faction_wars', table => {
      table.integer('faction_id').notNullable();
      table.integer('opponent_id').notNullable();
      table.string('opponent_name');
      table.timestamp('start_time');
      table.timestamp('end_time');
      table.integer('faction_score').defaultTo(0);
      table.integer('opponent_score').defaultTo(0);
      table.string('status').defaultTo('active');
      table.jsonb('raw_data'); // Raw data from Torn API
      table.timestamps(true, true);
      
      // Composite primary key
      table.primary(['faction_id', 'opponent_id']);
      
      // Foreign key to factions table
      table.foreign('faction_id').references('id').inTable('factions').onDelete('CASCADE');
    })
  ]);
};

/**
 * @param {import('knex')} knex - Knex instance
 * @returns {Promise} Promise resolving when rollback is complete
 */
exports.down = function(knex) {
  return Promise.all([
    knex.schema.dropTableIfExists('faction_wars'),
    knex.schema.dropTableIfExists('factions'),
    knex.schema.dropTableIfExists('user_accounts'),
    knex.schema.dropTableIfExists('users')
  ]);
}; 