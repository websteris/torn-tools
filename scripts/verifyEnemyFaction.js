#!/usr/bin/env node
/*
 * This script verifies that the saved test API key can retrieve enemy faction data, specifically checking for the presence of 'Excalibur'.
 * Usage: node scripts/verifyEnemyFaction.js
 */

const { getWarOpponents } = require('../server/services/torn-api/client');

async function run() {
  try {
    console.log('Fetching enemy factions using your saved test API key...');
    const warOpponents = await getWarOpponents();
    // Assuming warOpponents is an array of faction objects with a 'name' property
    const targetFaction = warOpponents.find(faction => faction.name === 'Excalibur');
    if (targetFaction) {
      console.log('Success! Found enemy faction Excalibur:', targetFaction);
    } else {
      console.log('Enemy faction Excalibur not found.');
    }
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

run(); 