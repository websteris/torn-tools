/**
 * @jest-environment node
 *
 * SQL-injection regression for getApiKeyForUsers (#57). The user_id IN (...) list
 * was built by splicing userIds.join(',') straight into the SQL text. This asserts
 * the clause is now parameterized with '?' placeholders bound to validated integer
 * ids, so a hostile "id" can neither reach the statement nor alter it.
 */
process.env.NODE_ENV = 'test';

jest.mock('../../../../db/schema', () => ({ getConnection: jest.fn() }));
jest.mock('../../../../db/models/api-key', () => ({ getKeyValue: jest.fn() }));
jest.mock('../../../../utils/logger', () => ({
  logger: { error: jest.fn(), debug: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

const { getConnection } = require('../../../../db/schema');
const apiKeyModel = require('../../../../db/models/api-key');
const keyManager = require('../../../../services/faction-tracker/api-key-manager');

// A fake connection that captures the last db.all(sql, params, cb) and returns no rows.
function fakeDb() {
  const calls = [];
  return {
    calls,
    all(sql, params, cb) {
      calls.push({ sql, params });
      cb(null, []);
    },
    close() {},
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  keyManager.clearAllKeyCaches();      // ensure the DB path runs (no cache hits)
  apiKeyModel.getKeyValue.mockResolvedValue(null);
});

describe('getApiKeyForUsers builds a parameterized IN clause (#57)', () => {
  test('valid ids become bound "?" placeholders, not interpolated text', async () => {
    const db = fakeDb();
    getConnection.mockReturnValue(db);

    await keyManager.getApiKeyForUsers([1, 2, 3]);

    expect(db.calls).toHaveLength(1);
    const { sql, params } = db.calls[0];
    expect(sql).toMatch(/IN \(\?,\?,\?\)/);              // one placeholder per id
    expect(sql).not.toMatch(/IN \(1,2,3\)/);             // NOT spliced in
    expect(params).toEqual([1, 2, 3]);                   // ids passed as bind params
  });

  test('a hostile "id" cannot alter the query (rejected, never in the SQL)', async () => {
    const db = fakeDb();
    getConnection.mockReturnValue(db);

    await keyManager.getApiKeyForUsers(['1) OR 1=1 --', 7]);

    const { sql, params } = db.calls[0];
    expect(sql).not.toContain('OR 1=1');                 // the payload never reaches the SQL text
    expect(sql).toMatch(/IN \(\?\)/);                    // only the one valid id survived
    expect(params).toEqual([7]);                         // hostile string dropped, not coerced to 1
  });

  test('numeric strings are accepted and bound', async () => {
    const db = fakeDb();
    getConnection.mockReturnValue(db);

    await keyManager.getApiKeyForUsers(['10', '20']);

    expect(db.calls[0].params).toEqual([10, 20]);
  });

  test('when every id is invalid, no query runs', async () => {
    const db = fakeDb();
    getConnection.mockReturnValue(db);

    const result = await keyManager.getApiKeyForUsers(['abc', '1;DROP TABLE api_keys', -5]);

    expect(db.calls).toHaveLength(0);                    // nothing hit the DB
    expect(result).toBeNull();
  });
});
