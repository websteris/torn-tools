const db = require('../db');

async function getUserDetailById(player_id) {
  return await db('users').where({ player_id }).first();
}

async function createUserDetail(userData) {
  const userRecord = {
    player_id: userData.player_id,
    name: userData.name,
    raw_data: JSON.stringify(userData)  // storing full API payload as JSON string
  };
  const [newUser] = await db('users').insert(userRecord).returning('*');
  return newUser;
}

async function updateUserDetail(player_id, userData) {
  const userRecord = {
    name: userData.name,
    raw_data: JSON.stringify(userData)
  };
  const [updatedUser] = await db('users')
    .where({ player_id })
    .update(userRecord)
    .returning('*');
  return updatedUser;
}

async function upsertUserDetail(userData) {
  const existingUser = await getUserDetailById(userData.player_id);
  if (existingUser) {
    return await updateUserDetail(userData.player_id, userData);
  } else {
    return await createUserDetail(userData);
  }
}

module.exports = {
  getUserDetailById,
  createUserDetail,
  updateUserDetail,
  upsertUserDetail
}; 