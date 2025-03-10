/**
 * @jest-environment node
 */

const crypto = require('crypto');
const apiKeyModel = require('../../../db/models/api-key');
const { getConnection } = require('../../../db/schema');

// Mock the database connection
jest.mock('../../../db/schema', () => ({
  getConnection: jest.fn()
}));

// Mock the logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock crypto for deterministic testing
jest.mock('crypto', () => {
  const originalModule = jest.requireActual('crypto');
  
  return {
    ...originalModule,
    randomBytes: jest.fn().mockReturnValue(Buffer.from('0123456789abcdef')),
    createCipheriv: jest.fn(),
    createDecipheriv: jest.fn()
  };
});

describe('Module: ApiKeyModel', () => {
  let mockDb;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock DB with methods
    mockDb = {
      get: jest.fn(),
      all: jest.fn(),
      run: jest.fn(),
      close: jest.fn(),
      serialize: jest.fn((callback) => callback())
    };
    
    // Set up the mock getConnection to return our mockDb
    getConnection.mockReturnValue(mockDb);
    
    // Mock the cipher and decipher
    const mockCipher = {
      update: jest.fn().mockReturnValue('encrypted'),
      final: jest.fn().mockReturnValue('data')
    };
    
    const mockDecipher = {
      update: jest.fn().mockReturnValue('decrypted'),
      final: jest.fn().mockReturnValue('data')
    };
    
    crypto.createCipheriv.mockReturnValue(mockCipher);
    crypto.createDecipheriv.mockReturnValue(mockDecipher);
  });
  
  describe('_encryptApiKey and _decryptApiKey', () => {
    test('should encrypt and decrypt API key correctly', () => {
      // Arrange
      const plainKey = 'test_api_key_123';
      
      // Act
      const encrypted = apiKeyModel._encryptApiKey(plainKey);
      const decrypted = apiKeyModel._decryptApiKey(encrypted);
      
      // Assert
      expect(encrypted).toContain(':');
      expect(decrypted).toBe('decrypteddata');
      expect(crypto.createCipheriv).toHaveBeenCalled();
      expect(crypto.createDecipheriv).toHaveBeenCalled();
    });
    
    test('should throw error if encrypted key format is invalid', () => {
      // Arrange
      const invalidEncrypted = 'invalidformatwithoutcolon';
      
      // Act & Assert
      expect(() => {
        apiKeyModel._decryptApiKey(invalidEncrypted);
      }).toThrow('Invalid encrypted API key format');
    });
  });
  
  describe('create', () => {
    test('should create a new API key and return the created key info', async () => {
      // Arrange
      const keyData = {
        user_id: 1,
        key_name: 'Test API Key',
        key_value: 'test_api_key_123'
      };
      
      const createdKey = {
        id: 5,
        user_id: 1,
        key_name: 'Test API Key',
        encrypted: 1,
        active: 1,
        created_at: '2025-03-10T12:00:00.000Z',
        updated_at: '2025-03-10T12:00:00.000Z'
      };
      
      // Mock the run method to call the callback with lastID
      mockDb.run.mockImplementation(function(query, params, callback) {
        // 'this' context should have lastID
        callback.call({ lastID: 5 }, null);
      });
      
      // Mock the get method to return the created key
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, createdKey);
      });
      
      // Act
      const result = await apiKeyModel.create(keyData);
      
      // Assert
      expect(result).toEqual(createdKey);
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO api_keys'),
        expect.arrayContaining([1, 'Test API Key']),
        expect.any(Function)
      );
      expect(mockDb.get).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [5],  // lastID
        expect.any(Function)
      );
      expect(mockDb.close).toHaveBeenCalled();
    });
    
    test('should throw error if required fields are missing', async () => {
      // Act & Assert - Missing user_id
      await expect(apiKeyModel.create({
        key_name: 'Test',
        key_value: 'abc'
      })).rejects.toThrow('User ID, key name, and key value are required');
      
      // Act & Assert - Missing key_name
      await expect(apiKeyModel.create({
        user_id: 1,
        key_value: 'abc'
      })).rejects.toThrow('User ID, key name, and key value are required');
      
      // Act & Assert - Missing key_value
      await expect(apiKeyModel.create({
        user_id: 1,
        key_name: 'Test'
      })).rejects.toThrow('User ID, key name, and key value are required');
    });
  });
  
  describe('findByUserId', () => {
    test('should return array of API keys for user', async () => {
      // Arrange
      const userId = 1;
      const mockKeys = [
        { id: 1, user_id: userId, key_name: 'Key 1' },
        { id: 2, user_id: userId, key_name: 'Key 2' }
      ];
      
      // Mock the all method to return keys
      mockDb.all.mockImplementation((query, params, callback) => {
        callback(null, mockKeys);
      });
      
      // Act
      const result = await apiKeyModel.findByUserId(userId);
      
      // Assert
      expect(result).toEqual(mockKeys);
      expect(mockDb.all).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [userId],
        expect.any(Function)
      );
      expect(mockDb.close).toHaveBeenCalled();
    });
    
    test('should return empty array when no keys found', async () => {
      // Arrange
      const userId = 1;
      
      // Mock the all method to return empty array
      mockDb.all.mockImplementation((query, params, callback) => {
        callback(null, []);
      });
      
      // Act
      const result = await apiKeyModel.findByUserId(userId);
      
      // Assert
      expect(result).toEqual([]);
      expect(mockDb.close).toHaveBeenCalled();
    });
    
    test('should handle database error', async () => {
      // Arrange
      const userId = 1;
      const dbError = new Error('Database error');
      
      // Mock the all method to return an error
      mockDb.all.mockImplementation((query, params, callback) => {
        callback(dbError, null);
      });
      
      // Act & Assert
      await expect(apiKeyModel.findByUserId(userId)).rejects.toThrow('Database error');
      expect(mockDb.close).toHaveBeenCalled();
    });
  });
  
  describe('getKeyValue', () => {
    test('should return decrypted API key', async () => {
      // Arrange
      const id = 5;
      const userId = 1;
      
      // Mock the get method to return an encrypted key
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, {
          key_value: '0123456789abcdef:encrypteddata',
          encrypted: 1
        });
      });
      
      // Act
      const result = await apiKeyModel.getKeyValue(id, userId);
      
      // Assert
      expect(result).toBe('decrypteddata');
      expect(mockDb.get).toHaveBeenCalledWith(
        expect.stringContaining('SELECT key_value, encrypted'),
        [id, userId],
        expect.any(Function)
      );
      expect(mockDb.close).toHaveBeenCalled();
    });
    
    test('should return unencrypted API key directly', async () => {
      // Arrange
      const id = 5;
      const userId = 1;
      const plainKey = 'plain_api_key';
      
      // Mock the get method to return a plain key
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, {
          key_value: plainKey,
          encrypted: 0
        });
      });
      
      // Act
      const result = await apiKeyModel.getKeyValue(id, userId);
      
      // Assert
      expect(result).toBe(plainKey);
      expect(mockDb.close).toHaveBeenCalled();
    });
    
    test('should throw error if key not found', async () => {
      // Arrange
      const id = 5;
      const userId = 1;
      
      // Mock the get method to return null (key not found)
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, null);
      });
      
      // Act & Assert
      await expect(apiKeyModel.getKeyValue(id, userId)).rejects.toThrow('API key not found or not active');
      expect(mockDb.close).toHaveBeenCalled();
    });
  });
  
  describe('findById', () => {
    test('should return API key by ID', async () => {
      // Arrange
      const id = 5;
      const userId = 1;
      const mockKey = {
        id: 5,
        user_id: userId,
        key_name: 'Test Key',
        encrypted: 1,
        active: 1
      };
      
      // Mock the get method to return a key
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, mockKey);
      });
      
      // Act
      const result = await apiKeyModel.findById(id, userId);
      
      // Assert
      expect(result).toEqual(mockKey);
      expect(mockDb.get).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [id, userId],
        expect.any(Function)
      );
      expect(mockDb.close).toHaveBeenCalled();
    });
    
    test('should return null if key not found', async () => {
      // Arrange
      const id = 5;
      const userId = 1;
      
      // Mock the get method to return null
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, null);
      });
      
      // Act
      const result = await apiKeyModel.findById(id, userId);
      
      // Assert
      expect(result).toBeNull();
      expect(mockDb.close).toHaveBeenCalled();
    });
  });
  

	describe('update', () => {
  test('should update API key and return updated data', async () => {
    // Arrange
    const id = 5;
    const userId = 1;
    const updateData = {
      key_name: 'Updated Key Name',
      active: false
    };

    const updatedKey = {
      id: 5,
      user_id: userId,
      key_name: 'Updated Key Name',
      encrypted: 1,
      active: 0
    };

    // Mock the serialize method
    mockDb.serialize.mockImplementation(callback => {
      callback();
    });

    // Mock the run method for TRANSACTION statements
    mockDb.run.mockImplementation(function(query, ...args) {
      // The update method in api-key.js has different implementations for run
      // This handles both patterns
      if (query === 'BEGIN TRANSACTION' || query === 'ROLLBACK' || query === 'COMMIT') {
        // No callback for transaction statements
        return;
      }

      // For update query, we need the callback to be called
      const callback = args.length === 1 ? args[0] : args[1];
      if (typeof callback === 'function') {
        callback.call({ changes: 1 }, null);
      }
    });

    // Mock the get method to return an existing key
    mockDb.get.mockImplementation((query, params, callback) => {
      if (query.includes('SELECT id, key_value, encrypted')) {
        callback(null, {
          id: 5,
          key_value: '0123456789abcdef:encrypteddata',
          encrypted: 1
        });
      } else {
        callback(null, updatedKey);
      }
    });

    // Act
    const result = await apiKeyModel.update(id, userId, updateData);

    // Assert
    expect(result).toEqual(updatedKey);
    expect(mockDb.serialize).toHaveBeenCalled();
    expect(mockDb.get).toHaveBeenCalled();
    expect(mockDb.close).toHaveBeenCalled();
  });

  test('should throw error if key not found', async () => {
    // Arrange
    const id = 5;
    const userId = 1;
    const updateData = {
      key_name: 'Updated Key Name'
    };

    // Mock the serialize method
    mockDb.serialize.mockImplementation(callback => {
      callback();
    });

    // Mock the get method to return null (key not found)
    mockDb.get.mockImplementation((query, params, callback) => {
      callback(null, null);
    });

    // Mock run for transaction statements
    mockDb.run.mockImplementation(function(query) {
      // Just handle transaction statements, no callbacks needed
    });

    // Act & Assert
    await expect(apiKeyModel.update(id, userId, updateData)).rejects.toThrow(/not found/);
    expect(mockDb.close).toHaveBeenCalled();
  });
});

  describe('delete', () => {
    test('should delete API key and return true', async () => {
      // Arrange
      const id = 5;
      const userId = 1;
      
      // Mock the run method to indicate successful deletion
      mockDb.run.mockImplementation(function(query, params, callback) {
        callback.call({ changes: 1 }, null);
      });
      
      // Act
      const result = await apiKeyModel.delete(id, userId);
      
      // Assert
      expect(result).toBe(true);
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM api_keys'),
        [id, userId],
        expect.any(Function)
      );
      expect(mockDb.close).toHaveBeenCalled();
    });
    
    test('should throw error if key not found', async () => {
      // Arrange
      const id = 5;
      const userId = 1;
      
      // Mock the run method to indicate no deletion
      mockDb.run.mockImplementation(function(query, params, callback) {
        callback.call({ changes: 0 }, null);
      });
      
      // Act & Assert
      await expect(apiKeyModel.delete(id, userId)).rejects.toThrow(/not found/);
      expect(mockDb.close).toHaveBeenCalled();
    });
  });
  
  describe('deleteAllForUser', () => {
    test('should delete all user API keys and return count', async () => {
      // Arrange
      const userId = 1;
      
      // Mock the run method to indicate successful deletions
      mockDb.run.mockImplementation(function(query, params, callback) {
        callback.call({ changes: 3 }, null);
      });
      
      // Act
      const result = await apiKeyModel.deleteAllForUser(userId);
      
      // Assert
      expect(result).toBe(3);
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM api_keys WHERE user_id = ?'),
        [userId],
        expect.any(Function)
      );
      expect(mockDb.close).toHaveBeenCalled();
    });
  });
});
