// validateApiKey now routes through the hardened TornApiClient (#56) instead of a
// raw node-fetch URL, so we mock the client and assert it's driven via the
// origin/encoding-checked request() path (section 'key', selections ['info']).
jest.mock('../../../../services/torn-api/client');
const TornApiClient = require('../../../../services/torn-api/client');
const { validateApiKey } = require('../../../../services/torn-api/validateKey');

describe('validateApiKey (routed through the hardened client)', () => {
  // validateKey caches one shared client, so keep a single request mock and
  // reconfigure it per test rather than swapping the instance.
  const request = jest.fn();

  beforeAll(() => {
    TornApiClient.mockImplementation(() => ({ request }));
  });

  beforeEach(() => {
    request.mockReset();
  });

  it('returns data when access_type is "Public Only"', async () => {
    const data = { access_type: 'Public Only', selections: {} };
    request.mockResolvedValue(data);
    await expect(validateApiKey('valid-api-key')).resolves.toEqual(data);
  });

  it('drives the request through the hardened client (section key, info)', async () => {
    request.mockResolvedValue({ access_type: 'Public Only' });
    await validateApiKey('my-test-key');
    expect(request).toHaveBeenCalledWith(expect.objectContaining({
      section: 'key', apiKey: 'my-test-key', selections: ['info'],
    }));
  });

  it('throws if access_type is not "Public Only"', async () => {
    request.mockResolvedValue({ access_type: 'Full Access', selections: {} });
    await expect(validateApiKey('higher-access')).rejects.toThrow(
      'API key access type "Full Access" is not allowed. Only Public Only keys are permitted.');
  });

  it('throws on a Torn API error body (e.g. an invalid key)', async () => {
    request.mockResolvedValue({ error: { code: 2, error: 'Incorrect key' } });
    await expect(validateApiKey('bad-key')).rejects.toThrow(
      'Error validating API key: Incorrect key');
  });

  it('propagates a transport/HTTP error from the client', async () => {
    request.mockRejectedValue(new Error('API request failed: Network failure'));
    await expect(validateApiKey('any-key')).rejects.toThrow('API request failed: Network failure');
  });
});
