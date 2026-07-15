// server/tests/unit/services/auth/auth-service.test.js

/**
 * @jest-environment node
 */

/**
 * Tests for the authentication service
 * 
 * This service is responsible for user authentication, registration,
 * and token management
 */

// Test configuration import with error handling
let testConfig;
try {
  testConfig = require('../../../../config/test-config');
} catch (error) {
  console.warn('Test configuration file missing. Using mock data for unit tests.');
  testConfig = {
    apiKeys: {
      test: 'mock-api-key-for-unit-tests'
    },
    testUser: {
      torn_id: 12345,
      name: 'MockUser'
    }
  };
}

const authService = require('../../../../services/auth/auth-service');
const userModel = require('../../../../db/models/user');
const apiKeyModel = require('../../../../db/models/api-key');

// Mock dependencies
jest.mock('../../../../db/models/user');
jest.mock('../../../../db/models/api-key');
jest.mock('../../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock the user model
jest.mock('../../../../models/userAccount', () => ({
  getAllUsers: jest.fn(),
  getUserAccountById: jest.fn(),
  getUserAccountByUsername: jest.fn(),
  createUserAccount: jest.fn(),
  updateUserAccount: jest.fn(),
  upsertUserAccount: jest.fn()
}));

// Mock bcrypt for password hashing
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true)
}));

// Mock jsonwebtoken for token generation
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-token'),
  verify: jest.fn().mockReturnValue({ player_id: 12345 })
}));

