/**
 * @jest-environment node
 *
 * Route-layer coverage for api/api-keys.js after #36 replaced the placeholder
 * `authenticateUser` (which hard-coded req.userId=1) with the real `authenticate`
 * middleware. Every /api/keys route now requires a valid session; records are
 * scoped to the authenticated user (the model filters by user_id).
 *
 * The auth service (verifyToken) and the key model are mocked — no DB / jwt.
 */
process.env.NODE_ENV = 'test';

jest.mock('../../services/auth/auth-service', () => ({ verifyToken: jest.fn() }));
jest.mock('../../db/models/api-key', () => ({
  findByUserId: jest.fn(), findById: jest.fn(), create: jest.fn(),
  update: jest.fn(), delete: jest.fn(), getKeyValue: jest.fn(),
}));

const request = require('supertest');
const authService = require('../../services/auth/auth-service');
const apiKeyModel = require('../../db/models/api-key');
const app = require('../../server');

const COOKIE = 'session_token=jwt.tok';

beforeEach(() => jest.clearAllMocks());

// A valid session resolves to this account.
function authAs(playerId) {
  authService.verifyToken.mockResolvedValue({ player_id: playerId, username: 'u', torn_id: 1 });
}

// Every protected route, method + path, with a representative id where needed.
const ROUTES = [
  ['get', '/api/keys'],
  ['get', '/api/keys/5'],
  ['post', '/api/keys'],
  ['put', '/api/keys/5'],
  ['delete', '/api/keys/5'],
  ['post', '/api/keys/5/verify'],
];

describe('API: /api/keys requires authentication (#36)', () => {
  test.each(ROUTES)('%s %s with no session cookie -> 401', async (method, path) => {
    const res = await request(app)[method](path).send({});
    expect(res.status).toBe(401);
    // The placeholder used to let this through as user 1 — the model must never
    // be reached unauthenticated now.
    expect(apiKeyModel.findByUserId).not.toHaveBeenCalled();
    expect(apiKeyModel.findById).not.toHaveBeenCalled();
  });

  test.each(ROUTES)('%s %s with an invalid token -> 401', async (method, path) => {
    authService.verifyToken.mockRejectedValue(new Error('jwt expired'));
    const res = await request(app)[method](path).set('Cookie', COOKIE).send({});
    expect(res.status).toBe(401);
  });
});

describe('API: /api/keys is scoped to the authenticated user (#36)', () => {
  test('GET /api/keys returns the authenticated user\'s keys (not a hard-coded id)', async () => {
    authAs(42);
    apiKeyModel.findByUserId.mockResolvedValue([{ id: 1, key_name: 'Primary' }]);
    const res = await request(app).get('/api/keys').set('Cookie', COOKIE);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // The identity flows from the validated token (player_id 42), never req.userId=1.
    expect(apiKeyModel.findByUserId).toHaveBeenCalledWith(42);
  });

  test('GET /api/keys/:id for another user\'s key -> 404 (model filters by user_id)', async () => {
    authAs(42);
    apiKeyModel.findById.mockResolvedValue(null); // not found for this user_id
    const res = await request(app).get('/api/keys/999').set('Cookie', COOKIE);
    expect(res.status).toBe(404);
    expect(apiKeyModel.findById).toHaveBeenCalledWith('999', 42);
  });

  test('GET /api/keys model error -> 500 route-level shape', async () => {
    authAs(42);
    apiKeyModel.findByUserId.mockRejectedValue(new Error('db down'));
    const res = await request(app).get('/api/keys').set('Cookie', COOKIE);
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/keys authed with missing required fields -> 4xx (not 500)', async () => {
    authAs(42);
    const res = await request(app).post('/api/keys').set('Cookie', COOKIE).send({});
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(apiKeyModel.create).not.toHaveBeenCalled();
  });
});
