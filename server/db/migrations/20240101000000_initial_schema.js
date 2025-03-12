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