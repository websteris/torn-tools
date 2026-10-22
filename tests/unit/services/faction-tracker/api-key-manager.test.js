/**
 * @jest-environment node
 */

// Mock dependencies first
jest.mock('../../../../db/schema', () => ({
  getConnection: jest.fn()
}));

jest.mock('../../../../db/models/api-key', () => ({
  getKeyValue: jest.fn()
}));

jest.mock('../../../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
  }
}));

// Import modules after mocking
const apiKeyManager = require('../../../../services/faction-tracker/api-key-manager');
const apiKeyModel = require('../../../../db/models/api-key');
const { getConnection } = require('../../../../db/schema');

describe('Module: ApiKeyManager', () => {
  let mockDb;

  beforeEach(() => {
    jest.clearAllMocks();
    apiKeyManager.clearAllKeyCaches();

    mockDb = {
      all: jest.fn((query, params, callback) => callback(null, [{ id: 7, user_id: 2 }])),
      get: jest.fn(),
      close: jest.fn()
    };
    getConnection.mockReturnValue(mockDb);
    apiKeyModel.getKeyValue.mockResolvedValue('key-for-2');
  });

  describe('getApiKeyForUsers', () => {
    test('binds every id as a parameter instead of splicing it into the SQL', async () => {
      const apiKey = await apiKeyManager.getApiKeyForUsers([101, 202, 303]);

      expect(apiKey).toBe('key-for-2');
      expect(mockDb.all).toHaveBeenCalledTimes(1);
      const [query, params] = mockDb.all.mock.calls[0];
      expect(query).toMatch(/user_id IN \(\?,\?,\?\)/);
      expect(query).not.toMatch(/101|202|303/);
      expect(params).toEqual([101, 202, 303]);
    });

    test('normalizes digit-string ids to integers', async () => {
      await apiKeyManager.getApiKeyForUsers(['10', 20]);

      const [query, params] = mockDb.all.mock.calls[0];
      expect(query).toMatch(/user_id IN \(\?,\?\)/);
      expect(params).toEqual([10, 20]);
    });

    test('rejects a hostile id without running any query', async () => {
      const apiKey = await apiKeyManager.getApiKeyForUsers([1, '1) OR 1=1 --']);

      expect(apiKey).toBeNull();
      expect(getConnection).not.toHaveBeenCalled();
      expect(mockDb.all).not.toHaveBeenCalled();
    });

    test.each([
      ['a fractional number', 1.5],
      ['zero', 0],
      ['a negative number', -4],
      ['NaN', NaN],
      ['an object', { toString: () => '1' }],
      ['a signed string', '-1'],
      ['an empty string', '']
    ])('rejects %s', async (_label, badId) => {
      const apiKey = await apiKeyManager.getApiKeyForUsers([1, badId]);

      expect(apiKey).toBeNull();
      expect(mockDb.all).not.toHaveBeenCalled();
    });

    test('returns null for an empty or missing id list', async () => {
      expect(await apiKeyManager.getApiKeyForUsers([])).toBeNull();
      expect(await apiKeyManager.getApiKeyForUsers(undefined)).toBeNull();
      expect(await apiKeyManager.getApiKeyForUsers('1,2')).toBeNull();
      expect(mockDb.all).not.toHaveBeenCalled();
    });
  });
});
