/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('user_accounts', (table) => {
    // Add indexes if they don't exist
    table.index(['player_id'], 'user_accounts_player_id_index');
    table.index(['username'], 'user_accounts_username_index');
    
    // Ensure preferences has a default value
    knex.raw('ALTER TABLE user_accounts ALTER COLUMN preferences SET DEFAULT \'{}\'::jsonb');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('user_accounts', (table) => {
    // Drop the indexes we added
    table.dropIndex(['player_id'], 'user_accounts_player_id_index');
    table.dropIndex(['username'], 'user_accounts_username_index');
    
    // Reset preferences default
    knex.raw('ALTER TABLE user_accounts ALTER COLUMN preferences DROP DEFAULT');
  });
};

