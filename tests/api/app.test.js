/**
 * @jest-environment node
 *
 * App-level route contract: the /api index (root listing), the JSON 404 handler,
 * and the global error handler's safe 500 shape (no stack leak). No service mocks
 * needed — these paths don't touch the DB.
 */
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../../server');

describe('API: app-level contract', () => {
  test('GET /health -> 200 ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', message: 'Server is running' });
  });

  test('GET /api/ -> 200 with the endpoint listing', async () => {
    const res = await request(app).get('/api/');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Torn Dashboard API');
    expect(Array.isArray(res.body.endpoints)).toBe(true);
    expect(res.body.endpoints).toContain('/api/auth/login');
  });

  test('unknown /api route -> 404 JSON shape (not HTML)', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.message).toMatch(/not found/i);
  });

  test('malformed JSON body -> 400 (parse-error handler), no stack/error leak', async () => {
    // Malformed JSON makes body-parser throw a SyntaxError (type entity.parse.failed).
    // The bodyParseErrorHandler maps that to a uniform 400 — the same signal as the
    // undefined-body guard — instead of a generic 500. Assert 400 and that neither a
    // stack nor the raw SyntaxError text leaks into the response.
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{ this is not json');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'malformed or missing request body' },
    });
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toMatch(/stack/i);
    expect(serialized).not.toMatch(/SyntaxError/);
    expect(serialized).not.toMatch(/\bat \/?\w/); // no "at <frame>" stack lines
  });
});
