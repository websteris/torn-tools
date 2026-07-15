/**
 * @jest-environment node
 */

// Create mock objects
const mockFs = {
  existsSync: jest.fn(),
  mkdirSync: jest.fn()
};

const mockPath = {
  join: jest.fn().mockImplementation((...args) => args.join('/'))
};

const mockWinston = {
  format: {
    combine: jest.fn().mockReturnThis(),
    timestamp: jest.fn().mockReturnThis(),
    errors: jest.fn().mockReturnThis(),
    splat: jest.fn().mockReturnThis(),
    printf: jest.fn(formatter => formatter),
    colorize: jest.fn().mockReturnThis()
  },
  createLogger: jest.fn().mockReturnValue({
    child: jest.fn().mockReturnValue('child-logger')
  }),
  transports: {
    Console: jest.fn(),
    File: jest.fn()
  }
};

// Setup mocks before requiring the module
jest.mock('fs', () => mockFs);
jest.mock('path', () => mockPath);
jest.mock('winston', () => mockWinston);

describe('Module: Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('should create a child logger with component context', () => {
    // Reset modules to force new imports
    jest.resetModules();
    
    // Import the module after mocks are set up
    const { createLogger } = require('../../../utils/logger');
    
    // Act
    const componentLogger = createLogger('TestComponent');
    
    // Assert — createLogger returns a wrapper object exposing logging methods
    // (it wraps winston's child logger), not the raw child logger itself.
    expect(mockWinston.createLogger).toHaveBeenCalled();
    expect(typeof componentLogger).toBe('object');
    expect(typeof componentLogger.info).toBe('function');
    expect(typeof componentLogger.error).toBe('function');
    expect(typeof componentLogger.child).toBe('function');
  });
  
  test('should create directory if it does not exist', () => {
    // Arrange - set existsSync to return false for this test
    mockFs.existsSync.mockReturnValue(false);
    
    // Reset modules to force re-import
    jest.resetModules();
    
    // Re-require the module to trigger the directory creation
    require('../../../utils/logger');
    
    // Assert
    expect(mockFs.existsSync).toHaveBeenCalled();
    expect(mockFs.mkdirSync).toHaveBeenCalled();
  });
});
