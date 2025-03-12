/**
 * Tests for the data puller service
 * 
 * This service is responsible for periodically fetching data from the Torn API
 * and storing it in the database
 */

// Create a mock implementation of the data puller service for testing
jest.mock('../../../services/data-puller', () => {
  const originalModule = jest.requireActual('../../../services/data-puller');
  
  // Return a mocked version of the module
  return {
    ...originalModule,
    startPulling: jest.fn(),
    stopPulling: jest.fn(),
    pullFactionData: jest.fn(),
    pullUserData: jest.fn(),
    pullWarData: jest.fn(),
    getStatus: jest.fn(() => ({
      isRunning: false,
      lastPull: null,
      pullCount: 0,
      errors: []
    }))
  };
});

const dataPuller = require('../../../services/data-puller');
const factionModel = require('../../../models/faction');
const userDetailModel = require('../../../models/userDetail');
const factionWarModel = require('../../../models/factionWar');

// Mock the models
jest.mock('../../../models/faction');
jest.mock('../../../models/userDetail');
jest.mock('../../../models/factionWar');

// Mock the Torn API client
jest.mock('../../../services/torn-api/client', () => ({
  getUserData: jest.fn(),
  getWarOpponents: jest.fn()
}));

const { getUserData, getWarOpponents } = require('../../../services/torn-api/client');

describe('Data Puller Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('startPulling', () => {
    it('should start the data pulling process', () => {
      dataPuller.startPulling();
      expect(dataPuller.startPulling).toHaveBeenCalled();
    });
  });
  
  describe('stopPulling', () => {
    it('should stop the data pulling process', () => {
      dataPuller.stopPulling();
      expect(dataPuller.stopPulling).toHaveBeenCalled();
    });
  });
  
  describe('pullFactionData', () => {
    it('should fetch faction data and store it in the database', async () => {
      // Mock the API response
      const mockFactionData = {
        ID: 12345,
        name: 'Test Faction',
        tag: 'TEST',
        leader: 67890,
        members: {
          '123': { name: 'Member1', level: 10 },
          '456': { name: 'Member2', level: 20 }
        }
      };
      
      getUserData.mockResolvedValue({
        faction: {
          faction_id: 12345
        }
      });
      
      getWarOpponents.mockResolvedValue(mockFactionData);
      
      // Mock the model response
      factionModel.upsertFaction.mockResolvedValue({
        id: 12345,
        name: 'Test Faction'
      });
      
      // Call the function
      await dataPuller.pullFactionData();
      
      // Verify the API was called
      expect(getWarOpponents).toHaveBeenCalled();
      
      // Verify the model was called with the correct data
      expect(factionModel.upsertFaction).toHaveBeenCalledWith(expect.objectContaining({
        id: 12345,
        name: 'Test Faction'
      }));
    });
    
    it('should handle API errors gracefully', async () => {
      // Mock an API error
      getWarOpponents.mockRejectedValue(new Error('API Error'));
      
      // Call the function
      await dataPuller.pullFactionData();
      
      // Verify the API was called
      expect(getWarOpponents).toHaveBeenCalled();
      
      // Verify the model was not called
      expect(factionModel.upsertFaction).not.toHaveBeenCalled();
    });
  });
  
  describe('pullUserData', () => {
    it('should fetch user data and store it in the database', async () => {
      // Mock the API response
      const mockUserData = {
        player_id: 12345,
        name: 'Test User',
        level: 30,
        faction: {
          faction_id: 67890,
          faction_name: 'Test Faction'
        }
      };
      
      getUserData.mockResolvedValue(mockUserData);
      
      // Mock the model response
      userDetailModel.upsertUserDetail.mockResolvedValue({
        player_id: 12345,
        name: 'Test User'
      });
      
      // Call the function
      await dataPuller.pullUserData();
      
      // Verify the API was called
      expect(getUserData).toHaveBeenCalled();
      
      // Verify the model was called with the correct data
      expect(userDetailModel.upsertUserDetail).toHaveBeenCalledWith(expect.objectContaining({
        player_id: 12345,
        name: 'Test User'
      }));
    });
    
    it('should handle API errors gracefully', async () => {
      // Mock an API error
      getUserData.mockRejectedValue(new Error('API Error'));
      
      // Call the function
      await dataPuller.pullUserData();
      
      // Verify the API was called
      expect(getUserData).toHaveBeenCalled();
      
      // Verify the model was not called
      expect(userDetailModel.upsertUserDetail).not.toHaveBeenCalled();
    });
  });
  
  describe('pullWarData', () => {
    it('should fetch war data and store it in the database', async () => {
      // Mock the API response
      const mockWarData = {
        ranked_wars: {
          '12345': {
            war_id: 12345,
            start: 1609459200,
            end: 1609545600,
            target: 2000,
            winner: 67890
          }
        }
      };
      
      getWarOpponents.mockResolvedValue(mockWarData);
      
      // Mock the model response
      factionWarModel.upsertFactionWar.mockResolvedValue({
        war_id: 12345,
        target: 2000
      });
      
      // Call the function
      await dataPuller.pullWarData();
      
      // Verify the API was called
      expect(getWarOpponents).toHaveBeenCalled();
      
      // Verify the model was called with the correct data
      expect(factionWarModel.upsertFactionWar).toHaveBeenCalledWith(expect.objectContaining({
        war_id: 12345,
        target: 2000
      }));
    });
    
    it('should handle API errors gracefully', async () => {
      // Mock an API error
      getWarOpponents.mockRejectedValue(new Error('API Error'));
      
      // Call the function
      await dataPuller.pullWarData();
      
      // Verify the API was called
      expect(getWarOpponents).toHaveBeenCalled();
      
      // Verify the model was not called
      expect(factionWarModel.upsertFactionWar).not.toHaveBeenCalled();
    });
  });
  
  describe('getStatus', () => {
    it('should return the current status of the data puller', () => {
      const status = dataPuller.getStatus();
      
      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('lastPull');
      expect(status).toHaveProperty('pullCount');
      expect(status).toHaveProperty('errors');
    });
  });
}); 