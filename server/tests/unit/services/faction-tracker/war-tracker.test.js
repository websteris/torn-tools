/**
 * @jest-environment node
 */

const warTracker = require('../../../../services/faction-tracker/war-tracker');
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
  
  describe('getWarOpponents', () => {
    // Create a local mock of getActiveWars that returns real data
    let originalGetActiveWars;
    let originalGetWarDetails;
    
    beforeEach(() => {
      // Store original functions
      originalGetActiveWars = warTracker.getActiveWars;
      originalGetWarDetails = warTracker.getWarDetails;
      
      // Create mocks for these functions
      warTracker.getActiveWars = jest.fn();
      warTracker.getWarDetails = jest.fn();
    });
    
    afterEach(() => {
      // Restore original functions
      warTracker.getActiveWars = originalGetActiveWars;
      warTracker.getWarDetails = originalGetWarDetails;
    });
    
    test('should return opponents from territory wars', async () => {
      // Set up mocks with data
      warTracker.getActiveWars.mockResolvedValue([
        {
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
        }
      ]);
      
      // Execute function under test
      const result = await warTracker.getWarOpponents(testFactionId);
      
      // Assertions
      expect(warTracker.getActiveWars).toHaveBeenCalledWith(testFactionId);
      expect(result).toHaveLength(1);
      expect(result[0].war_id).toBe(12345);
      expect(result[0].opponent_id).toBe(testOpponentId);
      expect(result[0].war_type).toBe('territory');
      expect(result[0].user_score).toBe(150);
    }, 10000); // Increased timeout to 10 seconds
    
    test('should return opponents from ranked wars', async () => {
      // Set up mocks with data
      warTracker.getActiveWars.mockResolvedValue([
        {
          war_id: 23064,
          faction_id: testFactionId,
          war_type: 'ranked',
          start_time: 1741464000,
          end_time: 0,
          target: 2250,
          winner: 0
        }
      ]);
      
      warTracker.getWarDetails.mockResolvedValue({
        war_id: 23064,
        factions: [
          {
            faction_id: testFactionId,
            name: "Test Faction",
            score: 2958,
            chain: 1
          },
          {
            faction_id: testOpponentId,
            name: "Test Opponent",
            score: 1008,
            chain: 0
          }
        ],
        war: {
          start: 1741464000,
          end: 0,
          target: 2250,
          winner: 0
        }
      });
      
      // Execute function under test
      const result = await warTracker.getWarOpponents(testFactionId);
      
      // Assertions
      expect(warTracker.getActiveWars).toHaveBeenCalledWith(testFactionId);
      expect(warTracker.getWarDetails).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].war_id).toBe(23064);
      expect(result[0].opponent_id).toBe(testOpponentId);
      expect(result[0].opponent_name).toBe("Test Opponent");
      expect(result[0].user_score).toBe(2958);
      expect(result[0].opponent_score).toBe(1008);
      expect(result[0].target).toBe(2250);
    }, 10000); // Increased timeout to 10 seconds
    
    test('should handle errors gracefully', async () => {
      // Set up mocks to throw error
      warTracker.getActiveWars.mockRejectedValue(new Error('Test error'));
      
      // Execute function under test
      const result = await warTracker.getWarOpponents(testFactionId);
      
      // Assertions
      expect(warTracker.getActiveWars).toHaveBeenCalledWith(testFactionId);
      expect(result).toEqual([]);
    }, 10000); // Increased timeout to 10 seconds
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
      
      // Execute the real function (not a mock)
      const result = await warTracker.getActiveWars(testFactionId);
      
      // Assertions
      expect(mockDb.all).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].war_id).toBe(12345);
      expect(result[0].faction_id).toBe(testFactionId);
    }, 10000);
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
    }, 10000);
  });
});
