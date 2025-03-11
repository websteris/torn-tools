/**
 * @jest-environment node
 */

const factionTrackerService = require('../../../../services/faction-tracker/faction-tracker-service');
const factionPoller = require('../../../../services/faction-tracker/faction-poller');
const apiKeyManager = require('../../../../services/faction-tracker/api-key-manager');
const { getConnection } = require('../../../../db/schema');

// Mock dependencies
jest.mock('../../../../db/schema', () => ({
  getConnection: jest.fn()
}));

jest.mock('../../../../services/faction-tracker/faction-poller', () => ({
  pollFactionData: jest.fn()
}));

jest.mock('../../../../services/faction-tracker/api-key-manager', () => ({
  getApiKeyForUser: jest.fn(),
  getApiKeyForUsers: jest.fn()
}));

jest.mock('../../../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
  }
}));

describe('Module: FactionTrackerService', () => {
  let mockDb;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset the service state
    factionTrackerService.trackedFactions = new Map();
    factionTrackerService.isRunning = false;
    if (factionTrackerService.checkInterval) {
      clearInterval(factionTrackerService.checkInterval);
      factionTrackerService.checkInterval = null;
    }
    
    // Mock database
    mockDb = {
      get: jest.fn((query, params, callback) => {
        if (callback) callback(null, null);
      }),
      all: jest.fn((query, params, callback) => {
        if (callback) callback(null, []);
      }),
      run: jest.fn((query, params, callback) => {
        if (typeof callback === 'function') callback(null);
      }),
      close: jest.fn()
    };
    
    getConnection.mockReturnValue(mockDb);
  });
  
  afterEach(() => {
    // Ensure service is stopped after each test
    factionTrackerService.stop();
  });
  
  describe('start', () => {
    test('should start the service and load tracked factions', async () => {
      // Mock _loadTrackedFactions method
      const originalLoadTrackedFactions = factionTrackerService._loadTrackedFactions;
      factionTrackerService._loadTrackedFactions = jest.fn().mockResolvedValue();
      
      // Act
      factionTrackerService.start();
      
      // Assert
      expect(factionTrackerService.isRunning).toBe(true);
      expect(factionTrackerService._loadTrackedFactions).toHaveBeenCalled();
      
      // Restore original method
      factionTrackerService._loadTrackedFactions = originalLoadTrackedFactions;
    });
    
    test('should not start if already running', async () => {
      // Arrange
      factionTrackerService.isRunning = true;
      const originalLoadTrackedFactions = factionTrackerService._loadTrackedFactions;
      factionTrackerService._loadTrackedFactions = jest.fn();
      
      // Act
      factionTrackerService.start();
      
      // Assert
      expect(factionTrackerService._loadTrackedFactions).not.toHaveBeenCalled();
      
      // Restore original method
      factionTrackerService._loadTrackedFactions = originalLoadTrackedFactions;
      factionTrackerService.isRunning = false;
    });
  });
  
  describe('stop', () => {
    test('should stop the service', () => {
      // Arrange
      factionTrackerService.isRunning = true;
      factionTrackerService.checkInterval = setInterval(() => {}, 1000);
      factionTrackerService.trackedFactions.set(1000, {
        interval: setInterval(() => {}, 1000),
        users: [1],
        pollingInterval: 20000,
        lastPoll: Date.now()
      });
      
      // Act
      factionTrackerService.stop();
      
      // Assert
      expect(factionTrackerService.isRunning).toBe(false);
      expect(factionTrackerService.checkInterval).toBeNull();
    });
    
    test('should do nothing if not running', () => {
      // Arrange
      factionTrackerService.isRunning = false;
      
      // Act
      factionTrackerService.stop();
      
      // Assert
      expect(factionTrackerService.isRunning).toBe(false);
    });
  });
  
  describe('trackFaction', () => {
    test('should add new faction to tracking', async () => {
      // Arrange
      const factionId = 1000;
      const userId = 1;
      apiKeyManager.getApiKeyForUser.mockResolvedValue('test_api_key');
      
      // Mock internal methods
      const originalSaveTrackedFaction = factionTrackerService._saveTrackedFaction;
      const originalStartPollingFaction = factionTrackerService._startPollingFaction;
      factionTrackerService._saveTrackedFaction = jest.fn().mockResolvedValue();
      factionTrackerService._startPollingFaction = jest.fn();
      
      // Act
      const result = await factionTrackerService.trackFaction({
        factionId,
        userId
      });
      
      // Assert
      expect(result).toBe(true);
      expect(apiKeyManager.getApiKeyForUser).toHaveBeenCalledWith(userId);
      expect(factionTrackerService._saveTrackedFaction).toHaveBeenCalled();
      expect(factionTrackerService._startPollingFaction).toHaveBeenCalledWith(factionId);
      expect(factionTrackerService.trackedFactions.has(factionId)).toBe(true);
      expect(factionTrackerService.trackedFactions.get(factionId).users).toContain(userId);
      
      // Restore original methods
      factionTrackerService._saveTrackedFaction = originalSaveTrackedFaction;
      factionTrackerService._startPollingFaction = originalStartPollingFaction;
    });
    
    test('should add user to existing faction tracking', async () => {
      // Arrange
      const factionId = 1000;
      const userId = 1;
      const newUserId = 2;
      apiKeyManager.getApiKeyForUser.mockResolvedValue('test_api_key');
      
      // Setup existing tracked faction
      factionTrackerService.trackedFactions.set(factionId, {
        users: [userId],
        pollingInterval: 20000,
        lastPoll: Date.now(),
        interval: null
      });
      
      // Mock internal methods
      const originalSaveTrackedFaction = factionTrackerService._saveTrackedFaction;
      factionTrackerService._saveTrackedFaction = jest.fn().mockResolvedValue();
      
      // Act
      const result = await factionTrackerService.trackFaction({
        factionId,
        userId: newUserId
      });
      
      // Assert
      expect(result).toBe(true);
      expect(apiKeyManager.getApiKeyForUser).toHaveBeenCalledWith(newUserId);
      expect(factionTrackerService._saveTrackedFaction).toHaveBeenCalled();
      expect(factionTrackerService.trackedFactions.get(factionId).users).toContain(newUserId);
      
      // Restore original method
      factionTrackerService._saveTrackedFaction = originalSaveTrackedFaction;
    });
    
    test('should return false if no API key is found', async () => {
      // Arrange
      const factionId = 1000;
      const userId = 1;
      apiKeyManager.getApiKeyForUser.mockResolvedValue(null);
      
      // Act
      const result = await factionTrackerService.trackFaction({
        factionId,
        userId
      });
      
      // Assert
      expect(result).toBe(false);
      expect(apiKeyManager.getApiKeyForUser).toHaveBeenCalledWith(userId);
      expect(factionTrackerService.trackedFactions.has(factionId)).toBe(false);
    });
  });
  
  describe('stopTracking', () => {
    test('should remove user from faction tracking', async () => {
      // Arrange
      const factionId = 1000;
      const userId = 1;
      
      // Setup tracked faction with multiple users
      factionTrackerService.trackedFactions.set(factionId, {
        users: [userId, 2],
        pollingInterval: 20000,
        lastPoll: Date.now(),
        interval: null
      });
      
      // Mock internal methods
      const originalSaveTrackedFaction = factionTrackerService._saveTrackedFaction;
      factionTrackerService._saveTrackedFaction = jest.fn().mockResolvedValue();
      
      // Act
      const result = await factionTrackerService.stopTracking({
        factionId,
        userId
      });
      
      // Assert
      expect(result).toBe(true);
      expect(factionTrackerService._saveTrackedFaction).toHaveBeenCalled();
      expect(factionTrackerService.trackedFactions.has(factionId)).toBe(true);
      expect(factionTrackerService.trackedFactions.get(factionId).users).not.toContain(userId);
      expect(factionTrackerService.trackedFactions.get(factionId).users).toContain(2);
      
      // Restore original method
      factionTrackerService._saveTrackedFaction = originalSaveTrackedFaction;
    });
    
    test('should remove faction from tracking if no users left', async () => {
      // Arrange
      const factionId = 1000;
      const userId = 1;
      
      // Setup tracked faction with single user
      factionTrackerService.trackedFactions.set(factionId, {
        users: [userId],
        pollingInterval: 20000,
        lastPoll: Date.now(),
        interval: null
      });
      
      // Mock internal methods
      const originalRemoveTrackedFaction = factionTrackerService._removeTrackedFaction;
      factionTrackerService._removeTrackedFaction = jest.fn().mockResolvedValue();
      
      // Act
      const result = await factionTrackerService.stopTracking({
        factionId,
        userId
      });
      
      // Assert
      expect(result).toBe(true);
      expect(factionTrackerService._removeTrackedFaction).toHaveBeenCalledWith(factionId);
      expect(factionTrackerService.trackedFactions.has(factionId)).toBe(false);
      
      // Restore original method
      factionTrackerService._removeTrackedFaction = originalRemoveTrackedFaction;
    });
  });
  
  describe('getTrackedFactions', () => {
    test('should return all tracked factions info', () => {
      // Arrange
      const factionId1 = 1000;
      const factionId2 = 2000;
      
      factionTrackerService.trackedFactions.set(factionId1, {
        users: [1, 2, 3],
        pollingInterval: 20000,
        lastPoll: 1741464000000,
        targetFactionId: 3000
      });
      
      factionTrackerService.trackedFactions.set(factionId2, {
        users: [4],
        pollingInterval: 30000,
        lastPoll: 1741464100000,
        targetFactionId: null
      });
      
      // Act
      const result = factionTrackerService.getTrackedFactions();
      
      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].factionId).toBe(factionId1);
      expect(result[0].userCount).toBe(3);
      expect(result[0].targetFactionId).toBe(3000);
      expect(result[1].factionId).toBe(factionId2);
      expect(result[1].userCount).toBe(1);
      expect(result[1].targetFactionId).toBeNull();
    });
  });
  
  describe('_loadTrackedFactions', () => {
    test('should load tracked factions from database', async () => {
      // Arrange
      const factionId1 = 1000;
      const factionId2 = 2000;
      
      // Mock database response
      mockDb.all.mockImplementation((query, params, callback) => {
        callback(null, [
          {
            faction_id: factionId1,
            users: JSON.stringify([1, 2, 3]),
            polling_interval: 20000,
            last_poll: 1741464000000,
            target_faction_id: 3000
          },
          {
            faction_id: factionId2,
            users: JSON.stringify([4]),
            polling_interval: 30000,
            last_poll: 1741464100000,
            target_faction_id: null
          }
        ]);
      });
      
      // Mock internal methods
      const originalStartPollingFaction = factionTrackerService._startPollingFaction;
      factionTrackerService._startPollingFaction = jest.fn();
      
      // Act
      await factionTrackerService._loadTrackedFactions();
      
      // Assert
      expect(mockDb.all).toHaveBeenCalled();
      expect(factionTrackerService.trackedFactions.size).toBe(2);
      expect(factionTrackerService.trackedFactions.has(factionId1)).toBe(true);
      expect(factionTrackerService.trackedFactions.get(factionId1).users).toEqual([1, 2, 3]);
      expect(factionTrackerService.trackedFactions.get(factionId1).targetFactionId).toBe(3000);
      expect(factionTrackerService.trackedFactions.has(factionId2)).toBe(true);
      expect(factionTrackerService._startPollingFaction).toHaveBeenCalledTimes(2);
      
      // Restore original method
      factionTrackerService._startPollingFaction = originalStartPollingFaction;
    });
  });
  
  describe('_pollFaction', () => {
    test('should poll faction data successfully', async () => {
      // Arrange
      const factionId = 1000;
      const userId = 1;
      const apiKey = 'test_api_key';
      const factionData = { ID: factionId, name: 'Test Faction' };
      
      // Setup tracked faction
      factionTrackerService.trackedFactions.set(factionId, {
        users: [userId],
        pollingInterval: 20000,
        lastPoll: 0,
        interval: null
      });
      
      // Mock dependencies
      apiKeyManager.getApiKeyForUsers.mockResolvedValue(apiKey);
      factionPoller.pollFactionData.mockResolvedValue(factionData);
      
      // Mock internal methods
      const originalSaveTrackedFaction = factionTrackerService._saveTrackedFaction;
      factionTrackerService._saveTrackedFaction = jest.fn().mockResolvedValue();
      
      // Act
      const result = await factionTrackerService._pollFaction(factionId);
      
      // Assert
      expect(result).toBe(factionData);
      expect(apiKeyManager.getApiKeyForUsers).toHaveBeenCalledWith([userId]);
      expect(factionPoller.pollFactionData).toHaveBeenCalledWith(factionId, apiKey);
      expect(factionTrackerService._saveTrackedFaction).toHaveBeenCalled();
      expect(factionTrackerService.trackedFactions.get(factionId).lastPoll).not.toBe(0);
      
      // Restore original method
      factionTrackerService._saveTrackedFaction = originalSaveTrackedFaction;
    });
    
    test('should handle missing API key', async () => {
      // Arrange
      const factionId = 1000;
      const userId = 1;
      
      // Setup tracked faction
      factionTrackerService.trackedFactions.set(factionId, {
        users: [userId],
        pollingInterval: 20000,
        lastPoll: 0,
        interval: null
      });
      
      // Mock dependencies
      apiKeyManager.getApiKeyForUsers.mockResolvedValue(null);
      
      // Act
      const result = await factionTrackerService._pollFaction(factionId);
      
      // Assert
      expect(result).toBeUndefined();
      expect(apiKeyManager.getApiKeyForUsers).toHaveBeenCalledWith([userId]);
      expect(factionPoller.pollFactionData).not.toHaveBeenCalled();
    });
  });
});
