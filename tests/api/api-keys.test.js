/**
 * @jest-environment node
 *
 * Route-layer coverage for api/api-keys.js. NOTE: its `authenticateUser` is a
 * placeholder that sets req.userId=1 and calls next() — there is no real auth to
 * reject yet, so coverage here is happy-path + the route-level 500 shape. The
 * apiKeyModel is mocked (no DB).
 */
process.env.NODE_ENV = 'test';

jest.mock('../../db/models/api-key', () => ({
  findByUserId: jest.fn(), findById: jest.fn(), create: jest.fn(),
  update: jest.fn(), delete: jest.fn(), getKeyValue: jest.fn(),
}));

const request = require('supertest');
const apiKeyModel = require('../../db/models/api-key');
const app = require('../../server');

beforeEach(() => jest.clearAllMocks());

describe('API: GET /api/keys', () => {
  test('happy path -> 200 with keys', async () => {
    apiKeyModel.findByUserId.mockResolvedValue([{ id: 1, key_name: 'Primary' }]);
    const res = await request(app).get('/api/keys');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true });
    expect(Array.isArray(res.body.keys)).toBe(true);
  });

  test('model throws -> 500 route-level error shape', async () => {
    apiKeyModel.findByUserId.mockRejectedValue(new Error('db down'));
    const res = await request(app).get('/api/keys');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

describe('API: POST /api/keys', () => {
  test('missing required fields -> 4xx (not 500)', async () => {
    const res = await request(app).post('/api/keys').send({});
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});
