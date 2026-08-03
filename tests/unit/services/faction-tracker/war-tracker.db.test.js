/**
 * @jest-environment node
 *
 * War-tracker DB behavior against a REAL in-memory sqlite connection (#39). The
 * existing war-tracker.test.js mocks getConnection to a canned fake, so its SQL
 * never runs; here getConnection returns a real `:memory:` sqlite database with
 * the schema war-tracker's SQL requires, so storeWarData/getActiveWars/
 * getWarHistory/getWarOpponents actually execute and round-trip. Default suite
 * (not *.integration.test.js), network-free, deterministic.
 */
process.env.NODE_ENV = 'test';

jest.mock('../../../../db/schema', () => ({ getConnection: jest.fn() }));
jest.mock('../../../../utils/logger', () => ({
  logger: { error: jest.fn(), debug: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

const sqlite3 = require('sqlite3').verbose();
const { getConnection } = require('../../../../db/schema');
const warTracker = require('../../../../services/faction-tracker/war-tracker');

const NOW = Math.floor(Date.now() / 1000);
let db;

beforeAll((done) => {
  db = new sqlite3.Database(':memory:');
  // war-tracker calls db.close() after each op; neutralize it so the one shared
  // in-memory database (and its data) survives across calls within a test.
  db.close = () => {};
  // Schema is exactly the columns war-tracker's INSERT/SELECT use (dynamic INSERT
  // in storeWarData; the *_faction / score / *_time columns read by the getters).
  db.serialize(() => {
    db.run(`CREATE TABLE faction_wars (
      war_id INTEGER PRIMARY KEY,
      faction_id INTEGER,
      war_type TEXT,
      timestamp TEXT,
      start_time INTEGER,
      end_time INTEGER,
      target INTEGER,
      winner INTEGER,
      defending INTEGER,
      assaulting INTEGER,
      score INTEGER,
      territory TEXT,
      assaulting_faction INTEGER,
      defending_faction INTEGER,
      raiding_faction INTEGER
    )`, done);
  });
  getConnection.mockReturnValue(db);
});

beforeEach((done) => { db.run('DELETE FROM faction_wars', done); });

function territoryWar(warId, { defending_faction, assaulting_faction, score = 10, end = 0 }) {
  return warTracker.processSpecificWarData(defending_faction, warId, 'territory', {
    defending: true, assaulting: false, score,
    start: NOW - 100, end, territory: 'AAA',
    assaulting_faction, defending_faction, winner: 0,
  });
}

describe('war-tracker DB round-trip (in-memory sqlite)', () => {
  test('processSpecificWarData -> storeWarData persists, getActiveWars reads it back', async () => {
    await territoryWar(555, { defending_faction: 1000, assaulting_faction: 2000 });
    const active = await warTracker.getActiveWars(1000);
    expect(active).toHaveLength(1);
    expect(active[0].war_id).toBe(555);
    expect(active[0].war_type).toBe('territory');
    expect(active[0].defending_faction).toBe(1000);
    expect(active[0].assaulting_faction).toBe(2000);
  });

  test('a finished war (end_time in the past) is not "active"', async () => {
    await territoryWar(556, { defending_faction: 1000, assaulting_faction: 2000, end: NOW - 10 });
    expect(await warTracker.getActiveWars(1000)).toHaveLength(0);
  });

  test('getWarHistory returns finished + active and respects the limit', async () => {
    await territoryWar(1, { defending_faction: 1000, assaulting_faction: 2001, end: NOW - 5 });
    await territoryWar(2, { defending_faction: 1000, assaulting_faction: 2002, end: 0 });
    await territoryWar(3, { defending_faction: 1000, assaulting_faction: 2003, end: NOW - 5 });
    expect(await warTracker.getWarHistory(1000)).toHaveLength(3);      // default limit 10
    expect(await warTracker.getWarHistory(1000, 2)).toHaveLength(2);   // limit respected
  });

  test('getWarOpponents derives the opponent faction for a territory war', async () => {
    await territoryWar(700, { defending_faction: 1000, assaulting_faction: 2000, score: 42 });
    const opps = await warTracker.getWarOpponents(1000);
    expect(opps.some((o) => Number(o.opponent_id) === 2000)).toBe(true);
  });

  test('INSERT OR REPLACE upserts on war_id (re-storing the same war does not duplicate)', async () => {
    await territoryWar(900, { defending_faction: 1000, assaulting_faction: 2000, score: 1 });
    await territoryWar(900, { defending_faction: 1000, assaulting_faction: 2000, score: 99 });
    const rows = await warTracker.getWarHistory(1000);
    expect(rows).toHaveLength(1);
    expect(rows[0].score).toBe(99);
  });
});
