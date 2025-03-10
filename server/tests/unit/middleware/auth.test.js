/**
 * @jest-environment node
 */

const { authenticate } = require('../../../middleware/auth');
const authService = require('../../../services/auth/auth-service');

// Mock the auth service
jest.mock('../../../services/auth/auth-service', () => ({
  validateSession: jest.fn()
}));

// Mock the logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    error: jest.fn()
  }
}));

describe('Module: AuthMiddleware', () => {
  let req, res, next;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock request, response, and next function
    req = {
      cookies: {}
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      clearCookie: jest.fn()
    };
    
    next = jest.fn();
  });
  
  test('should call next() when session token is valid', async () => {
    // Arrange
    req.cookies.session_token = 'valid_token';
    authService.validateSession.mockResolvedValue(true);
    
    // Act
    await authenticate(req, res, next);
    
    // Assert
    expect(authService.validateSession).toHaveBeenCalledWith('valid_token');
    expect(req.user).toBeDefined();
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
  
  test('should return 401 when session token is missing', async () => {
    // Arrange
    req.cookies = {}; // No session token
    
    // Act
    await authenticate(req, res, next);
    
    // Assert
    expect(authService.validateSession).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Authentication required'
    });
    expect(next).not.toHaveBeenCalled();
  });
  
  test('should return 401 and clear cookie when session token is invalid', async () => {
    // Arrange
    req.cookies.session_token = 'invalid_token';
    authService.validateSession.mockResolvedValue(false);
    
    // Act
    await authenticate(req, res, next);
    
    // Assert
    expect(authService.validateSession).toHaveBeenCalledWith('invalid_token');
    expect(res.clearCookie).toHaveBeenCalledWith('session_token');
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid or expired session'
    });
    expect(next).not.toHaveBeenCalled();
  });
  
  test('should return 500 when an error occurs', async () => {
    // Arrange
    req.cookies.session_token = 'token';
    authService.validateSession.mockRejectedValue(new Error('Test error'));
    
    // Act
    await authenticate(req, res, next);
    
    // Assert
    expect(authService.validateSession).toHaveBeenCalledWith('token');
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Internal server error'
    });
    expect(next).not.toHaveBeenCalled();
  });
});
