/**
 * @jest-environment node
 *
 * Default-suite coverage for the polling service singleton (#39): scheduling
 * (start/stop/idempotency), timer-driven poll cycles (fake timers, no waiting),
 * the DB-reader helpers, and poll-cycle error resilience. No live network:
 * TornApiClient, the key/user models, the DB connection and the logger are mocked.
 */
process.env.NODE_ENV = 'test';

jest.mock('../../../../services/torn-api/client');
jest.mock('../../../../db/models/api-key');
jest.mock('../../../../db/models/user');
jest.mock('../../../../db/schema', () => ({ getConnection: jest.fn() }));
jest.mock('../../../../utils/logger', () => ({
  logger: { error: jest.fn(), debug: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

const { getConnection } = require('../../../../db/schema');
const apiKeyModel = require('../../../../db/models/api-key');
const { logger } = require('../../../../utils/logger');
const polling = require('../../../../services/polling/polling-service');

// A fake sqlite connection: all()/get() invoke their callback with the scripted
// rows or error; close() is a no-op.
function fakeDb({ allRows = [], allErr = null, getRow = null, getErr = null } = {}) {
  return {
    all: (_sql, _params, cb) => cb(allErr, allErr ? undefined : allRows),
    get: (_sql, _params, cb) => cb(getErr, getErr ? undefined : getRow),
    close: () => {},
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  // Default: pollers find nothing, so start()/_initialPoll do no real work.
  getConnection.mockReturnValue(fakeDb({ allRows: [], getRow: null }));
  apiKeyModel.getKeyValue.mockResolvedValue('decrypted-key');
});

afterEach(() => {
  polling.stop();          // never leak intervals between tests
  jest.useRealTimers();
});

describe('scheduling', () => {
  test('start() registers an interval per schedule key and is idempotent', () => {
    polling.start();
    expect(polling.isRunning).toBe(true);
    const keys = Object.keys(polling.pollingIntervals);
    expect(keys.length).toBeGreaterThanOrEqual(8);
    expect(keys).toEqual(expect.arrayContaining(['user_basic', 'user_cooldowns', 'faction_basic', 'torn_items']));

    polling.start(); // second call must not double-register
    expect(Object.keys(polling.pollingIntervals).length).toBe(keys.length);
  });

  test('stop() clears every interval and is idempotent', () => {
    polling.start();
    polling.stop();
    expect(polling.isRunning).toBe(false);
    expect(Object.keys(polling.pollingIntervals)).toHaveLength(0);
    expect(() => polling.stop()).not.toThrow(); // no-op when already stopped
  });

  test('a scheduled interval fires its poller (fake timers, no real waiting)', () => {
    const spy = jest.spyOn(polling, '_pollUserData').mockResolvedValue();
    polling.start();
    spy.mockClear();                         // ignore the immediate _initialPoll call
    jest.advanceTimersByTime(30 * 1000);     // user_cooldowns cadence
    expect(spy).toHaveBeenCalledWith(['cooldowns']);
    spy.mockRestore();
  });
});

describe('DB-reader helpers', () => {
  test('_getActiveUsers decrypts with (api_keys.id, user_id) and keeps the user', async () => {
    getConnection.mockReturnValue(fakeDb({
      allRows: [{ id: 1, username: 'u', torn_id: 5, key_id: 10 }],
    }));
    apiKeyModel.getKeyValue.mockResolvedValue('k');
    await expect(polling._getActiveUsers()).resolves.toEqual([
      { id: 1, username: 'u', torn_id: 5, apiKey: 'k' },
    ]);
    // The bug (#55): getKeyValue was called (user_id, user_id) — the KEY row id
    // must be the api_keys.id (key_id), with the user id second.
    expect(apiKeyModel.getKeyValue).toHaveBeenCalledWith(10, 1);
  });

  test('_getActiveUsers resolves [] when there are no rows', async () => {
    getConnection.mockReturnValue(fakeDb({ allRows: [] }));
    await expect(polling._getActiveUsers()).resolves.toEqual([]);
  });

  test('_getActiveUsers rejects on a DB error', async () => {
    getConnection.mockReturnValue(fakeDb({ allErr: new Error('db down') }));
    await expect(polling._getActiveUsers()).rejects.toThrow('db down');
  });

  test('_getAnyValidApiKey returns the decrypted key for a row, null for none', async () => {
    getConnection.mockReturnValue(fakeDb({ getRow: { id: 1, user_id: 1, key_value: 'x' } }));
    apiKeyModel.getKeyValue.mockResolvedValue('K');
    await expect(polling._getAnyValidApiKey()).resolves.toBe('K');

    getConnection.mockReturnValue(fakeDb({ getRow: null }));
    await expect(polling._getAnyValidApiKey()).resolves.toBeNull();
  });

  test('_getActiveFactions resolves an array without throwing', async () => {
    getConnection.mockReturnValue(fakeDb({ allRows: [] }));
    await expect(polling._getActiveFactions()).resolves.toEqual(expect.any(Array));
  });

  test('_getActiveFactions decrypts with (api_keys.id, user_id) and keeps the faction', async () => {
    getConnection.mockReturnValue(fakeDb({
      allRows: [{ faction_id: 500, faction_name: 'F', user_id: 1, key_id: 10 }],
    }));
    apiKeyModel.getKeyValue.mockResolvedValue('k');
    await expect(polling._getActiveFactions()).resolves.toEqual([
      { faction_id: 500, faction_name: 'F', apiKey: 'k' },
    ]);
    // The bug (#55): getKeyValue got row.id (undefined) twice -> always "not
    // found" -> every faction silently skipped. Must be (key_id, user_id).
    expect(apiKeyModel.getKeyValue).toHaveBeenCalledWith(10, 1);
  });

  test('_getActiveFactions query dedupes by faction (GROUP BY), not by member key', async () => {
    // Pin the intended shape: one row per faction. Capture the SQL the helper runs.
    let sql = '';
    getConnection.mockReturnValue({
      all: (q, _params, cb) => { sql = q; cb(null, []); },
      close: () => {},
    });
    await polling._getActiveFactions();
    expect(sql).toMatch(/GROUP BY\s+u\.faction_id/i);
    expect(sql).not.toMatch(/DISTINCT/i);
  });
});

describe('poll-cycle resilience', () => {
  test('a Torn API error during a poll is logged and does not throw', async () => {
    getConnection.mockReturnValue(fakeDb({ allRows: [{ id: 1, username: 'u', torn_id: 5 }] }));
    apiKeyModel.getKeyValue.mockResolvedValue('k');
    polling.apiClient.getUserData.mockRejectedValue(new Error('torn 500'));

    await expect(polling._pollUserData(['profile'])).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalled(); // per-user failure logged, loop continues
  });
});