const userAccountModel = require('../../../../models/userAccount');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Directly replace the internal apiClient.getUserData method
    authService.apiClient = {
      getUserData: jest.fn().mockImplementation((apiKey) => {
        if (apiKey === 'invalid_key') {
          return Promise.reject(new Error('Invalid API key'));
        }
        return Promise.resolve({
          player_id: testConfig.testUser.torn_id,
          name: testConfig.testUser.name,
          level: 15,
          faction: {
            faction_id: testConfig.testUser.faction_id || 0,
            faction_name: testConfig.testUser.faction_name || 'None'
          }
        });
      })
    };
  });
  
  describe('registerUser', () => {
    it('should register a new user', async () => {
      // Mock data
      const userData = {
        player_id: 12345,
        name: 'Test User',
        username: 'testuser',
        password: 'password123',
        preferences: { theme: 'dark' }
      };
      
      // Mock the model response
      userAccountModel.getUserAccountById.mockResolvedValue(null);
      userAccountModel.createUserAccount.mockResolvedValue({
        player_id: userData.player_id,
        name: userData.name,
        username: userData.username
      });
      
      // Call the function
      const result = await authService.registerUser(userData);
      
      // Verify the model was called with the correct data
      expect(userAccountModel.getUserAccountById).toHaveBeenCalledWith(userData.player_id);
      expect(userAccountModel.createUserAccount).toHaveBeenCalledWith(expect.objectContaining({
        player_id: userData.player_id,
        name: userData.name,
        username: userData.username,
        password_hash: 'hashed-password'
      }));
      
      // Verify the result
      expect(result).toHaveProperty('player_id', userData.player_id);
      expect(result).toHaveProperty('name', userData.name);
      expect(result).toHaveProperty('username', userData.username);
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('password_hash');
    });
    
    it('should throw an error if the user already exists', async () => {
      // Mock data
      const userData = {
        player_id: 12345,
        name: 'Test User',
        username: 'testuser',
        password: 'password123'
      };
      
      // Mock the model response
      userAccountModel.getUserAccountById.mockResolvedValue({
        player_id: userData.player_id,
        name: userData.name,
        username: userData.username
      });
      
      // Call the function and expect it to throw
      await expect(authService.registerUser(userData)).rejects.toThrow('User already exists');
      
      // Verify the model was called
      expect(userAccountModel.getUserAccountById).toHaveBeenCalledWith(userData.player_id);
      expect(userAccountModel.createUserAccount).not.toHaveBeenCalled();
    });
  });
  
  describe('loginUser', () => {
    it('should login a user with valid credentials', async () => {
      // Mock data
      const credentials = {
        username: 'testuser',
        password: 'password123'
      };
      
      // Mock the model response
      userAccountModel.getUserAccountById.mockResolvedValue({
        player_id: 12345,
        name: 'Test User',
        username: 'testuser',
        password_hash: 'hashed-password'
      });
      
      // Mock bcrypt.compare to return true (password matches)
      bcrypt.compare.mockResolvedValue(true);
      
      // Call the function
      const result = await authService.loginUser(credentials);
      
      // Verify the model was called
      expect(userAccountModel.getUserAccountById).toHaveBeenCalled();
      
      // Verify bcrypt.compare was called with the correct arguments
      expect(bcrypt.compare).toHaveBeenCalledWith(credentials.password, 'hashed-password');
      
      // Verify the result
      expect(result).toHaveProperty('token', 'mock-token');
      expect(result).toHaveProperty('user');
      expect(result.user).toHaveProperty('player_id', 12345);
      expect(result.user).toHaveProperty('name', 'Test User');
      expect(result.user).not.toHaveProperty('password_hash');
    });
    
    it('should throw an error if the user does not exist', async () => {
      // Mock data
      const credentials = {
        username: 'nonexistent',
        password: 'password123'
      };
      
      // Mock the model response
      userAccountModel.getUserAccountById.mockResolvedValue(null);
      
      // Call the function and expect it to throw
      await expect(authService.loginUser(credentials)).rejects.toThrow('Invalid credentials');
      
      // Verify the model was called
      expect(userAccountModel.getUserAccountById).toHaveBeenCalled();
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });
    
    it('should throw an error if the password is incorrect', async () => {
      // Mock data
      const credentials = {
        username: 'testuser',
        password: 'wrongpassword'
      };
      
      // Mock the model response
      userAccountModel.getUserAccountById.mockResolvedValue({
        player_id: 12345,
        name: 'Test User',
        username: 'testuser',
        password_hash: 'hashed-password'
      });
      
      // Mock bcrypt.compare to return false (password doesn't match)
      bcrypt.compare.mockResolvedValue(false);
      
      // Call the function and expect it to throw
      await expect(authService.loginUser(credentials)).rejects.toThrow('Invalid credentials');
      
      // Verify the model was called
      expect(userAccountModel.getUserAccountById).toHaveBeenCalled();
      expect(bcrypt.compare).toHaveBeenCalledWith(credentials.password, 'hashed-password');
    });
  });
  
  describe('verifyToken', () => {
    it('should verify a valid token', async () => {
      // Mock data
      const token = 'valid-token';
      
      // Mock jwt.verify to return a decoded token
      jwt.verify.mockReturnValue({ player_id: 12345 });
      
      // Mock the model response
      userAccountModel.getUserAccountById.mockResolvedValue({
        player_id: 12345,
        name: 'Test User',
        username: 'testuser'
      });
      
      // Call the function
      const result = await authService.verifyToken(token);
      
      // Verify jwt.verify was called with the correct arguments
      expect(jwt.verify).toHaveBeenCalledWith(token, expect.any(String));
      
      // Verify the model was called
      expect(userAccountModel.getUserAccountById).toHaveBeenCalledWith(12345);
      
      // Verify the result
      expect(result).toHaveProperty('player_id', 12345);
      expect(result).toHaveProperty('name', 'Test User');
      expect(result).not.toHaveProperty('password_hash');
    });
    
    it('should throw an error if the token is invalid', async () => {
      // Mock data
      const token = 'invalid-token';
      
      // Mock jwt.verify to throw an error
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      // Call the function and expect it to throw
      await expect(authService.verifyToken(token)).rejects.toThrow('Invalid token');
      
      // Verify jwt.verify was called
      expect(jwt.verify).toHaveBeenCalledWith(token, expect.any(String));
      expect(userAccountModel.getUserAccountById).not.toHaveBeenCalled();
    });
    
    it('should throw an error if the user does not exist', async () => {
      // Mock data
      const token = 'valid-token';
      
      // Mock jwt.verify to return a decoded token
      jwt.verify.mockReturnValue({ player_id: 12345 });
      
      // Mock the model response
      userAccountModel.getUserAccountById.mockResolvedValue(null);
      
      // Call the function and expect it to throw
      await expect(authService.verifyToken(token)).rejects.toThrow('User not found');
      
      // Verify jwt.verify was called
      expect(jwt.verify).toHaveBeenCalledWith(token, expect.any(String));
      expect(userAccountModel.getUserAccountById).toHaveBeenCalledWith(12345);
    });
  });
  
  describe('updateUserPreferences', () => {
    it('should update user preferences', async () => {
      // Mock data
      const player_id = 12345;
      const preferences = { theme: 'light', notifications: true };
      
      // Mock the model response
      userAccountModel.getUserAccountById.mockResolvedValue({
        player_id,
        name: 'Test User',
        username: 'testuser',
        preferences: JSON.stringify({ theme: 'dark' })
      });
      
      userAccountModel.updateUserAccount.mockResolvedValue({
        player_id,
        name: 'Test User',
        username: 'testuser',
        preferences: JSON.stringify(preferences)
      });
      
      // Call the function
      const result = await authService.updateUserPreferences(player_id, preferences);
      
      // Verify the model was called with the correct data
      expect(userAccountModel.getUserAccountById).toHaveBeenCalledWith(player_id);
      expect(userAccountModel.updateUserAccount).toHaveBeenCalledWith(player_id, expect.objectContaining({
        preferences
      }));
      
      // Verify the result
      expect(result).toHaveProperty('player_id', player_id);
      expect(result).toHaveProperty('preferences');
      expect(JSON.parse(result.preferences)).toEqual(preferences);
    });
    
    it('should throw an error if the user does not exist', async () => {
      // Mock data
      const player_id = 12345;
      const preferences = { theme: 'light' };
      
      // Mock the model response
      userAccountModel.getUserAccountById.mockResolvedValue(null);
      
      // Call the function and expect it to throw
      await expect(authService.updateUserPreferences(player_id, preferences)).rejects.toThrow('User not found');
      
      // Verify the model was called
      expect(userAccountModel.getUserAccountById).toHaveBeenCalledWith(player_id);
      expect(userAccountModel.updateUserAccount).not.toHaveBeenCalled();
    });
  });
});
