/**
 * @jest-environment node
 *
 * War-tracker against the REAL runtime schema (#44). #39's war-tracker.db.test.js
 * hand-writes a faction_wars DDL, so it can't catch schema/code divergence — and
 * it hid a real bug: db/schema.js initializeSchema() (the runtime sqlite init)
 * never created faction_wars OR faction_war_factions at all, so war-tracker's
 * writes/reads silently failed on a real DB.
 *
 * This test points DB_PATH at a throwaway sqlite file, builds the schema with the
 * actual initializeSchema(), then drives war-tracker through getConnection() (the
 * same path production uses). If schema and code ever diverge again, the round-trip
 * breaks here. Network-free (territory/ranked processing needs no Torn API call),
 * default suite, deterministic.
 */
process.env.NODE_ENV = 'test';

const os = require('os');
const path = require('path');
const fs = require('fs');

// DB_PATH is captured when db/schema.js is required, so set it BEFORE requiring.
const DB_FILE = path.join(os.tmpdir(), `war-tracker-schema-${process.pid}.db`);
process.env.DB_PATH = DB_FILE;

jest.mock('../../../../utils/logger', () => ({
  logger: { error: jest.fn(), debug: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

const { logger } = require('../../../../utils/logger');
const { initializeSchema } = require('../../../../db/schema');
const warTracker = require('../../../../services/faction-tracker/war-tracker');

const NOW = 1_700_000_000; // fixed epoch seconds; determinism over new Date()

beforeAll(async () => {
  if (fs.existsSync(DB_FILE)) fs.unlinkSync(DB_FILE);
  await initializeSchema(); // build faction_wars + faction_war_factions the real way
});

afterAll(() => {
  if (fs.existsSync(DB_FILE)) fs.unlinkSync(DB_FILE);
});

beforeEach(() => jest.clearAllMocks());

describe('war-tracker round-trips against the real initializeSchema() schema', () => {
  test('a territory war persists to faction_wars and reads back', async () => {
    await warTracker.processSpecificWarData(1000, 8001, 'territory', {
      defending: true, assaulting: false, score: 42,
      start: NOW - 100, end: 0, territory: 'AAA',
      assaulting_faction: 2000, defending_faction: 1000, winner: 0,
    });

    const active = await warTracker.getActiveWars(1000);
    expect(active.some((w) => w.war_id === 8001)).toBe(true);
    const row = active.find((w) => w.war_id === 8001);
    expect(row.war_type).toBe('territory');
    expect(row.defending_faction).toBe(1000);
    expect(row.assaulting_faction).toBe(2000);

    // No error was swallowed — the whole reason the bug was invisible before.
    expect(logger.error).not.toHaveBeenCalled();
  });

  test('getWarOpponents derives the opponent from the persisted territory row', async () => {
    const opps = await warTracker.getWarOpponents(1000);
    expect(opps.some((o) => Number(o.opponent_id) === 2000)).toBe(true);
    expect(logger.error).not.toHaveBeenCalled();
  });

  test('a ranked war persists both faction_wars and faction_war_factions', async () => {
    await warTracker.processSpecificWarData(1000, 9001, 'ranked', {
      war: { start: NOW - 50, end: 0, target: 5000, winner: 0 },
      factions: {
        1000: { name: 'Us', score: 120, chain: 30 },
        2000: { name: 'Them', score: 90, chain: 12 },
      },
    });

    const details = await warTracker.getWarDetails(9001, 'ranked');
    expect(details).not.toBeNull();
    expect(details.war_id).toBe(9001);
    expect(details.war_type).toBe('ranked');
    // .factions comes from the second table (faction_war_factions) — proves it exists.
    expect(details.factions).toHaveLength(2);
    expect(details.factions.map((f) => f.name).sort()).toEqual(['Them', 'Us']);
    expect(logger.error).not.toHaveBeenCalled();
  });

  test('re-storing the same war_id upserts (INSERT OR REPLACE) rather than duplicating', async () => {
    await warTracker.processSpecificWarData(1000, 8001, 'territory', {
      defending: true, assaulting: false, score: 99,
      start: NOW - 100, end: 0, territory: 'AAA',
      assaulting_faction: 2000, defending_faction: 1000, winner: 0,
    });
    const history = await warTracker.getWarHistory(1000);
    expect(history.filter((w) => w.war_id === 8001)).toHaveLength(1);
    expect(history.find((w) => w.war_id === 8001).score).toBe(99);
  });
});
