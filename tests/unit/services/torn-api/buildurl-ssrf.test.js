/**
 * @jest-environment node
 *
 * SSRF hardening for TornApiClient._buildUrl (#48, CodeQL alert 18,
 * js/request-forgery). A tainted section/id/selection must never be able to
 * redirect the request to another host, rewrite the path root, or inject extra
 * query params — because axios treats an absolute URL as a full override of
 * baseURL, which would send the request (and the API key) elsewhere.
 */
process.env.NODE_ENV = 'test';

const TornApiClient = require('../../../../services/torn-api/client');

const client = new TornApiClient({ baseUrl: 'https://api.torn.com' });
const BASE_ORIGIN = new URL(client.baseUrl).origin;

// Resolve the built (base-relative) URL exactly as axios would, so we can assert
// on the host/path axios ends up requesting.
function resolved(section, id, selections = []) {
  return new URL(client._buildUrl(section, id, selections), client.baseUrl);
}

describe('_buildUrl keeps normal input byte-identical (no behavior change)', () => {
  test('alphanumeric section/id/selections are unchanged', () => {
    expect(client._buildUrl('user', '123', ['profile', 'cooldowns']))
      .toBe('/user/123?selections=profile,cooldowns');
    expect(client._buildUrl('faction', '456', [])).toBe('/faction/456');
  });
});

describe('_buildUrl neutralizes SSRF / traversal / query injection', () => {
  test('an absolute-URL id does not change the request host', () => {
    const u = resolved('user', 'https://evil.example/');
    expect(u.origin).toBe(BASE_ORIGIN);
    expect(u.host).toBe('api.torn.com');
    expect(u.pathname.startsWith('/user/')).toBe(true);
  });

  test('an absolute-URL section does not change the request host', () => {
    const u = resolved('https://evil.example', '1');
    expect(u.origin).toBe(BASE_ORIGIN);
    expect(u.host).toBe('api.torn.com');
  });

  test('a protocol-relative id (//evil) stays on our host', () => {
    const u = resolved('user', '//evil.example/x');
    expect(u.host).toBe('api.torn.com');
  });

  test('a ../ traversal id does not escape the /user/ path root', () => {
    const u = resolved('user', '../admin');
    expect(u.host).toBe('api.torn.com');
    // encoded, so URL resolution can't collapse the .. up a level
    expect(u.pathname).toBe('/user/..%2Fadmin');
  });

  test('an empty section (protocol-relative //host bypass) is refused, not sent to that host', () => {
    // On the old code _buildUrl('', 'evil.example/x') returned '//evil.example/x',
    // which resolves to host evil.example — the actual axios baseURL bypass.
    expect(() => client._buildUrl('', 'evil.example/x')).toThrow(/Refusing to build/);
  });

  test('a legit empty id (the validateKey /key/ path) still builds correctly', () => {
    expect(client._buildUrl('key', '', ['info'])).toBe('/key/?selections=info');
  });

  test('a selection cannot inject an extra query param', () => {
    const u = resolved('user', '1', ['profile&key=leaked']);
    expect(u.searchParams.get('key')).toBeNull();       // no smuggled key param
    expect(u.searchParams.get('selections')).toBe('profile&key=leaked'); // decodes back to the literal
  });
});

describe('request() hands axios a base-relative URL for a malicious id', () => {
  test('http.get receives a URL that resolves to our host', async () => {
    const c = new TornApiClient({ baseUrl: 'https://api.torn.com' });
    c._checkRateLimit = jest.fn().mockResolvedValue();
    c.http = { get: jest.fn().mockResolvedValue({ data: {}, headers: {} }) };

    await c.request({ section: 'user', id: 'https://evil.example/', apiKey: 'k', selections: [] })
      .catch(() => {}); // response shape doesn't matter; we assert the URL axios got

    expect(c.http.get).toHaveBeenCalled();
    const urlArg = c.http.get.mock.calls[0][0];
    expect(new URL(urlArg, c.baseUrl).host).toBe('api.torn.com');
  });
});
