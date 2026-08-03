/**
 * @jest-environment node
 *
 * End-to-end proof (through the real express 5 app) that an unparsed request body
 * yields 400, never a 500 — the require-parsed-body guard (#28) short-circuits
 * before any api/ handler can destructure `req.body`. Complements the guard's
 * unit test; this drives actual express-5 body parsing via supertest.
 */
process.env.NODE_ENV = 'test'; // guard app.listen() and background services

const request = require('supertest');
const app = require('../../server');

// Pick body-carrying endpoints on distinct routers so the guard is exercised
// where it's mounted (app-level, before every /api router).
const POST_ENDPOINTS = ['/api/auth/login', '/api/auth/register'];

describe('API: unparsed request body -> 400 (never 500) [#28 e2e]', () => {
  for (const url of POST_ENDPOINTS) {
    test(`POST ${url} with no Content-Type -> 400`, async () => {
      const res = await request(app).post(url).send(); // no body, no content-type
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'malformed or missing request body' });
    });

    test(`POST ${url} with text/plain -> 400`, async () => {
      const res = await request(app).post(url).set('Content-Type', 'text/plain').send('hello');
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'malformed or missing request body' });
    });

    test(`POST ${url} with valid JSON is NOT a body-guard 400/500`, async () => {
      // A parsed body ({} or real) clears the guard and reaches the route, whose
      // own validation may 4xx — but it must never be the guard's 400 or a 500.
      const res = await request(app).post(url).send({});
      expect(res.status).not.toBe(500);
      const guard = res.status === 400 && res.body && res.body.error === 'malformed or missing request body';
      expect(guard).toBe(false);
    });
  }
});
