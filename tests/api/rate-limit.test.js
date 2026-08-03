/**
 * @jest-environment node
 *
 * Inbound rate limiting (#37). The limiter is effectively unlimited under
 * NODE_ENV=test by default (so the rest of the suite isn't tripped); this file
 * sets a low strict max BEFORE requiring the app so it can exercise the 429 path.
 */
process.env.NODE_ENV = 'test';
process.env.RATE_LIMIT_STRICT_MAX = '2';   // strict tier: 2 requests / window
process.env.RATE_LIMIT_MAX = '1000000';    // keep the general tier out of the way

const request = require('supertest');
const app = require('../../server');

async function hammer(method, path, n) {
  const results = [];
  for (let i = 0; i < n; i++) {
    // eslint-disable-next-line no-await-in-loop
    const res = await request(app)[method](path).send({});
    results.push(res);
  }
  return results;
}

describe('API: strict inbound rate limiting (#37)', () => {
  test('POST /api/auth/login -> 429 (JSON + RateLimit headers) once the strict budget is exceeded', async () => {
    const res = await hammer('post', '/api/auth/login', 3); // limit is 2
    // First two are under the limit — the route's own handling (400 missing creds),
    // never the limiter's 429.
    expect(res[0].status).not.toBe(429);
    expect(res[1].status).not.toBe(429);
    // The third trips the limiter.
    const limited = res[2];
    expect(limited.status).toBe(429);
    expect(limited.body).toMatchObject({ success: false, error: { code: 'RATE_LIMITED' } });
    expect(limited.body.error.message).toMatch(/too many requests/i);
    // Standard RateLimit-* headers are present.
    expect(limited.headers).toHaveProperty('ratelimit-limit');
    expect(limited.headers).toHaveProperty('ratelimit-remaining');
  });

  test('GET /api/test/torn-api is covered by the strict limiter', async () => {
    const res = [];
    for (let i = 0; i < 3; i++) {
      // eslint-disable-next-line no-await-in-loop
      res.push(await request(app).get('/api/test/torn-api'));
    }
    // Login already consumed the shared per-IP strict budget in the prior test's
    // window; regardless, exceeding the strict limit on this route yields 429.
    expect(res.some((r) => r.status === 429)).toBe(true);
  });

  test('the general tier does not 429 under its (huge) test budget', async () => {
    // /health is outside /api; /api/ index is under the general tier only. A
    // single request must pass — the limiter is not globally blocking.
    const health = await request(app).get('/health');
    expect(health.status).toBe(200);
  });
});
