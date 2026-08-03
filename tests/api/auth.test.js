/**
 * @jest-environment node
 *
 * Route-layer coverage for api/auth.js after wiring the real JWT auth service
 * (#36). The auth service is mocked (no DB / bcrypt / jwt), so these assert the
 * HTTP contract only: status codes, JSON shape, and that the JWT session cookie
 * is set on login.
 */
process.env.NODE_ENV = 'test';

jest.mock('../../services/auth/auth-service', () => ({
  registerUser: jest.fn(),
  loginUser: jest.fn(),
  verifyToken: jest.fn(),
}));

const request = require('supertest');
const authService = require('../../services/auth/auth-service');
const app = require('../../server');

beforeEach(() => jest.clearAllMocks());

describe('API: POST /api/auth/login', () => {
  test('happy path -> 200, sets the JWT session cookie', async () => {
    authService.loginUser.mockResolvedValue({ token: 'jwt.tok', user: { id: 1, username: 'neo' } });
    const res = await request(app).post('/api/auth/login').send({ username: 'neo', password: 'pw' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, user: { id: 1 } });
    expect(res.headers['set-cookie'].join(';')).toMatch(/session_token=jwt\.tok/);
    expect(authService.loginUser).toHaveBeenCalledWith({ username: 'neo', password: 'pw' });
  });

  test('missing credentials -> 400', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'neo' });
    expect(res.status).toBe(400);
    expect(authService.loginUser).not.toHaveBeenCalled();
  });

  test('bad credentials (service rejects) -> 401', async () => {
    authService.loginUser.mockRejectedValue(new Error('Invalid credentials'));
    const res = await request(app).post('/api/auth/login').send({ username: 'neo', password: 'x' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe('API: POST /api/auth/register', () => {
  test('happy path -> 201 with the created user', async () => {
    authService.registerUser.mockResolvedValue({ player_id: 7, username: 'trin' });
    const res = await request(app).post('/api/auth/register')
      .send({ username: 'trin', password: 'pw', player_id: 7, name: 'Trinity' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ success: true, user: { player_id: 7 } });
  });

  test('missing credentials -> 400', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'x' });
    expect(res.status).toBe(400);
    expect(authService.registerUser).not.toHaveBeenCalled();
  });
});

describe('API: auth session endpoints', () => {
  test('POST /api/auth/logout -> 200, clears the cookie', async () => {
    const res = await request(app).post('/api/auth/logout').send({});
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie'].join(';')).toMatch(/session_token=;/);
  });

  test('GET /api/auth/profile without a session cookie -> 401', async () => {
    const res = await request(app).get('/api/auth/profile');
    expect(res.status).toBe(401);
    expect(authService.verifyToken).not.toHaveBeenCalled();
  });

  test('GET /api/auth/profile with a valid session -> 200 with the account', async () => {
    authService.verifyToken.mockResolvedValue({ player_id: 1, username: 'neo', torn_id: 42 });
    const res = await request(app).get('/api/auth/profile').set('Cookie', 'session_token=jwt.tok');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, user: { id: 1, username: 'neo' } });
  });

  test('GET /api/auth/profile with an invalid token -> 401', async () => {
    authService.verifyToken.mockRejectedValue(new Error('jwt expired'));
    const res = await request(app).get('/api/auth/profile').set('Cookie', 'session_token=bad');
    expect(res.status).toBe(401);
  });
});
