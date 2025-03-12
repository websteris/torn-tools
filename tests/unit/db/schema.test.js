/**
 * @jest-environment node
 */

// Import and setup mocks first
const mockFs = {
  existsSync: jest.fn(),
  mkdirSync: jest.fn()
};

const mockPath = {
  join: jest.fn().mockImplementation((...args) => args.join('/'))
};

// Setup mocks before importing schema
jest.mock('fs', () => mockFs);
jest.mock('path', () => mockPath);
jest.mock('sqlite3', () => ({
  verbose: jest.fn().mockReturnValue({
    Database: jest.fn().mockImplementation((path, callback) => {
      if (callback) callback(null);
      return mockDb;
    })
  })
}));
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock database
const mockDb = {
  serialize: jest.fn(callback => callback()),
  run: jest.fn((query, callback) => {
    if (callback) callback(null);
  }),
  close: jest.fn(callback => {
    if (callback) callback(null);
  })
};

describe('Module: DBSchema', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.existsSync.mockReturnValue(true);
  });
  
  describe('getConnection', () => {
    test('should return a database connection', () => {
      // Reset modules to force new imports
      jest.resetModules();
      
      // Import module after mocks are set up
      const { getConnection } = require('../../../db/schema');
      
      // Act
      const result = getConnection();
      
      // Assert
      expect(result).toBeDefined();
    });
  });
  
  describe('initializeSchema', () => {
    test('should create database directory if it does not exist', async () => {
      // Arrange - set existsSync to return false
      mockFs.existsSync.mockReturnValue(false);
      
      // Reset modules to force new imports with our mock values
      jest.resetModules();
      
      // Import module after mocks are set up
      const { initializeSchema } = require('../../../db/schema');
      
      // Act
      await initializeSchema();
      
      // Assert
      expect(mockFs.existsSync).toHaveBeenCalled();
      expect(mockFs.mkdirSync).toHaveBeenCalled();
    });
    
    test('should initialize database schema successfully', async () => {
      // Reset modules
      jest.resetModules();
      
      // Import module after mocks are set up
      const { initializeSchema } = require('../../../db/schema');
      
      // Act
      await initializeSchema();
      
      // Assert
      expect(mockDb.serialize).toHaveBeenCalled();
      expect(mockDb.run).toHaveBeenCalled();
      expect(mockDb.close).toHaveBeenCalled();
    });
  });
});
