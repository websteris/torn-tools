/**
 * @jest-environment node
 */

const { authenticate } = require('../../../middleware/auth');
const authService = require('../../../services/auth/auth-service');

// Mock the auth service — the middleware now validates the JWT via verifyToken (#36).
jest.mock('../../../services/auth/auth-service', () => ({
  verifyToken: jest.fn()
}));

jest.mock('../../../utils/logger', () => ({
  logger: { error: jest.fn() }
}));

describe('Module: AuthMiddleware', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { cookies: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      clearCookie: jest.fn()
    };
    next = jest.fn();
  });

  test('valid token -> next(), identity from the token (never hard-coded)', async () => {
    req.cookies.session_token = 'valid_token';
    authService.verifyToken.mockResolvedValue({ player_id: 7, username: 'neo', torn_id: 42 });

    await authenticate(req, res, next);

    expect(authService.verifyToken).toHaveBeenCalledWith('valid_token');
    expect(req.userId).toBe(7);          // from the token, not the old req.userId=1
    expect(req.user).toMatchObject({ id: 7, username: 'neo', torn_id: 42 });
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('missing token -> 401, verifyToken not called', async () => {
    req.cookies = {};

    await authenticate(req, res, next);

    expect(authService.verifyToken).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Authentication required'
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('invalid/expired token -> 401 and clears the cookie (not a 500)', async () => {
    // verifyToken throws on a bad signature / expiry / missing user. That's a
    // client problem -> 401, not a server error.
    req.cookies.session_token = 'invalid_token';
    authService.verifyToken.mockRejectedValue(new Error('jwt expired'));

    await authenticate(req, res, next);

    expect(authService.verifyToken).toHaveBeenCalledWith('invalid_token');
    expect(res.clearCookie).toHaveBeenCalledWith('session_token');
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid or expired session'
    });
    expect(next).not.toHaveBeenCalled();
  });
});
