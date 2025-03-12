const fetch = require('node-fetch');
const { validateApiKey } = require('../../../../services/torn-api/validateKey');

jest.mock('node-fetch');
const { Response } = jest.requireActual('node-fetch');

describe('validateApiKey', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return data if access_type is "Public Only"', async () => {
    const fakeData = { access_type: 'Public Only', selections: {} };
    fetch.mockResolvedValueOnce(new Response(JSON.stringify(fakeData), { status: 200 }));

    const result = await validateApiKey('valid-api-key');
    expect(result).toEqual(fakeData);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('should throw error if access_type is not "Public Only"', async () => {
    const fakeData = { access_type: 'Full Access', selections: {} };
    fetch.mockResolvedValueOnce(new Response(JSON.stringify(fakeData), { status: 200 }));

    await expect(validateApiKey('invalid-api-key')).rejects.toThrow('API key access type "Full Access" is not allowed. Only Public Only keys are permitted.');
  });

  it('should throw error if fetch returns non-ok response', async () => {
    fetch.mockResolvedValueOnce(new Response(null, { status: 500, statusText: 'Internal Server Error' }));

    await expect(validateApiKey('any-key')).rejects.toThrow('Error validating API key: Internal Server Error');
  });

  it('should call fetch with the correct URL', async () => {
    const fakeData = { access_type: 'Public Only', selections: {} };
    fetch.mockResolvedValueOnce(new Response(JSON.stringify(fakeData), { status: 200 }));

    await validateApiKey('my-test-key');
    expect(fetch).toHaveBeenCalledWith('https://api.torn.com/key/?key=my-test-key&selections=info');
  });

  it('should throw an error if fetch rejects with an error', async () => {
    fetch.mockRejectedValueOnce(new Error('Network failure'));

    await expect(validateApiKey('any-key')).rejects.toThrow('Network failure');
  });

  it('should throw an error if JSON parsing fails', async () => {
    fetch.mockResolvedValueOnce(new Response('invalid json data', { status: 200 }));

    await expect(validateApiKey('any-key')).rejects.toThrow();
  });
}); 