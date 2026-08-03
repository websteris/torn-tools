/**
 * @jest-environment node
 *
 * Route-layer coverage for api/faction-tracker.js (behind `authenticate`).
 * Services mocked; asserts authed happy path + unauthenticated rejection.
 */
process.env.NODE_ENV = 'test';

jest.mock('../../services/auth/auth-service', () => ({ verifyToken: jest.fn() }));
jest.mock('../../services/faction-tracker/faction-tracker-service', () => ({
  getTrackedFactions: jest.fn(), trackFaction: jest.fn(), stopTracking: jest.fn(),
  start: jest.fn(), stop: jest.fn(),
}));

const request = require('supertest');
const authService = require('../../services/auth/auth-service');
const trackerService = require('../../services/faction-tracker/faction-tracker-service');
const app = require('../../server');

const COOKIE = 'session_token=valid';

beforeEach(() => {
  jest.clearAllMocks();
  authService.verifyToken.mockResolvedValue({ player_id: 1, username: 'u', torn_id: 123 });
});

describe('API: GET /api/faction-tracker/factions', () => {
  test('authenticated happy path -> 200 with tracked factions', async () => {
    trackerService.getTrackedFactions.mockReturnValue([{ factionId: 123 }]);
    const res = await request(app).get('/api/faction-tracker/factions').set('Cookie', COOKIE);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('no session cookie -> 401', async () => {
    const res = await request(app).get('/api/faction-tracker/factions');
    expect(res.status).toBe(401);
    expect(trackerService.getTrackedFactions).not.toHaveBeenCalled();
  });
});

describe('API: POST /api/faction-tracker/track', () => {
  test('no session cookie -> 401 (auth before body handling)', async () => {
    const res = await request(app).post('/api/faction-tracker/track').send({ factionId: 1 });
    expect(res.status).toBe(401);
  });
});
