// server/tests/unit/services/auth/auth-service.test.js

/**
 * @jest-environment node
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

describe('Module: AuthService', () => {
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
  
  describe('registerWithApiKey', () => {
    test('should create a new user when not found', async () => {
      // Mock user not already existing
      userModel.findByTornId = jest.fn().mockResolvedValue(null);
      
      // Mock user creation
      userModel.create = jest.fn().mockResolvedValue({
        id: 1,
        username: testConfig.testUser.name,
        torn_id: testConfig.testUser.torn_id
      });
      
      // Mock API key creation
      apiKeyModel.create = jest.fn().mockResolvedValue({
        id: 1,
        user_id: 1,
        key_name: 'Test Key',
        encrypted: 1
      });
      
      // Test registration
      const result = await authService.registerWithApiKey({
        apiKey: testConfig.apiKeys.test,
        keyName: 'Test Key'
      });
      
      // Assertions
      expect(userModel.findByTornId).toHaveBeenCalledWith(testConfig.testUser.torn_id);
      expect(userModel.create).toHaveBeenCalled();
      expect(apiKeyModel.create).toHaveBeenCalled();
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('sessionToken');
      expect(result.user.torn_id).toBe(testConfig.testUser.torn_id);
    });
    
    test('should return existing user when already registered', async () => {
      // Mock user already existing
      userModel.findByTornId = jest.fn().mockResolvedValue({
        id: 1,
        username: testConfig.testUser.name,
        torn_id: testConfig.testUser.torn_id,
        faction_id: testConfig.testUser.faction_id || 0,
        faction_name: testConfig.testUser.faction_name || 'None'
      });
      
      // Mock update function if needed
      userModel.update = jest.fn().mockResolvedValue({
        id: 1,
        username: testConfig.testUser.name,
        torn_id: testConfig.testUser.torn_id,
        faction_id: testConfig.testUser.faction_id || 0,
        faction_name: testConfig.testUser.faction_name || 'None'
      });
      
      // Test registration with existing user
      const result = await authService.registerWithApiKey({
        apiKey: testConfig.apiKeys.test,
        keyName: 'Test Key'
      });
      
      // Assertions
      expect(userModel.findByTornId).toHaveBeenCalledWith(testConfig.testUser.torn_id);
      expect(userModel.create).not.toHaveBeenCalled();
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('sessionToken');
      expect(result.user.torn_id).toBe(testConfig.testUser.torn_id);
    });
    
    test('should throw error when API key is invalid', async () => {
      // Test registration with invalid key
      await expect(
        authService.registerWithApiKey({
          apiKey: 'invalid_key',
          keyName: 'Test Key'
        })
      ).rejects.toThrow();
    });
  });
  
  describe('authenticateWithApiKey', () => {
    test('should authenticate existing user', async () => {
      // Mock user found
      userModel.findByTornId = jest.fn().mockResolvedValue({
        id: 1,
        username: testConfig.testUser.name,
        torn_id: testConfig.testUser.torn_id,
        faction_id: testConfig.testUser.faction_id || 0,
        faction_name: testConfig.testUser.faction_name || 'None'
      });
      
      // Test authentication
      const result = await authService.authenticateWithApiKey(testConfig.apiKeys.test);
      
      // Assertions
      expect(userModel.findByTornId).toHaveBeenCalledWith(testConfig.testUser.torn_id);
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('sessionToken');
    });
    
    test('should throw error when user not registered', async () => {
      // Mock user not found
      userModel.findByTornId = jest.fn().mockResolvedValue(null);
      
      // Test authentication with unregistered user
      await expect(
        authService.authenticateWithApiKey(testConfig.apiKeys.test)
      ).rejects.toThrow('User not registered');
    });
  });
  
  describe('validateSession', () => {
    test('should validate session token', async () => {
      // Currently this is a stub in your implementation
      const result = await authService.validateSession('valid_token');
      
      // Should return true
      expect(result).toBe(true);
    });
  });
});
