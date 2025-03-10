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
    info: jest.fn()
  }
}));

describe('Module: WarTracker', () => {
  let mockDb;
  const testFactionId = 1000; // Test faction ID, not a real one
  const testOpponentId = 2000; // Test opponent ID, not a real one
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock DB
    mockDb = {
      get: jest.fn(),
      all: jest.fn(),
      run: jest.fn(),
      close: jest.fn()
    };
    
    // Set up mock getConnection
    getConnection.mockReturnValue(mockDb);
  });
  
  describe('getWarOpponents', () => {
    test('should return opponents from territory wars', async () => {
      // Mock getActiveWars to return territory wars
      const mockGetActiveWars = jest.spyOn(warTracker, 'getActiveWars')
        .mockResolvedValue([
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
      
      // Act
      const result = await warTracker.getWarOpponents(testFactionId);
      
      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].war_id).toBe(12345);
      expect(result[0].opponent_id).toBe(testOpponentId);
      expect(result[0].war_type).toBe('territory');
      
      // Cleanup
      mockGetActiveWars.mockRestore();
    });
    
    test('should return opponents from ranked wars', async () => {
      // Mock getActiveWars to return ranked wars
      const mockGetActiveWars = jest.spyOn(warTracker, 'getActiveWars')
        .mockResolvedValue([
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
      
      // Mock getWarDetails to return faction details
      const mockGetWarDetails = jest.spyOn(warTracker, 'getWarDetails')
        .mockResolvedValue({
          war_id: 23064,
          factions: {
            [testFactionId]: {
              name: "Test Faction",
              score: 2958,
              chain: 1
            },
            [testOpponentId]: {
              name: "Test Opponent",
              score: 1008,
              chain: 0
            }
          },
          war: {
            start: 1741464000,
            end: 0,
            target: 2250,
            winner: 0
          }
        });
      
      // Act
      const result = await warTracker.getWarOpponents(testFactionId);
      
      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].war_id).toBe(23064);
      expect(result[0].opponent_id).toBe(testOpponentId);
      expect(result[0].opponent_name).toBe("Test Opponent");
      expect(result[0].user_score).toBe(2958);
      expect(result[0].opponent_score).toBe(1008);
      expect(result[0].target).toBe(2250);
      
      // Cleanup
      mockGetActiveWars.mockRestore();
      mockGetWarDetails.mockRestore();
    });
    
    test('should handle errors gracefully', async () => {
      // Mock getActiveWars to throw error
      const mockGetActiveWars = jest.spyOn(warTracker, 'getActiveWars')
        .mockRejectedValue(new Error('Test error'));
      
      // Act
      const result = await warTracker.getWarOpponents(testFactionId);
      
      // Assert
      expect(result).toEqual([]);
      
      // Cleanup
      mockGetActiveWars.mockRestore();
    });
  });
});
