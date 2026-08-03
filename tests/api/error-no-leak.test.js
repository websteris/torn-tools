/**
 * @jest-environment node
 *
 * A 5xx response must never carry raw internal error text to the client (#40,
 * criteria 2 + 4 — CWE-209). The api-keys and data routes used to attach
 * `error: error.message` / `message: error.message` on every 500, exposing
 * DB/crypto internals; not-found was detected by string-matching a message that
 * also names the internal user id. These tests force each failure and assert the
 * sensitive text is absent, and that not-found now flows through a typed code.
 */
process.env.NODE_ENV = 'test';

jest.mock('../../services/auth/auth-service', () => ({ verifyToken: jest.fn() }));
jest.mock('../../db/models/api-key', () => ({
  findByUserId: jest.fn(), findById: jest.fn(), create: jest.fn(),
  update: jest.fn(), delete: jest.fn(), getKeyValue: jest.fn(),
}));
jest.mock('../../services/data/data-service', () => ({
  getUserData: jest.fn(), getFactionData: jest.fn(), getTornData: jest.fn(),
}));

const request = require('supertest');
const authService = require('../../services/auth/auth-service');
const apiKeyModel = require('../../db/models/api-key');
const dataService = require('../../services/data/data-service');
const app = require('../../server');

const COOKIE = 'session_token=jwt';
// A string no client should ever see — stands in for DB/crypto internals.
const SECRET_INTERNALS = 'SQLITE_ERROR: no such column encryption_key_material';

beforeEach(() => {
  jest.clearAllMocks();
  authService.verifyToken.mockResolvedValue({ player_id: 1, username: 'u', torn_id: 1 });
});

function assertNoLeak(res, sensitive) {
  expect(res.status).toBe(500);
  expect(res.body.success).toBe(false);
  expect(res.body.error).toBeUndefined();          // the leaking field is gone
  expect(JSON.stringify(res.body)).not.toContain(sensitive);
}

describe('api-keys: a forced DB failure does not leak internals on 5xx', () => {
  test('GET /api/keys', async () => {
    apiKeyModel.findByUserId.mockRejectedValue(new Error(SECRET_INTERNALS));
    const res = await request(app).get('/api/keys').set('Cookie', COOKIE);
    assertNoLeak(res, SECRET_INTERNALS);
    expect(res.body.message).toBe('Failed to retrieve API keys');
  });

  test('POST /api/keys', async () => {
    apiKeyModel.create.mockRejectedValue(new Error(SECRET_INTERNALS));
    const res = await request(app).post('/api/keys').set('Cookie', COOKIE)
      .send({ key_name: 'k', key_value: 'AAAAAAAAAAAAAAAA' });
    assertNoLeak(res, SECRET_INTERNALS);
  });

  test('POST /api/keys/:id/verify', async () => {
    apiKeyModel.getKeyValue.mockRejectedValue(new Error(SECRET_INTERNALS));
    const res = await request(app).post('/api/keys/5/verify').set('Cookie', COOKIE).send({});
    assertNoLeak(res, SECRET_INTERNALS);
  });
});

describe('api-keys: not-found flows through a typed code, not string-matching', () => {
  test('PUT /api/keys/:id -> 404 without echoing the internal user id', async () => {
    const err = new Error('API key with ID 5 not found for user 1');
    err.code = 'NOT_FOUND';
    apiKeyModel.update.mockRejectedValue(err);
    const res = await request(app).put('/api/keys/5').set('Cookie', COOKIE)
      .send({ active: true });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('API key not found');
    expect(JSON.stringify(res.body)).not.toContain('for user'); // no internal id leak
  });

  test('DELETE /api/keys/:id -> 404', async () => {
    const err = new Error('API key with ID 5 not found for user 1');
    err.code = 'NOT_FOUND';
    apiKeyModel.delete.mockRejectedValue(err);
    const res = await request(app).delete('/api/keys/5').set('Cookie', COOKIE);
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('API key not found');
  });

  test('a genuine DB error (no NOT_FOUND code) still 500s, not 404', async () => {
    apiKeyModel.delete.mockRejectedValue(new Error(SECRET_INTERNALS));
    const res = await request(app).delete('/api/keys/5').set('Cookie', COOKIE);
    assertNoLeak(res, SECRET_INTERNALS);
  });
});

describe('data: a forced service failure does not leak internals on 5xx', () => {
  test('GET /api/data/user', async () => {
    dataService.getUserData.mockRejectedValue(new Error(SECRET_INTERNALS));
    const res = await request(app).get('/api/data/user').set('Cookie', COOKIE);
    assertNoLeak(res, SECRET_INTERNALS);
    expect(res.body.message).toBe('Error fetching user data');
  });
});
