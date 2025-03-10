/**
 * @jest-environment node
 */

const userModel = require('../../../db/models/user');
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

describe('Module: UserModel', () => {
  let mockDb;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock DB with methods
    mockDb = {
      get: jest.fn(),
      run: jest.fn(),
      close: jest.fn()
    };
    
    // Set up the mock getConnection to return our mockDb
    getConnection.mockReturnValue(mockDb);
  });
  
  describe('findByTornId', () => {
    test('should return user when found', async () => {
      // Arrange
      const tornId = 12345;
      const mockUser = { id: 1, username: 'testuser', torn_id: tornId };
      
      // Set up mock to return user
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, mockUser);
      });
      
      // Act
      const result = await userModel.findByTornId(tornId);
      
      // Assert
      expect(result).toEqual(mockUser);
      expect(mockDb.get).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [tornId],
        expect.any(Function)
      );
      expect(mockDb.close).toHaveBeenCalled();
    });
    
    test('should return null when user not found', async () => {
      // Arrange
      const tornId = 12345;
      
      // Set up mock to return null (user not found)
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, null);
      });
      
      // Act
      const result = await userModel.findByTornId(tornId);
      
      // Assert
      expect(result).toBeNull();
      expect(mockDb.close).toHaveBeenCalled();
    });
    
    test('should reject with error when database error occurs', async () => {
      // Arrange
      const tornId = 12345;
      const dbError = new Error('Database error');
      
      // Set up mock to return error
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(dbError, null);
      });
      
      // Act & Assert
      await expect(userModel.findByTornId(tornId)).rejects.toThrow('Database error');
      expect(mockDb.close).toHaveBeenCalled();
    });
  });
  
  describe('findByUsername', () => {
    test('should return user when found', async () => {
      // Arrange
      const username = 'testuser';
      const mockUser = { id: 1, username: username, torn_id: 12345 };
      
      // Set up mock to return user
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, mockUser);
      });
      
      // Act
      const result = await userModel.findByUsername(username);
      
      // Assert
      expect(result).toEqual(mockUser);
      expect(mockDb.get).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [username],
        expect.any(Function)
      );
      expect(mockDb.close).toHaveBeenCalled();
    });
  });
  
  describe('findById', () => {
    test('should return user when found', async () => {
      // Arrange
      const userId = 1;
      const mockUser = { id: userId, username: 'testuser', torn_id: 12345 };
      
      // Set up mock to return user
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, mockUser);
      });
      
      // Act
      const result = await userModel.findById(userId);
      
      // Assert
      expect(result).toEqual(mockUser);
      expect(mockDb.get).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [userId],
        expect.any(Function)
      );
      expect(mockDb.close).toHaveBeenCalled();
    });
  });
  
  describe('create', () => {
    test('should create a new user and return the created user', async () => {
      // Arrange
      const userData = {
        username: 'newuser',
        password_hash: 'hashed_password',
        email: 'user@example.com',
        torn_id: 67890
      };
      
      const createdUser = {
        id: 1,
        username: userData.username,
        email: userData.email,
        torn_id: userData.torn_id,
        created_at: '2025-03-10T12:00:00.000Z',
        updated_at: '2025-03-10T12:00:00.000Z'
      };
      
      // Mock the run method to call the callback with lastID
      mockDb.run.mockImplementation(function(query, params, callback) {
        // 'this' context should have lastID
        callback.call({ lastID: 1 }, null);
      });
      
      // Mock the get method to return the created user
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, createdUser);
      });
      
      // Act
      const result = await userModel.create(userData);
      
      // Assert
      expect(result).toEqual(createdUser);
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        [userData.username, userData.password_hash, userData.email, userData.torn_id],
        expect.any(Function)
      );
      expect(mockDb.get).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [1],  // lastID
        expect.any(Function)
      );
      expect(mockDb.close).toHaveBeenCalled();
    });
    
    test('should reject with error when insert fails', async () => {
      // Arrange
      const userData = {
        username: 'newuser',
        password_hash: 'hashed_password',
        email: 'user@example.com',
        torn_id: 67890
      };
      
      const dbError = new Error('Insert failed');
      
      // Mock the run method to call the callback with an error
      mockDb.run.mockImplementation((query, params, callback) => {
        callback(dbError);
      });
      
      // Act & Assert
      await expect(userModel.create(userData)).rejects.toThrow('Insert failed');
      expect(mockDb.close).toHaveBeenCalled();
    });
  });
  
  describe('update', () => {
    test('should update user and return updated data', async () => {
      // Arrange
      const userId = 1;
      const userData = {
        username: 'updateduser',
        email: 'updated@example.com'
      };
      
      const updatedUser = {
        id: userId,
        username: userData.username,
        email: userData.email,
        torn_id: 12345,
        created_at: '2025-03-10T12:00:00.000Z',
        updated_at: '2025-03-10T13:00:00.000Z'
      };
      
      // Mock the run method
      mockDb.run.mockImplementation((query, params, callback) => {
        callback(null);
      });
      
      // Mock the get method to return the updated user
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, updatedUser);
      });
      
      // Act
      const result = await userModel.update(userId, userData);
      
      // Assert
      expect(result).toEqual(updatedUser);
      expect(mockDb.run).toHaveBeenCalled();
      expect(mockDb.get).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [userId],
        expect.any(Function)
      );
      expect(mockDb.close).toHaveBeenCalled();
    });
  });
  
  describe('delete', () => {
    test('should delete user and return true when successful', async () => {
      // Arrange
      const userId = 1;
      
      // Mock the run method to indicate a successful deletion
      mockDb.run.mockImplementation(function(query, params, callback) {
        callback.call({ changes: 1 }, null);
      });
      
      // Act
      const result = await userModel.delete(userId);
      
      // Assert
      expect(result).toBe(true);
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM users'),
        [userId],
        expect.any(Function)
      );
      expect(mockDb.close).toHaveBeenCalled();
    });
    
    test('should return false when no user was deleted', async () => {
      // Arrange
      const userId = 999; // Non-existent ID
      
      // Mock the run method to indicate no rows affected
      mockDb.run.mockImplementation(function(query, params, callback) {
        callback.call({ changes: 0 }, null);
      });
      
      // Act
      const result = await userModel.delete(userId);
      
      // Assert
      expect(result).toBe(false);
      expect(mockDb.close).toHaveBeenCalled();
    });
  });
});
