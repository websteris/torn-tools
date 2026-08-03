/**
 * @jest-environment node
 *
 * CSRF defense for cookie-session state-changing routes (#49, CodeQL alert 19).
 * The session rides an httpOnly cookie the browser attaches automatically, so a
 * hostile page could forge a POST/PUT/DELETE. verifyCsrf (mounted on /api before
 * the routers) blocks a state-changing request that a browser marks cross-site,
 * while letting same-origin app calls and non-browser clients through.
 */
process.env.NODE_ENV = 'test';
process.env.CORS_ORIGIN = 'http://localhost:8080'; // the app's own origin

jest.mock('../../services/auth/auth-service', () => ({ verifyToken: jest.fn() }));
jest.mock('../../db/models/api-key', () => ({
  findByUserId: jest.fn(), findById: jest.fn(), create: jest.fn(),
  update: jest.fn(), delete: jest.fn(), getKeyValue: jest.fn(),
}));

const request = require('supertest');
const authService = require('../../services/auth/auth-service');
const apiKeyModel = require('../../db/models/api-key');
const app = require('../../server');

const COOKIE = 'session_token=jwt';
const APP_ORIGIN = 'http://localhost:8080';
const EVIL_ORIGIN = 'https://evil.example';

beforeEach(() => {
  jest.clearAllMocks();
  authService.verifyToken.mockResolvedValue({ player_id: 1, username: 'u', torn_id: 1 });
  apiKeyModel.delete.mockResolvedValue();
  apiKeyModel.findByUserId.mockResolvedValue([]);
});

describe('a browser-marked cross-site state-changing request is blocked', () => {
  test('DELETE with a cross-site Origin -> 403 (even with a valid session cookie)', async () => {
    const res = await request(app).delete('/api/keys/5')
      .set('Cookie', COOKIE).set('Origin', EVIL_ORIGIN);
    expect(res.status).toBe(403);
    // The 403 leaves in the app's single error envelope (#40).
    expect(res.body).toEqual({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Cross-site request blocked' },
    });
    expect(apiKeyModel.delete).not.toHaveBeenCalled(); // blocked before the handler
  });

  test('POST with Sec-Fetch-Site: cross-site -> 403', async () => {
    const res = await request(app).post('/api/faction-tracker/stop')
      .set('Cookie', COOKIE).set('Sec-Fetch-Site', 'cross-site').send({ factionId: 1000 });
    expect(res.status).toBe(403);
  });

  test('Sec-Fetch-Site: same-site is also blocked (subdomain attacker)', async () => {
    const res = await request(app).delete('/api/keys/5')
      .set('Cookie', COOKIE).set('Sec-Fetch-Site', 'same-site');
    expect(res.status).toBe(403);
  });
});

describe('legitimate requests are not blocked', () => {
  test('DELETE with the app Origin -> not 403 (reaches the handler)', async () => {
    const res = await request(app).delete('/api/keys/5')
      .set('Cookie', COOKIE).set('Origin', APP_ORIGIN);
    expect(res.status).not.toBe(403);
    expect(apiKeyModel.delete).toHaveBeenCalled();
  });

  test('Sec-Fetch-Site: same-origin -> not 403', async () => {
    const res = await request(app).delete('/api/keys/5')
      .set('Cookie', COOKIE).set('Sec-Fetch-Site', 'same-origin');
    expect(res.status).not.toBe(403);
  });

  test('Sec-Fetch-Site: none (address-bar / bookmark) -> not 403', async () => {
    const res = await request(app).delete('/api/keys/5')
      .set('Cookie', COOKIE).set('Sec-Fetch-Site', 'none');
    expect(res.status).not.toBe(403);
  });

  test('a non-browser client (no Origin, no Sec-Fetch-Site) -> not 403', async () => {
    const res = await request(app).delete('/api/keys/5').set('Cookie', COOKIE);
    expect(res.status).not.toBe(403);
  });

  test('a safe GET with a cross-site Origin -> not 403 (safe method)', async () => {
    const res = await request(app).get('/api/keys')
      .set('Cookie', COOKIE).set('Origin', EVIL_ORIGIN);
    expect(res.status).not.toBe(403);
  });
});
