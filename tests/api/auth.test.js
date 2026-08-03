/**
 * @jest-environment node
 *
 * Route-layer coverage for api/auth.js. The auth service is mocked (no DB / no
 * Torn API), so these assert the HTTP contract only: status codes, JSON shape,
 * and that a session cookie is set on success.
 */
process.env.NODE_ENV = 'test';

jest.mock('../../services/auth/auth-service', () => ({
  registerWithApiKey: jest.fn(),
  authenticateWithApiKey: jest.fn(),
}));

const request = require('supertest');
const authService = require('../../services/auth/auth-service');
const app = require('../../server');

const SESSION = { sessionToken: 'tok-123', user: { id: 1, username: 'TestUser' } };

beforeEach(() => jest.clearAllMocks());

describe('API: POST /api/auth/login', () => {
  test('happy path -> 200, sets session cookie', async () => {
    authService.authenticateWithApiKey.mockResolvedValue(SESSION);
    const res = await request(app).post('/api/auth/login').send({ apiKey: 'valid-key' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, user: { id: 1 } });
    expect(res.headers['set-cookie'].join(';')).toMatch(/session_token=/);
  });

  test('missing apiKey -> 400', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ success: false });
    expect(authService.authenticateWithApiKey).not.toHaveBeenCalled();
  });

  test('bad key (service rejects) -> 401', async () => {
    authService.authenticateWithApiKey.mockRejectedValue(new Error('Invalid API key'));
    const res = await request(app).post('/api/auth/login').send({ apiKey: 'nope' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe('API: POST /api/auth/register', () => {
  test('happy path -> 201, sets session cookie', async () => {
    authService.registerWithApiKey.mockResolvedValue(SESSION);
    const res = await request(app).post('/api/auth/register').send({ apiKey: 'k', keyName: 'mine' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ success: true, user: { id: 1 } });
    expect(res.headers['set-cookie'].join(';')).toMatch(/session_token=/);
  });

  test('missing apiKey -> 400', async () => {
    const res = await request(app).post('/api/auth/register').send({ keyName: 'x' });
    expect(res.status).toBe(400);
    expect(authService.registerWithApiKey).not.toHaveBeenCalled();
  });
});

describe('API: auth session endpoints', () => {
  test('POST /api/auth/logout -> 200, clears cookie', async () => {
    const res = await request(app).post('/api/auth/logout').send({});
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.headers['set-cookie'].join(';')).toMatch(/session_token=;/);
  });

  test('GET /api/auth/profile without a session cookie -> 401', async () => {
    const res = await request(app).get('/api/auth/profile');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
