/**
 * @jest-environment node
 *
 * SSRF regression for the standalone helpers + validateKey (#56). PR #51 hardened
 * TornApiClient._buildUrl; these exported helpers used to be a parallel raw-fetch
 * path that bypassed it. Now they route through the client, so a hostile id/
 * selection can't redirect the request to another host. We run the REAL _buildUrl
 * (only the HTTP transport is stubbed) and assert every helper's request still
 * resolves to api.torn.com.
 */
jest.mock('axios');
jest.mock('node-cache');
jest.mock('../../../../utils/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const axios = require('axios');
const NodeCache = require('node-cache');

// Capture the base-relative URL each request would send; resolve it as axios would.
const httpGet = jest.fn().mockResolvedValue({ data: {} });
axios.create.mockReturnValue({ get: httpGet, interceptors: { response: { use: jest.fn() } } });
NodeCache.mockImplementation(() => ({
  get: jest.fn(), set: jest.fn(), del: jest.fn(), flushAll: jest.fn(), options: { stdTTL: 60 },
}));

const { getUserData, getFactionData, getWarOpponents } = require('../../../../services/torn-api/client');
const { validateApiKey } = require('../../../../services/torn-api/validateKey');

function lastRequestHost() {
  const calls = httpGet.mock.calls;
  const url = calls[calls.length - 1][0];
  return new URL(url, 'https://api.torn.com').host;
}

const HOSTILE = ['https://evil.example/', '../admin', '?a=b', '//evil.example/x'];

describe('standalone helpers neutralize hostile URL segments (#56)', () => {
  test('getFactionData: a hostile factionId never changes the request host', async () => {
    for (const bad of HOSTILE) {
      httpGet.mockClear();
      await getFactionData('key', bad, []).catch(() => {});
      expect(httpGet).toHaveBeenCalled();
      expect(lastRequestHost()).toBe('api.torn.com');
    }
  });

  test('getUserData: hostile selections never change the request host', async () => {
    httpGet.mockClear();
    await getUserData('key', ['profile&key=leak', 'https://evil.example/']).catch(() => {});
    expect(lastRequestHost()).toBe('api.torn.com');
  });

  test('getWarOpponents: request stays on api.torn.com', async () => {
    httpGet.mockClear();
    await getWarOpponents('key').catch(() => {});
    expect(lastRequestHost()).toBe('api.torn.com');
  });

  test('validateApiKey: request stays on api.torn.com', async () => {
    httpGet.mockClear();
    await validateApiKey('some-key').catch(() => {});
    expect(lastRequestHost()).toBe('api.torn.com');
  });
});
