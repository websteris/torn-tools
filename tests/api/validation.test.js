/**
 * @jest-environment node
 *
 * Per-route request validation (#38): a bad type/range/enum is rejected with a
 * 400 naming the field, BEFORE the service layer is touched. Services + auth are
 * mocked so we can assert both the status and that the service was never called.
 */
process.env.NODE_ENV = 'test';

jest.mock('../../services/auth/auth-service', () => ({ verifyToken: jest.fn() }));
jest.mock('../../services/faction-tracker/faction-tracker-service', () => ({
  trackFaction: jest.fn(), stopTracking: jest.fn(), getTrackedFactions: jest.fn(() => []),
  start: jest.fn(), stop: jest.fn(),
}));
jest.mock('../../services/faction-tracker/war-tracker', () => ({
  getWarHistory: jest.fn(), getActiveWars: jest.fn(), getWarOpponents: jest.fn(), getWarDetails: jest.fn(),
}));
jest.mock('../../services/faction-tracker/data-processor', () => ({
  getLatestFactionData: jest.fn(), getLatestMembersData: jest.fn(),
}));
jest.mock('../../services/data/data-service', () => ({
  getUserData: jest.fn(), getFactionData: jest.fn(), getTornData: jest.fn(),
}));
jest.mock('../../db/models/api-key', () => ({
  findByUserId: jest.fn(), findById: jest.fn(), create: jest.fn(),
  update: jest.fn(), delete: jest.fn(), getKeyValue: jest.fn(),
}));

const request = require('supertest');
const authService = require('../../services/auth/auth-service');
const tracker = require('../../services/faction-tracker/faction-tracker-service');
const warTracker = require('../../services/faction-tracker/war-tracker');
const dataService = require('../../services/data/data-service');
const apiKeyModel = require('../../db/models/api-key');
const app = require('../../server');

const COOKIE = 'session_token=jwt';

beforeEach(() => {
  jest.clearAllMocks();
  authService.verifyToken.mockResolvedValue({ player_id: 1, username: 'u', torn_id: 1 });
});

function expect400Field(res) {
  expect(res.status).toBe(400);
  expect(res.body).toMatchObject({ success: false, error: { code: 'VALIDATION_ERROR' } });
  expect(typeof res.body.error.field).toBe('string');
}

describe('validation: faction-tracker', () => {
  test('POST /track with a non-numeric factionId -> 400, trackFaction not called', async () => {
    const res = await request(app).post('/api/faction-tracker/track').set('Cookie', COOKIE)
      .send({ factionId: 'abc' });
    expect400Field(res);
    expect(res.body.error.field).toBe('factionId');
    expect(tracker.trackFaction).not.toHaveBeenCalled();
  });

  test('wars/history ?limit=-5 and ?limit=abc -> 400, getWarHistory not called', async () => {
    for (const limit of ['-5', 'abc']) {
      const res = await request(app).get(`/api/faction-tracker/faction/1000/wars/history?limit=${limit}`)
        .set('Cookie', COOKIE);
      expect400Field(res);
    }
    expect(warTracker.getWarHistory).not.toHaveBeenCalled();
  });

  test('non-integer :factionId -> 400', async () => {
    const res = await request(app).get('/api/faction-tracker/faction/abc').set('Cookie', COOKIE);
    expect400Field(res);
    expect(res.body.error.field).toBe('factionId');
  });

  test('unknown :warType -> 400', async () => {
    const res = await request(app).get('/api/faction-tracker/war/12/bogus').set('Cookie', COOKIE);
    expect400Field(res);
    expect(res.body.error.field).toBe('warType');
  });

  test('a VALID /track passes validation and reaches the service', async () => {
    tracker.trackFaction.mockResolvedValue(true);
    const res = await request(app).post('/api/faction-tracker/track').set('Cookie', COOKIE)
      .send({ factionId: 1000, targetFactionId: 2000, pollingInterval: 60000 });
    expect(res.status).not.toBe(400);
    expect(tracker.trackFaction).toHaveBeenCalled();
  });
});

describe('validation: data selections allowlist', () => {
  test('an unknown selection -> 400, getUserData not called', async () => {
    const res = await request(app).get('/api/data/user?selections=evilselection').set('Cookie', COOKIE);
    expect400Field(res);
    expect(res.body.error.field).toBe('selections');
    expect(dataService.getUserData).not.toHaveBeenCalled();
  });

  test('a known selection passes', async () => {
    dataService.getUserData.mockResolvedValue({ ok: true });
    const res = await request(app).get('/api/data/user?selections=profile,bars').set('Cookie', COOKIE);
    expect(res.status).not.toBe(400);
  });
});

describe('validation: api-keys', () => {
  test('non-integer :id -> 400, model not called', async () => {
    const res = await request(app).get('/api/keys/abc').set('Cookie', COOKIE);
    expect400Field(res);
    expect(apiKeyModel.findById).not.toHaveBeenCalled();
  });

  test('POST with a non-16-char key_value -> 400', async () => {
    const res = await request(app).post('/api/keys').set('Cookie', COOKIE)
      .send({ key_name: 'k', key_value: 'too-short' });
    expect400Field(res);
    expect(res.body.error.field).toBe('key_value');
    expect(apiKeyModel.create).not.toHaveBeenCalled();
  });

  test('PUT with a non-boolean active -> 400', async () => {
    const res = await request(app).put('/api/keys/5').set('Cookie', COOKIE)
      .send({ active: 'yes' });
    expect400Field(res);
    expect(res.body.error.field).toBe('active');
  });
});

describe('validation: auth', () => {
  test('login without a password -> 400 naming password', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'neo' });
    expect400Field(res);
    expect(res.body.error.field).toBe('password');
  });
});
