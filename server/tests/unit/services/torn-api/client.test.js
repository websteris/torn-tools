/**
 * @jest-environment node
 */
// Test configuration import with error handling
let testConfig;
try {
  testConfig = require('../../../../config/test-config');
} catch (error) {
  console.error('Test configuration file missing. Copy config/test-config.example.js to config/test-config.js and add your credentials.');
  process.exit(1);
}

const axios = require('axios');
const NodeCache = require('node-cache');
const TornApiClient = require('../../../../services/torn-api/client');





// Mock dependencies
jest.mock('axios');
jest.mock('node-cache');
jest.mock('../../../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Helper to create mock response
const createMockResponse = (data) => ({ 
  data, 
  status: 200, 
  statusText: 'OK',
  headers: {},
  config: {}
});

describe('Module: TornApiClient', () => {
  let apiClient;
  const mockApiKey = testConfig.apiKeys.test;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock axios create to return our mock instance
    axios.create.mockReturnValue({
      get: jest.fn(),
      interceptors: {
        response: {
          use: jest.fn((successFn, errorFn) => {
            // Store the error handler for testing
            axios.errorHandler = errorFn;
          })
        }
      }
    });
    
    // Mock NodeCache methods and properties
    NodeCache.mockImplementation(() => ({
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      flushAll: jest.fn(),
      options: {
        stdTTL: 60
      }
    }));
    
    // Create api client instance for testing
    apiClient = new TornApiClient({
      baseUrl: 'https://api.torn.com',
      defaultTtl: 60,
      rateLimit: 100
    });
  });

  test('should be properly initialized with default options', () => {
    // Assert
    expect(apiClient.baseUrl).toBe('https://api.torn.com');
    expect(apiClient.cache).toBeDefined();
    expect(apiClient.http).toBeDefined();
    expect(apiClient.rateLimit).toBe(100);
    expect(apiClient.rateLimitWindow).toBe(60 * 1000);
    expect(apiClient.requestTimestamps).toEqual([]);
    expect(axios.create).toHaveBeenCalledWith(expect.objectContaining({
      baseURL: 'https://api.torn.com',
      timeout: 10000
    }));
  });

  test('should throw error if required parameters are missing', async () => {
    // Act & Assert - Missing API key
    await expect(apiClient.request({
      section: 'user'
    })).rejects.toThrow('API key is required');
    
    // Act & Assert - Missing section
    await expect(apiClient.request({
      apiKey: mockApiKey
    })).rejects.toThrow('Section is required');
  });

  test('should return cached data when available', async () => {
    // Arrange
    const cachedData = { success: true, data: { id: 123 } };
    apiClient.cache.get.mockReturnValue(cachedData);
    
    // Act
    const result = await apiClient.request({
      section: 'user',
      apiKey: mockApiKey
    });
    
    // Assert
    expect(result).toBe(cachedData);
    expect(apiClient.cache.get).toHaveBeenCalled();
    expect(apiClient.http.get).not.toHaveBeenCalled();
  });

  test('should make API request when cache is bypassed', async () => {
    // Arrange
    const cachedData = { success: true, data: { id: 123 } };
    const newData = { success: true, data: { id: 123, updated: true } };
    apiClient.cache.get.mockReturnValue(cachedData);
    apiClient.http.get.mockResolvedValue(createMockResponse(newData));
    
    // Act
    const result = await apiClient.request({
      section: 'user',
      apiKey: mockApiKey,
      bypassCache: true
    });
    
    // Assert
    expect(result).toBe(newData);
    expect(apiClient.cache.get).not.toHaveBeenCalled();
    expect(apiClient.http.get).toHaveBeenCalledWith('/user/', expect.any(Object));
    expect(apiClient.cache.set).toHaveBeenCalledWith(
      expect.any(String),
      newData,
      expect.any(Number)
    );
  });

  test('should build URL with selections correctly', async () => {
    // Arrange
    apiClient.http.get.mockResolvedValue(createMockResponse({ success: true }));
    
    // Act
    await apiClient.request({
      section: 'user',
      id: '123',
      apiKey: mockApiKey,
      selections: ['profile', 'cooldowns']
    });
    
    // Assert
    expect(apiClient.http.get).toHaveBeenCalledWith(
      '/user/123?selections=profile,cooldowns',
      expect.any(Object)
    );
  });

  test('should handle Torn API errors correctly', async () => {
    // Arrange
    const apiError = {
      response: {
        data: {
          error: {
            code: 5,
            error: 'Too many requests'
          }
        },
        status: 429
      },
      isAxiosError: true
    };
    
    // Act & Assert
    const error = await axios.errorHandler(apiError)
      .catch(err => err);
    
    expect(error.code).toBe(5);
    expect(error.message).toBe('Too many requests');
    expect(error.isHandled).toBe(true);
  });

  test('should handle network errors correctly', async () => {
    // Arrange
    const networkError = {
      request: {},
      message: 'Network Error',
      isAxiosError: true
    };
    
    // Act & Assert
    const error = await axios.errorHandler(networkError)
      .catch(err => err);
    
    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.message).toBe('Network error, please check your connection');
    expect(error.isHandled).toBe(true);
  });

  test('should enforce rate limiting', async () => {
    // Arrange
    jest.useFakeTimers();
    apiClient.rateLimit = 2; // Set a low limit for testing
    apiClient.http.get.mockResolvedValue(createMockResponse({ success: true }));
    
    // Add timestamps that will trigger rate limiting
    const now = Date.now();
    apiClient.requestTimestamps = [
      now - 30000, // 30 seconds ago
      now - 10000  // 10 seconds ago
    ];
    
    // Mock setTimeout to immediately resolve
    jest.spyOn(global, 'setTimeout').mockImplementation((fn) => {
      fn();
      return 123;
    });
    
    // Act
    const requestPromise = apiClient.request({
      section: 'user',
      apiKey: mockApiKey
    });
    
    // Assert
    await expect(requestPromise).resolves.toEqual({ success: true });
    expect(apiClient.requestTimestamps.length).toBe(3); // Original 2 + new request
    
    jest.useRealTimers();
  });

  test('should clear cache correctly', () => {
    // Act
    apiClient.clearCache();
    
    // Assert
    expect(apiClient.cache.flushAll).toHaveBeenCalled();
  });

  test('should clear specific cache item correctly', () => {
    // Act
    apiClient.clearCacheItem('user', '123', ['profile'], mockApiKey);
    
    // Assert
    expect(apiClient.cache.del).toHaveBeenCalledWith(expect.any(String));
  });

  test('should make user data request correctly', async () => {
    // Arrange
    apiClient.request = jest.fn().mockResolvedValue({ success: true });
    
    // Act
    await apiClient.getUserData(mockApiKey, ['profile', 'inventory']);
    
    // Assert
    expect(apiClient.request).toHaveBeenCalledWith(expect.objectContaining({
      section: 'user',
      apiKey: mockApiKey,
      selections: ['profile', 'inventory']
    }));
  });

  test('should make faction data request correctly', async () => {
    // Arrange
    apiClient.request = jest.fn().mockResolvedValue({ success: true });
    
    // Act
    await apiClient.getFactionData(mockApiKey, '12345', ['basic']);
    
    // Assert
    expect(apiClient.request).toHaveBeenCalledWith(expect.objectContaining({
      section: 'faction',
      id: '12345',
      apiKey: mockApiKey,
      selections: ['basic']
    }));
  });

  test('should make torn data request correctly', async () => {
    // Arrange
    apiClient.request = jest.fn().mockResolvedValue({ success: true });
    
    // Act
    await apiClient.getTornData(mockApiKey, ['items']);
    
    // Assert
    expect(apiClient.request).toHaveBeenCalledWith(expect.objectContaining({
      section: 'torn',
      apiKey: mockApiKey,
      selections: ['items']
    }));
  });
});
