/**
 * @jest-environment node
 */

// Mock dependencies first BEFORE requiring any modules
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

// Import the module AFTER setting up mocks
const { getConnection } = require('../../../../db/schema');
const { logger } = require('../../../../utils/logger');
const warTracker = require('../../../../services/faction-tracker/war-tracker');

describe('Module: WarTracker', () => {
  let mockDb;
  const testFactionId = 1000;
  const testOpponentId = 2000;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
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
  
  describe('getActiveWars', () => {
    test('should return active wars for a faction', async () => {
      // Mock the database response
      mockDb.all.mockImplementation((query, params, callback) => {
        callback(null, [
          {
            war_id: 12345,
            faction_id: testFactionId, 
            war_type: 'territory',
            defending: true,
            assaulting: false,
            score: 150,
            start_time: 1741464000,
            end_time: 0
          }
        ]);
      });
      
      // Execute the real function
      const result = await warTracker.getActiveWars(testFactionId);
      
      // Assertions
      expect(mockDb.all).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].war_id).toBe(12345);
      expect(result[0].faction_id).toBe(testFactionId);
    });
    
    test('should handle database errors', async () => {
      // Mock the database to pass an error to the callback
      mockDb.all.mockImplementation((query, params, callback) => {
        callback(new Error('Database error'), null);
      });
      
      // Suppress console errors for this test
      logger.error.mockImplementation(() => {});
      
      // Execute the function
      const result = await warTracker.getActiveWars(testFactionId);
      
      // Should return empty array on error
      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalled();
      expect(mockDb.close).toHaveBeenCalled();
    });
  });
  
  describe('getWarHistory', () => {
    test('should return war history for a faction', async () => {
      // Mock the database response
      mockDb.all.mockImplementation((query, params, callback) => {
        callback(null, [
          {
            war_id: 12345,
            faction_id: testFactionId,
            war_type: 'territory',
            start_time: 1741464000,
            end_time: 1741467600
          }
        ]);
      });
      
      // Execute the real function
      const result = await warTracker.getWarHistory(testFactionId, 10);
      
      // Assertions
      expect(mockDb.all).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].war_id).toBe(12345);
    });
  });
  
  describe('getWarDetails', () => {
    test('should return details for a specific war', async () => {
      // Mock the database responses
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, {
          war_id: 12345,
          faction_id: testFactionId,
          war_type: 'territory',
          start_time: 1741464000,
          end_time: 0,
          assaulting_faction: testOpponentId,
          defending_faction: testFactionId
        });
      });
      
      // Execute the real function
      const result = await warTracker.getWarDetails(12345, 'territory');
      
      // Assertions
      expect(mockDb.get).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.war_id).toBe(12345);
    });
    
    test('should return null when war not found', async () => {
      // Mock the database response for no war found
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, null);
      });
      
      // Execute the real function
      const result = await warTracker.getWarDetails(99999, 'territory');
      
      // Assertions
      expect(mockDb.get).toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });
  
  describe('getWarOpponents', () => {
    // Increase timeout for potentially slow tests
    jest.setTimeout(30000);

    test('should return opponents from territory wars', async () => {
      // Mock database response for active wars
      mockDb.all.mockImplementation((query, params, callback) => {
        callback(null, [{
          war_id: 12345,
          faction_id: testFactionId,
          war_type: 'territory',
          defending: true,
          assaulting: false,
          score: 150,
          start_time: 1741464000,
          end_time: 0,
          territory: 'Some Territory',
          assaulting_faction: testOpponentId,
          defending_faction: testFactionId
        }]);
      });
      
      // Execute the function
      const result = await warTracker.getWarOpponents(testFactionId);
      
      // Assertions
      expect(mockDb.all).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].war_id).toBe(12345);
      expect(result[0].opponent_id).toBe(testOpponentId);
      expect(result[0].war_type).toBe('territory');
    });
    
    test('should return opponents from ranked wars', async () => {
      // Mock database responses:
      mockDb.all.mockImplementation((query, params, callback) => {
        if (query.includes('faction_wars') && query.includes('ORDER BY')) {
          // This call fetches the active war rows
          callback(null, [{
            war_id: 23064,
            faction_id: testFactionId,
            war_type: 'ranked',
            start_time: 1741464000,
            end_time: 0,
            target: 2250,
            winner: 0
          }]);
        } else if (query.includes('faction_war_factions')) {
          // This call fetches the factions for the ranked war
          // Instead of an array, we now simulate an object format
          callback(null, [{
            faction_id: testFactionId,
            name: "Test Faction",
            score: 2958,
            chain: 1
          }, {
            faction_id: testOpponentId,
            name: "Test Opponent",
            score: 1008,
            chain: 0
          }]);
        } else {
          callback(null, []); 
        }
      });

      mockDb.get.mockImplementation((query, params, callback) => {
        if (query.includes('faction_wars') && query.includes('WHERE war_id')) {
          // Return the base war row for the ranked war
          callback(null, {
            war_id: 23064,
            faction_id: testFactionId,
            war_type: 'ranked'
          });
        } else {
          callback(null, null);
        }
      });
      
      // Execute the function
      const result = await warTracker.getWarOpponents(testFactionId);
      
      // Assertions
      expect(mockDb.all).toHaveBeenCalled();
      expect(mockDb.get).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].war_id).toBe(23064);
      expect(result[0].opponent_id).toBe(testOpponentId);
      expect(result[0].opponent_name).toBe("Test Opponent");
    });
    
    test('should handle errors gracefully', async () => {
      // Mock database error
      mockDb.all.mockImplementation((query, params, callback) => {
        callback(new Error('Test error'), null);
      });
      
      // Suppress console errors for this test
      logger.error.mockImplementation(() => {});
      
      // Execute the function
      const result = await warTracker.getWarOpponents(testFactionId);
      
      // Assertions - Should return empty array on error
      expect(mockDb.all).toHaveBeenCalled();
      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('processWarData', () => {
    test('should process territory, raid, and ranked wars without errors', async () => {
      // Arrange
      const territoryWar = {
        defending: true,
        assaulting: false,
        score: 150,
        start: 1741464000,
        end: 0,
        assaulting_faction: testOpponentId,
        defending_faction: testFactionId,
        territory: 'Test Territory',
        winner: testOpponentId
      };
      
      const raidWar = {
        defending: false,
        assaulting: true,
        score: 200,
        start: 1741464000,
        end: 0,
        raiding_faction: testOpponentId,
        defending_faction: testFactionId
      };
      
      const rankedWar = {
        war: {
          start: 1741464000,
          end: 0,
          target: 2250,
          winner: 0
        },
        factions: {
          [testFactionId]: { name: 'Test Faction', score: 3000, chain: 1 },
          [testOpponentId]: { name: 'Test Opponent', score: 1500, chain: 0 }
        }
      };

      const factionData = {
        territory_wars: { '1': territoryWar },
        raid_wars: { '2': raidWar },
        ranked_wars: { '3': rankedWar }
      };

      // Mock the db.run function for storeWarData and storeWarFactionData
      mockDb.run.mockImplementation((query, params, callback) => {
        callback(null);
      });

      // Clear logger mocks
      logger.debug.mockClear();
      logger.error.mockClear();

      // Act
      await warTracker.processWarData(testFactionId, factionData);

      // Assert
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining(`Successfully processed war data for faction ${testFactionId}`));
      expect(logger.error).not.toHaveBeenCalled();
    });
  });
});