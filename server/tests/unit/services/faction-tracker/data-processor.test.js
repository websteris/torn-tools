/**
 * @jest-environment node
 */

const dataProcessor = require('../../../../services/faction-tracker/data-processor');
const { getConnection } = require('../../../../db/schema');

// Mock dependencies
jest.mock('../../../../db/schema', () => ({
  getConnection: jest.fn()
}));

jest.mock('../../../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
  }
}));

describe('Module: DataProcessor', () => {
  let mockDb;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
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
  
  describe('processFactionData', () => {
    test('should process and store faction data', async () => {
      // Arrange
      const factionId = 1000;
      const factionData = {
        ID: factionId,
        name: 'Test Faction',
        tag: 'TEST',
        tag_image: 'https://example.com/tag.png',
        leader: 12345,
        'co-leader': 67890,
        respect: 10000,
        age: 500,
        capacity: 50,
        best_chain: 1000,
        rank: {
          level: 5,
          name: 'Heavyweights',
          division: 2,
          position: 15,
          wins: 25
        }
      };
      
      // Act
      await dataProcessor.processFactionData(factionId, factionData);
      
      // Assert
      expect(mockDb.run).toHaveBeenCalledTimes(2); // One for faction data, one for rank data
      expect(mockDb.close).toHaveBeenCalledTimes(2);
    });
    
    test('should handle invalid faction data gracefully', async () => {
      // Arrange
      const factionId = 1000;
      const invalidFactionData = {
        // Missing ID field
        name: 'Test Faction'
      };
      
      // Act
      await dataProcessor.processFactionData(factionId, invalidFactionData);
      
      // Assert
      expect(mockDb.run).not.toHaveBeenCalled();
    });
  });
  
  describe('processMemberData', () => {
    test('should process and store member data', async () => {
      // Arrange
      const factionId = 1000;
      const membersData = {
        12345: {
          name: 'TestMember1',
          level: 50,
          days_in_faction: 365,
          position: 'Co-Leader',
          last_action: {
            status: 'Online',
            timestamp: 1625097600,
            relative: '1 minute ago'
          },
          status: {
            state: 'Okay',
            description: 'Active',
            details: 'Home',
            color: 'green',
            until: 0
          }
        },
        67890: {
          name: 'TestMember2',
          level: 25,
          days_in_faction: 180,
          position: 'Member',
          last_action: {
            status: 'Offline',
            timestamp: 1625094000,
            relative: '1 hour ago'
          },
          status: {
            state: 'Hospital',
            description: 'Hospitalized',
            details: 'Recovering',
            color: 'red',
            until: 1625104000
          }
        }
      };
      
      // Act
      await dataProcessor.processMemberData(factionId, membersData);
      
      // Assert
      expect(mockDb.run).toHaveBeenCalledTimes(2); // One call per member
      expect(mockDb.close).toHaveBeenCalledTimes(2);
    });
    
    test('should handle empty members data gracefully', async () => {
      // Arrange
      const factionId = 1000;
      const emptyMembersData = {};
      
      // Act
      await dataProcessor.processMemberData(factionId, emptyMembersData);
      
      // Assert
      expect(mockDb.run).not.toHaveBeenCalled();
    });
    
    test('should handle individual member errors gracefully', async () => {
      // Arrange
      const factionId = 1000;
      const membersData = {
        12345: {
          name: 'TestMember1',
          level: 50,
          days_in_faction: 365
        },
        67890: null // Invalid member data
      };
      
      // Act
      await dataProcessor.processMemberData(factionId, membersData);
      
      // Assert
      expect(mockDb.run).toHaveBeenCalledTimes(1); // Only one valid member processed
      expect(mockDb.close).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('processRankData', () => {
    test('should process and store rank data', async () => {
      // Arrange
      const factionId = 1000;
      const rankData = {
        level: 5,
        name: 'Heavyweights',
        division: 2,
        position: 15,
        wins: 25
      };
      
      // Act
      await dataProcessor.processRankData(factionId, rankData);
      
      // Assert
      expect(mockDb.run).toHaveBeenCalledTimes(1);
      expect(mockDb.close).toHaveBeenCalledTimes(1);
    });
    
    test('should handle null rank data gracefully', async () => {
      // Arrange
      const factionId = 1000;
      const rankData = null;
      
      // Act
      await dataProcessor.processRankData(factionId, rankData);
      
      // Assert
      expect(mockDb.run).not.toHaveBeenCalled();
    });
  });
  
  describe('getLatestFactionData', () => {
    test('should return latest faction data', async () => {
      // Arrange
      const factionId = 1000;
      const mockFactionData = {
        id: 1,
        faction_id: factionId,
        name: 'Test Faction',
        tag: 'TEST',
        respect: 10000,
        timestamp: '2025-03-10T12:00:00.000Z'
      };
      
      // Mock the get method to return faction data
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, mockFactionData);
      });
      
      // Act
      const result = await dataProcessor.getLatestFactionData(factionId);
      
      // Assert
      expect(result).toEqual(mockFactionData);
      expect(mockDb.get).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM faction_data'),
        [factionId],
        expect.any(Function)
      );
      expect(mockDb.close).toHaveBeenCalled();
    });
    
    test('should return null when no faction data found', async () => {
      // Arrange
      const factionId = 1000;
      
      // Mock the get method to return null
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, null);
      });
      
      // Act
      const result = await dataProcessor.getLatestFactionData(factionId);
      
      // Assert
      expect(result).toBeNull();
      expect(mockDb.close).toHaveBeenCalled();
    });
    
    test('should handle database errors gracefully', async () => {
      // Arrange
      const factionId = 1000;
      
      // Mock the get method to throw an error
      mockDb.get.mockImplementation((query, params, callback) => {
        // Just pass the error object directly, don't throw it
        callback({ message: 'Database error' }, null);
      });
      
      // Act
      const result = await dataProcessor.getLatestFactionData(factionId);
      
      // Assert
      expect(result).toBeNull();
      expect(mockDb.close).toHaveBeenCalled();
    });
  });
  
  describe('getLatestMembersData', () => {
    test('should return latest members data', async () => {
      // Arrange
      const factionId = 1000;
      const mockMembersData = [
        {
          id: 1,
          member_id: 12345,
          faction_id: factionId,
          name: 'TestMember1',
          level: 50,
          timestamp: '2025-03-10T12:00:00.000Z'
        },
        {
          id: 2,
          member_id: 67890,
          faction_id: factionId,
          name: 'TestMember2',
          level: 25,
          timestamp: '2025-03-10T12:00:00.000Z'
        }
      ];
      
      // Mock the all method to return members data
      mockDb.all.mockImplementation((query, params, callback) => {
        callback(null, mockMembersData);
      });
      
      // Act
      const result = await dataProcessor.getLatestMembersData(factionId);
      
      // Assert
      expect(result).toEqual(mockMembersData);
      expect(mockDb.all).toHaveBeenCalledWith(
        expect.stringContaining('SELECT fm.*'),
        [factionId, factionId],
        expect.any(Function)
      );
      expect(mockDb.close).toHaveBeenCalled();
    });
    
    test('should return empty array when no members found', async () => {
      // Arrange
      const factionId = 1000;
      
      // Mock the all method to return empty array
      mockDb.all.mockImplementation((query, params, callback) => {
        callback(null, []);
      });
      
      // Act
      const result = await dataProcessor.getLatestMembersData(factionId);
      
      // Assert
      expect(result).toEqual([]);
      expect(mockDb.close).toHaveBeenCalled();
    });
    
    test('should handle database errors gracefully', async () => {
      // Arrange
      const factionId = 1000;
      
      // Mock the all method to throw an error
      mockDb.all.mockImplementation((query, params, callback) => {
        // Just pass the error object directly, don't throw it
        callback({ message: 'Database error' }, null);
      });
      
      // Act
      const result = await dataProcessor.getLatestMembersData(factionId);
      
      // Assert
      expect(result).toEqual([]);
      expect(mockDb.close).toHaveBeenCalled();
    });
  });
});
