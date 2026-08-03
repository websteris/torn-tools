/**
 * @jest-environment node
 *
 * Route-layer coverage for api/data.js (all routes behind the shared
 * `authenticate` middleware). authService + dataService are mocked, so these
 * assert the HTTP contract: authed happy path, unauthenticated rejection, and
 * the route-level 500 shape when the service throws.
 */
process.env.NODE_ENV = 'test';

jest.mock('../../services/auth/auth-service', () => ({ validateSession: jest.fn() }));
jest.mock('../../services/data/data-service', () => ({
  getUserData: jest.fn(), getFactionData: jest.fn(), getTornData: jest.fn(),
}));

const request = require('supertest');
const authService = require('../../services/auth/auth-service');
const dataService = require('../../services/data/data-service');
const app = require('../../server');

const COOKIE = 'session_token=valid';

beforeEach(() => {
  jest.clearAllMocks();
  authService.validateSession.mockResolvedValue(true); // authenticate() passes
});

describe('API: GET /api/data/user', () => {
  test('authenticated happy path -> 200 with data', async () => {
    dataService.getUserData.mockResolvedValue({ level: 50, life: { current: 100 } });
    const res = await request(app).get('/api/data/user').set('Cookie', COOKIE);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, data: { level: 50 } });
  });

  test('no session cookie -> 401 (authenticate rejects)', async () => {
    const res = await request(app).get('/api/data/user');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(dataService.getUserData).not.toHaveBeenCalled();
  });

  test('service throws -> 500 route-level error shape', async () => {
    dataService.getUserData.mockRejectedValue(new Error('torn api down'));
    const res = await request(app).get('/api/data/user').set('Cookie', COOKIE);
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

describe('API: GET /api/data/faction/:factionId', () => {
  test('authenticated happy path -> 200', async () => {
    dataService.getFactionData.mockResolvedValue({ ID: 123, name: 'Faction' });
    const res = await request(app).get('/api/data/faction/123').set('Cookie', COOKIE);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('no session cookie -> 401', async () => {
    const res = await request(app).get('/api/data/faction/123');
    expect(res.status).toBe(401);
  });
});
